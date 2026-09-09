import { describe, expect, it } from 'vitest';
import { Money, sumMoney } from '../../../src/financial-engine';

describe('Money', () => {
  it('parses exact two-decimal SAR values without floating point', () => {
    expect(Money.parse('0.01').minorUnits).toBe(1n);
    expect(Money.parse('0.10').minorUnits).toBe(10n);
    expect(Money.parse('1.99').minorUnits).toBe(199n);
    expect(Money.parse('999999.99').minorUnits).toBe(99_999_999n);
  });

  it('adds 0.10 + 0.20 exactly', () => {
    expect(Money.parse('0.10').add(Money.parse('0.20')).toString()).toBe('0.30');
  });

  it('sums signed money deterministically', () => {
    expect(sumMoney([Money.parse('10.00'), Money.parse('-2.25')]).toString()).toBe('7.75');
  });

  it('rejects more than two decimal places', () => {
    expect(() => Money.parse('1.001')).toThrow();
  });
});
