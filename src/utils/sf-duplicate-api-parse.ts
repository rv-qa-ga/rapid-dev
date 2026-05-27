/**
 * Parse Salesforce REST duplicate-rule responses (DUPLICATES_DETECTED).
 * @see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/headers_duplicate.htm
 */

export function rawResponseIndicatesDuplicatesDetected(rawText: string): boolean {
  return typeof rawText === 'string' && rawText.includes('DUPLICATES_DETECTED');
}

export function bodyIndicatesDuplicatesDetected(body: unknown, rawText: string): boolean {
  if (rawResponseIndicatesDuplicatesDetected(rawText)) return true;
  if (Array.isArray(body)) {
    return body.some((e) => isDuplicateErrorElement(e));
  }
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    if (o.errorCode === 'DUPLICATES_DETECTED') return true;
  }
  return false;
}

function isDuplicateErrorElement(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const o = e as Record<string, unknown>;
  return o.errorCode === 'DUPLICATES_DETECTED';
}

/**
 * Check whether a specific duplicate rule fired in the response body.
 * Used by hardened assertions like "POG hard-prevent must specifically fire
 * POG_Prevent_Duplicate (Block), not just any rule".
 */
export function bodyIndicatesDuplicateRule(
  body: unknown,
  ruleName: string
): boolean {
  let found = false;
  const visit = (node: unknown): void => {
    if (found) return;
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const x of node) visit(x);
      return;
    }
    if (typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    if (typeof o.duplicateRule === 'string' && o.duplicateRule === ruleName) {
      found = true;
      return;
    }
    for (const k of Object.keys(o)) visit(o[k]);
  };
  visit(body);
  return found;
}

/**
 * Extract the names of all DuplicateRules that fired in a DUPLICATES_DETECTED response.
 * Returns [] if no duplicateRule field present.
 */
export function extractDuplicateRuleNames(body: unknown): string[] {
  const names = new Set<string>();
  const visit = (node: unknown): void => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const x of node) visit(x);
      return;
    }
    if (typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    if (typeof o.duplicateRule === 'string') names.add(o.duplicateRule);
    for (const k of Object.keys(o)) visit(o[k]);
  };
  visit(body);
  return [...names];
}

/**
 * Recognise an Apex / validation-rule rejection (FIELD_CUSTOM_VALIDATION_EXCEPTION
 * or VALIDATION_RULE) — used by objects like Line_of_Business__c that enforce
 * duplicate prevention via a custom Apex trigger / validation rule rather than
 * the SF-1083 Match Key Alert pattern. Both mechanisms reject duplicates;
 * accepting both keeps test assertions accurate without falsely flagging LOB
 * as a defect.
 *
 * @param body parsed response body (array or object).
 * @param messageRegex optional regex to require the validation message text matches (e.g. /same name and BEGAAP/i for LOB).
 */
export function bodyIndicatesValidationException(
  body: unknown,
  messageRegex?: RegExp
): boolean {
  const VALIDATION_CODES = new Set([
    'FIELD_CUSTOM_VALIDATION_EXCEPTION',
    'VALIDATION_RULE',
  ]);
  const check = (e: Record<string, unknown>): boolean => {
    if (typeof e.errorCode !== 'string') return false;
    if (!VALIDATION_CODES.has(e.errorCode)) return false;
    if (messageRegex) {
      const m = typeof e.message === 'string' ? e.message : '';
      if (!messageRegex.test(m)) return false;
    }
    return true;
  };
  if (Array.isArray(body)) {
    return body.some((e) => e && typeof e === 'object' && check(e as Record<string, unknown>));
  }
  if (body && typeof body === 'object') {
    return check(body as Record<string, unknown>);
  }
  return false;
}

/**
 * "Duplicate detected" — accepting both the SF-1083 Match Key Alert pattern
 * (DUPLICATES_DETECTED) and the LOB-style validation-rule pattern. Use this
 * for object-agnostic duplicate-detection assertions.
 */
export function bodyIndicatesDuplicateOrValidation(
  body: unknown,
  rawText: string,
  validationMessageRegex?: RegExp
): boolean {
  if (bodyIndicatesDuplicatesDetected(body, rawText)) return true;
  if (bodyIndicatesValidationException(body, validationMessageRegex)) return true;
  return false;
}

/**
 * Collect matched Salesforce record Ids from duplicateResult / matchResults (best-effort across payload shapes).
 */
export function extractMatchedRecordIdsFromDuplicateBody(body: unknown): string[] {
  const ids = new Set<string>();
  const visit = (node: unknown): void => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const x of node) visit(x);
      return;
    }
    if (typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    if (typeof o.Id === 'string' && o.Id.length >= 15) ids.add(o.Id);
    for (const k of Object.keys(o)) {
      if (k === 'Id') continue;
      visit(o[k]);
    }
  };

  if (Array.isArray(body)) {
    for (const err of body) {
      if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>;
        if (e.duplicateResult) visit(e.duplicateResult);
        visit(err);
      }
    }
  } else if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    if (o.duplicateResult) visit(o.duplicateResult);
    visit(body);
  }
  return [...ids];
}
