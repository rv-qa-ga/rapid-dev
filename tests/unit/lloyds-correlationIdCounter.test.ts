import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { describe, expect, it } from 'vitest';

import { bumpCounter, readCounter } from '../../src/integrations/lloyds/correlationIdCounter';

describe('lloyds/correlationIdCounter bumpCounter', () => {
  it('increments lastCorrelationId in a temp file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lloyds-ctr-test-'));
    const file = path.join(dir, 'counter.json');
    fs.writeFileSync(
      file,
      `${JSON.stringify({ lastCorrelationId: '0000-0000-0000-03041', lastRunAt: null, lastXmlName: null, lastRow: null }, null, 2)}\n`,
      'utf-8',
    );
    const { correlationId } = bumpCounter({ xmlName: 'x.xml', row: 0, filePath: file });
    expect(correlationId).toBe('0000-0000-0000-03042');
    const after = readCounter(file);
    expect(after.lastCorrelationId).toBe('0000-0000-0000-03042');
  });
});
