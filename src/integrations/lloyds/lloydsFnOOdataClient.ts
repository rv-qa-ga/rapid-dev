import type { APIRequestContext } from '@playwright/test';

import { getDiscoveryCredential, fnoOdataScopeFromBaseUrl } from './credential';
import { getLloydsFnOOdataBaseUrl } from './lloydsFnOOdataEnv';
import { logger } from '../../utils/logger';

export type FnoOdataProbeResult = {
  url: string;
  status: number;
  statusText: string;
};

/**
 * GET `{odataBase}/LegalEntities?$top=1` (or another relative path under `/data`) using
 * the discovery credential and Playwright's API context (TLS / proxy alignment with other Lloyd's calls).
 */
export async function probeFnoOdata(
  apiContext: APIRequestContext,
  relativePath: string = 'LegalEntities?$top=1',
  env: NodeJS.ProcessEnv = process.env
): Promise<FnoOdataProbeResult> {
  const base = getLloydsFnOOdataBaseUrl(env);
  if (!base) {
    throw new Error('LLOYDS_FNO_ODATA_BASE_URL is not set.');
  }
  const path = relativePath.replace(/^\/+/, '');
  const url = `${base.replace(/\/+$/, '')}/${path}`;
  const scope =
    (env.LLOYDS_FNO_ODATA_SCOPE ?? '').trim() || fnoOdataScopeFromBaseUrl(base);
  const { credential, source } = getDiscoveryCredential(env);
  logger.info(`[fno-odata] Token source: ${source}; scope: ${scope}`);
  const token = await credential.getToken(scope);
  if (!token?.token) {
    throw new Error(`Entra getToken returned no token for F&O OData (scope: ${scope}).`);
  }
  const res = await apiContext.get(url, {
    headers: {
      Authorization: `Bearer ${token.token}`,
      Accept: 'application/json',
    },
    timeout: 120_000,
  });
  const status = res.status();
  const statusText = res.statusText();
  return { url, status, statusText };
}
