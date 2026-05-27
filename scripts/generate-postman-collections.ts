/**
 * Generate Postman Collections from API Feature Files
 * 
 * This script scans all API feature files, extracts work items and scenarios,
 * and generates Postman importable collections for each work item.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Scenario {
  name: string;
  tags: string[];
  steps: Step[];
  examples?: Array<Record<string, string>>;
}

interface Step {
  keyword: string; // Given, When, Then
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
  item: PostmanRequest[];
}

class PostmanCollectionGenerator {
  private outputDir: string;
  private collections: Map<string, PostmanCollection> = new Map();

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Parse a feature file and extract work item information
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
        return null; // Skip non-work-item feature files
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
    description = descriptionLines.join('\n').substring(0, 500); // Limit description length

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
      if (line === 'Examples:' || line === '|') {
        if (line === 'Examples:') {
          inExamples = true;
          i++; // Skip to next line (header)
          if (i < lines.length) {
            const headerLine = lines[i].trim();
            if (headerLine.startsWith('|')) {
              exampleHeaders = headerLine.split('|').map(h => h.trim()).filter(h => h);
            }
          }
        } else if (inExamples && line.startsWith('|')) {
          const values = line.split('|').map(v => v.trim()).filter(v => v);
          if (values.length === exampleHeaders.length) {
            const example: Record<string, string> = {};
            exampleHeaders.forEach((header, idx) => {
              example[header] = values[idx];
            });
            examples.push(example);
          }
        }
        continue;
      }

      // Steps
      if (currentScenario && (line.startsWith('Given ') || line.startsWith('When ') || line.startsWith('Then ') || line.startsWith('And '))) {
        const keyword = line.match(/^(Given|When|Then|And)/)?.[1] || 'When';
        const stepText = line.replace(/^(Given|When|Then|And)\s+/, '').trim();
        currentScenario.steps.push({ keyword, text: stepText });
      }

      // End of scenario (empty line or next scenario)
      if (currentScenario && (line === '' || line.startsWith('Scenario') || line.startsWith('Feature:')) && i > 0) {
        if (examples.length > 0) {
          currentScenario.examples = examples;
        }
        scenarios.push(currentScenario);
        currentScenario = null;
        inExamples = false;
        examples = [];
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
   * Convert a scenario step to a Postman request
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
      return requests; // No API steps in this scenario
    }

    // Extract object type and operation from steps
    let objectType = 'Account'; // Default
    let operation = 'query';
    let method = 'GET';
    let endpoint = '';
    let body: any = null;
    let queryParams: Array<{ key: string; value: string }> = [];

    for (const step of apiSteps) {
      // CREATE operations
      if (step.text.includes('create a new') && step.text.includes('via POST')) {
        operation = 'create';
        method = 'POST';
        
        // Extract object type
        const createMatch = step.text.match(/create a new (\w+)/i);
        if (createMatch) {
          objectType = createMatch[1];
        }

        // Extract fields from data table (if present in scenario)
        const dataTableMatch = scenario.steps.find(s => s.text.includes('with:'));
        if (dataTableMatch) {
          // Try to extract example values
          if (scenario.examples && scenario.examples.length > 0) {
            const example = scenario.examples[0];
            body = {};
            Object.entries(example).forEach(([key, value]) => {
              if (key.toLowerCase() !== 'account_type' && key.toLowerCase() !== 'value') {
                body[key] = value;
              }
            });
          } else {
            // Default body based on object type
            body = this.getDefaultBodyForObject(objectType);
          }
        } else {
          body = this.getDefaultBodyForObject(objectType);
        }

        endpoint = `/services/data/{{api_version}}/sobjects/${objectType}/`;
      }

      // UPDATE operations
      else if (step.text.includes('update') && (step.text.includes('via PATCH') || step.text.includes('via API'))) {
        operation = 'update';
        method = 'PATCH';
        
        const updateMatch = step.text.match(/update (?:the )?(\w+)/i);
        if (updateMatch) {
          objectType = updateMatch[1];
        }

        // Extract field and value
        const fieldMatch = step.text.match(/field "?([^"]+)"? to "?([^"]+)"?/i);
        if (fieldMatch) {
          body = { [fieldMatch[1]]: fieldMatch[2] };
        } else {
          body = this.getDefaultUpdateBodyForObject(objectType);
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

        // Extract WHERE clause if present
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

      // GET record by ID
      else if (step.text.includes('retrieve') || step.text.includes('get')) {
        operation = 'get';
        method = 'GET';
        
        const getMatch = step.text.match(/(?:retrieve|get) (?:the )?(\w+)/i);
        if (getMatch) {
          objectType = getMatch[1];
        }

        endpoint = `/services/data/{{api_version}}/sobjects/${objectType}/{{record_id}}`;
      }
    }

    // Create request name
    const requestName = `${scenario.name.substring(0, 50)} - ${operation.toUpperCase()}`;

    // Build URL
    const urlParts = endpoint.split('/').filter(p => p);
    const host = ['{{base_url}}'];

    const request: PostmanRequest = {
      name: requestName,
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
        description: `Generated from scenario: ${scenario.name}\n\nTags: ${scenario.tags.join(', ')}\n\nSteps:\n${scenario.steps.map(s => `- ${s.keyword} ${s.text}`).join('\n')}`,
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
          // Map example keys to body fields
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
   * Get default body for object creation
   */
  getDefaultBodyForObject(objectType: string): Record<string, any> {
    const defaults: Record<string, Record<string, any>> = {
      Account: {
        Name: 'Test Account via API',
        Type: 'Agency',
        Account_Status__c: 'New',
        Region__c: 'US',
        Functional_Currency__c: 'USD',
        BillingCountry: 'United States',
        BillingCity: 'New York',
        BillingState: 'New York',
        BillingPostalCode: '10001',
      },
      Lead: {
        FirstName: 'Test',
        LastName: 'Lead',
        Company: 'Test Company',
        Region__c: 'US',
      },
      Opportunity: {
        Name: 'Test Opportunity',
        StageName: 'Pipeline',
        CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      Contact: {
        FirstName: 'Test',
        LastName: 'Contact',
      },
    };

    return defaults[objectType] || { Name: `Test ${objectType}` };
  }

  /**
   * Get default update body for object
   */
  getDefaultUpdateBodyForObject(objectType: string): Record<string, any> {
    return {
      Name: `Updated ${objectType} Name`,
    };
  }

  /**
   * Generate Postman collection for a work item
   */
  generateCollection(workItem: WorkItem): PostmanCollection {
    const requests: PostmanRequest[] = [];

    // Process each scenario
    for (const scenario of workItem.scenarios) {
      const scenarioRequests = this.scenarioToPostmanRequests(workItem, scenario);
      requests.push(...scenarioRequests);
    }

    // If no requests generated, create a basic collection
    if (requests.length === 0) {
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

    const collection: PostmanCollection = {
      info: {
        _postman_id: `work-item-${workItem.id.toLowerCase()}`,
        name: `${workItem.id} - API Tests`,
        description: `${workItem.name}\n\n${workItem.description || ''}\n\nGenerated from: ${workItem.featurePath}`,
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

    return collection;
  }

  /**
   * Save collection to file
   */
  saveCollection(workItem: WorkItem, collection: PostmanCollection): void {
    const fileName = `${workItem.id}-Postman-Collection.json`;
    const filePath = path.join(this.outputDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(collection, null, 2), 'utf-8');
    console.log(`✅ Generated: ${fileName}`);
  }

  /**
   * Process all feature files
   */
  processFeatureFiles(featureDir: string): void {
    const featureFiles = this.findFeatureFiles(featureDir);
    console.log(`Found ${featureFiles.length} feature files`);

    const workItems = new Map<string, WorkItem>();

    for (const filePath of featureFiles) {
      const workItem = this.parseFeatureFile(filePath);
      if (workItem) {
        // Merge scenarios if work item already exists
        if (workItems.has(workItem.id)) {
          const existing = workItems.get(workItem.id)!;
          existing.scenarios.push(...workItem.scenarios);
        } else {
          workItems.set(workItem.id, workItem);
        }
      }
    }

    console.log(`\nGenerating Postman collections for ${workItems.size} work items...\n`);

    for (const [id, workItem] of workItems) {
      const collection = this.generateCollection(workItem);
      this.saveCollection(workItem, collection);
    }

    console.log(`\n✅ Generated ${workItems.size} Postman collections in ${this.outputDir}`);
  }

  /**
   * Find all feature files recursively
   */
  findFeatureFiles(dir: string): string[] {
    const files: string[] = [];
    
    function walkDir(currentPath: string) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.feature')) {
          files.push(fullPath);
        }
      }
    }
    
    walkDir(dir);
    return files;
  }
}

// Main execution
const outputDir = path.join(process.cwd(), 'postman-collections');
const featureDir = path.join(process.cwd(), 'src', 'features', 'api');

console.log('🚀 Generating Postman Collections from API Feature Files...\n');
console.log(`Feature files directory: ${featureDir}`);
console.log(`Output directory: ${outputDir}\n`);

const generator = new PostmanCollectionGenerator(outputDir);
generator.processFeatureFiles(featureDir);

console.log('\n✨ Done! Collections are ready to be imported into Postman.');






