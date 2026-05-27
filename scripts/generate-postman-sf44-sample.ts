/**
 * Generate Postman Collection for SF-44 (Sample)
 * 
 * This is a test script to generate a Postman collection for SF-44 work item
 */

import * as fs from 'fs';
import * as path from 'path';

// Read SF-44 feature file
const featureFile = path.join(process.cwd(), 'src', 'features', 'api', 'SF', 'SF-44.feature');
const content = fs.readFileSync(featureFile, 'utf-8');

// Parse the feature file
const lines = content.split('\n');
let featureName = '';
let description = '';
const scenarios: any[] = [];
let currentScenario: any = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line.startsWith('Feature:')) {
    featureName = line.replace('Feature:', '').trim();
  }
  
  if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
    if (currentScenario) {
      scenarios.push(currentScenario);
    }
    currentScenario = {
      name: line.replace(/Scenario( Outline)?:\s*/, '').trim(),
      steps: [],
    };
  }
  
  if (currentScenario && (line.startsWith('Given ') || line.startsWith('When ') || line.startsWith('Then ') || line.startsWith('And '))) {
    currentScenario.steps.push(line);
  }
  
  if (line.startsWith('#') && !line.includes('JIRA:') && !line.includes('Type:')) {
    description += line.replace(/^#\s*/, '') + '\n';
  }
}

if (currentScenario) {
  scenarios.push(currentScenario);
}

// Generate Postman collection
const requests: any[] = [];

// Request 1: Describe Account object (for field existence check)
requests.push({
  name: 'SF-44-API-001 - Describe Account Object',
  request: {
    method: 'GET',
    header: [],
    url: {
      raw: '{{base_url}}/services/data/{{api_version}}/sobjects/Account/describe',
      host: ['{{base_url}}'],
      path: ['services', 'data', '{{api_version}}', 'sobjects', 'Account', 'describe'],
    },
    description: 'Verify checkbox_is_checked_Then_the_Reason__c field exists on Account',
  },
  response: [],
});

// Request 2: Create Account
requests.push({
  name: 'SF-44-API-002 - Create Account',
  request: {
    method: 'POST',
    header: [
      {
        key: 'Content-Type',
        value: 'application/json',
      },
    ],
    body: {
      mode: 'raw',
      raw: JSON.stringify({
        Name: 'API Test Account',
        Type: 'Member',
        Account_Status__c: 'New',
        Region__c: 'US',
        Functional_Currency__c: 'USD',
        BillingCountry: 'United States',
        BillingCity: 'New York',
        BillingState: 'New York',
        BillingPostalCode: '10001',
      }, null, 2),
    },
    url: {
      raw: '{{base_url}}/services/data/{{api_version}}/sobjects/Account/',
      host: ['{{base_url}}'],
      path: ['services', 'data', '{{api_version}}', 'sobjects', 'Account', ''],
    },
    description: 'Create Account with checkbox_is_checked_Then_the_Reason__c field',
  },
  response: [],
});

// Request 3: Update Account field
requests.push({
  name: 'SF-44-API-003 - Update checkbox_is_checked_Then_the_Reason__c',
  request: {
    method: 'PATCH',
    header: [
      {
        key: 'Content-Type',
        value: 'application/json',
      },
    ],
    body: {
      mode: 'raw',
      raw: JSON.stringify({
        checkbox_is_checked_Then_the_Reason__c: 'Updated Value',
      }, null, 2),
    },
    url: {
      raw: '{{base_url}}/services/data/{{api_version}}/sobjects/Account/{{record_id}}',
      host: ['{{base_url}}'],
      path: ['services', 'data', '{{api_version}}', 'sobjects', 'Account', '{{record_id}}'],
    },
    description: 'Update checkbox_is_checked_Then_the_Reason__c field on Account',
  },
  response: [],
});

// Request 4: Query Accounts
requests.push({
  name: 'SF-44-API-004 - Query All Accounts',
  request: {
    method: 'GET',
    header: [],
    url: {
      raw: '{{base_url}}/services/data/{{api_version}}/query/?q=SELECT Id, Name, checkbox_is_checked_Then_the_Reason__c FROM Account LIMIT 10',
      host: ['{{base_url}}'],
      path: ['services', 'data', '{{api_version}}', 'query', ''],
      query: [
        {
          key: 'q',
          value: 'SELECT Id, Name, checkbox_is_checked_Then_the_Reason__c FROM Account LIMIT 10',
        },
      ],
    },
    description: 'Query Account records to verify checkbox_is_checked_Then_the_Reason__c field',
  },
  response: [],
});

// Request 5: Create Account with invalid value (negative test)
requests.push({
  name: 'SF-44-API-005 - Create Account with Invalid Value (Negative Test)',
  request: {
    method: 'POST',
    header: [
      {
        key: 'Content-Type',
        value: 'application/json',
      },
    ],
    body: {
      mode: 'raw',
      raw: JSON.stringify({
        Name: 'Invalid Test',
        Type: 'Member',
        checkbox_is_checked_Then_the_Reason__c: 'INVALID_VALUE_###',
        Region__c: 'US',
        Functional_Currency__c: 'USD',
        BillingCountry: 'United States',
      }, null, 2),
    },
    url: {
      raw: '{{base_url}}/services/data/{{api_version}}/sobjects/Account/',
      host: ['{{base_url}}'],
      path: ['services', 'data', '{{api_version}}', 'sobjects', 'Account', ''],
    },
    description: 'Negative test: Attempt to create Account with invalid checkbox_is_checked_Then_the_Reason__c value. Expected: Error response',
  },
  response: [],
});

// Request 6: Get Account by ID (to verify null value)
requests.push({
  name: 'SF-44-API-006 - Get Account by ID (Verify Null Value)',
  request: {
    method: 'GET',
    header: [],
    url: {
      raw: '{{base_url}}/services/data/{{api_version}}/sobjects/Account/{{record_id}}?fields=Id,Name,checkbox_is_checked_Then_the_Reason__c',
      host: ['{{base_url}}'],
      path: ['services', 'data', '{{api_version}}', 'sobjects', 'Account', '{{record_id}}'],
      query: [
        {
          key: 'fields',
          value: 'Id,Name,checkbox_is_checked_Then_the_Reason__c',
        },
      ],
    },
    description: 'Get Account record to verify checkbox_is_checked_Then_the_Reason__c is null or empty',
  },
  response: [],
});

// Create Postman collection
const collection = {
  info: {
    _postman_id: 'sf-44-api-tests',
    name: 'SF-44 - Binding Authority Limited Flag - API Tests',
    description: `${featureName}\n\n${description.substring(0, 500)}\n\nGenerated from: ${featureFile}\n\nThis collection contains API tests for SF-44 work item.`,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [
      {
        key: 'token',
        value: '{{sf_access_token}}',
        type: 'string',
      },
    ],
  },
  variable: [
    {
      key: 'base_url',
      value: '{{sf_base_url}}',
      type: 'string',
    },
    {
      key: 'api_version',
      value: '{{sf_api_version}}',
      type: 'string',
    },
    {
      key: 'record_id',
      value: '{{record_id}}',
      type: 'string',
    },
  ],
  item: requests,
};

// Create output directory
const outputDir = path.join(process.cwd(), 'postman-collections');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Save collection
const outputFile = path.join(outputDir, 'SF-44-Postman-Collection.json');
fs.writeFileSync(outputFile, JSON.stringify(collection, null, 2), 'utf-8');

console.log('✅ Generated Postman collection for SF-44');
console.log(`📁 Output file: ${outputFile}`);
console.log(`\n📋 Collection contains ${requests.length} requests:`);
requests.forEach((req, idx) => {
  console.log(`   ${idx + 1}. ${req.name}`);
});
console.log('\n✨ Collection is ready to be imported into Postman!');






