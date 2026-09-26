import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Stage 3 responsive full-platform app shell', () => {
  it('keeps authenticated shell structure and enables full mobile route rendering', () => {
    const layout = read('src/app/(protected)/layout.tsx');
    const gate = read('src/app/(protected)/mobile-conversation-gate.tsx');

    expect(layout).toContain('data-responsive-platform="full"');
    expect(layout).toContain('<DesktopTopNav />');
    expect(layout).toContain('<TabletTopNav profile={profile} />');
    expect(layout).toContain('<MobileTopBar profile={profile} />');
    expect(layout).toContain('<MobileBottomNav />');

    expect(gate).toContain('responsive_full_platform');
    expect(gate).not.toContain('router.replace');
    expect(gate).not.toContain("useRouter");
    expect(gate).not.toContain("matchMedia");
  });

  it('keeps a five-destination mobile bottom navigation and secondary routes in the shared drawer', () => {
    const bottom = read('src/app/(protected)/mobile-bottom-nav.tsx');
    const top = read('src/app/(protected)/mobile-top-bar.tsx');

    for (const route of ['/dashboard', '/accounts', '/transactions', '/budget', '/more']) {
      expect(bottom).toContain(`href: '${route}'`);
    }

    expect(top).toContain("import { Drawer } from '@/components/ui'");
    for (const route of ['/conversations','/bank-operations','/investments','/governance','/cases','/reports','/advisor','/internal-funding','/workspace','/alerts','/settings']) {
      expect(top).toContain(`'${route}'`);
    }
  });

  it('keeps dedicated desktop, tablet and mobile viewport compositions', () => {
    const css = read('src/app/namaa-app-shell.css');

    expect(css).toContain('@media (min-width:1024px)');
    expect(css).toContain('@media (min-width:768px) and (max-width:1023px)');
    expect(css).toContain('@media (max-width:767px)');
    expect(css).toContain('position:fixed');
    expect(css).toContain('.tablet-top-nav-wrap');
    expect(css).toContain('.mobile-bottom-nav.mustaqbali-mobile-bottom-nav');
    expect(css).toContain('grid-template-columns:repeat(5,minmax(0,1fr))');
    expect(css).toContain('overflow-x:clip');
  });

  it('keeps global search and utility placement available outside mobile', () => {
    const desktop = read('src/app/(protected)/global-top-bar.tsx');
    const tablet = read('src/app/(protected)/tablet-top-nav.tsx');
    const mobile = read('src/app/(protected)/mobile-top-bar.tsx');

    expect(desktop).toContain('role="search"');
    expect(desktop).toContain('ProfileTrigger');
    expect(desktop).toContain('ThemeToggle');
    expect(desktop).toContain('href="/alerts"');

    expect(tablet).toContain('role="search"');
    expect(tablet).toContain('ProfileTrigger');
    expect(tablet).toContain('ThemeToggle');

    expect(mobile).toContain('aria-label="البحث في نماء"');
    expect(mobile).toContain('ProfileTrigger');
    expect(mobile).toContain('ThemeToggle');
  });

  it('uses existing frozen token variables instead of raw palette values in the shell authority', () => {
    const css = read('src/app/namaa-app-shell.css');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).toContain('var(--ux-shell-sidebar-bg)');
    expect(css).toContain('var(--ux-shell-topbar-bg)');
    expect(css).toContain('var(--ux-container-content)');
    expect(css).toContain('var(--ux-focus-ring)');
  });
});
