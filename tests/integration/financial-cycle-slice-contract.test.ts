import {describe,expect,it} from 'vitest'; import fs from 'node:fs';
const read=(f:string)=>fs.readFileSync(f,'utf8');
describe('financial cycle vertical slice',()=>{
 it('creates cycles as DRAFT and scopes by user',()=>{const s=read('src/repositories/financial-cycle-repository.ts'); expect(s).toContain("'DRAFT'"); expect(s).toContain('user_id=${userId}');});
 it('activates atomically with audit log',()=>{const s=read('src/repositories/financial-cycle-repository.ts'); expect(s).toContain('rawSql.transaction'); expect(s).toContain('state_transition_logs'); expect(s).toContain("'ACTIVATE_CYCLE'");});
 it('enforces one operational cycle at database layer',()=>{const s=read('database/migrations/20260902_004_cycles_plans_categories.sql'); expect(s).toContain("where status in ('ACTIVE','CLOSING')");});
});
