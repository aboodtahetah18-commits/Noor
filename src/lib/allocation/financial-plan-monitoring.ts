import { createHash, randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';

export type PlanMonitoringStatus='NO_ACTIVITY'|'WITHIN_PLAN'|'EXCEEDED'|'UNTRACKED';
export type ResponsibilityPlanMonitoring={
  ownerKey:string;
  ownerName:string;
  plannedAmount:number;
  realizedAmount:number;
  remainingAmount:number;
  varianceAmount:number;
  status:PlanMonitoringStatus;
  evidenceCount:number;
};
export type FinancialPlanMonitoringSnapshot={
  planId:string;
  planVersionId:string;
  cycleId:string;
  versionNumber:number;
  monitoredAt:string;
  items:ResponsibilityPlanMonitoring[];
  totalPlanned:number;
  totalRealized:number;
  totalRemaining:number;
  exceededOwners:string[];
  fingerprint:string;
  externalExecution:false;
};

function amount(value:unknown){
  const n=typeof value==='number'?value:Number(value);
  return Number.isFinite(n)?Math.abs(n):0;
}

export function evaluateResponsibilityPlanMonitoring(
  allocations:Array<{ownerKey:string;ownerName:string;plannedAmount:number}>,
  realized:Array<{ownerKey:string;amount:number;evidenceCount:number}>,
){
  const actualByOwner=new Map(realized.map(item=>[item.ownerKey,item]));
  return allocations.map(allocation=>{
    const actual=actualByOwner.get(allocation.ownerKey);
    const realizedAmount=actual?.amount??0;
    const plannedAmount=Math.max(0,allocation.plannedAmount);
    const varianceAmount=realizedAmount-plannedAmount;
    const remainingAmount=Math.max(0,plannedAmount-realizedAmount);
    const status:PlanMonitoringStatus=realizedAmount===0
      ? 'NO_ACTIVITY'
      : realizedAmount>plannedAmount
        ? 'EXCEEDED'
        : 'WITHIN_PLAN';
    return {
      ownerKey:allocation.ownerKey,
      ownerName:allocation.ownerName,
      plannedAmount,
      realizedAmount,
      remainingAmount,
      varianceAmount,
      status,
      evidenceCount:actual?.evidenceCount??0,
    };
  });
}

function fingerprint(payload:unknown){
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function getCurrentFinancialPlanMonitoring(userId:string):Promise<FinancialPlanMonitoringSnapshot|null>{
  const sql=getRawSql();
  const planRows=await sql`
    select fp.id as plan_id,fp.cycle_id,pv.id as version_id,pv.version_number
    from public.financial_plans fp
    join public.plan_versions pv on pv.id=fp.current_version_id and pv.user_id=fp.user_id
    where fp.user_id=${userId}::uuid
      and fp.status in ('APPROVED','ACTIVE')
      and pv.is_current=true
    order by fp.updated_at desc
    limit 1
  `;
  const plan=planRows[0];
  if(!plan?.plan_id||!plan?.version_id||!plan?.cycle_id) return null;

  const allocationRows=await sql`
    select ba.allocation_type,ba.planned_amount::text,bc.name
    from public.budget_allocations ba
    join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=ba.user_id
    where ba.user_id=${userId}::uuid
      and ba.plan_version_id=${String(plan.version_id)}::uuid
      and bc.category_group='RESPONSIBILITY_ALLOCATION'
    order by ba.created_at asc
  `;
  const actualRows=await sql`
    select bc.expense_nature_default as owner_key,
           coalesce(sum(abs(t.amount)),0)::text as realized_amount,
           count(*)::int as evidence_count
    from public.transactions t
    join public.budget_categories bc on bc.id=t.category_id and bc.user_id=t.user_id
    where t.user_id=${userId}::uuid
      and t.cycle_id=${String(plan.cycle_id)}::uuid
      and t.posted_at is not null
      and t.reversed_at is null
      and bc.category_group='RESPONSIBILITY_ALLOCATION'
    group by bc.expense_nature_default
  `;

  const allocations=allocationRows.map(row=>({
    ownerKey:String(row.allocation_type),
    ownerName:String(row.name),
    plannedAmount:amount(row.planned_amount),
  }));
  const realized=actualRows.map(row=>({
    ownerKey:String(row.owner_key),
    amount:amount(row.realized_amount),
    evidenceCount:Number(row.evidence_count??0),
  }));
  const items=evaluateResponsibilityPlanMonitoring(allocations,realized);
  const totalPlanned=items.reduce((sum,item)=>sum+item.plannedAmount,0);
  const totalRealized=items.reduce((sum,item)=>sum+item.realizedAmount,0);
  const totalRemaining=Math.max(0,totalPlanned-totalRealized);
  const exceededOwners=items.filter(item=>item.status==='EXCEEDED').map(item=>item.ownerName);
  const monitoredAt=new Date().toISOString();
  const stable={
    planId:String(plan.plan_id),
    planVersionId:String(plan.version_id),
    cycleId:String(plan.cycle_id),
    versionNumber:Number(plan.version_number),
    items,
  };
  return {
    ...stable,
    monitoredAt,
    totalPlanned,totalRealized,totalRemaining,exceededOwners,
    fingerprint:fingerprint(stable),
    externalExecution:false,
  };
}

export async function syncFinancialPlanMonitoring(userId:string){
  const snapshot=await getCurrentFinancialPlanMonitoring(userId);
  if(!snapshot) return {status:'NO_ACTIVE_PLAN' as const,snapshot:null,messageCreated:false};

  const sql=getRawSql();
  const roomRows=await sql`
    select id from public.conversation_threads
    where user_id=${userId}::uuid and room_key='council'
    limit 1
  `;
  const threadId=roomRows[0]?.id?String(roomRows[0].id):null;
  if(!threadId) return {status:'NO_COUNCIL_ROOM' as const,snapshot,messageCreated:false};

  const prior=await sql`
    select id from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${threadId}::uuid
      and structured_data->>'plan_monitoring_fingerprint'=${snapshot.fingerprint}
    limit 1
  `;
  if(prior[0]?.id) return {status:'UNCHANGED' as const,snapshot,messageCreated:false};

  const changedItems=snapshot.items.filter(item=>item.realizedAmount>0||item.status==='EXCEEDED');
  if(changedItems.length===0) return {status:'NO_ACTIVITY' as const,snapshot,messageCreated:false};

  const exceeded=snapshot.items.filter(item=>item.status==='EXCEEDED');
  const body=exceeded.length
    ? `متابعة الخطة: ظهر تجاوز مثبت في ${exceeded.map(item=>`${item.ownerName} بمقدار ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(item.varianceAmount)} ر.س`).join('، ')}. هذا تنبيه متابعة فقط؛ لا أعدّل الخطة ولا أنفذ أي حركة تلقائيًا.`
    : `متابعة الخطة: تم تسجيل نشاط جديد على ${changedItems.length} من مخصصات الدورة. إجمالي المنفذ الموثق ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(snapshot.totalRealized)} ر.س من أصل ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(snapshot.totalPlanned)} ر.س. لا يوجد تجاوز مثبت حاليًا.`;

  await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent','central-secretary','أمين السر المركزي',
      ${exceeded.length?'risk':'followup'},${body},
      ${JSON.stringify({
        plan_monitoring:true,
        plan_monitoring_fingerprint:snapshot.fingerprint,
        plan_id:snapshot.planId,
        plan_version_id:snapshot.planVersionId,
        cycle_id:snapshot.cycleId,
        monitoring:snapshot,
        exceeded_owners:snapshot.exceededOwners,
        requires_plan_change:false,
        user_action_required:exceeded.length>0,
        external_execution:false,
        execution_boundary:'متابعة وتحليل فقط؛ لا تعديل تلقائي للخطة ولا تنفيذ مالي خارجي',
      })}::jsonb
    )
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return {status:exceeded.length?'DEVIATION_ALERT' as const:'FOLLOWUP' as const,snapshot,messageCreated:true};
}

export async function runFinancialPlanMonitoringJob(){
  const sql=getRawSql();
  const rows=await sql`
    select distinct fp.user_id
    from public.financial_plans fp
    join public.plan_versions pv on pv.id=fp.current_version_id and pv.user_id=fp.user_id
    where fp.status in ('APPROVED','ACTIVE') and pv.is_current=true
  `;
  const results:Array<{userId:string;status:string;messageCreated:boolean}>=[];
  for(const row of rows){
    const userId=String(row.user_id);
    try{
      const result=await syncFinancialPlanMonitoring(userId);
      results.push({userId,status:result.status,messageCreated:result.messageCreated});
    }catch{
      results.push({userId,status:'FAILED',messageCreated:false});
    }
  }
  return results;
}
