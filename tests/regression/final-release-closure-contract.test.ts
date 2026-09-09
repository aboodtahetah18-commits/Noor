import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('final release closure contract', () => {
  it('keeps current-state documentation separate from historical phase records', () => {
    const status = read('CURRENT_RELEASE_STATUS.md');
    const issues = read('CURRENT_KNOWN_ISSUES.md');
    const readme = read('README.md');
    expect(status).toContain('V1.5.0');
    expect(issues).toContain('Runtime verification is pending');
    expect(readme).toContain('database/migrations/');
    expect(readme).not.toContain('supabase/migrations/');
  });

  it('requires a real accepted live report before final release sealing', () => {
    const seal = read('scripts/final-release-seal.mjs');
    expect(seal).toContain("report?.status !== 'accepted'");
    expect(seal).toContain('report?.failedChecks !== 0');
    expect(seal).toContain('report?.releaseVersion !== pkg.version');
    expect(seal).toContain("report.origin.startsWith('https://')");
    expect(seal).toContain('FINAL-RELEASE-SEAL-PASS');
  });

  it('retains the database readiness assertion in live production validation', () => {
    const live = read('scripts/live-production-validation.mjs');
    expect(live).toContain("readyBody?.database === 'reachable'");
  });
});
