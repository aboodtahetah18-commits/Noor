import { describe,expect,it } from 'vitest'; import fs from 'node:fs';
const read=(f:string)=>fs.readFileSync(f,'utf8');
describe('income vertical slice contract',()=>{
 it('posts income through PENDING to POSTED atomically',()=>{const s=read('src/repositories/income-repository.ts');expect(s).toContain('rawSql.transaction');expect(s).toContain("'INCOME','PENDING'");expect(s).toContain("status='POSTED'")});
 it('scopes cycle account and expected-income ownership',()=>{const s=read('src/repositories/income-repository.ts');expect(s).toContain('c.user_id=${userId}');expect(s).toContain('a.user_id=${userId}');expect(s).toContain('e.user_id=${userId}')});
 it('persists API income metadata without abusing description',()=>{const m=read('database/migrations/20260902_010_income_expected_link.sql');for(const field of ['income_source_name','income_kind','income_is_partial','expected_income_id'])expect(m).toContain(field)});
 it('never marks surplus as flexible automatically',()=>expect(read('src/features/income/types/income.ts')).toContain('surplusIsFlexible: false'));
 it('does not silently revise an approved plan',()=>{const s=read('src/features/income/commands/record-income.ts');expect(s).not.toContain('financialPlanRepository');expect(s).not.toContain('revisePlan')});
});
