import { randomUUID } from 'node:crypto';
import { rawSql, type SqlQuery } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import type { CreateFinancialPlanInput, ReviseFinancialPlanInput } from '@/features/financial-plan/schemas/financial-plan';
import type { AllocationType, FinancialPlanStatus } from '@/domain/types';
import type { FinancialPlanView, PlanAllocationView, PlanVersionView } from '@/features/financial-plan/types/financial-plan';

const TYPES: AllocationType[]=['OBLIGATION','ESSENTIAL','SAVING','EMERGENCY','GOAL','FLEXIBLE'];
const emptyTotals=()=>Object.fromEntries(TYPES.map(t=>[t,'0.00'])) as Record<AllocationType,string>;
function allocation(row:Record<string,unknown>):PlanAllocationView{return{id:String(row.id),categoryId:String(row.category_id),categoryName:String(row.category_name),allocationType:String(row.allocation_type) as AllocationType,plannedAmount:String(row.planned_amount),recurrenceKind:row.recurrence_kind?String(row.recurrence_kind) as PlanAllocationView['recurrenceKind']:undefined,intervalCycles:row.interval_cycles?Number(row.interval_cycles):undefined,startCycleDate:row.start_cycle_date?String(row.start_cycle_date):undefined,ruleNote:row.rule_note?String(row.rule_note):null}}
export class FinancialPlanRepository {
 async createDraft(userId:string,input:CreateFinancialPlanInput){
  const planId=randomUUID(), versionId=randomUUID();
  const statements:SqlQuery[]=[
   rawSql`insert into public.financial_plans(id,user_id,cycle_id,status) select ${planId},${userId},id,'PLAN_DRAFT' from public.financial_cycles where id=${input.cycleId} and user_id=${userId} and status in ('DRAFT','ACTIVE') returning id`,
   rawSql`insert into public.plan_versions(id,user_id,plan_id,version_number,is_current) values(${versionId},${userId},${planId},1,false) returning id`
  ];
  for(const a of input.allocations){statements.push(rawSql`insert into public.budget_allocations(id,user_id,plan_version_id,category_id,planned_amount,allocation_type) select ${randomUUID()},${userId},${versionId},id,${a.plannedAmount},${a.allocationType} from public.budget_categories where id=${a.categoryId} and user_id=${userId} and is_active=true returning id`)}
  statements.push(rawSql`insert into public.saving_allocations(id,user_id,cycle_id,plan_version_id,planned_amount,allocated_amount,status)
    select ${randomUUID()},${userId},${input.cycleId},${versionId},coalesce(sum(planned_amount) filter(where allocation_type='SAVING'),0),0,'PLANNED'
    from public.budget_allocations where plan_version_id=${versionId} and user_id=${userId} returning id`);
  const result=await rawSql.transaction(statements);
  if((result[0] as unknown[]).length!==1) throw new Error('CYCLE_NOT_FOUND');
  if((result[1] as unknown[]).length!==1 || result.slice(2).some((r)=>r.length!==1)) throw new Error('INVALID_ALLOCATION_REFERENCE');
  return planId;
 }

 async createDraftWithManualCategories(userId:string,cycleId:string,items:Array<{name:string;allocationType:AllocationType;plannedAmount:string;recurrenceKind:'MONTHLY'|'EVERY_N_CYCLES'|'ONE_TIME'|'SEASONAL';intervalCycles:number;startCycleDate:string;note?:string}>){
  const planId=randomUUID(), versionId=randomUUID();
  const statements:SqlQuery[]=[
   rawSql`insert into public.financial_plans(id,user_id,cycle_id,status) select ${planId},${userId},id,'PLAN_DRAFT' from public.financial_cycles where id=${cycleId} and user_id=${userId} and status in ('DRAFT','ACTIVE') returning id`,
   rawSql`insert into public.plan_versions(id,user_id,plan_id,version_number,is_current) values(${versionId},${userId},${planId},1,false) returning id`
  ];
  for(const item of items){
   const categoryId=randomUUID();
   const isEssential=item.allocationType==='ESSENTIAL'||item.allocationType==='OBLIGATION';
   statements.push(rawSql`with existing as (
      select id from public.budget_categories where user_id=${userId} and is_active=true and lower(name)=lower(${item.name}) limit 1
    ), inserted as (
      insert into public.budget_categories(id,user_id,name,category_group,expense_nature_default,is_essential,is_active)
      select ${categoryId},${userId},${item.name},${item.allocationType},null,${isEssential},true
      where not exists(select 1 from existing)
      returning id
    ), chosen as (
      select id from inserted union all select id from existing limit 1
    )
    , allocation as (
      insert into public.budget_allocations(id,user_id,plan_version_id,category_id,planned_amount,allocation_type)
      select ${randomUUID()},${userId},${versionId},id,${item.plannedAmount},${item.allocationType} from chosen returning id,category_id
    ), rule_upsert as (
      insert into public.plan_item_rules(id,user_id,category_id,recurrence_kind,interval_cycles,start_cycle_date,note,is_active)
      select ${randomUUID()},${userId},category_id,${item.recurrenceKind},${item.intervalCycles},${item.startCycleDate},${item.note??''},true from allocation
      on conflict(user_id,category_id) do update set recurrence_kind=excluded.recurrence_kind,interval_cycles=excluded.interval_cycles,start_cycle_date=excluded.start_cycle_date,note=excluded.note,is_active=true,updated_at=now()
      returning id
    ) select id from allocation`);
  }
  statements.push(rawSql`insert into public.saving_allocations(id,user_id,cycle_id,plan_version_id,planned_amount,allocated_amount,status)
    select ${randomUUID()},${userId},${cycleId},${versionId},coalesce(sum(planned_amount) filter(where allocation_type='SAVING'),0),0,'PLANNED'
    from public.budget_allocations where plan_version_id=${versionId} and user_id=${userId} returning id`);
  const result=await rawSql.transaction(statements);
  if((result[0] as unknown[]).length!==1) throw new Error('CYCLE_NOT_FOUND');
  if((result[1] as unknown[]).length!==1 || result.slice(2).some((r)=>r.length!==1)) throw new Error('INVALID_MANUAL_PLAN_ITEM');
  return planId;
 }
 async getByCycle(userId:string,cycleId:string){const rows=await rawSql`select id from public.financial_plans where user_id=${userId} and cycle_id=${cycleId} limit 1`; if(!rows[0])return null; return this.getById(userId,String(rows[0].id));}
 async getById(userId:string,planId:string):Promise<FinancialPlanView|null>{
  const p=await rawSql`select p.id,p.cycle_id,p.status,p.current_version_id,p.approved_at::text,p.created_at::text,c.name cycle_name from public.financial_plans p join public.financial_cycles c on c.id=p.cycle_id and c.user_id=p.user_id where p.id=${planId} and p.user_id=${userId} limit 1`;
  if(!p[0])return null; const row=p[0] as Record<string,unknown>;
  const versions=await rawSql`select id,version_number,revision_reason,is_current,approved_at::text from public.plan_versions where plan_id=${planId} and user_id=${userId} order by version_number`;
  const loaded:PlanVersionView[]=[];
  for(const v0 of versions){const v=v0 as Record<string,unknown>; const allocRows=await rawSql`select a.id,a.category_id,c.name category_name,a.allocation_type,a.planned_amount::text,r.recurrence_kind,r.interval_cycles,r.start_cycle_date::text,r.note rule_note from public.budget_allocations a join public.budget_categories c on c.id=a.category_id and c.user_id=a.user_id left join public.plan_item_rules r on r.user_id=a.user_id and r.category_id=a.category_id where a.plan_version_id=${String(v.id)} and a.user_id=${userId} order by c.name`; loaded.push({id:String(v.id),versionNumber:Number(v.version_number),revisionReason:v.revision_reason?String(v.revision_reason):null,isCurrent:Boolean(v.is_current),approvedAt:v.approved_at?String(v.approved_at):null,allocations:allocRows.map(x=>allocation(x as Record<string,unknown>))});}
  const current=loaded.find(v=>v.isCurrent)??null; const pending=String(row.status)==='REVISED'?[...loaded].reverse().find(v=>!v.approvedAt)??null:String(row.status)==='PLAN_DRAFT'?(loaded[0]??null):null; const totals=emptyTotals(); for(const a of ((String(row.status)==='REVISED'?pending:current)??loaded[0])?.allocations??[]) totals[a.allocationType]=Money.parse(totals[a.allocationType]).add(Money.parse(a.plannedAmount)).toString();
  return{id:String(row.id),cycleId:String(row.cycle_id),cycleName:String(row.cycle_name),status:String(row.status) as FinancialPlanStatus,currentVersionId:row.current_version_id?String(row.current_version_id):null,approvedAt:row.approved_at?String(row.approved_at):null,createdAt:String(row.created_at),currentVersion:current,pendingRevision:pending,totals};
 }
 async approveDraft(userId:string,planId:string){
  const p=await this.getById(userId,planId); if(!p||p.status!=='PLAN_DRAFT')return false;
  const draft=(await rawSql`select id from public.plan_versions where plan_id=${planId} and user_id=${userId} and version_number=1 and approved_at is null limit 1`)[0]; if(!draft)return false;
  const now=new Date().toISOString(),logId=randomUUID(),versionId=String(draft.id);
  const rows=await rawSql`with version_update as (
    update public.plan_versions set is_current=true,approved_at=${now}
    where id=${versionId} and user_id=${userId} and approved_at is null
      and exists(select 1 from public.financial_plans where id=${planId} and user_id=${userId} and status='PLAN_DRAFT')
    returning id
  ), plan_update as (
    update public.financial_plans set status='ACTIVE_PLAN',current_version_id=${versionId},approved_at=${now}
    where id=${planId} and user_id=${userId} and status='PLAN_DRAFT' and exists(select 1 from version_update)
    returning id
  ), saving_allocation as (
    update public.saving_allocations sa set allocated_amount=sa.planned_amount,status='ALLOCATED',updated_at=now()
    where sa.plan_version_id=${versionId} and sa.user_id=${userId} and sa.status='PLANNED'
      and exists(select 1 from plan_update)
    returning id
  ), saving_audit as (
    insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event)
    select gen_random_uuid(),${userId},'SAVING_ALLOCATION',id,'PLANNED','ALLOCATED','APPROVE_PLAN' from saving_allocation
    returning id
  ), audit as (
    insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event)
    select ${logId},${userId},'FINANCIAL_PLAN',${planId},'PLAN_DRAFT','ACTIVE_PLAN','APPROVE_PLAN' from plan_update
    returning id
  ) select (select count(*) from plan_update)::int plan_count,(select count(*) from audit)::int audit_count`;
  return Number(rows[0]?.plan_count)===1&&Number(rows[0]?.audit_count)===1;
 }
 async createRevision(userId:string,input:ReviseFinancialPlanInput){
  const p=await this.getById(userId,input.planId); if(!p||p.status!=='ACTIVE_PLAN'||!p.currentVersion)throw new Error('PLAN_NOT_ACTIVE');
  const max=await rawSql`select coalesce(max(version_number),0) n from public.plan_versions where plan_id=${input.planId} and user_id=${userId}`;
  const versionId=randomUUID(), next=Number(max[0]?.n??0)+1; const changes=new Map(input.changes.map(c=>[c.categoryId,c.newAmount]));
  const statements:SqlQuery[]=[rawSql`insert into public.plan_versions(id,user_id,plan_id,version_number,revision_reason,is_current)
    select ${versionId},${userId},id,${next},${input.revisionReason},false from public.financial_plans
    where id=${input.planId} and user_id=${userId} and status='ACTIVE_PLAN' returning id`];
  for(const a of p.currentVersion.allocations){statements.push(rawSql`insert into public.budget_allocations(id,user_id,plan_version_id,category_id,planned_amount,allocation_type)
    select ${randomUUID()},${userId},${versionId},${a.categoryId},${changes.get(a.categoryId)??a.plannedAmount},${a.allocationType}
    where exists(select 1 from public.plan_versions where id=${versionId} and user_id=${userId}) returning id`)}
  statements.push(rawSql`insert into public.saving_allocations(id,user_id,cycle_id,plan_version_id,planned_amount,allocated_amount,status)
    select ${randomUUID()},${userId},p.cycle_id,${versionId},coalesce(sum(ba.planned_amount) filter(where ba.allocation_type='SAVING'),0),0,'PLANNED'
    from public.financial_plans p left join public.budget_allocations ba on ba.plan_version_id=${versionId} and ba.user_id=${userId}
    where p.id=${input.planId} and p.user_id=${userId} group by p.cycle_id returning id`);
  statements.push(rawSql`update public.financial_plans set status='REVISED' where id=${input.planId} and user_id=${userId} and status='ACTIVE_PLAN' and exists(select 1 from public.plan_versions where id=${versionId} and user_id=${userId}) returning id`);
  statements.push(rawSql`insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason)
    select ${randomUUID()},${userId},'FINANCIAL_PLAN',${input.planId},'ACTIVE_PLAN','REVISED','REVISE_PLAN',${input.revisionReason}
    where exists(select 1 from public.plan_versions where id=${versionId} and user_id=${userId}) and exists(select 1 from public.financial_plans where id=${input.planId} and user_id=${userId} and status='REVISED') returning id`);
  const res=await rawSql.transaction(statements); if((res[0] as unknown[]).length!==1||(res[res.length-2] as unknown[]).length!==1)throw new Error('CONFLICT'); return versionId;
 }
 async approveRevision(userId:string,planId:string){
  const p=await this.getById(userId,planId); if(!p||p.status!=='REVISED'||!p.pendingRevision||!p.currentVersion)return false;
  const now=new Date().toISOString(),oldId=p.currentVersion.id,newId=p.pendingRevision.id;
  const rows=await rawSql`with old_version as (
    update public.plan_versions set is_current=false where id=${oldId} and user_id=${userId} and is_current=true
      and exists(select 1 from public.financial_plans where id=${planId} and user_id=${userId} and status='REVISED') returning id
  ), new_version as (
    update public.plan_versions set is_current=true,approved_at=${now} where id=${newId} and user_id=${userId} and approved_at is null
      and exists(select 1 from old_version) returning id
  ), plan_update as (
    update public.financial_plans set status='ACTIVE_PLAN',current_version_id=${newId} where id=${planId} and user_id=${userId} and status='REVISED'
      and exists(select 1 from new_version) returning id
  ), saving_allocation as (
    update public.saving_allocations sa set allocated_amount=sa.planned_amount,status='ALLOCATED',updated_at=now()
    where sa.plan_version_id=${newId} and sa.user_id=${userId} and sa.status='PLANNED'
      and exists(select 1 from plan_update)
    returning id
  ), saving_audit as (
    insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason)
    select gen_random_uuid(),${userId},'SAVING_ALLOCATION',id,'PLANNED','ALLOCATED','APPROVE_REVISION',${p.pendingRevision.revisionReason} from saving_allocation
    returning id
  ), audit as (
    insert into public.state_transition_logs(id,user_id,entity_type,entity_id,from_state,to_state,event,reason)
    select ${randomUUID()},${userId},'FINANCIAL_PLAN',${planId},'REVISED','ACTIVE_PLAN','APPROVE_REVISION',${p.pendingRevision.revisionReason} from plan_update returning id
  ) select (select count(*) from plan_update)::int plan_count,(select count(*) from audit)::int audit_count`;
  return Number(rows[0]?.plan_count)===1&&Number(rows[0]?.audit_count)===1;
 }
}
export const financialPlanRepository=new FinancialPlanRepository();
