import * as fs from 'fs';
import * as path from 'path';

import type { MappingPair } from '../../utils/fowd-agency-xml-compare/types';
import { loadMappingFromXlsx } from '../../utils/fowd-agency-xml-compare/mapping';

/**
 * Default Snowflake `FOWD__AGENCY_POLICY_FO_V1` ↔ journal XML attribute mapping when
 * `LloydsADP_XML_Mapping.xlsx` is not on disk.
 *
 * **Coverage:** every pair here is compared line-by-line (with `LINE_NUMBER` / `LINENUMBER`
 * skipped) when ADP rows include that column. Columns present only in Snowflake or only in XML
 * are reported as coverage gaps. `buildEffectivePairs` in `compare.ts` also adds **convention**
 * pairs (underscore-stripped uppercase Snowflake name ↔ XML attribute) when the XML carries
 * that attribute — so extending this array is mainly for **non-conventional** names or to
 * pin programme-approved aliases before relying on convention.
 *
 * **Extend:** add rows here, or set `LLOYDS_ADP_XML_MAPPING_XLSX` to the ISDE workbook path
 * (see [D365 + MuleSoft Integration Field Mappings](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2906161167/D365+MuleSoft+Integration+Field+Mappings)).
 *
 * Programme workbook (CLI mirror): `scripts/compare-fowd-agency-xml.ts` — `LLOYDS_ADP_XML_MAPPING_XLSX`.
 */
export const DEFAULT_ADP_XML_MAPPING_PAIRS: MappingPair[] = [
  { snowflakeColumn: 'LINE_NUMBER', xmlAttribute: 'LINENUMBER' },
  { snowflakeColumn: 'DESCRIPTION', xmlAttribute: 'DESCRIPTION' },
  { snowflakeColumn: 'DOCUMENT', xmlAttribute: 'DOCUMENT' },
  { snowflakeColumn: 'JOURNAL_NAME', xmlAttribute: 'JOURNALNAME' },
  { snowflakeColumn: 'JOURNAL_BATCH_NUMBER', xmlAttribute: 'JOURNALBATCHNUMBER' },
  { snowflakeColumn: 'TEXT', xmlAttribute: 'TEXT' },
  { snowflakeColumn: 'ACCOUNT_TYPE', xmlAttribute: 'ACCOUNTTYPE' },
  { snowflakeColumn: 'ACCOUNT_DISPLAY_VALUE', xmlAttribute: 'ACCOUNTDISPLAYVALUE' },
  { snowflakeColumn: 'DEBIT_AMOUNT', xmlAttribute: 'DEBITAMOUNT' },
  { snowflakeColumn: 'CREDIT_AMOUNT', xmlAttribute: 'CREDITAMOUNT' },
  { snowflakeColumn: 'CURRENCY_CODE', xmlAttribute: 'CURRENCYCODE' },
  { snowflakeColumn: 'OFFSET_ACCOUNT_TYPE', xmlAttribute: 'OFFSETACCOUNTTYPE' },
  { snowflakeColumn: 'OFFSET_ACCOUNT_DISPLAY_VALUE', xmlAttribute: 'OFFSETACCOUNTDISPLAYVALUE' },
  { snowflakeColumn: 'DOCUMENT_DATE', xmlAttribute: 'DOCUMENTDATE' },
  { snowflakeColumn: 'DUE_DATE', xmlAttribute: 'DUEDATE' },
  { snowflakeColumn: 'INVOICE', xmlAttribute: 'INVOICE' },
  { snowflakeColumn: 'TRANS_DATE', xmlAttribute: 'TRANSDATE' },
  { snowflakeColumn: 'VOUCHER', xmlAttribute: 'VOUCHER' },
  { snowflakeColumn: 'DEFAULT_DIMENSION_DISPLAY_VALUE', xmlAttribute: 'DEFAULTDIMENSIONDISPLAYVALUE' },
  { snowflakeColumn: 'OFFSET_DEFAULT_DIMENSION_DISPLAY_VALUE', xmlAttribute: 'OFFSETDEFAULTDIMENSIONDISPLAYVALUE' },
  { snowflakeColumn: 'EXCHANGE_RATE', xmlAttribute: 'EXCHANGERATE' },
  { snowflakeColumn: 'POSTING_PROFILE', xmlAttribute: 'POSTINGPROFILE' },
];

/**
 * Load mapping pairs: optional workbook path from `LLOYDS_ADP_XML_MAPPING_XLSX`, else defaults.
 */
export async function loadAdpXmlMappingPairs(env: NodeJS.ProcessEnv = process.env): Promise<MappingPair[]> {
  const p = env.LLOYDS_ADP_XML_MAPPING_XLSX?.trim();
  if (p && fs.existsSync(p)) {
    return loadMappingFromXlsx(path.resolve(p));
  }
  return DEFAULT_ADP_XML_MAPPING_PAIRS;
}
