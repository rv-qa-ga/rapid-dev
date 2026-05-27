/**
 * Role Data Manager
 * 
 * Manages test data tracking and cleanup at the scenario level.
 * Supports both fresh data (cleaned up after scenario) and persistent data.
 * 
 * Usage:
 *   const manager = getRoleDataManager();
 *   manager.trackScenarioData('scenario-1', '001xxx', 'Account', 'mrd');
 *   await manager.cleanupScenarioData('scenario-1');
 */

import { logger } from '../../utils/logger';
import { getRoleBasedDataFactory } from '../RoleBasedDataFactory';
import { APIRequestContext } from '@playwright/test';

// ============================================================================
// TYPES
// ============================================================================

export interface ScenarioRecord {
  recordId: string;
  objectType: string;
  role: string;
  createdAt: string;
  persistent?: boolean;
}

export interface ScenarioDataTracker {
  scenarioId: string;
  records: ScenarioRecord[];
  createdAt: string;
  lastUpdated: string;
}

// ============================================================================
// ROLE DATA MANAGER
// ============================================================================

export class RoleDataManager {
  private scenarioData: Map<string, ScenarioDataTracker> = new Map();
  private persistentScenarios: Set<string> = new Set();

  /**
   * Track test data by scenario
   * @param scenarioId - Unique scenario identifier (e.g., feature file name + scenario number)
   * @param recordId - Salesforce record ID
   * @param objectType - Object type (e.g., 'Account', 'Lead', 'Contact')
   * @param role - Role ID that created the record
   * @param persistent - Whether this record should persist (skip cleanup)
   */
  trackScenarioData(
    scenarioId: string,
    recordId: string,
    objectType: string,
    role: string,
    persistent: boolean = false
  ): void {
    if (!this.scenarioData.has(scenarioId)) {
      const now = new Date().toISOString();
      this.scenarioData.set(scenarioId, {
        scenarioId,
        records: [],
        createdAt: now,
        lastUpdated: now,
      });
    }

    const tracker = this.scenarioData.get(scenarioId)!;
    tracker.records.push({
      recordId,
      objectType,
      role,
      createdAt: new Date().toISOString(),
      persistent,
    });
    tracker.lastUpdated = new Date().toISOString();

    if (persistent) {
      this.persistentScenarios.add(scenarioId);
    }

    logger.debug(`Tracked ${objectType} ${recordId} for scenario ${scenarioId} (role: ${role}, persistent: ${persistent})`);
  }

  /**
   * Get all data for a scenario
   * @param scenarioId - Scenario identifier
   * @returns ScenarioDataTracker or null if not found
   */
  getScenarioData(scenarioId: string): ScenarioDataTracker | null {
    return this.scenarioData.get(scenarioId) || null;
  }

  /**
   * Get all tracked scenarios
   * @returns Array of scenario IDs
   */
  getAllScenarios(): string[] {
    return Array.from(this.scenarioData.keys());
  }

  /**
   * Get all records for a scenario
   * @param scenarioId - Scenario identifier
   * @returns Array of records
   */
  getScenarioRecords(scenarioId: string): ScenarioRecord[] {
    const tracker = this.scenarioData.get(scenarioId);
    return tracker?.records || [];
  }

  /**
   * Mark a specific record as persistent
   * @param scenarioId - Scenario identifier
   * @param recordId - Record ID to mark as persistent
   */
  markRecordAsPersistent(scenarioId: string, recordId: string): void {
    const tracker = this.scenarioData.get(scenarioId);
    if (!tracker) {
      logger.warn(`Scenario ${scenarioId} not found, cannot mark record as persistent`);
      return;
    }

    const record = tracker.records.find(r => r.recordId === recordId);
    if (record) {
      record.persistent = true;
      this.persistentScenarios.add(scenarioId);
      logger.info(`Marked record ${recordId} as persistent for scenario ${scenarioId}`);
    } else {
      logger.warn(`Record ${recordId} not found in scenario ${scenarioId}`);
    }
  }

  /**
   * Mark entire scenario as persistent (skip cleanup)
   * @param scenarioId - Scenario identifier
   */
  markScenarioAsPersistent(scenarioId: string): void {
    this.persistentScenarios.add(scenarioId);
    
    // Mark all records in scenario as persistent
    const tracker = this.scenarioData.get(scenarioId);
    if (tracker) {
      for (const record of tracker.records) {
        record.persistent = true;
      }
      logger.info(`Marked scenario ${scenarioId} as persistent (${tracker.records.length} records)`);
    } else {
      logger.warn(`Scenario ${scenarioId} not found, cannot mark as persistent`);
    }
  }

  /**
   * Check if scenario is marked as persistent
   * @param scenarioId - Scenario identifier
   * @returns true if scenario is persistent
   */
  isScenarioPersistent(scenarioId: string): boolean {
    return this.persistentScenarios.has(scenarioId);
  }

  /**
   * Cleanup all data for a scenario
   * @param scenarioId - Scenario identifier
   * @param apiContext - Optional API context for role-based cleanup
   * @param force - Force cleanup even if marked as persistent
   */
  async cleanupScenarioData(
    scenarioId: string,
    apiContext?: APIRequestContext,
    force: boolean = false
  ): Promise<void> {
    const tracker = this.scenarioData.get(scenarioId);
    if (!tracker) {
      logger.debug(`No data tracked for scenario ${scenarioId}`);
      return;
    }

    // Skip cleanup if persistent (unless forced)
    if (!force && this.persistentScenarios.has(scenarioId)) {
      logger.info(`Skipping cleanup for persistent scenario ${scenarioId}`);
      return;
    }

    logger.info(`🧹 Cleaning up ${tracker.records.length} records for scenario ${scenarioId}`);

    const roleFactory = getRoleBasedDataFactory();
    let successCount = 0;
    let failCount = 0;

    for (const record of tracker.records) {
      // Skip persistent records (unless forced)
      if (!force && record.persistent) {
        logger.debug(`Skipping persistent record ${record.objectType} ${record.recordId}`);
        continue;
      }

      try {

        // Use role-based factory for deletion
        const roleClient = await roleFactory.getRoleClient(record.role, apiContext);
        if (roleClient) {
          await roleClient.deleteRecord(record.objectType, record.recordId);
          successCount++;
          logger.debug(`Deleted ${record.objectType} ${record.recordId}`);
        } else {
          // Fallback: Use TestDataFactory
          const { TestDataFactory } = await import('../TestDataFactory');
          const testFactory = new TestDataFactory();
          await testFactory.initialize();
          await testFactory.deleteRecord(record.objectType, record.recordId);
          successCount++;
          logger.debug(`Deleted ${record.objectType} ${record.recordId} via TestDataFactory`);
        }
      } catch (error: any) {
        failCount++;
        logger.warn(`Failed to delete ${record.objectType} ${record.recordId}: ${error.message}`);
      }
    }

    // Remove from tracking after cleanup
    if (force || !this.persistentScenarios.has(scenarioId)) {
      this.scenarioData.delete(scenarioId);
      this.persistentScenarios.delete(scenarioId);
    }

    logger.info(
      `✅ Cleanup complete for scenario ${scenarioId}: ${successCount} deleted, ${failCount} failed`
    );
  }

  /**
   * Cleanup all tracked scenarios (except persistent ones)
   * @param apiContext - Optional API context for role-based cleanup
   * @param force - Force cleanup even if marked as persistent
   */
  async cleanupAllScenarios(
    apiContext?: APIRequestContext,
    force: boolean = false
  ): Promise<void> {
    const scenarios = Array.from(this.scenarioData.keys());
    logger.info(`🧹 Cleaning up ${scenarios.length} scenarios`);

    for (const scenarioId of scenarios) {
      await this.cleanupScenarioData(scenarioId, apiContext, force);
    }

    logger.info(`✅ Cleanup complete for all scenarios`);
  }

  /**
   * Get statistics for tracked data
   * @returns Statistics object
   */
  getStatistics(): {
    totalScenarios: number;
    totalRecords: number;
    persistentScenarios: number;
    persistentRecords: number;
    scenariosByRole: Record<string, number>;
  } {
    let totalRecords = 0;
    let persistentRecords = 0;
    const scenariosByRole: Record<string, number> = {};

    for (const tracker of this.scenarioData.values()) {
      totalRecords += tracker.records.length;
      
      for (const record of tracker.records) {
        if (record.persistent) {
          persistentRecords++;
        }
        scenariosByRole[record.role] = (scenariosByRole[record.role] || 0) + 1;
      }
    }

    return {
      totalScenarios: this.scenarioData.size,
      totalRecords,
      persistentScenarios: this.persistentScenarios.size,
      persistentRecords,
      scenariosByRole,
    };
  }

  /**
   * Clear all tracking data (useful for testing)
   */
  clear(): void {
    this.scenarioData.clear();
    this.persistentScenarios.clear();
    logger.info('Cleared all scenario tracking data');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let roleDataManagerInstance: RoleDataManager | null = null;

/**
 * Get the role data manager instance
 */
export function getRoleDataManager(): RoleDataManager {
  if (!roleDataManagerInstance) {
    roleDataManagerInstance = new RoleDataManager();
  }
  return roleDataManagerInstance;
}

/**
 * Reset the role data manager instance (useful for testing)
 */
export function resetRoleDataManager(): void {
  roleDataManagerInstance = null;
}

