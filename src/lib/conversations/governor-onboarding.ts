import { getRawSql } from '@/infrastructure/db/client';
import { projectConfirmedOnboardingFacts } from '@/lib/conversations/onboarding-projection';

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
  dependents:'من الأشخاص الذين تعولهم ماليًا؟ أضف كل فرد في البطاقة المخصصة، ثم أكد المجموعة مرة واحدة. وإذا لا يوجد أحد استخدم خيار «لا يوجد».',
  home_city:'في أي مدينة تسكن حاليًا؟ يكفيني اسم المدينة، ولا أحتاج عنوانًا دقيقًا.',
  housing:'ما وضع السكن الحالي: ملك، إيجار، مع العائلة، أو غير ذلك؟ وإذا كان عليك إيجار شهري اذكر قيمته.',
  employment:'ما طبيعة عملك الحالية؟ اذكر المسمى الوظيفي أو النشاط، واسم جهة العمل إن رغبت.',
  work_city:'في أي مدينة يقع عملك الأساسي؟ إذا كان عن بعد بالكامل قل «عن بعد».',
  commute:'كم تبعد جهة عملك تقريبًا عن سكنك؟ اذكر المسافة بالكيلومتر أو مدة الرحلة المعتادة، ووسيلة النقل التي تستخدمها.',
  income:'أدخل مكونات راتبك ودخلك في النموذج: الأساسي، البدلات، الاستقطاعات، الدخل المتكرر الآخر، ثم الصافي الفعلي الذي يصل إلى الحساب.',
  accounts:'أضف حساباتك المالية واحدًا واحدًا في المكوّن. يكفيني البنك، نوع الحساب، معرف مختصر إن رغبت، الاستخدام الحالي والرصيد الافتتاحي. لا ترسل كلمة مرور أو رمز تحقق.',
  obligations:'أضف الالتزامات القائمة واحدًا واحدًا في المكوّن، مع المبلغ والتكرار والموعد أو الرصيد المتبقي إن توفر. وإذا لا يوجد أي التزام، أكد ذلك من داخل المكوّن.',
  goals:'أضف أهدافك المالية واحدًا واحدًا في المكوّن، مع المبلغ المستهدف والموعد والأولوية والمرونة والمبلغ المخصص حاليًا إن وجد.',
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

function isNone(raw:string){
  return /^(لا يوجد|لايوجد|لا أحد|لا احد|ما عندي|ليس لدي|لا)$/i.test(raw.trim());
}

export function validateOnboardingAnswer(step:OnboardingStep,text:string): string | null {
  const raw=text.trim();
  if(!raw) return 'أحتاج إجابة قصيرة على السؤال الحالي قبل أن ننتقل للخطوة التالية.';

  if(step==='marital_status' && !/(أعزب|اعزب|متزوج|مطلق|أرمل|ارمل)/.test(raw)){
    return 'اختر واحدة فقط: أعزب، متزوج، مطلق أو أرمل.';
  }

  if(step==='dependents' && !isNone(raw)){
    const items=raw.split(/\n|،/).map(x=>x.trim()).filter(Boolean);
    if(!items.length || items.some(item=>extractNumbers(item).length===0)){
      return 'اكتب كل شخص بهذا الشكل: الاسم — المبلغ الشهري. مثال: أحمد — 800. وإذا لا يوجد أحد اكتب «لا يوجد».';
    }
  }

  if(step==='home_city' && (raw.length<2 || /^\d+$/.test(normalizeArabicNumber(raw)))){
    return 'اكتب اسم مدينة السكن فقط، مثل: خميس مشيط.';
  }

  if(step==='housing'){
    if(!/(ملك|إيجار|ايجار|مع العائلة|مع الاهل|مع الأهل|غير ذلك)/i.test(raw)){
      return 'اذكر وضع السكن: ملك، إيجار، مع العائلة، أو غير ذلك.';
    }
    if(/إيجار|ايجار/.test(raw) && extractNumbers(raw).length===0){
      return 'ذكرت أن السكن إيجار؛ أحتاج قيمة الإيجار الشهري التقريبية حتى أحسب التزاماتك الأساسية.';
    }
  }

  if(step==='employment' && raw.length<3){
    return 'اذكر طبيعة عملك أو المسمى الوظيفي باختصار.';
  }

  if(step==='work_city' && raw.length<2){
    return 'اكتب مدينة العمل أو اكتب «عن بعد» إذا كان عملك عن بعد بالكامل.';
  }

  if(step==='commute' && !/عن بعد/.test(raw) && extractNumbers(raw).length===0){
    return 'اذكر المسافة بالكيلومتر أو مدة الرحلة المعتادة ووسيلة النقل.';
  }

  if(step==='income' && extractNumbers(raw).filter(n=>n>0).length===0){
    return 'أحتاج مبلغ الدخل الشهري الصافي الذي يصل فعليًا إلى حسابك.';
  }

  if(step==='accounts' && !isNone(raw)){
    const lines=raw.split(/\n|،/).map(x=>x.trim()).filter(Boolean);
    if(!lines.length || lines.some(line=>extractNumbers(line).length===0)){
      return 'اكتب كل حساب في سطر: اسم البنك — نوع الحساب — الرصيد التقريبي. لا ترسل أي رقم سري أو رمز تحقق.';
    }
  }

  if(step==='obligations' && !isNone(raw) && extractNumbers(raw).length===0){
    return 'اذكر كل التزام مع قيمته الشهرية، أو اكتب «لا يوجد».';
  }

  if(step==='goals' && !isNone(raw) && extractNumbers(raw).length===0){
    return 'اذكر اسم الهدف والمبلغ المستهدف، أو اكتب «لا يوجد».';
  }

  if(step==='statements' && !/^(نعم|لا)$/i.test(raw)){
    return 'اكتب «نعم» أو «لا» فقط. إذا قلت نعم سأطلب منك رفع الكشف في خطوة المرفقات.';
  }

  return null;
}

export function parseOnboardingValue(step:OnboardingStep,text:string){
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

export function getGovernorOnboardingQuestion(step:OnboardingStep){
  return step==='complete' ? null : QUESTIONS[step as Exclude<OnboardingStep,'complete'>];
}

export function getGovernorWelcome(step:OnboardingStep='marital_status'){
  const question=getGovernorOnboardingQuestion(step);
  const intro='مرحبًا بك في نماء. أنا محافظ بنك نماء المركزي. مهمتي في البداية أن أتعرف على وضعك المالي والأسري خطوة بخطوة حتى لا تُبنى أي توصية على افتراضات. سأطرح سؤالًا واحدًا في كل مرة، ويمكنك تصحيح أي معلومة لاحقًا.';
  return question ? `${intro} ${question}` : intro;
}

export function nextGovernorOnboardingStep(step:OnboardingStep):OnboardingStep{
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
    question: getGovernorOnboardingQuestion(currentStep),
    facts:factRows,
  };
}


type StructuredOnboardingPayload =
  | {step:'dependents';items:Array<{name:string;relationship:string;age?:number|null;monthly_support:number;annual_support?:number|null;special_needs?:string;financial_dependency:boolean}>}
  | {step:'income';base_salary:number;fixed_allowances?:number;variable_allowances?:number;deductions?:number;actual_net:number;other_recurring_income?:number;difference_explanation?:string}
  | {step:'accounts';items:Array<{bank_name:string;account_type:string;short_identifier?:string;iban?:string;card_last4?:string;card_type?:string;usage?:string;opening_balance:number;included_in_namaa:boolean}>}
  | {step:'obligations';items:Array<{name:string;amount:number;recurrence:string;provider?:string;due_day?:number|null;remaining_balance?:number|null;end_date?:string|null;finance_cost?:number|null}>}
  | {step:'goals';items:Array<{name:string;target_amount:number;target_date?:string|null;priority?:string;flexibility?:string;allocated_amount?:number}>};

function cleanText(value:unknown,max=240){
  return typeof value==='string' ? value.trim().slice(0,max) : '';
}

function finiteNonNegative(value:unknown){
  const number=typeof value==='number'?value:Number(value);
  return Number.isFinite(number)&&number>=0 ? number : null;
}

function isoDateOrNull(value:unknown){
  if(value===null||value===undefined||value==='') return null;
  if(typeof value!=='string') throw new Error('ONBOARDING_STRUCTURED_DATE_INVALID');
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match) throw new Error('ONBOARDING_STRUCTURED_DATE_INVALID');
  const y=Number(match[1]??'');
  const m=Number(match[2]??'');
  const d=Number(match[3]??'');
  const date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d) throw new Error('ONBOARDING_STRUCTURED_DATE_INVALID');
  return value;
}

export function normalizeStructuredOnboardingPayload(payload:StructuredOnboardingPayload){
  if(payload.step==='dependents'){
    const items=Array.isArray(payload.items)?payload.items:[];
    return {items:items.map(item=>{
      const name=cleanText(item.name,120);
      const relationship=cleanText(item.relationship,80);
      const monthly=finiteNonNegative(item.monthly_support);
      const annual=item.annual_support===undefined||item.annual_support===null?null:finiteNonNegative(item.annual_support);
      const age=item.age===undefined||item.age===null?null:Number(item.age);
      if(!name||!relationship||monthly===null||annual===null&&item.annual_support!==undefined&&item.annual_support!==null||age!==null&&(!Number.isInteger(age)||age<0||age>120)){
        throw new Error('ONBOARDING_DEPENDENT_INVALID');
      }
      return {
        name,relationship,age,monthly_support:monthly,annual_support:annual,
        special_needs:cleanText(item.special_needs,500)||null,
        financial_dependency:Boolean(item.financial_dependency),
      };
    })};
  }

  if(payload.step==='income'){
    const base=finiteNonNegative(payload.base_salary);
    const fixed=finiteNonNegative(payload.fixed_allowances??0);
    const variable=finiteNonNegative(payload.variable_allowances??0);
    const deductions=finiteNonNegative(payload.deductions??0);
    const actual=finiteNonNegative(payload.actual_net);
    const other=finiteNonNegative(payload.other_recurring_income??0);
    if(base===null||fixed===null||variable===null||deductions===null||actual===null||other===null||actual<=0){
      throw new Error('ONBOARDING_INCOME_INVALID');
    }
    const expected=Math.max(0,base+fixed+variable+other-deductions);
    const explanation=cleanText(payload.difference_explanation,500);
    if(expected!==actual&&!explanation) throw new Error('ONBOARDING_INCOME_DIFFERENCE_EXPLANATION_REQUIRED');
    return {
      base_salary:base,fixed_allowances:fixed,variable_allowances:variable,deductions,
      other_recurring_income:other,expected_net:expected,actual_net:actual,
      reconciliation_status:expected===actual?'MATCHED':'EXPLAINED_DIFFERENCE',
      difference_explanation:explanation||null,
    };
  }

  if(payload.step==='accounts'){
    const items=Array.isArray(payload.items)?payload.items:[];
    if(items.length===0) throw new Error('ONBOARDING_ACCOUNTS_REQUIRED');
    return {items:items.map(item=>{
      const bank=cleanText(item.bank_name,120);
      const type=cleanText(item.account_type,80);
      const opening=finiteNonNegative(item.opening_balance);
      if(!bank||!type||opening===null) throw new Error('ONBOARDING_ACCOUNT_INVALID');
      const ibanRaw=cleanText(item.iban,40).replace(/\s+/g,'').toUpperCase();
      const iban=ibanRaw?ibanRaw:null;
      if(iban&&!/^SA\d{22}$/.test(iban)) throw new Error('ONBOARDING_ACCOUNT_IBAN_INVALID');
      const cardLast4=cleanText(item.card_last4,4);
      if(cardLast4&&!/^\d{4}$/.test(cardLast4)) throw new Error('ONBOARDING_ACCOUNT_CARD_LAST4_INVALID');
      const cardType=cleanText(item.card_type,40)||null;
      return {
        bank_name:bank,account_type:type,
        short_identifier:cleanText(item.short_identifier,40)||null,
        iban,
        card_last4:cardLast4||null,
        card_type:cardType,
        usage:cleanText(item.usage,160)||null,
        opening_balance:opening,
        included_in_namaa:Boolean(item.included_in_namaa),
      };
    })};
  }

  if(payload.step==='obligations'){
    const items=Array.isArray(payload.items)?payload.items:[];
    return {items:items.map(item=>{
      const name=cleanText(item.name,160);
      const amount=finiteNonNegative(item.amount);
      const recurrence=cleanText(item.recurrence,40);
      const dueDay=item.due_day===undefined||item.due_day===null?null:Number(item.due_day);
      const remaining=item.remaining_balance===undefined||item.remaining_balance===null?null:finiteNonNegative(item.remaining_balance);
      const cost=item.finance_cost===undefined||item.finance_cost===null?null:finiteNonNegative(item.finance_cost);
      if(!name||amount===null||amount<=0||!recurrence||dueDay!==null&&(!Number.isInteger(dueDay)||dueDay<1||dueDay>31)||remaining===null&&item.remaining_balance!==undefined&&item.remaining_balance!==null||cost===null&&item.finance_cost!==undefined&&item.finance_cost!==null){
        throw new Error('ONBOARDING_OBLIGATION_INVALID');
      }
      return {
        name,amount,recurrence,provider:cleanText(item.provider,160)||null,due_day:dueDay,
        remaining_balance:remaining,end_date:isoDateOrNull(item.end_date),finance_cost:cost,
      };
    })};
  }

  const items=Array.isArray(payload.items)?payload.items:[];
  return {items:items.map(item=>{
    const name=cleanText(item.name,160);
    const target=finiteNonNegative(item.target_amount);
    const allocated=finiteNonNegative(item.allocated_amount??0);
    if(!name||target===null||target<=0||allocated===null) throw new Error('ONBOARDING_GOAL_INVALID');
    return {
      name,target_amount:target,target_date:isoDateOrNull(item.target_date),
      priority:cleanText(item.priority,80)||null,flexibility:cleanText(item.flexibility,80)||null,
      allocated_amount:allocated,
    };
  })};
}

type GoalFeasibility={
  name:string;
  target_amount:number;
  allocated_amount:number;
  remaining_amount:number;
  target_date:string|null;
  months_remaining:number|null;
  required_monthly:number|null;
  sustainable_capacity:number|null;
  status:'قابل مبدئيًا'|'يحتاج تعديل'|'لا توجد بيانات كافية';
  reasons:string[];
  alternatives:string[];
  confidence:'مرتفعة'|'متوسطة'|'منخفضة';
};

function monthlyEquivalentObligation(item:Record<string,unknown>){
  const amount=Number(item.amount??0);
  if(!Number.isFinite(amount)||amount<=0) return 0;
  const recurrence=String(item.recurrence??'MONTHLY').toUpperCase();
  if(recurrence==='WEEKLY') return amount*52/12;
  if(recurrence==='YEARLY') return amount/12;
  if(recurrence==='MONTHLY') return amount;
  return 0;
}

function monthsUntil(targetDate:string|null){
  if(!targetDate) return null;
  const target=new Date(targetDate+'T00:00:00Z');
  if(Number.isNaN(target.getTime())) return null;
  const now=new Date();
  const months=(target.getUTCFullYear()-now.getUTCFullYear())*12+(target.getUTCMonth()-now.getUTCMonth());
  const adjusted=target.getUTCDate()>=now.getUTCDate()?months:months-1;
  return Math.max(1,adjusted);
}

export async function analyzeStructuredGoals(userId:string,goals:Array<Record<string,unknown>>):Promise<GoalFeasibility[]>{
  const sql=getRawSql();
  const rows=await sql`
    select fact_key,value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid and status='ACTIVE'
      and fact_key in ('income','obligations')
  `;
  const facts=new Map(rows.map(row=>[String(row.fact_key),row.value_json]));
  const incomeRecord=facts.get('income')&&typeof facts.get('income')==='object'?facts.get('income') as Record<string,unknown>:null;
  const income=incomeRecord&&typeof incomeRecord.actual_net==='number'?incomeRecord.actual_net:null;
  const obligationRecord=facts.get('obligations')&&typeof facts.get('obligations')==='object'?facts.get('obligations') as Record<string,unknown>:null;
  const obligationItems=obligationRecord&&Array.isArray(obligationRecord.items)
    ? obligationRecord.items.filter((item):item is Record<string,unknown>=>Boolean(item)&&typeof item==='object'&&!Array.isArray(item))
    : [];
  const monthlyObligations=obligationItems.reduce((sum,item)=>sum+monthlyEquivalentObligation(item),0);
  const sustainableCapacity=typeof income==='number'?Math.max(0,income-monthlyObligations):null;

  return goals.map(goal=>{
    const name=String(goal.name??'هدف مالي');
    const target=Number(goal.target_amount??0);
    const allocated=Math.max(0,Number(goal.allocated_amount??0));
    const remaining=Math.max(0,target-allocated);
    const targetDate=typeof goal.target_date==='string'?goal.target_date:null;
    const months=monthsUntil(targetDate);
    const required=months?remaining/months:null;
    const reasons:string[]=[];
    const alternatives:string[]=[];
    let status:GoalFeasibility['status']='لا توجد بيانات كافية';
    let confidence:GoalFeasibility['confidence']='منخفضة';

    if(sustainableCapacity!==null&&required!==null){
      confidence='متوسطة';
      if(required<=sustainableCapacity){
        status='قابل مبدئيًا';
        reasons.push('المساهمة الشهرية المطلوبة لا تتجاوز السعة المتبقية بعد الدخل والالتزامات المسجلة.');
      }else{
        status='يحتاج تعديل';
        reasons.push('المساهمة الشهرية المطلوبة تتجاوز السعة المتبقية من البيانات الحالية.');
        if(sustainableCapacity>0){
          const requiredMonths=Math.ceil(remaining/sustainableCapacity);
          alternatives.push(`تمديد المدة إلى نحو ${requiredMonths} شهرًا إذا بقيت السعة الحالية كما هي.`);
        }
        alternatives.push('تقليل المبلغ المستهدف أو زيادة المبلغ المخصص إذا كان ذلك مناسبًا للمستخدم.');
      }
      reasons.push('التحليل مبدئي حتى تكتمل السيولة المحمية والاحتياطيات والاستحقاقات القريبة.');
    }else{
      if(sustainableCapacity===null) reasons.push('يلزم دخل فعلي مؤكد قبل حساب القدرة الشهرية.');
      if(required===null) reasons.push('يلزم موعد أو نافذة زمنية للهدف لحساب المساهمة المطلوبة.');
    }

    return {
      name,target_amount:target,allocated_amount:allocated,remaining_amount:remaining,target_date:targetDate,
      months_remaining:months,required_monthly:required,sustainable_capacity:sustainableCapacity,
      status,reasons,alternatives,confidence,
    };
  });
}

export async function processGovernorStructuredOnboarding(userId:string,payload:StructuredOnboardingPayload){
  const sql=getRawSql();
  const status=await getGovernorOnboardingStatus(userId);
  if(status.complete) throw new Error('ONBOARDING_ALREADY_COMPLETED');
  if(status.current_step!==payload.step) throw new Error('ONBOARDING_STEP_MISMATCH');

  const normalized=normalizeStructuredOnboardingPayload(payload);
  await sql`
    insert into public.user_foundation_facts(
      user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status
    ) values(
      ${userId}::uuid,${payload.step},${payload.step},${JSON.stringify(normalized)}::jsonb,
      'USER_STATEMENT',1,now(),${USES[payload.step]},false,'ACTIVE'
    )
    on conflict(user_id,fact_key) do update set
      value_json=excluded.value_json,
      source=excluded.source,
      confidence=excluded.confidence,
      verified_at=excluded.verified_at,
      uses=excluded.uses,
      requires_confirmation=false,
      status='ACTIVE',
      updated_at=now()
  `;

  const next=nextGovernorOnboardingStep(payload.step);
  await sql`
    update public.user_onboarding_state
    set current_step=${next},updated_at=now()
    where user_id=${userId}::uuid
  `;

  const goalAnalysis=payload.step==='goals'
    ? await analyzeStructuredGoals(userId,(normalized as {items:Array<Record<string,unknown>>}).items)
    : null;
  return {
    completed:false,
    current_step:next,
    next_question:next==='complete'?null:QUESTIONS[next as Exclude<OnboardingStep,'complete'>],
    accepted:true,
    structured:true,
    goal_analysis:goalAnalysis,
  };
}

export async function processGovernorOnboardingMessage(userId:string,text:string){
  const sql=getRawSql();
  const status=await getGovernorOnboardingStatus(userId);
  if(status.complete) return null;

  const step=status.current_step;
  if(step==='review'){
    if(/^(تأكيد|اكد|أكد|اعتمد|تمام|موافق)$/i.test(text.trim())){
      const projection=await projectConfirmedOnboardingFacts(userId);
      await sql`
        update public.user_onboarding_state
        set status='COMPLETED',current_step='complete',completed_at=now(),updated_at=now()
        where user_id=${userId}::uuid
      `;
      const createdTotal=
        projection.accounts_created+
        projection.goals_created+
        projection.obligations_created+
        projection.incomes_created;
      const projectionNote=createdTotal>0
        ? ` حوّلت البيانات المؤكدة إلى ${createdTotal} سجل مالي تأسيسي قابل للمراجعة دون إنشاء أي حركة مالية.`
        : ' لم أحتج إلى إنشاء سجلات مالية جديدة لأن البيانات المطابقة موجودة مسبقًا أو لا تتطلب سجلًا متخصصًا بعد.';
      const incomeNote=projection.income_deferred
        ? ' أبقيت الدخل في ذاكرة التأسيس إلى أن توجد دورة مالية صالحة لربطه بها.'
        : '';
      return {
        body:`تم تثبيت ملف التأسيس الأساسي. الآن أصبحت بقية جهات نماء متاحة لك.${projectionNote}${incomeNote}`,
        completed:true,
        current_step:'complete' as OnboardingStep,
        next_question:null,
        accepted:true,
        projection,
      };
    }
    return {
      body:'لم أثبت الملف بعد. اذكر المعلومة التي تريد تعديلها، وسأبقي بقية الجهات مقيدة حتى تؤكد اكتمال الحد الأدنى.',
      completed:false,
      current_step:'review' as OnboardingStep,
      next_question:QUESTIONS.review,
      accepted:false,
    };
  }

  if(step==='complete') return null;

  const validationMessage=validateOnboardingAnswer(step,text);
  if(validationMessage){
    return {
      body:validationMessage,
      completed:false,
      current_step:step,
      next_question:getGovernorOnboardingQuestion(step),
      accepted:false,
    };
  }

  const parsed=parseOnboardingValue(step,text);
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

  const next=nextGovernorOnboardingStep(step);
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
    accepted:true,
  };
}
