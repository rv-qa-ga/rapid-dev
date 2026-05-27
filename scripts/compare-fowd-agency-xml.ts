/**
 * Compare Snowflake FOWD__AGENCY_POLICY_FO_V1 rows for a DESCRIPTION against a Dynamics
 * LEDGERJOURNALENTITY XML file, using LloydsADP_XML_Mapping.xlsx (column A = Snowflake, B = XML).
 * Rows are aligned by **DOCUMENT** (then by LINE_NUMBER / LINENUMBER order within the same document).
 * LINE_NUMBER vs LINENUMBER is not compared (FinOps vs Dynamics line ids often differ).
 *
 * Env: SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, plus either SNOWFLAKE_CLIENT_ID + SNOWFLAKE_CLIENT_SECRET
 * (Entra OAuth / SPN), or SNOWFLAKE_PASSWORD, or SNOWFLAKE_AUTHENTICATOR=EXTERNALBROWSER without client creds.
 * Optional: SNOWFLAKE_ROLE, SNOWFLAKE_WAREHOUSE, SNOWFLAKE_DATABASE, SNOWFLAKE_OAUTH_SCOPE, tenant / token URL vars.
 *
 * Usage:
 *   cross-env ENV=qa ts-node scripts/compare-fowd-agency-xml.ts --description "AEUM US-58338 Agency DP Test" --xml "path/to/file.xml" --mapping "path/to/LloydsADP_XML_Mapping.xlsx"
 *   npm run compare:fowd-agency-xml -- --description "..." --xml "..." --mapping "..."
 *
 * Optional:
 *   --document "100317432"   (filter Snowflake + XML by DOCUMENT; Dynamics journal attribute DOCUMENT)
 *   --include-accel-metadata   (compare `_ACCEL_*` Snowflake columns; default is to ignore them in coverage/compare)
 *   --sheet ADP_XML_Mapping   (default: worksheet named ADP_XML_Mapping or first sheet)
 *   --table SCHEMA.DB.SCHEMA.TABLE  (override FOWD table FQN)
 *   --json-out path/report.json
 *   --report-xml path/compare-report.xml   (XHTML: green=match, red=mismatch per attribute; open in browser)
 *   By default, --json-out and --report-xml are written to a new file each run: basename gets a UTC
 *   timestamp (and a numeric suffix if the path already exists) so reports are never overwritten.
 *   --exact-report-paths   write exactly to the paths given (may overwrite existing files)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  compareFowdAgencyPolicyToXml,
  connectFinOpsSnowflake,
  DEFAULT_FOWD_TABLE,
  destroyConnection,
  fetchFowdAgencyPolicyRows,
  loadFinOpsSnowflakeEnv,
  loadMappingFromXlsx,
  parseLedgerJournalEntitiesFromXml,
  resolveUniqueTimestampedReportPath,
  writeFowdCompareReportXml,
} from '../src/utils/fowd-agency-xml-compare';

type CliArgs = {
  description: string;
  document?: string;
  xml: string;
  mapping: string;
  sheet?: string;
  table: string;
  jsonOut?: string;
  reportXml?: string;
  /** When false (default), Snowflake columns starting with `_ACCEL_` are ignored. */
  ignoreSnowflakeAccelMetadataColumns: boolean;
  /** When true, write --json-out / --report-xml to exact paths (overwrite). Default false = timestamped paths. */
  exactReportPaths: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  let description = '';
  let xml = '';
  let mapping = '';
  let sheet: string | undefined;
  let table = process.env.FOWD_COMPARE_TABLE?.trim() || DEFAULT_FOWD_TABLE;
  let jsonOut: string | undefined;
  let reportXml: string | undefined;
  let document: string | undefined;
  let includeAccelMetadata = false;
  let exactReportPaths = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--description' && argv[i + 1]) {
      description = argv[++i];
    } else if (a.startsWith('--description=')) {
      description = a.slice('--description='.length);
    } else if (a === '--document' && argv[i + 1]) {
      document = argv[++i];
    } else if (a.startsWith('--document=')) {
      document = a.slice('--document='.length);
    } else if (a === '--xml' && argv[i + 1]) {
      xml = path.resolve(argv[++i]);
    } else if (a.startsWith('--xml=')) {
      xml = path.resolve(a.slice('--xml='.length));
    } else if (a === '--mapping' && argv[i + 1]) {
      mapping = path.resolve(argv[++i]);
    } else if (a.startsWith('--mapping=')) {
      mapping = path.resolve(a.slice('--mapping='.length));
    } else if (a === '--sheet' && argv[i + 1]) {
      sheet = argv[++i];
    } else if (a.startsWith('--sheet=')) {
      sheet = a.slice('--sheet='.length);
    } else if (a === '--table' && argv[i + 1]) {
      table = argv[++i];
    } else if (a.startsWith('--table=')) {
      table = a.slice('--table='.length);
    } else if (a === '--json-out' && argv[i + 1]) {
      jsonOut = path.resolve(argv[++i]);
    } else if (a.startsWith('--json-out=')) {
      jsonOut = path.resolve(a.slice('--json-out='.length));
    } else if (a === '--report-xml' && argv[i + 1]) {
      reportXml = path.resolve(argv[++i]);
    } else if (a.startsWith('--report-xml=')) {
      reportXml = path.resolve(a.slice('--report-xml='.length));
    } else if (a === '--include-accel-metadata') {
      includeAccelMetadata = true;
    } else if (a === '--exact-report-paths') {
      exactReportPaths = true;
    }
  }

  if (!description.trim()) {
    throw new Error('Missing required --description "..."');
  }
  if (!xml) {
    throw new Error('Missing required --xml path/to/file.xml');
  }
  if (!mapping) {
    throw new Error('Missing required --mapping path/to/LloydsADP_XML_Mapping.xlsx');
  }
  if (!fs.existsSync(xml)) {
    throw new Error(`XML file not found: ${xml}`);
  }
  if (!fs.existsSync(mapping)) {
    throw new Error(`Mapping workbook not found: ${mapping}`);
  }

  return {
    description: description.trim(),
    document: document?.trim() || undefined,
    xml,
    mapping,
    sheet,
    table,
    jsonOut,
    reportXml,
    ignoreSnowflakeAccelMetadataColumns: !includeAccelMetadata,
    exactReportPaths,
  };
}

async function main(): Promise<void> {
  loadFinOpsSnowflakeEnv();
  const args = parseArgs(process.argv.slice(2));

  const mapping = await loadMappingFromXlsx(args.mapping, args.sheet ? { sheetName: args.sheet } : undefined);
  const xmlResult = parseLedgerJournalEntitiesFromXml(args.xml, args.description, mapping, {
    document: args.document,
  });

  const connection = await connectFinOpsSnowflake();
  let snowflakeRows: Record<string, unknown>[];
  try {
    snowflakeRows = await fetchFowdAgencyPolicyRows(connection, args.description, {
      tableFqn: args.table,
      document: args.document,
    });
  } finally {
    if (connection.isUp()) {
      await destroyConnection(connection);
    }
  }

  const report = compareFowdAgencyPolicyToXml(snowflakeRows, xmlResult.byLine, mapping, args.description, {
    xmlElementsRead: xmlResult.elementsRead,
    xmlElementsMatchingDescription: xmlResult.matchingDescription,
    xmlDistinctDescriptionsInFile: xmlResult.distinctDescriptionsInFile,
    xmlDistinctDocumentsInFile: xmlResult.distinctDocumentsInFile,
    documentFilter: args.document,
    ignoreSnowflakeAccelMetadataColumns: args.ignoreSnowflakeAccelMetadataColumns,
  });

  const valueMismatchCount = report.mappingAttributeMismatches.length;

  const summary = {
    ok: report.ok,
    matchStrategy: report.matchStrategy,
    description: report.description,
    documentFilter: report.documentFilter,
    descriptionAlignmentOk: report.descriptionAlignmentOk,
    descriptionAlignmentIssues: report.descriptionAlignmentIssues,
    pairCounts: report.pairCounts,
    snowflakeDistinctDescriptions: report.snowflakeDistinctDescriptions,
    snowflakeDistinctDocuments: report.snowflakeDistinctDocuments,
    xmlDistinctDescriptionsInFile: report.xmlDistinctDescriptionsInFile,
    xmlDistinctDocumentsInFile: report.xmlDistinctDocumentsInFile,
    snowflakeColumnsWithoutXmlAttribute: report.snowflakeColumnsWithoutXmlAttribute,
    xmlAttributesWithoutSnowflakeColumn: report.xmlAttributesWithoutSnowflakeColumn,
    coverageGapCount: report.coverageGaps.length,
    ignoreSnowflakeAccelMetadataColumns: report.ignoreSnowflakeAccelMetadataColumns,
    snowflakeAccelMetadataColumnsIgnored: report.snowflakeAccelMetadataColumnsIgnored,
    snowflakeRowCount: report.snowflakeRowCount,
    xmlJournalLinesMatchingDescription: report.xmlElementsMatchingDescription,
    xmlTotalLedgerEntities: report.xmlElementsRead,
    documentsOnlyInSnowflake: report.documentsOnlyInSnowflake,
    documentsOnlyInXml: report.documentsOnlyInXml,
    unpairedSnowflakeRows: report.unpairedSnowflakeRows,
    unpairedXmlRows: report.unpairedXmlRows,
    linesOnlyInSnowflake: report.linesOnlyInSnowflake,
    linesOnlyInXml: report.linesOnlyInXml,
    mismatchCount: report.mismatches.length,
    mappingAttributeMismatchCount: valueMismatchCount,
    attributeMatchCount: report.attributeMatches.length,
    valueMismatchCount,
    comparedFieldPairs: report.comparedFieldPairs,
    matchedFieldPairs: report.matchedFieldPairs,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (report.descriptionAlignmentIssues.length > 0) {
    console.log('DESCRIPTION alignment issues:');
    console.log(JSON.stringify(report.descriptionAlignmentIssues, null, 2));
  }
  if (report.mappingAttributeMismatches.length > 0) {
    console.log(
      'Mapping attribute mismatches (each XML attribute vs Snowflake column, grouped by DOC match key):',
    );
    console.log(JSON.stringify(report.mismatchesByMatchKey, null, 2));
  }
  const structural = report.mismatches.filter((m) => m.kind === 'UNPAIRED_ROW');
  if (structural.length > 0) {
    console.log('Structural / unpaired row issues:');
    console.log(JSON.stringify(structural, null, 2));
  }

  const jsonOutPath =
    args.jsonOut &&
    (args.exactReportPaths ? args.jsonOut : resolveUniqueTimestampedReportPath(args.jsonOut));
  if (jsonOutPath) {
    const dir = path.dirname(jsonOutPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(jsonOutPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Wrote full report: ${jsonOutPath}`);
  }

  const reportXmlPath =
    args.reportXml &&
    (args.exactReportPaths ? args.reportXml : resolveUniqueTimestampedReportPath(args.reportXml));
  if (reportXmlPath) {
    writeFowdCompareReportXml(report, reportXmlPath);
    console.log(`Wrote comparison report (XHTML/XML): ${reportXmlPath}`);
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
