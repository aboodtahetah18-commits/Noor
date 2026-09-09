import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { listBankStatementImports } from '@/features/bank-statements/queries/list-imports';
import { FocusedNextStep } from '@/components/ux/focused-next-step';
import { uploadBankStatementAction } from './actions';

export default async function BankStatementsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const user = await requireAuthenticatedUser();
  const query = await searchParams;
  const error = typeof query.error==='string' ? query.error : null;
  const [accounts,imports] = await Promise.all([listAccounts(user.id),listBankStatementImports(user.id)]);
  return <main className="page-shell bank-statements-page p47-closure-page" dir="rtl">
    <header className="page-header p47-closure-header"><div><p className="eyebrow">الذكاء البنكي</p><div className="title-with-help"><h1>كشوف الحساب</h1></div></div></header>
    {error?<section className="card danger-zone"><strong>{error}</strong></section>:null}
    <section className="p74-focus-summary"><div><span>المهمة الوحيدة هنا</span><strong>ارفع كشف الحساب وطابقه</strong><small>التعلم وقواعد التجار لها صفحة مستقلة، ورسائل البنك لها مركز العمليات البنكية.</small></div></section>
    <section className="card statement-upload-card">
      <div className="section-title-row"><div><h2>رفع كشف جديد</h2></div><span className="p44-badge">CSV · XLSX · PDF</span></div>
      <form action={uploadBankStatementAction} className="form-grid" encType="multipart/form-data">
        <label>الحساب<select name="accountId" required defaultValue=""><option value="" disabled>اختر الحساب</option>{accounts.map((a)=><option key={a.id} value={a.id}>{a.bankName ? `${a.bankName} · `:''}{a.name}</option>)}</select></label>
        <label>كشف الحساب<input name="statement" type="file" accept=".csv,.xlsx,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label>
        <button className="primary-button" type="submit">تحليل الكشف</button>
      </form>
    </section>
    <section className="card">
      <div className="section-title-row"><h2>سجل الاستيراد</h2><span className="muted">{imports.length} ملف</span></div>
      {imports.length===0?<div className="plan-empty-state">لا توجد كشوف مستوردة حتى الآن.</div>:<div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th>الملف</th><th>الحساب</th><th>الفترة</th><th>العمليات</th><th>تحتاج مراجعة</th><th>الحالة</th></tr></thead><tbody>{imports.map((item)=><tr key={item.id}><td data-label="الملف"><Link href={`/bank-statements/${item.id}`}>{item.fileName}</Link></td><td data-label="الحساب">{item.bankName?`${item.bankName} · `:''}{item.accountName}</td><td data-label="الفترة">{item.periodStart ?? '—'} → {item.periodEnd ?? '—'}</td><td data-label="العمليات">{item.rowCount}</td><td data-label="تحتاج مراجعة">{item.reviewCount}</td><td data-label="الحالة"><span className="statement-status">{item.status==='REVIEW'?'مراجعة':item.status}</span></td></tr>)}</tbody></table></div>}
    </section>
    <FocusedNextStep href="/transactions" title="التالي: السجل المالي" description="بعد مراجعة الكشف واعتماده، راجع الحركات المنشورة في السجل المالي."/>
  </main>;
}
