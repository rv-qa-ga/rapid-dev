/**
 * Extract plain text from sample MOU .docx and compare section sizes to **all**
 * updateable text-like fields on Opportunity_Readiness__c (Salesforce Describe).
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/compare-mou-docx-to-readiness-lengths.ts
 *   npx ts-node scripts/compare-mou-docx-to-readiness-lengths.ts --docx "C:\path\file.docx"
 *   npx ts-node scripts/compare-mou-docx-to-readiness-lengths.ts --docx file.docx --no-sf
 *     (--no-sf: skip Describe; only report doc sections found by patterns — no QA max column)
 *
 * Default docx: docs/Non-Binding MOU to LRS 4.22.25 Fitz Comments 1_Example (1) (1).docx
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const OBJECT = 'Opportunity_Readiness__c';

const TEXT_LIKE_TYPES = new Set([
  'string',
  'textarea',
  'url',
  'email',
  'phone',
  'encryptedstring',
]);

/** BA SF-920 MOU quartet (org may differ e.g. Other = 500) */
const BA_SF920_MAX: Record<string, number> = {
  ConceptualCoverage__c: 200,
  Limits__c: 300,
  UnderwritingConsiderations__c: 10000,
  OtherConsiderations__c: 200,
};

/**
 * Extra heading strings that appear in the Word MOU but differ from the SF field label.
 * Keys: Salesforce API names.
 */
const DOC_HEADING_ALIASES: Record<string, string[]> = {
  Limits__c: ['Potential Limits'],
};

/**
 * MOU subheadings that are not Opportunity_Readiness text fields — trim section
 * body at the first of these so e.g. Target Insureds does not swallow Provisional Commission.
 */
const MOU_INTERNAL_HEADINGS = [
  'Provisional Commission',
  'Proposed Effective Date',
  'Insurance Carrier',
  'First Year Estimated',
  'Written Premium',
  'Territory',
  'Ultimate Loss Ratio',
  'Net Written Premium',
  'Data',
  'Claims Administration',
];

const DOCX_CANDIDATES = [
  'Non-Binding MOU to LRS 4.22.25 Fitz Comments 1_Example (1) (1).docx',
  'Non-Binding MOU to LRS 4.22.25 Fitz Comments 1_Example (1).docx',
];

interface SfField {
  name: string;
  label: string;
  type: string;
  length?: number;
  updateable?: boolean;
  calculated?: boolean;
}

interface HeadingMatch {
  start: number;
  endHeader: number;
  field: SfField;
  matchedAs: string;
  /** tie-break at same index */
  priority: number;
}

function resolveDefaultDocx(): string {
  const docsDir = path.join(process.cwd(), 'docs');
  for (const name of DOCX_CANDIDATES) {
    const full = path.join(docsDir, name);
    if (fs.existsSync(full)) return full;
  }
  return path.join(docsDir, DOCX_CANDIDATES[0]);
}

function parseArgs(): { docx: string; useSf: boolean } {
  let docx = resolveDefaultDocx();
  let useSf = true;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--docx' && argv[i + 1]) {
      docx = path.resolve(argv[++i]);
    }
    if (argv[i] === '--no-sf') {
      useSf = false;
    }
  }
  return { docx, useSf };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "Foo Bar" -> Foo\s+Bar; tolerates extra spaces in doc */
function flexibleLabelPattern(term: string): string {
  return term
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join('\\s+');
}

function docxToPlainText(docxPath: string): string {
  if (!fs.existsSync(docxPath)) {
    throw new Error(`Docx not found: ${docxPath}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mou-docx-'));
  try {
    execSync(`tar -xf "${docxPath}" -C "${tmp}"`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    const xmlPath = path.join(tmp, 'word', 'document.xml');
    if (!fs.existsSync(xmlPath)) {
      throw new Error('word/document.xml missing in docx');
    }
    let xml = fs.readFileSync(xmlPath, 'utf-8');
    xml = xml.replace(/<w:tab[^>]*\/>/gi, '\t');
    xml = xml.replace(/<\/w:p>/gi, '\n');
    xml = xml.replace(/<[^>]+>/g, '');
    return xml
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\u00a0/g, ' ');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function stripRepeatedFooters(s: string): string {
  const parts = s.split(/\n400 Northridge Rd/i);
  return (parts[0] || s).trim();
}

/** Cut body at first MOU-only heading so sections stay tight. */
function trimAtInternalHeadings(body: string): string {
  let min = body.length;
  for (const h of MOU_INTERNAL_HEADINGS) {
    if (h.length < 3) continue;
    const flex = flexibleLabelPattern(h);
    const re = new RegExp(`\\n\\s*${flex}\\s*\\**\\s*:`, 'i');
    const m = re.exec(body);
    if (m && m.index >= 0 && m.index < min) {
      min = m.index;
    }
  }
  return body.slice(0, min).trim();
}

/** Collect all header matches: `Label*:` or `Label` at line end then newline (no colon). */
function collectHeadingMatches(text: string, fields: SfField[]): HeadingMatch[] {
  const matches: HeadingMatch[] = [];

  for (const field of fields) {
    const terms = new Set<string>([field.label, ...(DOC_HEADING_ALIASES[field.name] || [])]);
    if (field.name === 'Name') {
      terms.add('Opportunity Readiness Name');
    }

    for (const term of terms) {
      if (!term || term.length < 2) continue;
      const flex = flexibleLabelPattern(term);

      // Label, optional footnote asterisks, colon (e.g. Ultimate Loss Ratio**:)
      const withColon = new RegExp(`(?:^|\\n)(\\s*)(${flex})(\\s*\\**\\s*:)`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = withColon.exec(text)) !== null) {
        const start = m.index;
        const endHeader = m.index + m[0].length;
        matches.push({
          start,
          endHeader,
          field,
          matchedAs: term,
          priority: term.length * 10 + 1,
        });
      }

      // "Target Insureds\n" without colon
      const noColon = new RegExp(`(?:^|\\n)(\\s*)(${flex})(\\s*\\**)(?=\\s*\\n)`, 'gi');
      while ((m = noColon.exec(text)) !== null) {
        const start = m.index;
        const endHeader = m.index + m[0].length;
        // Avoid duplicating same span as withColon
        const dup = matches.some(
          (x) => x.field.name === field.name && Math.abs(x.start - start) < 3 && x.endHeader >= endHeader - 2
        );
        if (dup) continue;
        matches.push({
          start,
          endHeader,
          field,
          matchedAs: term,
          priority: term.length * 10,
        });
      }
    }
  }

  return matches;
}

/** Same document index: keep highest priority (longer label / colon form). */
function dedupeByStart(matches: HeadingMatch[]): HeadingMatch[] {
  const byStart = new Map<number, HeadingMatch>();
  for (const m of matches) {
    const prev = byStart.get(m.start);
    if (!prev || m.priority > prev.priority || (m.priority === prev.priority && m.endHeader > prev.endHeader)) {
      byStart.set(m.start, m);
    }
  }
  return [...byStart.values()].sort((a, b) => a.start - b.start);
}

/** First occurrence per API name only (MOU template usually has one block per topic). */
function firstMatchPerField(sorted: HeadingMatch[]): HeadingMatch[] {
  const seen = new Set<string>();
  const out: HeadingMatch[] = [];
  for (const m of sorted) {
    if (seen.has(m.field.name)) continue;
    seen.add(m.field.name);
    out.push(m);
  }
  return out;
}

function buildSectionLengths(text: string, headers: HeadingMatch[]): Map<string, number> {
  const lengths = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const next = headers[i + 1];
    const end = next ? next.start : text.length;
    let body = text.slice(h.endHeader, end);
    body = trimAtInternalHeadings(body);
    body = stripRepeatedFooters(body);
    lengths.set(h.field.name, body.trim().length);
  }
  return lengths;
}

async function describeTextLikeFields(): Promise<SfField[]> {
  const env = (process.env.ENV || 'qa').toLowerCase();
  process.env.ENV = env;
  const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
  }

  const apiUser =
    process.env.SF_API_JWT_USERNAME ||
    (process.env.SF_USE_QA_MRD_FOR_API === 'true' ? process.env.SF_QAMRDUSER_JWT_USERNAME : undefined);

  const auth = await SalesforceJWTAuth.authenticate(apiUser);
  const apiVersion = (config.getSalesforceConfig().apiVersion || 'v59.0').replace(/^v/, '');
  const url = `${auth.instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/sobjects/${OBJECT}/describe`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });

  const fields: SfField[] = (data.fields || []).filter(
    (f: SfField) =>
      f.updateable === true &&
      !f.calculated &&
      TEXT_LIKE_TYPES.has((f.type || '').toLowerCase())
  );

  return fields.sort((a, b) => (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' }));
}

async function main(): Promise<void> {
  const { docx, useSf } = parseArgs();
  console.log(`Docx: ${docx}`);
  console.log(`Salesforce Describe: ${useSf ? `yes (${OBJECT}, ENV=${process.env.ENV || 'qa'})` : 'skipped (--no-sf)'}\n`);

  const plain = docxToPlainText(docx).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');

  let fields: SfField[];
  if (useSf) {
    fields = await describeTextLikeFields();
    console.log(`[OK] ${fields.length} updateable text-like fields on ${OBJECT}\n`);
  } else {
    fields = [];
    console.log('[WARN] No field metadata; doc match counts only where headings align.\n');
  }

  let docLengths = new Map<string, number>();
  if (fields.length > 0) {
    const raw = collectHeadingMatches(plain, fields);
    const deduped = dedupeByStart(raw);
    const ordered = firstMatchPerField(deduped);
    docLengths = buildSectionLengths(plain, ordered);
  }

  console.log('### All text-like Opportunity Readiness fields vs sample MOU\n');
  console.log(
    '| Field label | API name | Type | QA max | Doc chars | vs QA | BA SF-920 | vs BA |'
  );
  console.log('|-------------|----------|------|--------|-----------|-------|-----------|-------|');

  const needMoreQa: string[] = [];
  const needMoreBa: string[] = [];

  if (fields.length === 0) {
    console.log('| — | *(run without --no-sf to load Describe)* | — | — | — | — | — | — |');
  } else {
    for (const f of fields) {
      const maxLen = f.length ?? 0;
      const docChars = docLengths.get(f.name);
      const docStr = docChars === undefined ? '—' : String(docChars);
      const ba = BA_SF920_MAX[f.name];

      let vsQa = '—';
      if (docChars !== undefined) {
        vsQa = docChars > maxLen ? `🔴 +${docChars - maxLen}` : '🟢';
        if (docChars > maxLen) {
          needMoreQa.push(
            `- **${f.name}** (${f.label}): MOU ≈ **${docChars}** chars vs QA **${maxLen}**`
          );
        }
      }

      let vsBa = '—';
      let baCol = '—';
      if (ba !== undefined) {
        baCol = String(ba);
        if (docChars !== undefined) {
          vsBa = docChars > ba ? `🔴 +${docChars - ba}` : '🟢';
          if (docChars > ba) {
            needMoreBa.push(
              `- **${f.name}**: MOU ≈ **${docChars}** vs BA **${ba}** (+${docChars - ba})`
            );
          }
        }
      }

      console.log(
        `| ${f.label.replace(/\|/g, '\\|')} | \`${f.name}\` | ${f.type} | ${maxLen} | ${docStr} | ${vsQa} | ${baCol} | ${vsBa} |`
      );
    }
  }

  console.log('\n### QA org: fields that may need **longer** limits (MOU text > org max)\n');
  if (needMoreQa.length === 0) {
    console.log('_None for matched sections — or no section matched those fields in this doc._\n');
  } else {
    console.log(needMoreQa.join('\n') + '\n');
  }

  console.log('### BA SF-920 (where applicable): MOU text > BA stated max\n');
  if (needMoreBa.length === 0) {
    console.log('_None for matched MOU sections vs BA quartet._\n');
  } else {
    console.log(needMoreBa.join('\n') + '\n');
  }

  const matched = fields.filter((f) => docLengths.has(f.name) && (docLengths.get(f.name) ?? 0) >= 0).length;
  console.log(
    `_Summary: ${matched} / ${fields.length} text-like fields had a recognizable heading in this MOU. ` +
      `"Doc chars" is — when no heading matched that field’s label (or aliases). ` +
      'Headings use `Label*:` or `Label` at line break; see `DOC_HEADING_ALIASES` for MOU wording differences._\n'
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
