import { describe, expect, it } from 'vitest';
import { withinAbs, withinAbsMagnitude } from '../../../src/integrations/lloyds/lloydsAmountCompare';

describe('lloydsAmountCompare', () => {
  it('withinAbsMagnitude treats opposite signs as equal when magnitudes match', () => {
    expect(withinAbsMagnitude(20512.8, -20512.8, 5)).toBe(true);
    expect(withinAbsMagnitude(-100, 100, 0)).toBe(true);
  });

  it('withinAbsMagnitude still enforces tolerance on magnitudes', () => {
    expect(withinAbsMagnitude(100, -104, 5)).toBe(true);
    expect(withinAbsMagnitude(100, -106, 5)).toBe(false);
  });

  it('withinAbs remains sign-sensitive', () => {
    expect(withinAbs(5, 5, 0)).toBe(true);
    expect(withinAbs(5, -5, 0)).toBe(false);
  });
});
