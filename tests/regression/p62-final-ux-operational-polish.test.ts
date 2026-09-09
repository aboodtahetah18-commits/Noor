import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('P62 final UX and operational polish', () => {
  it('localizes financial statuses that are visible in command surfaces', () => {
    const labels = read('src/lib/financial-status-labels.ts');
    const dashboard = read('src/app/(protected)/dashboard/page.tsx');
    const report = read('src/features/reports/components/cycle-report-view.tsx');
    expect(labels).toContain('CYCLE_STATUS_LABELS');
    expect(labels).toContain('OBLIGATION_STATUS_LABELS');
    expect(labels).toContain('BUDGET_STATUS_LABELS');
    expect(dashboard).toContain('financialStatusLabel(CYCLE_STATUS_LABELS, dashboard.cycle.status)');
    expect(dashboard).toContain('financialStatusLabel(OBLIGATION_STATUS_LABELS, item.status)');
    expect(report).toContain('financialStatusLabel(BUDGET_STATUS_LABELS, item.status)');
  });

  it('provides consistent protected loading, error and not-found recovery states', () => {
    const loading = read('src/app/(protected)/loading.tsx');
    const error = read('src/app/(protected)/error.tsx');
    const notFound = read('src/app/(protected)/not-found.tsx');
    expect(loading).toContain('aria-live="polite"');
    expect(error).toContain('onClick={reset}');
    expect(error).toContain('href="/workspace"');
    expect(notFound).toContain('href="/workspace"');
    expect(notFound).toContain('href="/dashboard"');
  });

  it('keeps the final protected shell keyboard and motion accessible', () => {
    const layout = read('src/app/(protected)/layout.tsx');
    const css = read('src/app/globals.css');
    expect(layout).toContain('className="skip-link"');
    expect(layout).toContain('id="main-content"');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('forced-colors');
  });
});
