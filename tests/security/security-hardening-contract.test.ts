import { describe, expect, it } from 'vitest';
import { safeReturnTo } from '@/auth/safe-return-to';
import { sanitizeMetadata } from '@/security/safe-logging';

 describe('Phase 37 security contracts', () => {
  it('blocks external/open redirects', () => {
    expect(safeReturnTo('https://evil.example')).toBe('/dashboard');
    expect(safeReturnTo('//evil.example')).toBe('/dashboard');
    expect(safeReturnTo('/transactions')).toBe('/transactions');
  });

  it('redacts secrets and financial values from technical logging metadata', () => {
    const safe = sanitizeMetadata({ authorization: 'Bearer secret', amount: '9999.00', endpoint: '/x' });
    expect(safe.authorization).toBe('[REDACTED]');
    expect(safe.amount).toBe('[SENSITIVE]');
    expect(safe.endpoint).toBe('/x');
  });
});
