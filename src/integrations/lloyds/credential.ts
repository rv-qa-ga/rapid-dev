/**
 * Credential factory for Lloyd's discovery (Dataverse + Blob).
 *
 * The sanity planner needs to call two different Azure-managed APIs:
 *   - Dataverse Web API on `https://accelinsqatest.crm11.dynamics.com`
 *   - Azure Blob Storage on `https://saaccdevukslyd.blob.core.windows.net`
 *
 * Both accept tokens from Microsoft Entra ID. When the QA SPN does not yet have
 * Application User + Storage Blob Data Reader (pending ServiceNow ticket), we fall
 * back to the interactive user identity via `DefaultAzureCredential` — this picks up
 * `az login`, Visual Studio, or VS Code sign-in automatically.
 *
 * We keep the credential selection in one place so that when the SPN is later granted
 * both roles, a single env-var flip (`LLOYDS_USE_SPN=true`) switches all discovery to
 * the governed SPN without touching any call sites.
 */

import {
  ClientSecretCredential,
  DefaultAzureCredential,
  type TokenCredential,
} from '@azure/identity';

import { logger } from '../../utils/logger';

/** Scope for a Dataverse environment token. `https://<host>/.default`. */
export function dataverseScope(host: string): string {
  const cleaned = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${cleaned}/.default`;
}

/**
 * Entra scope for Dynamics 365 Finance OData when you only know the OData base URL
 * (`https://<host>/data`). Uses `https://<host>/.default` (same host, no `/data`).
 */
export function fnoOdataScopeFromBaseUrl(odataBaseUrl: string): string {
  const trimmed = odataBaseUrl.trim();
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const u = new URL(withProto);
  return `${u.origin}/.default`;
}

/** Scope for Azure Storage (account-agnostic). */
export const STORAGE_SCOPE = 'https://storage.azure.com/.default';

/**
 * Build a credential using the preferred chain:
 *
 *   1. If `LLOYDS_USE_SPN=true` or any `LLOYDS_SERVICE_BUS_*` pair is set, use the SPN
 *      (same SPN identity the sender already uses for Service Bus).
 *   2. Else if `D365_USE_SPN=true`, use the D365 SPN (current D365_* env vars).
 *   3. Otherwise, `DefaultAzureCredential` — works with `az login`, VS Code sign-in,
 *      managed identity, etc. This is the intended path for local dev today.
 *
 * Callers should not need to know which path was taken; the returned object implements
 * `TokenCredential` and works with both `@azure/storage-blob` and our Dataverse REST
 * helper in `dataverseMasterDataClient.ts`.
 */
export function getDiscoveryCredential(env: NodeJS.ProcessEnv = process.env): { credential: TokenCredential; source: string } {
  const forceSpn = env.LLOYDS_USE_SPN === 'true' || env.D365_USE_SPN === 'true';
  const lloydsTid = env.LLOYDS_SERVICE_BUS_TENANT_ID?.trim();
  const lloydsCid = env.LLOYDS_SERVICE_BUS_CLIENT_ID?.trim();
  const lloydsSec = env.LLOYDS_SERVICE_BUS_CLIENT_SECRET?.trim();
  const d365Tid = env.D365_TENANT_ID?.trim();
  const d365Cid = env.D365_CLIENT_ID?.trim();
  const d365Sec = env.D365_CLIENT_SECRET?.trim();

  if (forceSpn && lloydsTid && lloydsCid && lloydsSec) {
    logger.info(`[credential] Using LLOYDS_SERVICE_BUS_* SPN for discovery (client id ${truncate(lloydsCid)})`);
    return {
      credential: new ClientSecretCredential(lloydsTid, lloydsCid, lloydsSec),
      source: 'LLOYDS_SERVICE_BUS_* SPN (forced)',
    };
  }
  if (forceSpn && d365Tid && d365Cid && d365Sec) {
    logger.info(`[credential] Using D365_* SPN for discovery (client id ${truncate(d365Cid)})`);
    return {
      credential: new ClientSecretCredential(d365Tid, d365Cid, d365Sec),
      source: 'D365_* SPN (forced)',
    };
  }

  logger.info('[credential] Using DefaultAzureCredential for discovery (az login / VS Code / managed identity).');
  return {
    credential: new DefaultAzureCredential(),
    source: 'DefaultAzureCredential (az login / VS Code / managed identity)',
  };
}

function truncate(s: string, n = 10): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
