import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getGoalCycleReadiness } from '@/features/goals/queries/get-goal-cycle-readiness';
import { FocusedNextStep } from '@/components/ux/focused-next-step';
import { formatSar } from '@/lib/format-money';
import { approveGoalCycleCommitmentAction, createGoalAction } from './actions';
import { ActionDialog } from '@/components/overlays/action-dialog';

const L:Record<string,string>={DRAFT:'مسودة',ACTIVE:'نشط',FINANCIALLY_UNREALISTIC:'يحتاج إعادة ضبط التمويل',PAUSED:'متوقف مؤقتًا',ACHIEVED:'مكتمل',CANCELLED:'ملغى'};

export default async function Page({searchParams}:{searchParams:Promise<{error?:string;commitment?:string}>}){
  const u=await requireAuthenticatedUser();
  const [goalResult,q]=await Promise.all([getGoalCycleReadiness(u.id).then(data=>({data,error:false})).catch(()=>({data:{cycle:null,items:[]},error:true})),searchParams]);
  const data=goalResult.data;
  const goals=data.items;
  const totalRemaining=goals.reduce((sum,g)=>sum+Number(g.remainingAmount??0),0);
  const cycleGap=goals.reduce((sum,g)=>sum+Math.max(0,Number(g.gapThisCycle??0)),0);
  const today=new Date().toISOString().slice(0,10);

  return <main className="page-shell p47-goals-page" dir="rtl">
    <header className="page-header p47-section-header"><div><p className="eyebrow">التخطيط المالي</p><div className="title-with-help"><h1>الأهداف والرحلات</h1></div><p className="muted">حوّل أهدافك إلى مسار تمويل واضح: الرصيد الحالي، المطلوب لهذه الدورة، الموعد، والفجوة إن وجدت.</p></div><ActionDialog title="إنشاء هدف مالي" description="أدخل بيانات الهدف دون مغادرة المحفظة." size="lg" triggerClassName="p47-primary-action" trigger="+ هدف جديد"><form action={createGoalAction} className="form-grid"><label>اسم الهدف<input name="name" required placeholder="مثال: سفر الشتاء"/></label><label>قيمة الهدف<input name="targetAmount" inputMode="decimal" required placeholder="5000"/></label><label>الرصيد الحالي<input name="openingBalance" inputMode="decimal" defaultValue="0.00"/></label><label>تاريخ البداية<input name="startDate" type="date" required defaultValue={today}/></label><label>التاريخ المستهدف<input name="targetDate" type="date"/></label><label>الأولوية<input name="priority" type="number" min="1" placeholder="1"/></label><button className="primary-button" type="submit">إنشاء الهدف</button></form></ActionDialog></header>
    {q.error?<p className="error-banner" role="alert">{q.error}</p>:null}
    {goalResult.error?<p className="warning-banner" role="status">تعذر تحديث بيانات الأهداف الآن. يمكنك إعادة فتح الصفحة أو إنشاء هدف جديد، ولن تتوقف بقية المنصة.</p>:null}
    {q.commitment?<p className="success-banner">تم اعتماد مبلغ هذه الدورة للهدف. لم يتم تنفيذ أي تحويل مالي تلقائي.</p>:null}

    <section className={`p74-focus-summary ${cycleGap>0?'is-warning':''}`}><div><span>التركيز في هذه الصفحة</span><strong>{goals.length?`${goals.length} هدف · ${formatSar(totalRemaining.toFixed(2))} متبقي`:'لا توجد أهداف تحتاج تمويلًا'}</strong><small>{cycleGap>0?`هناك فجوة غير معتمدة ${formatSar(cycleGap.toFixed(2))}. راجع هدفًا واحدًا في كل مرة.`:'راجع هدفًا واحدًا، حدّث تمويله، ثم انتقل للهدف التالي.'}</small></div></section>

    {data.cycle?<section className="card p47-cycle-context"><div><span>الدورة الحالية</span><strong>{data.cycle.startDate} → {data.cycle.endDate}</strong></div><p>كل هدف بتاريخ محدد يحصل على مساهمة مطلوبة مستقلة. أنت من يحدد المبلغ الذي تستطيع تخصيصه فعليًا.</p></section>:null}

    {goals.length===0?<section className="card p47-empty-financial"><span>◎</span><h2>لا توجد أهداف نشطة تحتاج تمويلًا</h2><p>أنشئ هدفًا مثل السفر أو شراء سيارة أو دفعة منزل، ثم أضف الموعد ليحسب النظام الوتيرة المطلوبة.</p><ActionDialog title="إنشاء أول هدف" size="lg" triggerClassName="p47-primary-action" trigger="إنشاء أول هدف"><form action={createGoalAction} className="form-grid"><label>اسم الهدف<input name="name" required/></label><label>قيمة الهدف<input name="targetAmount" inputMode="decimal" required/></label><label>الرصيد الحالي<input name="openingBalance" inputMode="decimal" defaultValue="0.00"/></label><label>تاريخ البداية<input name="startDate" type="date" required defaultValue={today}/></label><label>التاريخ المستهدف<input name="targetDate" type="date"/></label><label>الأولوية<input name="priority" type="number" min="1"/></label><button className="primary-button" type="submit">إنشاء الهدف</button></form></ActionDialog></section>:
    <section className="p47-goal-portfolio">{goals.map(g=>{
      const required=Number(g.requiredContribution??0),approved=Number(g.approvedThisCycle??0),gap=Math.max(0,Number(g.gapThisCycle??0));
      const targetKnown=Boolean(g.targetDate);
      return <article key={g.id} className={`p47-goal-card ${gap>0?'is-attention':''}`}>
        <div className="p47-goal-card-head"><div><span className="p47-status-pill">{L[g.status]??g.status}</span><h2>{g.name}</h2><p>{targetKnown?`الهدف حتى ${g.targetDate}`:'بدون موعد نهائي محدد'}</p></div><div className="p47-goal-balance"><span>المتبقي</span><strong>{formatSar(String(g.remainingAmount))}</strong><small>{g.remainingCycles!=null?`${g.remainingCycles} دورة متبقية`:'بدون عدد دورات محسوب'}</small></div></div>
        <div className="p47-goal-funding-track"><div><span>المطلوب للدورة</span><strong>{required?formatSar(required.toFixed(2)):'—'}</strong></div><div><span>المعتمد الآن</span><strong>{formatSar(approved.toFixed(2))}</strong></div><div className={gap>0?'is-gap':''}><span>الفجوة</span><strong>{gap?formatSar(gap.toFixed(2)):'لا توجد'}</strong></div></div>
        <div className="p49-resource-actions"><ActionDialog title={`تفاصيل ${g.name}`} size="lg" trigger="عرض التفاصيل"><div className="detail-list"><div><span>الحالة</span><strong>{L[g.status]??g.status}</strong></div><div><span>المتبقي</span><strong>{formatSar(String(g.remainingAmount))}</strong></div><div><span>المطلوب للدورة</span><strong>{required?formatSar(required.toFixed(2)):'—'}</strong></div><div><span>المعتمد</span><strong>{formatSar(approved.toFixed(2))}</strong></div><div><span>الفجوة</span><strong>{gap?formatSar(gap.toFixed(2)):'لا توجد'}</strong></div><div><span>الموعد</span><strong>{g.targetDate??'غير محدد'}</strong></div></div><div className="p49-dialog-actions"><Link className="secondary-link" href={'/goals/'+g.id}>إدارة الرحلات والتمويل المتقدم</Link></div></ActionDialog>{required>0?<ActionDialog title={`اعتماد مساهمة ${g.name}`} description="لن يتم تنفيذ تحويل مالي تلقائيًا." trigger="اعتماد المساهمة"><form action={approveGoalCycleCommitmentAction} className="form-grid"><input type="hidden" name="goalId" value={g.id}/><input type="hidden" name="requiredAmount" value={g.requiredContribution??''}/><label><span>مساهمة هذه الدورة</span><input name="approvedAmount" inputMode="decimal" defaultValue={approved>0?g.approvedThisCycle:g.requiredContribution??''} required/></label><button className="p47-primary-action" type="submit">اعتماد المساهمة</button></form></ActionDialog>:null}</div>{required<=0?<p className="p47-goal-note">أضف موعدًا نهائيًا إذا أردت أن يحسب النظام مساهمة دورية مطلوبة.</p>:null}
        <div className="p47-goal-card-footer"><span>لا يوجد توزيع تلقائي بين الأهداف</span></div>
      </article>})}</section>}

    <details className="p74-secondary-disclosure"><summary>قاعدة القرار بين الأهداف</summary><div className="card p47-goal-governance"><p>إذا لم تكفِ قدرتك المالية لكل الأهداف، لا يقوم النظام بترتيبها أو خفضها تلقائيًا. تظهر الفجوة لكل هدف وتختار أنت ما يتم اعتماده.</p></div></details><FocusedNextStep href="/advisor" title="التالي: المستشار المالي" description="بعد تحديد أهدافك، راجع التوصيات التي تربط الأهداف بقدرتك المالية الحالية."/>
  </main>;
}
