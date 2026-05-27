#!/usr/bin/env node
/**
 * Standalone listener for Salesforce Platform Events (e.g. Account_Relationship_Event__e).
 * Run in a separate terminal while automation runs to watch the event queue in real time.
 *
 * Usage:
 *   ENV=qa npm run listen:platform-events
 *   ENV=qa npx ts-node scripts/listen-platform-events.ts
 *   ENV=qa npx ts-node scripts/listen-platform-events.ts --channel "/event/Contact__e"
 *
 * Channel defaults to /event/Account_Relationship_Event__e (TPA Maps).
 * Requires: .env.qa (or .env.uat) with SF_JWT_CLIENT_ID, SF_JWT_USERNAME, SF_CERT_PATH.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load env before any app modules so config picks up ENV
const env = (process.env.ENV || 'qa').toLowerCase();
const envFile = path.join(__dirname, '../src/config/env', `.env.${env}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  console.log(`[listen] Loaded ${env.toUpperCase()} config from src/config/env/.env.${env}`);
} else {
  dotenv.config();
  console.log('[listen] Using default .env');
}

process.env.ENV = env;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Faye = require('faye');
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const CHANNEL_DEFAULT = '/event/Account_Relationship_Event__e';

function getChannel(): string {
  const i = process.argv.indexOf('--channel');
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return CHANNEL_DEFAULT;
}

function formatEvent(data: any): Record<string, any> {
  const ts = new Date().toISOString();
  if (data?.data?.payload) {
    const p = data.data.payload;
    const e = data.data.event || {};
    return {
      time: ts,
      RecordId__c: p.RecordId__c,
      Identifier__c: p.Identifier__c,
      CreatedDate: p.CreatedDate,
      EventUuid: e.EventUuid,
      ReplayId: e.replayId,
      EventApiName: e.EventApiName,
      Is_Active__c: p.Is_Active__c,
    };
  }
  return { time: ts, raw: data };
}

async function main(): Promise<void> {
  const channel = getChannel();
  console.log(`[listen] Channel: ${channel}`);
  console.log('[listen] Authenticating...');

  const auth = await SalesforceJWTAuth.authenticate();
  const accessToken = auth.accessToken;
  const instanceUrl = auth.instanceUrl.replace(/\/$/, '');
  const apiVersion = (config.getSalesforceConfig().apiVersion || '60.0').replace(/^v/, '');
  const streamingUrl = `${instanceUrl}/cometd/${apiVersion}/`;

  console.log(`[listen] Connecting to ${streamingUrl}`);

  const client = new Faye.Client(streamingUrl, { timeout: 60, retry: 0 }) as any;
  if (client._dispatcher) {
    client._dispatcher._transports = ['long-polling'];
  }

  client.addExtension({
    outgoing: (msg: any, cb: (m: any) => void) => {
      if (!msg.ext) msg.ext = {};
      msg.ext.authorization = { bearer: accessToken };
      cb(msg);
    },
  });

  await new Promise<void>((resolve, reject) => {
    client.handshake((r: any) => {
      if (r && r.successful) {
        console.log('[listen] Connected. Listening for events... (Ctrl+C to stop)\n');
        resolve();
      } else {
        reject(new Error('Handshake failed: ' + JSON.stringify(r)));
      }
    });
  });

  client.subscribe(channel, (message: any) => {
    if (message.channel === channel && message.data) {
      const out = formatEvent(message);
      console.log(JSON.stringify(out, null, 2));
      console.log('---');
    }
  });

  process.on('SIGINT', () => {
    console.log('\n[listen] Disconnecting...');
    client.disconnect();
    process.exit(0);
  });
}

main().catch((err: Error) => {
  console.error('[listen] Error:', err.message);
  process.exit(1);
});
