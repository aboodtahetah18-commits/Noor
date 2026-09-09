import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string): string[] {
  const output: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) output.push(...walk(path));
    else output.push(path);
  }
  return output;
}

describe('P57 security boundary audit', () => {
  const sourceFiles = walk('src').filter((file) => /\.(ts|tsx)$/.test(file));

  it('keeps dangerous raw HTML out of runtime source', () => {
    for (const file of sourceFiles) {
      expect(readFileSync(file, 'utf8'), file).not.toContain('dangerouslySetInnerHTML');
    }
  });

  it('keeps secret-like environment names out of public client variables', () => {
    for (const file of sourceFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/NEXT_PUBLIC_.*(?:SECRET|TOKEN|DATABASE|API_KEY)/i);
    }
  });

  it('requires protected action modules to cross an authenticated mutation boundary', () => {
    const actions = walk('src/app/(protected)').filter((file) => file.endsWith('actions.ts'));
    expect(actions.length).toBeGreaterThan(0);
    for (const file of actions) {
      const source = readFileSync(file, 'utf8');
      expect(
        source.includes('requireAuthenticatedMutationUser') || source.includes('assertTrustedMutationOrigin'),
        file,
      ).toBe(true);
    }
  });

  it('retains production browser security headers', () => {
    const config = readFileSync('next.config.ts', 'utf8');
    for (const header of [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'X-Frame-Options',
      'Strict-Transport-Security',
    ]) {
      expect(config, header).toContain(header);
    }
  });
});
