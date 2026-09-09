import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';
import type { CreateCycleInput } from '@/features/cycles/schemas/cycle';
import type { FinancialCycleView } from '@/features/cycles/types/cycle';
import type { FinancialCycleStatus } from '@/domain/types';
function map(row: Record<string,unknown>): FinancialCycleView { return { id:String(row.id),name:String(row.name),startDate:String(row.start_date),expectedNextIncomeDate:String(row.expected_next_income_date),status:String(row.status) as FinancialCycleStatus,activatedAt:row.activated_at?String(row.activated_at):null,createdAt:String(row.created_at) }; }
export class FinancialCycleRepository {
 async create(userId:string,input:CreateCycleInput){ const id=randomUUID(); const rows=await rawSql`insert into public.financial_cycles(id,user_id,name,start_date,expected_next_income_date,status) values(${id},${userId},${input.name},${input.startDate},${input.expectedNextIncomeDate},'DRAFT') returning id,name,start_date::text,expected_next_income_date::text,status,activated_at,created_at::text`; return map(rows[0] as Record<string,unknown>); }
 async getById(userId:string,id:string){ const rows=await rawSql`select id,name,start_date::text,expected_next_income_date::text,status,activated_at::text,created_at::text from public.financial_cycles where user_id=${userId} and id=${id} limit 1`; return rows[0]?map(rows[0] as Record<string,unknown>):null; }
 async getCurrent(userId:string){ const rows=await rawSql`select id,name,start_date::text,expected_next_income_date::text,status,activated_at::text,created_at::text from public.financial_cycles where user_id=${userId} and status in ('ACTIVE','CLOSING') order by activated_at desc nulls last limit 1`; return rows[0]?map(rows[0] as Record<string,unknown>):null; }
 async startClosing(userId:string,id:string,reason?:string){ const logId=randomUUID(); const now=new Date().toISOString(); const rows=await rawSql`with moved as (
   update public.financial_cycles set status='CLOSING' where id=${id} and user_id=${userId} and status='ACTIVE' returning id
 ) insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason,created_at)
   select ${logId},${userId},'FINANCIAL_CYCLE',moved.id,'ACTIVE','CLOSING','START_CLOSING',${reason??null},${now} from moved returning id`;
   return rows.length===1; }

 async activate(userId:string,id:string,fromState:'DRAFT',reason?:string){ const logId=randomUUID(); const now=new Date().toISOString(); const result=await rawSql.transaction([
   rawSql`update public.financial_cycles set status='ACTIVE',activated_at=${now} where id=${id} and user_id=${userId} and status=${fromState} returning id`,
   rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason) values(${logId},${userId},'FINANCIAL_CYCLE',${id},${fromState},'ACTIVE','ACTIVATE_CYCLE',${reason??null}) returning id`
 ]); return (result[0] as unknown[]).length===1; }
}
export const financialCycleRepository=new FinancialCycleRepository();
