import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const requiredPages = [
  'src/app/(protected)/dashboard/page.tsx',
  'src/app/(protected)/accounts/page.tsx',
  'src/app/(protected)/income/page.tsx',
  'src/app/(protected)/budget/page.tsx',
  'src/app/(protected)/transactions/page.tsx',
  'src/app/(protected)/obligations/page.tsx',
  'src/app/(protected)/savings/page.tsx',
  'src/app/(protected)/emergency/page.tsx',
  'src/app/(protected)/goals/page.tsx',
  'src/app/(protected)/advisor/page.tsx',
  'src/app/(protected)/reports/page.tsx',
  'src/app/(protected)/settings/page.tsx',
] as const;

const criticalTests = [
  'tests/unit/financial-engine/p56-financial-policy.test.ts',
  'tests/unit/state-machines/workflow-state-machine.test.ts',
  'tests/unit/state-machines/p57-transition-completeness.test.ts',
  'tests/integration/p57-critical-write-integrity-contract.test.ts',
  'tests/security/p57-security-boundary-contract.test.ts',
  'tests/accessibility/accessibility-audit-contract.test.ts',
  'tests/integration/mobile-hardening-contract.test.ts',
  'tests/unit/tablet/tablet-hardening-contract.test.ts',
  'tests/unit/desktop/desktop-hardening-contract.test.ts',
  'tests/database/migration-contract.test.ts',
] as const;

describe('P57 complete product journey regression', () => {
  it.each(requiredPages)('keeps %s reachable in the protected product', (file) => {
    expect(existsSync(file)).toBe(true);
  });

  it.each(criticalTests)('retains critical verification %s', (file) => {
    expect(existsSync(file)).toBe(true);
  });

  it('keeps financial cycle closing connected to immutable snapshots', () => {
    const closing = readFileSync('src/features/cycles/services/cycle-closing-service.ts', 'utf8');
    const rollover = readFileSync('src/features/cycles/services/cycle-rollover-service.ts', 'utf8');
    expect(closing).toContain('getActiveFinancialBufferPolicy');
    expect(rollover).toContain('financial_health_score');
    expect(rollover).toContain('calculateFinancialHealth');
    expect(rollover).toContain("source:'FINALIZED_FINANCIAL_SNAPSHOT'");
  });

  it('keeps production quality gate ordered before migration execution', () => {
    const vercel = readFileSync('vercel.json', 'utf8');
    expect(vercel).toContain('npm run vercel:build');
    expect(vercel).not.toContain('deploy:migrate');
  });
});
