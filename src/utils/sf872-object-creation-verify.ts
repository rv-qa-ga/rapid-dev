/**
 * SF-872 — object creation scope only.
 * Excel workbooks under docs/SF872 hold migration *data* for later loads, not SF-872 acceptance criteria.
 * Automation validates that custom objects exist and are usable (describe / Lightning); record data is out of scope.
 */

export type Sf872ComparisonRow = {
  check: string;
  expected: string;
  actual: string;
  ok: boolean;
  notes?: string;
};

const SCOPE_NOTE =
  'SF-872 covers object/metadata creation only. Migration row data in Excel is validated in separate load/migration tests, not here.';

export function buildApiObjectCreationRows(
  objectApiName: string,
  describe: { name?: string; custom?: boolean; fields?: unknown[] } | null,
  describeError?: string
): Sf872ComparisonRow[] {
  const rows: Sf872ComparisonRow[] = [];

  rows.push({
    check: 'SF-872 scope',
    expected: 'Object creation / metadata only (no migration data verification)',
    actual: 'Checks use Salesforce describe only',
    ok: true,
    notes: SCOPE_NOTE,
  });

  const okDescribe = !!describe && !describeError;
  rows.push({
    check: `Object "${objectApiName}" REST describe`,
    expected: 'describe succeeds (object deployed)',
    actual: okDescribe
      ? `ok — ${describe!.fields?.length ?? 0} fields in describe`
      : describeError || 'describe failed',
    ok: okDescribe,
  });

  if (describe && objectApiName.endsWith('__c') && typeof describe.custom === 'boolean') {
    rows.push({
      check: 'Custom object flag',
      expected: 'custom = true',
      actual: String(describe.custom),
      ok: describe.custom === true,
    });
  }

  if (describe) {
    const n = Array.isArray(describe.fields) ? describe.fields.length : 0;
    rows.push({
      check: 'Field metadata catalog',
      expected: 'at least one field in describe',
      actual: String(n),
      ok: n > 0,
    });
  }

  return rows;
}

export function buildUiObjectCreationRows(params: {
  objectApiName: string;
  listUrl: string;
  newUrl: string;
  listUrlActual: string;
  newUrlActual: string;
  listOk: boolean;
  newOk: boolean;
  formShellVisible: boolean;
}): Sf872ComparisonRow[] {
  const rows: Sf872ComparisonRow[] = [];

  rows.push({
    check: 'SF-872 scope',
    expected: 'Object creation / UI reachability only (no migration data verification)',
    actual: 'Checks use Lightning list + new form URLs only',
    ok: true,
    notes: SCOPE_NOTE,
  });

  rows.push({
    check: 'List view reachable',
    expected: params.listUrl,
    actual: params.listUrlActual,
    ok: params.listOk,
  });

  rows.push({
    check: 'New record form reachable',
    expected: params.newUrl,
    actual: params.newUrlActual,
    ok: params.newOk,
  });

  rows.push({
    check: 'Lightning record form shell (best-effort)',
    expected: 'on /new URL, optional visible layout region',
    actual: params.formShellVisible ? 'visible' : 'not detected (URL still on new)',
    ok: params.newOk,
    notes: params.formShellVisible
      ? undefined
      : 'Pass/fail is driven by /new URL; selectors vary by org — tune if you need strict layout asserts',
  });

  return rows;
}

/** SF-872 read-only governance: list visible; new-record flow must not be usable like an admin. */
export function buildUiReadOnlyGovernanceRows(params: {
  objectApiName: string;
  listUrl: string;
  newUrl: string;
  listUrlActual: string;
  newUrlActual: string;
  listOk: boolean;
  newRecordAccessBlocked: boolean;
}): Sf872ComparisonRow[] {
  const rows: Sf872ComparisonRow[] = [];

  rows.push({
    check: 'SF-872 scope',
    expected: 'Read-only may view reference data; no create/edit/deactivate/delete',
    actual: 'Lightning list + /new reachability checks',
    ok: true,
    notes: SCOPE_NOTE,
  });

  rows.push({
    check: 'List view reachable (read-only)',
    expected: params.listUrl,
    actual: params.listUrlActual,
    ok: params.listOk,
  });

  rows.push({
    check: 'New record access blocked or unusable (read-only)',
    expected: 'insufficient / no form / not on /new',
    actual: params.newRecordAccessBlocked ? 'blocked or no create UI' : `still on new with form: ${params.newUrlActual}`,
    ok: params.newRecordAccessBlocked,
    notes:
      'If this fails, confirm profile removes "Create" on the object and retest; LEX may vary slightly by org.',
  });

  return rows;
}
