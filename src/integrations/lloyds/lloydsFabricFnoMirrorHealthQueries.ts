/**
 * BA-approved **Fabric warehouse** read-only counts for Dynamics F&O–mirrored objects
 * (`generaljournalentry`, `ods.*` staging). Used by `npm run lloyds:fabric-fno-mirror-health`.
 *
 * Connect with `LLOYDS_FNOFABRIC_SQLSERVER_*` (warehouse DB is often `dataverse_*_workspace_*`).
 * Optional overrides: `LLOYDS_FNOFABRIC_ODS_SCHEMA`, `LLOYDS_FNOFABRIC_GJE_QUALIFIED_NAME`.
 */

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface LloydsFabricFnoMirrorHealthQuery {
  id: string;
  description: string;
  /** Returns one row with column `cnt` (bigint/int). */
  sql: string;
}

/** Unbracketed `a.b` / `a.b.c`; each segment must match {@link IDENT}. */
export function formatFabricQualifiedTable(raw: string | undefined, fallback: string): string {
  const d = (raw ?? '').trim();
  if (!d) return bracketTwoPart('dbo', fallback);
  if (d.includes(';') || d.includes('--') || d.includes('/*') || d.length > 400) {
    throw new Error('LLOYDS_FNOFABRIC_GJE_QUALIFIED_NAME: invalid characters or length');
  }
  if (d.startsWith('[')) return d;
  const parts = d.split('.').filter(Boolean);
  if (parts.length === 1) {
    if (!IDENT.test(parts[0]!)) throw new Error(`Invalid table segment: ${parts[0]}`);
    return bracketTwoPart('dbo', parts[0]!);
  }
  for (const p of parts) {
    if (!IDENT.test(p)) throw new Error(`Invalid identifier segment: ${p}`);
  }
  if (parts.length === 2) return bracketTwoPart(parts[0]!, parts[1]!);
  if (parts.length === 3) return `[${parts[0]}].[${parts[1]}].[${parts[2]}]`;
  throw new Error('LLOYDS_FNOFABRIC_GJE_QUALIFIED_NAME: use table, schema.table, db.schema.table, or bracketed [..].[..]');
}

function bracketTwoPart(schema: string, table: string): string {
  return `[${schema}].[${table}]`;
}

function odsTable(env: NodeJS.ProcessEnv, table: string): string {
  const schema = env.LLOYDS_FNOFABRIC_ODS_SCHEMA?.trim() || 'ods';
  if (!IDENT.test(schema) || !IDENT.test(table)) {
    throw new Error(`LLOYDS_FNOFABRIC_ODS_SCHEMA / table must match ${IDENT}; got schema=${schema}, table=${table}`);
  }
  return bracketTwoPart(schema, table);
}

/**
 * Programme snapshot (Accelerant QA, 2026-04-24): AEUM company slice; staging row counts
 * for vendor / customer / AR-AP mirror tables. Adjust filters if BA changes voucher rules.
 */
export function buildLloydsFabricFnoMirrorHealthQueries(
  env: NodeJS.ProcessEnv = process.env,
): LloydsFabricFnoMirrorHealthQuery[] {
  const gje = formatFabricQualifiedTable(env.LLOYDS_FNOFABRIC_GJE_QUALIFIED_NAME, 'generaljournalentry');

  return [
    {
      id: 'gje_aeum_subledger',
      description: 'General journal entry rows whose sub-ledger voucher data area is AEUM (ledger presence).',
      sql: `SELECT COUNT(*) AS cnt FROM ${gje} WHERE subledgervoucherdataareaid LIKE 'AEUM'`,
    },
    {
      id: 'ods_vend_vendor_v2',
      description: 'Vendor master staging (AEUM).',
      sql: `SELECT COUNT(*) AS cnt FROM ${odsTable(env, 'vendvendorv2staging')} WHERE dataareaid = 'AEUM'`,
    },
    {
      id: 'ods_acc_cust_trans',
      description: 'Customer AR transaction staging (voucher prefix AEUM — programme filter).',
      sql: `SELECT COUNT(*) AS cnt FROM ${odsTable(env, 'acccusttransstaging')} WHERE voucher LIKE 'AEUM'`,
    },
    {
      id: 'ods_acc_cust_settle',
      description: 'Customer settlement staging (AEUM).',
      sql: `SELECT COUNT(*) AS cnt FROM ${odsTable(env, 'acccustsettlestaging')} WHERE dataareaid = 'AEUM'`,
    },
    {
      id: 'ods_acc_vend_trans',
      description: 'Vendor AP transaction staging (AEUM).',
      sql: `SELECT COUNT(*) AS cnt FROM ${odsTable(env, 'accvendtransstaging')} WHERE dataareaid = 'AEUM'`,
    },
    {
      id: 'ods_acc_vend_settle',
      description: 'Vendor settlement staging (AEUM).',
      sql: `SELECT COUNT(*) AS cnt FROM ${odsTable(env, 'accvendsettlestaging')} WHERE dataareaid = 'AEUM'`,
    },
    {
      id: 'ods_cust_customer_v3',
      description: 'Customer master staging (AEUM; mirror entity CustCustomerV3).',
      sql: `SELECT COUNT(*) AS cnt FROM ${odsTable(env, 'custcustomerv3staging')} WHERE dataareaid = 'AEUM'`,
    },
  ];
}
