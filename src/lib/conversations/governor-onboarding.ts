import { getRawSql } from '@/infrastructure/db/client';

export type OnboardingStep =
  | 'marital_status'
  | 'dependents'
  | 'home_city'
  | 'housing'
  | 'employment'
  | 'work_city'
  | 'commute'
  | 'income'
  | 'accounts'
  | 'obligations'
  | 'goals'
  | 'statements'
  | 'review'
  | 'complete';

const ORDER: OnboardingStep[] = [
  'marital_status','dependents','home_city','housing','employment','work_city',
  'commute','income','accounts','obligations','goals','statements','review','complete',
];

const QUESTIONS: Record<Exclude<OnboardingStep,'complete'>,string> = {
  marital_status:'نبدأ من وضعك الأسري. هل أنت أعزب، متزوج، مطلق أو أرمل؟',
  dependents:'من الأشخاص الذين تعولهم ماليًا؟ اكتب كل شخص في سطر بهذا الشكل: الاسم — المبلغ الشهري التقريبي. وإذا لا يوجد أحد اكتب «لا يوجد».',
  home_city:'في أي مدينة تسكن حاليًا؟ يكفيني اسم المدينة، ولا أحتاج عنوانًا دقيقًا.',
  housing:'ما وضع السكن الحالي: ملك، إيجار، مع العائلة، أو غير ذلك؟ وإذا كان عليك إيجار شهري اذكر قيمته.',
  employment:'ما طبيعة عملك الحالية؟ اذكر المسمى الوظيفي أو النشاط، واسم جهة العمل إن رغبت.',
  work_city:'في أي مدينة يقع عملك الأساسي؟ إذا كان عن بعد بالكامل قل «عن بعد».',
  commute:'كم تبعد جهة عملك تقريبًا عن سكنك؟ اذكر المسافة بالكيلومتر أو مدة الرحلة المعتادة، ووسيلة النقل التي تستخدمها.',
  income:'كم متوسط راتبك أو دخلك الشهري الصافي الذي يصل فعليًا إلى حسابك؟ اذكر الدخل الثابت وأي دخل متكرر آخر بشكل منفصل إن وجد.',
  accounts:'اذكر حساباتك المالية الحالية. اكتب كل حساب في سطر: اسم البنك — نوع الحساب — الرصيد التقريبي. لا ترسل كلمة المرور أو الرقم السري أو رمز التحقق.',
  obligations:'ما الالتزامات الأساسية والمتكررة عليك؟ اكتب كل التزام مع قيمته الشهرية، مثل إيجار، قرض، نفقة، فاتورة ثابتة أو التزام عائلي.',
  goals:'ما أهدافك المالية الحالية؟ اكتب كل هدف في سطر: اسم الهدف — المبلغ المستهدف — الموعد التقريبي إن وجد.',
  statements:'هل لديك كشوف حساب حديثة تساعدني على التحقق من الدخل والمصروفات والأرصدة؟ اكتب «نعم» أو «لا» الآن. لن أعتبر أي كشف حركة مالية منفذة؛ هو مصدر للتحليل والمطابقة فقط.',
  review:'جمعت الحد الأدنى الأساسي. اكتب «تأكيد» إذا تريد تثبيت ملف التأسيس وفتح بقية جهات نماء، أو اذكر المعلومة التي تريد تعديلها.',
};

const USES: Record<Exclude<OnboardingStep,'review'|'complete'>,string[]> = {
  marital_status:['household','budget','obligations'],
  dependents:['household','budget','protected_needs'],
  home_city:['transport','cost_context','life_memory'],
  housing:['budget','obligations','liquidity'],
  employment:['income_context','stability','transport'],
  work_city:['transport','cost_context'],
  commute:['fuel','maintenance','transport_forecast'],
  income:['budget','liquidity','solvency','financing'],
  accounts:['liquidity','net_worth','statement_matching'],
  obligations:['budget','liquidity','solvency','financing'],
  goals:['goals','budget','asset_planning'],
  statements:['evidence','statement_matching','transaction_classification'],
};

function normalizeArabicNumber(input:string){
  const map:Record<string,string>={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
  return input.replace(/[٠-٩]/g,d=>map[d]??d).replace(/,/g,'');
}

function extractNumbers(input:string){
  return [...normalizeArabicNumber(input).matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0])).filter(Number.isFinite);
}

function parseValue(step:OnboardingStep,text:string){
  const raw=text.trim();
  if(step==='dependents'){
    if(/^(لا يوجد|لايوجد|لا أحد|لا احد)$/i.test(raw)) return {raw,items:[]};
    const items=raw.split(/\n|،/).map(x=>x.trim()).filter(Boolean).map(item=>{
      const nums=extractNumbers(item);
      const monthly=nums[0]??null;
      const name=item.replace(/[\d٠-٩.,]+\s*(ريال|ر\.س)?/gi,'').replace(/[-—:]/g,' ').trim();
      return {name:name||item,monthly_support:monthly};
    });
    return {raw,items};
  }
  if(step==='income'||step==='obligations'||step==='accounts'||step==='goals'||step==='housing'||step==='commute'){
    return {raw,numbers:extractNumbers(raw)};
  }
  return {raw};
}

function nextStep(step:OnboardingStep):OnboardingStep{
  const index=ORDER.indexOf(step);
  return ORDER[Math.min(index+1,ORDER.length-1)] ?? 'complete';
}

export async function getGovernorOnboardingStatus(userId:string){
  const sql=getRawSql();
  await sql`
    insert into public.user_onboarding_state(user_id)
    values(${userId}::uuid)
    on conflict(user_id) do nothing
  `;
  const [stateRows,factRows]=await Promise.all([
    sql`select status,current_step,started_at,completed_at,updated_at from public.user_onboarding_state where user_id=${userId}::uuid limit 1`,
    sql`select fact_key,category,value_json,confidence,verified_at,uses from public.user_foundation_facts where user_id=${userId}::uuid and status='ACTIVE' order by created_at asc`,
  ]);
  const state=stateRows[0] ?? {status:'GATHERING',current_step:'marital_status'};
  const currentStep=(state.current_step as OnboardingStep) || 'marital_status';
  return {
    status:String(state.status),
    current_step:currentStep,
    complete:String(state.status)==='COMPLETED',
    question: currentStep==='complete' ? null : QUESTIONS[currentStep as Exclude<OnboardingStep,'complete'>],
    facts:factRows,
  };
}

export async function processGovernorOnboardingMessage(userId:string,text:string){
  const sql=getRawSql();
  const status=await getGovernorOnboardingStatus(userId);
  if(status.complete) return null;

  const step=status.current_step;
  if(step==='review'){
    if(/^(تأكيد|اكد|أكد|اعتمد|تمام|موافق)$/i.test(text.trim())){
      await sql`
        update public.user_onboarding_state
        set status='COMPLETED',current_step='complete',completed_at=now(),updated_at=now()
        where user_id=${userId}::uuid
      `;
      return {
        body:'تم تثبيت ملف التأسيس الأساسي. الآن أصبحت بقية جهات نماء متاحة لك، وسأبقى أتعلم من بياناتك المحدثة دون إعادة سؤال ما هو محفوظ وموثوق.',
        completed:true,
        current_step:'complete' as OnboardingStep,
        next_question:null,
      };
    }
    return {
      body:'لم أثبت الملف بعد. اذكر المعلومة التي تريد تعديلها، وسأبقي بقية الجهات مقيدة حتى تؤكد اكتمال الحد الأدنى.',
      completed:false,
      current_step:'review' as OnboardingStep,
      next_question:QUESTIONS.review,
    };
  }

  if(step==='complete') return null;

  const parsed=parseValue(step,text);
  await sql`
    insert into public.user_foundation_facts(
      user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status
    ) values(
      ${userId}::uuid,${step},${step},${JSON.stringify(parsed)}::jsonb,
      'USER_STATEMENT',1,now(),${USES[step as Exclude<OnboardingStep,'review'|'complete'>]},false,'ACTIVE'
    )
    on conflict(user_id,fact_key) do update set
      value_json=excluded.value_json,
      source=excluded.source,
      confidence=excluded.confidence,
      verified_at=excluded.verified_at,
      uses=excluded.uses,
      status='ACTIVE',
      updated_at=now()
  `;

  const next=nextStep(step);
  await sql`
    update public.user_onboarding_state
    set current_step=${next},updated_at=now()
    where user_id=${userId}::uuid
  `;

  return {
    body: next==='complete'
      ? 'تم جمع الحد الأدنى الأساسي.'
      : `تم حفظ هذه المعلومة. ${QUESTIONS[next as Exclude<OnboardingStep,'complete'>]}`,
    completed:false,
    current_step:next,
    next_question: next==='complete' ? null : QUESTIONS[next as Exclude<OnboardingStep,'complete'>],
  };
}
