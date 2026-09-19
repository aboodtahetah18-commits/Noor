import { describe, expect, it } from 'vitest';
import {
  MATCHING_TOLERANCE_ALLOWED_DAYS,
  MATCHING_TOLERANCE_POLICY_REF,
  normalizeMatchingToleranceDays,
} from '@/lib/settings/user-preferences';

describe('governed user preferences',()=>{
  it('exposes only the approved POL-RC-001 matching tolerance values',()=>{
    expect(MATCHING_TOLERANCE_POLICY_REF).toBe('POL-RC-001');
    expect(MATCHING_TOLERANCE_ALLOWED_DAYS).toEqual([2,3]);
  });

  it('accepts the two approved tolerance values',()=>{
    expect(normalizeMatchingToleranceDays(2)).toBe(2);
    expect(normalizeMatchingToleranceDays('3')).toBe(3);
  });

  it('rejects values outside the approved range instead of clamping or guessing',()=>{
    expect(()=>normalizeMatchingToleranceDays(1)).toThrow('MATCHING_TOLERANCE_INVALID');
    expect(()=>normalizeMatchingToleranceDays(4)).toThrow('MATCHING_TOLERANCE_INVALID');
    expect(()=>normalizeMatchingToleranceDays('')).toThrow('MATCHING_TOLERANCE_INVALID');
  });
});
