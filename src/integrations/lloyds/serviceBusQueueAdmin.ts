/**
 * Read-only Service Bus **management** calls for Lloyd's namespaces (queue runtime metrics).
 *
 * Requires an Entra app registration with rights to read queue metadata (typically
 * **Azure Service Bus Data Owner** or management-plane access on the namespace — coordinate
 * with platform; **Data Sender** alone is not enough for `getQueueRuntimeProperties`).
 *
 * Enable only when `LLOYDS_SB_READ_ENABLED=1` (or `true` / `yes`) so default E2E runs do not
 * require extra RBAC.
 */

import { ServiceBusAdministrationClient, type QueueRuntimeProperties } from '@azure/service-bus';
import { ClientSecretCredential } from '@azure/identity';

import { getServiceBusConfig, getServiceBusSpnCreds, type SpnCredentials } from './serviceBusSender';

/** Programme queue names on `sb-dev-uks-lyd` (ISDE Service Bus messages). */
export const DEFAULT_LLOYDS_SB_READ_QUEUES: readonly string[] = [
  'mule-xml-generation',
  'dv-xml-approval',
  'mule-d365-import',
  'dv-d365-journalposting',
  'mule-dependantproduct',
] as const;

export function isLloydsSbReadEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env.LLOYDS_SB_READ_ENABLED ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'y';
}

/** Comma-separated override; defaults to {@link DEFAULT_LLOYDS_SB_READ_QUEUES}. */
export function getLloydsSbReadQueueNames(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.LLOYDS_SB_READ_QUEUES?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [...DEFAULT_LLOYDS_SB_READ_QUEUES];
}

export async function fetchQueueRuntimeProperties(input: {
  fqns: string;
  queueName: string;
  creds: SpnCredentials;
}): Promise<QueueRuntimeProperties> {
  const credential = new ClientSecretCredential(input.creds.tenantId, input.creds.clientId, input.creds.clientSecret);
  const admin = new ServiceBusAdministrationClient(input.fqns, credential);
  return admin.getQueueRuntimeProperties(input.queueName);
}

/** Resolve FQNS + creds the same way as send path, then read runtime props for one queue. */
export async function fetchLloydsQueueRuntimeForEnv(
  queueName: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<QueueRuntimeProperties> {
  const cfg = getServiceBusConfig(env);
  const creds = getServiceBusSpnCreds(env);
  return fetchQueueRuntimeProperties({ fqns: cfg.fqns, queueName, creds });
}
