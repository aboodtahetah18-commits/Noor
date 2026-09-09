import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { FocusedNextStep } from '@/components/ux/focused-next-step';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { getAlertCenter } from '@/features/alerts/queries/get-alert-center';
import { listAlertLifecycleHistory } from '@/features/alerts/queries/list-alert-lifecycle-history';
import { markAlertSeenAction,startAlertAction,snoozeAlertAction } from './actions';

const severityLabel:Record<string,string>={CRITICAL:'حرج',WARNING:'يحتاج انتباه',INFO:'متابعة'};
const statusLabel:Record<string,string>={NEW:'جديد',SEEN:'تم الاطلاع',IN_PROGRESS:'قيد المعالجة',SNOOZED:'مؤجل'};

export default async function AlertsPage(){
  const u=await requireAuthenticatedUser();
  const cycle=await getCurrentFinancialCycle(u.id).catch(()=>null);
  const [centerResult,historyResult]=await Promise.all([
    getAlertCenter(u.id,cycle?.id??null).then(value=>({value,error:false})).catch(()=>({value:{items:[],visible:[],snoozed:[],counts:{critical:0,warning:0,info:0}},error:true})),
    listAlertLifecycleHistory(u.id).then(value=>({value,error:false})).catch(()=>({value:[],error:true})),
  ]);
  const center=centerResult.value;
  const history=historyResult.value;
  const readError=centerResult.error||historyResult.error;
  return <main className="app-page p47-alerts-page" dir="rtl"><div className="page-shell p47-analysis-shell">
    <header className="p47-analysis-header"><div><p className="eyebrow">مركز الانتباه</p><h1>ما الذي يحتاج تدخلًا الآن؟</h1><p>التنبيه يبقى مرتبطًا بحالته المصدرية؛ الاطلاع عليه لا يعتبر حلًا للمشكلة.</p></div><div className="p47-header-actions"><Link className="secondary-link" href="/advisor">المستشار</Link><Link className="secondary-link" href="/dashboard">الرئيسية</Link></div></header>
    {readError?<p className="warning-banner" role="status">تعذر تحديث بعض مصادر التنبيهات الآن. الصفحة ما زالت متاحة ويمكنك إعادة المحاولة لاحقًا دون فقدان بياناتك.</p>:null}


    <section className="p47-analysis-card"><div className="p47-section-heading"><div><span>قائمة العمل</span><h2>التنبيهات الحالية</h2></div><small>{center.visible.length} حالة ظاهرة</small></div>
      {center.visible.length===0?<div className="p47-empty-state"><strong>لا توجد حالات تحتاج إجراءً الآن</strong><span>سيظهر هنا أي التزام متأخر، فجوة هدف، مراجعة بنكية أو استرداد يحتاج متابعة.</span></div>:<div className="p47-alert-feed">{center.visible.map(a=><article className={`p47-alert-item is-${a.severity.toLowerCase()}`} key={a.key}>
        <div className="p47-alert-marker" aria-hidden="true"/><div className="p47-alert-copy"><div className="p47-chip-row"><span>{severityLabel[a.severity]}</span><span>{statusLabel[a.status]}</span>{a.count>1?<span>{a.count} حالات</span>:null}</div><h3>{a.title}</h3><p>{a.detail}</p><Link href={a.href}>فتح المصدر</Link></div>
        <div className="p47-alert-actions"><form action={startAlertAction}><input type="hidden" name="alertKey" value={a.key}/><input type="hidden" name="alertKind" value={a.kind}/><input type="hidden" name="sourceId" value={a.sourceId??''}/><input type="hidden" name="href" value={a.href}/><button className="primary-button">معالجة</button></form>{a.status==='NEW'?<form action={markAlertSeenAction}><input type="hidden" name="alertKey" value={a.key}/><input type="hidden" name="alertKind" value={a.kind}/><input type="hidden" name="sourceId" value={a.sourceId??''}/><button className="secondary-button">تم الاطلاع</button></form>:null}{a.severity!=='CRITICAL'?<form action={snoozeAlertAction}><input type="hidden" name="alertKey" value={a.key}/><input type="hidden" name="alertKind" value={a.kind}/><input type="hidden" name="sourceId" value={a.sourceId??''}/><input type="hidden" name="severity" value={a.severity}/><button className="secondary-button">تأجيل 24 ساعة</button></form>:null}</div>
      </article>)}</div>}
    </section>

    {center.snoozed.length?<section className="p47-analysis-card"><div className="p47-section-heading"><div><span>مؤجل مؤقتًا</span><h2>تعود تلقائيًا لاحقًا</h2></div></div><div className="p47-compact-list">{center.snoozed.map(a=><div key={a.key}><div><strong>{a.title}</strong><span>{a.detail}</span></div><span>{statusLabel[a.status]}</span></div>)}</div></section>:null}

    <details className="p74-secondary-disclosure"><summary>سجل إجراءات التنبيهات</summary><section className="p47-analysis-card">{history.length===0?<div className="p47-empty-state"><strong>لا يوجد سجل بعد</strong><span>عند الاطلاع أو بدء المعالجة أو التأجيل يظهر الحدث هنا.</span></div>:<div className="p47-timeline">{history.map(h=><div key={h.id}><i/><div><strong>{h.alertKind}</strong><span>{h.eventType}</span></div><time>{new Date(h.createdAt).toLocaleString('ar-SA')}</time></div>)}</div>}</section>
</details>
    <FocusedNextStep href="/advisor" title="التالي: المستشار المالي" description="بعد التنبيهات، راجع التوصيات التي تحتاج قرارًا أو تفسيرًا."/>
  </div></main>;
}
