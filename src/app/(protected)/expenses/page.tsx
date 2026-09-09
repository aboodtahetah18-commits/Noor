import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getUserOperationalDate } from '@/features/settings/queries/get-user-timezone';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { listBudgetCategories } from '@/features/budget-categories/queries/list-budget-categories';
import { listExpenses } from '@/features/expenses/queries/list-expenses';
import { recordExpenseAction } from './actions';

import { EmptyState } from '@/components/ui/feedback-state';
import { ActionDialog } from '@/components/overlays/action-dialog';
import { BankMessageDialogTrigger } from '@/components/bank-message-dialog';
export default async function ExpensesPage() {
  const user = await requireAuthenticatedUser();
  const cycle = await getCurrentFinancialCycle(user.id);
  const accounts = await listAccounts(user.id);
  const categories = await listBudgetCategories(user.id, false);
  const expenses = cycle ? await listExpenses(user.id, cycle.id) : [];
  const today = await getUserOperationalDate(user.id);

  return <main className="page-shell p47-flow-page" dir="rtl">
    <header className="page-header p47-flow-header"><div><div className="title-with-help"><h1>إدخال مصروف يدوي</h1></div></div></header>
    {!cycle ? <EmptyState title="لا توجد دورة مالية نشطة" action={<Link className="primary-link" href="/cycles/new">بدء دورة مالية</Link>}><p>ابدأ دورة مالية قبل تسجيل المصروفات اليدوية.</p></EmptyState> : <>
      <section className="card p47-flow-card">
        <div className="section-title-row"><div><h2>المصروفات اليدوية</h2><p className="muted">التسجيل اليدوي مسار استثنائي؛ ابدأ بالمبلغ ثم البند والحساب وأكمل التفاصيل الضرورية فقط.</p></div><div className="p49-action-row"><BankMessageDialogTrigger className="button-link">إضافة رسالة بنكية</BankMessageDialogTrigger><ActionDialog trigger="إضافة مصروف" title="إضافة مصروف يدوي" description="استخدم الإدخال اليدوي فقط عند عدم توفر رسالة بنكية." size="lg" triggerClassName="primary-link"><form action={recordExpenseAction} className="form-grid p73-entry-form p73-expense-form">
          <input type="hidden" name="cycleId" value={cycle.id}/>
          <input type="hidden" name="idempotencyKey" value={randomUUID()}/>
          <label className="p73-money-field">المبلغ<input name="amount" inputMode="decimal" placeholder="0.00" required autoFocus /></label>
          <label>التاريخ<input name="transactionDate" type="date" defaultValue={today} required /></label>
          <label>البند<select name="categoryId" required><option value="">اختر البند</option>{categories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>الحساب<select name="accountId" required><option value="">اختر الحساب</option>{accounts.filter((a)=>a.isActive).map((a)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <fieldset className="p73-segmented"><legend>الخطة</legend><label><input type="radio" name="planningStatus" value="PLANNED" defaultChecked/> مخطط</label><label><input type="radio" name="planningStatus" value="UNPLANNED"/> غير مخطط</label></fieldset>
          <label>طبيعة المصروف<select name="expenseNature" required><option value="NECESSARY">ضروري</option><option value="IMPORTANT">مهم</option><option value="OPTIONAL">اختياري</option><option value="ENTERTAINMENT">ترفيهي</option><option value="UNPLANNED">غير مخطط</option></select></label>
          <label className="full">الوصف<input name="description" maxLength={500}/></label>
          <button className="primary-button" type="submit">تسجيل المصروف</button>
        </form></ActionDialog></div></div>
        <p className="muted">تسجيل استثنائي: بعد نشر المصروف يعاد احتساب أثره على البند والسيولة الآمنة وفق سياسة الاحتياطي المالي النشطة.</p>
      </section>
      <section className="card p47-flow-card"><h2>آخر المصروفات</h2>{expenses.length===0?<div className="p47-empty-panel"><h3>لا توجد مصروفات بعد</h3><p>ستظهر هنا آخر المصروفات اليدوية المسجلة خلال الدورة الحالية.</p></div>:<div className="list">{expenses.map((e)=><article className="list-row" key={e.id}><div><strong>{e.category_name}</strong><div className="muted">{e.transaction_date} · {e.account_name}</div></div><strong>{e.amount} ريال</strong></article>)}</div>}</section>
    </>}
  </main>;
}
