import { describe, expect, it } from 'vitest';
import {
  generateId,
  buildJiraUrl,
  nextSequenceNumber,
  validateItem,
  validateItems,
  ValidationError,
  type DeferredItem,
  type DeferredItemInput,
} from '../../scripts/qa-deferred/model';
import { sortItems, dedupeByJiraKey } from '../../scripts/qa-deferred/utils';
import { renderSummaryTable as renderConfluenceSummary, renderDetails as renderConfluenceDetails, renderTable as renderConfluenceTable } from '../../scripts/qa-deferred/confluence-renderer';
import { renderSummaryTable as renderMarkdownSummary, renderTable as renderMarkdownTable } from '../../scripts/qa-deferred/markdown-renderer';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const JIRA_BASE = 'https://accelins.atlassian.net';

function makeItem(overrides: Partial<DeferredItem> = {}): DeferredItem {
  return {
    id: 'QA-001',
    area: 'Account Validation',
    observation: 'Test observation',
    risk: 'Test risk',
    decision: 'Deferred',
    owner: 'BA',
    targetPhase: 'Phase 2',
    jiraKey: 'SF-100',
    jiraUrl: 'https://accelins.atlassian.net/browse/SF-100',
    dateRaised: '2026-02-10',
    notes: '',
    ...overrides,
  };
}

function makeInput(overrides: Partial<DeferredItemInput> = {}): DeferredItemInput {
  return {
    area: 'Account Validation',
    observation: 'Test observation',
    risk: 'Test risk',
    decision: 'Deferred',
    owner: 'BA',
    target_phase: 'Phase 2',
    jira_key: 'SF-100',
    date_raised: '2026-02-10',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------
describe('generateId', () => {
  it('pads single-digit numbers to 3 digits', () => {
    expect(generateId(1)).toBe('QA-001');
    expect(generateId(9)).toBe('QA-009');
  });

  it('pads two-digit numbers', () => {
    expect(generateId(42)).toBe('QA-042');
  });

  it('preserves three-digit and higher numbers', () => {
    expect(generateId(100)).toBe('QA-100');
    expect(generateId(1234)).toBe('QA-1234');
  });
});

describe('nextSequenceNumber', () => {
  it('returns 1 when no existing items', () => {
    expect(nextSequenceNumber([])).toBe(1);
  });

  it('returns max + 1 from existing QA-### ids', () => {
    const items = [makeItem({ id: 'QA-003' }), makeItem({ id: 'QA-007' })];
    expect(nextSequenceNumber(items)).toBe(8);
  });

  it('ignores non QA-### ids', () => {
    const items = [makeItem({ id: 'CUSTOM-1' }), makeItem({ id: 'QA-005' })];
    expect(nextSequenceNumber(items)).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Jira URL Building
// ---------------------------------------------------------------------------
describe('buildJiraUrl', () => {
  it('builds URL from key and base', () => {
    expect(buildJiraUrl('SF-100', 'https://accelins.atlassian.net')).toBe(
      'https://accelins.atlassian.net/browse/SF-100',
    );
  });

  it('strips trailing slash from base URL', () => {
    expect(buildJiraUrl('SF-200', 'https://accelins.atlassian.net/')).toBe(
      'https://accelins.atlassian.net/browse/SF-200',
    );
  });

  it('handles multiple trailing slashes', () => {
    expect(buildJiraUrl('ABC-1', 'https://example.com///')).toBe(
      'https://example.com/browse/ABC-1',
    );
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
describe('validateItem', () => {
  it('accepts a valid item and fills defaults', () => {
    const item = validateItem(makeInput(), 0, 1, JIRA_BASE);
    expect(item.id).toBe('QA-001');
    expect(item.jiraUrl).toBe('https://accelins.atlassian.net/browse/SF-100');
    expect(item.decision).toBe('Deferred');
  });

  it('preserves a provided id', () => {
    const item = validateItem(makeInput({ id: 'CUSTOM-42' }), 0, 1, JIRA_BASE);
    expect(item.id).toBe('CUSTOM-42');
  });

  it('preserves a provided jira_url', () => {
    const item = validateItem(
      makeInput({ jira_url: 'https://custom.example.com/SF-100' }),
      0,
      1,
      JIRA_BASE,
    );
    expect(item.jiraUrl).toBe('https://custom.example.com/SF-100');
  });

  it('rejects invalid decision', () => {
    expect(() =>
      validateItem(makeInput({ decision: 'Maybe' }), 0, 1, JIRA_BASE),
    ).toThrow(ValidationError);
  });

  it('rejects invalid owner', () => {
    expect(() =>
      validateItem(makeInput({ owner: 'CEO' }), 0, 1, JIRA_BASE),
    ).toThrow(ValidationError);
  });

  it('rejects invalid target_phase', () => {
    expect(() =>
      validateItem(makeInput({ target_phase: 'Phase 99' }), 0, 1, JIRA_BASE),
    ).toThrow(ValidationError);
  });

  it('rejects malformed date', () => {
    expect(() =>
      validateItem(makeInput({ date_raised: '02-10-2026' }), 0, 1, JIRA_BASE),
    ).toThrow(ValidationError);
  });

  it('rejects empty required fields', () => {
    expect(() =>
      validateItem(makeInput({ area: '' }), 0, 1, JIRA_BASE),
    ).toThrow(ValidationError);
  });
});

describe('validateItems', () => {
  it('auto-assigns sequential IDs', () => {
    const inputs = [makeInput(), makeInput({ jira_key: 'SF-200' })];
    const items = validateItems(inputs, JIRA_BASE);
    expect(items[0].id).toBe('QA-001');
    expect(items[1].id).toBe('QA-002');
  });

  it('continues sequence from existing items', () => {
    const existing = [makeItem({ id: 'QA-010' })];
    const inputs = [makeInput()];
    const items = validateItems(inputs, JIRA_BASE, existing);
    expect(items[0].id).toBe('QA-011');
  });

  it('throws on empty array', () => {
    expect(() => validateItems([], JIRA_BASE)).toThrow('non-empty');
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------
describe('sortItems', () => {
  const items = [
    makeItem({ dateRaised: '2026-02-01', area: 'Workflow', jiraKey: 'SF-200', decision: 'Accepted' }),
    makeItem({ dateRaised: '2026-01-15', area: 'API', jiraKey: 'SF-100', decision: 'Deferred' }),
    makeItem({ dateRaised: '2026-03-01', area: 'Search', jiraKey: 'SF-50', decision: 'Rejected' }),
  ];

  it('sorts by date_raised descending (default)', () => {
    const sorted = sortItems(items);
    expect(sorted.map((i) => i.dateRaised)).toEqual([
      '2026-03-01',
      '2026-02-01',
      '2026-01-15',
    ]);
  });

  it('sorts by date_raised ascending', () => {
    const sorted = sortItems(items, 'date_raised', true);
    expect(sorted.map((i) => i.dateRaised)).toEqual([
      '2026-01-15',
      '2026-02-01',
      '2026-03-01',
    ]);
  });

  it('sorts by area descending', () => {
    const sorted = sortItems(items, 'area');
    expect(sorted.map((i) => i.area)).toEqual(['Workflow', 'Search', 'API']);
  });

  it('sorts by jira_key using natural ordering', () => {
    const sorted = sortItems(items, 'jira_key', true);
    expect(sorted.map((i) => i.jiraKey)).toEqual(['SF-50', 'SF-100', 'SF-200']);
  });

  it('sorts by decision', () => {
    const sorted = sortItems(items, 'decision', true);
    expect(sorted.map((i) => i.decision)).toEqual([
      'Accepted',
      'Deferred',
      'Rejected',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------
describe('dedupeByJiraKey', () => {
  it('keeps last occurrence for duplicate keys', () => {
    const items = [
      makeItem({ jiraKey: 'SF-100', notes: 'first' }),
      makeItem({ jiraKey: 'SF-200', notes: 'unique' }),
      makeItem({ jiraKey: 'SF-100', notes: 'updated' }),
    ];
    const deduped = dedupeByJiraKey(items);
    expect(deduped).toHaveLength(2);
    expect(deduped.find((i) => i.jiraKey === 'SF-100')?.notes).toBe('updated');
  });

  it('returns all items when no duplicates', () => {
    const items = [
      makeItem({ jiraKey: 'SF-100' }),
      makeItem({ jiraKey: 'SF-200' }),
    ];
    expect(dedupeByJiraKey(items)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Confluence Renderer
// ---------------------------------------------------------------------------
describe('confluence renderer', () => {
  it('renders a compact summary table with 7 columns', () => {
    const html = renderConfluenceSummary([makeItem()]);
    expect(html).toContain('class="wrapped confluenceTable"');
    expect(html).toContain('border-collapse:collapse');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('QA-001');
    expect(html).toContain('Area');
    expect(html).toContain('Decision');
    expect(html).not.toContain('QA Observation');
    expect(html).not.toContain('Risk if Not Implemented');
  });

  it('produces a clickable Jira link in summary', () => {
    const html = renderConfluenceSummary([makeItem({ jiraKey: 'SF-100', jiraUrl: 'https://example.com/browse/SF-100' })]);
    expect(html).toContain('<a href="https://example.com/browse/SF-100">SF-100</a>');
  });

  it('renders expandable detail panels with observation and risk', () => {
    const html = renderConfluenceDetails([makeItem({ observation: 'Test obs', risk: 'Test risk' })]);
    expect(html).toContain('ac:name="expand"');
    expect(html).toContain('QA-001');
    expect(html).toContain('Test obs');
    expect(html).toContain('Test risk');
  });

  it('escapes XML special characters in detail panels', () => {
    const html = renderConfluenceDetails([
      makeItem({ observation: 'Field <Account> & "Name" has issues' }),
    ]);
    expect(html).toContain('&lt;Account&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;Name&quot;');
    expect(html).not.toContain('<Account>');
  });

  it('renders decision badges with background colors', () => {
    const html = renderConfluenceTable([
      makeItem({ decision: 'Deferred' }),
      makeItem({ decision: 'Accepted', jiraKey: 'SF-200' }),
      makeItem({ decision: 'Rejected', jiraKey: 'SF-300' }),
    ]);
    expect(html).toContain('background-color:#fff0b3');
    expect(html).toContain('background-color:#e3fcef');
    expect(html).toContain('background-color:#ffebe6');
  });

  it('omits Notes row when notes are empty', () => {
    const html = renderConfluenceDetails([makeItem({ notes: '' })]);
    expect(html).not.toContain('<strong>Notes</strong>');
  });

  it('includes Notes row when notes are present', () => {
    const html = renderConfluenceDetails([makeItem({ notes: 'Some note' })]);
    expect(html).toContain('<strong>Notes</strong>');
    expect(html).toContain('Some note');
  });
});

// ---------------------------------------------------------------------------
// Markdown Renderer
// ---------------------------------------------------------------------------
describe('markdown renderer', () => {
  it('renders a compact summary table with 7 columns', () => {
    const md = renderMarkdownSummary([makeItem()]);
    expect(md).toContain('| ID |');
    expect(md).toContain('| Area |');
    expect(md).toContain('| --- |');
    expect(md).toContain('**QA-001**');
    expect(md).not.toContain('QA Observation');
    expect(md).not.toContain('Risk if Not Implemented');
  });

  it('produces a clickable Jira link in markdown', () => {
    const md = renderMarkdownSummary([makeItem()]);
    expect(md).toContain('[SF-100](https://accelins.atlassian.net/browse/SF-100)');
  });

  it('escapes pipe characters in cell values', () => {
    const md = renderMarkdownSummary([makeItem({ area: 'Search | Filters' })]);
    expect(md).toContain('Search \\| Filters');
  });
});
