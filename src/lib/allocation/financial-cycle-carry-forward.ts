import { getRawSql } from '@/infrastructure/db/client';

export type PriorCycleResponsibilityResult={
  ownerKey:string;
  ownerName:string;
  status:'WITHIN_APPROVED'|'EXCEEDED_APPROVED'|'UNUSED_ALLOCATION'|'NO_ALLOCATION';
  requestedAmount:number|null;
  approvedAmount:number;
  realizedAmount:number;
  varianceAmount:number;
  evidenceCount:number;
  accountabilityNote:string;
};

export type NextCycleCarryForward={
  sourceCycleId:string;
  sourcePlanId:string;
  sourcePlanVersionId:string;
  sourcePlanVersionNumber:number;
  planRevisionCount:number;
  responsibilities:PriorCycleResponsibilityResult[];
  guidanceByOwner:Record<string,string[]>;
  noAutomaticScore:true;
  noAutomaticAmountAdjustment:true;
};

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function amount(value:unknown){
  const n=typeof value==='number'?value:Number(value);
  return Number.isFinite(n)&&n>=0?n:null;
}

export function buildCarryForwardGuidance(results:PriorCycleResponsibilityResult[]){
  const guidance:Record<string,string[]>={};
  for(const item of results){
    const notes:string[]=[];
    if(item.status==='EXCEEDED_APPROVED'){
      notes.push('ابدأ بمراجعة سبب التجاوز السابق والأدلة المرتبطة به قبل الدفاع عن زيادة جديدة.');
      notes.push('لا تكرر المبلغ السابق تلقائيًا؛ ابنِ طلب الدورة الحالية من البيانات الحالية ثم قارنه بنتيجة الدورة الماضية.');
    }else if(item.status==='UNUSED_ALLOCATION'){
      notes.push('فسّر أولًا لماذا بقي المخصص دون تنفيذ موثق: هل انخفض الاحتياج فعلًا أم كانت الأدلة ناقصة؟');
      notes.push('لا تُخفّض طلب الدورة الجديدة آليًا لمجرد عدم الاستخدام السابق.');
    }else if(item.status==='WITHIN_APPROVED'){
      notes.push('استخدم نتيجة الدورة السابقة كمرجع لمعايرة التوقع، دون اعتبارها نجاحًا مطلقًا أو مكافأة تلقائية.');
      notes.push('قارن الفرق بين المعتمد والمنفذ مع تغير بيانات الدورة الحالية.');
    }else{
      notes.push('لا تستنتج أداءً من غياب المخصص السابق؛ ابنِ المطالبة الحالية من الحاجة المثبتة.');
    }
    if(item.evidenceCount===0) notes.push('النتيجة السابقة بلا تنفيذ موثق كافٍ؛ تعامل معها بحذر ولا تبنِ تعديلًا رقميًا تلقائيًا.');
    guidance[item.ownerKey]=notes;
  }
  return guidance;
}

export async function getLatestClosedCycleCarryForward(userId:string):Promise<NextCycleCarryForward|null>{
  const sql=getRawSql();
  const rows=await sql`
    select structured_data
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'cycle_closure_approved'='true'
      and coalesce(structured_data->'accountability_carry_forward'->>'use_in_next_cycle','false')='true'
    order by created_at desc
    limit 1
  `;
  const data=record(rows[0]?.structured_data);
  if(!data) return null;
  const report=record(data.cycle_closure_report);
  if(!report||!Array.isArray(report.responsibilities)) return null;

  const responsibilities:PriorCycleResponsibilityResult[]=report.responsibilities.flatMap(item=>{
    const row=record(item);
    if(!row||typeof row.ownerKey!=='string'||typeof row.ownerName!=='string'||typeof row.status!=='string') return [];
    if(!['WITHIN_APPROVED','EXCEEDED_APPROVED','UNUSED_ALLOCATION','NO_ALLOCATION'].includes(row.status)) return [];
    return [{
      ownerKey:row.ownerKey,
      ownerName:row.ownerName,
      status:row.status as PriorCycleResponsibilityResult['status'],
      requestedAmount:amount(row.requestedAmount),
      approvedAmount:amount(row.approvedAmount)??0,
      realizedAmount:amount(row.realizedAmount)??0,
      varianceAmount:typeof row.varianceAmount==='number'?row.varianceAmount:Number(row.varianceAmount??0),
      evidenceCount:Number(row.evidenceCount??0),
      accountabilityNote:String(row.accountabilityNote??''),
    }];
  });

  if(!responsibilities.length) return null;
  return {
    sourceCycleId:String(report.cycleId??data.cycle_id??''),
    sourcePlanId:String(report.planId??data.plan_id??''),
    sourcePlanVersionId:String(report.planVersionId??data.plan_version_id??''),
    sourcePlanVersionNumber:Number(report.planVersionNumber??0),
    planRevisionCount:Number(report.planRevisionCount??0),
    responsibilities,
    guidanceByOwner:buildCarryForwardGuidance(responsibilities),
    noAutomaticScore:true,
    noAutomaticAmountAdjustment:true,
  };
}

export function carryForwardNoteForOwner(carry:NextCycleCarryForward|null,ownerKey:string){
  if(!carry) return null;
  const result=carry.responsibilities.find(item=>item.ownerKey===ownerKey);
  if(!result) return null;
  return {
    previousCycleResult:result,
    guidance:carry.guidanceByOwner[ownerKey]??[],
    amountPolicy:'لا يتم نسخ أو رفع أو خفض مطالبة الدورة الحالية تلقائيًا من نتيجة الدورة السابقة.',
  };
}
