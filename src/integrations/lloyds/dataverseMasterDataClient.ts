/**
 * Thin read-only facade over Dataverse for the master-data tables the Lloyd's sanity
 * planner needs:
 *   - `accelins_legalentities`   (Destination Ledger on the XML File form)
 *   - `accelins_repositoryfiles` (Repository File ID on the XML File form)
 *
 * The goal is to answer the questions: **what ledger codes exist?** and **what
 * repository codes exist?** in the target environment, so the planner can filter
 * blob-container file names to only the rows that will actually create a record
 * without dead-lettering ("Guid.Empty" DLQ errors we observed when either lookup
 * failed to resolve).
 *
 * Authentication: uses the credential from `credential.ts` (SPN if available, else
 * interactive `DefaultAzureCredential`). No cookie / bearer management here — the
 * credential hands us a token we attach as the `Authorization` header on each call.
 *
 * Paging: each list call follows `@odata.nextLink` up to a safety ceiling. Dataverse
 * defaults to 5000 rows per page, so in practice one page is enough for master data
 * smaller than 5k records.
 */

import type { TokenCredential } from '@azure/identity';

import { logger } from '../../utils/logger';

import { dataverseScope, getDiscoveryCredential } from './credential';

/**
 * Logical names of the columns on each master table.
 *
 * In the Lloyd's accelins_* custom tables the primary name column (`accelins_name`) holds
 * the business code (e.g. ledger `"AEUM"`, repository id like `"US-58338"`) — there's no separate code
 * field. This is the Dataverse default when no `accelins_code` was added on table create.
 */
export const MASTER_DATA_FIELDS = {
  legalEntity: {
    /** Entity set (OData plural). */
    set: 'accelins_legalentities',
    /** Primary id. */
    id: 'accelins_legalentityid',
    /** 3–4 letter ledger code (Lloyd's agency branch: **AEUM**). Stored in the primary name column. */
    code: 'accelins_name',
  },
  repositoryFile: {
    set: 'accelins_repositoryfiles',
    id: 'accelins_repositoryfileid',
    /** e.g. "CA-7740" / "EU-167668" — matches the `<REPO_ID>` segment of the XML file name. */
    code: 'accelins_name',
  },
} as const;

export interface MasterRecord {
  id: string;
  code: string;
  name: string | null;
}

/** Repository master row including optional link to `accelins_legal_entity` (Dataverse lookup). */
export interface RepositoryMasterRecord extends MasterRecord {
  /** OData `_accelins_legal_entity_value` when present; used by the sanity planner to resolve ledger when the blob file name uses programme token `AEUM` but the org stores a different `accelins_legalentity` code. */
  linkedLegalEntityId: string | null;
}

export class DataverseMasterDataClient {
  private constructor(
    private readonly credential: TokenCredential,
    private readonly dataverseHost: string,
    private readonly apiVersion: string,
    private readonly credentialSource: string,
  ) {}

  /**
   * Build a client against the Dataverse env configured in `.env.qa` (or explicit override).
   * Uses `D365_WEB_API_BASE_URL` → `D365_BASE_URL` → explicit arg.
   */
  static create(input?: { dataverseHost?: string; apiVersion?: string; env?: NodeJS.ProcessEnv }): DataverseMasterDataClient {
    const env = input?.env ?? process.env;
    const hostRaw = input?.dataverseHost
      ?? env.LLOYDS_DATAVERSE_BASE_URL?.trim()
      ?? env.D365_BASE_URL?.trim()
      ?? inferHostFromWebApi(env.D365_WEB_API_BASE_URL?.trim())
      ?? '';
    if (!hostRaw) {
      throw new Error(
        'Dataverse host not configured. Set LLOYDS_DATAVERSE_BASE_URL or D365_BASE_URL (or D365_WEB_API_BASE_URL) in your env.',
      );
    }
    const host = hostRaw.replace(/\/+$/, '');
    const apiVersion = input?.apiVersion ?? env.D365_API_VERSION ?? 'v9.2';
    const { credential, source } = getDiscoveryCredential(env);
    return new DataverseMasterDataClient(credential, host, apiVersion, source);
  }

  /** Describe which credential source the client was built with (for CLI output). */
  getCredentialSource(): string { return this.credentialSource; }
  getDataverseHost(): string { return this.dataverseHost; }

  /** List all `accelins_legalentity` records. Returns `[]` if the table has no rows. */
  async listLegalEntities(): Promise<MasterRecord[]> {
    return this.listEntitySet(MASTER_DATA_FIELDS.legalEntity);
  }

  /** Single `accelins_legalentity` row by primary id (used when repository lookup GUID is not in the paged list). */
  async findLegalEntityById(entityId: string): Promise<MasterRecord | null> {
    const f = MASTER_DATA_FIELDS.legalEntity;
    const clean = entityId.replace(/[{}]/g, '');
    const token = await this.credential.getToken(dataverseScope(this.dataverseHost));
    if (!token) throw new Error('Failed to acquire Dataverse token.');
    const url = `${this.dataverseHost}/api/data/${this.apiVersion}/${f.set}(${clean})?$select=${f.id},${f.code}`;
    logger.debug(`[master-data] GET (legal entity by id) ${url}`);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Dataverse legal entity by id failed (${res.status}): ${body}`);
    }
    const row = (await res.json()) as Record<string, unknown>;
    const id = String(row[f.id] ?? '').trim();
    const code = String(row[f.code] ?? '').trim();
    if (!id || !code) return null;
    return { id, code, name: code };
  }

  /** List all `accelins_repositoryfile` records (includes `_accelins_legal_entity_value` for planner ledger resolution). */
  async listRepositoryFiles(): Promise<RepositoryMasterRecord[]> {
    return this.listRepositoryFileSetWithLegalEntity();
  }

  /**
   * Single repository master row by business code (e.g. `US-61273`), or null if absent.
   * Prefer this over downloading the full `listRepositoryFiles()` set when you only need one id.
   */
  async findRepositoryByCode(code: string): Promise<MasterRecord | null> {
    const f = MASTER_DATA_FIELDS.repositoryFile;
    const token = await this.credential.getToken(dataverseScope(this.dataverseHost));
    if (!token) throw new Error('Failed to acquire Dataverse token.');
    const escaped = code.replace(/'/g, "''");
    const select = [f.id, f.code].join(',');
    const url =
      `${this.dataverseHost}/api/data/${this.apiVersion}/${f.set}` +
      `?$select=${select}&$filter=${f.code} eq '${escaped}'&$top=1`;
    logger.debug(`[master-data] GET (by code) ${url}`);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Dataverse repository lookup failed (${res.status}): ${body}`);
    }
    const json = (await res.json()) as { value: Array<Record<string, unknown>> };
    const row = json.value?.[0];
    if (!row) return null;
    const id = String(row[f.id] ?? '').trim();
    const repoCode = String(row[f.code] ?? '').trim();
    if (!id || !repoCode) return null;
    return { id, code: repoCode, name: repoCode };
  }

  /** Convert a MasterRecord list into a lookup-by-code map (code uppercased). */
  static asCodeIndex(records: MasterRecord[]): Map<string, MasterRecord> {
    const out = new Map<string, MasterRecord>();
    for (const r of records) {
      if (r.code) out.set(r.code.toUpperCase(), r);
    }
    return out;
  }

  /** Repository rows keyed by `accelins_name` (repo id), uppercased. */
  static asRepositoryCodeIndex(records: RepositoryMasterRecord[]): Map<string, RepositoryMasterRecord> {
    const out = new Map<string, RepositoryMasterRecord>();
    for (const r of records) {
      if (r.code) out.set(r.code.toUpperCase(), r);
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private static readonly REPO_LE_LOOKUP = '_accelins_legal_entity_value';

  private async listRepositoryFileSetWithLegalEntity(): Promise<RepositoryMasterRecord[]> {
    const f = MASTER_DATA_FIELDS.repositoryFile;
    const leCol = DataverseMasterDataClient.REPO_LE_LOOKUP;
    const token = await this.credential.getToken(dataverseScope(this.dataverseHost));
    if (!token) throw new Error('Failed to acquire Dataverse token.');

    const select = [f.id, f.code, leCol].join(',');
    const firstUrl = `${this.dataverseHost}/api/data/${this.apiVersion}/${f.set}?$select=${select}`;

    const out: RepositoryMasterRecord[] = [];
    let nextUrl: string | null = firstUrl;
    let page = 0;
    const PAGE_LIMIT = 200;
    while (nextUrl && page < PAGE_LIMIT) {
      page += 1;
      logger.debug(`[master-data] GET ${nextUrl}`);
      const res = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${token.token}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Dataverse master-data query failed (${res.status}) on ${f.set}: ${body}`);
      }
      const json = (await res.json()) as {
        value: Array<Record<string, unknown>>;
        '@odata.nextLink'?: string;
      };
      for (const row of json.value ?? []) {
        const id = String(row[f.id] ?? '').trim();
        const code = String(row[f.code] ?? '').trim();
        if (!id || !code) continue;
        const rawLe = row[leCol];
        const linkedLegalEntityId =
          rawLe !== undefined && rawLe !== null && String(rawLe).trim() !== ''
            ? String(rawLe).trim()
            : null;
        out.push({ id, code, name: code, linkedLegalEntityId });
      }
      nextUrl = json['@odata.nextLink'] ?? null;
    }
    if (page >= PAGE_LIMIT) {
      logger.warn(`[master-data] ${f.set}: hit page limit ${PAGE_LIMIT}; results may be truncated.`);
    }
    return out;
  }

  private async listEntitySet(fields: { set: string; id: string; code: string }): Promise<MasterRecord[]> {
    const token = await this.credential.getToken(dataverseScope(this.dataverseHost));
    if (!token) throw new Error('Failed to acquire Dataverse token.');

    const select = [fields.id, fields.code].join(',');
    const firstUrl = `${this.dataverseHost}/api/data/${this.apiVersion}/${fields.set}?$select=${select}`;

    const out: MasterRecord[] = [];
    let nextUrl: string | null = firstUrl;
    let page = 0;
    // 200 pages × 5000 rows = 1M record ceiling. Dev env has ~100k repository files so
    // we were previously truncating. If this is ever hit in practice, switch to a
    // filter-based lookup (only query codes referenced by the current blob container)
    // to avoid downloading the entire master table.
    const PAGE_LIMIT = 200;
    while (nextUrl && page < PAGE_LIMIT) {
      page += 1;
      logger.debug(`[master-data] GET ${nextUrl}`);
      const res = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${token.token}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Dataverse master-data query failed (${res.status}) on ${fields.set}: ${body}`);
      }
      const json = (await res.json()) as {
        value: Array<Record<string, unknown>>;
        '@odata.nextLink'?: string;
      };
      for (const row of json.value ?? []) {
        const id = String(row[fields.id] ?? '').trim();
        const code = String(row[fields.code] ?? '').trim();
        if (!id || !code) continue;
        // For these tables the primary name column also carries the display name; we keep
        // `name` populated as a convenience (some callers print it for human-readable output).
        out.push({ id, code, name: code });
      }
      nextUrl = json['@odata.nextLink'] ?? null;
    }
    if (page >= PAGE_LIMIT) {
      logger.warn(`[master-data] ${fields.set}: hit page limit ${PAGE_LIMIT}; results may be truncated.`);
    }
    return out;
  }
}

function inferHostFromWebApi(webApi?: string): string | undefined {
  if (!webApi) return undefined;
  try {
    const u = new URL(webApi);
    return `${u.protocol}//${u.host}`;
  } catch {
    return undefined;
  }
}
