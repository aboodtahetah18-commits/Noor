import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layout = readFileSync('src/app/(protected)/layout.tsx', 'utf8');
const mobile = readFileSync('src/app/(protected)/mobile-bottom-nav.tsx', 'utf8');
const tablet = readFileSync('src/app/(protected)/tablet-top-nav.tsx', 'utf8');
const desktop = readFileSync('src/app/(protected)/desktop-top-nav.tsx', 'utf8');
const dialog = readFileSync('src/components/overlays/action-dialog.tsx', 'utf8');
const css = readFileSync('src/app/globals.css', 'utf8');

describe('P57 responsive accessibility closure', () => {
  it('keeps dedicated navigation shells for all three viewport classes', () => {
    expect(layout).toContain('<MobileBottomNav />');
    expect(layout).toContain('<TabletTopNav />');
    expect(layout).toContain('<DesktopTopNav />');
    expect(mobile).toContain('aria-label="التنقل الرئيسي للجوال"');
    expect(tablet).toContain('tablet-top-nav');
    expect(desktop).toContain('desktop-top-nav');
  });

  it('keeps keyboard and motion accessibility protections', () => {
    expect(layout).toContain('href="#main-content"');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('forced-colors: active');
  });

  it('keeps dialogs keyboard-dismissable and semantically modal', () => {
    expect(dialog).toContain('<dialog');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('onCancel');
    expect(dialog).toContain('aria-haspopup="dialog"');
  });

  it('retains 44px minimum mobile interaction targets and safe-area handling', () => {
    expect(css).toContain('min-height:44px');
    expect(css).toContain('env(safe-area-inset-bottom)');
  });
});
