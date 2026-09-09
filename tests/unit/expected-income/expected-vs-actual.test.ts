import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
describe('Expected vs Actual separation',()=>{it('does not create financial transactions when expected income is created',()=>{const s=fs.readFileSync('src/repositories/expected-income-repository.ts','utf8');expect(s).not.toContain('insert into public.transactions');expect(s).toContain('public.expected_incomes');});});
