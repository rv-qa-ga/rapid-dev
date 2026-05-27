#!/usr/bin/env ts-node

/**
 * List all available Dynamics 365 APIs and Entity Sets
 * Connects to Dynamics CRM and lists all discoverable APIs
 */

import { APIRequestContext, chromium } from '@playwright/test';
import { config } from '../src/config/config';
import { DynamicsAPIClient } from '../src/api-clients/dynamics/DynamicsAPIClient';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface EntitySet {
  name: string;
  kind?: string;
  url?: string;
  entityType?: string;
}

interface ServiceDocument {
  '@odata.context': string;
  value: EntitySet[];
}

async function listDynamicsAPIs() {
  try {
    const env = config.getEnvironment();
    console.log(`\n🔍 Discovering Dynamics 365 APIs for environment: ${env.toUpperCase()}\n`);

    // Initialize browser and API context
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const apiContext = context.request;

    // Initialize Dynamics API client
    const apiClient = new DynamicsAPIClient(apiContext);
    await apiClient.authenticate();
    console.log('✅ Authenticated with Dynamics 365\n');

    // Get service document
    console.log('📋 Retrieving service document...');
    const serviceDoc = await apiClient.getServiceDocument() as ServiceDocument;
    const entitySets = serviceDoc.value || [];

    console.log(`\n✅ Found ${entitySets.length} entity sets\n`);

    // Group by entity type prefix (common entities, custom entities, etc.)
    const commonEntities: EntitySet[] = [];
    const customEntities: EntitySet[] = [];
    const systemEntities: EntitySet[] = [];

    entitySets.forEach((entity: EntitySet) => {
      const name = entity.name || '';
      if (name.endsWith('_c') || name.includes('_custom')) {
        customEntities.push(entity);
      } else if (name.startsWith('msdyn_') || name.startsWith('systemuser') || name.startsWith('organization')) {
        systemEntities.push(entity);
      } else {
        commonEntities.push(entity);
      }
    });

    // Sort each group
    const sortByName = (a: EntitySet, b: EntitySet) => (a.name || '').localeCompare(b.name || '');
    commonEntities.sort(sortByName);
    customEntities.sort(sortByName);
    systemEntities.sort(sortByName);

    // Display results
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('📊 DYNAMICS 365 API ENTITY SETS');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    console.log(`📦 COMMON ENTITIES (${commonEntities.length}):`);
    console.log('───────────────────────────────────────────────────────────────────────────────');
    commonEntities.slice(0, 50).forEach((entity, index) => {
      const entityType = entity.entityType ? ` → ${entity.entityType}` : '';
      console.log(`  ${(index + 1).toString().padStart(3)}. ${entity.name}${entityType}`);
    });
    if (commonEntities.length > 50) {
      console.log(`  ... and ${commonEntities.length - 50} more common entities`);
    }

    if (customEntities.length > 0) {
      console.log(`\n🔧 CUSTOM ENTITIES (${customEntities.length}):`);
      console.log('───────────────────────────────────────────────────────────────────────────────');
      customEntities.slice(0, 30).forEach((entity, index) => {
        const entityType = entity.entityType ? ` → ${entity.entityType}` : '';
        console.log(`  ${(index + 1).toString().padStart(3)}. ${entity.name}${entityType}`);
      });
      if (customEntities.length > 30) {
        console.log(`  ... and ${customEntities.length - 30} more custom entities`);
      }
    }

    if (systemEntities.length > 0) {
      console.log(`\n⚙️  SYSTEM ENTITIES (${systemEntities.length}):`);
      console.log('───────────────────────────────────────────────────────────────────────────────');
      systemEntities.slice(0, 20).forEach((entity, index) => {
        const entityType = entity.entityType ? ` → ${entity.entityType}` : '';
        console.log(`  ${(index + 1).toString().padStart(3)}. ${entity.name}${entityType}`);
      });
      if (systemEntities.length > 20) {
        console.log(`  ... and ${systemEntities.length - 20} more system entities`);
      }
    }

    // Get API version and capabilities
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('🔧 API INFORMATION');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    const d365Config = config.getDynamicsConfig();
    console.log(`  API Version: ${d365Config.apiVersion || 'v9.2'}`);
    console.log(`  Base URL: ${d365Config.baseUrl}`);
    console.log(`  Web API URL: ${d365Config.webApiBaseUrl || `${d365Config.baseUrl}/api/data/v9.2/`}`);
    console.log(`  Total Entity Sets: ${entitySets.length}`);

    // Try to get entity definitions count
    try {
      const allEntityDefs = await apiClient.getAllEntityDefinitions();
      const entityCount = allEntityDefs.value ? allEntityDefs.value.length : 0;
      console.log(`  Total Entity Definitions: ${entityCount}`);
    } catch (error) {
      console.log(`  Total Entity Definitions: Unable to retrieve`);
    }

    // Save to file
    const outputDir = path.join(__dirname, '../reports/dynamics');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `dynamics-apis-${env}-${new Date().toISOString().split('T')[0]}.json`);
    const outputData = {
      environment: env,
      timestamp: new Date().toISOString(),
      apiVersion: d365Config.apiVersion || 'v9.2',
      baseUrl: d365Config.baseUrl,
      totalEntitySets: entitySets.length,
      entitySets: entitySets.map(e => ({
        name: e.name,
        entityType: e.entityType,
        kind: e.kind,
        url: e.url
      })),
      grouped: {
        common: commonEntities.map(e => e.name),
        custom: customEntities.map(e => e.name),
        system: systemEntities.map(e => e.name)
      }
    };

    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 Full API list saved to: ${outputFile}`);

    // Create a readable markdown report
    const markdownFile = path.join(outputDir, `dynamics-apis-${env}-${new Date().toISOString().split('T')[0]}.md`);
    let markdown = `# Dynamics 365 API Discovery Report\n\n`;
    markdown += `**Environment:** ${env.toUpperCase()}\n`;
    markdown += `**Date:** ${new Date().toISOString()}\n`;
    markdown += `**API Version:** ${d365Config.apiVersion || 'v9.2'}\n`;
    markdown += `**Base URL:** ${d365Config.baseUrl}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Entity Sets:** ${entitySets.length}\n`;
    markdown += `- **Common Entities:** ${commonEntities.length}\n`;
    markdown += `- **Custom Entities:** ${customEntities.length}\n`;
    markdown += `- **System Entities:** ${systemEntities.length}\n\n`;

    markdown += `## Common Entities\n\n`;
    commonEntities.forEach((entity, index) => {
      markdown += `${index + 1}. **${entity.name}**`;
      if (entity.entityType) {
        markdown += ` (${entity.entityType})`;
      }
      markdown += `\n`;
    });

    if (customEntities.length > 0) {
      markdown += `\n## Custom Entities\n\n`;
      customEntities.forEach((entity, index) => {
        markdown += `${index + 1}. **${entity.name}**`;
        if (entity.entityType) {
          markdown += ` (${entity.entityType})`;
        }
        markdown += `\n`;
      });
    }

    if (systemEntities.length > 0) {
      markdown += `\n## System Entities\n\n`;
      systemEntities.forEach((entity, index) => {
        markdown += `${index + 1}. **${entity.name}**`;
        if (entity.entityType) {
          markdown += ` (${entity.entityType})`;
        }
        markdown += `\n`;
      });
    }

    fs.writeFileSync(markdownFile, markdown);
    console.log(`📄 Markdown report saved to: ${markdownFile}\n`);

    await browser.close();
    console.log('✅ API discovery completed!\n');

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  listDynamicsAPIs();
}

