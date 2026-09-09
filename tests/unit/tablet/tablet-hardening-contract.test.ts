import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/app/(protected)/layout.tsx'), 'utf8');
const tabletNav = fs.readFileSync(path.join(root, 'src/app/(protected)/tablet-top-nav.tsx'), 'utf8');

const tabletSection = css;

describe('tablet responsive hardening contract', () => {
  it('provides a tablet-specific navigation shell between mobile and desktop breakpoints', () => {
    expect(layout).toContain('<TabletTopNav />');
    expect(layout).toContain('<DesktopTopNav />');
    expect(layout).toContain('<MobileBottomNav />');
    expect(tabletSection).toContain('@media(min-width:768px) and (max-width:1023px)');
    expect(tabletSection).toContain('.mobile-bottom-nav,.desktop-top-nav-wrap{display:none!important}');
    expect(tabletNav).toContain('التنقل الرئيسي للتابلت');
  });

  it('uses tablet-specific grids rather than blindly inheriting mobile or desktop layouts', () => {
    expect(tabletSection).toContain('.dashboard-kpis{grid-template-columns:repeat(2');
    expect(tabletSection).toContain('.dashboard-main-grid{grid-template-columns:1fr');
    expect(tabletSection).toContain('.dashboard-triple-grid{grid-template-columns:repeat(2');
    expect(tabletSection).toContain('@media(min-width:768px) and (max-width:1023px)');
  });

  it('keeps forms usable and dense tables readable at 768px', () => {
    expect(tabletSection).toContain('.form-grid{grid-template-columns:repeat(2');
    expect(tabletSection).toContain('.transaction-filter-grid{grid-template-columns:repeat(2');
    expect(tabletSection).toContain('.transaction-table{min-width:720px');
    expect(tabletSection).toContain('.report-table{min-width:690px');
    expect(tabletSection).toContain('overflow-x:auto');
  });
});
