import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file: string) => fs.existsSync(path.join(root, file));

describe('P58 full UAT journey contract', () => {
  it('covers the complete V1 financial journey in order', () => {
    const journey = [
      ['onboarding', 'src/app/(protected)/onboarding/page.tsx'],
      ['accounts', 'src/app/(protected)/accounts/page.tsx'],
      ['income', 'src/app/(protected)/income/page.tsx'],
      ['budget', 'src/app/(protected)/budget/page.tsx'],
      ['expenses', 'src/app/(protected)/expenses/page.tsx'],
      ['obligations', 'src/app/(protected)/obligations/page.tsx'],
      ['savings', 'src/app/(protected)/savings/page.tsx'],
      ['emergency', 'src/app/(protected)/emergency/page.tsx'],
      ['goals', 'src/app/(protected)/goals/page.tsx'],
      ['advisor', 'src/app/(protected)/advisor/page.tsx'],
      ['reports', 'src/app/(protected)/reports/page.tsx'],
      ['dashboard', 'src/app/(protected)/dashboard/page.tsx'],
    ] as const;
    for (const [, file] of journey) expect(exists(file), file).toBe(true);
  });

  it('keeps every critical UAT write behind authenticated server actions', () => {
    const actionFiles = [
      'src/app/(protected)/accounts/actions.ts',
      'src/app/(protected)/income/actions.ts',
      'src/app/(protected)/budget/actions.ts',
      'src/app/(protected)/expenses/actions.ts',
      'src/app/(protected)/obligations/actions.ts',
      'src/app/(protected)/savings/actions.ts',
      'src/app/(protected)/emergency/actions.ts',
      'src/app/(protected)/goals/actions.ts',
      'src/app/(protected)/cycles/actions.ts',
      'src/app/(protected)/settings/actions.ts',
    ];
    for (const file of actionFiles) {
      const source = read(file);
      expect(source, file).toContain("'use server'");
      expect(source, file).toMatch(/requireAuthenticatedMutationUser|requireAuthenticatedUser/);
    }
  });

  it('retains explicit cycle activation and closing lifecycle', () => {
    const repository = read('src/repositories/financial-cycle-repository.ts');
    expect(repository).toContain("status='ACTIVE'");
    expect(repository).toContain("status='CLOSING'");
    expect(repository).toContain('START_CLOSING');
    expect(repository).toContain('ACTIVATE_CYCLE');
    const closing = read('tests/integration/cycle-closing-contract.test.ts');
    expect(closing).toContain('CLOSING');
    expect(closing).toMatch(/snapshot/i);
  });

  it('keeps P56 financial outputs in the UAT-critical path', () => {
    const dashboard = read('src/app/(protected)/dashboard/page.tsx');
    expect(dashboard).toMatch(/safe|آمن/i);
    const health = read('src/financial-engine/financial-health.ts');
    expect(health).toMatch(/score|health/i);
    const forecast = read('src/forecast/index.ts');
    expect(forecast).toContain('ForecastResolvedResult');
  });
});
