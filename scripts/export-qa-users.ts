/**
 * Export all Users from the QA Salesforce org to a CSV file.
 * Use this to identify users (e.g. business users receiving unwanted emails) before updating their Email.
 *
 * Output: data/excel/qa-users-export.csv
 * Columns: Id, Username, Email, FirstName, LastName, Name, IsActive, Profile.Name, UserRole.Name
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/export-qa-users.ts
 *   npm run export:qa-users
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { testDataFactory } from '../src/test-data/TestDataFactory';

const env = (process.env.ENV || 'qa').toLowerCase();
process.env.ENV = env;
const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  console.log(`[OK] Loaded ${envFile}`);
} else {
  console.warn(`[WARN] No ${envFile}; using process.env`);
}

const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'excel', 'qa-users-export.csv');

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return '';
  const s = String(value).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function getNested(obj: any, key: string): string {
  if (obj == null) return '';
  const parts = key.split('.');
  let current: any = obj;
  for (const p of parts) {
    current = current?.[p];
    if (current == null) return '';
  }
  return current != null ? String(current) : '';
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Export QA Users (Id, Username, Email, Name, IsActive, Profile, Role)');
  console.log('═══════════════════════════════════════════════════════════\n');

  await testDataFactory.initialize();

  const soql = `SELECT Id, Username, Email, FirstName, LastName, Name, IsActive, Profile.Name, UserRole.Name FROM User ORDER BY Name`;
  const result = await testDataFactory.query(soql);
  const allRecords: any[] = [...(result?.records || [])];

  if (result?.nextRecordsUrl) {
    console.warn(`[WARN] There are more than ${allRecords.length} users. Only the first batch is exported.`);
  }

  const headers = ['Id', 'Username', 'Email', 'FirstName', 'LastName', 'Name', 'IsActive', 'Profile.Name', 'UserRole.Name'];
  const rows: string[] = [headers.join(',')];

  for (const rec of allRecords) {
    const row = headers.map((h) => escapeCsv(h.includes('.') ? getNested(rec, h) : rec[h]));
    rows.push(row.join(','));
  }

  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, rows.join('\n'), 'utf8');

  console.log(`[OK] Exported ${allRecords.length} user(s) to ${OUTPUT_FILE}`);
  console.log('\nColumns: Id, Username, Email, FirstName, LastName, Name, IsActive, Profile.Name, UserRole.Name');
  console.log('Open in Excel or a text editor to review. Tell me which users\' emails to update and the new addresses.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
