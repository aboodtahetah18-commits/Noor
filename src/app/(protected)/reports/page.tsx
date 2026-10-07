import Image from 'next/image';
import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { getCycleReport } from '@/features/reports/queries/get-cycle-report';
import { formatSar } from '@/lib/format-money';
import { LucideIcon } from '@/components/ui/lucide-icon';

type ReportTab='overview'|'comparison'|'risks'|'history';
const tabs:{key:ReportTab;label:string}[]=[
  {key:'overview',label:'نظرة عامة'},
  {key:'comparison',label:'المقارنات'},
  {key:'risks',label:'المخاطر والتوقعات'},
  {key:'history',label:'السجل التاريخي'},
];

function sarNumber(value:string|number){
  return formatSar(String(value)).replace(/\s*\u20C1$/u,'');
}
function Sar({value}:{value:string|number}){
  return <span className="namaa-report-sar"><Image src="/brand/saudi-riyal-symbol.png" alt="ريال سعودي" width={16} height={16} unoptimized/><span>{sarNumber(value)}</span></span>;
}

export default async function ReportsPage({searchParams}:{searchParams:Promise<{tab?:string}>}) {
  const q=await searchParams;
  const active:ReportTab=(q.tab==='comparison'||q.tab==='risks'||q.tab==='history')?q.tab:'overview';
  const user=await requireAuthenticatedUser();
  const cycle=await getCurrentFinancialCycle(user.id);

  if(!cycle){
    return <main className="namaa-reports-page" dir="rtl">
      <header className="namaa-reports-hero">
        <div><p>الرقابة المالية</p><h1>المرصد والتقارير</h1><span>الاستقرار والسيولة والمخاطر في شاشة واحدة.</span></div>
      </header>
      <section className="namaa-reports-panel">
        <div className="namaa-reports-empty">
          <LucideIcon name="target" size={24}/>
          <div><strong>لا توجد دورة تشغيلية نشطة</strong><span>ابدأ دورة مالية حتى تظهر مؤشرات التقارير والمقارنات والتوقعات.</span></div>
          <Link href="/cycles/new">بدء دورة</Link>
        </div>
      </section>
    </main>;
  }

  const report=await getCycleReport(user.id,cycle.id);
  if(!report)return null;

  const utilization=Number(report.expense.planned)>0?Math.min(999,(Number(report.expense.actual)/Number(report.expense.planned))*100):0;
  const incomeDelta=Number(report.income.actual)-Number(report.income.expected);
  const expenseDelta=Number(report.expense.actual)-Number(report.expense.planned);
  const savingDelta=Number(report.saving.actual)-Number(report.saving.planned);
  const protectedMoney=Number(report.goalContributions)+Number(report.emergencyContribution);

  return <main className="namaa-reports-page" dir="rtl">
    <header className="namaa-reports-hero">
      <div className="namaa-reports-hero-copy">
        <p>الرقابة والاستقرار المالي</p>
        <h1>المرصد والتقارير</h1>
        <span>{report.cycle.name}</span>
      </div>
      <div className="namaa-reports-hero-actions">
        <Link href="/reports/future-pressure">التوقعات المستقبلية</Link>
      </div>
    </header>

    <nav className="namaa-reports-tabs" aria-label="أقسام التقارير">
      {tabs.map(tab=><Link key={tab.key} href={'/reports?tab='+tab.key} className={active===tab.key?'is-active':''}>{tab.label}</Link>)}
    </nav>

    <section className="namaa-reports-panel">
      {active==='overview'&&<>
        <div className="namaa-reports-panel-head"><div><span>الوضع الحالي</span><h2>ملخص الدورة</h2></div><LucideIcon name="chart" size={20}/></div>
        <div className="namaa-reports-kpis">
          <article className="is-green"><div><span>الدخل الفعلي</span><small>{incomeDelta>=0?'أعلى من المتوقع':'أقل من المتوقع'}</small></div><strong><Sar value={report.income.actual}/></strong></article>
          <article className="is-red"><div><span>المصروف الفعلي</span><small>استخدام {utilization.toLocaleString('ar-SA-u-nu-latn',{maximumFractionDigits:1})}٪ من المخطط</small></div><strong><Sar value={report.expense.actual}/></strong></article>
          <article className="is-blue"><div><span>الادخار</span><small>{savingDelta>=0?'فوق الخطة':'دون الخطة'}</small></div><strong><Sar value={report.saving.actual}/></strong></article>
          <article className="is-gold"><div><span>حالة الدورة</span><small>{report.cycle.source==='LIVE'?'بيانات حية':'لقطة تاريخية'}</small></div><strong>{report.finalResult.status==='FINALIZED'?'مغلقة':'نشطة'}</strong></article>
        </div>

        <div className="namaa-reports-summary-grid">
          <article><span>انحراف المصروف</span><strong className={expenseDelta>0?'is-risk':''}><Sar value={expenseDelta}/></strong><small>{expenseDelta>0?'تجاوز المخطط':'ضمن المخطط'}</small></article>
          <article><span>الأموال المحمية</span><strong><Sar value={protectedMoney}/></strong><small>أهداف + طوارئ</small></article>
          <article><span>أكبر تجاوز</span><strong>{report.biggestOverrun?.categoryName??'لا يوجد'}</strong><small>{report.biggestOverrun?<Sar value={report.biggestOverrun.actual}/>:'الوضع مستقر'}</small></article>
          <article><span>حالة المراجعة</span><strong>{report.reviewStatus??'تشغيلية'}</strong><small>تتحدث مع كل دورة</small></article>
        </div>
      </>}

      {active==='comparison'&&<>
        <div className="namaa-reports-panel-head"><div><span>المقارنات</span><h2>قراءة الأداء</h2></div><Link href="/reports/history">فتح التاريخ الكامل</Link></div>
        <div className="namaa-reports-compare-grid">
          <article><span>الدخل</span><strong><Sar value={report.income.actual}/></strong><small>المتوقع <Sar value={report.income.expected}/></small></article>
          <article><span>المصروف</span><strong><Sar value={report.expense.actual}/></strong><small>المخطط <Sar value={report.expense.planned}/></small></article>
          <article><span>الادخار</span><strong><Sar value={report.saving.actual}/></strong><small>المخطط <Sar value={report.saving.planned}/></small></article>
        </div>
        <div className="namaa-reports-periods"><span>يومي</span><span>أسبوعي</span><span>شهري</span><span>سنوي</span></div>
      </>}

      {active==='risks'&&<>
        <div className="namaa-reports-panel-head"><div><span>المخاطر والتوقعات</span><h2>ما يحتاج الانتباه</h2></div><Link href="/reports/future-pressure">فتح الضغط المالي القادم</Link></div>
        <div className="namaa-reports-risk-list">
          {expenseDelta>0?<article className="is-warning"><div><strong>تجاوز في الإنفاق</strong><span>المصروف الحالي أعلى من المخطط.</span></div><b><Sar value={expenseDelta}/></b><Link href="/cases">فتح القرار</Link></article>:<article className="is-ok"><div><strong>الإنفاق ضمن الخطة</strong><span>لا يوجد تجاوز حالي في المصروف الإجمالي.</span></div><b>مستقر</b></article>}
          {report.biggestOverrun?<article className="is-warning"><div><strong>{report.biggestOverrun.categoryName}</strong><span>أكبر بند متجاوز يحتاج متابعة سياقية.</span></div><b><Sar value={report.biggestOverrun.actual}/></b></article>:null}
          <article><div><strong>التوقعات المستقبلية</strong><span>السيولة والضغط المالي قبل وقوع الخطر.</span></div><Link href="/reports/future-pressure">فتح التوقعات</Link></article>
        </div>
      </>}

      {active==='history'&&<>
        <div className="namaa-reports-panel-head"><div><span>السجل التاريخي</span><h2>الدورات السابقة</h2></div><Link href="/reports/history">فتح السجل</Link></div>
        <div className="namaa-reports-history-actions">
          <Link href="/reports/history"><LucideIcon name="history" size={20}/><span>الدورات السابقة</span></Link>
          <Link href="/reports/learning"><LucideIcon name="sparkles" size={20}/><span>تعلم النظام</span></Link>
          <Link href="/reports/future-pressure"><LucideIcon name="triangleAlert" size={20}/><span>الضغط المالي القادم</span></Link>
        </div>
      </>}
    </section>
  </main>;
}
