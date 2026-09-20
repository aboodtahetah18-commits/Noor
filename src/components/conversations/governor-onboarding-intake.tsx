'use client';

import { useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import styles from './conversation-workspace.module.css';

type IntakeStep='dependents'|'income'|'accounts'|'obligations'|'goals';
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
const recurrenceLabel=(value:string)=>({MONTHLY:'شهري',WEEKLY:'أسبوعي',YEARLY:'سنوي',ONE_TIME:'مرة واحدة',OTHER:'أخرى'}[value]??'غير محدد');

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
    ONBOARDING_ACCOUNT_IBAN_INVALID:'رقم الآيبان السعودي يجب أن يبدأ برمز الدولة السعودي ويتكون من ٢٤ خانة.',
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
}:{
  step:string;
  onAccepted:(message:MessagePayload,reply:MessagePayload|null,nextStep:string)=>void;
  onClose:()=>void;
}){
  const intakeStep=(['dependents','income','accounts','obligations','goals'] as IntakeStep[]).includes(step as IntakeStep)
    ? step as IntakeStep
    : null;
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

  function updateDependent(index:number,patch:Partial<Dependent>){
    setDependents(current=>current.map((item,i)=>i===index?{...item,...patch}:item));
  }
  function updateAccount(index:number,patch:Partial<Account>){
    setAccounts(current=>current.map((item,i)=>i===index?{...item,...patch}:item));
  }
  function updateObligation(index:number,patch:Partial<Obligation>){
    setObligations(current=>current.map((item,i)=>i===index?{...item,...patch}:item));
  }
  function updateGoal(index:number,patch:Partial<Goal>){
    setGoals(current=>current.map((item,i)=>i===index?{...item,...patch}:item));
  }

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

  function submitCurrent(){
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

  const title={
    dependents:'أفراد الأسرة والمعالون',
    income:'تفاصيل الراتب والدخل',
    accounts:'الحسابات المالية',
    obligations:'الالتزامات القائمة',
    goals:'الأهداف المالية',
  }[intakeStep];

  return <section className={styles.onboardingIntake} aria-label={title}>
    <header className={styles.onboardingIntakeHeader}>
      <div><strong>{title}</strong><small>أدخل العناصر هنا ثم أكد المجموعة مرة واحدة.</small></div>
      <div className={styles.onboardingHeaderActions}><span><LucideIcon name="listChecks" size={16}/>تأسيس</span><button type="button" className={styles.onboardingCloseButton} onClick={onClose} aria-label="إغلاق صفحة البيانات"><LucideIcon name="x" size={20}/></button></div>
    </header>

    {intakeStep==='dependents'&&<div className={`${styles.intakeCards} ${styles.desktopStructuredIntake}`}>
      {dependents.map((item,index)=><article className={styles.intakeCard} key={index}>
        <div className={styles.intakeCardHeader}><strong>فرد {index+1}</strong>{dependents.length>1&&<button type="button" onClick={()=>setDependents(current=>current.filter((_,i)=>i!==index))} aria-label="حذف الفرد"><LucideIcon name="trash2" size={16}/></button>}</div>
        <div className={styles.intakeGrid}>
          <label><span>الاسم</span><input value={item.name} onChange={e=>updateDependent(index,{name:e.target.value})}/></label>
          <label><span>العلاقة</span><select value={item.relationship} onChange={e=>updateDependent(index,{relationship:e.target.value})}><option value="">اختر</option><option>زوج/زوجة</option><option>ابن/ابنة</option><option>والد/والدة</option><option>قريب</option><option>غير ذلك</option></select></label>
          <label><span>العمر إن كان مهمًا للاحتياج</span><input type="number" min="0" value={item.age} onChange={e=>updateDependent(index,{age:e.target.value})}/></label>
          <label><span>الدعم الشهري</span><input type="number" min="0" inputMode="decimal" value={item.monthly_support} onChange={e=>updateDependent(index,{monthly_support:e.target.value})}/></label>
          <label><span>مصروف سنوي إضافي</span><input type="number" min="0" inputMode="decimal" value={item.annual_support} onChange={e=>updateDependent(index,{annual_support:e.target.value})}/></label>
          <label className={styles.intakeWide}><span>{item.relationship.includes('ابن')||item.relationship.includes('ابنة')?(Number(item.age||0)<=2?'احتياجات رعاية/حليب/علاج إن وجدت':'احتياجات تعليم/نقل/علاج إن وجدت'):'احتياجات خاصة مؤثرة ماليًا إن وجدت'}</span><input value={item.special_needs} onChange={e=>updateDependent(index,{special_needs:e.target.value})}/></label>
          <label className={styles.intakeCheckbox}><input type="checkbox" checked={item.financial_dependency} onChange={e=>updateDependent(index,{financial_dependency:e.target.checked})}/><span>يعتمد عليّ ماليًا</span></label>
        </div>
      </article>)}
      <button type="button" className={styles.intakeAddButton} onClick={()=>setDependents(current=>[...current,emptyDependent()])}><LucideIcon name="plus" size={16}/><span>إضافة فرد</span></button>
      <button type="button" className={styles.intakeNoneButton} onClick={()=>setDependents([])}>لا يوجد أشخاص أعولهم ماليًا</button>
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
      <div className={styles.incomeReconciliation}><small>الصافي المحسوب من المكونات</small><strong>{new Intl.NumberFormat('ar-SA-u-nu-arab',{maximumFractionDigits:2}).format(expectedNet)} ر.س</strong></div>
      {income.actual_net&&Number(income.actual_net)!==expectedNet&&<label className={styles.intakeDifference}><span>سبب الفرق بين المحسوب والفعلي</span><textarea rows={2} value={income.difference_explanation} onChange={e=>setIncome(v=>({...v,difference_explanation:e.target.value}))}/></label>}
    </div>}

    {intakeStep==='accounts'&&<div className={`${styles.intakeCards} ${styles.desktopStructuredIntake}`}>
      {accounts.map((item,index)=><article className={styles.intakeCard} key={index}>
        <div className={styles.intakeCardHeader}><strong>حساب {index+1}</strong>{accounts.length>1&&<button type="button" onClick={()=>setAccounts(current=>current.filter((_,i)=>i!==index))} aria-label="حذف الحساب"><LucideIcon name="trash2" size={16}/></button>}</div>
        <div className={styles.intakeGrid}>
          <label><span>البنك أو الجهة</span><input value={item.bank_name} onChange={e=>updateAccount(index,{bank_name:e.target.value})}/></label>
          <label><span>نوع الحساب</span><select value={item.account_type} onChange={e=>updateAccount(index,{account_type:e.target.value})}><option value="BANK">جاري/بنكي</option><option value="SAVINGS">ادخاري</option><option value="CASH">نقدي</option><option value="INVESTMENT">استثماري</option><option value="OTHER">أخرى</option></select></label>
          <label><span>معرف مختصر</span><input placeholder="مثال: حساب الراتب" value={item.short_identifier} onChange={e=>updateAccount(index,{short_identifier:e.target.value})}/></label>
          <label><span>رقم الآيبان إن رغبت</span><input inputMode="text" autoCapitalize="characters" placeholder="SA…" value={item.iban} onChange={e=>updateAccount(index,{iban:e.target.value.toUpperCase()})}/></label>
          <label><span>آخر 4 أرقام من البطاقة</span><input inputMode="numeric" maxLength={4} placeholder="مثال: 6883" value={item.card_last4} onChange={e=>updateAccount(index,{card_last4:e.target.value.replace(/\D/g,'').slice(0,4)})}/></label>
          <label><span>نوع البطاقة</span><select value={item.card_type} onChange={e=>updateAccount(index,{card_type:e.target.value})}><option>مدى</option><option>فيزا</option><option>ماستركارد</option><option>أخرى</option></select></label>
          <label><span>الاستخدام الحالي</span><input placeholder="راتب، ادخار، مصروف…" value={item.usage} onChange={e=>updateAccount(index,{usage:e.target.value})}/></label>
          <label><span>الرصيد الافتتاحي</span><input type="number" min="0" inputMode="decimal" value={item.opening_balance} onChange={e=>updateAccount(index,{opening_balance:e.target.value})}/></label>
          <label className={styles.intakeCheckbox}><input type="checkbox" checked={item.included_in_namaa} onChange={e=>updateAccount(index,{included_in_namaa:e.target.checked})}/><span>إدخاله ضمن نماء</span></label>
        </div>
      </article>)}
      <button type="button" className={styles.intakeAddButton} onClick={()=>setAccounts(current=>[...current,emptyAccount()])}><LucideIcon name="plus" size={16}/><span>إضافة حساب</span></button>
    </div>}

    {intakeStep==='obligations'&&<div className={`${styles.intakeCards} ${styles.desktopStructuredIntake}`}>
      {obligations.map((item,index)=><article className={styles.intakeCard} key={index}>
        <div className={styles.intakeCardHeader}><strong>التزام {index+1}</strong>{obligations.length>1&&<button type="button" onClick={()=>setObligations(current=>current.filter((_,i)=>i!==index))} aria-label="حذف الالتزام"><LucideIcon name="trash2" size={16}/></button>}</div>
        <div className={styles.intakeGrid}>
          <label><span>اسم الالتزام</span><input value={item.name} onChange={e=>updateObligation(index,{name:e.target.value})}/></label>
          <label><span>المبلغ</span><input type="number" min="0" inputMode="decimal" value={item.amount} onChange={e=>updateObligation(index,{amount:e.target.value})}/></label>
          <label><span>التكرار</span><select value={item.recurrence} onChange={e=>updateObligation(index,{recurrence:e.target.value})}><option value="MONTHLY">شهري</option><option value="WEEKLY">أسبوعي</option><option value="YEARLY">سنوي</option><option value="ONE_TIME">مرة واحدة</option><option value="OTHER">آخر</option></select></label>
          <label><span>الجهة</span><input value={item.provider} onChange={e=>updateObligation(index,{provider:e.target.value})}/></label>
          <label><span>يوم الاستحقاق إن وجد</span><input type="number" min="1" max="31" value={item.due_day} onChange={e=>updateObligation(index,{due_day:e.target.value})}/></label>
          <label><span>الرصيد المتبقي إن توفر</span><input type="number" min="0" inputMode="decimal" value={item.remaining_balance} onChange={e=>updateObligation(index,{remaining_balance:e.target.value})}/></label>
          <label><span>تاريخ الانتهاء إن وجد</span><input type="date" value={item.end_date} onChange={e=>updateObligation(index,{end_date:e.target.value})}/></label>
          <label><span>تكلفة التمويل/الرسوم إن عُرفت</span><input type="number" min="0" inputMode="decimal" value={item.finance_cost} onChange={e=>updateObligation(index,{finance_cost:e.target.value})}/></label>
        </div>
      </article>)}
      <button type="button" className={styles.intakeAddButton} onClick={()=>setObligations(current=>[...current,emptyObligation()])}><LucideIcon name="plus" size={16}/><span>إضافة التزام</span></button>
      <button type="button" className={styles.intakeNoneButton} onClick={()=>setObligations([])}>لا توجد التزامات مالية قائمة</button>
    </div>}

    {intakeStep==='goals'&&<div className={`${styles.intakeCards} ${styles.desktopStructuredIntake}`}>
      {goals.map((item,index)=><article className={styles.intakeCard} key={index}>
        <div className={styles.intakeCardHeader}><strong>هدف {index+1}</strong>{goals.length>1&&<button type="button" onClick={()=>setGoals(current=>current.filter((_,i)=>i!==index))} aria-label="حذف الهدف"><LucideIcon name="trash2" size={16}/></button>}</div>
        <div className={styles.intakeGrid}>
          <label><span>اسم الهدف</span><input value={item.name} onChange={e=>updateGoal(index,{name:e.target.value})}/></label>
          <label><span>المبلغ المستهدف</span><input type="number" min="0" inputMode="decimal" value={item.target_amount} onChange={e=>updateGoal(index,{target_amount:e.target.value})}/></label>
          <label><span>الموعد أو التاريخ المتوقع</span><input type="date" value={item.target_date} onChange={e=>updateGoal(index,{target_date:e.target.value})}/></label>
          <label><span>الأولوية كما تراها</span><input placeholder="مثال: عالية أو بعد السكن" value={item.priority} onChange={e=>updateGoal(index,{priority:e.target.value})}/></label>
          <label><span>مرونة الموعد</span><input placeholder="مرن / غير مرن / وصفك" value={item.flexibility} onChange={e=>updateGoal(index,{flexibility:e.target.value})}/></label>
          <label><span>مبلغ مخصص حاليًا</span><input type="number" min="0" inputMode="decimal" value={item.allocated_amount} onChange={e=>updateGoal(index,{allocated_amount:e.target.value})}/></label>
        </div>
      </article>)}
      <button type="button" className={styles.intakeAddButton} onClick={()=>setGoals(current=>[...current,emptyGoal()])}><LucideIcon name="plus" size={16}/><span>إضافة هدف</span></button>
      <button type="button" className={styles.intakeNoneButton} onClick={()=>setGoals([])}>لا توجد أهداف أريد تسجيلها الآن</button>
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
        <div role="cell"><strong>{item.name||`التزام ${rowIndex+1}`}</strong><small>{item.amount||'٠'} ر.س · {recurrenceLabel(item.recurrence)}</small></div>
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

    {mobileEditor&&<div className={`${styles.mobileRecordEditorOverlay} ${styles.fullPageOverlay}`} role="dialog" aria-modal="true" aria-label="تحرير السجل">
      <aside className={`${styles.mobileRecordEditorSheet} ${styles.fullPageSheet}`}>
        <header className={`${styles.mobileRecordEditorHeader} ${styles.fullPageHeader}`}><div><strong>{mobileEditor.index===null?'إضافة سجل':'تعديل السجل'}</strong><small>احفظ هذا السجل ثم عد للقائمة.</small></div><button type="button" onClick={()=>setMobileEditor(null)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></header>
        <div className={styles.mobileRecordEditorBody}>
          {mobileEditor.kind==='dependents'&&<>
            <label className={styles.mobileFieldWide}><span>الاسم</span><input value={mobileEditor.draft.name} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,name:e.target.value}})}/></label>
            <label><span>العلاقة</span><select value={mobileEditor.draft.relationship} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,relationship:e.target.value}})}><option value="">اختر</option><option>زوج/زوجة</option><option>ابن/ابنة</option><option>والد/والدة</option><option>قريب</option><option>غير ذلك</option></select></label>
            <label><span>العمر إن كان مهمًا للاحتياج</span><input type="number" min="0" value={mobileEditor.draft.age} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,age:e.target.value}})}/></label>
            <label><span>الدعم الشهري</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.monthly_support} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,monthly_support:e.target.value}})}/></label>
            <label><span>مصروف سنوي إضافي</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.annual_support} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,annual_support:e.target.value}})}/></label>
            <label className={styles.mobileFieldWide}><span>احتياجات خاصة مؤثرة ماليًا إن وجدت</span><input value={mobileEditor.draft.special_needs} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,special_needs:e.target.value}})}/></label>
            <label className={`${styles.intakeCheckbox} ${styles.mobileFieldWide}`}><input type="checkbox" checked={mobileEditor.draft.financial_dependency} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,financial_dependency:e.target.checked}})}/><span>يعتمد عليّ ماليًا</span></label>
          </>}
          {mobileEditor.kind==='accounts'&&<>
            <label className={styles.mobileFieldWide}><span>البنك أو الجهة</span><input value={mobileEditor.draft.bank_name} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,bank_name:e.target.value}})}/></label>
            <label><span>نوع الحساب</span><select value={mobileEditor.draft.account_type} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,account_type:e.target.value}})}><option value="BANK">جاري/بنكي</option><option value="SAVINGS">ادخاري</option><option value="CASH">نقدي</option><option value="INVESTMENT">استثماري</option><option value="OTHER">أخرى</option></select></label>
            <label><span>اسم مختصر للحساب</span><input value={mobileEditor.draft.short_identifier} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,short_identifier:e.target.value}})}/></label>
            <label><span>الآيبان إن رغبت</span><input value={mobileEditor.draft.iban} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,iban:e.target.value.toUpperCase()}})}/></label>
            <label><span>آخر 4 أرقام من البطاقة</span><input inputMode="numeric" maxLength={4} value={mobileEditor.draft.card_last4} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,card_last4:e.target.value.replace(/\D/g,'').slice(0,4)}})}/></label>
            <label><span>نوع البطاقة</span><select value={mobileEditor.draft.card_type} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,card_type:e.target.value}})}><option>مدى</option><option>فيزا</option><option>ماستركارد</option><option>أخرى</option></select></label>
            <label><span>الاستخدام الحالي</span><input value={mobileEditor.draft.usage} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,usage:e.target.value}})}/></label>
            <label><span>الرصيد الافتتاحي</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.opening_balance} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,opening_balance:e.target.value}})}/></label>
            <label className={`${styles.intakeCheckbox} ${styles.mobileFieldWide}`}><input type="checkbox" checked={mobileEditor.draft.included_in_namaa} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,included_in_namaa:e.target.checked}})}/><span>إدخاله ضمن نماء</span></label>
          </>}
          {mobileEditor.kind==='obligations'&&<>
            <label className={styles.mobileFieldWide}><span>اسم الالتزام</span><input value={mobileEditor.draft.name} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,name:e.target.value}})}/></label>
            <label><span>المبلغ</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.amount} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,amount:e.target.value}})}/></label>
            <label><span>التكرار</span><select value={mobileEditor.draft.recurrence} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,recurrence:e.target.value}})}><option value="MONTHLY">شهري</option><option value="WEEKLY">أسبوعي</option><option value="YEARLY">سنوي</option><option value="ONE_TIME">مرة واحدة</option><option value="OTHER">آخر</option></select></label>
            <label><span>الجهة</span><input value={mobileEditor.draft.provider} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,provider:e.target.value}})}/></label>
            <label><span>يوم الاستحقاق إن وجد</span><input type="number" min="1" max="31" value={mobileEditor.draft.due_day} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,due_day:e.target.value}})}/></label>
            <label><span>الرصيد المتبقي إن توفر</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.remaining_balance} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,remaining_balance:e.target.value}})}/></label>
            <label><span>تاريخ الانتهاء إن وجد</span><input type="date" value={mobileEditor.draft.end_date} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,end_date:e.target.value}})}/></label>
            <label><span>تكلفة التمويل/الرسوم إن عُرفت</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.finance_cost} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,finance_cost:e.target.value}})}/></label>
          </>}
          {mobileEditor.kind==='goals'&&<>
            <label className={styles.mobileFieldWide}><span>اسم الهدف</span><input value={mobileEditor.draft.name} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,name:e.target.value}})}/></label>
            <label><span>المبلغ المستهدف</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.target_amount} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,target_amount:e.target.value}})}/></label>
            <label><span>الموعد المتوقع</span><input type="date" value={mobileEditor.draft.target_date} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,target_date:e.target.value}})}/></label>
            <label><span>الأولوية</span><input value={mobileEditor.draft.priority} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,priority:e.target.value}})}/></label>
            <label><span>مرونة الموعد</span><input value={mobileEditor.draft.flexibility} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,flexibility:e.target.value}})}/></label>
            <label><span>مبلغ مخصص حاليًا</span><input type="number" min="0" inputMode="decimal" value={mobileEditor.draft.allocated_amount} onChange={e=>setMobileEditor({...mobileEditor,draft:{...mobileEditor.draft,allocated_amount:e.target.value}})}/></label>
          </>}
        </div>
        <footer className={styles.mobileRecordEditorActions}><button type="button" onClick={()=>setMobileEditor(null)}>إلغاء</button><button type="button" onClick={saveMobileEditor}>حفظ السجل</button></footer>
      </aside>
    </div>}

    {error&&<div className={styles.intakeError} role="alert">{error}</div>}
    <div className={styles.intakeActions}>
      <small>لن ينشئ هذا المكوّن أي تحويل أو سداد أو استثمار. لا ترسل رقم البطاقة كاملًا أو رمز الأمان أو الرقم السري أو رمز التحقق؛ يكفي آخر 4 أرقام فقط.</small>
      <button type="button" className={styles.mobileQuestionByQuestionButton} onClick={onClose}><LucideIcon name="messageSquareText" size={16}/><span>المتابعة سؤالًا بسؤال في الدردشة</span></button>
      <button type="button" className={styles.primaryActionButton} onClick={submitCurrent} disabled={saving}>
        <LucideIcon name="circleCheck" size={20}/>
        <span>{saving?'جارٍ الحفظ…':'تأكيد المجموعة والمتابعة'}</span>
      </button>
    </div>
  </section>;
}
