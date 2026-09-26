import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Stage 4 dashboard visual reference contract', () => {
  it('keeps dashboard data and actions wired to the existing runtime contracts', () => {
    const page = read('src/app/(protected)/dashboard/page.tsx');

    expect(page).toContain('getDashboardSummary(user.id)');
    expect(page).toContain('getDailyCommandCenter(user.id, dashboard.cycle.id)');
    expect(page).toContain('viewRecommendationAction');
    expect(page).toContain('BankMessageDialogTrigger');
    expect(page).not.toContain('rawSql');
  });

  it('uses approved Stage 2 primitives for reusable dashboard states and surfaces', () => {
    const page = read('src/app/(protected)/dashboard/page.tsx');

    for (const primitive of ['Card', 'StatusBadge', 'FeedbackState', 'Button', 'ActionIcon']) {
      expect(page).toContain(primitive);
    }
  });

  it('keeps the dashboard free of legacy dashboard presentation selectors', () => {
    const page = read('src/app/(protected)/dashboard/page.tsx');

    expect(page).not.toContain('p47-dashboard-page');
    expect(page).not.toContain('p47-kpi-strip');
    expect(page).not.toContain('p72-dashboard-insights');
    expect(page).toContain("styles from './dashboard.module.css'");
  });

  it('keeps page-local visual values token-driven and preserves canonical viewport bands', () => {
    const css = read('src/app/(protected)/dashboard/dashboard.module.css');

    expect(css).not.toMatch(/#[0-9a-f]{3,8}\\b/i);
    expect(css).toContain('var(--ux-page-bg)');
    expect(css).toContain('var(--ux-card-bg)');
    expect(css).toContain('var(--ux-brand-primary)');
    expect(css).toContain('@media (min-width:768px) and (max-width:1023px)');
    expect(css).toContain('@media (max-width:767px)');
  });

  it('provides dashboard loading, empty and error states without inventing financial data', () => {
    const page = read('src/app/(protected)/dashboard/page.tsx');
    const loading = read('src/app/(protected)/dashboard/loading.tsx');
    const error = read('src/app/(protected)/dashboard/error.tsx');

    expect(page).toContain('if (!dashboard)');
    expect(loading).toContain('aria-busy="true"');
    expect(error).toContain('FeedbackState');
    expect(error).toContain('reset');
  });
});
