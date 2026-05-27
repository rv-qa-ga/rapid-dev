#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

const dir = path.join(process.cwd(), 'reports', 'clm', 'migration');

function latestReport(entityKey: string): string | null {
  const re = new RegExp(`^CLM-MIG-${entityKey}-`, 'i');
  const files = fs.readdirSync(dir).filter((f) => re.test(f)).sort().reverse();
  return files.length ? path.join(dir, files[0]) : null;
}

async function summarize(entityKey: string): Promise<void> {
  const reportPath = latestReport(entityKey);
  if (!reportPath) {
    console.log(`\n=== ${entityKey}: no report ===`);
    return;
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(reportPath);
  const fc = wb.getWorksheet('Field Comparison');
  const miss = wb.getWorksheet('Missing in SF');
  const sum = wb.getWorksheet('Summary');

  console.log(`\n=== ${entityKey} (${path.basename(reportPath)}) ===`);
  if (sum) {
    for (let i = 1; i <= 15; i++) {
      const m = sum.getRow(i).getCell(1).value;
      const v = sum.getRow(i).getCell(2).value;
      if (m) console.log(`  ${m}: ${v}`);
    }
  }

  if (miss && miss.rowCount > 1) {
    console.log(`  Missing in SF: ${miss.rowCount - 1} row(s), sample:`);
    for (let r = 2; r <= Math.min(3, miss.rowCount); r++) {
      console.log(`    ${miss.getRow(r).getCell(1).value}`);
    }
  }

  if (!fc) return;

  type FailAgg = { count: number; sampleD: string; sampleSf: string; diff: string };
  const byField = new Map<string, FailAgg>();
  let totalFails = 0;

  fc.eachRow((row, rn) => {
    if (rn === 1) return;
    if (String(row.getCell(6).value).toUpperCase() !== 'N') return;
    totalFails++;
    const dynField = String(row.getCell(2).value ?? '');
    const sfField = String(row.getCell(3).value ?? '');
    const key = `${dynField} -> ${sfField}`;
    const agg = byField.get(key) ?? { count: 0, sampleD: '', sampleSf: '', diff: '' };
    agg.count++;
    if (!agg.sampleD) {
      agg.sampleD = String(row.getCell(4).value ?? '').slice(0, 70);
      agg.sampleSf = String(row.getCell(5).value ?? '').slice(0, 70);
      agg.diff = String(row.getCell(8).value ?? '').slice(0, 120);
    }
    byField.set(key, agg);
  });

  console.log(`  Field mismatches: ${totalFails} row(s) across ${byField.size} field mapping(s)`);
  for (const [key, agg] of [...byField.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`    [${agg.count}x] ${key}`);
    console.log(`      D:  "${agg.sampleD}"`);
    console.log(`      SF: "${agg.sampleSf}"`);
    if (agg.diff) console.log(`      ${agg.diff}`);
  }
}

async function main(): Promise<void> {
  const keys = [
    'party',
    'contact-external',
    'contact-internal',
    'country',
    'osfi',
    'product-map',
    'tpa-map',
    'sub-product',
    'aslob',
    'pog-product',
  ];
  for (const k of keys) await summarize(k);
}

main().catch(console.error);
