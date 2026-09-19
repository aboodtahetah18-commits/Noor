import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { buildFinancialResponsibilityClaims, getFinancialCycleAllocationSnapshot, type AllocationClaim } from '@/lib/allocation/financial-cycle-allocation-engine';
import { getLatestClosedCycleCarryForward, type NextCycleCarryForward } from '@/lib/allocation/financial-cycle-carry-forward';
import type { ConversationMessageKind } from '@/lib/conversations/store';

export type GovernorPreMeetingBriefItem={
  ownerKey:string;
  ownerName:string;
  previousStatus:string|null;
  previousRequestedAmount:number|null;
  previousApprovedAmount:number|null;
  previousRealizedAmount:number|null;
  currentRequestedAmount:number|null;
  requestDeltaFromPreviousApproved:number|null;
  evidenceState:AllocationClaim['claimState'];
  attention:string[];
};

export type GovernorPreMeetingBrief={
  currentCycleId:string|null;
  availableIncome:number|null;
  previousCycleId:string|null;
  previousPlanVersionNumber:number|null;
  previousPlanRevisionCount:number|null;
  priorExceededOwners:string[];
  priorUnusedOwners:string[];
  currentMissingEvidenceOwners:string[];
  items:GovernorPreMeetingBriefItem[];
  meetingAttention:string[];
  noAutomaticDecision:true;
  noAutomaticScore:true;
  noAutomaticAmountAdjustment:true;
};

function delta(current:number|null,previous:number|null){
  return current===null||previous===null?null:current-previous;
}

export function buildGovernorPreMeetingBrief(args:{
  carry:NextCycleCarryForward|null;
  claims:AllocationClaim[];
  currentCycleId:string|null;
  availableIncome:number|null;
}):GovernorPreMeetingBrief{
  const carryByOwner=new Map((args.carry?.responsibilities??[]).map(item=>[item.ownerKey,item]));
  const items=args.claims.map(claim=>{
    const prior=carryByOwner.get(claim.ownerKey);
    const attention:string[]=[];
    if(prior?.status==='EXCEEDED_APPROVED') attention.push('يوجد تجاوز مثبت من الدورة السابقة ويجب سماع تفسيره قبل زيادة المخصص.');
    if(prior?.status==='UNUSED_ALLOCATION') attention.push('يوجد مخصص سابق بلا تنفيذ موثق ويجب تفسير السبب قبل نسخ المبلغ أو خفضه.');
    if(claim.claimState==='NEEDS_EVIDENCE') attention.push('مطالبة الدورة الحالية غير مكتملة الأدلة؛ لا يعتمد رقم نهائي قبل استكمالها.');
    if(claim.claimState==='PARTIAL') attention.push('المطالبة الحالية مبنية على بيانات جزئية ويجب تمييزها عن مطالبة مكتملة.');
    const d=delta(claim.requestedAmount,prior?.approvedAmount??null);
    if(d!==null&&d!==0) attention.push(d>0
      ? `الطلب الحالي أعلى من المخصص السابق بمقدار ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(d)} ر.س؛ يلزم تبرير الزيادة.`
      : `الطلب الحالي أقل من المخصص السابق بمقدار ${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(Math.abs(d))} ر.س؛ يلزم توضيح سبب الانخفاض.`);
    return {
      ownerKey:claim.ownerKey,
      ownerName:claim.ownerName,
      previousStatus:prior?.status??null,
      previousRequestedAmount:prior?.requestedAmount??null,
      previousApprovedAmount:prior?.approvedAmount??null,
      previousRealizedAmount:prior?.realizedAmount??null,
      currentRequestedAmount:claim.requestedAmount,
      requestDeltaFromPreviousApproved:d,
      evidenceState:claim.claimState,
      attention,
    };
  });

  const priorExceededOwners=(args.carry?.responsibilities??[]).filter(item=>item.status==='EXCEEDED_APPROVED').map(item=>item.ownerName);
  const priorUnusedOwners=(args.carry?.responsibilities??[]).filter(item=>item.status==='UNUSED_ALLOCATION').map(item=>item.ownerName);
  const currentMissingEvidenceOwners=args.claims.filter(item=>item.claimState==='NEEDS_EVIDENCE').map(item=>item.ownerName);
  const meetingAttention:string[]=[];
  if(priorExceededOwners.length) meetingAttention.push(`ابدأ بمراجعة التجاوزات السابقة: ${priorExceededOwners.join('، ')}.`);
  if(priorUnusedOwners.length) meetingAttention.push(`راجع المخصصات السابقة بلا تنفيذ موثق: ${priorUnusedOwners.join('، ')}.`);
  if(currentMissingEvidenceOwners.length) meetingAttention.push(`لا تحسم مطالب ناقصة الأدلة: ${currentMissingEvidenceOwners.join('، ')}.`);
  if(!args.carry) meetingAttention.push('لا توجد دورة مغلقة سابقة معتمدة؛ هذا الاجتماع يبدأ دون سجل محاسبي تاريخي.');
  meetingAttention.push('نتائج الدورة السابقة سياق للمساءلة وليست تعليمات تلقائية لرفع أو خفض المخصصات.');

  return {
    currentCycleId:args.currentCycleId,
    availableIncome:args.availableIncome,
    previousCycleId:args.carry?.sourceCycleId??null,
    previousPlanVersionNumber:args.carry?.sourcePlanVersionNumber??null,
    previousPlanRevisionCount:args.carry?.planRevisionCount??null,
    priorExceededOwners,
    priorUnusedOwners,
    currentMissingEvidenceOwners,
    items,
    meetingAttention,
    noAutomaticDecision:true,
    noAutomaticScore:true,
    noAutomaticAmountAdjustment:true,
  };
}

export async function getGovernorPreMeetingBrief(userId:string){
  const [snapshot,carry]=await Promise.all([
    getFinancialCycleAllocationSnapshot(userId),
    getLatestClosedCycleCarryForward(userId),
  ]);
  const claims=buildFinancialResponsibilityClaims(snapshot);
  return buildGovernorPreMeetingBrief({
    carry,claims,currentCycleId:snapshot.cycleId,availableIncome:snapshot.availableIncome,
  });
}

export function isGovernorPreMeetingBriefRequest(text:string){
  return /^(ملخص ما قبل الاجتماع|صورة ما قبل الاجتماع|تجهيز الاجتماع|ملخص الدورة قبل الاجتماع)$/i.test(text.trim());
}

export async function createGovernorPreMeetingBriefReply(userId:string){
  const brief=await getGovernorPreMeetingBrief(userId);
  const sql=getRawSql();
  const rows=await sql`
    select id from public.conversation_threads
    where user_id=${userId}::uuid and room_key='central' limit 1
  `;
  const threadId=rows[0]?.id?String(rows[0].id):null;
  if(!threadId) return null;

  const changed=brief.items.filter(item=>item.requestDeltaFromPreviousApproved!==null&&item.requestDeltaFromPreviousApproved!==0);
  const body=`صورة ما قبل الاجتماع جاهزة. لدي ${brief.priorExceededOwners.length} مجال/مجالات بتجاوز سابق، و${brief.priorUnusedOwners.length} مخصص/مخصصات سابقة بلا تنفيذ موثق، و${brief.currentMissingEvidenceOwners.length} مطالبة حالية تحتاج استكمال أدلة. كما توجد ${changed.length} مطالبة تغيرت رقميًا عن المخصص السابق. سأدخل الاجتماع بهذه النقاط كأسئلة مساءلة، لا كقرارات تلقائية على المخصصات.`;

  const inserted=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent','central-governor','محافظ بنك نماء المركزي','followup',
      ${body},
      ${JSON.stringify({
        governor_pre_meeting_brief:true,
        brief,
        meeting_attention:brief.meetingAttention,
        no_automatic_decision:true,
        no_automatic_score:true,
        no_automatic_amount_adjustment:true,
        execution_boundary:'إحاطة رقابية قبل الاجتماع فقط؛ لا تعديل مخصصات ولا تنفيذ مالي',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  const row=inserted[0];
  if(!row) return null;
  return {
    ...row,id:String(row.id),sender_type:'agent' as const,sender_key:String(row.sender_key),sender_name:String(row.sender_name),
    message_kind:String(row.message_kind) as ConversationMessageKind,body:String(row.body),
    structured_data:row.structured_data as Record<string,unknown>,
  };
}
