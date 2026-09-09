import { describe, expect, it } from 'vitest';
import { healthcheck } from '../../src/lib/runtime';

describe('foundation runtime', () => {
  it('exposes the V1 base currency and timezone', () => {
    expect(healthcheck()).toEqual({
      app: 'personal-finance-advisor',
      status: 'ok',
      baseCurrency: 'SAR',
      timezone: 'Asia/Riyadh',
    });
  });
});
