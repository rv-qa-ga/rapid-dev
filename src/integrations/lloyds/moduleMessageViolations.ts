/**
 * Field-level **mutations** applied to otherwise-valid Lloyd's Service Bus JSON bodies
 * for module / contract testing. Each violation is a deterministic edit used after the
 * canonical payload is built (`serviceBusSender` builders).
 *
 * Spec format: `<messageType>|<slug>` e.g. `mule-xml-generation-success|omit_blob_id`
 */

export type ModuleFieldViolationSpec = `${string}|${string}`;

function cloneBody(body: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
}

function fv(body: Record<string, unknown>): Record<string, unknown> {
  const v = body.financial_values;
  if (!v || typeof v !== 'object') {
    body.financial_values = {};
  }
  return body.financial_values as Record<string, unknown>;
}

function err(body: Record<string, unknown>): Record<string, unknown> {
  const e = body.error;
  if (!e || typeof e !== 'object') {
    body.error = {};
  }
  return body.error as Record<string, unknown>;
}

type ViolationFn = (body: Record<string, unknown>) => void;

/** Maps `messageType|slug` → mutator (mutates cloned body in place). */
export const MODULE_FIELD_VIOLATIONS: Record<string, ViolationFn> = {
  // --- mule-xml-generation-success -----------------------------------------
  'mule-xml-generation-success|omit_correlation_id': (b) => {
    delete b.correlation_id;
  },
  'mule-xml-generation-success|null_correlation_id': (b) => {
    b.correlation_id = null;
  },
  'mule-xml-generation-success|empty_correlation_id': (b) => {
    b.correlation_id = '';
  },
  'mule-xml-generation-success|omit_file_name': (b) => {
    delete b.file_name;
  },
  'mule-xml-generation-success|empty_file_name': (b) => {
    b.file_name = '';
  },
  'mule-xml-generation-success|omit_message': (b) => {
    delete b.message;
  },
  'mule-xml-generation-success|wrong_message_value': (b) => {
    b.message = 'mule-xml-generation-succes';
  },
  'mule-xml-generation-success|omit_blob_id': (b) => {
    delete b.blob_id;
  },
  'mule-xml-generation-success|null_blob_id': (b) => {
    b.blob_id = null;
  },
  'mule-xml-generation-success|blob_id_file_mismatch': (b) => {
    b.blob_id = 'https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml/WRONG_FILE_NAME_DOES_NOT_MATCH.xml';
  },
  'mule-xml-generation-success|omit_financial_values': (b) => {
    delete b.financial_values;
  },
  'mule-xml-generation-success|null_financial_values': (b) => {
    b.financial_values = null;
  },
  'mule-xml-generation-success|omit_adp_currency': (b) => {
    delete fv(b).adp_currency;
  },
  'mule-xml-generation-success|empty_adp_currency': (b) => {
    fv(b).adp_currency = '';
  },
  'mule-xml-generation-success|adp_prm_wrong_type_string': (b) => {
    fv(b).adp_prm = 'not-a-number' as unknown as number;
  },
  'mule-xml-generation-success|adp_prm_null': (b) => {
    fv(b).adp_prm = null;
  },
  'mule-xml-generation-success|adp_prm_extreme_mismatch': (b) => {
    fv(b).adp_prm = 999999999.99;
  },
  'mule-xml-generation-success|financial_extra_unknown_field': (b) => {
    fv(b).accelins_synthetic_unknown_metric = 12345;
  },
  'mule-xml-generation-success|top_level_extra_unknown_field': (b) => {
    b.accelins_synthetic_unknown_root = { nested: true };
  },

  // --- mule-xml-generation-failed ------------------------------------------
  'mule-xml-generation-failed|omit_correlation_id': (b) => {
    delete b.correlation_id;
  },
  'mule-xml-generation-failed|omit_file_name': (b) => {
    delete b.file_name;
  },
  'mule-xml-generation-failed|omit_message': (b) => {
    delete b.message;
  },
  'mule-xml-generation-failed|wrong_message_value': (b) => {
    b.message = 'mule-xml-generation-fail';
  },
  'mule-xml-generation-failed|omit_error_object': (b) => {
    delete b.error;
  },
  'mule-xml-generation-failed|null_error_object': (b) => {
    b.error = null;
  },
  'mule-xml-generation-failed|error_omit_error_message': (b) => {
    delete err(b).error_message;
  },
  'mule-xml-generation-failed|error_omit_error_timestamp': (b) => {
    delete err(b).error_timestamp;
  },
  'mule-xml-generation-failed|error_omit_failed_stage': (b) => {
    delete err(b).failed_stage;
  },
  'mule-xml-generation-failed|error_omit_process_name': (b) => {
    delete err(b).process_name;
  },
  'mule-xml-generation-failed|error_omit_error_source': (b) => {
    delete err(b).error_source;
  },

  // --- dv-xml-approval-success / failed ------------------------------------
  'dv-xml-approval-success|omit_correlation_id': (b) => {
    delete b.correlation_id;
  },
  'dv-xml-approval-success|omit_file_name': (b) => {
    delete b.file_name;
  },
  'dv-xml-approval-success|empty_file_name': (b) => {
    b.file_name = '';
  },
  'dv-xml-approval-success|omit_message': (b) => {
    delete b.message;
  },
  'dv-xml-approval-success|wrong_message_value': (b) => {
    b.message = 'dv-xml-approval-succes';
  },
  'dv-xml-approval-failed|omit_correlation_id': (b) => {
    delete b.correlation_id;
  },
  'dv-xml-approval-failed|omit_file_name': (b) => {
    delete b.file_name;
  },
  'dv-xml-approval-failed|omit_error_object': (b) => {
    delete b.error;
  },
  'dv-xml-approval-failed|error_omit_error_message': (b) => {
    delete err(b).error_message;
  },
  'dv-xml-approval-failed|error_omit_error_timestamp': (b) => {
    delete err(b).error_timestamp;
  },

  // --- mule-d365-import family (submission + DMF) -------------------------
  'mule-xml-submission-success|omit_correlation_id': (b) => {
    delete b.correlation_id;
  },
  'mule-xml-submission-success|omit_file_name': (b) => {
    delete b.file_name;
  },
  'mule-xml-submission-success|omit_blob_id': (b) => {
    delete b.blob_id;
  },
  'mule-xml-submission-success|null_blob_id': (b) => {
    b.blob_id = null;
  },
  'mule-xml-submission-success|omit_message': (b) => {
    delete b.message;
  },
  'mule-xml-submission-success|wrong_message_value': (b) => {
    b.message = 'mule-xml-submission-succes';
  },
  'mule-xml-submission-failed|omit_correlation_id': (b) => {
    delete b.correlation_id;
  },
  'mule-xml-submission-failed|omit_error': (b) => {
    delete b.error;
  },
  'mule-xml-submission-failed|error_omit_error_message': (b) => {
    delete err(b).error_message;
  },
  'mule-xml-submission-failed|error_omit_error_timestamp': (b) => {
    delete err(b).error_timestamp;
  },
  'mule-dmf-import-success|omit_blob_id': (b) => {
    delete b.blob_id;
  },
  'mule-dmf-import-success|omit_file_name': (b) => {
    delete b.file_name;
  },
  'mule-dmf-import-success|wrong_message_value': (b) => {
    b.message = 'mule-dmf-import-succes';
  },
  'mule-dmf-import-failed|omit_error': (b) => {
    delete b.error;
  },
  'mule-dmf-import-failed|error_omit_error_message': (b) => {
    delete err(b).error_message;
  },
  'mule-dmf-processing-success|omit_correlation_id': (b) => {
    delete b.correlation_id;
  },
  'mule-dmf-processing-success|omit_blob_id': (b) => {
    delete b.blob_id;
  },
  'mule-dmf-processing-failed|omit_error': (b) => {
    delete b.error;
  },
  'mule-dmf-processing-failed|null_error_message': (b) => {
    err(b).error_message = null;
  },

  // --- dv-d365-journalposting ----------------------------------------------
  'dv-journal-posting-success|omit_blob_id': (b) => {
    delete b.blob_id;
  },
  'dv-journal-posting-success|null_blob_id': (b) => {
    b.blob_id = null;
  },
  'dv-journal-posting-success|omit_file_name': (b) => {
    delete b.file_name;
  },
  'dv-journal-posting-success|wrong_message_value': (b) => {
    b.message = 'dv-journal-posting-succes';
  },
  'dv-journal-posting-failed|omit_error': (b) => {
    delete b.error;
  },
  'dv-journal-posting-failed|error_omit_error_message': (b) => {
    delete err(b).error_message;
  },
};

export function applyModuleFieldViolation(
  canonicalBody: Record<string, unknown>,
  violationSpec: string,
): Record<string, unknown> {
  const fn = MODULE_FIELD_VIOLATIONS[violationSpec];
  if (!fn) {
    const keys = Object.keys(MODULE_FIELD_VIOLATIONS).filter((k) => k.startsWith(`${violationSpec.split('|')[0]}|`));
    throw new Error(
      `Unknown field violation "${violationSpec}". ` +
        (keys.length ? `Known slugs for this message type: ${keys.map((k) => k.split('|')[1]).join(', ')}` : 'No matches.'),
    );
  }
  const out = cloneBody(canonicalBody);
  fn(out);
  return out;
}

export function parseViolationSpec(spec: string): { messageType: string; slug: string; key: string } {
  const pipe = spec.indexOf('|');
  if (pipe < 1) {
    throw new Error(`Violation spec must be "<messageType>|<slug>", got "${spec}"`);
  }
  const messageType = spec.slice(0, pipe).trim();
  const slug = spec.slice(pipe + 1).trim();
  if (!messageType || !slug) throw new Error(`Invalid violation spec "${spec}"`);
  return { messageType, slug, key: spec };
}
