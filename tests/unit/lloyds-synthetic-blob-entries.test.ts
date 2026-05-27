import * as path from 'path';

import { describe, expect, it } from 'vitest';

import { buildSyntheticXmlBlobEntriesFromLocalDir } from '../../src/integrations/lloyds/blobContainerClient';

const XML_DIR = path.resolve(process.cwd(), 'docs/lloyds/XMLs');

describe('buildSyntheticXmlBlobEntriesFromLocalDir', () => {
  it('returns sorted XmlBlobEntry rows for parseable *.xml names (no Azure list)', () => {
    const entries = buildSyntheticXmlBlobEntriesFromLocalDir(XML_DIR, process.env);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const names = entries.map((e) => e.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    for (const e of entries) {
      expect(e.name.toLowerCase().endsWith('.xml')).toBe(true);
      expect(e.url).toContain(encodeURIComponent(e.name).replace(/%20/g, ' '));
      expect(e.sizeBytes).toBeGreaterThan(0);
      expect(e.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});
