import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind } from '@/lib/conversations/store';
import { FINANCIAL_RESPONSIBILITY_BY_KEY } from '@/lib/advisors/approved-advisors';
import { buildFinancialResponsibilityClaims, getFinancialCycleAllocationSnapshot, summarizeAllocationConflict } from '@/lib/allocation/financial-cycle-allocation-engine';
import { negotiateAllocationClaims } from '@/lib/allocation/financial-cycle-negotiation-engine';
import { carryForwardNoteForOwner, getLatestClosedCycleCarryForward } from '@/lib/allocation/financial-cycle-carry-forward';
import { getGovernorPreMeetingBrief } from '@/lib/allocation/governor-pre-meeting-brief';

export type CouncilDeliberationReply={
  id:string;
  sender_type:'agent';
  sender_key:string;
  sender_name:string;
  message_kind:ConversationMessageKind;
  body:string;
  structured_data:Record<string,unknown>;
  created_at?:string;
};

function topicFrom(text:string){
  if(/(استثمار|أصول|محفظة|فرصة|نسبة)/i.test(text)) return 'الاستثمار والأوزان';
  if(/(احتياط|ملاءة|سيولة|طوارئ)/i.test(text)) return 'الملاءة والاحتياطي';
  if(/(صرف|مصروف|ميزانية|بند|بنود)/i.test(text)) return 'الصرف والميزانية';
  if(/(تمويل|قرض|قسط|دين)/i.test(text)) return 'التمويل';
  return 'الصورة المالية والتأسيس';
}

function claimAmount(value:number|null){return value===null?'غير محدد حتى تكتمل الأدلة':`${new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(value)} ر.س`;}
function negotiationViews(result:ReturnType<typeof negotiateAllocationClaims>){
  const turns=result.turns.filter(turn=>turn.action==='YIELD'||turn.action==='HOLD'||turn.action==='NEEDS_EVIDENCE');
  const bodies=turns.map(turn=>({
    key:turn.ownerKey,
    name:turn.ownerName,
    kind:(turn.action==='NEEDS_EVIDENCE'?'request':turn.action==='YIELD'?'recommendation':'message') as ConversationMessageKind,
    body:turn.action==='YIELD'
      ? `أستطيع خفض طلبي من ${claimAmount(turn.beforeAmount)} إلى ${claimAmount(turn.afterAmount)} دون كسر الحد الأدنى المثبت. مقدار التنازل ${claimAmount(turn.reduction)}. ${turn.reason}`
      : turn.action==='NEEDS_EVIDENCE'
        ? `لا أستطيع تثبيت أو خفض مطالبة رقمية الآن: ${turn.reason}`
        : `أتمسك بالمطالبة الحالية ${claimAmount(turn.beforeAmount)} في هذه الجولة. ${turn.reason}`,
    role:'جولة تفاوض على التوزيع',
  }));
  bodies.push({
    key:'central-secretary',
    name:'أمين السر المركزي',
    kind:'followup' as ConversationMessageKind,
    body:result.status==='BALANCED_DRAFT'
      ? `انتهت جولة التفاوض إلى مشروع توزيع متوازن رقميًا بإجمالي ${claimAmount(result.requestedAfter)} من دخل متاح ${claimAmount(result.availableIncome)}. هذا مشروع فقط ولا يعتمد أو ينفذ حتى تصادق عليه.`
      : result.status==='NEEDS_EVIDENCE'
        ? `لا يمكن إنهاء التفاوض بعد. توجد مطالب تحتاج أدلة أو حدودًا معتمدة: ${result.unresolvedOwners.join('، ')||'بيانات غير مكتملة'}. لن أملأ الفراغ بنسب افتراضية.`
        : `ما زال هناك عجز غير محلول مقداره ${claimAmount(result.remainingGap)} بعد حدود التنازل المسموحة. نحتاج قرارًا منك أو بيانات/بدائل جديدة، ولا يجوز كسر الحدود المحمية تلقائيًا.`,
    role:'محضر جولة التفاوض',
  });
  return bodies;
}
function makeViews(topic:string,claims=buildFinancialResponsibilityClaims({availableIncome:null,budgetPlannedAmount:null,knownHouseholdEssentials:0,monthlyObligations:0,monthlyGoalNeed:null,liquidBalance:null,liquidityTarget:null,investableOpportunityAmount:null,cycleId:null,evidence:[]})){
  return [
    {
      key:'central-secretary',
      name:'أمين السر المركزي',
      kind:'message' as ConversationMessageKind,
      body:`نفتح محور «${topic}». المطلوب ليس رأيًا مختصرًا؛ كل جهة ستوضح طلبها، مبرراته، أثره على بقية البنود، والحد الأدنى المقبول. سأحدّث المحضر الحي وأبقي نقاط الخلاف مفتوحة حتى ترد أنت أو يطلب الرئيس الانتقال للمحور التالي.`,
      role:'تنسيق الاجتماع',
    },
    {
      key:'central-governor',
      name:'محافظ بنك نماء المركزي',
      kind:'recommendation' as ConversationMessageKind,
      body:'سأبدأ الاجتماع من الصورة الرقابية: ما الذي تجاوز سابقًا، ما الذي بقي بلا تنفيذ موثق، ما المطالب الحالية الناقصة، وما الذي تغير عن آخر مخصص معتمد. هذه نقاط مساءلة وليست أوامر لرفع أو خفض أي حصة.',
      role:'رئيس المجلس',
    },
    {
      key:'budget-spending-owner',
      name:'مسؤول الميزانية والإنفاق',
      kind:'recommendation' as ConversationMessageKind,
      body:`مطالبتي الحالية: ${claimAmount(claims.find(c=>c.ownerKey==='budget-spending-owner')?.requestedAmount??null)}. سأدافع عن البنود التشغيلية المثبتة فقط، وأوضح أي نقص في البيانات قبل أن أطلب مبلغًا إضافيًا.`,
      role:'مسؤول الميزانية والإنفاق',
    },
    {
      key:'obligations-owner',
      name:'مسؤول الالتزامات',
      kind:'risk' as ConversationMessageKind,
      body:`مطالبتي الحالية للالتزامات: ${claimAmount(claims.find(c=>c.ownerKey==='obligations-owner')?.requestedAmount??null)}. هذا مبني على الاستحقاقات المثبتة، وأي خفض يحتاج تعديلًا حقيقيًا في الالتزام أو بديلًا موثقًا.`,
      role:'مسؤول الالتزامات',
    },
    {
      key:'liquidity-protection-owner',
      name:'مسؤول السيولة والحماية',
      kind:'recommendation' as ConversationMessageKind,
      body:`مطالبتي الحالية للحماية والسيولة: ${claimAmount(claims.find(c=>c.ownerKey==='liquidity-protection-owner')?.requestedAmount??null)}. لن أختلق نسبة احتياط؛ إذا كان حد الحماية غير معاير سأطلب استكمال الدليل بدل رقم وهمي.`,
      role:'مسؤول السيولة والحماية',
    },
    {
      key:'goals-owner',
      name:'مسؤول الأهداف',
      kind:'recommendation' as ConversationMessageKind,
      body:`مطالبتي الحالية للأهداف: ${claimAmount(claims.find(c=>c.ownerKey==='goals-owner')?.requestedAmount??null)}. المبلغ لا يُحسب إلا من أهداف لها مبلغ وموعد صالحان، وسأبين أثر أي خفض على موعد الإنجاز.`,
      role:'مسؤول الأهداف',
    },
    {
      key:'investment-owner',
      name:'مسؤول الاستثمار',
      kind:'recommendation' as ConversationMessageKind,
      body:`مطالبتي الاستثمارية الحالية: ${claimAmount(claims.find(c=>c.ownerKey==='investment-owner')?.requestedAmount??null)}. لا أطالب بنسبة ثابتة؛ يلزم فائض محمي وفرصة مؤهلة من بنك الأصول قبل تثبيت رقم.`,
      role:'مسؤول الاستثمار',
    },
    {
      key:'financial-advisor',
      name:'المستشار الاقتصادي',
      kind:'recommendation' as ConversationMessageKind,
      body:'لن أطالب بحصة مالية. دوري اختبار افتراضات الجميع ضد التضخم والدخل والظروف الاقتصادية والسيناريوهات الخارجية، والتنبيه إذا كانت مطالب أي مسؤول مبنية على افتراض غير واقعي أو قديم.',
      role:'الموازنة الاقتصادية',
    },
    {
      key:'central-secretary',
      name:'أمين السر المركزي',
      kind:'followup' as ConversationMessageKind,
      body:'المحضر الحالي يسجل مطالب المسؤولين الخمسة وحدودهم الدنيا وآثار التخفيض، مع ملاحظات المستشار الاقتصادي. لم يُعتمد أي توزيع بعد. اكتب رأيك أو عدّل أي مبلغ أو اطلب من مسؤول بعينه تبرير طلبه قبل تحويل النقاش إلى مشروع توزيع.',
      role:'المحضر الحي',
    },
  ];
}

export async function createCouncilDeliberationReplies(userId:string,userText:string):Promise<CouncilDeliberationReply[]>{
  const sql=getRawSql();
  const rows=await sql`select id from public.conversation_threads where user_id=${userId}::uuid and room_key='council' limit 1`;
  const threadId=rows[0]?.id?String(rows[0].id):null;
  if(!threadId) return [];
  const topic=topicFrom(userText);
  const allocationProposalId=randomUUID();
  const allocationSnapshot=await getFinancialCycleAllocationSnapshot(userId);
  const [carryForward,governorBrief]=await Promise.all([
    getLatestClosedCycleCarryForward(userId),
    getGovernorPreMeetingBrief(userId),
  ]);
  const allocationClaims=buildFinancialResponsibilityClaims(allocationSnapshot);
  const allocationSummary=summarizeAllocationConflict(allocationSnapshot,allocationClaims);
  const negotiation=negotiateAllocationClaims(allocationSnapshot,allocationClaims);
  const baseViews=makeViews(topic,allocationClaims).map(view=>{
    const prior=carryForwardNoteForOwner(carryForward,view.key);
    if(!prior||!prior.guidance.length) return view;
    return {...view,body:`${view.body} من الدورة السابقة: ${prior.guidance.join(' ')}`};
  });
  const views=allocationSummary.conflict||allocationSummary.unresolved_owners.length
    ? [...baseViews,...negotiationViews(negotiation)]
    : baseViews;
  const replies:CouncilDeliberationReply[]=[];
  for(const view of views){
    const responsibility=FINANCIAL_RESPONSIBILITY_BY_KEY.get(view.key);
    const priorCycleContext=carryForwardNoteForOwner(carryForward,view.key);
    const structured={
      council_deliberation:true,
      allocation_proposal_id:allocationProposalId,
      deliberation_stage:'discussion',
      topic,
      speaker_role:view.role,
      requires_user_deliberation:true,
      final_decision:false,
      minutes_live:true,
      execution_boundary:'advisory_only_until_user_ratification',
      allocation_meeting:true,
      responsibility_claim_schema:['requested_amount','minimum_amount','ideal_amount','impact_if_reduced'],
      responsibility_policy:responsibility?{
        mandate:responsibility.mandate,
        accountable_for:responsibility.accountableFor,
        must_protect:responsibility.mustProtect,
        may_yield_when:responsibility.mayYieldWhen,
        escalation:responsibility.escalation,
        kpis:responsibility.kpis,
        partner_entities:responsibility.partnerEntities,
        prohibited:responsibility.prohibited,
      }:null,
      accountability_boundary:responsibility?'يدافع عن مجاله لكنه لا يملك نسبة ثابتة، ويحاسب على النتيجة لا على حجم الحصة.':'لا يطالب بحصة مالية خاصة.',
      prior_cycle_carry_forward:priorCycleContext,
      governor_pre_meeting_brief:view.key==='central-governor'?governorBrief:null,
      prior_cycle_carry_forward_source:carryForward?{
        source_cycle_id:carryForward.sourceCycleId,
        source_plan_version_id:carryForward.sourcePlanVersionId,
        source_plan_version_number:carryForward.sourcePlanVersionNumber,
        plan_revision_count:carryForward.planRevisionCount,
        no_automatic_score:true,
        no_automatic_amount_adjustment:true,
      }:null,
      allocation_snapshot:allocationSnapshot,
      allocation_summary:allocationSummary,
      allocation_claim:allocationClaims.find(claim=>claim.ownerKey===view.key)??null,
      negotiation,
      ratification_required:true,
      ratified:false,
      auto_execution:false,
    };
    const inserted=await sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent',${view.key},${view.name},${view.kind},${view.body},${JSON.stringify(structured)}::jsonb
      )
      returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    `;
    const row=inserted[0];
    if(row) replies.push({
      ...row,
      id:String(row.id),
      sender_type:'agent',
      sender_key:String(row.sender_key),
      sender_name:String(row.sender_name),
      message_kind:String(row.message_kind) as ConversationMessageKind,
      body:String(row.body),
      structured_data:row.structured_data&&typeof row.structured_data==='object'?row.structured_data as Record<string,unknown>:{},
    });
  }
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return replies;
}
