import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const rootLayout = readFileSync('src/app/layout.tsx', 'utf8');
const css = readFileSync('src/app/globals.css', 'utf8');
const history = readFileSync('src/app/(protected)/reports/history/page.tsx', 'utf8');

describe('Phase 35 RTL audit contract', () => {
  it('keeps Arabic RTL at the document root', () => {
    expect(rootLayout).toContain('lang="ar"');
    expect(rootLayout).toContain('dir="rtl"');
  });

  it('isolates numeric/date fields from bidi reordering', () => {
    expect(css).toContain('unicode-bidi:isolate');
    expect(css).toContain('font-variant-numeric:tabular-nums');
    expect(css).toContain('input[type="date"]');
  });

  it('uses logical table alignment and RTL pagination', () => {
    expect(css).toContain('text-align:start');
    expect(css).toContain('.pagination-row{direction:rtl}');
    expect(css).toContain('justify-self:start');
  });

  it('isolates historical numeric trend expressions', () => {
    expect(history).toContain('className="rtl-number"');
  });
});
