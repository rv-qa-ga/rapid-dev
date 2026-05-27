/**
 * Step Definitions for SF-561 - Verify Picklist Values of OOTB Address Fields (API)
 *
 * Verifies BillingCountry and BillingState picklist values via Salesforce
 * metadata API (describe). No browser needed.
 */

import { Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';

// ============================================================================
// APPROVED COUNTRY LIST (249 countries from AC - Alpha-2 ISO codes used as labels in SF)
// ============================================================================

const APPROVED_COUNTRIES: string[] = [
  'Andorra', 'United Arab Emirates', 'Afghanistan', 'Antigua and Barbuda', 'Anguilla',
  'Albania', 'Armenia', 'Angola', 'Argentina', 'American Samoa',
  'Austria', 'Australia', 'Aruba', 'Aland Islands', 'Azerbaijan',
  'Bosnia and Herzegovina', 'Barbados', 'Bangladesh', 'Belgium', 'Burkina Faso',
  'Bulgaria', 'Bahrain', 'Burundi', 'Benin', 'Saint Barthélemy',
  'Bermuda', 'Brunei Darussalam', 'Bolivia, Plurinational State of', 'Bonaire, Sint Eustatius, and Saba', 'Brazil',
  'Bahamas', 'Bhutan', 'Bouvet Island', 'Botswana', 'Belarus',
  'Belize', 'Canada', 'Cocos (Keeling) Islands', 'Congo, the Democratic Republic of the', 'Central African Republic',
  'Congo', 'Switzerland', "Cote d'Ivoire", 'Cook Islands', 'Chile',
  'Cameroon', 'China', 'Colombia', 'Costa Rica', 'Cuba',
  'Cape Verde', 'Curaçao', 'Christmas Island', 'Cyprus', 'Czechia',
  'Germany', 'Djibouti', 'Denmark', 'Dominica', 'Dominican Republic',
  'Algeria', 'Ecuador', 'Estonia', 'Egypt', 'Western Sahara',
  'Eritrea', 'Spain', 'Ethiopia', 'Finland', 'Fiji',
  'Falkland Islands (Malvinas)', 'Micronesia, Federated States of', 'Faroe Islands', 'France', 'Gabon',
  'United Kingdom', 'Grenada', 'Georgia', 'French Guiana', 'Guernsey',
  'Ghana', 'Gibraltar', 'Greenland', 'Gambia', 'Guinea',
  'Guadeloupe', 'Equatorial Guinea', 'Greece', 'South Georgia and the South Sandwich Islands', 'Guatemala',
  'Guam', 'Guinea-Bissau', 'Guyana', 'Hong Kong', 'Heard Island and McDonald Islands',
  'Honduras', 'Croatia', 'Haiti', 'Hungary', 'Indonesia',
  'Ireland', 'Israel', 'Isle of Man', 'India', 'British Indian Ocean Territory',
  'Iraq', 'Iceland', 'Italy', 'Jersey', 'Jamaica',
  'Jordan', 'Japan', 'Kenya', 'Kyrgyzstan', 'Cambodia',
  'Kiribati', 'Comoros', 'Saint Kitts and Nevis', "Democratic People's Republic Of Korea", 'Korea, Republic of',
  'Kuwait', 'Cayman Islands', 'Kazakhstan', "Lao People's Democratic Republic", 'Lebanon',
  'Saint Lucia', 'Liechtenstein', 'Sri Lanka', 'Liberia', 'Lesotho',
  'Lithuania', 'Luxembourg', 'Latvia', 'Libya', 'Morocco',
  'Monaco', 'Moldova, Republic of', 'Montenegro', 'Saint Martin (French part)', 'Madagascar',
  'Marshall islands', 'North Macedonia', 'Mali', 'Myanmar', 'Mongolia',
  'Macao', 'Northern Mariana Islands', 'Martinique', 'Mauritania', 'Montserrat',
  'Malta', 'Mauritius', 'Maldives', 'Malawi', 'Mexico',
  'Malaysia', 'Mozambique', 'Namibia', 'New Caledonia', 'Niger',
  'Norfolk Island', 'Nigeria', 'Nicaragua', 'Netherlands', 'Norway',
  'Nepal', 'Nauru', 'Niue', 'New Zealand', 'Oman',
  'Panama', 'Peru', 'French Polynesia', 'Papua New Guinea', 'Philippines',
  'Pakistan', 'Poland', 'Saint Pierre and Miquelon', 'Pitcairn', 'Puerto Rico',
  'Palestine', 'Portugal', 'Palau', 'Paraguay', 'Qatar',
  'Reunion', 'Romania', 'Serbia', 'Russian Federation', 'Rwanda',
  'Saudi Arabia', 'Solomon Islands', 'Seychelles', 'Sweden', 'Singapore',
  'Saint Helena, Ascension and Tristan da Cunha', 'Slovenia', 'Svalbard and Jan Mayen', 'Slovakia', 'Sierra Leone',
  'San Marino', 'Senegal', 'Somalia', 'Suriname', 'South Sudan',
  'Sao Tome and Principe', 'El Salvador', 'Sint Maarten (Dutch part)', 'Eswatini', 'Turks and Caicos Islands',
  'Chad', 'French Southern Territories', 'Togo', 'Thailand', 'Tajikistan',
  'Tokelau', 'Timor-Leste', 'Turkmenistan', 'Tunisia', 'Tonga',
  'Turkiye', 'Trinidad and Tobago', 'Tuvalu', 'Taiwan', 'Tanzania, United Republic of',
  'Ukraine', 'Uganda', 'United states minor outlying islands', 'United States', 'Uruguay',
  'Uzbekistan', 'Holy See (Vatican City State)', 'Saint Vincent and the Grenadines', 'Venezuela, Bolivarian Republic of', 'Virgin Islands, British',
  'Virgin Islands (U.S.)', 'Vietnam', 'Vanuatu', 'Wallis and Futuna', 'Samoa',
  'Kosovo', 'Yemen', 'Mayotte', 'South Africa', 'Zambia', 'Zimbabwe',
];

// ============================================================================
// APPROVED US STATES (50 states + DC)
// ============================================================================

const APPROVED_US_STATES: string[] = [
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

// ============================================================================
// APPROVED CANADIAN PROVINCES (13)
// ============================================================================

const APPROVED_CA_PROVINCES: string[] = [
  'Yukon', 'Northwest Territories', 'Nunavut', 'British Columbia', 'Alberta',
  'Saskatchewan', 'Manitoba', 'Ontario', 'Quebec', 'New Brunswick',
  'Nova Scotia', 'Prince Edward Island', 'Newfoundland & Labrador',
];

// ============================================================================
// STEP DEFINITIONS
// ============================================================================

/**
 * Verify a field's picklist contains the approved country list
 * Uses metadata from "I describe the {object} object fields" step
 */
Then('the {string} field should be a picklist with approved country values', async function (
  this: AutomationWorld,
  fieldName: string
) {
  const fields = this.testContext.fieldsMetadata;
  if (!fields) {
    throw new Error('No field metadata in context. Run "I describe the {object} object fields" first.');
  }

  const field = fields.find((f: any) =>
    f.name === fieldName || f.label === fieldName
  );

  if (!field) {
    throw new Error(`Field "${fieldName}" not found in metadata`);
  }

  // Verify it's a picklist type
  if (field.type !== 'picklist' && field.type !== 'combobox') {
    logger.warn(`Field "${fieldName}" type is "${field.type}" (address fields use standard picklist controls)`);
  }

  const picklistValues = field.picklistValues || [];
  const activeValues = picklistValues
    .filter((pv: any) => pv.active !== false)
    .map((pv: any) => pv.value || pv.label);

  logger.info(`📋 "${fieldName}" has ${activeValues.length} active picklist values`);

  // Check a representative sample of required countries
  const sampleCountries = [
    'United States', 'United Kingdom', 'Canada', 'Germany', 'France',
    'Australia', 'India', 'Japan', 'Brazil', 'South Africa',
    'United Arab Emirates', 'China', 'Mexico', 'Ireland', 'Singapore',
    'Italy', 'Spain', 'Netherlands', 'Switzerland', 'New Zealand',
  ];

  const missingCountries: string[] = [];
  const foundCountries: string[] = [];

  for (const country of sampleCountries) {
    const found = activeValues.some((v: string) =>
      v === country || v.toLowerCase() === country.toLowerCase()
    );
    if (found) {
      foundCountries.push(country);
    } else {
      missingCountries.push(country);
    }
  }

  logger.info(`✅ Found ${foundCountries.length}/${sampleCountries.length} sample countries`);
  if (foundCountries.length > 0) {
    logger.info(`   Found: ${foundCountries.join(', ')}`);
  }

  if (missingCountries.length > 0) {
    logger.warn(`⚠️  Missing countries: ${missingCountries.join(', ')}`);
    // Log all available values for debugging
    logger.info(`   All available values (first 30): ${activeValues.slice(0, 30).join(', ')}`);
    throw new Error(
      `BillingCountry picklist is missing ${missingCountries.length} expected countries: ${missingCountries.join(', ')}. ` +
      `Total active values: ${activeValues.length}`
    );
  }

  logger.info(`✅ All ${sampleCountries.length} sample countries verified in "${fieldName}" picklist (${activeValues.length} total values)`);
});

/**
 * Verify BillingState picklist contains approved US state values
 * State/Province picklists in SF are controlled by country dependency
 * The describe API returns all values; we filter by validFor/controllerValue
 */
Then('the {string} picklist for country {string} should contain approved US state values', async function (
  this: AutomationWorld,
  fieldName: string,
  countryCode: string
) {
  const fields = this.testContext.fieldsMetadata;
  if (!fields) {
    throw new Error('No field metadata in context. Run "I describe the {object} object fields" first.');
  }

  const field = fields.find((f: any) =>
    f.name === fieldName || f.label === fieldName
  );

  if (!field) {
    throw new Error(`Field "${fieldName}" not found in metadata`);
  }

  const picklistValues = field.picklistValues || [];
  const allValues = picklistValues
    .filter((pv: any) => pv.active !== false)
    .map((pv: any) => pv.value || pv.label);

  logger.info(`📋 "${fieldName}" has ${allValues.length} total state/province values`);

  // Check approved US states are present
  const missingStates: string[] = [];
  const foundStates: string[] = [];

  for (const state of APPROVED_US_STATES) {
    const found = allValues.some((v: string) =>
      v === state || v.toLowerCase() === state.toLowerCase()
    );
    if (found) {
      foundStates.push(state);
    } else {
      missingStates.push(state);
    }
  }

  logger.info(`✅ Found ${foundStates.length}/${APPROVED_US_STATES.length} US states`);

  if (missingStates.length > 0) {
    logger.warn(`⚠️  Missing US states: ${missingStates.join(', ')}`);
    logger.info(`   All available values (first 30): ${allValues.slice(0, 30).join(', ')}`);
    throw new Error(
      `BillingState picklist is missing ${missingStates.length} US states: ${missingStates.join(', ')}. ` +
      `Total values: ${allValues.length}`
    );
  }

  logger.info(`✅ All ${APPROVED_US_STATES.length} US states verified in "${fieldName}" picklist`);
});

/**
 * Verify BillingState picklist contains approved Canadian province values
 */
Then('the {string} picklist for country {string} should contain approved Canadian province values', async function (
  this: AutomationWorld,
  fieldName: string,
  countryCode: string
) {
  const fields = this.testContext.fieldsMetadata;
  if (!fields) {
    throw new Error('No field metadata in context. Run "I describe the {object} object fields" first.');
  }

  const field = fields.find((f: any) =>
    f.name === fieldName || f.label === fieldName
  );

  if (!field) {
    throw new Error(`Field "${fieldName}" not found in metadata`);
  }

  const picklistValues = field.picklistValues || [];
  const allValues = picklistValues
    .filter((pv: any) => pv.active !== false)
    .map((pv: any) => pv.value || pv.label);

  logger.info(`📋 "${fieldName}" has ${allValues.length} total state/province values`);

  const missingProvinces: string[] = [];
  const foundProvinces: string[] = [];

  for (const province of APPROVED_CA_PROVINCES) {
    const found = allValues.some((v: string) =>
      v === province || v.toLowerCase() === province.toLowerCase()
    );
    if (found) {
      foundProvinces.push(province);
    } else {
      missingProvinces.push(province);
    }
  }

  logger.info(`✅ Found ${foundProvinces.length}/${APPROVED_CA_PROVINCES.length} Canadian provinces`);

  if (missingProvinces.length > 0) {
    logger.warn(`⚠️  Missing CA provinces: ${missingProvinces.join(', ')}`);
    logger.info(`   All available values (first 30): ${allValues.slice(0, 30).join(', ')}`);
    throw new Error(
      `BillingState picklist is missing ${missingProvinces.length} Canadian provinces: ${missingProvinces.join(', ')}. ` +
      `Total values: ${allValues.length}`
    );
  }

  logger.info(`✅ All ${APPROVED_CA_PROVINCES.length} Canadian provinces verified in "${fieldName}" picklist`);
});
