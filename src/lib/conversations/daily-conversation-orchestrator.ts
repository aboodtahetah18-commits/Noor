import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
import { getUserOperationalDate } from '@/features/settings/queries/get-user-timezone';
import type { ConversationMessageKind, ConversationRoomKey } from './store';
import {
  readProactiveConversationMemory,
  registerPrompt,
  writeProactiveConversationMemory,
  type ProactiveConversationMemory,
} from './proactive-conversation-memory';
import { shouldProactivelyOpenCase } from '@/algorithmic-systems/orchestration/proactive-bank-planning';
import type { BankForwardNeed } from '@/algorithmic-systems/domain/interbank-planning';

export type ProactiveCandidate={
  key:string;
  roomKey:ConversationRoomKey;
  senderKey:string;
  senderName:string;
  kind:ConversationMessageKind;
  basePriority:number;
  cooldownDays:number;
  requestedFact:string|null;
  title:string;
  body:string;
  reason:string;
  interbankNeed?:BankForwardNeed|null;
};

type ProactiveRunResult={
  userId:string;
  status:'CREATED'|'NO_CANDIDATE'|'ALREADY_SENT'|'ONBOARDING_INCOMPLETE'|'NO_THREADS'|'FAILED';
  roomKey:ConversationRoomKey|null;
  promptKey:string|null;
  messageId:string|null;
  errorCode:string|null;
};

function numberValue(value:unknown){
  const n=typeof value==='number'?value:Number(value);
  return Number.isFinite(n)?n:0;
}

function daysBetween(later:Date,earlier:string|null){
  if(!earlier)return Number.POSITIVE_INFINITY;
  const parsed=new Date(earlier);
  if(Number.isNaN(parsed.getTime()))return Number.POSITIVE_INFINITY;
  return Math.max(0,(later.getTime()-parsed.getTime())/(24*60*60*1000));
}

export function candidateScore(
  candidate:ProactiveCandidate,
  memory:ProactiveConversationMemory,
  now:Date,
){
  const prompt=memory.prompts[candidate.key];
  const room=memory.rooms[candidate.roomKey];
  let score=candidate.basePriority;
  if(prompt?.lastAnswerAt) score+=6;
  if(prompt?.lastPromptAt&&!prompt.lastAnswerAt&&daysBetween(now,prompt.lastPromptAt)>=7) score-=12;
  if(room?.userTurns) score+=Math.min(6,Math.floor(room.userTurns/4));
  return score;
}

export function isCandidateEligible(
  candidate:ProactiveCandidate,
  memory:ProactiveConversationMemory,
  presentFacts:Set<string>,
  now:Date,
){
  if(candidate.requestedFact&&presentFacts.has(candidate.requestedFact))return false;
  const prompt=memory.prompts[candidate.key];
  if(!prompt)return true;
  if(prompt.lastAnswerAt&&daysBetween(now,prompt.lastAnswerAt)<30)return false;
  if(prompt.lastPromptAt&&daysBetween(now,prompt.lastPromptAt)<candidate.cooldownDays)return false;
  return true;
}

function dataCompletionCandidates(presentFacts:Set<string>):ProactiveCandidate[]{
  const candidates:ProactiveCandidate[]=[];
  if(!presentFacts.has('extended:bills')){
    candidates.push({
      key:'missing-bills',
      roomKey:'hilal',
      senderKey:'budget-spending-owner',
      senderName:'مسؤول الميزانية والإنفاق',
      kind:'request',
      basePriority:96,
      cooldownDays:10,
      requestedFact:'extended:bills',
      title:'استكمال الفواتير',
      body:'أراجع ميزانيتك الحالية، وبقيت عندي معلومة واحدة تمنعني من ضبط الالتزامات التشغيلية بدقة: الفواتير المتكررة. أرسل أسماء الفواتير التي تدفعها عادةً مع المبلغ التقريبي ودورية الاستحقاق، أو اكتب «لا توجد». لن أعيد سؤالك عنها ما دامت المعلومة صالحة.',
      reason:'الفواتير غير مكتملة في الذاكرة المالية المشتركة.',
    });
  }
  if(!presentFacts.has('extended:subscriptions')){
    candidates.push({
      key:'missing-subscriptions',
      roomKey:'hilal',
      senderKey:'budget-spending-owner',
      senderName:'مسؤول الميزانية والإنفاق',
      kind:'request',
      basePriority:91,
      cooldownDays:12,
      requestedFact:'extended:subscriptions',
      title:'استكمال الاشتراكات',
      body:'بيانات الفواتير محفوظة عندي، لكن الاشتراكات المتكررة ما زالت غير مكتملة. أرسل اسم كل اشتراك ومبلغه ودوريته، مثل الاتصالات أو التطبيقات أو النادي، أو اكتب «لا توجد». سأستخدمها لاحقًا دون إعادة طلبها منك.',
      reason:'الاشتراكات غير مكتملة في الذاكرة المالية المشتركة.',
    });
  }
  if(!presentFacts.has('extended:vehicle_details')){
    candidates.push({
      key:'missing-vehicle-details',
      roomKey:'hilal',
      senderKey:'budget-spending-owner',
      senderName:'مسؤول الميزانية والإنفاق',
      kind:'request',
      basePriority:84,
      cooldownDays:14,
      requestedFact:'extended:vehicle_details',
      title:'استكمال بيانات المركبة',
      body:'أريد تحسين تقدير الوقود والصيانة بدل الاعتماد على متوسطات عامة. إذا تستخدم سيارة بانتظام، أرسل النوع والموديل وسنة الصنع، وإن لم تكن لديك مركبة فاكتب «لا أستخدم مركبة». سأربط هذه المعلومة بحسابات التنقل لاحقًا.',
      reason:'بيانات المركبة غير مكتملة، ما يضعف تقدير مصروفات التشغيل.',
    });
  }
  if(!presentFacts.has('goals')){
    candidates.push({
      key:'missing-goals',
      roomKey:'assets',
      senderKey:'goals-owner',
      senderName:'مسؤول الأهداف',
      kind:'request',
      basePriority:80,
      cooldownDays:14,
      requestedFact:'goals',
      title:'تعريف الأهداف المالية',
      body:'أعرف الآن جزءًا من صورتك المالية، لكن لا توجد عندي أهداف مالية مؤكدة أستطيع التخطيط لها. اذكر هدفًا واحدًا مهمًا لك مع المبلغ التقريبي والموعد المستهدف، أو اكتب «لا يوجد هدف محدد الآن». بعدها سأتابع تقدمه بدل أن أبدأ من الصفر كل مرة.',
      reason:'لا توجد أهداف مالية مؤكدة في الذاكرة المشتركة.',
    });
  }
  return candidates;
}

function operationalCandidates(
  dashboard:Awaited<ReturnType<typeof getDashboardSummary>>,
):ProactiveCandidate[]{
  if(!dashboard)return [];
  const candidates:ProactiveCandidate[]=[];
  const overdue=dashboard.upcomingObligations.filter(item=>item.status==='OVERDUE');
  if(overdue.length){
    candidates.push({
      key:'overdue-obligations',
      roomKey:'hilal',
      senderKey:'obligations-owner',
      senderName:'مسؤول الالتزامات',
      kind:'risk',
      basePriority:140,
      cooldownDays:3,
      requestedFact:null,
      title:'متابعة استحقاق متأخر',
      body:`ظهر لدي ${overdue.length} استحقاق متأخر في السجلات. قبل أن أفترض أنه لم يُسدد: هل تم السداد خارج نماء، أم ما زال الالتزام قائمًا؟ أرسل الحالة أو الإثبات المتاح وسأحدّث المتابعة بناءً على ردك.`,
      reason:'يوجد استحقاق متأخر يحتاج تحققًا مباشرًا من المستخدم.',
    });
  }

  const deficit=numberValue(dashboard.forecast.expectedDeficit);
  if(deficit>0){
    const need:BankForwardNeed={
      id:'forecast-protection-gap',
      bank:'MALAA',
      domain:'LIQUIDITY_PROTECTION',
      title:'معالجة العجز المتوقع',
      currentAmount:0,
      targetAmount:deficit,
      gapAmount:deficit,
      horizonDays:30,
      minimumAcceptableAmount:deficit,
      idealAmount:deficit,
      priority:'HIGH',
      rationale:'منع وصول الدورة إلى عجز متوقع قبل حدوثه.',
      sourceCandidates:['خفض إنفاق مرن','إعادة توزيع داخل الدورة','دخل محقق إضافي'],
      status:'FORECAST',
      confidenceScore:90,
    };
    if(shouldProactivelyOpenCase(need)){
      candidates.push({
        key:'forecast-deficit',
        roomKey:'solvency',
        senderKey:'liquidity-protection-owner',
        senderName:'مسؤول السيولة والحماية',
        kind:'risk',
        basePriority:132,
        cooldownDays:4,
        requestedFact:null,
        title:'فجوة حماية متوقعة',
        body:`التوقع الحالي يشير إلى فجوة تقارب ${new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(deficit)} ر.س قبل نهاية الدورة. فتحتها كحالة استباقية بين بنك ملاءة وبنك الهلال. قبل اقتراح أي خفض: هل هناك دخل قريب أو مبلغ متوقع لم يُسجل بعد؟`,
        reason:'محرك التخطيط الاستباقي اكتشف فجوة حماية قريبة مرتفعة الأولوية.',
        interbankNeed:need,
      });
    }
  }

  const emergency=dashboard.emergencySummary;
  if(emergency?.targetAmount){
    const current=numberValue(emergency.currentBalance);
    const target=numberValue(emergency.targetAmount);
    const gap=Math.max(0,target-current);
    if(gap>0){
      const need:BankForwardNeed={
        id:'protection-reserve-gap',
        bank:'MALAA',
        domain:'LIQUIDITY_PROTECTION',
        title:'رفع احتياط الحماية',
        currentAmount:current,
        targetAmount:target,
        gapAmount:gap,
        horizonDays:60,
        minimumAcceptableAmount:Math.min(gap,Math.max(0,gap*0.5)),
        idealAmount:gap,
        priority:'HIGH',
        rationale:'إعادة بناء احتياط الحماية إلى الهدف المسجل.',
        sourceCandidates:['فائض الدورة','خفض إنفاق مرن','دخل إضافي محقق'],
        status:'ACTIVE',
        confidenceScore:88,
      };
      if(shouldProactivelyOpenCase(need)){
        candidates.push({
          key:'protection-gap',
          roomKey:'solvency',
          senderKey:'liquidity-protection-owner',
          senderName:'مسؤول السيولة والحماية',
          kind:'followup',
          basePriority:112,
          cooldownDays:7,
          requestedFact:null,
          title:'إعادة بناء الحماية',
          body:`رصيد الحماية ما زال أقل من الهدف المسجل بفجوة تقارب ${new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(gap)} ر.س. سأتابعها كهدف نشط، لكن لن أحجز أي مبلغ تلقائيًا. هل لديك مبلغ مخصص للحماية خارج الحسابات المسجلة حاليًا؟`,
          reason:'فجوة حماية مؤكدة صالحة للفتح الاستباقي.',
          interbankNeed:need,
        });
      }
    }
  }
  return candidates;
}

async function activeFactKeys(userId:string){
  const sql=getRawSql();
  const [rows,threadRows]=await Promise.all([
    sql`
      select fact_key
      from public.user_foundation_facts
      where user_id=${userId}::uuid and status='ACTIVE'
    `,
    sql`
      select room_key,metadata
      from public.conversation_threads
      where user_id=${userId}::uuid and room_key in ('central','hilal')
    `,
  ]);
  const facts=new Set(rows.map(row=>String(row.fact_key)));
  for(const row of threadRows){
    const metadata=row.metadata&&typeof row.metadata==='object'&&!Array.isArray(row.metadata)
      ? row.metadata as Record<string,unknown>
      : {};
    if(String(row.room_key)==='central'){
      const baseline=metadata.financial_baseline&&typeof metadata.financial_baseline==='object'&&!Array.isArray(metadata.financial_baseline)
        ? metadata.financial_baseline as Record<string,unknown>
        : {};
      if(typeof baseline.bills_note==='string') facts.add('extended:bills');
      if(typeof baseline.subscriptions_note==='string') facts.add('extended:subscriptions');
    }
    if(String(row.room_key)==='hilal'){
      const intake=metadata.budget_spending_intake&&typeof metadata.budget_spending_intake==='object'&&!Array.isArray(metadata.budget_spending_intake)
        ? metadata.budget_spending_intake as Record<string,unknown>
        : {};
      if(typeof intake.vehicle==='string'&&intake.vehicle.trim()) facts.add('extended:vehicle_details');
    }
  }
  return facts;
}

async function onboardingComplete(userId:string){
  const sql=getRawSql();
  const rows=await sql`
    select status,current_step
    from public.user_onboarding_state
    where user_id=${userId}::uuid
    limit 1
  `;
  return rows[0]?.status==='COMPLETED'||rows[0]?.current_step==='complete';
}

async function alreadySentToday(userId:string,operationalDate:string){
  const sql=getRawSql();
  const rows=await sql`
    select id
    from public.conversation_messages
    where user_id=${userId}::uuid
      and coalesce(structured_data->>'proactive_prompt','false')='true'
      and structured_data->>'operational_date'=${operationalDate}
    limit 1
  `;
  return Boolean(rows[0]?.id);
}

export async function runDailyConversationOrchestratorForUser(
  userId:string,
  now:Date=new Date(),
):Promise<ProactiveRunResult>{
  try{
    if(!await onboardingComplete(userId)){
      return {userId,status:'ONBOARDING_INCOMPLETE',roomKey:null,promptKey:null,messageId:null,errorCode:null};
    }
    const operationalDate=await getUserOperationalDate(userId,now);
    if(await alreadySentToday(userId,operationalDate)){
      return {userId,status:'ALREADY_SENT',roomKey:null,promptKey:null,messageId:null,errorCode:null};
    }

    const [facts,memory,dashboard]=await Promise.all([
      activeFactKeys(userId),
      readProactiveConversationMemory(userId),
      getDashboardSummary(userId).catch(()=>null),
    ]);

    const candidates=[
      ...operationalCandidates(dashboard),
      ...dataCompletionCandidates(facts),
    ].filter(candidate=>isCandidateEligible(candidate,memory,facts,now))
      .sort((a,b)=>candidateScore(b,memory,now)-candidateScore(a,memory,now));

    const selected=candidates[0];
    if(!selected){
      return {userId,status:'NO_CANDIDATE',roomKey:null,promptKey:null,messageId:null,errorCode:null};
    }

    const sql=getRawSql();
    const threadRows=await sql`
      select id
      from public.conversation_threads
      where user_id=${userId}::uuid and room_key=${selected.roomKey}
      limit 1
    `;
    const threadId=threadRows[0]?.id?String(threadRows[0].id):null;
    if(!threadId){
      return {userId,status:'NO_THREADS',roomKey:selected.roomKey,promptKey:selected.key,messageId:null,errorCode:null};
    }

    const id=randomUUID();
    await sql.transaction([
      sql`insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        ${id},${threadId}::uuid,${userId}::uuid,'agent',${selected.senderKey},${selected.senderName},
        ${selected.kind},${selected.body},
        ${JSON.stringify({
          proactive_prompt:true,
          proactive_key:selected.key,
          proactive_title:selected.title,
          proactive_reason:selected.reason,
          operational_date:operationalDate,
          requested_fact:selected.requestedFact,
          interbank_need:selected.interbankNeed??null,
          user_action_required:true,
          external_execution:false,
          execution_boundary:'طلب بيانات أو متابعة فقط؛ لا تنفيذ مالي خارجي تلقائي',
        })}::jsonb
      )`,
      sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid and user_id=${userId}::uuid`,
    ]);

    const nextMemory=registerPrompt(memory,selected.key,now.toISOString());
    await writeProactiveConversationMemory(userId,nextMemory);
    return {userId,status:'CREATED',roomKey:selected.roomKey,promptKey:selected.key,messageId:id,errorCode:null};
  }catch(error){
    return {
      userId,
      status:'FAILED',
      roomKey:null,
      promptKey:null,
      messageId:null,
      errorCode:(error instanceof Error?error.message:'DAILY_CONVERSATION_ORCHESTRATOR_FAILED').slice(0,120),
    };
  }
}

export async function runDailyConversationOrchestratorJob(now:Date=new Date()){
  const sql=getRawSql();
  const rows=await sql`
    select distinct t.user_id::text as user_id
    from public.conversation_threads t
    join public.user_onboarding_state s on s.user_id=t.user_id
    where s.status='COMPLETED' or s.current_step='complete'
    order by t.user_id::text
  `;
  const results:ProactiveRunResult[]=[];
  for(const row of rows){
    results.push(await runDailyConversationOrchestratorForUser(String(row.user_id),now));
  }
  return results;
}
