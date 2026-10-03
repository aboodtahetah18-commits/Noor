import Link from 'next/link';
import Image from 'next/image';
import { randomUUID } from 'node:crypto';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listTransactions } from '@/features/transactions/queries/list-transactions';
import { getTransactionSummary } from '@/features/transactions/queries/get-transaction-summary';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { listBudgetCategories } from '@/features/budget-categories/queries/list-budget-categories';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { getUserOperationalDate } from '@/features/settings/queries/get-user-timezone';
import { formatSar } from '@/lib/format-money';
import { ActionDialog } from '@/components/overlays/action-dialog';
import { CompactFilterPanel } from '@/components/ui/compact-filter-panel';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { recordExpenseAction } from '../expenses/actions';
import { transferAction } from '../transfers/actions';
import { recordRefundAction } from '../refunds/new/actions';
import { transactionHistoryFiltersSchema } from '@/features/transactions/schemas/transaction-history';

const TYPE_LABELS:Record<string,string>={INCOME:'دخل',EXPENSE:'مصروف',TRANSFER:'تحويل',REFUND:'استرداد',SAVING_TRANSFER:'تحويل للادخار',EMERGENCY_CONTRIBUTION:'مساهمة طوارئ',EMERGENCY_WITHDRAWAL:'سحب طارئ',GOAL_CONTRIBUTION:'مساهمة هدف',OBLIGATION_PAYMENT:'سداد التزام'};
const STATUS_LABELS:Record<string,string>={PENDING:'قيد التنفيذ',POSTED:'مكتملة',REVERSED:'معكوسة',FAILED:'فاشلة'};

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]:v;

function queryString(current:Record<string,string|undefined>,patch:Record<string,string|number|undefined>){
  const params=new URLSearchParams();
  for(const [k,v] of Object.entries({...current,...patch})) if(v!==undefined&&v!=='') params.set(k,String(v));
  const q=params.toString();
  return q?`?${q}`:'/transactions';
}
function sign(type:string,direction:string|null){
  if(type==='INCOME'||type==='REFUND'||direction==='IN')return '+';
  if(type==='EXPENSE'||type==='OBLIGATION_PAYMENT'||direction==='OUT')return '−';
  return '';
}
function amountTone(type:string,direction:string|null){
  if(type==='INCOME'||type==='REFUND'||direction==='IN')return 'is-inflow';
  if(type==='EXPENSE'||type==='OBLIGATION_PAYMENT'||direction==='OUT')return 'is-outflow';
  return 'is-neutral';
}
function sarNumber(value:string){return formatSar(value).replace(/\s*\u20C1$/u,'')}
function TransactionAmount({value,prefix,className}:{value:string;prefix?:string;className?:string}){
  return <span className={`namaa-transaction-money ${className??''}`}>
    <span className="namaa-transaction-sign">{prefix??''}</span>
    <Image src="/brand/saudi-riyal-symbol.png" alt="" width={17} height={17} unoptimized/>
    <span>{sarNumber(value)}</span>
  </span>;
}

export default async function TransactionsPage({searchParams}:{searchParams:SearchParams}){
  const user=await requireAuthenticatedUser();
  const raw=await searchParams;
  const parsedFilters=transactionHistoryFiltersSchema.safeParse({
    page:one(raw.page)??'1',
    pageSize:one(raw.pageSize)??'25',
    dateFrom:one(raw.dateFrom),
    dateTo:one(raw.dateTo),
    transactionType:one(raw.transactionType)||undefined,
    categoryId:one(raw.categoryId)||undefined,
    accountId:one(raw.accountId)||undefined,
    planningStatus:one(raw.planningStatus)||undefined,
    search:one(raw.search),
    sort:one(raw.sort)??'DATE_DESC',
  });
  const input=parsedFilters.success?parsedFilters.data:transactionHistoryFiltersSchema.parse({});

  const [result,summary,accounts,categories,cycle,today,refundCandidates]=await Promise.all([
    listTransactions(user.id,input),
    getTransactionSummary(user.id,input),
    listAccounts(user.id),
    listBudgetCategories(user.id,true),
    getCurrentFinancialCycle(user.id),
    getUserOperationalDate(user.id),
    listTransactions(user.id,{page:1,pageSize:100,transactionType:'EXPENSE',sort:'DATE_DESC'}),
  ]);
  const current=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,one(v)]));
  const netTone=Number(summary.net)>0?'is-inflow':Number(summary.net)<0?'is-outflow':'is-neutral';

  const filterPanel=<CompactFilterPanel title="تصفية" className="p47-filter-panel namaa-toolbar-filter">
    <form method="get" className="p47-filter-grid p4913-ledger-filter">
      <label className="is-search"><span>بحث</span><input name="search" defaultValue={input.search} placeholder="الوصف، الحساب أو البند"/></label>
      <label className="is-type"><span>النوع</span><select name="transactionType" defaultValue={input.transactionType??''}><option value="">الكل</option>{Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label className="is-account"><span>الحساب</span><select name="accountId" defaultValue={input.accountId??''}><option value="">الكل</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label className="is-category"><span>البند</span><select name="categoryId" defaultValue={input.categoryId??''}><option value="">الكل</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="is-from"><span>من</span><input type="date" name="dateFrom" defaultValue={input.dateFrom}/></label>
      <label className="is-to"><span>إلى</span><input type="date" name="dateTo" defaultValue={input.dateTo}/></label>
      <label className="is-sort"><span>الترتيب</span><select name="sort" defaultValue={input.sort}><option value="DATE_DESC">الأحدث</option><option value="DATE_ASC">الأقدم</option><option value="AMOUNT_DESC">الأعلى</option><option value="AMOUNT_ASC">الأقل</option></select></label>
      <div className="p47-filter-actions"><button className="p47-primary-action" type="submit">تطبيق</button><Link className="p47-quiet-action" href="/transactions">مسح</Link></div>
    </form>
  </CompactFilterPanel>;

  return <main className="p47-page namaa-transactions-page" dir="rtl"><section className="p47-content-shell">

    <section className="namaa-transactions-summary" aria-label="ملخص العمليات">
      <div className="namaa-summary-metric is-count"><span>العمليات</span><strong>{summary.totalItems}</strong></div>
      <div className="namaa-summary-metric is-inflow"><span>الداخل</span><strong><TransactionAmount value={summary.inflow}/></strong></div>
      <div className="namaa-summary-metric is-outflow"><span>الخارج</span><strong><TransactionAmount value={summary.outflow}/></strong></div>
      <div className={`namaa-summary-metric ${netTone}`}><span>الصافي</span><strong><TransactionAmount value={summary.net}/></strong></div>
    </section>

    <section className="p47-panel namaa-transactions-panel">
      <div className="namaa-transactions-toolbar">
        <h2>السجل</h2>
        <div className="namaa-transactions-toolbar-actions">
          <a className="namaa-square-action" href={queryString(current,{page:input.page})} aria-label="تحديث" title="تحديث"><LucideIcon name="refreshCw" size={20}/></a>
          {filterPanel}
          <details className="namaa-transaction-add-menu">
            <summary className="namaa-square-action is-primary" aria-label="إضافة عملية" title="إضافة عملية"><LucideIcon name="plus" size={20}/></summary>
            <div className="namaa-transaction-add-options">
              <Link href="/income/new" className="namaa-add-option"><LucideIcon name="plus" size={20}/><span>دخل</span></Link>
              {cycle?<ActionDialog trigger={<span className="namaa-action-label"><LucideIcon name="plus" size={20}/><span>مصروف</span></span>} title="إضافة مصروف" size="lg">
                <form action={recordExpenseAction} className="form-grid p73-entry-form p73-expense-form">
                  <input type="hidden" name="cycleId" value={cycle.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/>
                  <label>المبلغ<input name="amount" inputMode="decimal" required/></label>
                  <label>التاريخ<input name="transactionDate" type="date" defaultValue={today} required/></label>
                  <label>البند<select name="categoryId" required><option value="">اختر البند</option>{categories.filter(c=>c.isActive!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                  <label>الحساب<select name="accountId" required><option value="">اختر الحساب</option>{accounts.filter(a=>a.isActive).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                  <label>الطبيعة<select name="expenseNature" required><option value="NECESSARY">ضروري</option><option value="IMPORTANT">مهم</option><option value="OPTIONAL">اختياري</option><option value="ENTERTAINMENT">ترفيهي</option><option value="UNPLANNED">غير مخطط</option></select></label>
                  <label>الوصف<input name="description" maxLength={500}/></label>
                  <input type="hidden" name="planningStatus" value="PLANNED"/>
                  <button className="primary-button" type="submit">تسجيل</button>
                </form>
              </ActionDialog>:null}
              {cycle?<ActionDialog trigger={<span className="namaa-action-label"><LucideIcon name="repeat2" size={20}/><span>تحويل</span></span>} title="تحويل" size="lg">
                <form className="p47-flow-form p73-entry-form p73-transfer-form" action={transferAction}>
                  <input type="hidden" name="cycleId" value={cycle.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/>
                  <label>من الحساب<select name="fromAccountId" required defaultValue=""><option value="" disabled>اختر الحساب</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                  <label>إلى الحساب<select name="toAccountId" required defaultValue=""><option value="" disabled>اختر الحساب</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                  <label>المبلغ<input name="amount" inputMode="decimal" required/></label>
                  <label>التاريخ<input name="transactionDate" type="date" defaultValue={today} required/></label>
                  <label>الوصف<input name="description"/></label>
                  <button className="primary-button" type="submit">تنفيذ</button>
                </form>
              </ActionDialog>:null}
              <ActionDialog trigger={<span className="namaa-action-label"><LucideIcon name="refreshCw" size={20}/><span>استرداد</span></span>} title="استرداد" size="lg">
                <form className="p47-flow-form form-grid p73-entry-form p73-refund-form" action={recordRefundAction}>
                  <input type="hidden" name="idempotencyKey" value={randomUUID()}/>
                  <label className="full">المصروف<select name="originalTransactionId" required><option value="">اختر المصروف</option>{refundCandidates.items.filter(e=>e.status==='POSTED').map(e=><option key={e.id} value={e.id}>{e.transactionDate} · {e.categoryName??e.description??'مصروف'} · {e.amount} ريال</option>)}</select></label>
                  <label>المبلغ<input name="amount" inputMode="decimal" required/></label>
                  <label>الحساب<select name="accountId" required><option value="">اختر الحساب</option>{accounts.filter(a=>a.isActive).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                  <label>التاريخ<input name="transactionDate" type="date" defaultValue={today} required/></label>
                  <label className="full">الوصف<input name="description" maxLength={500}/></label>
                  <button className="primary-button" type="submit">تسجيل</button>
                </form>
              </ActionDialog>
            </div>
          </details>
        </div>
      </div>

      {result.items.length===0?<div className="p47-soft-empty namaa-transactions-empty"><strong>لا توجد عمليات</strong></div>:<>
        <div className="namaa-transaction-table-head" aria-hidden="true">
          <span>النوع</span><span>الوصف</span><span>الحساب</span><span>البند</span><span>التاريخ</span><span>المبلغ</span><span>الحالة</span><span/>
        </div>
        <div className="p47-transaction-list namaa-transaction-list">
          {result.items.map(t=><article key={t.id} className="p47-transaction-row namaa-transaction-card">
            <div className={`p47-transaction-kind is-${t.transactionType.toLowerCase()}`}>{TYPE_LABELS[t.transactionType]??t.transactionType}</div>
            <strong className="namaa-transaction-description">{t.description||t.incomeSourceName||'عملية مالية'}</strong>
            <span className="namaa-transaction-account">{t.accountName??'—'}</span>
            <span className="namaa-transaction-category">{t.categoryName??'—'}</span>
            <span className="namaa-transaction-date">{t.transactionDate}</span>
            <strong className={`namaa-transaction-amount-value ${amountTone(t.transactionType,t.transactionDirection)}`}><TransactionAmount value={t.amount} prefix={sign(t.transactionType,t.transactionDirection)}/></strong>
            <span className={`namaa-transaction-status is-${t.status.toLowerCase()}`}>{STATUS_LABELS[t.status]??t.status}</span>
            <ActionDialog trigger={<span className="namaa-action-label"><LucideIcon name="eye" size={20}/><span>التفاصيل</span></span>} title="تفاصيل الحركة" size="md">
              <dl className="p49-detail-grid">
                <div><dt>النوع</dt><dd>{TYPE_LABELS[t.transactionType]??t.transactionType}</dd></div>
                <div><dt>المبلغ</dt><dd><TransactionAmount value={t.amount}/></dd></div>
                <div><dt>الحالة</dt><dd>{STATUS_LABELS[t.status]??t.status}</dd></div>
                <div><dt>التاريخ</dt><dd>{t.transactionDate}</dd></div>
                <div><dt>الحساب</dt><dd>{t.accountName??'—'}</dd></div>
                <div><dt>البند</dt><dd>{t.categoryName??'—'}</dd></div>
              </dl>
              <div className="p49-dialog-actions"><Link href={`/transactions/${t.id}`}>الإجراءات</Link></div>
            </ActionDialog>
          </article>)}
        </div>
      </>}

      {result.pagination.totalPages>1?<div className="p47-pagination">{result.pagination.page>1?<Link href={queryString(current,{page:result.pagination.page-1})}>السابق</Link>:<span/>}<span>{result.pagination.page} / {result.pagination.totalPages}</span>{result.pagination.page<result.pagination.totalPages?<Link href={queryString(current,{page:result.pagination.page+1})}>التالي</Link>:<span/>}</div>:null}
    </section>
  </section></main>;
}
