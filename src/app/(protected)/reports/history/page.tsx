import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getHistoricalAnalysis } from '@/features/historical-analysis/queries/get-historical-analysis';
import { formatSar } from '@/lib/format-money';

const trendLabel = { IMPROVING:'يتحسن', DECLINING:'يتراجع', STABLE:'مستقر', INSUFFICIENT_DATA:'بيانات غير كافية' } as const;
const metricLabel = { ACTUAL_INCOME:'الدخل الفعلي', ACTUAL_EXPENSE:'المصروف الفعلي', ACTUAL_SAVING:'الادخار الفعلي', SURPLUS:'الفائض', DEFICIT:'العجز', END_BALANCE:'الرصيد النهائي' } as const;

export default async function HistoryReportsPage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const user = await requireAuthenticatedUser();
  const query = await searchParams;
  const window = query.window === '6' ? 6 : 3;
  const history = await getHistoricalAnalysis(user.id, window);
  return <main className="namaa-report-subpage namaa-report-history-page" dir="rtl"><div className="namaa-report-subpage-shell">
    <header className="namaa-report-subpage-head"><div><p>التقارير</p><h1>التحليل التاريخي</h1></div><div className="namaa-report-subpage-actions"><Link href="/reports">الدورة الحالية</Link><Link className={window===3?'is-active':''} href="/reports/history?window=3">آخر 3</Link><Link className={window===6?'is-active':''} href="/reports/history?window=6">آخر 6</Link></div></header>
    {!history.hasFullWindow && <section className="namaa-report-note"><strong>البيانات المتاحة أقل من الفترة المطلوبة.</strong><span>نعرض {history.availableCount.toLocaleString('ar-SA-u-nu-latn')} دورة مغلقة فقط، ولا ننشئ متوسطًا تاريخيًا لفترة غير موجودة.</span></section>}
    {history.items.length===0 ? <section className="empty-state"><h2>لا توجد دورات مغلقة بعد</h2><p>سيبدأ التحليل التاريخي بعد وجود Snapshot لأول دورة مغلقة.</p></section> : <>
      {history.averages && <section className="namaa-report-history-kpis"><article className="namaa-report-history-card"><span>متوسط الدخل الفعلي</span><strong>{formatSar(history.averages.actualIncome)}</strong></article><article className="namaa-report-history-card"><span>متوسط المصروف الفعلي</span><strong>{formatSar(history.averages.actualExpense)}</strong></article><article className="namaa-report-history-card"><span>متوسط الادخار الفعلي</span><strong>{formatSar(history.averages.actualSaving)}</strong></article><article className="namaa-report-history-card"><span>متوسط الفائض</span><strong>{formatSar(history.averages.surplus)}</strong></article></section>}
      <section className="namaa-report-history-section"><h2>الاتجاهات</h2><div className="namaa-report-history-trends">{history.trends.map(t=><article key={t.metric}><span>{metricLabel[t.metric]}</span><strong>{trendLabel[t.direction]}</strong><small>{t.firstValue==null||t.latestValue==null?'—':<span className="rtl-number">{formatSar(t.firstValue)} ← {formatSar(t.latestValue)}</span>}</small></article>)}</div></section>
      {history.recurringSignals && <section className="namaa-report-history-section"><h2>إشارات متكررة</h2><p>فائض في {history.recurringSignals.cyclesWithSurplus.toLocaleString('ar-SA-u-nu-latn')} من {history.availableCount.toLocaleString('ar-SA-u-nu-latn')} دورة · عجز في {history.recurringSignals.cyclesWithDeficit.toLocaleString('ar-SA-u-nu-latn')} · الادخار عند/فوق الخطة في {history.recurringSignals.cyclesSavingAtOrAbovePlan.toLocaleString('ar-SA-u-nu-latn')} · المصروف عند/تحت الخطة في {history.recurringSignals.cyclesExpenseAtOrBelowPlan.toLocaleString('ar-SA-u-nu-latn')}</p></section>}
      <section className="namaa-report-history-section namaa-report-table-card"><div className="namaa-report-table-wrap"><table className="namaa-report-table"><thead><tr><th>الدورة</th><th>الدخل</th><th>المصروف</th><th>الادخار</th><th>الفائض</th><th>العجز</th><th>الرصيد النهائي</th></tr></thead><tbody>{history.items.map(item=><tr key={item.cycleId}><td data-label="الدورة"><Link href={`/reports/cycles/${item.cycleId}`}>{item.cycleName}</Link><small>{new Date(item.closedAt).toLocaleDateString('ar-SA-u-nu-latn')}</small></td><td data-label="الدخل">{formatSar(item.actualIncome)}<small>متوقع {formatSar(item.expectedIncome)}</small></td><td data-label="المصروف">{formatSar(item.actualExpense)}<small>مخطط {formatSar(item.plannedExpense)}</small></td><td data-label="الادخار">{formatSar(item.actualSaving)}<small>مخطط {formatSar(item.plannedSaving)}</small></td><td data-label="الفائض">{formatSar(item.surplus)}</td><td data-label="العجز">{formatSar(item.deficit)}</td><td data-label="الرصيد النهائي">{item.actualEndBalance==null?'—':formatSar(item.actualEndBalance)}</td></tr>)}</tbody></table></div></section>
    </>}
  </div></main>;
}
