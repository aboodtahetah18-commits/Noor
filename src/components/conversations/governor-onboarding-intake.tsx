'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { BANK_OPTIONS } from '@/features/accounts/banks';
import styles from './conversation-workspace.module.css';

type IntakeStep=
  | 'marital_status'|'dependents'|'home_city'|'housing'|'employment'|'work_city'
  | 'commute'|'income'|'accounts'|'obligations'|'goals'|'statements'|'review';
type StructuredIntakeStep='dependents'|'income'|'accounts'|'obligations'|'goals';

const INTAKE_STAGES:Array<{key:IntakeStep;title:string;question:string}>=[
  {key:'marital_status',title:'الوضع الأسري',question:'ما حالتك الاجتماعية الحالية؟'},
  {key:'dependents',title:'المعالون',question:'من الأشخاص الذين تعولهم أو تصرف عليهم ماليًا؟'},
  {key:'home_city',title:'مدينة السكن',question:'في أي مدينة تسكن حاليًا؟'},
  {key:'housing',title:'السكن',question:'ما وضع السكن الحالي؟ وهل يوجد إيجار شهري؟'},
  {key:'employment',title:'العمل',question:'ما طبيعة عملك الحالية؟'},
  {key:'work_city',title:'مدينة العمل',question:'في أي مدينة يقع عملك الأساسي؟'},
  {key:'commute',title:'التنقل',question:'ما مسافة أو مدة التنقل المعتادة ووسيلته؟'},
  {key:'income',title:'الدخل',question:'ما تفاصيل الراتب والدخل والصافي الفعلي؟'},
  {key:'accounts',title:'الحسابات',question:'ما الحسابات المالية والأرصدة الافتتاحية؟'},
  {key:'obligations',title:'الالتزامات',question:'ما الالتزامات المالية القائمة؟'},
  {key:'goals',title:'الأهداف',question:'ما الأهداف المالية والمبالغ والمواعيد؟'},
  {key:'statements',title:'كشوف الحساب',question:'هل لديك كشوف حساب حديثة للمطابقة؟'},
  {key:'review',title:'المراجعة النهائية',question:'هل تريد تثبيت ملف التأسيس بعد مراجعته؟'},
];
type MessagePayload={id:string;sender_type:'user'|'agent'|'system';sender_name:string;message_kind:'message'|'risk'|'decision'|'recommendation'|'followup'|'request';body:string;structured_data?:Record<string,unknown>;created_at?:string};

type Dependent={name:string;relationship:string;age:string;monthly_support:string;annual_support:string;special_needs:string;financial_dependency:boolean};
type Account={bank_name:string;account_type:string;short_identifier:string;iban:string;card_last4:string;card_type:string;usage:string;opening_balance:string;included_in_namaa:boolean};
type Obligation={name:string;amount:string;recurrence:string;provider:string;due_day:string;remaining_balance:string;end_date:string;finance_cost:string};
type Goal={name:string;target_amount:string;target_date:string;priority:string;flexibility:string;allocated_amount:string};

type MobileEditor =
  | {kind:'dependents';index:number|null;draft:Dependent}
  | {kind:'accounts';index:number|null;draft:Account}
  | {kind:'obligations';index:number|null;draft:Obligation}
  | {kind:'goals';index:number|null;draft:Goal}
  | null;

const emptyDependent=():Dependent=>({name:'',relationship:'',age:'',monthly_support:'',annual_support:'',special_needs:'',financial_dependency:true});
const emptyAccount=():Account=>({bank_name:'',account_type:'BANK',short_identifier:'',iban:'',card_last4:'',card_type:'مدى',usage:'',opening_balance:'',included_in_namaa:true});
const emptyObligation=():Obligation=>({name:'',amount:'',recurrence:'MONTHLY',provider:'',due_day:'',remaining_balance:'',end_date:'',finance_cost:''});
const emptyGoal=():Goal=>({name:'',target_amount:'',target_date:'',priority:'',flexibility:'',allocated_amount:''});

const hasDependent=(item:Dependent)=>Boolean(item.name.trim()||item.relationship.trim()||item.monthly_support.trim());
const hasAccount=(item:Account)=>Boolean(item.bank_name.trim()||item.opening_balance.trim()||item.short_identifier.trim()||item.iban.trim()||item.card_last4.trim());
const hasObligation=(item:Obligation)=>Boolean(item.name.trim()||item.amount.trim()||item.provider.trim());
const hasGoal=(item:Goal)=>Boolean(item.name.trim()||item.target_amount.trim()||item.allocated_amount.trim());
const recurrenceLabel=(value:string)=>({MONTHLY:'شهري',WEEKLY:'أسبوعي',YEARLY:'سنوي',ONE_TIME:'مرة واحدة',OTHER:'آخر'}[value]??'غير محدد');

function numberOrUndefined(value:string){
  if(!value.trim()) return undefined;
  const number=Number(value);
  return Number.isFinite(number)?number:undefined;
}

function errorText(code:string){
  const labels:Record<string,string>={
    ONBOARDING_DEPENDENT_INVALID:'راجع بيانات أفراد الأسرة؛ الاسم والعلاقة والمبلغ الشهري يجب أن تكون واضحة.',
    ONBOARDING_INCOME_INVALID:'راجع مكونات الدخل والصافي الفعلي.',
    ONBOARDING_INCOME_DIFFERENCE_EXPLANATION_REQUIRED:'الصافي المحسوب لا يطابق الصافي الفعلي. اكتب سبب الفرق قبل التأكيد.',
    ONBOARDING_ACCOUNTS_REQUIRED:'أضف حسابًا واحدًا على الأقل قبل تأكيد المجموعة.',
    ONBOARDING_ACCOUNT_INVALID:'راجع اسم البنك ونوع الحساب والرصيد الافتتاحي.',
    ONBOARDING_ACCOUNT_IBAN_INVALID:'رقم الآيبان السعودي يجب أن يبدأ بـ SA ويتكون من 24 خانة.',
    ONBOARDING_ACCOUNT_CARD_LAST4_INVALID:'أدخل آخر 4 أرقام فقط من البطاقة.',
    ONBOARDING_OBLIGATION_INVALID:'راجع بيانات الالتزامات، خصوصًا الاسم والمبلغ والتكرار.',
    ONBOARDING_GOAL_INVALID:'راجع اسم الهدف والمبلغ المستهدف.',
    ONBOARDING_STEP_MISMATCH:'تغيرت خطوة التأسيس. أعد تحميل المحادثة قبل المتابعة.',
  };
  return labels[code]??'تعذر حفظ المجموعة. لم يعتمد نماء هذه البيانات.';
}

export function GovernorOnboardingIntake({
  step,
  onAccepted,
  onClose,
  onReviewPreviousData,
}:{
  step:string;
  onAccepted:(message:MessagePayload,reply:MessagePayload|null,nextStep:string)=>void;
  onClose:()=>void;
  onReviewPreviousData?:()=>void;
}){
  const intakeStep=INTAKE_STAGES.some(stage=>stage.key===step) ? step as IntakeStep : null;
  const structuredStep=([
    'dependents','income','accounts','obligations','goals'
  ] as StructuredIntakeStep[]).includes(step as StructuredIntakeStep) ? step as StructuredIntakeStep : null;
  const [dependents,setDependents]=useState<Dependent[]>([emptyDependent()]);
  const [accounts,setAccounts]=useState<Account[]>([emptyAccount()]);
  const [obligations,setObligations]=useState<Obligation[]>([emptyObligation()]);
  const [goals,setGoals]=useState<Goal[]>([emptyGoal()]);
  const [income,setIncome]=useState({
    base_salary:'',fixed_allowances:'',variable_allowances:'',deductions:'',
    actual_net:'',other_recurring_income:'',difference_explanation:'',
  });
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [mobileEditor,setMobileEditor]=useState<MobileEditor>(null);

  useEffect(()=>{
    if(!mobileEditor) return;
    const previousOverflow=document.body.style.overflow;
    const previousOverscroll=document.body.style.overscrollBehavior;
    document.body.style.overflow='hidden';
    document.body.style.overscrollBehavior='none';
    return()=>{
      document.body.style.overflow=previousOverflow;
      document.body.style.overscrollBehavior=previousOverscroll;
    };
  },[mobileEditor]);
  const [simpleAnswer,setSimpleAnswer]=useState('');
  const [stagesOpen,setStagesOpen]=useState(true);

  const expectedNet=useMemo(()=>{
    const base=Number(income.base_salary||0);
    const fixed=Number(income.fixed_allowances||0);
    const variable=Number(income.variable_allowances||0);
    const deductions=Number(income.deductions||0);
    const other=Number(income.other_recurring_income||0);
    const value=base+fixed+variable+other-deductions;
    return Number.isFinite(value)?Math.max(0,value):0;
  },[income]);

  if(!intakeStep) return null;


  function saveMobileEditor(){
    if(!mobileEditor) return;
    if(mobileEditor.kind==='dependents'){
      setDependents(current=>{
        if(mobileEditor.index!==null) return current.map((item,index)=>index===mobileEditor.index?mobileEditor.draft:item);
        if(current.length===1&&current[0]&&!hasDependent(current[0])) return [mobileEditor.draft];
        return [...current,mobileEditor.draft];
      });
    }else if(mobileEditor.kind==='accounts'){
      setAccounts(current=>{
        if(mobileEditor.index!==null) return current.map((item,index)=>index===mobileEditor.index?mobileEditor.draft:item);
        if(current.length===1&&current[0]&&!hasAccount(current[0])) return [mobileEditor.draft];
        return [...current,mobileEditor.draft];
      });
    }else if(mobileEditor.kind==='obligations'){
      setObligations(current=>{
        if(mobileEditor.index!==null) return current.map((item,index)=>index===mobileEditor.index?mobileEditor.draft:item);
        if(current.length===1&&current[0]&&!hasObligation(current[0])) return [mobileEditor.draft];
        return [...current,mobileEditor.draft];
      });
    }else{
      setGoals(current=>{
        if(mobileEditor.index!==null) return current.map((item,index)=>index===mobileEditor.index?mobileEditor.draft:item);
        if(current.length===1&&current[0]&&!hasGoal(current[0])) return [mobileEditor.draft];
        return [...current,mobileEditor.draft];
      });
    }
    setMobileEditor(null);
  }

  const dependentRows=dependents.map((item,index)=>({item,index})).filter(({item})=>hasDependent(item));
  const accountRows=accounts.map((item,index)=>({item,index})).filter(({item})=>hasAccount(item));
  const obligationRows=obligations.map((item,index)=>({item,index})).filter(({item})=>hasObligation(item));
  const goalRows=goals.map((item,index)=>({item,index})).filter(({item})=>hasGoal(item));

  async function submit(payload:Record<string,unknown>){
    if(saving) return;
    setSaving(true);
    setError('');
    try{
      const response=await fetch('/api/onboarding/intake',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(payload),
      });
      const data=await response.json() as {code?:string;message?:MessagePayload;reply?:MessagePayload|null;onboarding?:{current_step?:string}};
      if(!response.ok||!data.message){
        setError(errorText(data.code??''));
        return;
      }
      onAccepted(data.message,data.reply??null,String(data.onboarding?.current_step??''));
    }catch{
      setError('تعذر الاتصال بنماء الآن. لم تحفظ المجموعة.');
    }finally{
      setSaving(false);
    }
  }

  async function submitSimpleCurrent(){
    if(!intakeStep||structuredStep||saving)return;
    const body=intakeStep==='review'?'تأكيد':simpleAnswer.trim();
    if(!body){setError('أدخل إجابة المرحلة الحالية قبل المتابعة.');return;}
    setSaving(true);setError('');
    try{
      const response=await fetch('/api/conversations/central',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({body}),
      });
      const data=await response.json() as {message?:MessagePayload;reply?:MessagePayload;replies?:MessagePayload[]};
      if(!response.ok||!data.message)throw new Error('ONBOARDING_SIMPLE_FAILED');
      const replies=Array.isArray(data.replies)?data.replies:[];
      const reply=data.reply??replies.at(-1)??null;
      const nextStep=String(reply?.structured_data?.onboarding_step??'');
      setSimpleAnswer('');
      onAccepted(data.message,reply,nextStep);
    }catch{
      setError('تعذر حفظ هذه المرحلة الآن. لم يعتمد نماء الإجابة.');
    }finally{
      setSaving(false);
    }
  }

  function submitCurrent(){
    if(!structuredStep){void submitSimpleCurrent();return;}
    if(intakeStep==='dependents'){
      const cleaned=dependents.filter(item=>item.name.trim()||item.relationship.trim()||item.monthly_support.trim());
      void submit({
        step:'dependents',
        items:cleaned.map(item=>({
          name:item.name.trim(),
          relationship:item.relationship,
          age:numberOrUndefined(item.age),
          monthly_support:Number(item.monthly_support||0),
          annual_support:numberOrUndefined(item.annual_support),
          special_needs:item.special_needs.trim()||undefined,
          financial_dependency:item.financial_dependency,
        })),
      });
      return;
    }
    if(intakeStep==='income'){
      void submit({
        step:'income',
        base_salary:Number(income.base_salary||0),
        fixed_allowances:Number(income.fixed_allowances||0),
        variable_allowances:Number(income.variable_allowances||0),
        deductions:Number(income.deductions||0),
        actual_net:Number(income.actual_net||0),
        other_recurring_income:Number(income.other_recurring_income||0),
        difference_explanation:income.difference_explanation.trim()||undefined,
      });
      return;
    }
    if(intakeStep==='accounts'){
      void submit({
        step:'accounts',
        items:accounts.filter(item=>item.bank_name.trim()||item.opening_balance.trim()).map(item=>({
          bank_name:item.bank_name.trim(),
          account_type:item.account_type,
          short_identifier:item.short_identifier.trim()||undefined,
          iban:item.iban.trim().replace(/\s+/g,'')||undefined,
          card_last4:item.card_last4.trim()||undefined,
          card_type:item.card_last4.trim()?item.card_type:undefined,
          usage:item.usage.trim()||undefined,
          opening_balance:Number(item.opening_balance||0),
          included_in_namaa:item.included_in_namaa,
        })),
      });
      return;
    }
    if(intakeStep==='obligations'){
      void submit({
        step:'obligations',
        items:obligations.filter(item=>item.name.trim()||item.amount.trim()).map(item=>({
          name:item.name.trim(),
          amount:Number(item.amount||0),
          recurrence:item.recurrence,
          provider:item.provider.trim()||undefined,
          due_day:numberOrUndefined(item.due_day),
          remaining_balance:numberOrUndefined(item.remaining_balance),
          end_date:item.end_date||undefined,
          finance_cost:numberOrUndefined(item.finance_cost),
        })),
      });
      return;
    }
    void submit({
      step:'goals',
      items:goals.filter(item=>item.name.trim()||item.target_amount.trim()).map(item=>({
        name:item.name.trim(),
        target_amount:Number(item.target_amount||0),
        target_date:item.target_date||undefined,
        priority:item.priority.trim()||undefined,
        flexibility:item.flexibility.trim()||undefined,
        allocated_amount:Number(item.allocated_amount||0),
      })),
    });
  }

  const currentStageIndex=Math.max(0,INTAKE_STAGES.findIndex(stage=>stage.key===intakeStep));
  const stageWindowStart=Math.floor(currentStageIndex/4)*4;
  const visibleStages=INTAKE_STAGES.slice(stageWindowStart,stageWindowStart+4);
  const title=INTAKE_STAGES[currentStageIndex]?.title??'استكمال بيانات التأسيس';

  return <section className={styles.onboardingIntake} aria-label={title}>
    <header className={styles.onboardingIntakeHeader}>
      <div><strong>{title}</strong><small>المرحلة {currentStageIndex+1} من {INTAKE_STAGES.length}</small></div>
      <div className={styles.onboardingHeaderActions}>{currentStageIndex>0&&onReviewPreviousData&&<button type="button" className={styles.onboardingReviewPreviousButton} onClick={onReviewPreviousData}><LucideIcon name="pencil" size={20}/><span>تعديل بيانات سابقة</span></button>}<button type="button" className={styles.onboardingCloseButton} onClick={onClose} aria-label="إغلاق صفحة الاستكمال"><LucideIcon name="x" size={20}/></button></div>
    </header>

    <section className={styles.onboardingStageOverview} aria-label="مراحل التأسيس">
      <button type="button" className={styles.onboardingStageOverviewHeader} onClick={()=>setStagesOpen(open=>!open)} aria-expanded={stagesOpen}>
        <span>مراحل التأسيس</span>
        <span className={styles.onboardingStageOverviewMeta}><strong>{currentStageIndex+1}/{INTAKE_STAGES.length}</strong><LucideIcon name={stagesOpen?'chevronUp':'chevronDown'} size={20}/></span>
      </button>
      {stagesOpen&&<ol className={styles.onboardingStageList}>
        {visibleStages.map((stage,windowIndex)=>{const index=stageWindowStart+windowIndex;return <li key={stage.key} className={index<currentStageIndex?styles.onboardingStageDone:index===currentStageIndex?styles.onboardingStageCurrent:styles.onboardingStageUpcoming}>
          <span className={styles.onboardingStageNumber}>{index<currentStageIndex?<LucideIcon name="circleCheck" size={16}/>:index+1}</span>
          <strong>{stage.title}</strong>
        </li>})}
      </ol>}
    </section>

    {!structuredStep&&intakeStep!=='review'&&<section className={styles.simpleOnboardingStage}>
      <strong>{INTAKE_STAGES[currentStageIndex]?.question}</strong>
      {intakeStep==='marital_status'
        ?<div className={styles.simpleOnboardingChoices}>
          {['أعزب','متزوج','مطلق','أرمل'].map(choice=><button type="button" key={choice} className={simpleAnswer===choice?styles.simpleOnboardingChoiceActive:styles.simpleOnboardingChoice} onClick={()=>setSimpleAnswer(choice)}>{choice}</button>)}
        </div>
        :intakeStep==='statements'
          ?<div className={styles.simpleOnboardingChoices}>
            {['نعم','لا'].map(choice=><button type="button" key={choice} className={simpleAnswer===choice?styles.simpleOnboardingChoiceActive:styles.simpleOnboardingChoice} onClick={()=>setSimpleAnswer(choice)}>{choice}</button>)}
          </div>
          :<textarea className={styles.simpleOnboardingInput} rows={3} value={simpleAnswer} onChange={event=>setSimpleAnswer(event.target.value)} placeholder="اكتب إجابتك هنا…"/>}
    </section>}

    {intakeStep==='review'&&<section className={styles.simpleOnboardingStage}>
      <strong>المراجعة النهائية</strong>
      <p>إذا كانت البيانات صحيحة، ثبّت ملف التأسيس. ويمكنك إغلاق الصفحة والعودة للدردشة إذا أردت تعديل معلومة أولًا.</p>
    </section>}

    {intakeStep==='dependents'&&<div className={styles.desktopStructuredIntake}>
      <div className={styles.desktopIntakeTableShell}>
        <div className={styles.desktopIntakeTableHeader}>
          <div><strong>الأفراد والمعالون</strong><small>كل فرد يظهر كسطر مستقل. استخدم نافذة الإضافة لتعبئة البيانات بدل النماذج الطويلة داخل الصفحة.</small></div>
          <div className={styles.desktopIntakeHeaderActions}>
            <button type="button" className={styles.intakeAddButton} onClick={()=>setMobileEditor({kind:'dependents',index:null,draft:emptyDependent()})}><LucideIcon name="plus" size={20}/><span>إضافة فرد</span></button>
            <button type="button" className={styles.intakeNoneButton} onClick={()=>setDependents([])}>لا يوجد معالون</button>
          </div>
        </div>
        <div className={styles.desktopIntakeTableWrap}>
          <table className={styles.desktopIntakeTable}>
            <thead><tr><th>الاسم</th><th>العلاقة</th><th>العمر</th><th>الدعم الشهري</th><th>دعم سنوي</th><th>يعتمد ماليًا</th><th>الإجراءات</th></tr></thead>
            <tbody>{dependentRows.length?dependentRows.map(({item,index},rowIndex)=><tr key={index}>
              <td><strong>{item.name||('فرد '+(rowIndex+1))}</strong>{item.special_needs?<small>{item.special_needs}</small>:null}</td>
              <td>{item.relationship||'—'}</td>
              <td>{item.age||'—'}</td>
              <td>{item.monthly_support||'0'} ر.س</td>
              <td>{item.annual_support||'0'} ر.س</td>
              <td>{item.financial_dependency?'نعم':'لا'}</td>
              <td><div className={styles.desktopIntakeTableActions}><button type="button" onClick={()=>setMobileEditor({kind:'dependents',index,draft:{...item}})}><LucideIcon name="pencil" size={20}/><span>تعديل</span></button><button type="button" onClick={()=>setDependents(current=>current.filter((_,i)=>i!==index))}><LucideIcon name="trash2" size={20}/><span>حذف</span></button></div></td>
            </tr>):<tr><td colSpan={7}><div className={styles.desktopIntakeTableEmpty}><strong>لا توجد بيانات أفراد</strong><small>اضغط «إضافة فرد» لإدخال أول سجل.</small></div></td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>}

    {intakeStep==='income'&&<div className={styles.intakeCard}>
      <div className={styles.intakeGrid}>
        <label><span>الراتب الأساسي</span><input type="number" min="0" inputMode="decimal" value={income.base_salary} onChange={e=>setIncome(v=>({...v,base_salary:e.target.value}))}/></label>
        <label><span>البدلات الثابتة</span><input type="number" min="0" inputMode="decimal" value={income.fixed_allowances} onChange={e=>setIncome(v=>({...v,fixed_allowances:e.target.value}))}/></label>
        <label><span>البدلات المتغيرة</span><input type="number" min="0" inputMode="decimal" value={income.variable_allowances} onChange={e=>setIncome(v=>({...v,variable_allowances:e.target.value}))}/></label>
        <label><span>الاستقطاعات</span><input type="number" min="0" inputMode="decimal" value={income.deductions} onChange={e=>setIncome(v=>({...v,deductions:e.target.value}))}/></label>
        <label><span>دخل متكرر آخر</span><input type="number" min="0" inputMode="decimal" value={income.other_recurring_income} onChange={e=>setIncome(v=>({...v,other_recurring_income:e.target.value}))}/></label>
        <label><span>الصافي الفعلي الذي يصل للحساب</span><input type="number" min="0" inputMode="decimal" value={income.actual_net} onChange={e=>setIncome(v=>({...v,actual_net:e.target.value}))}/></label>
      </div>
      <div className={styles.incomeReconciliation}><small>الصافي المحسوب من المكونات</small><strong>{new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(expectedNet)} ر.س</strong></div>
      {income.actual_net&&Number(income.actual_net)!==expectedNet&&<label className={styles.intakeDifference}><span>سبب الفرق بين المحسوب والفعلي</span><textarea rows={2} value={income.difference_explanation} onChange={e=>setIncome(v=>({...v,difference_explanation:e.target.value}))}/></label>}
    </div>}

    {intakeStep==='accounts'&&<div className={styles.desktopStructuredIntake}>
      <div className={styles.desktopIntakeTableShell}>
        <div className={styles.desktopIntakeTableHeader}>
          <div>
            <strong>الحسابات المالية</strong>
            <small>أضف الحساب من نافذة مستقلة؛ وبعد الحفظ يظهر مباشرة كسطر داخل الجدول.</small>
          </div>
          <button type="button" className={styles.intakeAddButton} onClick={()=>setMobileEditor({kind:'accounts',index:null,draft:emptyAccount()})}><LucideIcon name="plus" size={20}/><span>إضافة حساب</span></button>
        </div>
        <div className={styles.desktopIntakeTableWrap}>
          <table className={styles.desktopIntakeTable}>
            <thead><tr><th>الحساب</th><th>البنك/الجهة</th><th>النوع</th><th>الاستخدام</th><th>الرصيد الافتتاحي</th><th>داخل نماء</th><th>الإجراءات</th></tr></thead>
            <tbody>
              {accountRows.length?accountRows.map(({item,index},rowIndex)=><tr key={index}>
                <td><strong>{item.short_identifier||('حساب '+(rowIndex+1))}</strong>{item.card_last4?<small>•••• {item.card_last4}</small>:null}</td>
                <td>{item.bank_name||'—'}</td>
                <td>{({BANK:'جاري/بنكي',SAVINGS:'ادخاري',CASH:'نقدي',INVESTMENT:'استثماري',OTHER:'أخرى'} as Record<string,string>)[item.account_type]??item.account_type}</td>
                <td>{item.usage||'—'}</td>
                <td>{item.opening_balance||'0'} ر.س</td>
                <td>{item.included_in_namaa?'نعم':'لا'}</td>
                <td><div className={styles.desktopIntakeTableActions}><button type="button" onClick={()=>setMobileEditor({kind:'accounts',index,draft:{...item}})}><LucideIcon name="pencil" size={20}/><span>تعديل</span></button><button type="button" onClick={()=>setAccounts(current=>current.filter((_,i)=>i!==index))}><LucideIcon name="trash2" size={20}/><span>حذف</span></button></div></td>
              </tr>):<tr><td colSpan={7}><div className={styles.desktopIntakeTableEmpty}><strong>لا توجد حسابات مضافة</strong><small>اضغط «إضافة حساب» وأدخل بيانات الحساب الأول.</small></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>}

    {intakeStep==='obligations'&&<div className={styles.desktopStructuredIntake}>
      <div className={styles.desktopIntakeTableShell}>
        <div className={styles.desktopIntakeTableHeader}>
          <div><strong>الالتزامات المالية</strong><small>أضف كل التزام من نافذة مستقلة ثم راجع القائمة قبل إرسال المجموعة.</small></div>
          <div className={styles.desktopIntakeHeaderActions}>
            <button type="button" className={styles.intakeAddButton} onClick={()=>setMobileEditor({kind:'obligations',index:null,draft:emptyObligation()})}><LucideIcon name="plus" size={20}/><span>إضافة التزام</span></button>
            <button type="button" className={styles.intakeNoneButton} onClick={()=>setObligations([])}>لا توجد التزامات</button>
          </div>
        </div>
        <div className={styles.desktopIntakeTableWrap}>
          <table className={styles.desktopIntakeTable}>
            <thead><tr><th>الالتزام</th><th>الجهة</th><th>المبلغ</th><th>التكرار</th><th>الاستحقاق</th><th>الرصيد المتبقي</th><th>الإجراءات</th></tr></thead>
            <tbody>{obligationRows.length?obligationRows.map(({item,index},rowIndex)=><tr key={index}>
              <td><strong>{item.name||('التزام '+(rowIndex+1))}</strong></td>
              <td>{item.provider||'—'}</td>
              <td>{item.amount||'0'} ر.س</td>
              <td>{recurrenceLabel(item.recurrence)}</td>
              <td>{item.due_day?('يوم '+item.due_day):'—'}</td>
              <td>{item.remaining_balance?item.remaining_balance+' ر.س':'—'}</td>
              <td><div className={styles.desktopIntakeTableActions}><button type="button" onClick={()=>setMobileEditor({kind:'obligations',index,draft:{...item}})}><LucideIcon name="pencil" size={20}/><span>تعديل</span></button><button type="button" onClick={()=>setObligations(current=>current.filter((_,i)=>i!==index))}><LucideIcon name="trash2" size={20}/><span>حذف</span></button></div></td>
            </tr>):<tr><td colSpan={7}><div className={styles.desktopIntakeTableEmpty}><strong>لا توجد التزامات مضافة</strong><small>اضغط «إضافة التزام» لإدخال أول سجل.</small></div></td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>}

    {intakeStep==='goals'&&<div className={styles.desktopStructuredIntake}>
      <div className={styles.desktopIntakeTableShell}>
        <div className={styles.desktopIntakeTableHeader}>
          <div><strong>الأهداف المالية</strong><small>أضف كل هدف في نافذة مستقلة؛ وبعد الحفظ يظهر في الجدول مع إمكانية التعديل أو الحذف.</small></div>
          <div className={styles.desktopIntakeHeaderActions}>
            <button type="button" className={styles.intakeAddButton} onClick={()=>setMobileEditor({kind:'goals',index:null,draft:emptyGoal()})}><LucideIcon name="plus" size={20}/><span>إضافة هدف</span></button>
            <button type="button" className={styles.intakeNoneButton} onClick={()=>setGoals([])}>لا توجد أهداف الآن</button>
          </div>
        </div>
        <div className={styles.desktopIntakeTableWrap}>
          <table className={styles.desktopIntakeTable}>
            <thead><tr><th>الهدف</th><th>المبلغ المستهدف</th><th>المبلغ المخصص</th><th>التاريخ المتوقع</th><th>الأولوية</th><th>مرونة الموعد</th><th>الإجراءات</th></tr></thead>
            <tbody>{goalRows.length?goalRows.map(({item,index},rowIndex)=><tr key={index}>
              <td><strong>{item.name||('هدف '+(rowIndex+1))}</strong></td>
              <td>{item.target_amount||'0'} ر.س</td>
              <td>{item.allocated_amount||'0'} ر.س</td>
              <td>{item.target_date||'—'}</td>
              <td>{item.priority||'—'}</td>
              <td>{item.flexibility||'—'}</td>
              <td><div className={styles.desktopIntakeTableActions}><button type="button" onClick={()=>setMobileEditor({kind:'goals',index,draft:{...item}})}><LucideIcon name="pencil" size={20}/><span>تعديل</span></button><button type="button" onClick={()=>setGoals(current=>current.filter((_,i)=>i!==index))}><LucideIcon name="trash2" size={20}/><span>حذف</span></button></div></td>
            </tr>):<tr><td colSpan={7}><div className={styles.desktopIntakeTableEmpty}><strong>لا توجد أهداف مضافة</strong><small>اضغط «إضافة هدف» لإدخال أول سجل.</small></div></td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>}

    {intakeStep==='dependents'&&<div className={styles.mobileStructuredIntake}>
      <div className={styles.mobileIntakePrompt}><strong>هل لديك أشخاص تعولهم أو تصرف عليهم ماليًا؟</strong><small>أضف كل شخص كسجل مستقل، ثم أرسل المجموعة كاملة للمحافظ.</small></div>
      {dependentRows.length?<div className={styles.mobileIntakeTable} role="table" aria-label="الأفراد المحفوظون">{dependentRows.map(({item,index},rowIndex)=><div className={styles.mobileIntakeRow} role="row" key={index}>
        <div role="cell"><strong>{item.name||`فرد ${rowIndex+1}`}</strong><small>{item.relationship||'علاقة غير محددة'} · {item.monthly_support||'0'} ر.س شهريًا</small></div>
        <div className={styles.mobileIntakeRowActions}><button type="button" onClick={()=>setMobileEditor({kind:'dependents',index,draft:{...item}})} aria-label="تعديل الفرد"><LucideIcon name="pencil" size={16}/></button><button type="button" onClick={()=>setDependents(current=>current.filter((_,i)=>i!==index))} aria-label="حذف الفرد"><LucideIcon name="trash2" size={16}/></button></div>
      </div>)}</div>:<p className={styles.mobileIntakeEmpty}>لم تضف أي فرد بعد.</p>}
      <div className={styles.mobileIntakeFooter}><button type="button" className={styles.intakeAddButton} onClick={()=>setMobileEditor({kind:'dependents',index:null,draft:emptyDependent()})}><LucideIcon name="plus" size={16}/><span>إضافة فرد</span></button><button type="button" className={styles.intakeNoneButton} onClick={()=>setDependents([])}>لا يوجد أشخاص أعولهم ماليًا</button></div>
    </div>}

    {intakeStep==='accounts'&&<div className={styles.mobileStructuredIntake}>
      <div className={styles.mobileIntakePrompt}><strong>الحسابات المالية</strong><small>كل حساب يظهر كسجل مضغوط ويمكن تعديله أو حذفه قبل الإرسال.</small></div>
      {accountRows.length?<div className={styles.mobileIntakeTable} role="table" aria-label="الحسابات المحفوظة">{accountRows.map(({item,index},rowIndex)=><div className={styles.mobileIntakeRow} role="row" key={index}>
        <div role="cell"><strong>{item.short_identifier||item.bank_name||`حساب ${rowIndex+1}`}</strong><small>{item.bank_name||'جهة غير محددة'} · {item.opening_balance||'0'} ر.س</small></div>
        <div className={styles.mobileIntakeRowActions}><button type="button" onClick={()=>setMobileEditor({kind:'accounts',index,draft:{...item}})} aria-label="تعديل الحساب"><LucideIcon name="pencil" size={16}/></button><button type="button" onClick={()=>setAccounts(current=>current.filter((_,i)=>i!==index))} aria-label="حذف الحساب"><LucideIcon name="trash2" size={16}/></button></div>
      </div>)}</div>:<p className={styles.mobileIntakeEmpty}>لم تضف أي حساب بعد.</p>}
      <div className={styles.mobileIntakeFooter}><button type="button" className={styles.intakeAddButton} onClick={()=>setMobileEditor({kind:'accounts',index:null,draft:emptyAccount()})}><LucideIcon name="plus" size={16}/><span>إضافة حساب</span></button></div>
    </div>}

    {intakeStep==='obligations'&&<div className={styles.mobileStructuredIntake}>
      <div className={styles.mobileIntakePrompt}><strong>الالتزامات القائمة</strong><small>أضف كل التزام في نافذة مستقلة ثم راجع القائمة قبل الإرسال.</small></div>
      {obligationRows.length?<div className={styles.mobileIntakeTable} role="table" aria-label="الالتزامات المحفوظة">{obligationRows.map(({item,index},rowIndex)=><div className={styles.mobileIntakeRow} role="row" key={index}>
        <div role="cell"><strong>{item.name||`التزام ${rowIndex+1}`}</strong><small>{item.amount||'0'} ر.س · {recurrenceLabel(item.recurrence)}</small></div>
        <div className={styles.mobileIntakeRowActions}><button type="button" onClick={()=>setMobileEditor({kind:'obligations',index,draft:{...item}})} aria-label="تعديل الالتزام"><LucideIcon name="pencil" size={16}/></button><button type="button" onClick={()=>setObligations(current=>current.filter((_,i)=>i!==index))} aria-label="حذف الالتزام"><LucideIcon name="trash2" size={16}/></button></div>
      </div>)}</div>:<p className={styles.mobileIntakeEmpty}>لم تضف أي التزام بعد.</p>}
      <div className={styles.mobileIntakeFooter}><button type="button" className={styles.intakeAddButton} onClick={()=>setMobileEditor({kind:'obligations',index:null,draft:emptyObligation()})}><LucideIcon name="plus" size={16}/><span>إضافة التزام</span></button><button type="button" className={styles.intakeNoneButton} onClick={()=>setObligations([])}>لا توجد التزامات مالية قائمة</button></div>
    </div>}

    {intakeStep==='goals'&&<div className={styles.mobileStructuredIntake}>
      <div className={styles.mobileIntakePrompt}><strong>الأهداف المالية</strong><small>أضف كل هدف كسجل مستقل ثم أرسلها كمجموعة واحدة.</small></div>
      {goalRows.length?<div className={styles.mobileIntakeTable} role="table" aria-label="الأهداف المحفوظة">{goalRows.map(({item,index},rowIndex)=><div className={styles.mobileIntakeRow} role="row" key={index}>
        <div role="cell"><strong>{item.name||`هدف ${rowIndex+1}`}</strong><small>{item.target_amount||'0'} ر.س {item.target_date?`· ${item.target_date}`:''}</small></div>
        <div className={styles.mobileIntakeRowActions}><button type="button" onClick={()=>setMobileEditor({kind:'goals',index,draft:{...item}})} aria-label="تعديل الهدف"><LucideIcon name="pencil" size={16}/></button><button type="button" onClick={()=>setGoals(current=>current.filter((_,i)=>i!==index))} aria-label="حذف الهدف"><LucideIcon name="trash2" size={16}/></button></div>
      </div>)}</div>:<p className={styles.mobileIntakeEmpty}>لم تضف أي هدف بعد.</p>}
      <div className={styles.mobileIntakeFooter}><button type="button" className={styles.intakeAddButton} onClick={()=>setMobileEditor({kind:'goals',index:null,draft:emptyGoal()})}><LucideIcon name="plus" size={16}/><span>إضافة هدف</span></button><button type="button" className={styles.intakeNoneButton} onClick={()=>setGoals([])}>لا توجد أهداف أريد تسجيلها الآن</button></div>
    </div>}

    {mobileEditor&&typeof document!=='undefined'?createPortal(<div className={styles.mobileRecordEditorOverlay} role="dialog" aria-modal="true" aria-label="تحرير السجل">
      <button type="button" className={styles.mobileRecordEditorScrim} aria-label="إغلاق محرر السجل" onClick={()=>setMobileEditor(null)}/>
      <aside className={styles.mobileRecordEditorSheet+' '+(mobileEditor.kind==='dependents'?styles.mobileRecordEditorSheetCompact:'')}>
        <header className={styles.mobileRecordEditorHeader}><div><strong>{mobileEditor.kind==='dependents'?(mobileEditor.index===null?'إضافة فرد جديد':'تعديل الفرد'):(mobileEditor.index===null?'إضافة سجل':'تعديل السجل')}</strong><small>{mobileEditor.kind==='dependents'?'أدخل البيانات الأساسية ثم احفظ الفرد.':'احفظ هذا السجل ثم عد للقائمة.'}</small></div><button type="button" onClick={()=>setMobileEditor(null)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></header>
        <div className={styles.mobileRecordEditorBody}>
          {mobileEditor.kind==='dependents'&&<>
            <label className={styles.mobileFieldFull}><span>الاسم</span><input value={mobileEditor.draft.name} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,name:e.target.value}})}/></label>
            <label><span>العلاقة</span><select value={mobileEditor.draft.relationship} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,relationship:e.target.value}})}><option value="">اختر</option><option>زوج/زوجة</option><option>ابن/ابنة</option><option>والد/والدة</option><option>قريب</option><option>غير ذلك</option></select></label>
            <label><span>العمر إن كان مهمًا للاحتياج</span><input type="number" min="0" value={mobileEditor.draft.age} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,age:e.target.value}})}/></label>
            <label><span>الدعم الشهري</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.monthly_support} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,monthly_support:e.target.value}})}/></label>
            <label><span>مصروف سنوي إضافي</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.annual_support} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,annual_support:e.target.value}})}/></label>
            <label className={styles.mobileFieldFull}><span>احتياجات خاصة مؤثرة ماليًا إن وجدت</span><input value={mobileEditor.draft.special_needs} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,special_needs:e.target.value}})}/></label>
            <label className={`${styles.intakeCheckbox} ${styles.mobileFieldFull}`}><input type="checkbox" checked={mobileEditor.draft.financial_dependency} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,financial_dependency:e.target.checked}})}/><span>يعتمد عليّ ماليًا</span></label>
          </>}
          {mobileEditor.kind==='accounts'&&<>
            <label className={styles.mobileFieldFull}><span>البنك أو الجهة</span><input list="namaa-bank-options" value={mobileEditor.draft.bank_name} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,bank_name:e.target.value}})}/><datalist id="namaa-bank-options">{BANK_OPTIONS.map(bank=><option key={bank.code} value={bank.name}/>)}</datalist></label>
            <label><span>نوع الحساب</span><select value={mobileEditor.draft.account_type} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,account_type:e.target.value}})}><option value="BANK">جاري/بنكي</option><option value="SAVINGS">ادخاري</option><option value="CASH">نقدي</option><option value="INVESTMENT">استثماري</option><option value="OTHER">أخرى</option></select></label>
            <label><span>اسم مختصر للحساب</span><input value={mobileEditor.draft.short_identifier} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,short_identifier:e.target.value}})}/></label>
            <label className={styles.mobileFieldFull}><span>الآيبان إن رغبت</span><input value={mobileEditor.draft.iban} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,iban:e.target.value.toUpperCase()}})}/></label>
            <label><span>آخر 4 أرقام من البطاقة</span><input inputMode="numeric" maxLength={4} value={mobileEditor.draft.card_last4} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,card_last4:e.target.value.replace(/\D/g,'').slice(0,4)}})}/></label>
            <label><span>نوع البطاقة</span><select value={mobileEditor.draft.card_type} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,card_type:e.target.value}})}><option>مدى</option><option>فيزا</option><option>ماستركارد</option><option>أخرى</option></select></label>
            <label className={styles.mobileFieldFull}><span>الاستخدام الحالي</span><input value={mobileEditor.draft.usage} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,usage:e.target.value}})}/></label>
            <label><span>الرصيد الافتتاحي</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.opening_balance} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,opening_balance:e.target.value}})}/></label>
            <label className={`${styles.intakeCheckbox} ${styles.mobileFieldFull}`}><input type="checkbox" checked={mobileEditor.draft.included_in_namaa} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,included_in_namaa:e.target.checked}})}/><span>إدخاله ضمن نماء</span></label>
          </>}
          {mobileEditor.kind==='obligations'&&<>
            <label className={styles.mobileFieldFull}><span>اسم الالتزام</span><input value={mobileEditor.draft.name} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,name:e.target.value}})}/></label>
            <label><span>المبلغ</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.amount} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,amount:e.target.value}})}/></label>
            <label><span>التكرار</span><select value={mobileEditor.draft.recurrence} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,recurrence:e.target.value}})}><option value="MONTHLY">شهري</option><option value="WEEKLY">أسبوعي</option><option value="YEARLY">سنوي</option><option value="ONE_TIME">مرة واحدة</option><option value="OTHER">آخر</option></select></label>
            <label><span>الجهة</span><input value={mobileEditor.draft.provider} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,provider:e.target.value}})}/></label>
            <label><span>يوم الاستحقاق إن وجد</span><input type="number" min="1" max="31" value={mobileEditor.draft.due_day} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,due_day:e.target.value}})}/></label>
            <label><span>الرصيد المتبقي إن توفر</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.remaining_balance} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,remaining_balance:e.target.value}})}/></label>
            <label><span>تاريخ الانتهاء إن وجد</span><input type="date" value={mobileEditor.draft.end_date} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,end_date:e.target.value}})}/></label>
            <label><span>تكلفة التمويل/الرسوم إن عُرفت</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.finance_cost} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,finance_cost:e.target.value}})}/></label>
          </>}
          {mobileEditor.kind==='goals'&&<>
            <label className={styles.mobileFieldFull}><span>اسم الهدف</span><input value={mobileEditor.draft.name} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,name:e.target.value}})}/></label>
            <label><span>المبلغ المستهدف</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.target_amount} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,target_amount:e.target.value}})}/></label>
            <label><span>الموعد المتوقع</span><input type="date" value={mobileEditor.draft.target_date} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,target_date:e.target.value}})}/></label>
            <label><span>الأولوية</span><select value={mobileEditor.draft.priority} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,priority:e.target.value}})}><option value="">اختر</option><option value="HIGH">عالية</option><option value="MEDIUM">متوسطة</option><option value="LOW">منخفضة</option></select></label>
            <label><span>مرونة الموعد</span><select value={mobileEditor.draft.flexibility} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,flexibility:e.target.value}})}><option value="">اختر</option><option value="FIXED">موعد ثابت</option><option value="FLEXIBLE">مرن</option><option value="OPEN">مفتوح</option></select></label>
            <label><span>مبلغ مخصص حاليًا</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.allocated_amount} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,allocated_amount:e.target.value}})}/></label>
            <div className="financial-auto-result"><span>المتبقي للهدف</span><strong>{Math.max(0,Number(mobileEditor.draft.target_amount||0)-Number(mobileEditor.draft.allocated_amount||0)).toFixed(2)} ريال</strong></div>
          </>}
        </div>
        <footer className={styles.mobileRecordEditorActions}><button type="button" onClick={()=>setMobileEditor(null)}>إلغاء</button><button type="button" onClick={saveMobileEditor}>حفظ السجل</button></footer>
      </aside>
    </div>,document.body):null}

    {error&&<div className={styles.intakeError} role="alert">{error}</div>}
    <div className={styles.intakeActions}>
      <small>لن ينشئ هذا المكوّن أي تحويل أو سداد أو استثمار. لا ترسل رقم البطاقة كاملًا أو رمز الأمان أو الرقم السري أو رمز التحقق؛ يكفي آخر 4 أرقام فقط.</small>
      <button type="button" className={styles.mobileQuestionByQuestionButton} onClick={onClose}><LucideIcon name="messageSquareText" size={20}/><span>متابعة بالدردشة</span></button>
      <button type="button" className={styles.primaryActionButton} onClick={submitCurrent} disabled={saving}>
        <LucideIcon name="circleCheck" size={20}/>
        <span>{saving?'جارٍ الحفظ…':structuredStep?'تأكيد ومتابعة':intakeStep==='review'?'تثبيت الملف':'حفظ ومتابعة'}</span>
      </button>
    </div>
  </section>;
}
