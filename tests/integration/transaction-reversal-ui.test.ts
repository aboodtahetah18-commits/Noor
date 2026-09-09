import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 14 reversal UI boundary', () => {
  const page = fs.readFileSync(path.join(process.cwd(),'src/app/(protected)/transactions/[id]/page.tsx'),'utf8');
  it('requires a reason and exposes reversal only for supported POSTED types', () => {
    expect(page).toContain("transaction.status === 'POSTED' && ['INCOME','EXPENSE'].includes(transaction.transactionType)");
    expect(page).toContain('name="reason" required');
  });
  it('does not present DELETE as correction', () => {
    expect(page).not.toContain('حذف العملية');
    expect(page).toContain('يحافظ العكس على العملية الأصلية');
  });
});
