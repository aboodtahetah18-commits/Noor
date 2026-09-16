import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layout = readFileSync('src/app/layout.tsx', 'utf8');
const identity = readFileSync('src/design-system/ndos-v1.2.css', 'utf8');
const tokens = JSON.parse(readFileSync('src/design-system/ndos-v1.2.tokens.json', 'utf8')) as Record<string, unknown>;
const brandLogo = readFileSync('src/components/brand/brand-logo.tsx', 'utf8');
const approvedAssets = readFileSync('src/design-system/ndos-v1.2-assets.ts', 'utf8');
const assetSync = readFileSync('scripts/sync-approved-brand-assets.mjs', 'utf8');

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

  it('uses the official NDOS logo asset without redraw or alternate mark', () => {
    expect(brandLogo).toContain("'/brand/ndos/namaa-logo-official.png'");
    expect(brandLogo).not.toContain('mustaqbali-logo');
  });

  it('registers the approved bank and persona assets as PNG sources', () => {
    expect(approvedAssets).toContain("namaa-central-bank.png");
    expect(approvedAssets).toContain("hilal-bank.png");
    expect(approvedAssets).toContain("malaa-bank.png");
    expect(approvedAssets).toContain("investment-assets-bank.png");
    expect(approvedAssets).toContain("namaa-algorithmic-personas.png");
    expect(approvedAssets).not.toContain('.jpg');
  });

  it('pins every Drive source to its approved file id and SHA-256 digest', () => {
    const requiredPins = [
      ['1ZOm0xC79_utrqT5QkEzNEePjt78yU6U8', '8a33c0cf87ab536f393be496f25ee415ae337d54d3bb6a0cc68da737da997821'],
      ['1hQKvOxxJwKZsNL4vUmTezGYTteXRYI2J', '5ec6718ff167232e65eb4a1574920261ad8302c792ca5c97f868d3e2e817e0a3'],
      ['13ScLgY2DhtYjaPP2tmptXMHX6hrB5QL2', 'c984e24cb35081ba482ee5210f806c8cf5b4c7a04581045234d01b0989d266e8'],
      ['1A1jhaxIuyr1S7crQO2ujaaa-I5xTcl1V', 'a647dea7bca8225adc08b89b1b59a961631f64c4c0ac7e8ee6d9880d49c2edbe'],
      ['1qaae53YMPoDIsuK5HM7pSmVIpgxBLdtn', '8f0cc194968fca5843d029b13a8e34ca44b8a6c0dd73cb2bc0e03cc5fc2979b9'],
      ['1u08y5cT-SbUPUhOY4Wj6pfJyvkQbeABj', 'c374521369a186d5f62922c3e1ea213c2e516d834d167a346a9f9e60627d84be'],
    ];

    for (const [driveId, sha256] of requiredPins) {
      expect(assetSync).toContain(driveId);
      expect(assetSync).toContain(sha256);
    }
  });
});
