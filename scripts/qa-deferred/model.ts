/**
 * Data model, validation, and ID generation for QA Deferred items.
 */

export const VALID_DECISIONS = ['Deferred', 'Accepted', 'Rejected'] as const;
export const VALID_OWNERS = ['BA', 'Architect', 'PO', 'Team', 'TBD'] as const;
export const VALID_TARGET_PHASES = ['Phase 2', 'Phase 3', 'TBD'] as const;
export const VALID_SORT_FIELDS = ['date_raised', 'area', 'decision', 'jira_key'] as const;

export type Decision = (typeof VALID_DECISIONS)[number];
export type Owner = (typeof VALID_OWNERS)[number];
export type TargetPhase = (typeof VALID_TARGET_PHASES)[number];
export type SortField = (typeof VALID_SORT_FIELDS)[number];

export interface DeferredItemInput {
  id?: string;
  area: string;
  observation: string;
  risk: string;
  decision: string;
  owner: string;
  target_phase: string;
  jira_key: string;
  jira_url?: string;
  date_raised?: string;
  notes?: string;
}

export interface DeferredItem {
  id: string;
  area: string;
  observation: string;
  risk: string;
  decision: Decision;
  owner: Owner;
  targetPhase: TargetPhase;
  jiraKey: string;
  jiraUrl: string;
  dateRaised: string;
  notes: string;
}

export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    public readonly allowed: readonly string[],
  ) {
    super(
      `Invalid value for "${field}": "${value}". Allowed: ${allowed.join(', ')}`,
    );
    this.name = 'ValidationError';
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(value: string): string {
  if (!DATE_REGEX.test(value)) {
    throw new ValidationError('date_raised', value, ['YYYY-MM-DD']);
  }
  const parsed = new Date(value + 'T00:00:00Z');
  if (isNaN(parsed.getTime())) {
    throw new ValidationError('date_raised', value, ['valid YYYY-MM-DD date']);
  }
  return value;
}

function validateEnum<T extends string>(
  field: string,
  value: string,
  allowed: readonly T[],
): T {
  if (!allowed.includes(value as T)) {
    throw new ValidationError(field, value, allowed);
  }
  return value as T;
}

function requireString(field: string, value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(field, value, ['non-empty string']);
  }
  return value.trim();
}

/**
 * Generate a sequential QA-### ID given the current highest number.
 */
export function generateId(sequenceNumber: number): string {
  return `QA-${String(sequenceNumber).padStart(3, '0')}`;
}

/**
 * Build a Jira browse URL from a key and base URL.
 */
export function buildJiraUrl(jiraKey: string, jiraBaseUrl: string): string {
  const base = jiraBaseUrl.replace(/\/+$/, '');
  return `${base}/browse/${jiraKey}`;
}

/**
 * Determine the next sequence number by scanning existing items.
 */
export function nextSequenceNumber(existingItems: DeferredItem[]): number {
  let max = 0;
  for (const item of existingItems) {
    const match = item.id.match(/^QA-(\d+)$/);
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }
  return max + 1;
}

/**
 * Validate and normalize a raw input item into a DeferredItem.
 */
export function validateItem(
  input: DeferredItemInput,
  index: number,
  sequenceNumber: number,
  jiraBaseUrl: string,
): DeferredItem {
  const ctx = `items[${index}]`;

  const area = requireString(`${ctx}.area`, input.area);
  const observation = requireString(`${ctx}.observation`, input.observation);
  const risk = requireString(`${ctx}.risk`, input.risk);
  const jiraKey = requireString(`${ctx}.jira_key`, input.jira_key);
  const decision = validateEnum(
    `${ctx}.decision`,
    requireString(`${ctx}.decision`, input.decision),
    VALID_DECISIONS,
  );
  const owner = validateEnum(
    `${ctx}.owner`,
    requireString(`${ctx}.owner`, input.owner),
    VALID_OWNERS,
  );
  const targetPhase = validateEnum(
    `${ctx}.target_phase`,
    requireString(`${ctx}.target_phase`, input.target_phase),
    VALID_TARGET_PHASES,
  );

  const id = input.id?.trim() || generateId(sequenceNumber);
  const jiraUrl = input.jira_url?.trim() || buildJiraUrl(jiraKey, jiraBaseUrl);
  const dateRaised = validateDate(input.date_raised?.trim() || todayISO());
  const notes = input.notes?.trim() || '';

  return {
    id,
    area,
    observation,
    risk,
    decision,
    owner,
    targetPhase,
    jiraKey,
    jiraUrl,
    dateRaised,
    notes,
  };
}

/**
 * Validate an array of raw inputs into DeferredItems, auto-assigning IDs.
 */
export function validateItems(
  inputs: DeferredItemInput[],
  jiraBaseUrl: string,
  existingItems: DeferredItem[] = [],
): DeferredItem[] {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('Input must be a non-empty array of items.');
  }

  let seq = nextSequenceNumber(existingItems);
  const results: DeferredItem[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const needsId = !inputs[i].id?.trim();
    const item = validateItem(inputs[i], i, seq, jiraBaseUrl);
    results.push(item);
    if (needsId) seq++;
  }

  return results;
}
