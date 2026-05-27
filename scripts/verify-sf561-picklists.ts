/**
 * SF-561 Picklist Verification Script
 * 
 * Connects to Salesforce QA via API and verifies:
 * - BillingCountry picklist contains approved country values (Account & Lead)
 * - BillingState picklist contains approved US states (Account & Lead)
 * - BillingState picklist contains approved Canadian provinces (Account & Lead)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';

// Load QA environment variables
const envPath = path.resolve(__dirname, '../src/config/env/.env.qa');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Also load the JSON config for loginUrl
const jsonConfigPath = path.resolve(__dirname, '../src/config/env/qa.json');
let loginUrl = '';
if (fs.existsSync(jsonConfigPath)) {
  const jsonConfig = JSON.parse(fs.readFileSync(jsonConfigPath, 'utf-8'));
  loginUrl = jsonConfig.salesforce?.loginUrl || jsonConfig.salesforce?.baseUrl || '';
}

// Fallback to env var
if (!loginUrl) {
  loginUrl = process.env.SF_BASE_URL || '';
}
// Remove trailing slash
loginUrl = loginUrl.replace(/\/$/, '');

// ============================================================================
// APPROVED VALUES FROM SF-561 ACCEPTANCE CRITERIA
// Full list: Country name (label) — script verifies these exist in BillingCountryCode / CountryCode picklist
// ============================================================================

const SAMPLE_COUNTRIES = [
  'Andorra', 'United Arab Emirates', 'Afghanistan', 'Antigua and Barbuda', 'Anguilla',
  'Albania', 'Armenia', 'Angola', 'Argentina', 'American Samoa', 'Austria', 'Australia',
  'Aruba', 'Aland Islands', 'Azerbaijan', 'Bosnia and Herzegovina', 'Barbados', 'Bangladesh',
  'Belgium', 'Burkina Faso', 'Bulgaria', 'Bahrain', 'Burundi', 'Benin', 'Saint Barthélemy',
  'Bermuda', 'Brunei Darussalam', 'Bolivia, Plurinational State of', 'Bonaire, Sint Eustatius, and Saba',
  'Brazil', 'Bahamas', 'Bhutan', 'Bouvet Island', 'Botswana', 'Belarus', 'Belize', 'Canada',
  'Cocos (Keeling) Islands', 'Congo, the Democratic Republic of the', 'Central African Republic',
  'Congo', 'Switzerland', "Cote d'Ivoire", 'Cook Islands', 'Chile', 'Cameroon', 'China',
  'Colombia', 'Costa Rica', 'Cuba', 'Cape Verde', 'Curaçao', 'Christmas Island', 'Cyprus',
  'Czechia', 'Germany', 'Djibouti', 'Denmark', 'Dominica', 'Dominican Republic', 'Algeria',
  'Ecuador', 'Estonia', 'Egypt', 'Western Sahara', 'Eritrea', 'Spain', 'Ethiopia', 'Finland',
  'Fiji', 'Falkland Islands (Malvinas)', 'Micronesia, Federated States of', 'Faroe Islands',
  'France', 'Gabon', 'United Kingdom', 'Grenada', 'Georgia', 'French Guiana', 'Guernsey',
  'Ghana', 'Gibraltar', 'Greenland', 'Gambia', 'Guinea', 'Guadeloupe', 'Equatorial Guinea',
  'Greece', 'South Georgia and the South Sandwich Islands', 'Guatemala', 'Guam', 'Guinea-Bissau',
  'Guyana', 'Hong Kong', 'Heard Island and McDonald Islands', 'Honduras', 'Croatia', 'Haiti',
  'Hungary', 'Indonesia', 'Ireland', 'Israel', 'Isle of Man', 'India', 'British Indian Ocean Territory',
  'Iraq', 'Iceland', 'Italy', 'Jersey', 'Jamaica', 'Jordan', 'Japan', 'Kenya', 'Kyrgyzstan',
  'Cambodia', 'Kiribati', 'Comoros', 'Saint Kitts and Nevis', "Democratic People's Republic Of Korea",
  "Korea, Republic of", 'Kuwait', 'Cayman Islands', 'Kazakhstan', "Lao People's Democratic Republic",
  'Lebanon', 'Saint Lucia', 'Liechtenstein', 'Sri Lanka', 'Liberia', 'Lesotho', 'Lithuania',
  'Luxembourg', 'Latvia', 'Libya', 'Morocco', 'Monaco', 'Moldova, Republic of', 'Montenegro',
  'Saint Martin (French part)', 'Madagascar', 'Marshall islands', 'North Macedonia', 'Mali',
  'Myanmar', 'Mongolia', 'Macao', 'Northern Mariana Islands', 'Martinique', 'Mauritania',
  'Montserrat', 'Malta', 'Mauritius', 'Maldives', 'Malawi', 'Mexico', 'Malaysia', 'Mozambique',
  'Namibia', 'New Caledonia', 'Niger', 'Norfolk Island', 'Nigeria', 'Nicaragua', 'Netherlands',
  'Norway', 'Nepal', 'Nauru', 'Niue', 'New Zealand', 'Oman', 'Panama', 'Peru', 'French Polynesia',
  'Papua New Guinea', 'Philippines', 'Pakistan', 'Poland', 'Saint Pierre and Miquelon', 'Pitcairn',
  'Puerto Rico', 'Palestine', 'Portugal', 'Palau', 'Paraguay', 'Qatar', 'Reunion', 'Romania',
  'Serbia', 'Russian Federation', 'Rwanda', 'Saudi Arabia', 'Solomon Islands', 'Seychelles',
  'Sweden', 'Singapore', 'Saint Helena, Ascension and Tristan da Cunha', 'Slovenia',
  'Svalbard and Jan Mayen', 'Slovakia', 'Sierra Leone', 'San Marino', 'Senegal', 'Somalia',
  'Suriname', 'South Sudan', 'Sao Tome and Principe', 'El Salvador', 'Sint Maarten (Dutch part)',
  'Eswatini', 'Turks and Caicos Islands', 'Chad', 'French Southern Territories', 'Togo', 'Thailand',
  'Tajikistan', 'Tokelau', 'Timor-Leste', 'Turkmenistan', 'Tunisia', 'Tonga', 'Turkiye',
  'Trinidad and Tobago', 'Tuvalu', 'Taiwan', "Tanzania, United Republic of", 'Ukraine', 'Uganda',
  'United states minor outlying islands', 'United States', 'Uruguay', 'Uzbekistan',
  'Holy See (Vatican City State)', 'Saint Vincent and the Grenadines', 'Venezuela, Bolivarian Republic of',
  'Virgin Islands, British', 'Virgin Islands (U.S.)', 'Vietnam', 'Vanuatu', 'Wallis and Futuna',
  'Samoa', 'Kosovo', 'Yemen', 'Mayotte', 'South Africa', 'Zambia', 'Zimbabwe',
];

// Alpha 2 codes in same order as SAMPLE_COUNTRIES (for Excel report lookup)
const SAMPLE_COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR',
  'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL',
  'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO',
  'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA',
  'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT',
  'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO',
  'IQ', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR',
  'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA',
  'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS',
  'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO',
  'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR',
  'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SE', 'SG',
  'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SZ', 'TC',
  'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS',
  'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
];

const APPROVED_US_STATES = [
  'Alaska', 'Alabama', 'Arkansas', 'Arizona', 'California',
  'Colorado', 'Connecticut', 'District of Columbia', 'Delaware', 'Florida',
  'Georgia', 'Hawaii', 'Iowa', 'Idaho', 'Illinois',
  'Indiana', 'Kansas', 'Kentucky', 'Louisiana', 'Massachusetts',
  'Maryland', 'Maine', 'Michigan', 'Minnesota', 'Missouri',
  'Mississippi', 'Montana', 'North Carolina', 'North Dakota', 'Nebraska',
  'New Hampshire', 'New Jersey', 'New Mexico', 'Nevada', 'New York',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
  'Virginia', 'Vermont', 'Washington', 'Wisconsin', 'West Virginia', 'Wyoming',
];

const APPROVED_CA_PROVINCES = [
  'Yukon Territories', 'Northwest Territories', 'Nunavut', 'British Columbia', 'Alberta',
  'Saskatchewan', 'Manitoba', 'Ontario', 'Quebec', 'New Brunswick',
  'Nova Scotia', 'Prince Edward Island', 'Newfoundland and Labrador',
];

// ============================================================================
// SALESFORCE JWT AUTH (using same logic as framework)
// ============================================================================

async function getAccessToken(): Promise<{ accessToken: string; instanceUrl: string }> {
  const clientId = process.env.SF_JWT_CLIENT_ID || process.env.SF_CLIENT_ID || '';
  const username = process.env.SF_JWT_USERNAME || process.env.SF_USERNAME || '';
  const certPathRel = process.env.SF_CERT_PATH || 'certs/server.key';
  const certFullPath = path.resolve(__dirname, '..', certPathRel);

  if (!clientId) throw new Error('Missing SF_CLIENT_ID in .env.qa');
  if (!username) throw new Error('Missing SF_JWT_USERNAME in .env.qa');
  if (!loginUrl) throw new Error('Missing loginUrl in qa.json or SF_BASE_URL in .env.qa');
  if (!fs.existsSync(certFullPath)) throw new Error(`Private key not found at: ${certFullPath}`);

  const privateKey = fs.readFileSync(certFullPath, 'utf-8');

  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: clientId, sub: username, aud: loginUrl, exp: now + 300, iat: now },
    privateKey,
    { algorithm: 'RS256' }
  );

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const tokenUrl = `${loginUrl}/services/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`JWT auth failed (${resp.status}): ${errText}`);
  }

  const data = await resp.json() as any;
  return { accessToken: data.access_token, instanceUrl: data.instance_url };
}

// ============================================================================
// DESCRIBE OBJECT
// ============================================================================

async function describeObject(
  accessToken: string,
  instanceUrl: string,
  objectName: string
): Promise<any> {
  const url = `${instanceUrl}/services/data/v59.0/sobjects/${objectName}/describe`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Describe ${objectName} failed: ${resp.status}`);
  return resp.json();
}

// ============================================================================
// VERIFICATION HELPER
// ============================================================================

function checkPicklistValues(
  fieldMeta: any,
  expectedValues: string[],
  label: string
): { passed: boolean; found: string[]; missing: string[]; extra: string[]; total: number } {
  const activeEntries = (fieldMeta.picklistValues || [])
    .filter((pv: any) => pv.active !== false);

  // Collect both value and label for matching (handles Code fields like "US" -> "United States")
  const allLabels = activeEntries.map((pv: any) => (pv.label || '').toLowerCase());
  const allValues = activeEntries.map((pv: any) => (pv.value || '').toLowerCase());

  const found: string[] = [];
  const missing: string[] = [];

  for (const expected of expectedValues) {
    const lc = expected.toLowerCase();
    const match = allLabels.includes(lc) || allValues.includes(lc);
    if (match) found.push(expected);
    else missing.push(expected);
  }

  // For display, use labels
  const displayLabels = activeEntries.map((pv: any) => pv.label || pv.value);
  const extra = displayLabels.filter(
    (lbl: string) => !expectedValues.some(
      (e: string) => e.toLowerCase() === lbl.toLowerCase()
    )
  );

  return { passed: missing.length === 0, found, missing, extra, total: activeEntries.length };
}

/** Get Salesforce picklist label for a given Alpha2 code (e.g. TW -> "Chinese Taipei") */
function getSFLabelByCode(code: string, fieldMeta: any): string {
  if (!fieldMeta?.picklistValues || !code) return '';
  const entry = (fieldMeta.picklistValues as any[]).find(
    (pv: any) => pv.active !== false && (pv.value || '').toUpperCase() === code.toUpperCase()
  );
  return entry ? (entry.label || entry.value || '') : '';
}

/** Build per-country detail rows for Excel */
function buildCountryDetailRows(
  fieldMeta: any,
  found: string[],
  missing: string[]
): Array<{ country: string; code: string; result: string; sfLabel: string }> {
  const rows: Array<{ country: string; code: string; result: string; sfLabel: string }> = [];
  const foundSet = new Set(found.map((f: string) => f.toLowerCase()));
  for (let i = 0; i < SAMPLE_COUNTRIES.length; i++) {
    const country = SAMPLE_COUNTRIES[i];
    const code = SAMPLE_COUNTRY_CODES[i] || '';
    const isFound = foundSet.has(country.toLowerCase());
    const sfLabel = isFound ? country : getSFLabelByCode(code, fieldMeta);
    rows.push({
      country,
      code,
      result: isFound ? 'PASS' : 'FAIL',
      sfLabel: isFound ? country : (sfLabel || 'Not in picklist'),
    });
  }
  return rows;
}

/** Write Excel report to data/reports/SF-561-Picklist-Verification-<timestamp>.xlsx */
async function writeExcelReport(
  results: Array<{ test: string; status: string; detail: string }>,
  countryAccountResult: { field: any; found: string[]; missing: string[] } | null,
  countryLeadResult: { field: any; found: string[]; missing: string[] } | null
): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportDir = path.resolve(__dirname, '../data/reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  const filePath = path.join(reportDir, `SF-561-Picklist-Verification-${timestamp}.xlsx`);

  // Sheet 1: Summary
  const summarySheet = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
  summarySheet.columns = [
    { header: 'Test', key: 'test', width: 32 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Detail', key: 'detail', width: 60 },
  ];
  summarySheet.addRows(results.map(r => ({ test: r.test, status: r.status, detail: r.detail })));
  summarySheet.getRow(1).font = { bold: true };

  // Sheet 2: Country Account Detail
  const acctDetailSheet = wb.addWorksheet('Country Account Detail', { views: [{ state: 'frozen', ySplit: 1 }] });
  acctDetailSheet.columns = [
    { header: 'Country', key: 'country', width: 28 },
    { header: 'Code', key: 'code', width: 8 },
    { header: 'Result', key: 'result', width: 8 },
    { header: 'SF Label', key: 'sfLabel', width: 28 },
  ];
  if (countryAccountResult) {
    const rows = buildCountryDetailRows(countryAccountResult.field, countryAccountResult.found, countryAccountResult.missing);
    acctDetailSheet.addRows(rows);
  }
  acctDetailSheet.getRow(1).font = { bold: true };

  // Sheet 3: Country Lead Detail
  const leadDetailSheet = wb.addWorksheet('Country Lead Detail', { views: [{ state: 'frozen', ySplit: 1 }] });
  leadDetailSheet.columns = [
    { header: 'Country', key: 'country', width: 28 },
    { header: 'Code', key: 'code', width: 8 },
    { header: 'Result', key: 'result', width: 8 },
    { header: 'SF Label', key: 'sfLabel', width: 28 },
  ];
  if (countryLeadResult) {
    const rows = buildCountryDetailRows(countryLeadResult.field, countryLeadResult.found, countryLeadResult.missing);
    leadDetailSheet.addRows(rows);
  }
  leadDetailSheet.getRow(1).font = { bold: true };

  // Sheet 4: Label Mismatches (expected vs SF label for failed country lookups)
  const mismatchSheet = wb.addWorksheet('Label Mismatches', { views: [{ state: 'frozen', ySplit: 1 }] });
  mismatchSheet.columns = [
    { header: 'Expected Label (Approved)', key: 'expected', width: 32 },
    { header: 'SF Label (by Code)', key: 'sfLabel', width: 32 },
    { header: 'Code', key: 'code', width: 8 },
  ];
  if (countryAccountResult) {
    const acctRows = buildCountryDetailRows(countryAccountResult.field, countryAccountResult.found, countryAccountResult.missing);
    const mismatches = acctRows.filter(r => r.result === 'FAIL' && r.sfLabel && r.sfLabel !== 'Not in picklist');
    mismatchSheet.addRows(mismatches.map(r => ({ expected: r.country, sfLabel: r.sfLabel, code: r.code })));
  }
  mismatchSheet.getRow(1).font = { bold: true };

  await wb.xlsx.writeFile(filePath);
  return filePath;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('');
  console.log('============================================================');
  console.log('   SF-561 - Picklist Values Verification (API)');
  console.log('============================================================');
  console.log('');

  // 1. Authenticate
  console.log('[AUTH] Authenticating with Salesforce QA...');
  console.log(`  Login URL: ${loginUrl}`);
  const { accessToken, instanceUrl } = await getAccessToken();
  console.log(`  Instance:  ${instanceUrl}`);
  console.log(`  [OK] Authenticated successfully\n`);

  // 2. Describe Account & Lead
  console.log('[DESCRIBE] Fetching Account metadata...');
  const accountDesc = await describeObject(accessToken, instanceUrl, 'Account');
  const accountFields = accountDesc.fields;
  console.log(`  Found ${accountFields.length} fields on Account\n`);

  console.log('[DESCRIBE] Fetching Lead metadata...');
  const leadDesc = await describeObject(accessToken, instanceUrl, 'Lead');
  const leadFields = leadDesc.fields;
  console.log(`  Found ${leadFields.length} fields on Lead\n`);

  let allPassed = true;
  const results: Array<{ test: string; status: string; detail: string }> = [];
  let countryAccountResult: { field: any; passed: boolean; found: string[]; missing: string[]; extra: string[]; total: number } | null = null;
  let countryLeadResult: { field: any; passed: boolean; found: string[]; missing: string[]; extra: string[]; total: number } | null = null;

  // ========================================================================
  // When Salesforce "State and Country Picklists" feature is enabled:
  //   - BillingCountry / Country      = text display field (no picklist values)
  //   - BillingCountryCode / CountryCode = actual picklist with ISO codes + labels
  //   - BillingState / State          = text display field (no picklist values)
  //   - BillingStateCode / StateCode  = actual picklist with state codes + labels
  // ========================================================================

  // Helper to find a field, trying Code variant first, then plain name
  const findField = (fields: any[], ...names: string[]) => {
    for (const name of names) {
      const f = fields.find((fld: any) => fld.name === name);
      if (f) return f;
    }
    return null;
  };

  // ========================================================================
  // TEST 1: BillingCountry picklist on Account
  // ========================================================================
  console.log('------------------------------------------------------------');
  console.log('TEST 1: BillingCountry approved country values (Account)');
  console.log('------------------------------------------------------------');

  const acctCountry = findField(accountFields, 'BillingCountryCode', 'BillingCountry');
  if (!acctCountry) {
    console.log('  [FAIL] BillingCountry/BillingCountryCode field not found on Account');
    results.push({ test: 'Account.BillingCountry', status: 'FAIL', detail: 'Field not found' });
    allPassed = false;
  } else {
    console.log(`  Using field: ${acctCountry.name} (type: ${acctCountry.type})`);
    console.log(`  Restricted picklist: ${acctCountry.restrictedPicklist}`);
    const r = checkPicklistValues(acctCountry, SAMPLE_COUNTRIES, 'BillingCountry');
    countryAccountResult = { field: acctCountry, ...r };
    console.log(`  Total active picklist values: ${r.total}`);
    console.log(`  Approved countries to verify: ${SAMPLE_COUNTRIES.length}`);
    console.log(`  Found: ${r.found.length} | Missing: ${r.missing.length}`);
    if (r.missing.length > 0) console.log(`  MISSING: ${r.missing.join(', ')}`);
    if (r.found.length > 0) console.log(`  SAMPLE FOUND: ${r.found.slice(0, 10).join(', ')}...`);
    const status = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`  ${status}\n`);
    results.push({ test: 'Account.BillingCountry', status: r.passed ? 'PASS' : 'FAIL', detail: `${r.found.length}/${SAMPLE_COUNTRIES.length} approved found (${r.total} total in picklist)` });
    if (!r.passed) allPassed = false;
  }

  // ========================================================================
  // TEST 2: Country picklist on Lead
  // ========================================================================
  console.log('------------------------------------------------------------');
  console.log('TEST 2: Country approved country values (Lead)');
  console.log('------------------------------------------------------------');

  const leadCountry = findField(leadFields, 'CountryCode', 'Country');
  if (!leadCountry) {
    console.log('  [FAIL] Country/CountryCode field not found on Lead');
    results.push({ test: 'Lead.Country', status: 'FAIL', detail: 'Field not found' });
    allPassed = false;
  } else {
    console.log(`  Using field: ${leadCountry.name} (type: ${leadCountry.type})`);
    console.log(`  Restricted picklist: ${leadCountry.restrictedPicklist}`);
    const r = checkPicklistValues(leadCountry, SAMPLE_COUNTRIES, 'Country');
    countryLeadResult = { field: leadCountry, ...r };
    console.log(`  Total active picklist values: ${r.total}`);
    console.log(`  Approved countries to verify: ${SAMPLE_COUNTRIES.length}`);
    console.log(`  Found: ${r.found.length} | Missing: ${r.missing.length}`);
    if (r.missing.length > 0) console.log(`  MISSING: ${r.missing.join(', ')}`);
    if (r.found.length > 0) console.log(`  SAMPLE FOUND: ${r.found.slice(0, 10).join(', ')}...`);
    const status = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`  ${status}\n`);
    results.push({ test: 'Lead.Country', status: r.passed ? 'PASS' : 'FAIL', detail: `${r.found.length}/${SAMPLE_COUNTRIES.length} approved found (${r.total} total in picklist)` });
    if (!r.passed) allPassed = false;
  }

  // ========================================================================
  // TEST 3: BillingState US states on Account
  // ========================================================================
  console.log('------------------------------------------------------------');
  console.log('TEST 3: BillingState approved US state values (Account)');
  console.log('------------------------------------------------------------');

  const acctState = findField(accountFields, 'BillingStateCode', 'BillingState');
  if (!acctState) {
    console.log('  [FAIL] BillingState/BillingStateCode field not found on Account');
    results.push({ test: 'Account.BillingState (US)', status: 'FAIL', detail: 'Field not found' });
    allPassed = false;
  } else {
    console.log(`  Using field: ${acctState.name} (type: ${acctState.type})`);
    console.log(`  Restricted picklist: ${acctState.restrictedPicklist}`);
    const r = checkPicklistValues(acctState, APPROVED_US_STATES, 'BillingState');
    console.log(`  Total active picklist values: ${r.total}`);
    console.log(`  US states to verify: ${APPROVED_US_STATES.length}`);
    console.log(`  Found: ${r.found.length} | Missing: ${r.missing.length}`);
    if (r.missing.length > 0) console.log(`  MISSING: ${r.missing.join(', ')}`);
    if (r.found.length > 0) console.log(`  SAMPLE FOUND: ${r.found.slice(0, 10).join(', ')}...`);
    const status = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`  ${status}\n`);
    results.push({ test: 'Account.BillingState (US)', status: r.passed ? 'PASS' : 'FAIL', detail: `${r.found.length}/${APPROVED_US_STATES.length} found (${r.total} total in picklist)` });
    if (!r.passed) allPassed = false;
  }

  // ========================================================================
  // TEST 4: BillingState Canadian provinces on Account
  // ========================================================================
  console.log('------------------------------------------------------------');
  console.log('TEST 4: BillingState approved Canadian provinces (Account)');
  console.log('------------------------------------------------------------');

  if (!acctState) {
    console.log('  [FAIL] BillingState/BillingStateCode field not found on Account');
    results.push({ test: 'Account.BillingState (CA)', status: 'FAIL', detail: 'Field not found' });
    allPassed = false;
  } else {
    const r = checkPicklistValues(acctState, APPROVED_CA_PROVINCES, 'BillingState');
    console.log(`  Canadian provinces to verify: ${APPROVED_CA_PROVINCES.length}`);
    console.log(`  Found: ${r.found.length} | Missing: ${r.missing.length}`);
    if (r.missing.length > 0) console.log(`  MISSING: ${r.missing.join(', ')}`);
    if (r.found.length > 0) console.log(`  SAMPLE FOUND: ${r.found.slice(0, 5).join(', ')}...`);
    const status = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`  ${status}\n`);
    results.push({ test: 'Account.BillingState (CA)', status: r.passed ? 'PASS' : 'FAIL', detail: `${r.found.length}/${APPROVED_CA_PROVINCES.length} found (${r.total} total in picklist)` });
    if (!r.passed) allPassed = false;
  }

  // ========================================================================
  // TEST 5: State US states on Lead
  // ========================================================================
  console.log('------------------------------------------------------------');
  console.log('TEST 5: State approved US state values (Lead)');
  console.log('------------------------------------------------------------');

  const leadState = findField(leadFields, 'StateCode', 'State');
  if (!leadState) {
    console.log('  [FAIL] State/StateCode field not found on Lead');
    results.push({ test: 'Lead.State (US)', status: 'FAIL', detail: 'Field not found' });
    allPassed = false;
  } else {
    console.log(`  Using field: ${leadState.name} (type: ${leadState.type})`);
    console.log(`  Restricted picklist: ${leadState.restrictedPicklist}`);
    const r = checkPicklistValues(leadState, APPROVED_US_STATES, 'State');
    console.log(`  Total active picklist values: ${r.total}`);
    console.log(`  US states to verify: ${APPROVED_US_STATES.length}`);
    console.log(`  Found: ${r.found.length} | Missing: ${r.missing.length}`);
    if (r.missing.length > 0) console.log(`  MISSING: ${r.missing.join(', ')}`);
    if (r.found.length > 0) console.log(`  SAMPLE FOUND: ${r.found.slice(0, 10).join(', ')}...`);
    const status = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`  ${status}\n`);
    results.push({ test: 'Lead.State (US)', status: r.passed ? 'PASS' : 'FAIL', detail: `${r.found.length}/${APPROVED_US_STATES.length} found (${r.total} total in picklist)` });
    if (!r.passed) allPassed = false;
  }

  // ========================================================================
  // TEST 6: State Canadian provinces on Lead
  // ========================================================================
  console.log('------------------------------------------------------------');
  console.log('TEST 6: State approved Canadian provinces (Lead)');
  console.log('------------------------------------------------------------');

  if (!leadState) {
    console.log('  [FAIL] State/StateCode field not found on Lead');
    results.push({ test: 'Lead.State (CA)', status: 'FAIL', detail: 'Field not found' });
    allPassed = false;
  } else {
    const r = checkPicklistValues(leadState, APPROVED_CA_PROVINCES, 'State');
    console.log(`  Canadian provinces to verify: ${APPROVED_CA_PROVINCES.length}`);
    console.log(`  Found: ${r.found.length} | Missing: ${r.missing.length}`);
    if (r.missing.length > 0) console.log(`  MISSING: ${r.missing.join(', ')}`);
    if (r.found.length > 0) console.log(`  SAMPLE FOUND: ${r.found.slice(0, 5).join(', ')}...`);
    const status = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`  ${status}\n`);
    results.push({ test: 'Lead.State (CA)', status: r.passed ? 'PASS' : 'FAIL', detail: `${r.found.length}/${APPROVED_CA_PROVINCES.length} found (${r.total} total in picklist)` });
    if (!r.passed) allPassed = false;
  }

  // ========================================================================
  // DIAGNOSTIC: Find actual labels for mismatched values
  // ========================================================================
  console.log('------------------------------------------------------------');
  console.log('DIAGNOSTIC: Searching for "Hong Kong" in country picklist');
  console.log('------------------------------------------------------------');
  if (acctCountry) {
    const hongKongMatches = (acctCountry.picklistValues || [])
      .filter((pv: any) => pv.active && (
        (pv.label || '').toLowerCase().includes('hong') ||
        (pv.label || '').toLowerCase().includes('kong') ||
        (pv.value || '').toUpperCase() === 'HK'
      ));
    if (hongKongMatches.length > 0) {
      for (const m of hongKongMatches) {
        console.log(`  Found: value="${m.value}", label="${m.label}"`);
      }
    } else {
      console.log('  No matches found for "hong", "kong", or code "HK"');
      // Show all countries starting with H
      console.log('  All active countries starting with "H":');
      const hCountries = (acctCountry.picklistValues || [])
        .filter((pv: any) => pv.active && (pv.label || '')[0]?.toUpperCase() === 'H');
      for (const c of hCountries) {
        console.log(`    value="${c.value}", label="${c.label}"`);
      }
    }
  }
  console.log('');

  // ========================================================================
  // DIAGNOSTIC: Taiwan — how it appears in the country picklist (API)
  // ========================================================================
  console.log('------------------------------------------------------------');
  console.log('DIAGNOSTIC: Searching for "Taiwan" in country picklist');
  console.log('------------------------------------------------------------');
  if (acctCountry) {
    const taiwanMatches = (acctCountry.picklistValues || [])
      .filter((pv: any) => pv.active && (
        (pv.label || '').toLowerCase().includes('taiwan') ||
        (pv.value || '').toUpperCase() === 'TW'
      ));
    if (taiwanMatches.length > 0) {
      console.log('  API has these entries (Account BillingCountryCode):');
      for (const m of taiwanMatches) {
        console.log(`    value="${m.value}", label="${m.label}"`);
      }
      console.log('  In the UI, search for the exact label above (e.g. "Taiwan, Province of China").');
    } else {
      console.log('  No picklist entry found for "Taiwan" or code "TW".');
      console.log('  Salesforce standard list may use a different label or omit it.');
      const tCountries = (acctCountry.picklistValues || [])
        .filter((pv: any) => pv.active && (pv.label || '').toLowerCase().startsWith('t'));
      console.log('  All active countries starting with "T":');
      for (const c of tCountries) {
        console.log(`    value="${c.value}", label="${c.label}"`);
      }
    }
  }
  console.log('');

  // ========================================================================
  // TEST 7: Cross-object consistency (Account vs Lead)
  // ========================================================================
  console.log('------------------------------------------------------------');
  console.log('TEST 7: Cross-object consistency (Account vs Lead)');
  console.log('------------------------------------------------------------');

  if (acctCountry && leadCountry) {
    const getActiveLabels = (field: any) => new Set(
      (field.picklistValues || []).filter((p: any) => p.active).map((p: any) => p.label || p.value)
    );

    const acctCountryVals = getActiveLabels(acctCountry);
    const leadCountryVals = getActiveLabels(leadCountry);

    const onlyInAccount = [...acctCountryVals].filter(v => !leadCountryVals.has(v));
    const onlyInLead = [...leadCountryVals].filter(v => !acctCountryVals.has(v));

    console.log(`  Account country values: ${acctCountryVals.size}`);
    console.log(`  Lead country values:    ${leadCountryVals.size}`);
    
    const consistent = onlyInAccount.length === 0 && onlyInLead.length === 0;
    if (!consistent) {
      if (onlyInAccount.length > 0) console.log(`  Only in Account: ${onlyInAccount.slice(0, 10).join(', ')}${onlyInAccount.length > 10 ? '...' : ''}`);
      if (onlyInLead.length > 0) console.log(`  Only in Lead: ${onlyInLead.slice(0, 10).join(', ')}${onlyInLead.length > 10 ? '...' : ''}`);
    }
    
    const status = consistent ? '[PASS]' : '[FAIL]';
    console.log(`  ${status} Country picklist values ${consistent ? 'are' : 'are NOT'} consistent across Account and Lead\n`);
    results.push({ test: 'Cross-object Country consistency', status: consistent ? 'PASS' : 'FAIL', detail: consistent ? 'Identical' : `${onlyInAccount.length} only in Account, ${onlyInLead.length} only in Lead` });
    if (!consistent) allPassed = false;
  } else {
    console.log('  [SKIP] Cannot compare - one or both Country fields missing\n');
    results.push({ test: 'Cross-object Country consistency', status: 'SKIP', detail: 'Field(s) missing' });
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('\n============================================================');
  console.log('  SF-561 VERIFICATION SUMMARY');
  console.log('============================================================');
  
  for (const r of results) {
    const icon = r.status === 'PASS' ? 'PASS' : r.status === 'SKIP' ? 'SKIP' : 'FAIL';
    console.log(`  [${icon}] ${r.test}: ${r.detail}`);
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  console.log(`\n  Total: ${passed} passed, ${failed} failed, ${skipped} skipped out of ${results.length} tests`);
  console.log('============================================================\n');

  const reportPath = await writeExcelReport(results, countryAccountResult, countryLeadResult);
  console.log(`  Excel report: ${reportPath}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
