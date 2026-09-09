import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
const read=(f:string)=>fs.readFileSync(f,'utf8');
describe('Phase 18 savings slice contract',()=>{
  it('keeps planned allocated and actual transferred separate',()=>{const r=read('src/repositories/saving-repository.ts');expect(r).toContain('planned_amount');expect(r).toContain('allocated_amount');expect(r).toContain('actual_transferred');expect(r).toContain("st.posted_at is not null");});
  it('posts saving transfer as two internal ledger legs with zero total liquidity effect',()=>{const r=read('src/repositories/saving-repository.ts');expect(r).toContain("'SAVING_TRANSFER','POSTED'");expect(r).toContain("'OUT'");expect(r).toContain("'IN'");expect(r).toContain("totalLiquidityChange:'0.00'");expect(r).toContain('for update');});
  it('creates PLANNED allocation and moves it to ALLOCATED on plan approval',()=>{const r=read('src/repositories/financial-plan-repository.ts');expect(r).toContain("0,'PLANNED'");expect(r).toContain("status='ALLOCATED'");expect(r).toContain("'SAVING_ALLOCATION'");});
  it('has DB constraints and balance projection for saving transfers',()=>{const m=read('database/migrations/20260902_016_savings_integrity.sql');expect(m).toContain('saving_transfers');expect(m).toContain('saving_transfer_out_entry_uq');expect(m).toContain("'TRANSFER','SAVING_TRANSFER'");});
});
