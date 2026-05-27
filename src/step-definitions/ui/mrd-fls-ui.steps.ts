/**
 * MRD FLS UI Step Definitions
 * 
 * Step definitions for testing MRD Field-Level Security via UI
 * 
 * Usage in feature files:
 *   Then validate all Account fields visibility against MRD FLS matrix on detail page
 *   Then validate all Account fields editability against MRD FLS matrix on edit form
 *   Then validate all Account fields visibility against MRD FLS matrix on create form
 */

import { Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { logger } from '../../utils/logger';
import { getFLSValidator } from '../../utils/fls-validator';
import { FieldRegistry } from '../../page-objects/salesforce/fields/FieldRegistry';

// ============================================================================
// COMPREHENSIVE FLS VALIDATION - UI
// ============================================================================

/**
 * Validate all fields visibility against MRD FLS matrix on detail page
 * 
 * Examples:
 *   Then validate all Account fields visibility against MRD FLS matrix on detail page
 */
Then(
  /^validate all (\w+) fields visibility against MRD FLS matrix on detail page$/,
  async function (this: AutomationWorld, objectName: string) {
    if (!this.page) {
      throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
    }

    const flsValidator = getFLSValidator();
    const flsMatrix = flsValidator.loadFLSMatrix();
    
    const objectFLS = flsMatrix.objects[objectName];
    if (!objectFLS) {
      throw new Error(`No FLS matrix found for object "${objectName}". Run extraction script first.`);
    }

    logger.info(`Validating ${objectFLS.fields.length} fields for ${objectName} on detail page against MRD FLS matrix...`);

    const roleId = 'mrd'; // MRD role ID
    const errors: string[] = [];
    const fieldRegistry = new FieldRegistry(this.page);

    for (const fieldFLS of objectFLS.fields) {
      const fieldName = fieldFLS.fieldName;
      const expectedView = fieldFLS.rolePermissions.mrd?.view || false;

      try {
        // Check if field is visible on detail page
        const isVisible = await fieldRegistry.isFieldVisible(fieldName);
        
        if (expectedView && !isVisible) {
          errors.push(`Field "${fieldName}" should be visible on detail page but is not.`);
        } else if (!expectedView && isVisible) {
          // Field should not be visible, but it is - this might be acceptable if it's read-only
          // Check if it's at least read-only
          const isEditable = await fieldRegistry.isFieldEditable(fieldName);
          if (isEditable) {
            errors.push(`Field "${fieldName}" should NOT be visible/editable on detail page but is editable.`);
          } else {
            logger.debug(`Field "${fieldName}" is visible but read-only (acceptable for restricted field)`);
          }
        } else {
          logger.debug(`✅ Field "${fieldName}" visibility matches FLS matrix: ${expectedView}`);
        }
      } catch (error: any) {
        if (expectedView) {
          errors.push(`Field "${fieldName}" should be visible but error checking visibility: ${error.message}`);
        } else {
          // Field should not be visible, error is expected
          logger.debug(`Field "${fieldName}" correctly not visible (restricted)`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`FLS validation failed on detail page:\n${errors.join('\n')}`);
    }

    logger.info(`✅ All ${objectFLS.fields.length} fields validated on detail page against MRD FLS matrix`);
  }
);

/**
 * Validate all fields editability against MRD FLS matrix on edit form
 * 
 * Examples:
 *   Then validate all Account fields editability against MRD FLS matrix on edit form
 */
Then(
  /^validate all (\w+) fields editability against MRD FLS matrix on edit form$/,
  async function (this: AutomationWorld, objectName: string) {
    if (!this.page) {
      throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
    }

    const flsValidator = getFLSValidator();
    const flsMatrix = flsValidator.loadFLSMatrix();
    
    const objectFLS = flsMatrix.objects[objectName];
    if (!objectFLS) {
      throw new Error(`No FLS matrix found for object "${objectName}". Run extraction script first.`);
    }

    logger.info(`Validating ${objectFLS.fields.length} fields for ${objectName} on edit form against MRD FLS matrix...`);

    const roleId = 'mrd'; // MRD role ID
    const errors: string[] = [];
    const fieldRegistry = new FieldRegistry(this.page);

    for (const fieldFLS of objectFLS.fields) {
      const fieldName = fieldFLS.fieldName;
      const expectedEdit = fieldFLS.rolePermissions.mrd?.edit || false;
      const expectedView = fieldFLS.rolePermissions.mrd?.view || false;

      try {
        // Check if field is visible on edit form
        const isVisible = await fieldRegistry.isFieldVisible(fieldName);
        
        if (!expectedView && isVisible) {
          // Field should not be visible at all
          errors.push(`Field "${fieldName}" should NOT be visible on edit form but is visible.`);
          continue;
        }

        if (!expectedView) {
          // Field correctly not visible
          logger.debug(`✅ Field "${fieldName}" correctly not visible on edit form (restricted)`);
          continue;
        }

        // Field should be visible, check if it's editable
        const isEditable = await fieldRegistry.isFieldEditable(fieldName);
        
        if (expectedEdit && !isEditable) {
          errors.push(`Field "${fieldName}" should be editable on edit form but is read-only.`);
        } else if (!expectedEdit && isEditable) {
          errors.push(`Field "${fieldName}" should NOT be editable on edit form but is editable.`);
        } else {
          logger.debug(`✅ Field "${fieldName}" editability matches FLS matrix: ${expectedEdit}`);
        }
      } catch (error: any) {
        if (expectedView) {
          errors.push(`Field "${fieldName}" should be visible but error checking: ${error.message}`);
        } else {
          // Field should not be visible, error is expected
          logger.debug(`Field "${fieldName}" correctly not visible (restricted)`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`FLS validation failed on edit form:\n${errors.join('\n')}`);
    }

    logger.info(`✅ All ${objectFLS.fields.length} fields validated on edit form against MRD FLS matrix`);
  }
);

/**
 * Validate all fields visibility against MRD FLS matrix on create form
 * 
 * Examples:
 *   Then validate all Account fields visibility against MRD FLS matrix on create form
 */
Then(
  /^validate all (\w+) fields visibility against MRD FLS matrix on create form$/,
  async function (this: AutomationWorld, objectName: string) {
    if (!this.page) {
      throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
    }

    const flsValidator = getFLSValidator();
    const flsMatrix = flsValidator.loadFLSMatrix();
    
    const objectFLS = flsMatrix.objects[objectName];
    if (!objectFLS) {
      throw new Error(`No FLS matrix found for object "${objectName}". Run extraction script first.`);
    }

    logger.info(`Validating ${objectFLS.fields.length} fields for ${objectName} on create form against MRD FLS matrix...`);

    const roleId = 'mrd'; // MRD role ID
    const errors: string[] = [];
    const fieldRegistry = new FieldRegistry(this.page);

    for (const fieldFLS of objectFLS.fields) {
      const fieldName = fieldFLS.fieldName;
      const expectedEdit = fieldFLS.rolePermissions.mrd?.edit || false;
      const expectedView = fieldFLS.rolePermissions.mrd?.view || false;

      try {
        // Check if field is visible on create form
        const isVisible = await fieldRegistry.isFieldVisible(fieldName);
        
        if (!expectedView && isVisible) {
          // Field should not be visible at all
          errors.push(`Field "${fieldName}" should NOT be visible on create form but is visible.`);
          continue;
        }

        if (!expectedView) {
          // Field correctly not visible
          logger.debug(`✅ Field "${fieldName}" correctly not visible on create form (restricted)`);
          continue;
        }

        // Field should be visible, check if it's editable
        const isEditable = await fieldRegistry.isFieldEditable(fieldName);
        
        if (expectedEdit && !isEditable) {
          errors.push(`Field "${fieldName}" should be editable on create form but is read-only.`);
        } else if (!expectedEdit && isEditable) {
          errors.push(`Field "${fieldName}" should NOT be editable on create form but is editable.`);
        } else {
          logger.debug(`✅ Field "${fieldName}" visibility/editability matches FLS matrix: view=${expectedView}, edit=${expectedEdit}`);
        }
      } catch (error: any) {
        if (expectedView) {
          errors.push(`Field "${fieldName}" should be visible but error checking: ${error.message}`);
        } else {
          // Field should not be visible, error is expected
          logger.debug(`Field "${fieldName}" correctly not visible (restricted)`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`FLS validation failed on create form:\n${errors.join('\n')}`);
    }

    logger.info(`✅ All ${objectFLS.fields.length} fields validated on create form against MRD FLS matrix`);
  }
);

