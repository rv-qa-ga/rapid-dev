import type {
  AttributeMatchResult,
  CompareMismatch,
  CompareReport,
  CoverageGap,
  DescriptionAlignmentIssue,
  DocumentPairingSummary,
  MappingPair,
  PairSource,
  UnpairedSideRow,
} from './types';
import { fowdMappingPairValuesEqual, normalizeDisplay, valuesEqual } from './normalize';

export function getRowValue(row: Record<string, unknown>, column: string): unknown {
  if (column in row) return row[column];
  const want = column.toUpperCase();
  for (const k of Object.keys(row)) {
    if (k.toUpperCase() === want) return row[k];
  }
  return undefined;
}

function findLineMapping(mapping: MappingPair[]): { snowflake: string; xml: string } {
  const hit = mapping.find((m) => m.xmlAttribute.toUpperCase() === 'LINENUMBER');
  if (hit) return { snowflake: hit.snowflakeColumn, xml: hit.xmlAttribute };
  return { snowflake: 'LINE_NUMBER', xml: 'LINENUMBER' };
}

function findDescriptionColumn(mapping: MappingPair[]): string {
  const hit = mapping.find((m) => m.xmlAttribute.toUpperCase() === 'DESCRIPTION');
  return hit?.snowflakeColumn ?? 'DESCRIPTION';
}

function findDocumentColumn(mapping: MappingPair[]): string {
  const hit = mapping.find((m) => m.xmlAttribute.toUpperCase() === 'DOCUMENT');
  return hit?.snowflakeColumn ?? 'DOCUMENT';
}

function collectDistinctDescriptions(
  rows: Record<string, unknown>[],
  column: string,
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    set.add(normalizeDisplay(getRowValue(row, column)));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function getXmlAttr(attrs: Record<string, string>, name: string): string {
  if (name in attrs) return attrs[name] ?? '';
  const up = name.toUpperCase();
  for (const k of Object.keys(attrs)) {
    if (k.toUpperCase() === up) return attrs[k] ?? '';
  }
  return '';
}

function lineSortKey(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : 0;
}

const EMPTY_DOC_KEY = '__EMPTY_DOCUMENT__';

function documentGroupKey(raw: string): string {
  const t = raw.trim();
  return t === '' ? EMPTY_DOC_KEY : t;
}

/**
 * Group Snowflake rows by DOCUMENT; within each group sort by LINE_NUMBER.
 */
function groupSnowflakeByDocument(
  rows: Record<string, unknown>[],
  docCol: string,
  lineCol: string,
): Map<string, Record<string, unknown>[]> {
  const m = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const dk = documentGroupKey(normalizeDisplay(getRowValue(row, docCol)));
    if (!m.has(dk)) m.set(dk, []);
    m.get(dk)!.push(row);
  }
  for (const [, list] of m) {
    list.sort((a, b) => lineSortKey(getRowValue(a, lineCol)) - lineSortKey(getRowValue(b, lineCol)));
  }
  return m;
}

/**
 * Group XML journal lines by DOCUMENT; within each group sort by LINENUMBER (from mapping).
 */
function groupXmlByDocument(
  xmlByLine: Map<string, Record<string, string>>,
  lineAttr: string,
): Map<string, Record<string, string>[]> {
  const m = new Map<string, Record<string, string>[]>();
  for (const line of xmlByLine.values()) {
    const dk = documentGroupKey(normalizeDisplay(getXmlAttr(line, 'DOCUMENT')));
    if (!m.has(dk)) m.set(dk, []);
    m.get(dk)!.push(line);
  }
  for (const [, list] of m) {
    list.sort(
      (a, b) => lineSortKey(getXmlAttr(a, lineAttr)) - lineSortKey(getXmlAttr(b, lineAttr)),
    );
  }
  return m;
}

function displayDocKey(key: string): string {
  return key === EMPTY_DOC_KEY ? '' : key;
}

function makeMatchKey(docKey: string, pairIndex: number): string {
  const d = displayDocKey(docKey);
  return `DOC:${d || '(empty)'}#${pairIndex}`;
}

/** When pairing by DOCUMENT, LINE_NUMBER and LINENUMBER usually differ (FinOps vs Dynamics); do not compare them. */
function isLineNumberMappingPair(
  mapping: MappingPair[],
  snowflakeColumn: string,
  xmlAttribute: string,
): boolean {
  const line = findLineMapping(mapping);
  return (
    snowflakeColumn.toUpperCase() === line.snowflake.toUpperCase() &&
    xmlAttribute.toUpperCase() === line.xml.toUpperCase()
  );
}

/** One comparison per Snowflake column + XML attribute (mapping workbook may list pairs multiple times). */
function dedupeMappingPairs(mapping: MappingPair[]): MappingPair[] {
  const seen = new Set<string>();
  const out: MappingPair[] = [];
  for (const p of mapping) {
    const k = `${p.snowflakeColumn}|${p.xmlAttribute}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/** First mapping row wins per Snowflake column (workbook sometimes repeats rows). */
function dedupeMappingPairsBySnowflakeColumnFirst(mapping: MappingPair[]): MappingPair[] {
  const seen = new Set<string>();
  const out: MappingPair[] = [];
  for (const p of mapping) {
    const k = p.snowflakeColumn.toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/**
 * Dynamics XML attributes typically equal the Snowflake identifier (often UPPER_SNAKE_CASE)
 * with underscores removed (e.g. CREDIT_AMOUNT → CREDITAMOUNT).
 */
export function snowflakeColumnToConventionXmlName(snowflakeColumn: string): string {
  return snowflakeColumn.replace(/_/g, '').toUpperCase();
}

/** Internal FinOps / dbt metadata columns — not present on Dynamics XML; optional to exclude from compare. */
export function isSnowflakeAccelMetadataColumn(columnName: string): boolean {
  return columnName.startsWith('_ACCEL_');
}

function collectSnowflakeColumnNames(rows: Record<string, unknown>[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) set.add(k);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function collectXmlAttributeNames(xmlByLine: Map<string, Record<string, string>>): string[] {
  const set = new Set<string>();
  for (const line of xmlByLine.values()) {
    for (const k of Object.keys(line)) set.add(k);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Merge explicit mapping pairs with convention pairs for any Snowflake column not covered by mapping
 * whose conventional XML name exists on at least one XML line.
 */
function buildEffectivePairs(
  mappingForPairs: MappingPair[],
  snowflakeCols: string[],
  xmlAttrNames: string[],
): {
  pairs: MappingPair[];
  pairSourceBySnowflakeColumn: Map<string, PairSource>;
} {
  const xmlUpper = new Set(xmlAttrNames.map((x) => x.toUpperCase()));
  const xmlByUpper = new Map<string, string>();
  for (const x of xmlAttrNames) {
    xmlByUpper.set(x.toUpperCase(), x);
  }

  const pairSourceBySnowflakeColumn = new Map<string, PairSource>();
  const bySfUpper = new Map<string, MappingPair>();

  for (const p of mappingForPairs) {
    const k = p.snowflakeColumn.toUpperCase();
    if (bySfUpper.has(k)) continue;
    const xmlActual = xmlByUpper.get(p.xmlAttribute.toUpperCase()) ?? p.xmlAttribute;
    bySfUpper.set(k, { snowflakeColumn: p.snowflakeColumn, xmlAttribute: xmlActual });
    pairSourceBySnowflakeColumn.set(p.snowflakeColumn, 'mapping');
  }

  for (const col of snowflakeCols) {
    const k = col.toUpperCase();
    if (bySfUpper.has(k)) continue;
    const conv = snowflakeColumnToConventionXmlName(col);
    if (xmlUpper.has(conv)) {
      const xmlActual = xmlByUpper.get(conv)!;
      bySfUpper.set(k, { snowflakeColumn: col, xmlAttribute: xmlActual });
      pairSourceBySnowflakeColumn.set(col, 'convention');
    }
  }

  const pairs = [...bySfUpper.values()].sort((a, b) =>
    a.snowflakeColumn.toUpperCase().localeCompare(b.snowflakeColumn.toUpperCase()),
  );
  return { pairs, pairSourceBySnowflakeColumn };
}

function groupAttributeMatchesByMatchKey(
  rows: AttributeMatchResult[],
): Record<string, AttributeMatchResult[]> {
  const out: Record<string, AttributeMatchResult[]> = {};
  for (const m of rows) {
    if (!out[m.matchKey]) out[m.matchKey] = [];
    out[m.matchKey].push(m);
  }
  const sorted: Record<string, AttributeMatchResult[]> = {};
  for (const k of Object.keys(out).sort((a, b) => a.localeCompare(b))) {
    sorted[k] = out[k];
  }
  return sorted;
}

function groupAttributeMismatchesByMatchKey(
  rows: CompareMismatch[],
): Record<string, CompareMismatch[]> {
  const out: Record<string, CompareMismatch[]> = {};
  for (const m of rows) {
    const key = m.matchKey ?? m.lineNumber;
    if (!out[key]) out[key] = [];
    out[key].push(m);
  }
  const sorted: Record<string, CompareMismatch[]> = {};
  for (const k of Object.keys(out).sort((a, b) => a.localeCompare(b))) {
    sorted[k] = out[k];
  }
  return sorted;
}

/**
 * Compare Snowflake rows to XML journal lines using the mapping.
 * Rows are aligned by **DOCUMENT**, then by order within that document (LINE_NUMBER / LINENUMBER).
 */
export function compareFowdAgencyPolicyToXml(
  snowflakeRows: Record<string, unknown>[],
  xmlByLine: Map<string, Record<string, string>>,
  mapping: MappingPair[],
  description: string,
  meta?: {
    xmlElementsRead: number;
    xmlElementsMatchingDescription: number;
    xmlDistinctDescriptionsInFile?: string[];
    xmlDistinctDocumentsInFile?: string[];
    documentFilter?: string;
    /** Omit Snowflake columns whose names start with `_ACCEL_` from pairing, field compare, and coverage gaps. */
    ignoreSnowflakeAccelMetadataColumns?: boolean;
  },
): CompareReport {
  const uniqueMapping = dedupeMappingPairs(mapping);
  const mappingFirstPerSnowflake = dedupeMappingPairsBySnowflakeColumnFirst(uniqueMapping);
  const { snowflake: lineCol, xml: lineXmlAttr } = findLineMapping(mapping);
  const descCol = findDescriptionColumn(mapping);
  const docCol = findDocumentColumn(mapping);
  const filterNorm = normalizeDisplay(description);
  const documentFilter = meta?.documentFilter?.trim();
  const documentNorm = documentFilter !== undefined && documentFilter !== '' ? normalizeDisplay(documentFilter) : undefined;
  const xmlDistinctDescriptionsInFile = meta?.xmlDistinctDescriptionsInFile ?? [];
  const xmlDistinctDocumentsInFile = meta?.xmlDistinctDocumentsInFile ?? [];
  const snowflakeDistinctDescriptions = collectDistinctDescriptions(snowflakeRows, descCol);
  const snowflakeDistinctDocuments = collectDistinctDescriptions(snowflakeRows, docCol);

  const descriptionAlignmentIssues: DescriptionAlignmentIssue[] = [];

  for (const row of snowflakeRows) {
    const rowDesc = normalizeDisplay(getRowValue(row, descCol));
    if (!valuesEqual(rowDesc, filterNorm)) {
      const lineVal = normalizeDisplay(getRowValue(row, lineCol));
      descriptionAlignmentIssues.push({
        code: 'SNOWFLAKE_ROW_DESCRIPTION_NE_FILTER',
        message: `Snowflake row DESCRIPTION does not match --description filter (LINE_NUMBER=${lineVal || '?'}).`,
        lineNumber: lineVal || undefined,
        expectedDescription: description,
        snowflakeDescription: rowDesc,
      });
    }
    if (documentNorm !== undefined) {
      const rowDoc = normalizeDisplay(getRowValue(row, docCol));
      if (!valuesEqual(rowDoc, documentNorm)) {
        const lineVal = normalizeDisplay(getRowValue(row, lineCol));
        descriptionAlignmentIssues.push({
          code: 'SNOWFLAKE_ROW_DOCUMENT_NE_FILTER',
          message: `Snowflake row DOCUMENT does not match --document filter (LINE_NUMBER=${lineVal || '?'}).`,
          lineNumber: lineVal || undefined,
          expectedDocument: documentFilter,
          snowflakeDocument: rowDoc,
        });
      }
    }
  }

  const xmlMatchCount = meta?.xmlElementsMatchingDescription ?? 0;
  if (snowflakeRows.length > 0 && xmlMatchCount === 0) {
    const xmlList =
      xmlDistinctDescriptionsInFile.length > 0
        ? xmlDistinctDescriptionsInFile.join('; ')
        : '(none)';
    const docList =
      xmlDistinctDocumentsInFile.length > 0
        ? xmlDistinctDocumentsInFile.join('; ')
        : '(none)';
    const filters =
      documentNorm !== undefined
        ? `--description and --document (${documentFilter})`
        : `--description`;
    descriptionAlignmentIssues.push({
      code: 'NO_XML_LINES_FOR_FILTER',
      message: `Snowflake returned ${snowflakeRows.length} row(s) for ${filters}, but no XML journal lines match the same filters. Distinct DESCRIPTION value(s) in XML file: ${xmlList}. Distinct DOCUMENT value(s) in XML file: ${docList}`,
      expectedDescription: description,
      expectedDocument: documentFilter,
    });
  }

  if (snowflakeRows.length === 0 && xmlMatchCount > 0) {
    const filters =
      documentNorm !== undefined
        ? `DESCRIPTION and DOCUMENT (${documentFilter})`
        : 'DESCRIPTION';
    descriptionAlignmentIssues.push({
      code: 'NO_SNOWFLAKE_ROWS_FOR_FILTER',
      message: `XML has ${xmlMatchCount} journal line(s) matching ${filters}, but Snowflake returned no rows for the same filters.`,
      expectedDescription: description,
      expectedDocument: documentFilter,
    });
  }

  const sfByDoc = groupSnowflakeByDocument(snowflakeRows, docCol, lineCol);
  const xmlByDoc = groupXmlByDocument(xmlByLine, lineXmlAttr);

  const ignoreAccel = meta?.ignoreSnowflakeAccelMetadataColumns === true;
  const snowflakeColsAll = collectSnowflakeColumnNames(snowflakeRows);
  const snowflakeAccelMetadataColumnsIgnored = ignoreAccel
    ? snowflakeColsAll.filter((c) => isSnowflakeAccelMetadataColumn(c)).sort((a, b) => a.localeCompare(b))
    : [];
  const snowflakeCols = ignoreAccel
    ? snowflakeColsAll.filter((c) => !isSnowflakeAccelMetadataColumn(c))
    : snowflakeColsAll;
  const mappingForEffective = ignoreAccel
    ? mappingFirstPerSnowflake.filter((p) => !isSnowflakeAccelMetadataColumn(p.snowflakeColumn))
    : mappingFirstPerSnowflake;

  const xmlAttrNames = collectXmlAttributeNames(xmlByLine);
  const { pairs: effectivePairs, pairSourceBySnowflakeColumn } = buildEffectivePairs(
    mappingForEffective,
    snowflakeCols,
    xmlAttrNames,
  );

  const fromMapping = [...pairSourceBySnowflakeColumn.values()].filter((s) => s === 'mapping').length;
  const fromConvention = [...pairSourceBySnowflakeColumn.values()].filter((s) => s === 'convention').length;

  const pairedSfUpper = new Set(effectivePairs.map((p) => p.snowflakeColumn.toUpperCase()));
  const snowflakeColumnsWithoutXmlAttribute = snowflakeCols.filter((c) => !pairedSfUpper.has(c.toUpperCase()));

  const pairedXmlUpper = new Set(effectivePairs.map((p) => p.xmlAttribute.toUpperCase()));
  const xmlAttributesWithoutSnowflakeColumn = xmlAttrNames.filter((x) => !pairedXmlUpper.has(x.toUpperCase()));

  const coverageGaps: CoverageGap[] = [
    ...snowflakeColumnsWithoutXmlAttribute.map((snowflakeColumn) => ({
      snowflakeColumn,
      reason: 'SNOWFLAKE_COLUMN_NO_XML' as const,
    })),
    ...xmlAttributesWithoutSnowflakeColumn.map((xmlAttribute) => ({
      xmlAttribute,
      reason: 'XML_ATTRIBUTE_NO_SNOWFLAKE' as const,
    })),
  ];

  const allDocKeys = new Set<string>([...sfByDoc.keys(), ...xmlByDoc.keys()]);
  const documentPairingSummary: DocumentPairingSummary[] = [];
  const documentsOnlyInSnowflake: string[] = [];
  const documentsOnlyInXml: string[] = [];
  const unpairedSnowflakeRows: UnpairedSideRow[] = [];
  const unpairedXmlRows: UnpairedSideRow[] = [];
  const linesOnlyInSnowflake: string[] = [];
  const linesOnlyInXml: string[] = [];
  const mismatches: CompareMismatch[] = [];
  const attributeMatches: AttributeMatchResult[] = [];
  let comparedFieldPairs = 0;
  let matchedFieldPairs = 0;

  for (const docKey of [...allDocKeys].sort((a, b) => displayDocKey(a).localeCompare(displayDocKey(b)))) {
    const sfList = sfByDoc.get(docKey) ?? [];
    const xmlList = xmlByDoc.get(docKey) ?? [];

    if (sfList.length > 0 && xmlList.length === 0) {
      documentPairingSummary.push({
        document: displayDocKey(docKey),
        snowflakeRowCount: sfList.length,
        xmlLineCount: 0,
        pairedLineCount: 0,
        unpairedSnowflakeRows: sfList.length,
        unpairedXmlLines: 0,
      });
      documentsOnlyInSnowflake.push(displayDocKey(docKey));
      for (const row of sfList) {
        const ln = normalizeDisplay(getRowValue(row, lineCol));
        linesOnlyInSnowflake.push(ln);
        unpairedSnowflakeRows.push({ document: displayDocKey(docKey), lineNumber: ln });
      }
      continue;
    }

    if (xmlList.length > 0 && sfList.length === 0) {
      documentPairingSummary.push({
        document: displayDocKey(docKey),
        snowflakeRowCount: 0,
        xmlLineCount: xmlList.length,
        pairedLineCount: 0,
        unpairedSnowflakeRows: 0,
        unpairedXmlLines: xmlList.length,
      });
      documentsOnlyInXml.push(displayDocKey(docKey));
      for (const line of xmlList) {
        const ln = normalizeDisplay(getXmlAttr(line, lineXmlAttr));
        linesOnlyInXml.push(ln);
        unpairedXmlRows.push({ document: displayDocKey(docKey), lineNumber: ln });
      }
      continue;
    }

    const n = Math.min(sfList.length, xmlList.length);
    documentPairingSummary.push({
      document: displayDocKey(docKey),
      snowflakeRowCount: sfList.length,
      xmlLineCount: xmlList.length,
      pairedLineCount: n,
      unpairedSnowflakeRows: sfList.length - n,
      unpairedXmlLines: xmlList.length - n,
    });
    for (let i = 0; i < n; i++) {
      const sf = sfList[i];
      const xml = xmlList[i];
      const mk = makeMatchKey(docKey, i);
      const docDisplay = displayDocKey(docKey);

      const sfd = normalizeDisplay(getRowValue(sf, descCol));
      const xmd = normalizeDisplay(getXmlAttr(xml, 'DESCRIPTION'));
      if (!valuesEqual(sfd, xmd)) {
        descriptionAlignmentIssues.push({
          code: 'PAIR_DESCRIPTION_MISMATCH',
          message: `${mk}: DESCRIPTION in Snowflake does not match DESCRIPTION on the XML journal line.`,
          lineNumber: mk,
          snowflakeDescription: sfd,
          xmlDescription: xmd,
        });
      }
      const sDoc = normalizeDisplay(getRowValue(sf, docCol));
      const xDoc = normalizeDisplay(getXmlAttr(xml, 'DOCUMENT'));
      if (!valuesEqual(sDoc, xDoc)) {
        descriptionAlignmentIssues.push({
          code: 'PAIR_DOCUMENT_MISMATCH',
          message: `${mk}: DOCUMENT in Snowflake does not match DOCUMENT on the XML journal line.`,
          lineNumber: mk,
          snowflakeDocument: sDoc,
          xmlDocument: xDoc,
        });
      }

      const sfLineNo = normalizeDisplay(getRowValue(sf, lineCol));
      const xmlLineNo = normalizeDisplay(getXmlAttr(xml, lineXmlAttr));

      for (const { snowflakeColumn, xmlAttribute } of effectivePairs) {
        if (isLineNumberMappingPair(mapping, snowflakeColumn, xmlAttribute)) {
          continue;
        }
        comparedFieldPairs += 1;
        const ps: PairSource = pairSourceBySnowflakeColumn.get(snowflakeColumn) ?? 'mapping';
        const rawSf = getRowValue(sf, snowflakeColumn);
        const rawXml = getXmlAttr(xml, xmlAttribute);
        const s = normalizeDisplay(rawSf);
        const x = normalizeDisplay(rawXml);
        if (valuesEqual(s, x) || fowdMappingPairValuesEqual(snowflakeColumn, xmlAttribute, s, x)) {
          matchedFieldPairs += 1;
          attributeMatches.push({
            matchKey: mk,
            document: docDisplay,
            pairIndex: i,
            snowflakeLineNumber: sfLineNo,
            xmlLineNumber: xmlLineNo,
            snowflakeColumn,
            xmlAttribute,
            pairSource: ps,
            snowflakeDisplay: s,
            xmlDisplay: x,
          });
        } else {
          mismatches.push({
            kind: 'MAPPING_ATTRIBUTE',
            pairSource: ps,
            lineNumber: mk,
            matchKey: mk,
            document: docDisplay,
            pairIndex: i,
            snowflakeLineNumber: sfLineNo,
            xmlLineNumber: xmlLineNo,
            snowflakeColumn,
            xmlAttribute,
            snowflakeDisplay: s,
            xmlDisplay: x,
          });
        }
      }
    }

    for (let j = n; j < sfList.length; j++) {
      const row = sfList[j];
      const ln = normalizeDisplay(getRowValue(row, lineCol));
      const mk = makeMatchKey(docKey, j);
      unpairedSnowflakeRows.push({ document: displayDocKey(docKey), lineNumber: ln });
      linesOnlyInSnowflake.push(ln);
      mismatches.push({
        kind: 'UNPAIRED_ROW',
        lineNumber: mk,
        matchKey: mk,
        document: displayDocKey(docKey),
        pairIndex: j,
        snowflakeLineNumber: ln,
        snowflakeColumn: '__ROW_UNPAIRED__',
        xmlAttribute: '__ROW_UNPAIRED__',
        snowflakeDisplay: `Extra Snowflake row for DOCUMENT "${displayDocKey(docKey)}" (LINE_NUMBER=${ln}); no matching XML line at same index.`,
        xmlDisplay: '',
      });
    }

    for (let j = n; j < xmlList.length; j++) {
      const line = xmlList[j];
      const ln = normalizeDisplay(getXmlAttr(line, lineXmlAttr));
      const mk = makeMatchKey(docKey, j);
      unpairedXmlRows.push({ document: displayDocKey(docKey), lineNumber: ln });
      linesOnlyInXml.push(ln);
      mismatches.push({
        kind: 'UNPAIRED_ROW',
        lineNumber: mk,
        matchKey: mk,
        document: displayDocKey(docKey),
        pairIndex: j,
        xmlLineNumber: ln,
        snowflakeColumn: '__ROW_UNPAIRED__',
        xmlAttribute: '__ROW_UNPAIRED__',
        snowflakeDisplay: '',
        xmlDisplay: `Extra XML journal line for DOCUMENT "${displayDocKey(docKey)}" (LINENUMBER=${ln}); no matching Snowflake row at same index.`,
      });
    }
  }

  linesOnlyInSnowflake.sort((a, b) => lineSortKey(a) - lineSortKey(b) || a.localeCompare(b));
  linesOnlyInXml.sort((a, b) => lineSortKey(a) - lineSortKey(b) || a.localeCompare(b));

  const descriptionAlignmentOk = descriptionAlignmentIssues.length === 0;
  const pairingOk = unpairedSnowflakeRows.length === 0 && unpairedXmlRows.length === 0;
  const mappingAttributeMismatches = mismatches.filter((m) => m.kind === 'MAPPING_ATTRIBUTE');
  const valueMismatches = mappingAttributeMismatches;
  const mismatchesByMatchKey = groupAttributeMismatchesByMatchKey(mappingAttributeMismatches);
  const attributeMatchesByMatchKey = groupAttributeMatchesByMatchKey(attributeMatches);
  const ok = descriptionAlignmentOk && pairingOk && valueMismatches.length === 0;

  const out: CompareReport = {
    description,
    snowflakeDistinctDescriptions,
    snowflakeDistinctDocuments,
    xmlDistinctDescriptionsInFile,
    xmlDistinctDocumentsInFile,
    descriptionAlignmentOk,
    descriptionAlignmentIssues,
    snowflakeRowCount: snowflakeRows.length,
    xmlLineCount: xmlByLine.size,
    xmlElementsRead: meta?.xmlElementsRead ?? 0,
    xmlElementsMatchingDescription: meta?.xmlElementsMatchingDescription ?? xmlByLine.size,
    matchStrategy: 'DOCUMENT',
    documentPairingSummary,
    documentsOnlyInSnowflake,
    documentsOnlyInXml,
    unpairedSnowflakeRows,
    unpairedXmlRows,
    linesOnlyInSnowflake,
    linesOnlyInXml,
    mappingAttributeMismatches,
    mismatchesByMatchKey,
    attributeMatches,
    attributeMatchesByMatchKey,
    pairCounts: {
      fromMapping,
      fromConvention,
      totalPairsPerRow: effectivePairs.filter(
        (p) => !isLineNumberMappingPair(mapping, p.snowflakeColumn, p.xmlAttribute),
      ).length,
    },
    snowflakeColumnsWithoutXmlAttribute,
    xmlAttributesWithoutSnowflakeColumn,
    coverageGaps,
    snowflakeAccelMetadataColumnsIgnored,
    ignoreSnowflakeAccelMetadataColumns: ignoreAccel,
    mismatches,
    comparedFieldPairs,
    matchedFieldPairs,
    ok,
  };
  if (documentFilter !== undefined && documentFilter !== '') {
    out.documentFilter = documentFilter;
  }
  return out;
}
