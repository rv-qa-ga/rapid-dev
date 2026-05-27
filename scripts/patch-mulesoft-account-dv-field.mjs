import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, '..', 'src/step-definitions/integration/mulesoft-integration.steps.ts');
let s = fs.readFileSync(p, 'utf8');
const parts = s.split('`');
for (let i = 1; i < parts.length; i += 2) {
  let seg = parts[i];
  if (seg.includes('FROM Account')) {
    seg = seg.replace(/\bDataverse_ID__c\b/g, '${sfAccountDataverseField()}');
  }
  parts[i] = seg;
}
s = parts.join('`');
fs.writeFileSync(p, s);
console.log('Patched Account SOQL Dataverse field tokens in', p);
