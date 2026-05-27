/**
 * Smoke test: Fabric REST API token + workspace/items.
 * Run: ENV=qa npx ts-node scripts/test-fabric-auth.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const env = process.env.ENV || 'qa';
const envPaths = [
  path.resolve(__dirname, '../src/config/env', `.env.${env}`),
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`✅ Loaded environment from: ${path.relative(process.cwd(), envPath)}`);
    break;
  }
}

async function main() {
  const { FabricAPIClient } = await import('../src/api-clients/fabric/FabricAPIClient');
  const { config } = await import('../src/config/config');

  console.log('\n🔐 Testing Microsoft Fabric REST API...\n');

  const fc = config.getFabricConfig();
  if (!fc.clientId || !fc.clientSecret) {
    console.error('❌ FABRIC_CLIENT_ID and FABRIC_CLIENT_SECRET must be set in .env');
    process.exit(1);
  }
  if (!fc.tenantId) {
    console.error('❌ FABRIC_TENANT_ID (or D365 tenant) must be set');
    process.exit(1);
  }

  console.log(`   Tenant: ${fc.tenantId.substring(0, 8)}...`);
  console.log(`   Client: ${fc.clientId.substring(0, 10)}...\n`);

  const client = new FabricAPIClient();

  if (!fc.workspaceId) {
    console.warn('⚠️  FABRIC_WORKSPACE_ID not set — token only (skipping workspace/items).\n');
    const { FabricAuth } = await import('../src/utils/fabric-auth');
    const t = await FabricAuth.authenticate();
    console.log('✅ Token OK:', t.accessToken.substring(0, 24) + '...');
    return;
  }

  const ws = await client.getWorkspace(fc.workspaceId);
  console.log('✅ Workspace:', JSON.stringify(ws, null, 2).slice(0, 500) + (JSON.stringify(ws).length > 500 ? '...' : ''));

  const items = await client.listWorkspaceItems(fc.workspaceId);
  console.log(`\n✅ Items count: ${items.length}`);
  items.slice(0, 15).forEach((i) => {
    console.log(`   - [${i.type}] ${i.displayName || i.id}`);
  });
  if (items.length > 15) console.log(`   ... and ${items.length - 15} more`);

  console.log('\n🎉 Fabric connectivity check passed.\n');
}

main().catch((e) => {
  console.error('\n❌', e.message || e);
  process.exit(1);
});
