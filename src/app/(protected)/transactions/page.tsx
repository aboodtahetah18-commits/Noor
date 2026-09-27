import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listTransactions } from '@/features/transactions/queries/list-transactions';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { listBudgetCategories } from '@/features/budget-categories/queries/list-budget-categories';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
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
const STATUS_LABELS:Record<string,string>={PENDING:'قيد التنفيذ',POSTED:'منشورة',REVERSED:'معكوسة',FAILED:'فاشلة'};
type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]:v;
function queryString(current:Record<string,string|undefined>,patch:Record<string,string|number|undefined>){
  const params=new URLSearchParams();
  for(const [k,v] of Object.entries({...current,...patch})) if(v!==undefined&&v!=='') params.set(k,String(v));
  return '?'+params.toString();
}
function sign(type:string,direction:string|null){
  if(type==='INCOME'||type==='REFUND'||direction==='IN')return '+';
  if(type==='EXPENSE'||type==='OBLIGATION_PAYMENT'||direction==='OUT')return '−';
  return '';
}
function transactionTone(type:string){
  if(type==='INCOME'||type==='REFUND') return 'positive';
  if(type==='EXPENSE'||type==='OBLIGATION_PAYMENT') return 'expense';
  return 'neutral';
}

export default async function TransactionsPage({searchParams}:{searchParams:SearchParams}){
  const user=await requireAuthenticatedUser();
  const raw=await searchParams;
  const parsedFilters=transactionHistoryFiltersSchema.safeParse({
    page:one(raw.page)??'1',pageSize:one(raw.pageSize)??'25',dateFrom:one(raw.dateFrom),dateTo:one(raw.dateTo),
    transactionType:one(raw.transactionType)||undefined,categoryId:one(raw.categoryId)||undefined,
    accountId:one(raw.accountId)||undefined,planningStatus:one(raw.planningStatus)||undefined,
    search:one(raw.search),sort:one(raw.sort)??'DATE_DESC'
  });
  const input=parsedFilters.success?parsedFilters.data:transactionHistoryFiltersSchema.parse({});
  const [result,accounts,categories,dashboard,cycle,today,refundCandidates]=await Promise.all([
    listTransactions(user.id,input),
    listAccounts(user.id),
    listBudgetCategories(user.id,true),
    getDashboardSummary(user.id),
    getCurrentFinancialCycle(user.id),
    getUserOperationalDate(user.id),
    listTransactions(user.id,{page:1,pageSize:100,transactionType:'EXPENSE',sort:'DATE_DESC'})
  ]);
  const current=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,one(v)]));
  const activeAccounts=accounts.filter(a=>a.isActive);
  const postedCount=result.items.filter(t=>t.status==='POSTED').length;
  const expenseCount=result.items.filter(t=>t.transactionType==='EXPENSE'||t.transactionType==='OBLIGATION_PAYMENT').length;
  const incomeCount=result.items.filter(t=>t.transactionType==='INCOME'||t.transactionType==='REFUND').length;

  return <main className="v2-page v2-transactions" dir="rtl">
    <section className="v2-page-hero v2-transactions-hero">
      <div>
        <span className="v2-hero-kicker">سجل الحركة المالية</span>
        <h1>العمليات</h1>
        <p>{dashboard?dashboard.cycle.name+' · ':''}{result.pagination.totalItems} عملية مطابقة ضمن سجلك المالي.</p>
      </div>
      <div className="v2-transactions-hero-actions">
        {cycle?<ActionDialog trigger="إضافة مصروف" title="إضافة مصروف يدوي" size="lg" triggerClassName="v2-primary">
          <form action={recordExpenseAction} className="v2-form-grid">
            <input type="hidden" name="cycleId" value={cycle.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/>
            <label>المبلغ<input name="amount" inputMode="decimal" required/></label>
            <label>التاريخ<input name="transactionDate" type="date" defaultValue={today} required/></label>
            <label>البند<select name="categoryId" required><option value="">اختر البند</option>{categories.filter(c=>c.isActive!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>الحساب<select name="accountId" required><option value="">اختر الحساب</option>{activeAccounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label>طبيعة المصروف<select name="expenseNature" required><option value="NECESSARY">ضروري</option><option value="IMPORTANT">مهم</option><option value="OPTIONAL">اختياري</option><option value="ENTERTAINMENT">ترفيهي</option><option value="UNPLANNED">غير مخطط</option></select></label>
            <label>الوصف<input name="description" maxLength={500}/></label>
            <input type="hidden" name="planningStatus" value="PLANNED"/>
            <button className="v2-primary" type="submit">تسجيل المصروف</button>
          </form>
        </ActionDialog>:null}
        <CompactFilterPanel title="بحث وتصفية" hint="اضغط لإظهار خيارات السجل">
          <form method="get" className="v2-filter-grid">
            <label className="v2-filter-search">ابحث في السجل<input name="search" defaultValue={input.search} placeholder="الوصف، الحساب أو البند"/></label>
            <label>النوع<select name="transactionType" defaultValue={input.transactionType??''}><option value="">كل الأنواع</option>{Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
            <label>الحساب<select name="accountId" defaultValue={input.accountId??''}><option value="">كل الحسابات</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label>البند<select name="categoryId" defaultValue={input.categoryId??''}><option value="">كل البنود</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>من<input type="date" name="dateFrom" defaultValue={input.dateFrom}/></label>
            <label>إلى<input type="date" name="dateTo" defaultValue={input.dateTo}/></label>
            <label>الترتيب<select name="sort" defaultValue={input.sort}><option value="DATE_DESC">الأحدث</option><option value="DATE_ASC">الأقدم</option><option value="AMOUNT_DESC">الأعلى مبلغًا</option><option value="AMOUNT_ASC">الأقل مبلغًا</option></select></label>
            <div className="v2-filter-actions"><button className="v2-primary" type="submit">تطبيق</button><Link className="v2-secondary" href="/transactions">مسح</Link></div>
          </form>
        </CompactFilterPanel>
      </div>
    </section>

    <section className="v2-page-body">
      <section className="v2-transaction-summary">
        <article><span className="v2-transaction-summary-icon"><LucideIcon name="receiptText" size={24}/></span><div><span>إجمالي العمليات</span><strong>{result.pagination.totalItems}</strong><small>ضمن نتائج البحث الحالية</small></div></article>
        <article><span className="v2-transaction-summary-icon is-green"><LucideIcon name="arrowUpDown" size={24}/></span><div><span>دخل واسترداد</span><strong>{incomeCount}</strong><small>في الصفحة الحالية</small></div></article>
        <article><span className="v2-transaction-summary-icon is-gold"><LucideIcon name="chart" size={24}/></span><div><span>مصروفات وسداد</span><strong>{expenseCount}</strong><small>في الصفحة الحالية</small></div></article>
        <article><span className="v2-transaction-summary-icon"><LucideIcon name="circleCheck" size={24}/></span><div><span>منشورة</span><strong>{postedCount}</strong><small>عمليات مكتملة</small></div></article>
      </section>

      <section className="v2-transactions-toolbar">
        <div className="v2-section-title"><div><span className="v2-section-kicker">الحركة</span><h2>{result.pagination.totalItems} حركة مالية</h2><p>كل عملية تظهر كسجل واضح مع الحالة والمبلغ والحساب المرتبط.</p></div></div>
        <div className="v2-inline-actions">
          {cycle?<ActionDialog trigger="تحويل" title="تحويل بين الحسابات" size="lg">
            <form className="v2-form-grid" action={transferAction}>
              <input type="hidden" name="cycleId" value={cycle.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/>
              <label>من الحساب<select name="fromAccountId" required defaultValue=""><option value="" disabled>اختر الحساب المصدر</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
              <label>إلى الحساب<select name="toAccountId" required defaultValue=""><option value="" disabled>اختر الحساب الوجهة</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
              <label>المبلغ<input name="amount" inputMode="decimal" required/></label>
              <label>التاريخ<input name="transactionDate" type="date" defaultValue={today} required/></label>
              <label className="v2-form-full">الوصف<input name="description"/></label>
              <button className="v2-primary" type="submit">تنفيذ التحويل</button>
            </form>
          </ActionDialog>:null}
          <ActionDialog trigger="استرداد" title="تسجيل استرداد" size="lg">
            <form className="v2-form-grid" action={recordRefundAction}>
              <input type="hidden" name="idempotencyKey" value={randomUUID()}/>
              <label className="v2-form-full">المصروف الأصلي<select name="originalTransactionId" required><option value="">اختر المصروف</option>{refundCandidates.items.filter(e=>e.status==='POSTED').map(e=><option key={e.id} value={e.id}>{e.transactionDate} · {e.categoryName??e.description??'مصروف'} · {e.amount} ريال</option>)}</select></label>
              <label>المبلغ<input name="amount" inputMode="decimal" required/></label>
              <label>الحساب المستلم<select name="accountId" required><option value="">اختر الحساب</option>{activeAccounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
              <label>التاريخ<input name="transactionDate" type="date" defaultValue={today} required/></label>
              <label>الوصف<input name="description" maxLength={500}/></label>
              <button className="v2-primary" type="submit">تسجيل الاسترداد</button>
            </form>
          </ActionDialog>
        </div>
      </section>

      {result.items.length===0 ? (
        <article className="v2-empty-card">
          <span className="v2-empty-icon"><LucideIcon name="receiptText" size={32}/></span>
          <h2>لا توجد عمليات مطابقة</h2>
          <p>غيّر الفلاتر أو أضف عملية مالية جديدة.</p>
        </article>
      ) : (
        <section className="v2-transaction-list">
          {result.items.map(t=><article key={t.id} className="v2-transaction-card" data-tone={transactionTone(t.transactionType)}>
            <span className="v2-transaction-icon"><LucideIcon name={t.transactionType==='TRANSFER'?'repeat2':t.transactionType==='INCOME'||t.transactionType==='REFUND'?'arrowUpDown':'receiptText'} size={20}/></span>
            <div className="v2-transaction-copy">
              <div className="v2-transaction-title-row"><strong>{t.description||t.incomeSourceName||t.categoryName||'عملية مالية'}</strong><span className="v2-chip">{TYPE_LABELS[t.transactionType]??t.transactionType}</span></div>
              <small>{[t.accountName,t.categoryName,t.transactionDate].filter(Boolean).join(' · ')}</small>
            </div>
            <div className="v2-transaction-state"><span>{STATUS_LABELS[t.status]??t.status}</span></div>
            <div className="v2-transaction-amount">
              <strong>{sign(t.transactionType,t.transactionDirection)}{formatSar(t.amount)}</strong>
              <ActionDialog trigger="التفاصيل" title="تفاصيل الحركة" size="md">
                <div className="v2-detail-list">
                  <div><span>النوع</span><strong>{TYPE_LABELS[t.transactionType]??t.transactionType}</strong></div>
                  <div><span>المبلغ</span><strong>{formatSar(t.amount)}</strong></div>
                  <div><span>الحالة</span><strong>{STATUS_LABELS[t.status]??t.status}</strong></div>
                  <div><span>التاريخ</span><strong>{t.transactionDate}</strong></div>
                  <div><span>الحساب</span><strong>{t.accountName??'—'}</strong></div>
                  <div><span>البند</span><strong>{t.categoryName??'—'}</strong></div>
                </div>
                <div className="v2-dialog-actions"><Link className="v2-secondary" href={'/transactions/'+t.id}>الإجراءات المتقدمة</Link></div>
              </ActionDialog>
            </div>
          </article>)}
        </section>
      )}

      <nav className="v2-pagination" aria-label="صفحات العمليات">
        {result.pagination.page>1?<Link href={queryString(current,{page:result.pagination.page-1})}>السابق</Link>:<span/>}
        <span>صفحة {result.pagination.page} من {result.pagination.totalPages}</span>
        {result.pagination.page<result.pagination.totalPages?<Link href={queryString(current,{page:result.pagination.page+1})}>التالي</Link>:<span/>}
      </nav>

      <Link className="v2-next-step" href="/budget">
        <span className="v2-next-step-icon"><LucideIcon name="chart" size={24}/></span>
        <span><strong>راجع أثر العمليات على الميزانية</strong><small>السجل يثبت ما حدث فعليًا، والميزانية توضح أثره على الخطة والمتبقي.</small></span>
        <LucideIcon name="chevronLeft" size={20}/>
      </Link>
    </section>
  </main>;
}
