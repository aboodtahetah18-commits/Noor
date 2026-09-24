import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getFinancialBufferPolicy } from '@/features/financial-buffer/queries/get-financial-buffer-policy';
import { saveFinancialBufferPolicyAction } from './actions';
import { PageHeader } from '@/components/ui';

export default async function FinancialBufferPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const user=await requireAuthenticatedUser(); const query=await searchParams; const policy=await getFinancialBufferPolicy(user.id);
  const percent=policy?(policy.percentBps/100).toFixed(2):'';
  return <main className="app-page namaa-financial-buffer-page" dir="rtl"><div className="page-shell p47-flow-page namaa-migrated-shell">
    <PageHeader className="page-header p47-flow-header namaa-migrated-header" eyebrow="حماية السيولة" title="الاحتياطي المالي" description="حدد حد الحماية المرجعي قبل احتساب المتاح الآمن للصرف." actions={<Link className="ux-button ux-button--secondary" href="/settings">رجوع</Link>}/>
    {query.saved==='1'?<section className="card success-card"><strong>تم اعتماد قاعدة الاحتياطي المالي.</strong></section>:null}
    {typeof query.error==='string'?<section className="card danger-zone"><strong>تعذر اعتماد قاعدة الاحتياطي. راجع القيم ثم أعد المحاولة.</strong></section>:null}
    <section className="card p47-flow-card"><form action={saveFinancialBufferPolicyAction} className="form-grid">
      <label className="full">طريقة الاحتياطي<select name="mode" defaultValue={policy?.mode??'FIXED'}><option value="FIXED">مبلغ ثابت</option><option value="PERCENT_INCOME">نسبة من دخل الدورة</option><option value="MAX_FIXED_PERCENT">الأعلى بين مبلغ ثابت ونسبة من الدخل</option></select></label>
      <label>المبلغ الثابت<input name="fixedAmount" inputMode="decimal" defaultValue={policy?.fixedAmount??''} /></label>
      <label>النسبة من الدخل %<input name="percent" inputMode="decimal" defaultValue={percent} /></label>
      <button className="primary-button" type="submit">اعتماد قاعدة الاحتياطي</button>
    </form></section>
    {policy?<section className="card p47-flow-card"><div className="section-title-row"><div><p className="eyebrow">القاعدة الحالية</p><h2>{policy.mode==='FIXED'?'مبلغ ثابت':policy.mode==='PERCENT_INCOME'?'نسبة من الدخل':'الأعلى بين القاعدتين'}</h2></div></div><div className="settings-mini-list"><div><span>المبلغ</span><strong>{policy.fixedAmount} ريال</strong></div><div><span>النسبة</span><strong>{(policy.percentBps/100).toFixed(2)}%</strong></div></div></section>:null}
  </div></main>;
}
