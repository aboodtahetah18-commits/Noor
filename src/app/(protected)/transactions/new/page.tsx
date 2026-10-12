import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { listBudgetCategories } from '@/features/budget-categories/queries/list-budget-categories';
import { getUserOperationalDate } from '@/features/settings/queries/get-user-timezone';
import { recordExpenseAction } from '@/app/(protected)/expenses/actions';

export default async function NewTransactionPage(){
  const user=await requireAuthenticatedUser();
  const [cycle,accounts,categories,today]=await Promise.all([
    getCurrentFinancialCycle(user.id),
    listAccounts(user.id),
    listBudgetCategories(user.id,true),
    getUserOperationalDate(user.id),
  ]);
  return <main className="namaa-approved-finance namaa-full-form-page" dir="rtl">
    <header className="namaa-full-form-header"><h1>إضافة عملية</h1></header>
    <section className="namaa-full-form-content">
      {!cycle?<div className="namaa-form-state"><strong>لا توجد دورة مالية نشطة</strong><Link href="/cycles/new" className="namaa-form-state__action">بدء دورة الآن</Link></div>:
        <form action={recordExpenseAction} className="namaa-approved-transaction-form">
          <input type="hidden" name="cycleId" value={cycle.id}/>
          <input type="hidden" name="idempotencyKey" value={randomUUID()}/>
          <input type="hidden" name="planningStatus" value="PLANNED"/>
          <label>المبلغ<input name="amount" inputMode="decimal" required/></label>
          <label>التاريخ<input name="transactionDate" type="date" defaultValue={today} required/></label>
          <label>البند<select name="categoryId" required><option value="">اختر البند</option>{categories.filter(c=>c.isActive!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>الحساب<select name="accountId" required><option value="">اختر الحساب</option>{accounts.filter(a=>a.isActive).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label>طبيعة المصروف<select name="expenseNature" required><option value="NECESSARY">ضروري</option><option value="IMPORTANT">مهم</option><option value="OPTIONAL">اختياري</option><option value="ENTERTAINMENT">ترفيهي</option><option value="UNPLANNED">غير مخطط</option></select></label>
          <label>الوصف<input name="description" maxLength={500}/></label>
          <button className="p47-primary-action" type="submit">تسجيل المصروف</button>
        </form>}
    </section>
  </main>;
}
