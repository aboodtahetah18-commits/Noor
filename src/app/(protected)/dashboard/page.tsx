import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
import { formatSar } from '@/lib/format-money';
import { BankMessageDialogTrigger } from '@/components/bank-message-dialog';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { BrandLogo } from '@/components/brand/brand-logo';

function pct(value:string|null){
  return value===null ? '—' : `${Number(value).toLocaleString('ar-SA-u-nu-latn',{maximumFractionDigits:0})}٪`;
}

export default async function DashboardPage(){
  const user=await requireAuthenticatedUser();
  const dashboard=await getDashboardSummary(user.id);

  if(!dashboard){
    return <main className="v2-home" dir="rtl">
      <section className="v2-home-hero">
        <div className="v2-home-brand"><BrandLogo surface="auto" priority/></div>
        <div><span>مستقبلي</span><h1>ابدأ دورتك المالية الأولى</h1><p>أنشئ دورة مالية حتى يبدأ نماء في حساب وضعك المالي الحقيقي.</p></div>
      </section>
      <section className="v2-home-empty">
        <div className="v2-home-empty-icon"><LucideIcon name="walletCards" size={32}/></div>
        <h2>لا توجد دورة مالية نشطة</h2>
        <p>ابدأ دورة مالية، ثم ستظهر هنا السيولة والدخل والمصروفات والميزانية والتوصيات.</p>
        <Link href="/cycles/new" className="v2-primary">بدء دورة مالية</Link>
      </section>
    </main>;
  }

  const budgetUse=Math.min(100,Math.max(0,Number(dashboard.budget.utilizationPercent??'0')));
  const firstGoal=dashboard.goalSummaries[0]??null;

  return <main className="v2-home" dir="rtl">
    <section className="v2-home-hero">
      <div className="v2-home-hero-tools">
        <Link href="/alerts" aria-label="التنبيهات"><LucideIcon name="bell" size={24}/></Link>
        <Link href="/settings" aria-label="الوضع والإعدادات"><LucideIcon name="moon" size={24}/></Link>
      </div>
      <div className="v2-home-identity">
        <div className="v2-home-avatar"><LucideIcon name="circleUserRound" size={32}/></div>
        <BrandLogo surface="auto" priority/>
      </div>
      <div className="v2-home-greeting">
        <h1>مرحبًا {user.name?user.name.split(' ')[0]:''} 👋</h1>
        <p>هنا نظرة سريعة على وضعك المالي اليوم</p>
      </div>
    </section>

    <section className="v2-home-body">
      <article className="v2-cycle-card">
        <div className="v2-cycle-main">
          <span className="v2-cycle-icon"><LucideIcon name="calendarDays" size={24}/></span>
          <div><span>أنت في دورتك المالية الحالية</span><strong>{dashboard.cycle.name}</strong><small>تبقى {dashboard.cycle.remainingDays} يومًا حتى الدخل القادم</small></div>
        </div>
        <div className="v2-cycle-progress">
          <b>{Math.max(0,100-Math.min(100,dashboard.cycle.remainingDays*3))}٪</b>
          <div><span style={{width:`${Math.max(8,100-Math.min(100,dashboard.cycle.remainingDays*3))}%`}}/></div>
        </div>
      </article>

      <section className="v2-home-stats">
        <article>
          <span className="v2-stat-icon"><LucideIcon name="badgeDollarSign" size={24}/></span>
          <div><span>الرصيد الحالي</span><strong>{formatSar(dashboard.liquidity.total)}</strong><Link href="/accounts">عرض التفاصيل</Link></div>
        </article>
        <article>
          <span className="v2-stat-icon"><LucideIcon name="walletCards" size={24}/></span>
          <div><span>إجمالي الدخل</span><strong>{formatSar(dashboard.income.actual)}</strong><small>المتوقع {formatSar(dashboard.income.expected)}</small></div>
        </article>
        <article>
          <span className="v2-stat-icon is-gold"><LucideIcon name="chart" size={24}/></span>
          <div><span>إجمالي المصروفات</span><strong>{formatSar(dashboard.budget.actual)}</strong><small>المخطط {formatSar(dashboard.budget.planned)}</small></div>
        </article>
      </section>

      <section className="v2-home-actions" aria-label="إجراءات سريعة">
        <Link href="/expenses"><span><LucideIcon name="plus" size={24}/></span><b>إضافة عملية</b></Link>
        <Link href="/transfers/new"><span><LucideIcon name="repeat2" size={24}/></span><b>تحويل</b></Link>
        <Link href="/obligations"><span><LucideIcon name="receiptText" size={24}/></span><b>دفع فاتورة</b></Link>
        <Link href="/goals"><span><LucideIcon name="target" size={24}/></span><b>الأهداف</b></Link>
        <Link href="/budget"><span><LucideIcon name="chart" size={24}/></span><b>الميزانية</b></Link>
        <Link href="/more"><span><LucideIcon name="layoutGrid" size={24}/></span><b>المزيد</b></Link>
      </section>

      <section className="v2-home-grid">
        <article className="v2-home-card v2-budget-card">
          <header><div><span>الميزانية الشهرية</span><strong>{formatSar(dashboard.budget.actual)} من {formatSar(dashboard.budget.planned)}</strong></div><Link href="/budget">‹</Link></header>
          <div className="v2-bar"><span style={{width:`${budgetUse}%`}}/></div>
          <footer><span>تم استخدام {pct(dashboard.budget.utilizationPercent)} من ميزانيتك</span><b>{formatSar(dashboard.budget.remaining)} متبقٍ</b></footer>
        </article>

        <article className="v2-home-card v2-categories-card">
          <header><div><span>أهم الفئات</span><strong>توزيع الإنفاق</strong></div><Link href="/transactions">‹</Link></header>
          <div className="v2-category-list">
            <div><span className="v2-cat-icon is-gold"><LucideIcon name="house" size={20}/></span><div><b>الالتزامات</b><small>الأكثر أولوية</small></div><em>{formatSar(dashboard.budget.actual)}</em></div>
            <div><span className="v2-cat-icon"><LucideIcon name="repeat2" size={20}/></span><div><b>المصروف المرن</b><small>متابعة الدورة</small></div><em>{formatSar(dashboard.budget.remaining)}</em></div>
            <div><span className="v2-cat-icon"><LucideIcon name="target" size={20}/></span><div><b>الأهداف</b><small>{firstGoal?firstGoal.name:'لا توجد أهداف بعد'}</small></div><em>{firstGoal?pct(firstGoal.progressPercent):'—'}</em></div>
          </div>
        </article>

        <article className="v2-home-card v2-advice-card">
          <header><div><span>توصية ذكية</span><strong>{dashboard.topRecommendation?.title??'وضعك المالي مستقر الآن'}</strong></div><span className="v2-advice-icon"><LucideIcon name="sparkles" size={24}/></span></header>
          <p>{dashboard.topRecommendation?.message??'لا توجد توصية مالية عاجلة في الوقت الحالي.'}</p>
          <Link href="/advisor">عرض المزيد</Link>
        </article>

        <article className="v2-home-card v2-recent-card">
          <header><div><span>الحماية والادخار</span><strong>تقدمك الحالي</strong></div><Link href="/savings">عرض الكل</Link></header>
          <div className="v2-recent-list">
            <div><span><b>الادخار</b><small>خلال الدورة الحالية</small></span><strong>{formatSar(dashboard.saving.actual)}</strong></div>
            <div><span><b>صندوق الطوارئ</b><small>الرصيد المحمي</small></span><strong>{dashboard.emergencySummary?formatSar(dashboard.emergencySummary.currentBalance):'غير معد'}</strong></div>
            <div><span><b>الهدف الأول</b><small>{firstGoal?.name??'لا يوجد هدف حالي'}</small></span><strong>{firstGoal?pct(firstGoal.progressPercent):'—'}</strong></div>
          </div>
        </article>
      </section>

      <section className="v2-safe-strip">
        <div><span>المتاح الآمن للصرف</span><strong>{dashboard.safeToSpend.amount?formatSar(dashboard.safeToSpend.amount):'بانتظار اكتمال القاعدة'}</strong></div>
        <Link href="/reports/future-pressure">عرض التوقع</Link>
      </section>
    </section>
  </main>;
}
