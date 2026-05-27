import { describe, expect, it } from 'vitest';

import {
  dataverseCanonicalGuidForSanityCorrelationId,
  formatCorrelationId,
} from '../../src/integrations/lloyds/correlationIdCounter';

describe('dataverseCanonicalGuidForSanityCorrelationId', () => {
  it('maps sanity literal to canonical GUID last segment (hex of decimal counter)', () => {
    expect(dataverseCanonicalGuidForSanityCorrelationId('0000-0000-0000-03034')).toBe(
      '00000000-0000-0000-0000-000000000bda',
    );
  });

  it('returns null for non-sanity ids', () => {
    expect(dataverseCanonicalGuidForSanityCorrelationId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBeNull();
  });

  it('round-trips formatCorrelationId suffix', () => {
    const id = formatCorrelationId(3034);
    expect(id).toBe('0000-0000-0000-03034');
    expect(dataverseCanonicalGuidForSanityCorrelationId(id)).toBe('00000000-0000-0000-0000-000000000bda');
  });
});
