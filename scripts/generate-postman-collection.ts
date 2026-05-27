#!/usr/bin/env ts-node

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║   Postman Collection Generator & Validator                                 ║
 * ║                                                                            ║
 * ║   Generates and validates Postman collections for a given work item       ║
 * ║   from API feature files.                                                  ║
 * ║                                                                            ║
 * ║   Usage:                                                                   ║
 * ║   npm run postman:generate -- --work-item SF-113                           ║
 * ║   npm run postman:generate -- --work-item SF-113 --verify                 ║
 * ║   npm run postman:verify -- --work-item SF-113                             ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

interface Scenario {
  name: string;
  tags: string[];
  steps: Step[];
  examples?: Array<Record<string, string>>;
}

interface Step {
  keyword: string;
  text: string;
}

interface WorkItem {
  id: string;
  name: string;
  featurePath: string;
  scenarios: Scenario[];
  description?: string;
}

interface PostmanRequest {
  name: string;
  event?: Array<{
    listen: string;
    script: {
      exec: string[];
      type: string;
    };
  }>;
  request: {
    method: string;
    header: Array<{ key: string; value: string }>;
    body?: {
      mode: string;
      raw?: string;
      urlencoded?: Array<{ key: string; value: string; type: string }>;
    };
    url: {
      raw: string;
      host: string[];
      path: string[];
      query?: Array<{ key: string; value: string }>;
    };
    description?: string;
  };
  response: any[];
}

/** Folder node (Postman collection v2.1). */
interface PostmanFolder {
  name: string;
  description?: string;
  item: PostmanRequest[];
}

interface PostmanCollection {
  info: {
    _postman_id: string;
    name: string;
    description: string;
    schema: string;
  };
  auth: {
    type: string;
    bearer: Array<{ key: string; value: string; type: string }>;
  };
  variable: Array<{ key: string; value: string; type: string }>;
  item: Array<PostmanRequest | PostmanFolder>;
}

export class PostmanCollectionGenerator {
  private outputDir: string;
  private readonly TEST_CASE_ID_REGEX = /^@[A-Z]+-\d+-(UI|API)-\d+$/;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Find feature file for a work item (searches both API and UI directories)
   */
  findFeatureFile(workItemId: string): string | null {
    // Search in API features first
    const apiFeatureDir = path.join(process.cwd(), 'src', 'features', 'api');
    const pattern = `**/${workItemId}.feature`;
    let files = globSync(pattern, { cwd: apiFeatureDir });
    
    if (files.length > 0) {
      return path.join(apiFeatureDir, files[0]);
    }
    
    // If not found, search in UI features
    const uiFeatureDir = path.join(process.cwd(), 'src', 'features', 'ui');
    files = globSync(pattern, { cwd: uiFeatureDir });
    
    if (files.length > 0) {
      return path.join(uiFeatureDir, files[0]);
    }
    
    return null;
  }

  /**
   * Parse feature file and extract work item information
   */
  parseFeatureFile(filePath: string): WorkItem | null {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Extract work item ID from tags or filename
    let workItemId = '';
    let workItemName = '';
    let description = '';
    const scenarios: Scenario[] = [];
    let currentScenario: Scenario | null = null;
    let inExamples = false;
    let examples: Array<Record<string, string>> = [];
    let exampleHeaders: string[] = [];

    // Try to extract work item ID from tags
    const tagMatch = content.match(/@(\w+-\d+)/);
    if (tagMatch) {
      workItemId = tagMatch[1];
    } else {
      // Extract from filename
      const fileName = path.basename(filePath, '.feature');
      if (fileName.startsWith('SF-') || fileName.startsWith('SQL-')) {
        workItemId = fileName;
      } else {
        return null;
      }
    }

    // Extract feature name
    const featureMatch = content.match(/Feature:\s*(.+)/);
    if (featureMatch) {
      workItemName = featureMatch[1].trim();
    }

    // Extract description from comments
    const descriptionLines: string[] = [];
    for (const line of lines) {
      if (line.trim().startsWith('#') && !line.includes('JIRA:') && !line.includes('Type:')) {
        const desc = line.replace(/^#\s*/, '').trim();
        if (desc && desc.length > 0) {
          descriptionLines.push(desc);
        }
      }
    }
    description = descriptionLines.join('\n').substring(0, 500);

    // Parse scenarios
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Start of scenario
      if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
        if (currentScenario) {
          scenarios.push(currentScenario);
        }
        const scenarioName = line.replace(/Scenario( Outline)?:\s*/, '').trim();
        const scenarioTags: string[] = [];
        
        // Look for tags on previous lines
        let j = i - 1;
        while (j >= 0 && lines[j].trim().startsWith('@')) {
          const tagLine = lines[j].trim();
          const tags = tagLine.match(/@(\w+[-\w]*)/g);
          if (tags) {
            scenarioTags.push(...tags.map(t => t.substring(1)));
          }
          j--;
        }

        currentScenario = {
          name: scenarioName,
          tags: scenarioTags,
          steps: [],
        };
        inExamples = false;
        examples = [];
        exampleHeaders = [];
      }

      // Examples table
      else if (line.startsWith('Examples:') || line.startsWith('|')) {
        if (line.startsWith('Examples:')) {
          inExamples = true;
        } else if (inExamples && line.startsWith('|')) {
          const cells = line.split('|').map(c => c.trim()).filter(c => c);
          if (cells.length > 0) {
            if (exampleHeaders.length === 0) {
              exampleHeaders = cells;
            } else {
              const example: Record<string, string> = {};
              cells.forEach((cell, idx) => {
                if (idx < exampleHeaders.length) {
                  example[exampleHeaders[idx]] = cell;
                }
              });
              if (Object.keys(example).length > 0) {
                examples.push(example);
              }
            }
          }
        }
      }

      // Steps
      else if (currentScenario && (line.startsWith('Given ') || line.startsWith('When ') || 
               line.startsWith('Then ') || line.startsWith('And '))) {
        const keywordMatch = line.match(/^(Given|When|Then|And)\s+(.+)/);
        if (keywordMatch) {
          currentScenario.steps.push({
            keyword: keywordMatch[1],
            text: keywordMatch[2],
          });
        }
      }
    }

    // Add last scenario
    if (currentScenario) {
      if (examples.length > 0) {
        currentScenario.examples = examples;
      }
      scenarios.push(currentScenario);
    }

    if (!workItemId) {
      return null;
    }

    return {
      id: workItemId,
      name: workItemName || workItemId,
      featurePath: filePath,
      scenarios,
      description,
    };
  }

  /**
   * Convert scenario to Postman requests
   */
  scenarioToPostmanRequests(workItem: WorkItem, scenario: Scenario): PostmanRequest[] {
    const requests: PostmanRequest[] = [];
    const apiSteps = scenario.steps.filter(s => 
      s.text.includes('via API') || 
      s.text.includes('via POST') || 
      s.text.includes('via PATCH') ||
      s.text.includes('query') ||
      s.text.includes('describe')
    );

    if (apiSteps.length === 0) {
      return requests;
    }

    // Extract test case ID from tags
    const testCaseId = scenario.tags.find(tag => this.TEST_CASE_ID_REGEX.test(`@${tag}`));
    const testCaseIdTag = testCaseId ? `@${testCaseId}` : '';

    // Extract object type and operation from steps
    let objectType = 'Account';
    let operation = 'query';
    let method = 'GET';
    let endpoint = '';
    let body: any = null;
    let queryParams: Array<{ key: string; value: string }> = [];

    for (const step of apiSteps) {
      // CREATE operations: "create ... via POST" or "create ... via API" or "save ... via API"
      const isCreateViaPost = step.text.includes('create a new') && step.text.includes('via POST');
      const isCreateViaApi = step.text.includes('create') && (step.text.includes('via API') || step.text.includes('Account via API'));
      const isSaveViaApi = step.text.includes('save the Account') && step.text.includes('via API');
      const isAttemptSave = step.text.includes('attempt to save') && step.text.includes('via API');
      if (isCreateViaPost || isCreateViaApi || isSaveViaApi || isAttemptSave) {
        operation = 'create';
        method = 'POST';

        const createMatch = step.text.match(/create (?:a new )?(\w+)/i) || scenario.steps.find(s => s.text.includes('Account'))?.text.match(/(\w+)/);
        if (createMatch) {
          objectType = createMatch[1];
        }
        if (objectType !== 'Account') objectType = 'Account';

        body = this.getDefaultBodyForObject(objectType);
        // Extract Account Status from scenario steps (e.g. "I set Account Status to \"Onboarding\"")
        for (const s of scenario.steps) {
          const statusMatch = s.text.match(/Account Status to "([^"]+)"|set Account Status to "?([^"]+)"?/i);
          if (statusMatch) {
            body = body || {};
            (body as Record<string, string>)['Account_Status__c'] = statusMatch[1] || statusMatch[2];
            break;
          }
        }
        endpoint = `/services/data/{{api_version}}/sobjects/${objectType}/`;
      }

      // UPDATE operations: "update ... via PATCH" or "update ... via API" or "attempt to update ... via API"
      else if (step.text.includes('update') && (step.text.includes('via PATCH') || step.text.includes('via API'))) {
        operation = 'update';
        method = 'PATCH';

        const updateMatch = step.text.match(/update (?:the )?(\w+)/i);
        if (updateMatch) {
          objectType = updateMatch[1];
        }

        const fieldMatch = step.text.match(/field "?([^"]+)"? to "?([^"]+)"?/i);
        const statusMatch = step.text.match(/Account Status to "([^"]+)"|set Account Status to "?([^"]+)"?/i);
        if (fieldMatch) {
          body = { [fieldMatch[1]]: fieldMatch[2] };
        } else if (statusMatch) {
          body = { Account_Status__c: statusMatch[1] || statusMatch[2] };
        } else {
          // Try to get status from any step in scenario
          for (const s of scenario.steps) {
            const m = s.text.match(/Status to "([^"]+)"|Account_Status__c.*?([A-Za-z]+)/i);
            if (m) {
              body = { Account_Status__c: m[1] || m[2] };
              break;
            }
          }
          if (!body) body = this.getDefaultUpdateBodyForObject(objectType);
        }

        endpoint = `/services/data/{{api_version}}/sobjects/${objectType}/{{record_id}}`;
      }

      // QUERY operations
      else if (step.text.includes('query')) {
        operation = 'query';
        method = 'GET';
        
        const queryMatch = step.text.match(/query (?:all )?(\w+)/i);
        if (queryMatch) {
          objectType = queryMatch[1];
        }

        let soql = `SELECT Id, Name FROM ${objectType} LIMIT 10`;
        const whereMatch = step.text.match(/where (\w+) equals "?([^"]+)"?/i);
        if (whereMatch) {
          soql = `SELECT Id, Name, ${whereMatch[1]} FROM ${objectType} WHERE ${whereMatch[1]} = '${whereMatch[2]}' LIMIT 10`;
        }

        endpoint = `/services/data/{{api_version}}/query/`;
        queryParams = [{ key: 'q', value: soql }];
      }

      // DESCRIBE operations
      else if (step.text.includes('describe')) {
        operation = 'describe';
        method = 'GET';
        
        const describeMatch = step.text.match(/describe (?:the )?(\w+)/i);
        if (describeMatch) {
          objectType = describeMatch[1];
        }

        endpoint = `/services/data/{{api_version}}/sobjects/${objectType}/describe`;
      }
    }

    // Fallback: if no step matched but we have API steps, default to query Account
    if (!endpoint && apiSteps.length > 0) {
      operation = 'query';
      method = 'GET';
      endpoint = `/services/data/{{api_version}}/query/`;
      queryParams = [{ key: 'q', value: `SELECT Id, Name, Account_Status__c, Type FROM Account LIMIT 10` }];
    }

    // Create request name (allow longer names so Postman shows more context)
    const requestName = scenario.name.length > 80 ? scenario.name.substring(0, 80) : scenario.name;

    // Build URL
    const urlParts = endpoint.split('/').filter(p => p);
    const host = ['{{base_url}}'];

    const request: PostmanRequest = {
      name: requestName,
      event: [{
        listen: 'test',
        script: {
          exec: this.generateTestScript(operation, method, scenario),
          type: 'text/javascript',
        },
      }],
      request: {
        method,
        header: method === 'POST' || method === 'PATCH' ? [
          { key: 'Content-Type', value: 'application/json' }
        ] : [],
        url: {
          raw: `{{base_url}}${endpoint}${queryParams.length > 0 ? '?' + queryParams.map(p => `${p.key}=${encodeURIComponent(p.value)}`).join('&') : ''}`,
          host,
          path: urlParts,
          query: queryParams.length > 0 ? queryParams : undefined,
        },
        description: this.generateRequestDescription(workItem, scenario, testCaseIdTag),
      },
      response: [],
    };

    // Add body for POST/PATCH
    if (body && (method === 'POST' || method === 'PATCH')) {
      request.request.body = {
        mode: 'raw',
        raw: JSON.stringify(body, null, 2),
      };
    }

    requests.push(request);

    // If scenario has examples, create additional requests
    if (scenario.examples && scenario.examples.length > 0 && operation === 'create') {
      scenario.examples.forEach((example, idx) => {
        const exampleBody = { ...body };
        Object.entries(example).forEach(([key, value]) => {
          if (key.toLowerCase().includes('type')) {
            exampleBody.Type = value;
          } else if (key.toLowerCase().includes('status')) {
            exampleBody.Account_Status__c = value;
          } else if (key.toLowerCase().includes('name')) {
            exampleBody.Name = value;
          } else {
            exampleBody[key] = value;
          }
        });

        const exampleRequest: PostmanRequest = {
          name: `${requestName} - Example ${idx + 1}`,
          event: [{
            listen: 'test',
            script: {
              exec: this.generateTestScript(operation, method, scenario),
              type: 'text/javascript',
            },
          }],
          request: {
            ...request.request,
            body: {
              mode: 'raw',
              raw: JSON.stringify(exampleBody, null, 2),
            },
            description: `${request.request.description}\n\nExample ${idx + 1}:\n${JSON.stringify(example, null, 2)}`,
          },
          response: [],
        };

        requests.push(exampleRequest);
      });
    }

    return requests;
  }

  /**
   * Generate test script for Postman request
   */
  generateTestScript(operation: string, method: string, scenario: Scenario): string[] {
    const scripts: string[] = [];

    if (method === 'GET') {
      scripts.push('pm.test("Status code is 200", function () {');
      scripts.push('    pm.response.to.have.status(200);');
      scripts.push('});');
      
      if (operation === 'describe') {
        scripts.push('');
        scripts.push('pm.test("Response contains fields", function () {');
        scripts.push('    var jsonData = pm.response.json();');
        scripts.push('    pm.expect(jsonData.fields).to.be.an("array");');
        scripts.push('});');
      } else if (operation === 'query') {
        scripts.push('');
        scripts.push('pm.test("Response contains records", function () {');
        scripts.push('    var jsonData = pm.response.json();');
        scripts.push('    pm.expect(jsonData).to.have.property("records");');
        scripts.push('    pm.expect(jsonData.records).to.be.an("array");');
        scripts.push('});');
      }
    } else if (method === 'POST') {
      scripts.push('pm.test("Status code is 201", function () {');
      scripts.push('    pm.response.to.have.status(201);');
      scripts.push('});');
      scripts.push('');
      scripts.push('pm.test("Response contains record ID", function () {');
      scripts.push('    var jsonData = pm.response.json();');
      scripts.push('    pm.expect(jsonData).to.have.property("id");');
      scripts.push('    pm.expect(jsonData.id).to.not.be.empty;');
      scripts.push('    pm.collectionVariables.set("record_id", jsonData.id);');
      scripts.push('});');
    } else if (method === 'PATCH') {
      scripts.push('pm.test("Status code is 204", function () {');
      scripts.push('    pm.response.to.have.status(204);');
      scripts.push('});');
    }

    return scripts;
  }

  /**
   * Generate request description including full scenario steps (Given/When/Then)
   */
  generateRequestDescription(workItem: WorkItem, scenario: Scenario, testCaseId: string): string {
    const tags = scenario.tags.filter(t => !t.startsWith(workItem.id));
    const priority = tags.find(t => t.startsWith('p')) || '';
    const testType = tags.find(t => ['smoke', 'regression', 'negative'].includes(t)) || '';

    let desc = `**Scenario:** ${scenario.name}\n\n`;
    if (testCaseId) {
      desc += `**Test ID:** ${testCaseId.replace('@', '')}\n`;
    }
    if (priority) {
      desc += `**Priority:** ${priority}\n`;
    }
    if (testType) {
      desc += `**Tags:** @${testType}\n`;
    }
    desc += `\n**Feature:** ${workItem.name}\n`;

    if (scenario.steps && scenario.steps.length > 0) {
      desc += `\n---\n**Steps:**\n`;
      scenario.steps.forEach((step) => {
        desc += `- ${step.keyword} ${step.text}\n`;
      });
    }

    return desc;
  }

  /**
   * Get default body for object creation
   */
  getDefaultBodyForObject(objectType: string): Record<string, any> {
    const defaults: Record<string, Record<string, any>> = {
      Account: {
        Name: 'Test Account via API',
        Type: 'Agency',
      },
      Lead: {
        LastName: 'Test Lead',
        Company: 'Test Company',
      },
      Order: {
        Name: 'Test Order via API',
      },
    };

    return defaults[objectType] || { Name: `Test ${objectType}` };
  }

  /**
   * Get default update body
   */
  getDefaultUpdateBodyForObject(objectType: string): Record<string, any> {
    return {
      Name: `Updated ${objectType} Name`,
    };
  }

  /**
   * Create Auth Token Generator request
   */
  createAuthTokenGenerator(workItem: WorkItem): PostmanRequest | null {
    const isDynamics = workItem.id.startsWith('PP-') || workItem.id.startsWith('Dynamics-');
    const isSalesforce = workItem.id.startsWith('SF-') || workItem.id.startsWith('Salesforce-');

    if (isDynamics) {
      // Dynamics 365 OAuth2 Client Credentials flow
      return {
        name: '🔐 Get Dynamics 365 Access Token',
        event: [{
          listen: 'test',
          script: {
            exec: [
              'pm.test("Status code is 200", function () {',
              '    pm.response.to.have.status(200);',
              '});',
              '',
              'pm.test("Response contains access_token", function () {',
              '    var jsonData = pm.response.json();',
              '    pm.expect(jsonData).to.have.property("access_token");',
              '    pm.expect(jsonData.access_token).to.not.be.empty;',
              '    ',
              '    // Save token to collection variable',
              '    pm.collectionVariables.set("d365_access_token", jsonData.access_token);',
              '    pm.collectionVariables.set("d365_token_type", jsonData.token_type || "Bearer");',
              '    ',
              '    console.log("✅ Access token saved to collection variable: d365_access_token");',
              '});',
            ],
            type: 'text/javascript',
          },
        }],
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          ],
          body: {
            mode: 'urlencoded',
            urlencoded: [
              { key: 'client_id', value: '{{d365_client_id}}', type: 'text' },
              { key: 'client_secret', value: '{{d365_client_secret}}', type: 'text' },
              { key: 'scope', value: '{{d365_scope}}', type: 'text' },
              { key: 'grant_type', value: 'client_credentials', type: 'text' },
            ],
          },
          url: {
            raw: 'https://login.microsoftonline.com/{{d365_tenant_id}}/oauth2/v2.0/token',
            host: ['login.microsoftonline.com'],
            path: ['{{d365_tenant_id}}', 'oauth2', 'v2.0', 'token'],
          },
          description: 'Obtains a Dynamics 365 access token using OAuth2 Client Credentials flow.\n\n**Required Environment Variables:**\n- `d365_tenant_id`: Your Azure AD Tenant ID\n- `d365_client_id`: Your Azure AD App Registration Client ID\n- `d365_client_secret`: Your Azure AD App Registration Client Secret\n- `d365_scope`: API scope (e.g., https://yourorg.crm.dynamics.com/.default)\n\n**Response:**\nReturns `access_token`, `token_type`, and `expires_in`. The access token is automatically saved to the `d365_access_token` collection variable for use in subsequent requests.',
        },
        response: [],
      };
    } else if (isSalesforce) {
      // Salesforce OAuth2 Username/Password flow
      return {
        name: '🔐 Get Salesforce Access Token',
        event: [{
          listen: 'test',
          script: {
            exec: [
              'pm.test("Status code is 200", function () {',
              '    pm.response.to.have.status(200);',
              '});',
              '',
              'pm.test("Response contains access_token", function () {',
              '    var jsonData = pm.response.json();',
              '    pm.expect(jsonData).to.have.property("access_token");',
              '    pm.expect(jsonData.access_token).to.not.be.empty;',
              '    pm.expect(jsonData).to.have.property("instance_url");',
              '    ',
              '    // Save token and instance URL to collection variables',
              '    pm.collectionVariables.set("sf_access_token", jsonData.access_token);',
              '    pm.collectionVariables.set("sf_instance_url", jsonData.instance_url);',
              '    pm.collectionVariables.set("sf_base_url", jsonData.instance_url);',
              '    ',
              '    console.log("✅ Access token saved to collection variable: sf_access_token");',
              '    console.log("✅ Instance URL saved: " + jsonData.instance_url);',
              '});',
            ],
            type: 'text/javascript',
          },
        }],
        request: {
          method: 'POST',
          header: [
            { key: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          ],
          body: {
            mode: 'urlencoded',
            urlencoded: [
              { key: 'grant_type', value: 'password', type: 'text' },
              { key: 'client_id', value: '{{sf_client_id}}', type: 'text' },
              { key: 'client_secret', value: '{{sf_client_secret}}', type: 'text' },
              { key: 'username', value: '{{sf_username}}', type: 'text' },
              { key: 'password', value: '{{sf_password}}{{sf_security_token}}', type: 'text' },
            ],
          },
          url: {
            raw: '{{sf_login_url}}/services/oauth2/token',
            host: ['{{sf_login_url}}'],
            path: ['services', 'oauth2', 'token'],
          },
          description: 'Obtains a Salesforce access token using OAuth2 Username/Password flow.\n\n**Required Environment Variables:**\n- `sf_client_id`: Your Connected App Consumer Key\n- `sf_client_secret`: Your Connected App Consumer Secret\n- `sf_username`: Your Salesforce username\n- `sf_password`: Your Salesforce password\n- `sf_security_token`: Your Salesforce security token (appended to password)\n- `sf_login_url`: Your Salesforce login URL (e.g., https://login.salesforce.com or https://test.salesforce.com)\n\n**Response:**\nReturns `access_token`, `instance_url`, and other OAuth details. The access token and instance URL are automatically saved to collection variables for use in subsequent requests.',
        },
        response: [],
      };
    }

    return null;
  }

  /**
   * Generate Postman collection
   */
  generateCollection(workItem: WorkItem): PostmanCollection {
    const requests: PostmanRequest[] = [];

    // Add Auth Token Generator at the beginning
    const authTokenRequest = this.createAuthTokenGenerator(workItem);
    if (authTokenRequest) {
      requests.push(authTokenRequest);
    }

    for (const scenario of workItem.scenarios) {
      const scenarioRequests = this.scenarioToPostmanRequests(workItem, scenario);
      requests.push(...scenarioRequests);
    }

    if (requests.length === 1 && authTokenRequest) {
      // Only auth token generator, add a sample request
      requests.push({
        name: 'Query Records',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: '{{base_url}}/services/data/{{api_version}}/query/?q=SELECT Id, Name FROM Account LIMIT 10',
            host: ['{{base_url}}'],
            path: ['services', 'data', '{{api_version}}', 'query', ''],
            query: [{ key: 'q', value: 'SELECT Id, Name FROM Account LIMIT 10' }],
          },
          description: 'Basic query request for manual testing',
        },
        response: [],
      });
    }

    // Detect system type
    const isDynamics = workItem.id.startsWith('PP-') || workItem.id.startsWith('Dynamics-');
    const isSalesforce = workItem.id.startsWith('SF-') || workItem.id.startsWith('Salesforce-');

    // Build collection info and variables based on system type
    let collectionName = `${workItem.id} - API Tests`;
    let description = `${workItem.name}\n\n${workItem.description || ''}\n\nGenerated from: ${workItem.featurePath}\n\n`;
    let authConfig: any;
    let variables: Array<{ key: string; value: string; type: string }> = [];

    if (isDynamics) {
      collectionName = `${workItem.id} - Dynamics 365 API Tests`;
      description += `## Setup Instructions:\n1. Import this collection into Postman\n2. Create a new environment (or use existing Dynamics QA environment)\n3. Set the following environment variables:\n   - \`d365_tenant_id\`: Your Azure AD Tenant ID\n   - \`d365_client_id\`: Your Azure AD App Registration Client ID\n   - \`d365_client_secret\`: Your Azure AD App Registration Client Secret\n   - \`d365_scope\`: API scope (e.g., https://yourorg.crm.dynamics.com/.default)\n   - \`d365_base_url\`: Your Dynamics 365 instance URL (e.g., https://yourorg.crm.dynamics.com)\n   - \`d365_api_version\`: API version (e.g., v9.2)\n\n## Authentication:\n1. Run the "🔐 Get Dynamics 365 Access Token" request first\n2. The access token will be automatically saved to the \`d365_access_token\` collection variable\n3. All subsequent requests will use this token via Bearer authentication`;
      
      authConfig = {
        type: 'bearer',
        bearer: [{
          key: 'token',
          value: '{{d365_access_token}}',
          type: 'string',
        }],
      };

      variables = [
        { key: 'd365_access_token', value: '', type: 'string' },
        { key: 'd365_token_type', value: 'Bearer', type: 'string' },
        { key: 'base_url', value: '{{d365_base_url}}', type: 'string' },
        { key: 'api_version', value: '{{d365_api_version}}', type: 'string' },
        { key: 'record_id', value: '', type: 'string' },
      ];
    } else if (isSalesforce) {
      collectionName = `${workItem.id} - Salesforce API Tests`;
      description += `## Setup Instructions:\n1. Import this collection into Postman\n2. Create a new environment (or use existing Salesforce QA environment)\n3. Set the following environment variables:\n   - \`sf_client_id\`: Your Connected App Consumer Key\n   - \`sf_client_secret\`: Your Connected App Consumer Secret\n   - \`sf_username\`: Your Salesforce username\n   - \`sf_password\`: Your Salesforce password\n   - \`sf_security_token\`: Your Salesforce security token\n   - \`sf_login_url\`: Your Salesforce login URL (e.g., https://login.salesforce.com or https://test.salesforce.com)\n   - \`sf_api_version\`: API version (e.g., v60.0)\n\n## Authentication:\n1. Run the "🔐 Get Salesforce Access Token" request first\n2. The access token and instance URL will be automatically saved to collection variables\n3. All subsequent requests will use this token via Bearer authentication`;
      
      authConfig = {
        type: 'bearer',
        bearer: [{
          key: 'token',
          value: '{{sf_access_token}}',
          type: 'string',
        }],
      };

      variables = [
        { key: 'sf_access_token', value: '', type: 'string' },
        { key: 'sf_instance_url', value: '', type: 'string' },
        { key: 'base_url', value: '{{sf_instance_url}}', type: 'string' },
        { key: 'api_version', value: '{{sf_api_version}}', type: 'string' },
        { key: 'record_id', value: '', type: 'string' },
      ];
    } else {
      // Default to Salesforce for backward compatibility
      description += `## Setup Instructions:\n1. Import this collection into Postman\n2. Create a new environment\n3. Set the required environment variables\n\n## Authentication:\nRun the "🔐 Get Access Token" request first to obtain an access token.`;
      
      authConfig = {
        type: 'bearer',
        bearer: [{
          key: 'token',
          value: '{{access_token}}',
          type: 'string',
        }],
      };

      variables = [
        { key: 'base_url', value: '{{base_url}}', type: 'string' },
        { key: 'api_version', value: '{{api_version}}', type: 'string' },
        { key: 'record_id', value: '', type: 'string' },
      ];
    }

    const collection: PostmanCollection = {
      info: {
        _postman_id: `work-item-${workItem.id.toLowerCase()}`,
        name: collectionName,
        description: description,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      auth: authConfig,
      variable: variables,
      item: requests,
    };

    return collection;
  }

  /**
   * Save collection to file
   */
  saveCollection(workItem: WorkItem, collection: PostmanCollection): string {
    const fileName = `${workItem.id}-Postman-Collection.json`;
    const filePath = path.join(this.outputDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(collection, null, '\t'), 'utf-8');
    return filePath;
  }

  /**
   * Verify JSON file is valid
   */
  verifyJSON(filePath: string): { valid: boolean; error?: string } {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      JSON.parse(content);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let workItemId: string | null = null;
  let verifyOnly = false;
  let generateOnly = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--work-item':
        workItemId = args[++i];
        break;
      case '--verify':
        verifyOnly = true;
        break;
      case '--generate':
        generateOnly = true;
        break;
      case '--help':
        console.log(`
Usage: npm run postman:generate -- --work-item <WORK_ITEM_ID> [options]

Options:
  --work-item <id>    Work item ID (e.g., SF-113, SF-461)
  --verify            Only verify existing collection (don't generate)
  --generate          Only generate collection (don't verify)
  --help              Show this help message

Examples:
  npm run postman:generate -- --work-item SF-113
  npm run postman:generate -- --work-item SF-113 --verify
  npm run postman:verify -- --work-item SF-113
        `);
        process.exit(0);
    }
  }

  if (!workItemId) {
    console.error('❌ Work item ID is required. Use --work-item <id>');
    console.log('Example: npm run postman:generate -- --work-item SF-113');
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), 'postman-collections');
  const generator = new PostmanCollectionGenerator(outputDir);

  // Verify existing collection
  const collectionFileName = `${workItemId}-Postman-Collection.json`;
  const collectionPath = path.join(outputDir, collectionFileName);

  if (fs.existsSync(collectionPath)) {
    console.log(`\n📋 Found existing collection: ${collectionFileName}`);
    const verifyResult = generator.verifyJSON(collectionPath);
    if (verifyResult.valid) {
      console.log('✅ Collection JSON is valid');
    } else {
      console.error(`❌ Collection JSON is invalid: ${verifyResult.error}`);
      if (!verifyOnly) {
        console.log('⚠️  Will regenerate collection...');
      } else {
        process.exit(1);
      }
    }
  } else {
    console.log(`\n📋 Collection not found: ${collectionFileName}`);
    if (verifyOnly) {
      console.error('❌ Cannot verify - collection does not exist');
      process.exit(1);
    }
  }

  // Generate collection
  if (!verifyOnly) {
    console.log(`\n🚀 Generating Postman collection for ${workItemId}...\n`);

    const featureFile = generator.findFeatureFile(workItemId);
    if (!featureFile) {
      console.error(`❌ Feature file not found for ${workItemId}`);
      console.log(`   Searched in: src/features/api/**/${workItemId}.feature`);
      console.log(`   Searched in: src/features/ui/**/${workItemId}.feature`);
      process.exit(1);
    }

    console.log(`📄 Found feature file: ${featureFile}`);

    let workItem = generator.parseFeatureFile(featureFile);
    if (!workItem) {
      console.error(`❌ Failed to parse feature file: ${featureFile}`);
      process.exit(1);
    }

    // Use requested work item ID for collection name when it differs (e.g. SF-726-Demo)
    if (workItemId !== workItem.id) {
      workItem = { ...workItem, id: workItemId, name: workItem.name || workItemId };
    }

    console.log(`📊 Found ${workItem.scenarios.length} scenario(s)`);

    const collection = generator.generateCollection(workItem);
    const savedPath = generator.saveCollection(workItem, collection);

    console.log(`\n✅ Generated: ${savedPath}`);

    // Verify generated collection
    const verifyResult = generator.verifyJSON(savedPath);
    if (verifyResult.valid) {
      console.log('✅ Generated collection JSON is valid');
      console.log(`\n📦 Collection ready to import into Postman!`);
    } else {
      console.error(`❌ Generated collection JSON is invalid: ${verifyResult.error}`);
      process.exit(1);
    }
  }

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

