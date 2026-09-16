import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('approved Namaa NDOS v1.2 FINAL brand identity contract', () => {
  it('uses the frozen official Namaa mark as the default brand asset', () => {
    const logo = read('src/components/brand/brand-logo.tsx');
    expect(logo).toContain("const DEFAULT_LOGO = '/brand/ndos/namaa-logo-official.png'");
    expect(logo).toContain('alt="نماء"');
    expect(logo).not.toContain("'/brand/mustaqbali-logo-white-compact.png'");
  });

  it('keeps the login hero free from the retired Mustaqbali wordmark and tagline', () => {
    const login = read('src/app/(public)/login/page.tsx');
    expect(login).toContain('<BrandLogo surface="dark"');
    expect(login).not.toContain('<h1>مستقبلي</h1>');
    expect(login).not.toContain('أدر مالك');
  });

  it('uses the approved Namaa identity for browser and app metadata', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).toContain("title: 'نماء'");
    expect(layout).toContain("icon: '/brand/ndos/namaa-logo-official.png'");
    expect(layout).toContain("apple: '/brand/ndos/namaa-logo-official.png'");
    expect(layout).toContain("Noto_Sans_Arabic");
  });
});
