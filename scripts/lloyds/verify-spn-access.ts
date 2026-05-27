#!/usr/bin/env ts-node
/**
 * Systematic probe: does the QA SPN have all the access the Lloyd's Stage 1+ automation
 * needs? Checks the four systems in the framework's dependency graph, in this order:
 *
 *   1. AAD — token acquisition for each required scope (cheap, proves identity).
 *   2. Azure Blob Storage — list `saaccdevukslyd` / `mulesoft-xml` (planner input).
 *   3. Dataverse — WhoAmI + `accelins_legalentities $top=1` on the Lloyd's env
 *      (master-data read; the planner's other input).
 *   4. Azure SQL — SELECT DB_NAME() on `sqldb-dev-uks-lyd` (Mule control-plane read).
 *   5. Azure Service Bus — namespace metadata read via ServiceBusAdministrationClient
 *      (proves the SPN has at least one data-plane role); does NOT actually send a
 *      message, because that would leave an audit trail.
 *
 * Each check reports ✅ / ❌, the latency, and on failure the *specific* Azure role that
 * is missing so this output pastes cleanly into the ServiceNow ticket follow-up.
 *
 * Exit code:
 *   0 = all green.
 *   1 = one or more red (print the remediation table).
 *
 * Usage:
 *   npx ts-node scripts/lloyds/verify-spn-access.ts
 *   npx ts-node scripts/lloyds/verify-spn-access.ts --skip-sb        (omit the Service Bus probe)
 *   npx ts-node scripts/lloyds/verify-spn-access.ts --skip-sql       (omit the SQL probe)
 *   npx ts-node scripts/lloyds/verify-spn-access.ts --send-probe     (add a real SB send to
 *                                                                    confirm Sender role
 *                                                                    specifically — puts one
 *                                                                    marker message on
 *                                                                    `mule-xml-generation`)
 *   npx ts-node scripts/lloyds/verify-spn-access.ts \                (probe a specific Dataverse
 *     --dataverse-host=https://accelinsqatest.crm11.dynamics.com      host, or repeat the flag to
 *                                                                    probe multiple orgs in one
 *                                                                    run — useful for SIT/UAT/prod
 *                                                                    verification from the same CI job)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import * as crypto from 'crypto';

import { ClientSecretCredential, type TokenCredential } from '@azure/identity';
import { BlobServiceClient } from '@azure/storage-blob';
import { ServiceBusAdministrationClient, ServiceBusClient } from '@azure/service-bus';
import * as sql from 'mssql';

// ---------------------------------------------------------------------------
// Env loading
// ---------------------------------------------------------------------------

for (const p of [
  path.resolve(__dirname, '../../src/config/env/.env.qa'),
  path.resolve(__dirname, '../../.env.qa'),
  path.resolve(__dirname, '../../.env'),
]) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
    console.log(`Loaded env: ${path.relative(process.cwd(), p)}\n`);
    break;
  }
}

// ---------------------------------------------------------------------------
// Config / defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  blobAccountUrl:   'https://saaccdevukslyd.blob.core.windows.net',
  blobContainer:    'mulesoft-xml',
  dataverseHost:    'https://accelinsqatest.crm11.dynamics.com',
  dataverseApiVer:  'v9.2',
  sqlServer:        'sql-dev-uks-lyd.database.windows.net',
  sqlDatabase:      'sqldb-dev-uks-lyd',
  sbFqns:           'sb-dev-uks-lyd.servicebus.windows.net',
  sbQueue:          'mule-xml-generation',
};

// Tables the Lloyd's Power Platform admin granted the SPN read on; order matters because
// the probe short-circuits on the first failure so the first entry is the most important.
const LLOYDS_PROBE_TABLES: Array<{ set: string; select: string; label: string }> = [
  { set: 'accelins_workflows',        select: 'accelins_workflowid,accelins_name',         label: 'XML File (accelins_workflow)' },
  { set: 'accelins_legalentities',    select: 'accelins_legalentityid,accelins_name',      label: 'Legal Entity (accelins_legalentity)' },
  { set: 'accelins_repositoryfiles',  select: 'accelins_repositoryfileid,accelins_name',   label: 'Repository File (accelins_repositoryfile)' },
];

const SCOPES = {
  arm:        'https://management.azure.com/.default',
  storage:    'https://storage.azure.com/.default',
  dataverse:  (host: string) => `${host.replace(/\/+$/, '')}/.default`,
  sqldb:      'https://database.windows.net/.default',
  servicebus: 'https://servicebus.azure.net/.default',
};

function getCreds() {
  const tenantId     = (process.env.D365_TENANT_ID || process.env.AZURE_TENANT_ID || '').trim();
  const clientId     = (process.env.D365_CLIENT_ID || process.env.AZURE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.D365_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET || '').trim();
  const source       = process.env.D365_CLIENT_ID ? 'D365_* (QA SPN)' : process.env.AZURE_CLIENT_ID ? 'AZURE_*' : '(missing)';
  return { tenantId, clientId, clientSecret, source };
}

// ---------------------------------------------------------------------------
// Probe plumbing
// ---------------------------------------------------------------------------

interface ProbeResult {
  system: string;
  status: 'pass' | 'fail' | 'skip';
  latencyMs: number;
  details: string;
  remediation?: string;
}

async function timeProbe(system: string, fn: () => Promise<{ details: string }>): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const { details } = await fn();
    return { system, status: 'pass', latencyMs: Date.now() - t0, details };
  } catch (e) {
    const msg = e instanceof Error ? (e.message || '(no message)') : String(e);
    return {
      system,
      status: 'fail',
      latencyMs: Date.now() - t0,
      details: msg.length > 400 ? msg.slice(0, 400) + '…' : msg,
      remediation: classifyRemediation(system, msg),
    };
  }
}

function classifyRemediation(system: string, msg: string): string {
  const m = msg.toLowerCase();
  if (system === 'Azure Blob') {
    if (m.includes('authorizationpermissionmismatch') || m.includes('403')) {
      return 'Grant SPN "Storage Blob Data Reader" (minimum) on storage account saaccdevukslyd or the mulesoft-xml container. For negative-scenario uploads later: "Storage Blob Data Contributor".';
    }
  }
  if (system === 'Dataverse') {
    if (m.includes('0x80072560') || m.includes('not a member of the organization')) {
      return 'Create an Application User in the accelinsqatest Power Platform environment tied to this SPN + assign a security role with Read on accelins_workflow / accelins_legalentity / accelins_repositoryfile.';
    }
    if (m.includes('401')) {
      return 'Token acquired but rejected. Confirm D365_SCOPE matches the Dataverse host (https://accelinsqatest.crm11.dynamics.com/.default).';
    }
  }
  if (system === 'Azure SQL') {
    if (m.includes('login failed') || m.includes('elogin')) {
      return 'Run in SSMS as the SQL server AAD admin: CREATE USER [<SPN display name>] FROM EXTERNAL PROVIDER; ALTER ROLE db_datareader ADD MEMBER [<SPN display name>];';
    }
  }
  if (system === 'Service Bus') {
    if (m.includes('unauthorized') || m.includes('claim') || m.includes('403')) {
      return 'Grant SPN "Azure Service Bus Data Sender" on namespace sb-dev-uks-lyd (for publishing) and/or "Data Receiver" (for DLQ introspection).';
    }
  }
  return '(see error message above; role assignment or application user mapping is the usual cause)';
}

// ---------------------------------------------------------------------------
// The four probes
// ---------------------------------------------------------------------------

async function probeAadToken(credential: TokenCredential, scope: string, label: string): Promise<ProbeResult> {
  return timeProbe(`AAD token — ${label}`, async () => {
    const tok = await credential.getToken(scope);
    if (!tok) throw new Error('Credential returned null token.');
    const expiresInSec = Math.round((tok.expiresOnTimestamp - Date.now()) / 1000);
    return { details: `token acquired (${tok.token.length} chars, expires in ${expiresInSec}s)` };
  });
}

async function probeBlob(credential: TokenCredential): Promise<ProbeResult> {
  return timeProbe('Azure Blob', async () => {
    const svc = new BlobServiceClient(DEFAULTS.blobAccountUrl, credential);
    const container = svc.getContainerClient(DEFAULTS.blobContainer);
    let first: string | null = null;
    let count = 0;
    for await (const blob of container.listBlobsFlat({ prefix: '' })) {
      if (!first) first = blob.name;
      count += 1;
      if (count >= 1) break; // one is enough to prove read
    }
    return { details: `listed container "${DEFAULTS.blobContainer}" — first blob: ${first ?? '(empty)'}` };
  });
}

async function probeDataverse(credential: TokenCredential, dataverseHost: string): Promise<ProbeResult> {
  return timeProbe(`Dataverse (${dataverseHost.replace(/^https?:\/\//, '').replace(/\.crm11\.dynamics\.com$/, '')})`, async () => {
    const scope = SCOPES.dataverse(dataverseHost);
    const tok = await credential.getToken(scope);
    if (!tok) throw new Error('No Dataverse token.');
    const headers = {
      Authorization: `Bearer ${tok.token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    };
    // WhoAmI is the cheapest call — but if SPN lacks an Application User in the env,
    // even WhoAmI returns 403 "The user is not a member of the organization." (0x80072560).
    const whoAmIUrl = `${dataverseHost}/api/data/${DEFAULTS.dataverseApiVer}/WhoAmI`;
    const whoAmI = await fetch(whoAmIUrl, { headers });
    if (!whoAmI.ok) {
      const body = await whoAmI.text();
      throw new Error(`WhoAmI returned ${whoAmI.status}: ${body}`);
    }
    const who = (await whoAmI.json()) as { UserId: string; OrganizationId: string };
    // WhoAmI can pass even without table grants — walk each table the Lloyd's admin
    // granted the SPN Read on. First failure short-circuits so the error message tells
    // the admin which specific grant is missing.
    const tableSummaries: string[] = [];
    for (const t of LLOYDS_PROBE_TABLES) {
      const url = `${dataverseHost}/api/data/${DEFAULTS.dataverseApiVer}/${t.set}?$select=${t.select}&$top=1`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`${t.set} (${t.label}) returned ${resp.status}: ${body.slice(0, 200)}`);
      }
      const rows = (await resp.json()) as { value: Array<{ accelins_name?: string }> };
      const name = rows.value?.[0]?.accelins_name;
      tableSummaries.push(`${t.set}=${rows.value?.length ? `✓(${name ?? 'row'})` : '✓(empty)'}`);
    }
    return {
      details: `UserId=${who.UserId.slice(0, 8)}… OrgId=${who.OrganizationId.slice(0, 8)}… ${tableSummaries.join(' ')}`,
    };
  });
}

async function probeSql(credential: TokenCredential): Promise<ProbeResult> {
  return timeProbe('Azure SQL', async () => {
    const tok = await credential.getToken(SCOPES.sqldb);
    if (!tok) throw new Error('No SQL token.');
    const poolConfig: sql.config = {
      server: DEFAULTS.sqlServer,
      database: DEFAULTS.sqlDatabase,
      options: { encrypt: true, trustServerCertificate: false },
      authentication: { type: 'azure-active-directory-access-token', options: { token: tok.token } },
      pool: { max: 1, min: 0, idleTimeoutMillis: 2_000 },
      requestTimeout: 15_000,
    };
    const pool = await sql.connect(poolConfig);
    try {
      const result = await pool.request().query<{
        db: string; who: string; now: Date;
      }>(`SELECT DB_NAME() AS db, SUSER_SNAME() AS who, SYSUTCDATETIME() AS now`);
      // Confirm table read too — login alone isn't enough; need db_datareader.
      const probe = await pool.request().query<{ n: number }>(
        'SELECT COUNT(*) AS n FROM dbo.PROCESS_TRACKER',
      );
      const row = result.recordset[0];
      return { details: `db=${row.db} user=${row.who} PROCESS_TRACKER row count=${probe.recordset[0].n}` };
    } finally {
      await pool.close();
    }
  });
}

async function probeServiceBusMetadata(credential: TokenCredential): Promise<ProbeResult> {
  return timeProbe('Service Bus (metadata)', async () => {
    // Acquire the SB-scope token first — proves AAD side.
    const tok = await credential.getToken(SCOPES.servicebus);
    if (!tok) throw new Error('No Service Bus token.');
    // Admin client uses HTTPS to the management endpoint; reads queue metadata.
    // Requires `Microsoft.ServiceBus/namespaces/queues/read` which is granted by any
    // data role (Sender / Receiver / Owner). NOT a send — zero side-effects.
    const admin = new ServiceBusAdministrationClient(DEFAULTS.sbFqns, credential);
    const props = await admin.getQueue(DEFAULTS.sbQueue);
    return {
      details: `namespace=${DEFAULTS.sbFqns} queue=${DEFAULTS.sbQueue} maxDeliveryCount=${String(props.maxDeliveryCount)} status=${props.status}`,
    };
  });
}

/**
 * Real AMQP send probe — confirms the SPN specifically has `Azure Service Bus Data Sender`
 * (the metadata probe above only confirms *some* SB role is assigned).
 *
 * Side effect: puts ONE marker message on `mule-xml-generation` with:
 *   - message type `mule-xml-generation-failed` (valid shape; func-xml-totals treats it
 *     as a logging-only path, not a create-XML-record path — minimises downstream noise).
 *   - correlation_id `SPN-PROBE-<epoch-ms>-<8-hex>` — visually obviously a probe, not a
 *     real sanity correlation id (those use the `0000-0000-0000-NNNNN` format).
 *   - error_source `AUTOMATION (verify-spn-access.ts)` so anyone peeking DLQ later can
 *     trace it back.
 *
 * If the SPN has Sender: send returns successfully within ~1s.
 * If not: AMQP retries 3x and we surface the aggregated `UnauthorizedAccess` error.
 */
async function probeServiceBusSend(credential: TokenCredential): Promise<ProbeResult> {
  return timeProbe('Service Bus (Sender-specific)', async () => {
    const probeId = `SPN-PROBE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const payload = {
      message: 'mule-xml-generation-failed',
      correlation_id: probeId,
      file_name: 'SPN-PROBE-AUTOMATED-ACCESS-CHECK.xml',
      error: {
        process_name: 'verify-spn-access-script',
        failed_stage: 'XML_GENERATING',
        error_message: 'Automated SPN send-probe from scripts/lloyds/verify-spn-access.ts — safe to ignore / DLQ.',
        error_source: 'AUTOMATION (verify-spn-access.ts)',
        error_timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      },
    };
    const client = new ServiceBusClient(DEFAULTS.sbFqns, credential, {
      retryOptions: { maxRetries: 1, timeoutInMs: 30_000 },
    });
    const sender = client.createSender(DEFAULTS.sbQueue);
    try {
      await sender.sendMessages(
        { body: Buffer.from(JSON.stringify(payload, null, 2), 'utf-8'), contentType: 'application/json' },
        { abortSignal: AbortSignal.timeout(30_000) },
      );
    } finally {
      await sender.close();
      await client.close();
    }
    return {
      details: `sent 1 probe message (correlation_id=${probeId}); func-xml-totals will log/ignore it.`,
    };
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const creds = getCreds();
  const argv = process.argv.slice(2);
  const args = new Set(argv);

  // Dataverse host overrides (repeatable). When --dataverse-host is absent, probe just the
  // Lloyd's env (DEFAULTS.dataverseHost) so existing callers keep the same behaviour.
  // Example: --dataverse-host=https://accelinsqatest.crm11.dynamics.com
  //          --dataverse-host=https://accelinsuat.crm11.dynamics.com   (repeat to hit more orgs)
  const hostOverrides = argv
    .filter((a) => a.startsWith('--dataverse-host='))
    .map((a) => a.slice('--dataverse-host='.length).replace(/\/+$/, ''));
  const dataverseHosts = hostOverrides.length ? hostOverrides : [DEFAULTS.dataverseHost];

  console.log('Lloyd\'s Automation — SPN access probe');
  console.log(`  SPN:             ${creds.clientId ? `${creds.clientId.slice(0, 10)}…` : '(missing)'} (${creds.source})`);
  console.log(`  Tenant:          ${creds.tenantId ? `${creds.tenantId.slice(0, 8)}…` : '(missing)'}`);
  console.log(`  Dataverse host(s): ${dataverseHosts.join(', ')}`);
  console.log('');

  if (!creds.tenantId || !creds.clientId || !creds.clientSecret) {
    console.error('Missing SPN credentials in env. Set D365_TENANT_ID / D365_CLIENT_ID / D365_CLIENT_SECRET.');
    process.exit(1);
  }

  const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
  const results: ProbeResult[] = [];

  // 1. AAD — cheap scope-by-scope token probes upfront (isolates "can the SPN even get a token" from "does the resource accept it").
  results.push(await probeAadToken(credential, SCOPES.storage,                         'Storage'));
  for (const host of dataverseHosts) {
    const label = `Dataverse (${host.replace(/^https?:\/\//, '').replace(/\.crm11\.dynamics\.com$/, '')})`;
    results.push(await probeAadToken(credential, SCOPES.dataverse(host), label));
  }
  results.push(await probeAadToken(credential, SCOPES.sqldb,                           'SQL DB'));
  results.push(await probeAadToken(credential, SCOPES.servicebus,                      'Service Bus'));

  // 2-5. Resource-level probes.
  results.push(await probeBlob(credential));
  for (const host of dataverseHosts) {
    results.push(await probeDataverse(credential, host));
  }
  results.push(args.has('--skip-sql') ? { system: 'Azure SQL', status: 'skip', latencyMs: 0, details: '--skip-sql' } : await probeSql(credential));
  // Service Bus is split into two probes:
  //   (a) metadata — any SB data role. Always runs unless --skip-sb.
  //   (b) send-probe — specifically confirms `Data Sender`. Opt-in via --send-probe
  //       because it puts a real (but clearly-marked) message on the queue.
  if (args.has('--skip-sb')) {
    results.push({ system: 'Service Bus (metadata)', status: 'skip', latencyMs: 0, details: '--skip-sb' });
    if (args.has('--send-probe')) {
      results.push({ system: 'Service Bus (Sender-specific)', status: 'skip', latencyMs: 0, details: '--skip-sb overrides --send-probe' });
    }
  } else {
    results.push(await probeServiceBusMetadata(credential));
    if (args.has('--send-probe')) {
      results.push(await probeServiceBusSend(credential));
    }
  }

  // Render summary
  console.log('\nResults:');
  const statusIcon = (s: ProbeResult['status']) => (s === 'pass' ? '✅' : s === 'skip' ? '➖' : '❌');
  const padded = (str: string, width: number) => (str + ' '.repeat(width)).slice(0, width);
  console.log('  ' + padded('System', 36) + ' ' + padded('Status', 8) + padded('Latency', 10) + 'Details');
  console.log('  ' + '-'.repeat(36) + ' ' + '-'.repeat(8) + '-'.repeat(10) + '-'.repeat(80));
  for (const r of results) {
    console.log('  ' + padded(r.system, 36) + ' ' + padded(`${statusIcon(r.status)} ${r.status}`, 8)
      + padded(r.latencyMs ? `${r.latencyMs}ms` : '-', 10)
      + (r.details.length > 90 ? r.details.slice(0, 90) + '…' : r.details));
  }

  const failed = results.filter((r) => r.status === 'fail');
  if (failed.length === 0) {
    console.log('\nAll green — SPN has every permission the Stage-1+ automation needs. 🎯');
    return;
  }
  console.log('\nRemediation needed:');
  for (const r of failed) {
    console.log(`\n  ❌ ${r.system}`);
    console.log(`     Error:       ${r.details}`);
    console.log(`     Remediation: ${r.remediation ?? '(see error)'}`);
  }
  console.log('\nTicket reference: docs/servicenow-ticket-lloyds-spn-permissions.md');
  process.exit(1);
}

main().catch((e) => {
  if (e instanceof Error) {
    console.error('\nFATAL:', e.message);
    if (e.stack) console.error(e.stack);
  } else {
    console.error('\nFATAL (non-Error):', e);
  }
  process.exit(1);
});
