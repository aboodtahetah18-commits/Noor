import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'src/app/namaa-app-shell.css'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/app/(protected)/layout.tsx'), 'utf8');
const tabletNav = fs.readFileSync(path.join(root, 'src/app/(protected)/tablet-top-nav.tsx'), 'utf8');
const mobileTop = fs.readFileSync(path.join(root, 'src/app/(protected)/mobile-top-bar.tsx'), 'utf8');

describe('tablet responsive hardening contract', () => {
  it('shares mobile navigation chrome while preserving tablet geometry', () => {
    expect(layout).toContain('<TabletTopNav />');
    expect(layout).toContain('<MobileTopBar profile={profile} />');
    expect(layout).toContain('<DesktopTopNav />');

    expect(tabletNav).toContain('return null');
    expect(shell).toContain('@media (min-width:768px) and (max-width:1023px)');
    expect(shell).toContain('.namaa-responsive-navigation-drawer');
    expect(shell).toContain('width:44vw!important');
    expect(mobileTop).toContain('side="start"');
    expect(mobileTop).toContain('namaa-responsive-page-title');
  });

  it('uses tablet-specific grids rather than blindly inheriting mobile or desktop layouts', () => {
    expect(css).toContain('.dashboard-kpis{grid-template-columns:repeat(2');
    expect(css).toContain('.dashboard-main-grid{grid-template-columns:1fr');
    expect(css).toContain('.dashboard-triple-grid{grid-template-columns:repeat(2');
    expect(css).toContain('@media(min-width:768px) and (max-width:1023px)');
  });

  it('keeps forms usable and dense tables readable at 768px', () => {
    expect(css).toContain('.form-grid{grid-template-columns:repeat(2');
    expect(css).toContain('.transaction-filter-grid{grid-template-columns:repeat(2');
    expect(css).toContain('.transaction-table-wrap{overflow-x:auto;}');
    expect(css).toContain('.report-table{min-width:0;width:100%;table-layout:auto;}');
    expect(css).toContain('overflow-x:auto');
  });
});
