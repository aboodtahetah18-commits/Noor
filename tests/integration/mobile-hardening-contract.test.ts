import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('Phase 32 mobile hardening contract', () => {
  it('uses the shared responsive drawer and retires duplicate bottom navigation', () => {
    const layout = read('src/app/(protected)/layout.tsx');
    const bottom = read('src/app/(protected)/mobile-bottom-nav.tsx');
    const top = read('src/app/(protected)/mobile-top-bar.tsx');

    expect(layout).toContain('<MobileTopBar profile={profile} />');
    expect(layout).toContain('<MobileBottomNav />');
    expect(bottom).toContain('return null');

    expect(top).toContain("'/dashboard'");
    expect(top).toContain("'/conversations'");
    expect(top).toContain("'/transactions'");
    expect(top).toContain("'/budget'");
    expect(top).toContain('side="start"');
  });

  it('keeps compact touch controls and full-height drawer geometry', () => {
    const shell = read('src/app/namaa-app-shell.css');
    expect(shell).toContain('height:100dvh!important');
    expect(shell).toContain('var(--ux-size-9)');
    expect(shell).toContain('var(--ux-size-10)');
    expect(shell).toContain('dialog.ux-drawer-surface.namaa-responsive-navigation-drawer');
    expect(shell).toContain('right:0!important');
  });

  it('converts financial tables to labeled mobile cards instead of horizontal tables', () => {
    const css = read('src/app/globals.css');
    const transactions = read('src/app/(protected)/transactions/page.tsx');
    const report = read('src/features/reports/components/cycle-report-view.tsx');
    expect(css).toContain('.report-table thead{display:none}');
    expect(css).toContain('content:attr(data-label)');
    expect(css).toContain('.transaction-table-wrap{overflow-x:auto;}');
    expect(transactions).toContain('data-label="المبلغ"');
    expect(report).toContain('data-label="الانحراف"');
  });

  it('keeps mobile inputs keyboard-friendly', () => {
    const css = read('src/app/globals.css');
    expect(css).toContain(':where(input,select,textarea){font-size:var(--ux-type-body-size);min-height:var(--ux-size-12);}');
    expect(css).toContain('scroll-padding-bottom:var(--ux-space-24)');
  });
});
