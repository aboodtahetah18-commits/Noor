import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('approved Namaa NDOS v1.2 FINAL brand identity contract', () => {
  it('uses the frozen transparent Namaa marks for light and dark surfaces', () => {
    const logo = read('src/components/brand/brand-logo.tsx');
    expect(logo).toContain("const LIGHT_LOGO = '/brand/ndos/namaa-logo-color-transparent.png'");
    expect(logo).toContain("const DARK_LOGO = '/brand/ndos/namaa-logo-white-transparent.png'");
    expect(logo).toContain('alt="نماء"');
    expect(logo).toContain('width={128}');
    expect(logo).toContain('height={64}');
    expect(logo).not.toContain('namaa-logo-official.png');
    expect(logo).not.toContain('mustaqbali-logo');
  });

  it('keeps the login hero free from the retired Mustaqbali wordmark and tagline', () => {
    const login = read('src/app/(public)/login/page.tsx');
    expect(login).toContain('<BrandLogo surface="dark"');
    expect(login).not.toContain('<h1>مستقبلي</h1>');
    expect(login).not.toContain('أدر مالك');
  });

  it('uses the approved transparent Namaa identity for browser and app metadata', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).toContain("title: 'نماء'");
    expect(layout).toContain("const approvedTransparentLogo = '/brand/ndos/namaa-logo-color-transparent.png'");
    expect(layout).toContain('icon: approvedTransparentLogo');
    expect(layout).toContain('apple: approvedTransparentLogo');
    expect(layout).not.toContain('namaa-logo-official.png');
    expect(layout).toContain('Noto_Sans_Arabic');
  });
});
