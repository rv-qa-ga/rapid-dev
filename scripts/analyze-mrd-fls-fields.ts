#!/usr/bin/env ts-node

/**
 * Analyze MRD FLS fields from extracted matrix
 * Categorizes fields into viewable/editable/restricted for test case generation
 */

import * as fs from 'fs';
import * as path from 'path';

interface FieldFLS {
  fieldName: string;
  fieldLabel?: string;
  fieldType?: string;
  rolePermissions: {
    mrd: {
      view: boolean;
      edit: boolean;
      required?: boolean;
    };
  };
}

interface FLSMatrix {
  objects: {
    [objectName: string]: {
      fields: FieldFLS[];
    };
  };
}

async function analyzeMRDFLSFields() {
  const matrixPath = path.join(process.cwd(), 'src/config/fls-matrix.json');
  
  if (!fs.existsSync(matrixPath)) {
    throw new Error(`FLS matrix not found: ${matrixPath}. Run extraction script first.`);
  }

  const matrix: FLSMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
  
  // Find Account object (may be "Accounts SoT" or "Account")
  const accountObject = matrix.objects['Accounts SoT'] || matrix.objects['Account'];
  
  if (!accountObject) {
    throw new Error('Account object not found in FLS matrix. Available objects: ' + Object.keys(matrix.objects).join(', '));
  }

  const fields = accountObject.fields;
  
  // Categorize fields
  const viewableEditable: FieldFLS[] = [];
  const viewableNotEditable: FieldFLS[] = [];
  const notViewable: FieldFLS[] = [];

  for (const field of fields) {
    const canView = field.rolePermissions.mrd.view;
    const canEdit = field.rolePermissions.mrd.edit;

    if (canView && canEdit) {
      viewableEditable.push(field);
    } else if (canView && !canEdit) {
      viewableNotEditable.push(field);
    } else if (!canView) {
      notViewable.push(field);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 MRD FLS FIELD ANALYSIS - Account Object');
  console.log('='.repeat(80));
  console.log(`\nTotal Fields: ${fields.length}`);
  console.log(`  ✅ Viewable & Editable: ${viewableEditable.length}`);
  console.log(`  👁️  Viewable (Read-Only): ${viewableNotEditable.length}`);
  console.log(`  ❌ Not Viewable (Restricted): ${notViewable.length}`);

  console.log(`\n📝 VIEWABLE & EDITABLE FIELDS (${viewableEditable.length}):`);
  viewableEditable.forEach(f => {
    console.log(`  - ${f.fieldName}${f.fieldLabel ? ` (${f.fieldLabel})` : ''}`);
  });

  console.log(`\n👁️  VIEWABLE BUT NOT EDITABLE FIELDS (${viewableNotEditable.length}):`);
  viewableNotEditable.forEach(f => {
    console.log(`  - ${f.fieldName}${f.fieldLabel ? ` (${f.fieldLabel})` : ''}`);
  });

  console.log(`\n❌ RESTRICTED FIELDS (${notViewable.length}):`);
  notViewable.forEach(f => {
    console.log(`  - ${f.fieldName}${f.fieldLabel ? ` (${f.fieldLabel})` : ''}`);
  });

  // Generate test case examples
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST CASE FIELD EXAMPLES');
  console.log('='.repeat(80));

  console.log('\n✅ Positive Test Cases - Viewable & Editable (first 15):');
  viewableEditable.slice(0, 15).forEach(f => {
    console.log(`  | ${f.fieldName} | Test Value |`);
  });

  console.log('\n👁️  Positive Test Cases - Viewable but Not Editable (first 10):');
  viewableNotEditable.slice(0, 10).forEach(f => {
    console.log(`  | ${f.fieldName} | Test Value |`);
  });

  console.log('\n❌ Negative Test Cases - Restricted (first 10):');
  notViewable.slice(0, 10).forEach(f => {
    console.log(`  | ${f.fieldName} | Test Value |`);
  });

  // Write categorized fields to JSON for test case generation
  const categorized = {
    viewableEditable: viewableEditable.map(f => f.fieldName),
    viewableNotEditable: viewableNotEditable.map(f => f.fieldName),
    notViewable: notViewable.map(f => f.fieldName),
  };

  const outputPath = path.join(process.cwd(), 'src/config/mrd-fls-fields-categorized.json');
  fs.writeFileSync(outputPath, JSON.stringify(categorized, null, 2), 'utf-8');
  console.log(`\n✅ Categorized fields written to: ${path.basename(outputPath)}`);

  return categorized;
}

analyzeMRDFLSFields().catch(console.error);

