import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'src/app/namaa-app-shell.css'), 'utf8');
const governance = fs.readFileSync(path.join(root, 'src/app/uiux-governance.css'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/app/(protected)/layout.tsx'), 'utf8');

describe('Desktop visual authority contract', () => {
  it('keeps one global desktop shell authority', () => {
    expect(shell).toContain('/* Desktop >= 1024: fixed right sidebar + fixed topbar. */');
    expect(shell).toContain('@media (min-width:1024px)');
    expect(css).not.toContain('/* Phase 33 — Desktop Hardening */');
    expect(css).not.toContain('.desktop-top-nav{height:100%;max-width:1320px');
    expect(css).not.toContain('.desktop-top-nav-wrap.p47-desktop-sidebar');
    expect(css).not.toContain('.p47-sidebar-add{width:100%');
    expect(css).not.toContain('.desktop-top-nav-wrap.p47-desktop-sidebar');
    expect(css).not.toContain('.protected-app-shell>#main-content{margin-inline-start');
    expect(css).not.toContain('/* desktop sidebar */');
    expect(governance).not.toContain('p47-desktop-sidebar');
    expect(governance).not.toContain('margin-inline-start:var(--ux-space-24)');
    expect(governance).toContain('Desktop shell geometry is governed exclusively by namaa-app-shell.css');
    expect(governance).not.toContain('.tablet-top-nav-wrap{display:block!important');
    expect(governance).not.toContain('.p47-mobile-topbar,.mobile-bottom-nav{display:flex!important');
    expect(governance).not.toContain('p47-sidebar-add');
    expect(governance).not.toContain('p47-sidebar-nav');
    expect(governance).not.toContain('p47-sidebar-footer');
    expect(shell).toContain('@media (min-width:1024px)');

    expect(css).not.toContain('background:var(--ux-action-primary)!important;color:var(--ux-action-primary)!important');
  });

  it('keeps expanded desktop navigation labels visible and active state readable', () => {
    expect(shell).toContain('html[data-sidebar="expanded"] .mustaqbali-nav-label');
    expect(shell).toContain('text-overflow:ellipsis');
    expect(shell).toContain('.mustaqbali-sidebar-nav a.is-active .mustaqbali-nav-icon');
    expect(shell).toContain('color:var(--ux-text-inverse)');
    expect(shell).toContain('.mustaqbali-topbar-actions > a:focus-visible');
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

  it('keeps legacy desktop content contrast readable', () => {
    expect(css).toContain('.p47-progress-row span,.p47-progress-row small{color:var(--ux-text-inverse)');
    expect(css).toContain('.p47-budget-hero-progress>div:first-child{height:var(--ux-size-4);overflow:hidden;border-radius:var(--ux-radius-6);background:var(--ux-border-default)');
    expect(css).not.toContain('background:var(--ux-action-primary)!important;color:var(--ux-color-ink)!important');
  });

  it('keeps shared visual tokens contrast-safe at their source', () => {
    expect(css).not.toContain('.mobile-bottom-nav>a.is-active{color:var(--ux-action-primary);background:var(--ux-action-primary)');
    expect(css).not.toContain('background:var(--ux-action-primary)!important;color:var(--ux-action-primary)!important');
    expect(css).toContain('.auth-form-v42 input:focus{outline:var(--ux-border-width-0);border-color:var(--ux-action-primary);background:var(--ux-surface-default);color:var(--ux-text-primary)');
    expect(css).toContain('.p74-next-step a{display:inline-flex');
    expect(css).toContain('background:var(--ux-action-primary);color:var(--ux-text-inverse)');
  });

  it('retains desktop page density without redefining shell geometry', () => {
    expect(css).toContain('.dashboard-main-grid{grid-template-columns:minmax(0,1.35fr)');
    expect(css).toContain('.transaction-filter-grid{grid-template-columns:repeat(4');
    expect(css).toContain('position:sticky;top:0');
    expect(css).toContain('@media(min-width:1440px)');
    expect(css).toContain('max-width:1300px');
  });
});
