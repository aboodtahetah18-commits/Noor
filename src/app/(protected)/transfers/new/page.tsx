import { randomUUID } from 'node:crypto';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { getUserOperationalDate } from '@/features/settings/queries/get-user-timezone';
import { transferAction } from '../actions';

export default async function NewTransferPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const user=await requireAuthenticatedUser(); const q=await searchParams;
  const [cycle,accounts,today]=await Promise.all([getCurrentFinancialCycle(user.id),listAccounts(user.id),getUserOperationalDate(user.id)]);
  if(!cycle) return <main className="app-page" dir="rtl"><section className="page-shell narrow-shell p47-flow-page p47-flow-card"><div className="title-with-help"><h1>تحويل بين الحسابات</h1></div></section></main>;
  return <main className="app-page" dir="rtl"><section className="page-shell narrow-shell p47-flow-page p47-flow-card"><p className="eyebrow">تحويل داخلي</p><div className="title-with-help"><h1>تحويل بين الحسابات</h1></div>{q.error&&<p className="p47-inline-error" role="alert">{q.error}</p>}
    <form className="p47-flow-form p73-entry-form p73-transfer-form" action={transferAction}><input type="hidden" name="cycleId" value={cycle.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/>
      <label>من الحساب<select name="fromAccountId" required defaultValue=""><option value="" disabled>اختر الحساب المصدر</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} — {a.balance} ريال</option>)}</select></label>
      <label>إلى الحساب<select name="toAccountId" required defaultValue=""><option value="" disabled>اختر الحساب الوجهة</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label className="p73-money-field">المبلغ<input name="amount" inputMode="decimal" required placeholder="0.00"/></label>
      <label>التاريخ<input name="transactionDate" type="date" defaultValue={today} required/></label>
      <label>الوصف<input name="description" placeholder="اختياري"/></label>
      <button className="primary-button" type="submit">تنفيذ التحويل</button>
    </form></section></main>;
}
