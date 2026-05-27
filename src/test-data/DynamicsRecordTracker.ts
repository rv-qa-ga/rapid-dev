/**
 * Dynamics Record Tracker
 * Tracks Dynamics records created during test execution for automatic cleanup
 */

import { logger } from '../utils/logger';

export interface DynamicsRecord {
  entitySetName: string;
  recordId: string;
  recordName: string;
}

class DynamicsRecordTracker {
  private records: DynamicsRecord[] = [];
  private persistentRecords: Set<string> = new Set();

  /**
   * Register a Dynamics record for cleanup
   */
  registerRecord(entitySetName: string, recordId: string, recordName?: string): void {
    const record: DynamicsRecord = {
      entitySetName,
      recordId,
      recordName: recordName || `${entitySetName}_${recordId}`
    };
    this.records.push(record);
    logger.debug(`Registered Dynamics ${entitySetName} record ${recordId} for cleanup`);
  }

  /**
   * Remove a record from tracking (e.g., when explicitly deleted)
   */
  unregisterRecord(entitySetName: string, recordId: string): void {
    this.records = this.records.filter(
      r => !(r.entitySetName === entitySetName && r.recordId === recordId)
    );
  }

  /**
   * Mark a record as persistent (skip cleanup)
   */
  markAsPersistent(entitySetName: string, recordId: string): void {
    const key = `${entitySetName}:${recordId}`;
    this.persistentRecords.add(key);
  }

  /**
   * Get all records that should be cleaned up
   */
  getRecordsToCleanup(): DynamicsRecord[] {
    return this.records.filter(record => {
      const key = `${record.entitySetName}:${record.recordId}`;
      return !this.persistentRecords.has(key);
    });
  }

  /**
   * Get all tracked records
   */
  getAllRecords(): DynamicsRecord[] {
    return [...this.records];
  }

  /**
   * Clear all tracked records
   */
  clear(): void {
    this.records = [];
    this.persistentRecords.clear();
  }
}

// Singleton instance
export const dynamicsRecordTracker = new DynamicsRecordTracker();

