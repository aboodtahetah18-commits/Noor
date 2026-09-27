import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('compact Namaa login reference', () => {
  it('uses one centered login card and removes the former split visual hero', () => {
    const page = read('src/app/(public)/login/page.tsx');
    expect(page).toContain('className={styles.card}');
    expect(page).toContain('<BrandLogo surface="dark"');
    expect(page).toContain('lockKeyhole');
    expect(page).not.toContain('styles.visual');
    expect(page).not.toContain('styles.featureStrip');
  });

  it('keeps the real email/password login flow and governed tokens', () => {
    const form = read('src/app/(public)/login/login-form.tsx');
    const css = read('src/app/(public)/login/login.module.css');

    expect(form).toContain('name="email"');
    expect(form).toContain('name="password"');
    expect(form).toContain("fetch('/api/auth/login'");
    expect(css).toContain('place-items:center');
    expect(css).toContain('var(--ux-card-bg)');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
