import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';

export type RatifiedDraftAllocation={
  ownerKey:'budget-spending-owner'|'obligations-owner'|'goals-owner'|'investment-owner'|'liquidity-protection-owner';
  ownerName:string;
  amount:number|null;
  source:'REQUESTED'|'YIELDED'|'UNRESOLVED';
};

export type AllocationPlanMaterializationResult={
  status:'MATERIALIZED'|'ALREADY_MATERIALIZED'|'NEEDS_CYCLE'|'INVALID_RATIFICATION';
  planId:string|null;
  planVersionId:string|null;
  cycleId:string|null;
  versionNumber:number|null;
  allocations:Array<{ownerKey:string;ownerName:string;amount:number;categoryId:string}>;
  externalExecution:false;
};

const CATEGORY_META:Record<RatifiedDraftAllocation['ownerKey'],{name:string;group:string;essential:boolean}> = {
  'budget-spending-owner':{name:'الميزانية والإنفاق',group:'RESPONSIBILITY_ALLOCATION',essential:true},
  'obligations-owner':{name:'الالتزامات',group:'RESPONSIBILITY_ALLOCATION',essential:true},
  'goals-owner':{name:'الأهداف',group:'RESPONSIBILITY_ALLOCATION',essential:false},
  'investment-owner':{name:'الاستثمار',group:'RESPONSIBILITY_ALLOCATION',essential:false},
  'liquidity-protection-owner':{name:'السيولة والحماية',group:'RESPONSIBILITY_ALLOCATION',essential:true},
};

function finiteAmount(value:unknown){
  const n=typeof value==='number'?value:Number(value);
  return Number.isFinite(n)&&n>=0?n:null;
}

export function normalizeRatifiedDraftAllocations(value:unknown):RatifiedDraftAllocation[]{
  if(!Array.isArray(value)) return [];
  const allowed=new Set(Object.keys(CATEGORY_META));
  return value.flatMap((item)=>{
    if(!item||typeof item!=='object'||Array.isArray(item)) return [];
    const row=item as Record<string,unknown>;
    const ownerKey=String(row.ownerKey??'') as RatifiedDraftAllocation['ownerKey'];
    if(!allowed.has(ownerKey)) return [];
    const amount=finiteAmount(row.amount);
    if(amount===null) return [];
    return [{
      ownerKey,
      ownerName:String(row.ownerName??CATEGORY_META[ownerKey].name),
      amount,
      source:(row.source==='YIELDED'?'YIELDED':row.source==='UNRESOLVED'?'UNRESOLVED':'REQUESTED') as RatifiedDraftAllocation['source'],
    }];
  });
}

export async function materializeRatifiedAllocationPlan(args:{
  userId:string;
  proposalId:string;
  fingerprint:string;
  negotiation:Record<string,unknown>;
  snapshot:Record<string,unknown>;
}):Promise<AllocationPlanMaterializationResult>{
  const cycleId=typeof args.snapshot.cycleId==='string'&&args.snapshot.cycleId?args.snapshot.cycleId:null;
  const negotiationStatus=String(args.negotiation.status??'');
  const allocations=normalizeRatifiedDraftAllocations(args.negotiation.draftAllocations);

  if(negotiationStatus!=='BALANCED_DRAFT'||allocations.some(item=>item.source==='UNRESOLVED')){
    return {status:'INVALID_RATIFICATION',planId:null,planVersionId:null,cycleId,versionNumber:null,allocations:[],externalExecution:false};
  }
  if(!cycleId){
    return {status:'NEEDS_CYCLE',planId:null,planVersionId:null,cycleId:null,versionNumber:null,allocations:[],externalExecution:false};
  }

  const sql=getRawSql();
  const cycle=await sql`
    select id from public.financial_cycles
    where id=${cycleId}::uuid and user_id=${args.userId}::uuid
    limit 1
  `;
  if(!cycle[0]?.id){
    return {status:'NEEDS_CYCLE',planId:null,planVersionId:null,cycleId:null,versionNumber:null,allocations:[],externalExecution:false};
  }

  const revisionReason=`allocation-ratification:${args.proposalId}:${args.fingerprint}`;
  const existing=await sql`
    select pv.id as version_id,pv.version_number,fp.id as plan_id
    from public.plan_versions pv
    join public.financial_plans fp on fp.id=pv.plan_id and fp.user_id=pv.user_id
    where pv.user_id=${args.userId}::uuid and fp.cycle_id=${cycleId}::uuid
      and pv.revision_reason=${revisionReason}
    order by pv.created_at desc
    limit 1
  `;
  if(existing[0]){
    const versionId=String(existing[0].version_id);
    const rows=await sql`
      select ba.planned_amount::text,bc.id as category_id,bc.name,ba.allocation_type
      from public.budget_allocations ba
      join public.budget_categories bc on bc.id=ba.category_id and bc.user_id=ba.user_id
      where ba.user_id=${args.userId}::uuid and ba.plan_version_id=${versionId}::uuid
    `;
    return {
      status:'ALREADY_MATERIALIZED',
      planId:String(existing[0].plan_id),
      planVersionId:versionId,
      cycleId,
      versionNumber:Number(existing[0].version_number),
      allocations:rows.map(row=>({
        ownerKey:String(row.allocation_type),
        ownerName:String(row.name),
        amount:Number(row.planned_amount),
        categoryId:String(row.category_id),
      })),
      externalExecution:false,
    };
  }

  let planRows=await sql`
    select id,current_version_id from public.financial_plans
    where user_id=${args.userId}::uuid and cycle_id=${cycleId}::uuid
    order by created_at desc limit 1
  `;
  let planId=planRows[0]?.id?String(planRows[0].id):null;
  if(!planId){
    planId=randomUUID();
    await sql`
      insert into public.financial_plans(id,user_id,cycle_id,status,approved_at)
      values(${planId}::uuid,${args.userId}::uuid,${cycleId}::uuid,'APPROVED',now())
    `;
    planRows=[{id:planId,current_version_id:null}];
  }

  const versionRows=await sql`
    select coalesce(max(version_number),0)::int as max_version
    from public.plan_versions where user_id=${args.userId}::uuid and plan_id=${planId}::uuid
  `;
  const versionNumber=Number(versionRows[0]?.max_version??0)+1;
  const versionId=randomUUID();

  await sql`update public.plan_versions set is_current=false where user_id=${args.userId}::uuid and plan_id=${planId}::uuid and is_current=true`;
  await sql`
    insert into public.plan_versions(
      id,user_id,plan_id,version_number,revision_reason,is_current,approved_at
    ) values(
      ${versionId}::uuid,${args.userId}::uuid,${planId}::uuid,${versionNumber},${revisionReason},true,now()
    )
  `;

  const materialized:AllocationPlanMaterializationResult['allocations']=[];
  for(const allocation of allocations){
    if((allocation.amount??0)<=0) continue;
    const meta=CATEGORY_META[allocation.ownerKey];
    const categoryRows=await sql`
      select id from public.budget_categories
      where user_id=${args.userId}::uuid and name=${meta.name}
        and category_group=${meta.group} and is_active=true
      order by created_at asc limit 1
    `;
    let categoryId=categoryRows[0]?.id?String(categoryRows[0].id):null;
    if(!categoryId){
      categoryId=randomUUID();
      await sql`
        insert into public.budget_categories(
          id,user_id,name,category_group,expense_nature_default,is_essential,is_active
        ) values(
          ${categoryId}::uuid,${args.userId}::uuid,${meta.name},${meta.group},
          ${allocation.ownerKey},${meta.essential},true
        )
      `;
    }
    await sql`
      insert into public.budget_allocations(
        id,user_id,plan_version_id,category_id,planned_amount,allocation_type
      ) values(
        ${randomUUID()}::uuid,${args.userId}::uuid,${versionId}::uuid,${categoryId}::uuid,
        ${allocation.amount},${allocation.ownerKey}
      )
    `;
    materialized.push({ownerKey:allocation.ownerKey,ownerName:allocation.ownerName,amount:allocation.amount??0,categoryId});
  }

  await sql`
    update public.financial_plans
    set current_version_id=${versionId}::uuid,status='APPROVED',approved_at=now(),updated_at=now()
    where id=${planId}::uuid and user_id=${args.userId}::uuid
  `;

  return {
    status:'MATERIALIZED',planId,planVersionId:versionId,cycleId,versionNumber,
    allocations:materialized,externalExecution:false,
  };
}
