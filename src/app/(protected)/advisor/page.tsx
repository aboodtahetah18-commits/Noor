import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getAdvisorFeed } from '@/features/recommendations/queries/get-advisor-feed';
import type { RecommendationStatus, RecommendationType } from '@/domain/types';
import { viewRecommendationAction } from './actions';
import { CompactFilterPanel } from '@/components/ui/compact-filter-panel';
import { FocusedNextStep } from '@/components/ux/focused-next-step';
import { LucideIcon } from '@/components/ui/lucide-icon';

const statusLabels: Record<string,string> = { NEW:'جديدة', VIEWED:'تمت المشاهدة', ACCEPTED:'مقبولة', DISMISSED:'مرفوضة', EXPIRED:'منتهية', RESOLVED:'تمت المعالجة' };
const typeLabels: Record<string,string> = { WARNING:'تحذير', OPPORTUNITY:'فرصة', CORRECTION:'تصحيح', GOAL:'هدف', POSITIVE:'إيجابي' };
const toneClass:Record<string,string>={WARNING:'is-warning',OPPORTUNITY:'is-opportunity',CORRECTION:'is-correction',GOAL:'is-goal',POSITIVE:'is-positive'};

export default async function AdvisorPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const user = await requireAuthenticatedUser();
  const q = await searchParams;
  const page = Number(q.page ?? '1');
  const [feed,newSummary,priorityOne,priorityTwo] = await Promise.all([
    getAdvisorFeed(user.id, {
      status: q.status as RecommendationStatus | undefined,
      type: q.type as RecommendationType | undefined,
      priority: q.priority ? Number(q.priority) : undefined,
      page: Number.isFinite(page) ? page : 1,
      pageSize: 20,
    }),
    getAdvisorFeed(user.id,{status:'NEW',page:1,pageSize:1}),
    getAdvisorFeed(user.id,{priority:1,page:1,pageSize:1}),
    getAdvisorFeed(user.id,{priority:2,page:1,pageSize:1}),
  ]);
  const newCount=newSummary.total;
  const highPriority=priorityOne.total+priorityTwo.total;
  const correctionCount=feed.recommendations.filter(r=>r.recommendationType==='CORRECTION').length;
  const warningCount=feed.recommendations.filter(r=>r.recommendationType==='WARNING').length;

  return <main className="app-page p47-advisor-page" dir="rtl">
    <section className="namaa-wide-only namaa-lab-wide namaa-advisor-desktop">
      <header className="namaa-lab-hero namaa-wide-card">
        <div>
          <p>التطوير والاختبار</p>
          <h1>مختبر الخوارزميات</h1>
          <span>استفسارات الخوارزميات، الاختبارات، المقترحات، النماذج، والمراجعات قبل التفعيل.</span>
        </div>
        <div className="namaa-lab-actions">
          <Link href="/conversations" className="namaa-wide-action-secondary"><LucideIcon name="messageSquareText" size={20}/>فتح الدردشة</Link>
          <Link href="/governance" className="namaa-wide-action-secondary"><LucideIcon name="receiptText" size={20}/>المعرفة</Link>
        </div>
      </header>

      <div className="namaa-lab-layout">
        <aside className="namaa-lab-dashboard namaa-wide-panel">
          <div className="namaa-investments-section-title"><div><p>لوحة المختبر</p><h2>الحالة الحالية</h2></div><LucideIcon name="chart" size={20}/></div>
          <div className="namaa-lab-kpis">
            <article><span>استفسارات جديدة</span><strong>{newCount}</strong></article>
            <article><span>عالية الأولوية</span><strong>{highPriority}</strong></article>
            <article><span>تصحيحات</span><strong>{correctionCount}</strong></article>
            <article><span>تحذيرات</span><strong>{warningCount}</strong></article>
          </div>
          <div className="namaa-lab-version-card">
            <strong>بيئة تجريبية</strong>
            <p>أي تعديل يمر عبر نسخة تجريبية واختبارات قبل التفعيل، مع رجوع فوري للنسخة السابقة عند التراجع.</p>
            <span>بيئة اختبار · مقارنة نسخ · رجوع للإصدار السابق</span>
          </div>
        </aside>

        <section className="namaa-lab-center namaa-wide-panel">
          <div className="namaa-investments-section-title">
            <div><p>الاستفسارات والمتابعة</p><h2>ما الذي تحتاجه الخوارزميات الآن؟</h2></div>
            <LucideIcon name="sparkles" size={20}/>
          </div>

          <div className="namaa-lab-shortcuts">
            <Link href="/conversations">استفسار جديد</Link>
            <Link href="/governance">إضافة معرفة</Link>
            <Link href="/advisor?type=CORRECTION">طلب تعديل</Link>
            <Link href="/advisor?status=NEW">المقترحات الجديدة</Link>
          </div>

          {feed.recommendations.length===0
            ? <div className="namaa-lab-empty"><strong>لا توجد استفسارات أو توصيات مطابقة</strong><p>الأسئلة التي تظهر هنا يجب أن تكون مرتبطة بسبب واضح أو فجوة معرفة أو حالة فشل سابقة.</p></div>
            : <div className="namaa-lab-feed">
                {feed.recommendations.map(r=><article key={r.id} className={`namaa-lab-item ${toneClass[r.recommendationType]??''}`}>
                  <div className="namaa-lab-item-head">
                    <div><span>{typeLabels[r.recommendationType]??r.recommendationType}</span><span>{statusLabels[r.status]??r.status}</span><span>أولوية {r.priority}</span></div>
                    <time>{new Date(r.createdAt).toLocaleDateString('ar-SA-u-nu-latn')}</time>
                  </div>
                  <h3>{r.title}</h3>
                  <p>{r.message}</p>
                  <div className="namaa-lab-reason"><small>سبب طرحها</small><strong>{r.supportingSummary}</strong></div>
                  <div className="namaa-lab-item-actions">
                    {r.status==='NEW'
                      ? <form action={viewRecommendationAction}><input type="hidden" name="recommendationId" value={r.id}/><button type="submit">مراجعة</button></form>
                      : <Link href={`/advisor/${r.id}`}>عرض التفاصيل</Link>}
                    <Link href="/governance">تحويل للمعرفة</Link>
                    <Link href="/conversations">مناقشة</Link>
                  </div>
                </article>)}
              </div>}
        </section>

        <aside className="namaa-lab-side namaa-wide-panel">
          <div className="namaa-investments-section-title"><div><p>طلبات التطوير</p><h2>إضافة وتعديل واختبار</h2></div><LucideIcon name="plus" size={20}/></div>
          <article><strong>إضافة نموذج جديد</strong><p>إنشاء نسخة تجريبية مستقلة قبل اعتمادها.</p><Link href="/conversations">بدء الطلب</Link></article>
          <article><strong>تعديل خوارزمية</strong><p>يسجل السبب ويقارن النتائج قبل وبعد.</p><Link href="/advisor?type=CORRECTION">فتح التصحيحات</Link></article>
          <article><strong>إنشاء اختبار</strong><p>تحويل الخطأ أو الحالة السابقة إلى سيناريو اختبار دائم.</p><Link href="/governance">ربط بالمعرفة</Link></article>
          <article><strong>اقتراح من الخوارزمية</strong><p>لا يظهر إلا إذا كان له سبب موثق وفجوة واضحة.</p><Link href="/advisor?status=NEW">عرض المقترحات</Link></article>
        </aside>
      </div>
    </section>

    <div className="namaa-mobile-only page-shell p47-analysis-shell">
      <header className="p47-analysis-header">
        <div><p className="eyebrow">المستشار المالي</p><div className="title-with-help"><h1>مركز التوصيات والقرار</h1></div><p>رتّب ما يستحق قرارك الآن، وافهم السبب قبل فتح التفاصيل أو تنفيذ أي إجراء.</p></div>
        <div className="p47-header-actions"><Link className="secondary-link" href="/alerts">التنبيهات</Link><Link className="secondary-link" href="/reports/future-pressure">الضغط القادم</Link><CompactFilterPanel title="تصفية التوصيات" hint="الحالة والنوع والأولوية" className="p47-filter-card p4913-advisor-filter">
          <form className="p47-filter-grid" method="get">
            <label>الحالة<select name="status" defaultValue={q.status ?? ''}><option value="">الكل</option>{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
            <label>النوع<select name="type" defaultValue={q.type ?? ''}><option value="">الكل</option>{Object.entries(typeLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
            <label>الأولوية<input name="priority" inputMode="numeric" defaultValue={q.priority ?? ''} placeholder="مثال: 1" /></label>
            <div className="p47-filter-actions"><button className="primary-button" type="submit">تطبيق</button><Link className="secondary-link" href="/advisor">مسح</Link></div>
          </form>
        </CompactFilterPanel></div>
      </header>

      <section className={`p74-focus-summary ${highPriority>0?'is-warning':''}`}><div><span>المهمة الوحيدة هنا</span><strong>{highPriority>0?`${highPriority} توصية عالية الأولوية`:`${newCount} توصية جديدة`}</strong><small>افتح توصية واحدة، افهم السبب، ثم قرر.</small></div></section>
      {q.dismissed==='1'?<section className="p47-analysis-note is-neutral"><strong>تم تجاهل التوصية.</strong><span>بقي القرار محفوظًا في سجل التوصيات.</span></section>:null}
      <section className="p47-analysis-card"><div className="p47-section-heading"><div><span>قائمة القرار</span><h2>التوصيات الحالية</h2></div><small>{feed.total} نتيجة مطابقة</small></div>
        {feed.recommendations.length===0?<div className="p47-empty-state"><strong>لا توجد توصيات مطابقة</strong><span>عندما يكتشف محرك القواعد سببًا ماليًا واضحًا ستظهر التوصية هنا.</span></div>:<div className="p47-advisor-feed">{feed.recommendations.map(r=><article className={`p47-advisor-item ${toneClass[r.recommendationType]??''}`} key={r.id}><div className="p47-advisor-item-head"><div className="p47-chip-row"><span>{typeLabels[r.recommendationType]??r.recommendationType}</span><span>{statusLabels[r.status]??r.status}</span><span>أولوية {r.priority}</span></div><time>{new Date(r.createdAt).toLocaleDateString('ar-SA-u-nu-latn')}</time></div><div className="p47-advisor-item-body"><div><h3>{r.title}</h3><p>{r.message}</p></div><div className="p47-advisor-reason"><span>لماذا ظهرت؟</span><strong>{r.supportingSummary}</strong><small>{r.reasonCode}</small></div></div><div className="p47-advisor-item-foot">{r.status==='NEW'?<form action={viewRecommendationAction}><input type="hidden" name="recommendationId" value={r.id}/><button className="primary-button" type="submit">فتح التوصية</button></form>:<Link className="secondary-link" href={`/advisor/${r.id}`}>عرض التفاصيل</Link>}</div></article>)}</div>}
      </section>
      <nav className="p47-pagination" aria-label="صفحات التوصيات"><span>صفحة {feed.page} من {feed.totalPages} · {feed.total} توصية</span><div>{feed.page>1?<Link className="secondary-link" href={`/advisor?page=${feed.page-1}`}>السابق</Link>:null}{feed.page<feed.totalPages?<Link className="secondary-link" href={`/advisor?page=${feed.page+1}`}>التالي</Link>:null}</div></nav>
      <FocusedNextStep href="/reports" title="التالي: التقارير" description="بعد معالجة القرارات الحالية، انتقل للتقارير عندما تحتاج نظرة تحليلية أوسع."/>
    </div>
  </main>;
}
