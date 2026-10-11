import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('approved Namaa four-page identity',()=>{
  const pages=[
    'src/app/(protected)/accounts/page.tsx',
    'src/app/(protected)/bank-operations/page.tsx',
    'src/app/(protected)/budget/page.tsx',
    'src/app/(protected)/transactions/page.tsx',
  ];
  it('shares one visual authority across all four pages',()=>{
    const layout=read('src/app/(protected)/layout.tsx');
    expect(layout).toContain("import './approved-finance-pages.css'");
    for(const page of pages) expect(read(page)).toContain('namaa-approved-finance');
  });
  it('retires duplicate legacy bank and account presentation files',()=>{
    for(const file of [
      'src/app/(protected)/accounts/unified-accounts.css',
      'src/app/(protected)/bank-operations/bank-operations-unified.css',
      'src/app/(protected)/bank-operations/banks-wide.tsx',
      'src/app/(protected)/budget-categories/budget-categories-wide.tsx',
    ]) expect(fs.existsSync(file)).toBe(false);
  });
  it('keeps account creation and transaction entry as full pages',()=>{
    const accounts=read('src/app/(protected)/accounts/page.tsx');
    const transactions=read('src/app/(protected)/transactions/page.tsx');
    expect(accounts).toContain('href="/accounts/new"');
    expect(accounts).not.toContain('ActionDialog');
    expect(transactions).toContain('href="/transactions/new"');
    expect(transactions).not.toContain('ActionDialog');
    expect(read('src/app/(protected)/accounts/new/page.tsx')).toContain('<AccountForm');
    expect(read('src/app/(protected)/transactions/new/page.tsx')).toContain('recordExpenseAction');
  });
});
