import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Stage 3 responsive full-platform app shell', () => {
  it('keeps authenticated shell structure and one shared mobile/tablet header', () => {
    const layout = read('src/app/(protected)/layout.tsx');
    const tablet = read('src/app/(protected)/tablet-top-nav.tsx');
    const bottom = read('src/app/(protected)/mobile-bottom-nav.tsx');

    expect(layout).toContain('data-responsive-platform="full"');
    expect(layout).toContain('<DesktopTopNav />');
    expect(layout).toContain('<TabletTopNav />');
    expect(layout).toContain('<MobileTopBar profile={profile} />');
    expect(layout).toContain('<MobileBottomNav />');

    expect(tablet).toContain('return null');
    expect(bottom).toContain('return null');
    expect(layout).not.toContain('MobileConversationGate');
    expect(layout).not.toContain('router.replace');
  });

  it('keeps direct system destinations in the shared responsive drawer', () => {
    const top = read('src/app/(protected)/mobile-top-bar.tsx');

    expect(top).toContain("import { Drawer } from '@/components/ui'");
    for (const route of [
      '/dashboard',
      '/conversations',
      '/accounts',
      '/transactions',
      '/budget',
      '/bank-operations',
      '/investments',
      '/reports',
      '/settings',
    ]) {
      expect(top).toContain(`href:'${route}'`);
    }
    expect(top).toContain('side="start"');
    expect(top).toContain('showCloseButton={false}');
  });

  it('keeps desktop isolated while mobile and tablet share one responsive authority', () => {
    const css = read('src/app/namaa-app-shell.css');

    expect(css).toContain('@media (min-width:1024px)');
    expect(css).toContain('@media (max-width:1023px)');
    expect(css).toContain('@media (min-width:768px) and (max-width:1023px)');
    expect(css).toContain('@media (max-width:767px)');
    expect(css).toContain('.namaa-responsive-topbar');
    expect(css).toContain('dialog.ux-drawer-surface.namaa-responsive-navigation-drawer');
    expect(css).toContain('right:0!important');
    expect(css).toContain('overflow-x:clip');
  });

  it('keeps desktop search and responsive utility placement available', () => {
    const desktop = read('src/app/(protected)/global-top-bar.tsx');
    const mobile = read('src/app/(protected)/mobile-top-bar.tsx');

    expect(desktop).toContain('role="search"');
    expect(desktop).toContain('ProfileTrigger');
    expect(desktop).toContain('ThemeToggle');
    expect(desktop).toContain('href="/alerts"');

    expect(mobile).toContain('ProfileTrigger');
    expect(mobile).toContain('ThemeToggle');
    expect(mobile).toContain('href="/alerts"');
    expect(mobile).toContain('namaa-responsive-page-title');
  });

  it('uses frozen token variables instead of raw palette values in shell authority', () => {
    const css = read('src/app/namaa-app-shell.css');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).toContain('var(--ux-shell-sidebar-bg)');
    expect(css).toContain('var(--ux-shell-topbar-bg)');
    expect(css).toContain('var(--ux-container-content)');
    expect(css).toContain('var(--ux-focus-ring)');
  });
});
