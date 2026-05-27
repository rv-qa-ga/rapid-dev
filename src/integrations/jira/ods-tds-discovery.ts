/**
 * Discovery helpers for ODS (multiple databases) and TDS (single database).
 * Phase 1: read from config or env. Later can be replaced with SQL Server metadata queries.
 *
 * @see docs/planning/SQL-Server-ODS-TDS-Feature-Generation-Plan.md
 */

import { config } from '../../config/config';

const DEFAULT_ODS_DATABASES: string[] = [];
const DEFAULT_TDS_DATABASE = 'TDS';

/**
 * Returns list of ODS database names.
 * Sources: config.engineering.odsDatabases, then ODS_DATABASES env (comma-separated).
 */
export function discoverMultipleDatabasesUnderODS(): string[] {
  try {
    const env = process.env.ODS_DATABASES;
    if (env && env.trim()) {
      return env.split(',').map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    // ignore
  }
  try {
    const cfg = (config as any).getConfig?.();
    const list = cfg?.engineering?.odsDatabases;
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  } catch {
    // config may not have engineering section yet
  }
  return DEFAULT_ODS_DATABASES;
}

/**
 * Returns the single TDS database name.
 * Sources: config.engineering.tdsDatabase, then TDS_DATABASE env.
 */
export function discoverSingleTDSDatabase(): string {
  try {
    const env = process.env.TDS_DATABASE;
    if (env && env.trim()) return env.trim();
  } catch {
    // ignore
  }
  try {
    const cfg = (config as any).getConfig?.();
    const name = cfg?.engineering?.tdsDatabase;
    if (typeof name === 'string' && name.trim()) return name.trim();
  } catch {
    // config may not have engineering section yet
  }
  return DEFAULT_TDS_DATABASE;
}
