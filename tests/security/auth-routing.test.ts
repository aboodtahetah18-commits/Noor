import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('authentication routing security', () => {
  it('does not protect the root layout globally', () => {
    expect(read('src/app/layout.tsx')).not.toContain('requireAuthenticatedUser');
  });

  it('sanitizes return_to values', () => {
    const helper = read('src/auth/safe-return-to.ts');
    expect(helper).toContain("value.startsWith('//')");
    expect(helper).toContain("value.includes('\\\\')");
  });
});
