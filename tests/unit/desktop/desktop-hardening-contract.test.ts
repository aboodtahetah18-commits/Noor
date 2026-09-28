import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'src/app/namaa-app-shell.css'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/app/(protected)/layout.tsx'), 'utf8');

describe('Desktop visual authority contract', () => {
  it('keeps one global desktop shell authority', () => {
    expect(shell).toContain('/* Desktop >= 1024: fixed right sidebar + fixed topbar. */');
    expect(shell).toContain('@media (min-width:1024px)');
    expect(css).not.toContain('/* Phase 33 — Desktop Hardening */');
    expect(css).not.toContain('.desktop-top-nav{height:100%;max-width:1320px');
    expect(css).not.toContain('.desktop-top-nav-wrap.p47-desktop-sidebar');
    expect(css).not.toContain('.p47-sidebar-add{width:100%');
    expect(css).not.toContain('.desktop-top-nav-wrap.p47-desktop-sidebar{width:238px');
    expect(css).not.toContain('background:var(--ux-action-primary)!important;color:var(--ux-action-primary)!important');
  });

  it('keeps mobile and desktop navigation mounted while CSS separates their viewports', () => {
    expect(layout).toContain('<DesktopTopNav />');
    expect(layout).toContain('<MobileBottomNav />');
    expect(shell).toContain('/* Mobile <768: light topbar + fixed five-item bottom navigation + shared Drawer. */');
  });

  it('hardens legacy desktop workspaces without touching the modern dashboard module', () => {
    expect(css).toContain('/* Desktop workspace hardening — legacy p47 pages only.');
    expect(css).toContain('.protected-app-shell .p47-page>.p47-content-shell');
    expect(css).toContain('.protected-app-shell .p47-settings-reference-grid');
    expect(css).toContain('grid-template-columns:repeat(3,minmax(0,1fr))');
    expect(css).toContain('overscroll-behavior-inline:contain');
  });

  it('retains desktop page density without redefining shell geometry', () => {
    expect(css).toContain('.dashboard-main-grid{grid-template-columns:minmax(0,1.35fr)');
    expect(css).toContain('.transaction-filter-grid{grid-template-columns:repeat(4');
    expect(css).toContain('position:sticky;top:0');
    expect(css).toContain('@media(min-width:1440px)');
    expect(css).toContain('max-width:1300px');
  });
});
