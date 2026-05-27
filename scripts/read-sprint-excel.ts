/**
 * One-off: Read "Jira Sprint 101.xlsx" and print content for RBT test case generation.
 */
import * as path from 'path';
import ExcelJS from 'exceljs';

async function main() {
  const excelPath = path.join(process.cwd(), 'data', 'excel', 'Jira Sprint 101.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  console.log('Sheets:', workbook.worksheets.map((s) => s.name).join(', '));

  for (const sheet of workbook.worksheets) {
    console.log('\n=== Sheet:', sheet.name, '===');
    const rows: unknown[][] = [];
    sheet.eachRow((row) => {
      const cells: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => cells.push(cell.value));
      rows.push(cells);
    });
    // Output: row index, issue key, summary, description length
    rows.forEach((cells, i) => {
      const key = cells[1];
      const summary = typeof cells[2] === 'string' ? cells[2].slice(0, 80) : cells[2];
      const descLen = typeof cells[3] === 'string' ? cells[3].length : 0;
      console.log(`${i + 1}\t${key}\t${summary}\t${descLen}`);
    });
    console.log('Total rows:', rows.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
