import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layout = readFileSync('src/app/(protected)/layout.tsx', 'utf8');
const rootLayout = readFileSync('src/app/layout.tsx', 'utf8');
const css = readFileSync('src/app/globals.css', 'utf8');
const mobileNav = readFileSync('src/app/(protected)/mobile-bottom-nav.tsx', 'utf8');

const accountForm = readFileSync('src/app/(protected)/accounts/new/account-form.tsx', 'utf8');

describe('Phase 36 accessibility audit contract', () => {
  it('keeps a correctly identified Arabic document', () => {
    expect(rootLayout).toContain('lang="ar"');
    expect(rootLayout).toContain('dir="rtl"');
  });

  it('provides a keyboard skip link and focus target', () => {
    expect(layout).toContain('className="skip-link"');
    expect(layout).toContain('href="#main-content"');
    expect(layout).toContain('id="main-content"');
    expect(layout).toContain('tabIndex={-1}');
  });

  it('provides visible focus and reduced-motion handling', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('prefers-contrast: more');
    expect(css).toContain('forced-colors: active');
  });

  it('keeps touch targets at least 44px', () => {
    expect(css).toContain('min-height:44px');
  });

  it('labels navigation and announces form errors', () => {
    expect(mobileNav).toContain('aria-label="التنقل الرئيسي للجوال"');
    expect(mobileNav).toContain('aria-current={active ? \'page\' : undefined}');
    expect(accountForm).toContain('role="alert"');
  });
});
