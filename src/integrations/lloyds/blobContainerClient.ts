/**
 * Lloyd's Azure Blob Storage helper — list + download XMLs from the `mulesoft-xml`
 * container (or any override).
 *
 * The sanity planner uses `listXmlBlobs` to discover which XMLs are actually present
 * in the dev storage account, then combines that with Dataverse master data to produce
 * a runnable test-data plan. Optional `downloadXmlBlob` is available for computing ADP
 * totals on-the-fly when a local copy under `docs/lloyds/XMLs/` isn't committed.
 *
 * Authentication: same `credential.ts` chain as Dataverse (SPN if available, else
 * interactive `DefaultAzureCredential`). No connection strings, no SAS URIs.
 */

import * as fs from 'fs';
import * as path from 'path';

import { ContainerClient, BlobServiceClient } from '@azure/storage-blob';

import { logger } from '../../utils/logger';

import { getDiscoveryCredential } from './credential';
import { parseFileName } from './xmlFileName';

export const DEFAULT_LLOYDS_BLOB_SERVICE_URL = 'https://saaccdevukslyd.blob.core.windows.net';
export const DEFAULT_LLOYDS_BLOB_CONTAINER = 'mulesoft-xml';

export interface XmlBlobEntry {
  /** Blob name exactly as stored (e.g. `"AEUM US-58338 202604091630.xml"`). */
  name: string;
  /** Full URL, URI-encoded, suitable for direct use as `blob_id` in the SB payload. */
  url: string;
  /** Raw URL with literal spaces (some programme payloads use this form; keep for debug). */
  urlWithSpaces: string;
  /** Size in bytes — useful for sanity-picking small XMLs first. */
  sizeBytes: number;
  /** Last-modified timestamp as ISO string. */
  lastModified: string | null;
  /** Always `application/xml` if metadata is set; null if unknown. */
  contentType: string | null;
}

export interface BlobContainerConfig {
  serviceUrl: string;
  containerName: string;
}

/** Resolve the container config from env, with `mulesoft-xml` as default. */
/**
 * Build synthetic {@link XmlBlobEntry} rows from file names in a local directory (no Azure list call).
 * Only names that {@link parseFileName} accepts are included — same shape the sanity planner expects.
 * URLs mirror {@link LloydsBlobClient.listXmlBlobs} encoding so `blob_id` payloads stay consistent.
 */
export function buildSyntheticXmlBlobEntriesFromLocalDir(
  dir: string,
  env: NodeJS.ProcessEnv = process.env,
): XmlBlobEntry[] {
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Local XML directory not found: ${resolved}`);
  }
  const cfg = getBlobContainerConfig(env);
  const out: XmlBlobEntry[] = [];
  for (const name of fs.readdirSync(resolved)) {
    if (!name.toLowerCase().endsWith('.xml')) continue;
    if (!parseFileName(name)) continue;
    const stat = fs.statSync(path.join(resolved, name));
    const urlWithSpaces = `${cfg.serviceUrl}/${cfg.containerName}/${name}`;
    const url = `${cfg.serviceUrl}/${cfg.containerName}/${encodeURIComponent(name).replace(/%20/g, ' ')}`;
    out.push({
      name,
      url,
      urlWithSpaces,
      sizeBytes: stat.size,
      lastModified: stat.mtime.toISOString(),
      contentType: 'application/xml',
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function getBlobContainerConfig(env: NodeJS.ProcessEnv = process.env): BlobContainerConfig {
  // Allow either a single override URL (`LLOYDS_BLOB_CONTAINER_URL`) or the pair.
  const overrideUrl = env.LLOYDS_BLOB_CONTAINER_URL?.trim();
  if (overrideUrl) {
    try {
      const u = new URL(overrideUrl);
      const container = u.pathname.split('/').filter(Boolean)[0];
      if (!container) throw new Error('LLOYDS_BLOB_CONTAINER_URL is missing the container segment.');
      return { serviceUrl: `${u.protocol}//${u.host}`, containerName: container };
    } catch (e) {
      throw new Error(`Invalid LLOYDS_BLOB_CONTAINER_URL: ${(e as Error).message}`);
    }
  }
  const serviceUrl = env.LLOYDS_BLOB_SERVICE_URL?.trim() || DEFAULT_LLOYDS_BLOB_SERVICE_URL;
  const containerName = env.LLOYDS_BLOB_CONTAINER_NAME?.trim() || DEFAULT_LLOYDS_BLOB_CONTAINER;
  return { serviceUrl, containerName };
}

export class LloydsBlobClient {
  private constructor(
    private readonly container: ContainerClient,
    private readonly config: BlobContainerConfig,
    private readonly credentialSource: string,
  ) {}

  static create(config?: Partial<BlobContainerConfig>): LloydsBlobClient {
    const resolved = { ...getBlobContainerConfig(), ...config };
    const { credential, source } = getDiscoveryCredential();
    const service = new BlobServiceClient(resolved.serviceUrl, credential);
    const container = service.getContainerClient(resolved.containerName);
    logger.info(`[blob] Container: ${resolved.serviceUrl}/${resolved.containerName} (credential: ${source})`);
    return new LloydsBlobClient(container, resolved, source);
  }

  getConfig(): BlobContainerConfig { return this.config; }
  getCredentialSource(): string { return this.credentialSource; }

  /** List all `*.xml` blobs in the container (single flat level). */
  async listXmlBlobs(): Promise<XmlBlobEntry[]> {
    const out: XmlBlobEntry[] = [];
    for await (const item of this.container.listBlobsFlat()) {
      if (!item.name.toLowerCase().endsWith('.xml')) continue;
      const urlWithSpaces = `${this.config.serviceUrl}/${this.config.containerName}/${item.name}`;
      const url = `${this.config.serviceUrl}/${this.config.containerName}/${encodeURIComponent(item.name).replace(/%20/g, ' ')}`;
      out.push({
        name: item.name,
        url,
        urlWithSpaces,
        sizeBytes: item.properties?.contentLength ?? 0,
        lastModified: item.properties?.lastModified ? new Date(item.properties.lastModified).toISOString() : null,
        contentType: item.properties?.contentType ?? null,
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  /** Download a blob's full body as a UTF-8 string. */
  async downloadXmlBlob(blobName: string): Promise<string> {
    const blob = this.container.getBlobClient(blobName);
    const dl = await blob.download();
    if (!dl.readableStreamBody) {
      throw new Error(`Blob ${blobName} returned no body`);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of dl.readableStreamBody as NodeJS.ReadableStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }
}
