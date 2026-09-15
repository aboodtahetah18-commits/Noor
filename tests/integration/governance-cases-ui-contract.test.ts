import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const listPage = readFileSync('src/app/(protected)/cases/page.tsx', 'utf8');
const detailPage = readFileSync('src/app/(protected)/cases/[caseId]/page.tsx', 'utf8');
const desktopNav = readFileSync('src/app/(protected)/desktop-top-nav.tsx', 'utf8');
const morePage = readFileSync('src/app/(protected)/more/page.tsx', 'utf8');

describe('governance cases workspace integration contract', () => {
  it('requires authenticated server reads for both case pages', () => {
    expect(listPage).toContain('requireAuthenticatedUser()');
    expect(listPage).toContain('listGovernanceCaseContracts(user.id');
    expect(detailPage).toContain('requireAuthenticatedUser()');
    expect(detailPage).toContain('getGovernanceCaseContract(user.id, caseId)');
  });

  it('surfaces the governed next action rather than inventing a client-side workflow', () => {
    expect(listPage).toContain('nextActionCode');
    expect(listPage).toContain('actionOwner');
    expect(detailPage).toContain('nextActionCode');
    expect(detailPage).toContain('actionOwner');
  });

  it('keeps the launch UI inside the existing governed visual language', () => {
    expect(listPage).toContain('p47-decision-page');
    expect(listPage).toContain('p47-analysis-card');
    expect(detailPage).toContain('p47-analysis-card');
    expect(listPage).not.toContain('style={{');
    expect(detailPage).not.toContain('style={{');
  });

  it('exposes the cases workspace in desktop navigation and the mobile/tablet more hub', () => {
    expect(desktopNav).toContain("href: '/cases'");
    expect(desktopNav).toContain("label: 'القضايا والقرارات'");
    expect(morePage).toContain("['/cases','القضايا والقرارات'");
  });
});
