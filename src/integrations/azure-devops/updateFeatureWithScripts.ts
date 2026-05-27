/**
 * Utility to update existing feature files with SQL script references
 * 
 * This script can be used to add SQL script references to existing feature files
 * when scripts are created or updated after the feature file was generated.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';

interface ScriptReference {
  fileName: string;
  description: string;
  relatedScenarios?: string[];
}

/**
 * Update a feature file to include SQL script references
 */
export function updateFeatureFileWithScripts(
  featureFilePath: string,
  scripts: ScriptReference[]
): void {
  if (!fs.existsSync(featureFilePath)) {
    logger.error(`Feature file not found: ${featureFilePath}`);
    return;
  }

  let content = fs.readFileSync(featureFilePath, 'utf-8');
  
  // Check if scripts section already exists
  const scriptsSectionRegex = /# SQL Validation Scripts[\s\S]*?(?=\n\s*Background:|\n\s*@|\n\s*Scenario:)/;
  const hasScriptsSection = scriptsSectionRegex.test(content);

  const scriptsSection = generateScriptsSection(scripts);

  if (hasScriptsSection) {
    // Replace existing scripts section
    content = content.replace(scriptsSectionRegex, scriptsSection);
  } else {
    // Insert scripts section before Background or first Scenario
    const insertBeforeRegex = /(\n\s*Background:|\n\s*@|\n\s*Scenario:)/;
    if (insertBeforeRegex.test(content)) {
      content = content.replace(insertBeforeRegex, `\n${scriptsSection}$1`);
    } else {
      // Append at the end if no Background/Scenario found
      content += `\n${scriptsSection}`;
    }
  }

  // Add script comments to relevant scenarios
  scripts.forEach(script => {
    if (script.relatedScenarios && script.relatedScenarios.length > 0) {
      script.relatedScenarios.forEach(scenarioName => {
        const scenarioRegex = new RegExp(
          `(Scenario:\\s*${scenarioName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n)`,
          'i'
        );
        
        if (scenarioRegex.test(content)) {
          // Check if comment already exists
          const commentPattern = new RegExp(
            `Scenario:\\s*${scenarioName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n(?:\\s*#.*\\n)*`,
            'i'
          );
          
          const match = content.match(commentPattern);
          if (match && !match[0].includes(script.fileName)) {
            // Add comment after scenario name
            const comment = `    # Uses validation script: ${script.fileName}\n    # Script location: src/features/sqlserver/sql-scripts/${script.fileName}\n`;
            content = content.replace(scenarioRegex, `$1${comment}`);
          }
        }
      });
    }
  });

  fs.writeFileSync(featureFilePath, content, 'utf-8');
  logger.info(`✅ Updated feature file: ${featureFilePath}`);
}

/**
 * Generate scripts section content
 */
function generateScriptsSection(scripts: ScriptReference[]): string {
  if (scripts.length === 0) {
    return `  # SQL Validation Scripts
  # The following SQL scripts are available in src/features/sqlserver/sql-scripts/
  # These scripts are generated from PR code analysis and can be executed as part of test scenarios:
  # (No validation scripts available for this work item)
`;
  }

  const lines: string[] = [];
  lines.push(`  # SQL Validation Scripts`);
  lines.push(`  # The following SQL scripts are available in src/features/sqlserver/sql-scripts/`);
  lines.push(`  # These scripts are generated from PR code analysis and can be executed as part of test scenarios:`);
  lines.push(``);
  
  scripts.forEach(script => {
    lines.push(`  # - ${script.fileName}${script.description ? ` (${script.description})` : ''}`);
  });
  lines.push(``);
  
  return lines.join('\n');
}

/**
 * Find all SQL scripts for a work item
 */
export function findScriptsForWorkItem(workItemId: number, sqlScriptsDir: string): ScriptReference[] {
  const scripts: ScriptReference[] = [];
  
  if (!fs.existsSync(sqlScriptsDir)) {
    return scripts;
  }

  const files = fs.readdirSync(sqlScriptsDir);
  const pattern = new RegExp(`^ADO-${workItemId}-(.+)\\.sql$`, 'i');
  
  files.forEach(file => {
    const match = file.match(pattern);
    if (match) {
      const scriptContent = fs.readFileSync(path.join(sqlScriptsDir, file), 'utf-8');
      const description = extractScriptDescription(scriptContent);
      
      scripts.push({
        fileName: file,
        description: description || match[1].replace(/_/g, ' '),
      });
    }
  });

  return scripts;
}

/**
 * Extract description from SQL script comments
 */
function extractScriptDescription(scriptContent: string): string | null {
  // Look for description in comments at the top
  const commentMatch = scriptContent.match(/--\s*(?:Performance\s+)?Validation\s+Script\s+for\s+(.+)/i);
  if (commentMatch) {
    return commentMatch[1].trim();
  }
  
  // Look for object name in script
  const objectMatch = scriptContent.match(/(?:PROCEDURE|FUNCTION|INDEX)\s+(?:\[|`)?(\w+)/i);
  if (objectMatch) {
    return objectMatch[1];
  }
  
  return null;
}

