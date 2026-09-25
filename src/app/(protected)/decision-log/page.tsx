import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listUnifiedDecisionLog } from '@/features/decision-log/queries/list-unified-decision-log';

function datePart(value:string){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString('ar-SA');
}

function timePart(value:string){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'':date.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'});
}

function sourceLabel(value:string){
  if(value==='BANK_OPERATION')return 'قرار بنكي';
  if(value==='COMMITTEE')return 'قرار لجنة';
  if(value==='LEARNING')return 'قرار تعلم';
  return 'قرار خوارزمي';
}

function outcomeLabel(value:string|null|undefined){
  if(value==='ACHIEVED')return 'تحقق الأثر';
  if(value==='PARTIAL')return 'تحقق جزئي';
  if(value==='MISSED')return 'لم يتحقق الأثر';
  if(value==='STABLE')return 'أثر مستقر';
  if(value==='REVERSED')return 'تم التراجع';
  if(value==='NOT_APPLIED')return 'لم يطبق';
  if(value==='SUPERSEDED')return 'استبدل بقرار لاحق';
  if(value==='EXECUTED')return 'تم التنفيذ';
  return 'بانتظار النتيجة';
}

function qualityLabel(value:string|null|undefined){
  if(value==='POSITIVE')return 'نتيجة إيجابية';
  if(value==='MIXED')return 'نتيجة مختلطة';
  if(value==='NEGATIVE')return 'نتيجة سلبية';
  return 'غير محسومة';
}

export default async function DecisionLogPage(){
  const user=await requireAuthenticatedUser();
  const rows=await listUnifiedDecisionLog(user.id,200);
  const systemCount=rows.filter(row=>row.actor.type!=='USER').length;
  const userCount=rows.length-systemCount;
  const explainedCount=rows.filter(row=>row.rule.code||row.memory.summary||row.learning.algorithmName).length;
  const learningCount=rows.filter(row=>row.learning.algorithmName).length;
  const outcomeAssessed=rows.filter(row=>row.outcome&&row.outcome.effect!=='PENDING_EVIDENCE').length;
  const reviewRequired=rows.filter(row=>row.outcome?.requiresReview===true).length;

  return <main className="app-page p47-decision-page" dir="rtl"><div className="page-shell p47-analysis-shell">
    <header className="p47-analysis-header">
      <div><p className="eyebrow">سجل القرارات الموحد</p><h1>لماذا اتخذ نماء هذا القرار؟</h1><p className="muted">كل قرار مهم في نماء يجمع الرقم الحالي، القاعدة، الذاكرة السابقة، التعلم، درجة الثقة، والجهة التي اتخذته.</p></div>
      <Link className="secondary-link" href="/reports/learning">سجل تعلم الخوارزميات</Link>
    </header>

    <div className="p74-inline-metrics">
      <span>الأحداث <b>{rows.length}</b></span>
      <span>المستخدم / النظام <b>{userCount} / {systemCount}</b></span>
      <span>قرارات مفسرة <b>{explainedCount}</b></span>
      <span>مرتبطة بالتعلم <b>{learningCount}</b></span>
      <span>نتائج مقيمة <b>{outcomeAssessed}</b></span>
      <span>تحتاج مراجعة <b>{reviewRequired}</b></span>
    </div>

    <section className="p47-analysis-card">
      <div className="p47-section-heading"><div><span>Decision Audit Trail</span><h2>التسلسل الزمني الموحد</h2></div><small>{rows.length} حدثًا</small></div>
      {rows.length===0
        ?<div className="p47-empty-state"><strong>لا توجد قرارات مسجلة حتى الآن</strong><span>عند اعتماد قرار بنكي أو توصية أو قرار لجنة أو معايرة تعلم سيظهر هنا.</span></div>
        :<div className="p47-decision-feed">{rows.map(row=><article className="p47-decision-item" key={row.id}>
          <div className="p47-decision-time"><span>{datePart(row.createdAt)}</span><small>{timePart(row.createdAt)}</small></div>

          <div className="p47-decision-body">
            <div className="p47-chip-row">
              <span>{sourceLabel(row.source)}</span>
              <span>{row.actor.name}</span>
              {row.decision.status?<span>{row.decision.status}</span>:null}
            </div>
            <h3>{row.decision.title}</h3>
            <p><strong>الإجراء:</strong> {row.decision.action}</p>
            <p><strong>لماذا:</strong> {row.why??'لا يوجد سبب نصي إضافي مسجل.'}</p>
            <p><strong>النتيجة اللاحقة:</strong> {outcomeLabel(row.outcome?.effect)} · {qualityLabel(row.outcome?.quality)}</p>
            {row.outcome?.summary?<p>{row.outcome.summary}</p>:null}
            {row.outcome?.requiresReview?<p><strong>تنبيه:</strong> هذه النتيجة تحتاج مراجعة قرار أو تراجع.</p>:null}

            <details className="decision-details">
              <summary>عرض تفسير القرار</summary>
              <div className="dashboard-list">
                <div><strong>الرقم الحالي</strong><p>{row.current.label??'غير محدد'}: {row.current.value??'غير متاح'}</p>{row.current.secondary.map((item,index)=><small key={row.id+'-current-'+index}>{item}</small>)}</div>
                <div><strong>القاعدة المستخدمة</strong><p>{row.rule.title??'لا توجد قاعدة تفسيرية موثقة لهذا القرار القديم.'}</p>{row.rule.code?<small>{row.rule.code}</small>:null}</div>
                <div><strong>الذاكرة السابقة</strong><p>{row.memory.summary??'لا توجد ذاكرة سابقة مسجلة لهذا القرار.'}</p>{row.memory.at?<small>{new Date(row.memory.at).toLocaleString('ar-SA')}</small>:null}</div>
                <div><strong>التعلم</strong><p>{row.learning.algorithmName??'لا يوجد تعلم خوارزمي مرتبط بهذا القرار.'}</p>{row.learning.algorithmName?<small>{row.learning.outcome??'—'} · {row.learning.decisionUse??'—'} · الثقة {row.learning.confidence??'—'}%</small>:null}</div>
                <div><strong>نتيجة القرار</strong><p>{row.outcome?.summary??'بانتظار دليل لاحق يسمح بتقييم الأثر.'}</p>{row.outcome?.assessedAt?<small>{new Date(row.outcome.assessedAt).toLocaleString('ar-SA')} · {outcomeLabel(row.outcome.effect)} · {qualityLabel(row.outcome.quality)}</small>:null}</div>
              </div>
            </details>
          </div>

          <div className="p47-decision-impact">
            <strong>{row.confidence===null?'بدون درجة ثقة':row.confidence.toFixed(0)+'٪ ثقة'}</strong>
            <span>{row.externalExecution?'تنفيذ خارجي مسجل':'قرار/تحليل داخلي'}</span>
          </div>
        </article>)}</div>}
    </section>
  </div></main>;
}
