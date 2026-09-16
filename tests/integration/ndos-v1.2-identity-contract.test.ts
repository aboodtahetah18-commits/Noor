import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layout = readFileSync('src/app/layout.tsx', 'utf8');
const identity = readFileSync('src/design-system/ndos-v1.2.css', 'utf8');
const tokens = JSON.parse(readFileSync('src/design-system/ndos-v1.2.tokens.json', 'utf8')) as Record<string, unknown>;
const brandLogo = readFileSync('src/components/brand/brand-logo.tsx', 'utf8');

describe('NDOS v1.2 FINAL identity contract', () => {
  it('loads the frozen identity layer last from the application root', () => {
    expect(layout).toContain("import '../design-system/ndos-v1.2.css';");
    expect(layout).not.toContain("import '../design-system/ndos-v1.1.css';");
  });

  it('locks the approved primary palette and Noto Sans Arabic', () => {
    expect(identity).toContain('--namaa-green-900:#0B6B4F');
    expect(identity).toContain('--namaa-green-700:#189F7F');
    expect(identity).toContain('--namaa-gold-500:#D4AF6B');
    expect(identity).toContain('--namaa-gold-action:#FCAA30');
    expect(identity).toContain('Noto Sans Arabic');
  });

  it('keeps the machine-readable release frozen at v1.2 FINAL', () => {
    const meta = tokens.meta as Record<string, unknown>;
    expect(meta.version).toBe('1.2 FINAL');
    expect(meta.identity_status).toBe('FROZEN');
    expect(meta.rtl_first).toBe(true);
    expect(meta.light_first).toBe(true);
  });

  it('uses only the approved transparent NDOS logo pair without redraw or alternate mark', () => {
    expect(brandLogo).toContain("'/brand/ndos/namaa-logo-color-transparent.png'");
    expect(brandLogo).toContain("'/brand/ndos/namaa-logo-white-transparent.png'");
    expect(brandLogo).toContain('width={128}');
    expect(brandLogo).toContain('height={64}');
    expect(brandLogo).not.toContain('namaa-logo-official.png');
    expect(brandLogo).not.toContain('mustaqbali-logo');
  });
});
