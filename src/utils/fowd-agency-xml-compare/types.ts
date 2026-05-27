/**
 * Types for FOWD agency policy Snowflake ↔ Dynamics XML journal comparison.
 */

export type MappingPair = {
  snowflakeColumn: string;
  xmlAttribute: string;
};

export type CompareMismatchKind = 'MAPPING_ATTRIBUTE' | 'UNPAIRED_ROW';

/** How a Snowflake column was linked to an XML attribute for comparison. */
export type PairSource = 'mapping' | 'convention';

export type CompareMismatch = {
  kind?: CompareMismatchKind;
  /** `mapping` = Lloyds xlsx row; `convention` = Snowflake name → XML by removing underscores (e.g. CREDIT_AMOUNT → CREDITAMOUNT). */
  pairSource?: PairSource;
  /**
   * Match key for this comparison. Rows are paired by DOCUMENT, then by order within
   * that document (LINE_NUMBER / LINENUMBER). Format: `DOC:<document>#<pairIndex>`.
   */
  lineNumber: string;
  /** Same as {@link lineNumber}; kept for clarity in JSON output. */
  matchKey?: string;
  document?: string;
  pairIndex?: number;
  /** Snowflake LINE_NUMBER for this paired row (when {@link kind} is `MAPPING_ATTRIBUTE`). */
  snowflakeLineNumber?: string;
  /** XML LINENUMBER for this paired journal line (when {@link kind} is `MAPPING_ATTRIBUTE`). */
  xmlLineNumber?: string;
  snowflakeColumn: string;
  xmlAttribute: string;
  snowflakeDisplay: string;
  xmlDisplay: string;
};

/** One successful Snowflake column ↔ XML attribute comparison for a paired journal line. */
export type AttributeMatchResult = {
  matchKey: string;
  document?: string;
  pairIndex?: number;
  snowflakeLineNumber?: string;
  xmlLineNumber?: string;
  snowflakeColumn: string;
  xmlAttribute: string;
  pairSource: PairSource;
  snowflakeDisplay: string;
  xmlDisplay: string;
};

/** Snowflake columns present in query results with no XML attribute to compare (no mapping and no convention name on XML). */
export type CoverageGap = {
  snowflakeColumn?: string;
  xmlAttribute?: string;
  reason: 'SNOWFLAKE_COLUMN_NO_XML' | 'XML_ATTRIBUTE_NO_SNOWFLAKE';
};

/** Snowflake row with no XML partner for the same DOCUMENT (after pairing by line order). */
export type UnpairedSideRow = {
  document: string;
  lineNumber: string;
};

/** Per-DOCUMENT row counts: how many Snowflake rows vs XML lines, and how many paired vs unpaired. */
export type DocumentPairingSummary = {
  document: string;
  snowflakeRowCount: number;
  xmlLineCount: number;
  /** Pairs compared (min of SF vs XML counts for this document). */
  pairedLineCount: number;
  unpairedSnowflakeRows: number;
  unpairedXmlLines: number;
};

/** Structured DESCRIPTION / DOCUMENT alignment problems (Snowflake ↔ XML and filters). */
export type DescriptionAlignmentIssue = {
  code:
    | 'SNOWFLAKE_ROW_DESCRIPTION_NE_FILTER'
    | 'SNOWFLAKE_ROW_DOCUMENT_NE_FILTER'
    | 'NO_XML_LINES_FOR_FILTER'
    | 'NO_SNOWFLAKE_ROWS_FOR_FILTER'
    | 'PAIR_DESCRIPTION_MISMATCH'
    | 'PAIR_DOCUMENT_MISMATCH';
  message: string;
  lineNumber?: string;
  expectedDescription?: string;
  snowflakeDescription?: string;
  xmlDescription?: string;
  expectedDocument?: string;
  snowflakeDocument?: string;
  xmlDocument?: string;
};

export type CompareReport = {
  description: string;
  /** When set, results were filtered to this DOCUMENT (Snowflake column + XML attribute). */
  documentFilter?: string;
  /** Distinct DESCRIPTION values returned from Snowflake for this run. */
  snowflakeDistinctDescriptions: string[];
  /** Distinct DOCUMENT values returned from Snowflake for this run. */
  snowflakeDistinctDocuments: string[];
  /** Distinct DESCRIPTION attributes on all LEDGERJOURNALENTITY rows in the XML file (before filter). */
  xmlDistinctDescriptionsInFile: string[];
  /** Distinct DOCUMENT attributes on all LEDGERJOURNALENTITY rows in the XML file (before filter). */
  xmlDistinctDocumentsInFile: string[];
  /** False if any {@link descriptionAlignmentIssues} are present. */
  descriptionAlignmentOk: boolean;
  descriptionAlignmentIssues: DescriptionAlignmentIssue[];
  snowflakeRowCount: number;
  xmlLineCount: number;
  xmlElementsRead: number;
  xmlElementsMatchingDescription: number;
  /** Rows are matched by DOCUMENT (not LINE_NUMBER). */
  matchStrategy: 'DOCUMENT';
  /** Row counts per DOCUMENT (Snowflake vs XML, paired vs extra on each side). */
  documentPairingSummary: DocumentPairingSummary[];
  /** DOCUMENT values present in Snowflake but with no XML line carrying that DOCUMENT. */
  documentsOnlyInSnowflake: string[];
  /** DOCUMENT values present in XML but with no Snowflake row carrying that DOCUMENT. */
  documentsOnlyInXml: string[];
  /**
   * Snowflake rows left over when there are more rows than XML lines for the same DOCUMENT
   * (paired by sorted LINE_NUMBER vs LINENUMBER).
   */
  unpairedSnowflakeRows: UnpairedSideRow[];
  /**
   * XML journal lines left over when there are more lines than Snowflake rows for the same DOCUMENT.
   */
  unpairedXmlRows: UnpairedSideRow[];
  /** @deprecated Use {@link documentsOnlyInSnowflake} / {@link unpairedSnowflakeRows} (DOCUMENT matching). */
  linesOnlyInSnowflake: string[];
  /** @deprecated Use {@link documentsOnlyInXml} / {@link unpairedXmlRows} (DOCUMENT matching). */
  linesOnlyInXml: string[];
  /**
   * Every Snowflake column vs XML attribute mismatch (mapping + convention pairs).
   * Excludes structural `UNPAIRED_ROW` pseudo-mismatches.
   */
  mappingAttributeMismatches: CompareMismatch[];
  /** {@link mappingAttributeMismatches} grouped by {@link CompareMismatch.matchKey} for reporting. */
  mismatchesByMatchKey: Record<string, CompareMismatch[]>;
  /** Successful comparisons (same structure as mismatches, for audit). */
  attributeMatches: AttributeMatchResult[];
  /** {@link attributeMatches} grouped by {@link AttributeMatchResult.matchKey}. */
  attributeMatchesByMatchKey: Record<string, AttributeMatchResult[]>;
  /** Count of pairs taken from the mapping workbook vs name convention. */
  pairCounts: { fromMapping: number; fromConvention: number; totalPairsPerRow: number };
  /** Snowflake columns (across the result set) with no corresponding XML attribute name. */
  snowflakeColumnsWithoutXmlAttribute: string[];
  /** XML attribute names (across filtered journal lines) with no Snowflake column (mapping or convention). */
  xmlAttributesWithoutSnowflakeColumn: string[];
  coverageGaps: CoverageGap[];
  /**
   * Snowflake columns omitted from pairing/coverage when {@link CompareReport.ignoreSnowflakeAccelMetadataColumns} is true
   * (names starting with `_ACCEL_`, internal load metadata).
   */
  snowflakeAccelMetadataColumnsIgnored: string[];
  /** When true, `_ACCEL_*` Snowflake columns were excluded from mapping/convention compare and coverage gaps. */
  ignoreSnowflakeAccelMetadataColumns: boolean;
  /** All issues including unpaired rows and attribute mismatches (flat list). */
  mismatches: CompareMismatch[];
  comparedFieldPairs: number;
  matchedFieldPairs: number;
  ok: boolean;
};
