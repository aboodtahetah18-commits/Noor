import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

const globals = read('src/app/globals.css');
const governance = read('src/app/uiux-governance.css');
const shell = read('src/app/namaa-app-shell.css');
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
    expect(shell).toContain('@media (max-width:767px)');
    expect(shell).toContain('.mobile-bottom-nav.namaa-mobile-bottom-nav');
    expect(shell).toContain('@media (min-width:768px) and (max-width:1023px)');
    expect(shell).toContain('.tablet-top-nav-wrap {');
    expect(shell).toContain('@media (min-width:1024px)');
    expect(shell).toContain('.desktop-top-nav-wrap.namaa-sidebar {');
  });

  it('keeps the mobile header RTL-safe with the approved profile trigger', () => {
    expect(mobileTopBar).toContain('dir="rtl"');
    expect(mobileTopBar).toContain('ProfileTrigger');
    expect(mobileTopBar).toContain('namaa-mobile-profile-trigger');
    expect(mobileTopBar).toContain('namaa-mobile-menu-trigger');
    expect(mobileTopBar).toContain('namaa-mobile-brand-zone');
    expect(shell).toContain('grid-template-columns:minmax(0,1fr) auto !important');
    expect(shell).toContain('max-inline-size:100vw !important');
    expect(shell).toContain('min-inline-size:0 !important');
    expect(globals).not.toContain('grid-template-columns:38px minmax(0,1fr) auto');
  });
});
