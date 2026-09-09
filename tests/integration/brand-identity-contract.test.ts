import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('final Mustaqbali brand identity contract', () => {
  it('uses the icon-only final symbol as the default brand asset', () => {
    const logo = read('src/components/brand/brand-logo.tsx');
    expect(logo).toContain("const DEFAULT_SYMBOL = '/brand/mustaqbali-brand-symbol.png'");
    expect(logo).not.toContain("'/brand/mustaqbali-logo-white-compact.png'");
  });

  it('keeps the login hero free from a duplicate Mustaqbali wordmark and the retired tagline', () => {
    const login = read('src/app/(public)/login/page.tsx');
    expect(login).toContain('<BrandLogo surface="dark"');
    expect(login).not.toContain('<h1>مستقبلي</h1>');
    expect(login).not.toContain('أدر مالك');
  });

  it('uses the final symbol for browser and app metadata', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).toContain("icon: '/brand/mustaqbali-brand-symbol.png'");
    expect(layout).toContain("apple: '/brand/mustaqbali-brand-symbol.png'");
  });
});
