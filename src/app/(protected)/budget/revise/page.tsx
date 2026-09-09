import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getFinancialPlan } from '@/features/financial-plan/queries/get-financial-plan';
import { rawSql } from '@/infrastructure/db/client';
import { revisePlanAction } from '../actions';

export default async function Revise({searchParams}:{searchParams:Promise<{plan?:string;error?:string;fundingCase?:string}>}){
  const q=await searchParams;const u=await requireAuthenticatedUser();const plan=q.plan?await getFinancialPlan(u.id,q.plan):null;
  if(!plan||!plan.currentVersion)return <main className="app-page" dir="rtl"><section className="empty-state"><h1>الخطة غير موجودة</h1></section></main>;
  const reliefRows=q.fundingCase?await rawSql`select category_id as "categoryId",proposed_amount::text as "proposedAmount",relief_amount::text as "reliefAmount" from public.internal_funding_flexible_reliefs where user_id=${u.id} and case_id=${q.fundingCase}::uuid and plan_id=${plan.id}::uuid and status='REVISION_PENDING'`:[];
  const relief=new Map(reliefRows.map(r=>[String(r.categoryId),{proposedAmount:String(r.proposedAmount),reliefAmount:String(r.reliefAmount)}]));
  const defaultReason=q.fundingCase?'تخفيض بنود مرنة لتمويل رحلة وفق خطة حل فجوة معتمدة من المستخدم':'';
  return <main className="app-page" dir="rtl"><section className="page-shell p47-flow-page"><header><p className="eyebrow">الميزانية</p><div className="title-with-help"><h1>تعديل الخطة</h1></div></header>{q.error&&<p className="error-banner" role="alert">{q.error}</p>}{relief.size?<p className="success-banner">تم تحميل تخفيضات البنود المرنة من خطة حل فجوة الرحلة. راجعها ثم أنشئ نسخة التعديل؛ بعدها يلزم اعتمادها من صفحة الميزانية.</p>:null}<form action={revisePlanAction.bind(null,plan.id)} className="form-card p47-flow-card">{plan.currentVersion.allocations.map(a=>{const r=relief.get(a.categoryId);return <div className="account-row" key={a.id}><div><strong>{a.categoryName}</strong><span>القيمة الحالية: {a.plannedAmount} ريال{r?` · التخفيض المقترح: ${r.reliefAmount} ريال`:''}</span><input type="hidden" name="categoryId" value={a.categoryId}/></div><input name="newAmount" defaultValue={r?.proposedAmount??a.plannedAmount} inputMode="decimal"/></div>})}<label>سبب التعديل<textarea name="revisionReason" required minLength={3} defaultValue={defaultReason}/></label><button className="primary-button">إنشاء نسخة التعديل</button></form></section></main>;
}
