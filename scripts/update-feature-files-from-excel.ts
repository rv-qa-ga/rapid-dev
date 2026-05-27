#!/usr/bin/env ts-node

/**
 * Update MRD FLS Feature Files from Excel Mapping
 * 
 * Reads the categorized FLS fields and updates both API and UI feature files
 * to match the current Excel mapping.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CategorizedFields {
  viewableEditable: string[];
  viewableNotEditable: string[];
  notViewable: string[];
}

function updateFeatureFile(
  filePath: string,
  categorized: CategorizedFields
): void {
  console.log(`\n📝 Updating ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Update positive view test cases (describe API)
  const positiveViewPattern = /(@MRD-FLS-API-001[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Examples:\s*\n\s*\| field_name \|\s*\n)([\s\S]*?)(\n\s*@MRD-FLS-API-002)/;
  const positiveViewMatch = content.match(positiveViewPattern);
  
  if (positiveViewMatch) {
    const allViewableFields = [...categorized.viewableEditable, ...categorized.viewableNotEditable];
    const fieldsList = allViewableFields.map(f => `    | ${f} |`).join('\n');
    content = content.replace(
      positiveViewPattern,
      `$1${fieldsList}\n$3`
    );
    console.log(`  ✅ Updated positive view test cases (${allViewableFields.length} fields)`);
  }
  
  // Update negative view test cases
  const negativeViewPattern = /(@MRD-FLS-API-002[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Examples:\s*\n\s*\| field_name \|\s*\n)([\s\S]*?)(\n\s*# =)/;
  const negativeViewMatch = content.match(negativeViewPattern);
  
  if (negativeViewMatch) {
    const fieldsList = categorized.notViewable.map(f => `    | ${f} |`).join('\n');
    content = content.replace(
      negativeViewPattern,
      `$1${fieldsList}\n$3`
    );
    console.log(`  ✅ Updated negative view test cases (${categorized.notViewable.length} fields)`);
  }
  
  // Update record access positive view (API-003)
  const recordViewPattern = /(@MRD-FLS-API-003[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Examples:\s*\n\s*\| field_name \| test_value \|\s*\n)([\s\S]*?)(\n\s*@MRD-FLS-API-004)/;
  const recordViewMatch = content.match(recordViewPattern);
  
  if (recordViewMatch) {
    // For record view, include all viewable fields with sample values
    const allViewableFields = [...categorized.viewableEditable, ...categorized.viewableNotEditable];
    const fieldsList = allViewableFields.slice(0, 20).map(f => {
      let testValue = 'Test Value';
      if (f === 'Name') testValue = 'MRD FLS Test Account';
      else if (f === 'Phone') testValue = '+1-555-0100';
      else if (f === 'Website') testValue = 'https://test.example.com';
      else if (f === 'Type') testValue = 'Agency';
      else if (f === 'Account_Status__c') testValue = 'New';
      else if (f === 'NumberOfEmployees') testValue = '100';
      else if (f === 'BillingCountry') testValue = 'United States';
      else if (f === 'Functional_Currency__c') testValue = 'USD';
      else if (f === 'AnnualRevenue') testValue = '1000000';
      return `    | ${f} | ${testValue} |`;
    }).join('\n');
    content = content.replace(
      recordViewPattern,
      `$1${fieldsList}\n$3`
    );
    console.log(`  ✅ Updated record view test cases`);
  }
  
  // Update record access positive edit (API-004)
  const recordEditPattern = /(@MRD-FLS-API-004[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Examples:\s*\n\s*\| field_name \| new_value \|\s*\n)([\s\S]*?)(\n\s*@MRD-FLS-API-005)/;
  const recordEditMatch = content.match(recordEditPattern);
  
  if (recordEditMatch) {
    const fieldsList = categorized.viewableEditable.slice(0, 20).map(f => {
      let newValue = 'Updated Value';
      if (f === 'Name') newValue = 'Updated Account Name';
      else if (f === 'Phone') newValue = '+1-555-9999';
      else if (f === 'Website') newValue = 'https://updated.example.com';
      else if (f === 'Type') newValue = 'Partner';
      else if (f === 'Account_Status__c') newValue = 'Active';
      else if (f === 'NumberOfEmployees') newValue = '200';
      else if (f === 'BillingCountry') newValue = 'Canada';
      else if (f === 'Functional_Currency__c') newValue = 'CAD';
      else if (f === 'AnnualRevenue') newValue = '2000000';
      return `    | ${f} | ${newValue} |`;
    }).join('\n');
    content = content.replace(
      recordEditPattern,
      `$1${fieldsList}\n$3`
    );
    console.log(`  ✅ Updated record edit test cases`);
  }
  
  // Update record access negative view (API-005)
  const recordNegativeViewPattern = /(@MRD-FLS-API-005[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Examples:\s*\n\s*\| field_name \| test_value \|\s*\n)([\s\S]*?)(\n\s*@MRD-FLS-API-006)/;
  const recordNegativeViewMatch = content.match(recordNegativeViewPattern);
  
  if (recordNegativeViewMatch) {
    const fieldsList = categorized.notViewable.slice(0, 20).map(f => {
      let testValue = 'Test Value';
      if (f === 'Rating') testValue = 'Hot';
      else if (f === 'Email') testValue = 'test@example.com';
      else if (f === 'ParentId') testValue = '001000000000000AAA';
      else if (f === 'Fax') testValue = '+1-555-0101';
      else if (f === 'AccountNumber') testValue = 'ACC-12345';
      else if (f === 'Site') testValue = 'Test Site';
      else if (f === 'Industry') testValue = 'Technology';
      return `    | ${f} | ${testValue} |`;
    }).join('\n');
    content = content.replace(
      recordNegativeViewPattern,
      `$1${fieldsList}\n$3`
    );
    console.log(`  ✅ Updated record negative view test cases`);
  }
  
  // Update record access negative edit (API-006)
  const recordNegativeEditPattern = /(@MRD-FLS-API-006[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Examples:\s*\n\s*\| field_name \| new_value \|\s*\n)([\s\S]*?)(\n\s*# =)/;
  const recordNegativeEditMatch = content.match(recordNegativeEditPattern);
  
  if (recordNegativeEditMatch) {
    const fieldsList = categorized.notViewable.slice(0, 15).map(f => {
      let newValue = 'Updated Value';
      if (f === 'Rating') newValue = 'Warm';
      else if (f === 'Email') newValue = 'updated@example.com';
      else if (f === 'ParentId') newValue = '001000000000000BBB';
      else if (f === 'Fax') newValue = '+1-555-9999';
      else if (f === 'AccountNumber') newValue = 'ACC-99999';
      else if (f === 'Industry') newValue = 'Finance';
      return `    | ${f} | ${newValue} |`;
    }).join('\n');
    content = content.replace(
      recordNegativeEditPattern,
      `$1${fieldsList}\n$3`
    );
    console.log(`  ✅ Updated record negative edit test cases`);
  }
  
  // Update create positive (API-007)
  const createPositivePattern = /(@MRD-FLS-API-007[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Examples:\s*\n\s*\| field_name \| test_value \|\s*\n)([\s\S]*?)(\n\s*@MRD-FLS-API-008)/;
  const createPositiveMatch = content.match(createPositivePattern);
  
  if (createPositiveMatch) {
    const fieldsList = categorized.viewableEditable.slice(0, 20).map(f => {
      let testValue = 'Test Value';
      if (f === 'Name') testValue = 'MRD Created Account';
      else if (f === 'Phone') testValue = '+1-555-0100';
      else if (f === 'Website') testValue = 'https://created.example.com';
      else if (f === 'Type') testValue = 'Agency';
      else if (f === 'Account_Status__c') testValue = 'New';
      else if (f === 'NumberOfEmployees') testValue = '50';
      else if (f === 'BillingCountry') testValue = 'United States';
      else if (f === 'Functional_Currency__c') testValue = 'USD';
      else if (f === 'AnnualRevenue') testValue = '500000';
      return `    | ${f} | ${testValue} |`;
    }).join('\n');
    content = content.replace(
      createPositivePattern,
      `$1${fieldsList}\n$3`
    );
    console.log(`  ✅ Updated create positive test cases`);
  }
  
  // Update create negative (API-008)
  const createNegativePattern = /(@MRD-FLS-API-008[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Examples:\s*\n\s*\| field_name \| test_value \|\s*\n)([\s\S]*?)(\n\s*# =)/;
  const createNegativeMatch = content.match(createNegativePattern);
  
  if (createNegativeMatch) {
    const fieldsList = categorized.notViewable.slice(0, 15).map(f => {
      let testValue = 'Test Value';
      if (f === 'Rating') testValue = 'Hot';
      else if (f === 'Email') testValue = 'test@example.com';
      else if (f === 'ParentId') testValue = '001000000000000AAA';
      else if (f === 'Fax') testValue = '+1-555-0101';
      else if (f === 'AccountNumber') testValue = 'ACC-12345';
      else if (f === 'Industry') testValue = 'Technology';
      return `    | ${f} | ${testValue} |`;
    }).join('\n');
    content = content.replace(
      createNegativePattern,
      `$1${fieldsList}\n$3`
    );
    console.log(`  ✅ Updated create negative test cases`);
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ File updated: ${filePath}`);
}

function main() {
  console.log('🔄 Updating MRD FLS Feature Files from Excel Mapping...\n');
  
  const categorizedPath = path.join(process.cwd(), 'src/config/mrd-fls-fields-categorized.json');
  
  if (!fs.existsSync(categorizedPath)) {
    console.error(`❌ Categorized fields file not found: ${categorizedPath}`);
    console.error('   Please run: npm run extract:mrd-fls && npm run analyze:mrd-fls');
    process.exit(1);
  }
  
  const categorized: CategorizedFields = JSON.parse(fs.readFileSync(categorizedPath, 'utf-8'));
  
  console.log(`📊 Loaded categorized fields:`);
  console.log(`   - Viewable & Editable: ${categorized.viewableEditable.length}`);
  console.log(`   - Viewable (Read-Only): ${categorized.viewableNotEditable.length}`);
  console.log(`   - Not Viewable: ${categorized.notViewable.length}`);
  
  // Update API feature file
  const apiFeaturePath = path.join(process.cwd(), 'src/features/api/SF/MRD-FLS-Account.feature');
  if (fs.existsSync(apiFeaturePath)) {
    updateFeatureFile(apiFeaturePath, categorized);
  } else {
    console.warn(`⚠️  API feature file not found: ${apiFeaturePath}`);
  }
  
  // Update UI feature file (similar patterns but with UI-specific scenarios)
  const uiFeaturePath = path.join(process.cwd(), 'src/features/ui/SF/MRD-FLS-Account.feature');
  if (fs.existsSync(uiFeaturePath)) {
    // For UI, we'll update the detail page and form scenarios
    let uiContent = fs.readFileSync(uiFeaturePath, 'utf-8');
    
    // Update UI detail page positive view
    const uiDetailViewPattern = /(@MRD-FLS-UI-001[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Examples:\s*\n\s*\| field_name \|\s*\n)([\s\S]*?)(\n\s*@MRD-FLS-UI-002)/;
    const allViewableFields = [...categorized.viewableEditable, ...categorized.viewableNotEditable];
    const uiDetailViewFields = allViewableFields.map(f => `    | ${f} |`).join('\n');
    uiContent = uiContent.replace(uiDetailViewPattern, `$1${uiDetailViewFields}\n$3`);
    
    // Update UI detail page negative view
    const uiDetailNegativePattern = /(@MRD-FLS-UI-002[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*Examples:\s*\n\s*\| field_name \|\s*\n)([\s\S]*?)(\n\s*# =)/;
    const uiDetailNegativeFields = categorized.notViewable.map(f => `    | ${f} |`).join('\n');
    uiContent = uiContent.replace(uiDetailNegativePattern, `$1${uiDetailNegativeFields}\n$3`);
    
    fs.writeFileSync(uiFeaturePath, uiContent, 'utf-8');
    console.log(`\n📝 Updated UI feature file: ${uiFeaturePath}`);
    console.log(`  ✅ Updated UI detail view test cases`);
  } else {
    console.warn(`⚠️  UI feature file not found: ${uiFeaturePath}`);
  }
  
  console.log('\n✨ Feature files updated successfully!');
}

main().catch(console.error);

