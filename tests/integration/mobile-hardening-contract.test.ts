import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('Phase 32 mobile hardening contract', () => {
  it('mounts a dedicated mobile bottom navigation in the protected layout', () => {
    const layout = read('src/app/(protected)/layout.tsx');
    const nav = read('src/app/(protected)/mobile-bottom-nav.tsx');
    expect(layout).toContain('<MobileBottomNav />');
    expect(nav).toContain('aria-label="التنقل الرئيسي للجوال"');
    expect(nav).toContain("'/dashboard'");
    expect(nav).toContain("'/transactions'");
    expect(nav).toContain("'/budget'");
    expect(nav).toContain("'/more'");
  });

  it('uses safe-area padding and >=44px touch targets', () => {
    const css = read('src/app/globals.css');
    expect(css).toContain('env(safe-area-inset-bottom)');
    expect(css).toContain('min-height:44px');
    expect(css).toContain('.mobile-bottom-nav');
  });

  it('converts financial tables to labeled mobile cards instead of horizontal tables', () => {
    const css = read('src/app/globals.css');
    const transactions = read('src/app/(protected)/transactions/page.tsx');
    const report = read('src/features/reports/components/cycle-report-view.tsx');
    expect(css).toContain('.transaction-table thead,.report-table thead{display:none}');
    expect(css).toContain('content:attr(data-label)');
    expect(transactions).toContain('data-label="المبلغ"');
    expect(report).toContain('data-label="الانحراف"');
  });

  it('keeps mobile inputs keyboard-friendly', () => {
    const css = read('src/app/globals.css');
    expect(css).toContain('font-size:16px;min-height:48px');
    expect(css).toContain('scroll-padding-bottom:110px');
  });
});
