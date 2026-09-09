import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getFinancialBufferPolicy } from '@/features/financial-buffer/queries/get-financial-buffer-policy';
import { saveFinancialBufferPolicyAction } from './actions';

export default async function FinancialBufferPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const user=await requireAuthenticatedUser(); const query=await searchParams; const policy=await getFinancialBufferPolicy(user.id);
  const percent=policy?(policy.percentBps/100).toFixed(2):'';
  return <main className="app-page" dir="rtl"><div className="page-shell p47-flow-page">
    <header className="page-header p47-flow-header"><div><p className="eyebrow">حماية السيولة</p><div className="title-with-help"><h1>الاحتياطي المالي</h1></div></div><Link className="button-link" href="/settings">رجوع</Link></header>
    {query.saved==='1'?<section className="card success-card"><strong>تم اعتماد قاعدة الاحتياطي المالي.</strong></section>:null}
    {typeof query.error==='string'?<section className="card danger-zone"><strong>{query.error}</strong></section>:null}
    <section className="card p47-flow-card"><form action={saveFinancialBufferPolicyAction} className="form-grid">
      <label className="full">طريقة الاحتياطي<select name="mode" defaultValue={policy?.mode??'FIXED'}><option value="FIXED">مبلغ ثابت</option><option value="PERCENT_INCOME">نسبة من دخل الدورة</option><option value="MAX_FIXED_PERCENT">الأعلى بين مبلغ ثابت ونسبة من الدخل</option></select></label>
      <label>المبلغ الثابت<input name="fixedAmount" inputMode="decimal" defaultValue={policy?.fixedAmount??''} /></label>
      <label>النسبة من الدخل %<input name="percent" inputMode="decimal" defaultValue={percent} /></label>
      <button className="primary-button" type="submit">اعتماد قاعدة الاحتياطي</button>
    </form></section>
    {policy?<section className="card p47-flow-card"><div className="section-title-row"><div><p className="eyebrow">القاعدة الحالية</p><h2>{policy.mode==='FIXED'?'مبلغ ثابت':policy.mode==='PERCENT_INCOME'?'نسبة من الدخل':'الأعلى بين القاعدتين'}</h2></div></div><div className="settings-mini-list"><div><span>المبلغ</span><strong>{policy.fixedAmount} ريال</strong></div><div><span>النسبة</span><strong>{(policy.percentBps/100).toFixed(2)}%</strong></div></div></section>:null}
  </div></main>;
}
