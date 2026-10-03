import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getTransactionDetails } from '@/features/transactions/queries/get-transaction-details';
import { formatSar } from '@/lib/format-money';
import { reverseTransactionAction } from '../actions';
import { LucideIcon } from '@/components/ui/lucide-icon';

const TYPE_LABELS: Record<string,string> = {
  INCOME:'دخل',EXPENSE:'مصروف',TRANSFER:'تحويل',REFUND:'استرداد',
  SAVING_TRANSFER:'تحويل للادخار',EMERGENCY_CONTRIBUTION:'مساهمة طوارئ',
  EMERGENCY_WITHDRAWAL:'سحب طارئ',GOAL_CONTRIBUTION:'مساهمة هدف',OBLIGATION_PAYMENT:'سداد التزام'
};
const STATUS_LABELS: Record<string,string> = {PENDING:'قيد التنفيذ',POSTED:'مكتملة',REVERSED:'معكوسة',FAILED:'فاشلة'};

function money(value:string|null){
  if(value===null) return '—';
  return formatSar(value).replace(/\s*\u20C1$/u,'');
}
function signedAmount(type:string,direction:'IN'|'OUT'|null,amount:string){
  const n=Number(amount||0);
  if(direction==='OUT'||type==='EXPENSE'||type==='OBLIGATION_PAYMENT') return (-Math.abs(n)).toFixed(2);
  if(direction==='IN'||type==='INCOME'||type==='REFUND') return Math.abs(n).toFixed(2);
  return n.toFixed(2);
}
function tone(type:string,direction:'IN'|'OUT'|null){
  if(direction==='OUT'||type==='EXPENSE'||type==='OBLIGATION_PAYMENT') return 'is-outflow';
  if(direction==='IN'||type==='INCOME') return 'is-inflow';
  if(type==='REFUND') return 'is-refund';
  return 'is-neutral';
}
function Money({value,className=''}:{value:string|null;className?:string}){
  return <span className={`namaa-detail-money ${className}`}>
    <Image src="/brand/saudi-riyal-symbol.png" alt="" width={18} height={18} unoptimized/>
    <span>{money(value)}</span>
  </span>;
}

export default async function TransactionDetailsPage({
  params,searchParams,
}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const user=await requireAuthenticatedUser();
  const {id}=await params;
  const query=await searchParams;
  const reversed=query.reversed==='1';
  const transaction=await getTransactionDetails(user.id,id);
  if(!transaction) notFound();

  const title=transaction.description||transaction.incomeSourceName||transaction.categoryName||TYPE_LABELS[transaction.transactionType]||'عملية مالية';
  const signed=signedAmount(transaction.transactionType,transaction.transactionDirection,transaction.amount);
  const impactClass=tone(transaction.transactionType,transaction.transactionDirection);
  const reference=transaction.id.slice(0,8).toUpperCase();

  return <main className="namaa-transaction-details-page" dir="rtl">
    <section className="namaa-transaction-detail-hero">
      <div className="namaa-transaction-detail-head">
        <span className={`namaa-transaction-type-badge ${impactClass}`}>{TYPE_LABELS[transaction.transactionType]??transaction.transactionType}</span>
        <Link className="namaa-detail-back" href="/transactions">السجل</Link>
      </div>
      <div className="namaa-transaction-detail-title">
        <div>
          <h1>{title}</h1>
          <Money value={transaction.amount} className={impactClass}/>
        </div>
        <span className={`namaa-detail-status is-${transaction.status.toLowerCase()}`}>{STATUS_LABELS[transaction.status]??transaction.status}</span>
      </div>
      <div className="namaa-transaction-detail-meta">
        <span>{transaction.transactionDate}</span>
        <span>المرجع {reference}</span>
      </div>
    </section>

    {reversed?<div className="namaa-detail-notice">تم عكس العملية</div>:null}

    <section className="namaa-detail-section">
      <h2>البيانات الأساسية</h2>
      <div className="namaa-detail-grid">
        <div><span>الحساب</span><strong>{transaction.accountName??'—'}{transaction.accountLast4?<small> •••• {transaction.accountLast4}</small>:null}</strong></div>
        <div><span>البند</span><strong>{transaction.categoryName??'—'}</strong></div>
        <div><span>الدورة</span><strong>{transaction.cycleName??'—'}</strong></div>
        <div><span>المصدر</span><strong>{transaction.incomeSourceName??transaction.description??'—'}</strong></div>
      </div>
    </section>

    <section className="namaa-detail-section">
      <h2>الأثر المالي</h2>
      <div className="namaa-financial-impact-grid">
        <div className="namaa-balance-stack">
          <article>
            <span>الرصيد قبل</span>
            <Money value={transaction.accountBalanceBefore}/>
          </article>
          <article>
            <span>الرصيد بعد</span>
            <Money value={transaction.accountBalanceAfter} className={impactClass}/>
          </article>
        </div>
        <div className="namaa-impact-stack">
          <article>
            <span>الأثر على الحساب</span>
            <Money value={signed} className={impactClass}/>
          </article>
          <article>
            <span>الأثر على الميزانية</span>
            <Money value={transaction.categoryId?signed:null} className={impactClass}/>
          </article>
        </div>
      </div>
    </section>

    {transaction.status==='POSTED'&&['INCOME','EXPENSE'].includes(transaction.transactionType)?
      <section className="namaa-detail-section namaa-detail-management">
        <h2>الإدارة</h2>
        <details>
          <summary><LucideIcon name="refreshCw" size={18}/> عكس العملية</summary>
          <form action={reverseTransactionAction}>
            <input type="hidden" name="transactionId" value={transaction.id}/>
            <input type="hidden" name="idempotencyKey" value={`reverse-${randomUUID()}`}/>
            <label>السبب<textarea name="reason" required minLength={3} maxLength={500}/></label>
            <button className="danger-button" type="submit">تأكيد العكس</button>
          </form>
        </details>
      </section>:null}
  </main>;
}
