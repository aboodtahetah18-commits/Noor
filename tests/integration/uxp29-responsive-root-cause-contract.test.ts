import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

const globals = read('src/app/globals.css');
const governance = read('src/app/uiux-governance.css');
const compactFilter = read('src/components/ui/compact-filter-panel.tsx');
const mobileTopBar = read('src/app/(protected)/mobile-top-bar.tsx');

describe('UX-P29 systemic responsive root-cause contract', () => {
  it('uses one canonical breakpoint contract across CSS and JS', () => {
    expect(governance).toContain('@media(max-width:767px)');
    expect(governance).toContain('@media(min-width:768px) and (max-width:1023px)');
    expect(governance).toContain('@media(min-width:1024px)');
    expect(compactFilter).toContain("window.matchMedia('(min-width: 768px)')");
    expect(compactFilter).not.toContain('769px');
  });

  it('forces the correct navigation shell at 767/768/1024 boundaries', () => {
    expect(governance).toContain('.desktop-top-nav-wrap,.tablet-top-nav-wrap{display:none!important;}');
    expect(governance).toContain('.mobile-bottom-nav{display:grid!important;}');
    expect(governance).toContain('.desktop-top-nav-wrap,.p47-mobile-topbar,.mobile-bottom-nav{display:none!important;}');
    expect(governance).toContain('.tablet-top-nav-wrap{display:block!important;}');
    expect(governance).toContain('.desktop-top-nav-wrap.p47-desktop-sidebar{display:block!important;}');
  });

  it('keeps the mobile header RTL-safe with the approved profile trigger', () => {
    expect(mobileTopBar).toContain('dir="rtl"');
    expect(mobileTopBar).toContain('ProfileTrigger');
    expect(mobileTopBar).toContain('mustaqbali-mobile-profile-trigger');
    expect(mobileTopBar).toContain('mustaqbali-mobile-menu-trigger');
    expect(mobileTopBar).toContain('mustaqbali-mobile-brand-zone');
    expect(globals).toContain('grid-template-columns:minmax(0,1fr) auto!important');
    expect(globals).toContain('max-inline-size:100vw!important');
    expect(globals).toContain('text-overflow:ellipsis!important');
    expect(globals).toContain('min-inline-size:0!important');
    expect(globals).not.toContain('grid-template-columns:38px minmax(0,1fr) auto');
  });
});
