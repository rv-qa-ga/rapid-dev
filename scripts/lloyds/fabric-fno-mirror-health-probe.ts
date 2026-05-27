#!/usr/bin/env ts-node
/**
 * Read-only Fabric warehouse probe: F&O-mirrored **generaljournalentry** + **`ods` staging** counts
 * (same shapes as BA SQL in `docs/lloyds/ADP.sql` §Fabric F&O mirror).
 *
 * Requires `LLOYDS_FNOFABRIC_SQLSERVER_HOST`, `LLOYDS_FNOFABRIC_SQLSERVER_DATABASE`, and Entra auth
 * (SPN and/or `LLOYDS_FNOFABRIC_SQL_PREFER_SSO` — see `lloydsFnOFabricSqlClient.ts`).
 *
 * Usage:
 *   npm run lloyds:fabric-fno-mirror-health
 *   npm run lloyds:fabric-fno-mirror-health -- --json-out reports/lloyds-fabric-fno-mirror-health.json
 */

import * as fs from 'fs';
import * as path from 'path';

import '../../src/config/config';

import { LloydsFnOFabricSqlClient } from '../../src/integrations/lloyds/lloydsFnOFabricSqlClient';
import { isLloydsFnOFabricSqlConfigured } from '../../src/integrations/lloyds/lloydsFnOFabricSqlEnv';
import { buildLloydsFabricFnoMirrorHealthQueries } from '../../src/integrations/lloyds/lloydsFabricFnoMirrorHealthQueries';
import { logger } from '../../src/utils/logger';

type Row = { cnt: number | string };

function parseJsonOut(argv: string[]): string | undefined {
  const i = argv.indexOf('--json-out');
  if (i >= 0 && argv[i + 1]) return argv[i + 1]!.trim();
  return undefined;
}

/** Node tedious + Fabric warehouse TDS often drops the socket after a valid Entra token; SSMS still works. */
function logFabricTdsHandshakeHint(message: string, host: string | undefined): void {
  if (!host?.toLowerCase().includes('datawarehouse.fabric.microsoft.com')) return;
  const m = message.toLowerCase();
  if (
    !m.includes('socket hang') &&
    !m.includes('econnreset') &&
    !m.includes('forcibly closed') &&
    !m.includes('connection lost')
  ) {
    return;
  }
  // Short lines avoid terminal wrap looking like duplicate log rows.
  logger.warn(
    'Fabric warehouse (tedious): "socket hang up" after a good Entra token is a known driver limitation — not SSO.',
  );
  logger.warn(
    'Use SSMS or Azure Data Studio. https://github.com/tediousjs/tedious/issues/1563 | docs/lloyds/ADP.sql (Fabric mirror)',
  );
}

async function main(): Promise<void> {
  const jsonOut = parseJsonOut(process.argv);
  if (!isLloydsFnOFabricSqlConfigured()) {
    logger.warn(
      'Lloyd\'s FNO Fabric SQL not configured (set LLOYDS_FNOFABRIC_SQLSERVER_HOST + LLOYDS_FNOFABRIC_SQLSERVER_DATABASE). Exiting 0.',
    );
    process.exit(0);
  }

  const client = new LloydsFnOFabricSqlClient();
  const queries = buildLloydsFabricFnoMirrorHealthQueries();
  const results: { id: string; description: string; cnt: number | null; error?: string }[] = [];
  const fabricHost = process.env.LLOYDS_FNOFABRIC_SQLSERVER_HOST?.trim();

  try {
    try {
      await client.connect();
    } catch (connectErr) {
      const msg = connectErr instanceof Error ? connectErr.message : String(connectErr);
      logFabricTdsHandshakeHint(msg, fabricHost);
      throw connectErr;
    }
    for (const q of queries) {
      try {
        const rows = await client.queryMany<Row>(q.sql);
        const raw = rows[0]?.cnt;
        const cnt = raw === undefined || raw === null ? null : Number(raw);
        results.push({ id: q.id, description: q.description, cnt: Number.isFinite(cnt) ? cnt! : null });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        results.push({
          id: q.id,
          description: q.description,
          cnt: null,
          error: message,
        });
        logger.warn(`Fabric health query ${q.id} failed: ${message}`);
      }
    }
  } finally {
    await client.close();
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    queries: results,
  };
  console.log(JSON.stringify(payload, null, 2));

  if (jsonOut) {
    const abs = path.isAbsolute(jsonOut) ? jsonOut : path.join(process.cwd(), jsonOut);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, JSON.stringify(payload, null, 2), 'utf8');
    logger.info(`Wrote ${abs}`);
  }
}

main().catch((e) => {
  logger.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
