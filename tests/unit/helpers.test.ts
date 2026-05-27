import { describe, expect, it } from 'vitest';
import {
  formatDate,
  parseJiraKey,
  extractTags,
  extractProjectPrefix,
  formatTimestamp,
} from '../../src/utils/helpers';

describe('utils/helpers', () => {
  it('formats dates using YYYY-MM-DD by default', () => {
    const date = new Date('2023-11-29T10:00:00Z');
    expect(formatDate(date)).toBe('2023-11-29');
  });

  it('parses Jira keys from tags', () => {
    expect(parseJiraKey('@SF-201')).toBe('SF-201');
    expect(parseJiraKey('@BADFORMAT')).toBeNull();
  });

  it('extracts all tags from a string', () => {
    const text = '@ui @api @SF-201 some text';
    expect(extractTags(text)).toEqual(['@ui', '@api', '@SF-201']);
  });

  it('produces a sortable timestamp format', () => {
    const timestamp = formatTimestamp(new Date('2023-11-29T10:15:30.500Z'));
    expect(timestamp).toMatch(/^2023-11-29T10-15-30-500Z$/);
  });

  it('extractProjectPrefix handles Jira keys and PP-392-style Zephyr ids', () => {
    expect(extractProjectPrefix('SF-520')).toBe('SF');
    expect(extractProjectPrefix('PP-392')).toBe('PP');
    expect(extractProjectPrefix('PP-392-API-001')).toBe('PP');
    expect(extractProjectPrefix('SF-872-UI-015')).toBe('SF');
    expect(extractProjectPrefix('not-a-key')).toBeNull();
  });
});

