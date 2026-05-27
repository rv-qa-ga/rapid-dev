import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { readSanityPlan, writeSanityPlan, type SanityPlan } from '../../src/integrations/lloyds/sanityPlanner';

describe('readSanityPlan localXmlPath', () => {
  let tmp: string | null = null;
  afterEach(() => {
    if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp);
    tmp = null;
  });

  it('resolves repo-relative localXmlPath to an absolute path that exists', () => {
    const minimal: SanityPlan = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      dataverseHost: 'test',
      blobContainer: 'https://example.blob.core.windows.net/mulesoft-xml',
      credentialSource: 'test',
      masterData: {
        legalEntities: { count: 0, codes: [] },
        repositoryFiles: { count: 0, codes: [], codesTruncated: false, codesSampleSize: 0 },
      },
      blobs: { xmlCount: 1 },
      runnable: [
        {
          index: 0,
          name: 'AEUM US-56464 202604301600.xml',
          blobUrl: 'https://example.blob.core.windows.net/mulesoft-xml/AEUM US-56464 202604301600.xml',
          sizeBytes: 1,
          lastModified: null,
          ledger: 'AUMI',
          repoId: 'US-56464',
          stamp: '202604301600',
          legalEntityId: 'x',
          repositoryFileId: 'y',
          legalEntityName: 'AUMI',
          repositoryFileName: 'US-56464',
          localXmlPath: 'docs/lloyds/XMLs/AEUM US-56464 202604301600.xml',
        },
      ],
      blocked: [],
    };
    tmp = path.join(os.tmpdir(), `sanity-plan-read-test-${Date.now()}.json`);
    writeSanityPlan(minimal, tmp);
    const plan = readSanityPlan(tmp);
    expect(plan).not.toBeNull();
    const p = plan!.runnable[0].localXmlPath;
    expect(path.isAbsolute(p!)).toBe(true);
    expect(fs.existsSync(p!)).toBe(true);
  });
});
