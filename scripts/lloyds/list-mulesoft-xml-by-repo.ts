#!/usr/bin/env ts-node
/**
 * List `mulesoft-xml` blobs grouped by repository id (parsed from the file name).
 * Repos with more than one `*.xml` blob appear as "multiple blobs for same repo" — typical
 * after bordereaux resubmits (new `YYYYMMDDHHMM` suffix) or Mule duplicate writes.
 *
 *   npm run lloyds:blob:list-by-repo
 *   npm run lloyds:blob:list-by-repo -- --json-out reports/lloyds-blob-by-repo.json
 *
 * Env: same as planner (`src/config/env/.env.qa` + DefaultAzureCredential / SPN).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { LloydsBlobClient } from '../../src/integrations/lloyds/blobContainerClient';
import { parseFileName } from '../../src/integrations/lloyds/xmlFileName';

for (const p of [
  path.resolve(__dirname, '../../src/config/env/.env.qa'),
  path.resolve(__dirname, '../../.env.qa'),
]) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
    break;
  }
}

function parseArgs(argv: string[]): { jsonOut?: string } {
  const out: { jsonOut?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json-out' && argv[i + 1]) out.jsonOut = argv[++i];
    else if (argv[i]?.startsWith('--json-out=')) out.jsonOut = argv[i].slice('--json-out='.length);
  }
  return out;
}

async function main(): Promise<void> {
  const { jsonOut } = parseArgs(process.argv.slice(2));
  const client = LloydsBlobClient.create();
  const blobs = await client.listXmlBlobs();
  const byRepo = new Map<string, { names: string[]; stamps: string[] }>();

  for (const b of blobs) {
    const parsed = parseFileName(b.name);
    const repo = parsed?.repoId ?? `UNPARSEABLE:${b.name}`;
    if (!byRepo.has(repo)) byRepo.set(repo, { names: [], stamps: [] });
    const g = byRepo.get(repo)!;
    g.names.push(b.name);
    if (parsed?.stamp) g.stamps.push(parsed.stamp);
  }

  const multi = [...byRepo.entries()]
    .filter(([, v]) => v.names.length > 1)
    .sort((a, b) => b[1].names.length - a[1].names.length);

  console.log(`Container: ${client.getConfig().serviceUrl}/${client.getConfig().containerName}`);
  console.log(`Credential: ${client.getCredentialSource()}`);
  console.log(`Total *.xml blobs: ${blobs.length}`);
  console.log(`Distinct repo ids (from file name): ${byRepo.size}`);
  console.log(`Repos with 2+ blob files: ${multi.length}\n`);

  for (const [repo, { names }] of multi.slice(0, 80)) {
    console.log(`${repo}  (${names.length} files)`);
    for (const n of [...names].sort()) console.log(`    ${n}`);
    console.log('');
  }
  if (multi.length > 80) console.log(`… ${multi.length - 80} more repos with multiple blobs (truncated)\n`);

  if (jsonOut) {
    const abs = path.resolve(jsonOut);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(
      abs,
      JSON.stringify(
        {
          ranAt: new Date().toISOString(),
          container: `${client.getConfig().serviceUrl}/${client.getConfig().containerName}`,
          totalXmlBlobs: blobs.length,
          distinctRepoIds: byRepo.size,
          reposWithMultipleBlobs: multi.map(([repo, { names }]) => ({
            repoId: repo,
            count: names.length,
            blobNames: [...names].sort(),
          })),
        },
        null,
        2,
      ),
      'utf8',
    );
    console.log(`JSON written: ${path.relative(process.cwd(), abs)}`);
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
