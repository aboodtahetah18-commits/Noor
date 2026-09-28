import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/app/(protected)/layout.tsx'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'src/app/(protected)/desktop-top-nav.tsx'), 'utf8');

describe('Phase 33 desktop hardening contract', () => {
  it('adds a desktop-only navigation shell without removing mobile navigation', () => {
    expect(layout).toContain('<DesktopTopNav />');
    expect(layout).toContain('<MobileBottomNav />');
    expect(css).toContain('@media(min-width:1024px)');
    expect(css).toContain('.desktop-top-nav-wrap');
    expect(nav).toContain('التنقل الرئيسي للكمبيوتر');
  });

  it('hardens desktop tables and dashboard density', () => {
    expect(css).toContain('position:sticky;top:0');
    expect(css).toContain('.dashboard-main-grid{grid-template-columns:minmax(0,1.35fr)');
    expect(css).toContain('.transaction-filter-grid{grid-template-columns:repeat(4');
  });

  it('keeps desktop target widths explicit', () => {
    expect(css).toContain('@media(min-width:1440px)');
    expect(css).toContain('max-width:1300px');
  });
});
