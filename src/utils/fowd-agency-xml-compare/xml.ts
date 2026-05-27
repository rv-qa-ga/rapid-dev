import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import type { MappingPair } from './types';

const XML_ROOT = 'Document';
const LEDGER = 'LEDGERJOURNALENTITY';

export type ParseJournalXmlOptions = {
  /** When set, only include lines whose DOCUMENT attribute equals this (trimmed). */
  document?: string;
};

function asArray<T>(x: T | T[] | undefined): T[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

function findLineMapping(mapping: MappingPair[]): { snowflake: string; xml: string } {
  const hit = mapping.find((m) => m.xmlAttribute.toUpperCase() === 'LINENUMBER');
  if (hit) return { snowflake: hit.snowflakeColumn, xml: hit.xmlAttribute };
  return { snowflake: 'LINE_NUMBER', xml: 'LINENUMBER' };
}

/**
 * Parse Dynamics journal XML text; keep `LEDGERJOURNALENTITY` rows whose DESCRIPTION matches (trimmed).
 * Optionally require DOCUMENT to match {@link ParseJournalXmlOptions.document}.
 */
export function parseLedgerJournalEntitiesFromXmlContent(
  xmlText: string,
  description: string,
  mapping: MappingPair[],
  options?: ParseJournalXmlOptions,
): {
  byLine: Map<string, Record<string, string>>;
  elementsRead: number;
  matchingDescription: number;
  distinctDescriptionsInFile: string[];
  distinctDocumentsInFile: string[];
} {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (name) => name === LEDGER,
    trimValues: true,
  });
  const doc = parser.parse(xmlText) as Record<string, unknown>;
  const root = doc[XML_ROOT] ?? doc.document ?? doc;
  if (!root || typeof root !== 'object') {
    throw new Error(`Unexpected XML root: expected <${XML_ROOT}>`);
  }
  const rootObj = root as Record<string, unknown>;
  const raw = rootObj[LEDGER];
  const entities = asArray(raw as Record<string, unknown> | Record<string, unknown>[]);

  const distinctDesc = new Set<string>();
  const distinctDoc = new Set<string>();
  for (const ent of entities) {
    if (!ent || typeof ent !== 'object') continue;
    const attrs = ent as Record<string, unknown>;
    distinctDesc.add(normalizeAttr(attrs, 'DESCRIPTION').trim());
    distinctDoc.add(normalizeAttr(attrs, 'DOCUMENT').trim());
  }
  const distinctDescriptionsInFile = [...distinctDesc].sort((a, b) => a.localeCompare(b));
  const distinctDocumentsInFile = [...distinctDoc].sort((a, b) => a.localeCompare(b));

  const { xml: lineAttr } = findLineMapping(mapping);
  const want = description.trim();
  const docFilter = options?.document?.trim();
  const byLine = new Map<string, Record<string, string>>();
  let matchingDescription = 0;
  let matchIndex = 0;

  for (const ent of entities) {
    if (!ent || typeof ent !== 'object') continue;
    const attrs = ent as Record<string, unknown>;
    const descVal = normalizeAttr(attrs, 'DESCRIPTION');
    if (descVal.trim() !== want) continue;
    if (docFilter !== undefined && docFilter !== '') {
      const docVal = normalizeAttr(attrs, 'DOCUMENT').trim();
      if (docVal !== docFilter) continue;
    }
    matchingDescription += 1;
    matchIndex += 1;
    const lineRaw = normalizeAttr(attrs, lineAttr);
    const lineKey = lineRaw.trim() === '' ? String(matchIndex) : lineRaw.trim();
    const stringRecord: Record<string, string> = {};
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      stringRecord[k] = v === null || v === undefined ? '' : String(v);
    }
    byLine.set(lineKey, stringRecord);
  }

  return {
    byLine,
    elementsRead: entities.length,
    matchingDescription,
    distinctDescriptionsInFile,
    distinctDocumentsInFile,
  };
}

/**
 * Read XML from disk and parse journal entities (see {@link parseLedgerJournalEntitiesFromXmlContent}).
 */
export function parseLedgerJournalEntitiesFromXml(
  xmlFilePath: string,
  description: string,
  mapping: MappingPair[],
  options?: ParseJournalXmlOptions,
): {
  byLine: Map<string, Record<string, string>>;
  elementsRead: number;
  matchingDescription: number;
  distinctDescriptionsInFile: string[];
  distinctDocumentsInFile: string[];
} {
  const xmlText = fs.readFileSync(xmlFilePath, 'utf8');
  try {
    return parseLedgerJournalEntitiesFromXmlContent(xmlText, description, mapping, options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${msg} (file: ${xmlFilePath})`);
  }
}

function normalizeAttr(attrs: Record<string, unknown>, name: string): string {
  const upper = name.toUpperCase();
  for (const k of Object.keys(attrs)) {
    if (k.toUpperCase() === upper) {
      const v = attrs[k];
      return v === null || v === undefined ? '' : String(v);
    }
  }
  return '';
}
