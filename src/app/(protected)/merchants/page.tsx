import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listMerchantRules } from '@/features/bank-statements/queries/list-merchant-rules';
import { addMerchantAliasAction, toggleMerchantAliasAction } from '../bank-statements/actions';
import Link from 'next/link';
import { FocusedNextStep } from '@/components/ux/focused-next-step';
import { getUserOperationalDate } from '@/features/settings/queries/get-user-timezone';
import { listMerchantSpendingInsights } from '@/features/bank-statements/queries/list-merchant-spending-insights';
import type { MerchantSpendingSignal } from '@/financial-engine/merchant-spending-pressure';

function MerchantSpendingSummary({ insight }: { insight: MerchantSpendingSignal | undefined }) {
  if (!insight) return <p className="muted">لا توجد عمليات بنكية معتمدة ومرتبطة بهذا التاجر خلال آخر 60 يومًا. قد توجد مصروفات غير مربوطة باسمه.</p>;
  const message = insight.pressure === 'CATEGORY_OVER_BUDGET'
    ? 'البند المرتبط تجاوز موازنته. راجع عمليات التاجر وتكاليفه قبل اتخاذ قرار.'
    : insight.pressure === 'CATEGORY_AT_RISK'
      ? 'البند المرتبط يحتاج متابعة؛ لا يعني ذلك أن التاجر سبب التجاوز وحده.'
      : insight.pressure === 'SPENDING_INCREASED'
        ? 'الإنفاق على التاجر ارتفع؛ تحقق من الكميات والأسعار وحجم النشاط.'
        : 'لا يظهر من هذه البيانات ضغط مؤكد؛ تستمر المراقبة.';
  return <div className="merchant-spending-summary">
    <p className="muted"><strong>إنفاق آخر 30 يومًا:</strong> {insight.currentAmount} ريال · <strong>الـ30 يومًا السابقة:</strong> {insight.previousAmount} ريال · <strong>عدد العمليات:</strong> {insight.currentTransactionCount}</p>
    <p className="muted"><strong>التغير:</strong> {insight.changePercent ? `${insight.changePercent}%` : 'لا تتوفر قاعدة مقارنة موجبة'} · {message}</p>
    <p className="muted">التحليل يعتمد على عمليات مُرحّلة ذات ربط بنكي موثوق ويخصم المرتجعات المرتبطة؛ ولا يشمل المصروفات اليدوية غير المرتبطة بالتاجر.</p>
    {insight.pressure !== 'NO_VERIFIED_PRESSURE' ? <Link className="secondary-link" href="/cases">فتح مركز الحالات لمتابعة المعالجة</Link> : null}
  </div>;
}

export default async function MerchantsPage(){
  const user=await requireAuthenticatedUser();
  const rules=await listMerchantRules(user.id);
  const insights=await listMerchantSpendingInsights(user.id,await getUserOperationalDate(user.id),rules);
  return <main className="page-shell p47-closure-page" dir="rtl">
    <header className="page-header p47-closure-header"><div><p className="eyebrow">هوية التاجر</p><h1>التجار والمسميات البنكية</h1></div><Link className="secondary-link" href="/bank-operations">العمليات البنكية</Link></header>
    <section className="card">
      {rules.length===0?<div className="plan-empty-state"><strong>لا توجد تجار معرفة بعد</strong><Link className="primary-link" href="/bank-operations">العمليات البنكية</Link></div>:<div className="p44-review-list">{rules.map(rule=><form className="form-card" action={addMerchantAliasAction} key={rule.id}>
        <input type="hidden" name="ruleId" value={rule.id}/><input type="hidden" name="returnTo" value="/merchants"/>
        <div className="section-title-row"><div><strong>{rule.displayName}</strong><div className="muted">{rule.categoryName??'بدون بند'} · {rule.learningState==='TRUSTED'?'موثوق':rule.learningState==='LIKELY'?'مرجح':rule.learningState==='CONFLICT'?'متعارض':'جديد'}</div></div><span className="p44-badge">{rule.aliases?.length??0} اسم</span></div>
        <MerchantSpendingSummary insight={insights.get(rule.id)}/>
        <div className="merchant-alias-list">{(rule.aliases??[]).map(alias=><div className="merchant-alias-chip" key={alias.id}><span>{alias.displayAlias??alias.normalizedAlias}{alias.city?` · ${alias.city}`:''}{alias.branchLabel?` · ${alias.branchLabel}`:''}</span><button className="secondary-button" formAction={toggleMerchantAliasAction} name="aliasId" value={alias.id}>{alias.isActive?'إيقاف':'تفعيل'}</button></div>)}</div>
        <div className="form-grid"><label>اسم نقطة البيع / الفرنشايز<input name="alias" maxLength={160} required/></label><label>المدينة <span className="muted">اختياري</span><input name="city" maxLength={80}/></label><label>الفرع <span className="muted">اختياري</span><input name="branchLabel" maxLength={120}/></label></div>
        <div className="button-row"><button className="primary-button" type="submit">إضافة اسم للتاجر</button></div>
      </form>)}</div>}
    </section>
    <FocusedNextStep href="/bank-operations" title="التالي: العمليات البنكية" description=""/>
  </main>;
}
