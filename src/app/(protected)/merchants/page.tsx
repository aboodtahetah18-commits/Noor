import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listMerchantRules } from '@/features/bank-statements/queries/list-merchant-rules';
import { addMerchantAliasAction, toggleMerchantAliasAction } from '../bank-statements/actions';
import Link from 'next/link';
import { FocusedNextStep } from '@/components/ux/focused-next-step';

export default async function MerchantsPage(){
  const user=await requireAuthenticatedUser();
  const rules=await listMerchantRules(user.id);
  return <main className="page-shell p47-closure-page" dir="rtl">
    <header className="page-header p47-closure-header"><div><p className="eyebrow">هوية التاجر</p><h1>التجار والمسميات البنكية</h1></div><Link className="secondary-link" href="/bank-operations">العمليات البنكية</Link></header>
    <section className="card">
      {rules.length===0?<div className="plan-empty-state"><strong>لا توجد تجار معرفة بعد</strong><Link className="primary-link" href="/bank-operations">العمليات البنكية</Link></div>:<div className="p44-review-list">{rules.map(rule=><form className="form-card" action={addMerchantAliasAction} key={rule.id}>
        <input type="hidden" name="ruleId" value={rule.id}/><input type="hidden" name="returnTo" value="/merchants"/>
        <div className="section-title-row"><div><strong>{rule.displayName}</strong><div className="muted">{rule.categoryName??'بدون بند'} · {rule.learningState==='TRUSTED'?'موثوق':rule.learningState==='LIKELY'?'مرجح':rule.learningState==='CONFLICT'?'متعارض':'جديد'}</div></div><span className="p44-badge">{rule.aliases?.length??0} اسم</span></div>
        <div className="merchant-alias-list">{(rule.aliases??[]).map(alias=><div className="merchant-alias-chip" key={alias.id}><span>{alias.displayAlias??alias.normalizedAlias}{alias.city?` · ${alias.city}`:''}{alias.branchLabel?` · ${alias.branchLabel}`:''}</span><button className="secondary-button" formAction={toggleMerchantAliasAction} name="aliasId" value={alias.id}>{alias.isActive?'إيقاف':'تفعيل'}</button></div>)}</div>
        <div className="form-grid"><label>اسم نقطة البيع / الفرنشايز<input name="alias" maxLength={160} required/></label><label>المدينة <span className="muted">اختياري</span><input name="city" maxLength={80}/></label><label>الفرع <span className="muted">اختياري</span><input name="branchLabel" maxLength={120}/></label></div>
        <div className="button-row"><button className="primary-button" type="submit">إضافة اسم للتاجر</button></div>
      </form>)}</div>}
    </section>
    <FocusedNextStep href="/bank-operations" title="التالي: العمليات البنكية" description=""/>
  </main>;
}
