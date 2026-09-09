import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getUserOperationalDate } from '@/features/settings/queries/get-user-timezone';
import { getObligation } from '@/features/obligations/queries/get-obligation';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { payObligationAction } from '../../actions';

export default async function PayObligationPage({ params,searchParams }:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const user=await requireAuthenticatedUser(); const {id}=await params; const query=await searchParams;
  const obligation=await getObligation(user.id,id); if(!obligation) return notFound();
  const accounts=(await listAccounts(user.id)).filter(a=>a.isActive);
  const today = await getUserOperationalDate(user.id);
  return <main className="page-shell narrow-shell p47-flow-page" dir="rtl"><header className="page-header p47-flow-header"><div><p className="eyebrow">تسجيل سداد</p><h1>{obligation.name}</h1></div><Link href="/obligations">العودة</Link></header>
    {typeof query.error==='string'?<section className="card danger-zone"><strong>{query.error}</strong></section>:null}
    <section className="account-detail-hero"><span>المبلغ المستحق</span><strong>{obligation.amount} ريال</strong><small>{obligation.dueDate} · {obligation.isReserved?'محجوز ماليًا':'غير محجوز حاليًا'}</small></section>
    <section className="form-card p47-flow-card"><form className="p47-flow-form form-grid" action={payObligationAction}>
      <input type="hidden" name="obligationOccurrenceId" value={obligation.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/>
      <label>المبلغ<input name="amount" value={obligation.amount} readOnly/></label>
      <label>تاريخ السداد<input name="transactionDate" type="date" defaultValue={today} required/></label>
      <label>الحساب<select name="accountId" defaultValue={obligation.expectedAccountId??''} required><option value="">اختر الحساب</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <button className="primary-button" type="submit">تأكيد السداد</button>
    </form><p className="muted">السداد ينشئ OBLIGATION_PAYMENT منشورة، يخفض رصيد الحساب فعليًا، ويحرر الحجز دون إضافة السيولة مرة ثانية.</p></section>
  </main>;
}
