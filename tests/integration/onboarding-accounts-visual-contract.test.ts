import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/app/(protected)/onboarding/accounts/page.tsx'), 'utf8');
const combo = fs.readFileSync(path.join(root, 'src/components/forms/smart-combo-input.tsx'), 'utf8');
const contracts = fs.readFileSync(path.join(root, 'src/design-system/contracts.css'), 'utf8');
const accountForm = fs.readFileSync(path.join(root, 'src/app/(protected)/accounts/new/account-form.tsx'), 'utf8');

describe('onboarding accounts visual contract', () => {
  it('removes the redundant mystery progress bar and exposes a useful top utility', () => {
    expect(page).not.toContain('className="onboarding-progress"');
    expect(page).toContain('onboarding-home-link');
    expect(page).toContain('onboarding-money-hero');
    expect(page).toContain('أين توجد أموالك الآن؟');
  });

  it('keeps the account picker visually equivalent to a native dropdown chevron', () => {
    expect(combo).toContain("name={open ? 'chevronUp' : 'chevronDown'}");
    expect(combo).not.toContain('⌄');
    expect(contracts).toContain('.smart-combo-toggle');
    expect(contracts).toContain('border:0 !important');
    expect(contracts).toContain('background:transparent !important');
  });

  it('prioritizes core account data and keeps optional bank matching compact', () => {
    expect(page).toContain('onboarding-balance-field');
    expect(page).toContain('onboarding-date-field');
    expect(page).toContain('onboarding-optional-details-v2');
    expect(contracts).toContain('.onboarding-primary-account-form .onboarding-account-name-field');
    expect(contracts).toContain('.onboarding-primary-account-form .onboarding-date-field { grid-column:2; }');
    expect(contracts).toContain('.onboarding-optional-details-v2 > summary');
  });

  it('uses the same compact hierarchy in the later add-account dialog', () => {
    expect(accountForm).toContain('account-form-v2');
    expect(accountForm).toContain('onboarding-optional-details-v2');
    expect(accountForm).not.toContain('p49-form-pages');
    expect(accountForm).not.toContain('التالي: المطابقة');
  });

  it('does not reserve an invisible mobile header height on onboarding', () => {
    expect(contracts).toContain('.protected-app-shell:has(.onboarding-page) > #main-content { padding-top:0 !important; }');
  });
});
