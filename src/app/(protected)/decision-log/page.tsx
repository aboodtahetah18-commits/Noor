import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listBankDecisions } from '@/features/bank-decisions/queries/list-bank-decisions';
import { Money, sumMoney } from '@/financial-engine/money';
import { formatSar } from '@/lib/format-money';

const LABEL:Record<string,string>={ROW_CONFIRM:'اعتماد عملية',BATCH_MERCHANT_APPLY:'تعميم تعريف تاجر',AUTO_POST:'اعتماد تلقائي منضبط',MERCHANT_RULE_UPDATE:'تحديث قاعدة تاجر',MERCHANT_ALIAS_ADD:'إضافة اسم بديل',MERCHANT_ALIAS_TOGGLE:'تغيير حالة اسم بديل',IMPORT_APPROVE:'اعتماد دفعة بنكية'};

export default async function DecisionLogPage(){
  const user=await requireAuthenticatedUser();
  const rows=await listBankDecisions(user.id,150);
  const totalOperations=rows.reduce((s,r)=>s+Number(r.affectedCount??0),0);
  const totalAmount=sumMoney(rows.map((r)=>Money.parse(r.affectedAmount??'0.00')));
  const systemCount=rows.filter(r=>r.sourceType==='SYSTEM').length;
  const userCount=rows.length-systemCount;
  return <main className="app-page p47-decision-page" dir="rtl"><div className="page-shell p47-analysis-shell">
    <header className="p47-analysis-header"><div><p className="eyebrow">سجل القرارات</p><h1>التسلسل الزمني</h1></div><Link className="secondary-link" href="/bank-operations">العمليات البنكية</Link></header>

    <div className="p74-inline-metrics"><span>الأحداث <b>{rows.length}</b></span><span>العمليات المتأثرة <b>{totalOperations}</b></span><span>الأثر المالي <b>{formatSar(totalAmount.toString())}</b></span><span>المستخدم / النظام <b>{userCount} / {systemCount}</b></span></div>

    <section className="p47-analysis-card"><div className="p47-section-heading"><div><span>Audit Trail</span><h2>التسلسل الزمني للقرارات</h2></div><small>{rows.length} حدثًا</small></div>
      {rows.length===0?<div className="p47-empty-state"><strong>لا توجد قرارات مسجلة حتى الآن</strong><span>عند اعتماد عملية أو تحديث قاعدة تاجر سيظهر القرار هنا.</span></div>:<div className="p47-decision-feed">{rows.map(row=><article className="p47-decision-item" key={row.id}>
        <div className="p47-decision-time"><span>{new Date(row.createdAt).toLocaleDateString('ar-SA')}</span><small>{new Date(row.createdAt).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</small></div>
        <div className="p47-decision-body"><div className="p47-chip-row"><span>{row.sourceType==='SYSTEM'?'النظام':'اعتمادك'}</span><span>{LABEL[row.eventType]??row.eventType}</span></div><h3>{row.merchantName??row.rowDescription??row.importName??'قرار بنكي'}</h3><p>{row.reason?`السبب: ${row.reason}`:'لا يوجد سبب نصي إضافي مسجل.'}</p>{row.impactSummary?<details className="decision-details"><summary>عرض تفاصيل الأثر</summary><pre className="decision-json">{JSON.stringify(row.impactSummary,null,2)}</pre></details>:null}</div>
        <div className="p47-decision-impact"><strong>{Number(row.affectedCount)} عملية</strong>{row.affectedAmount!=null?<span>{formatSar(String(row.affectedAmount))}</span>:<span>بدون مبلغ مجمع</span>}</div>
      </article>)}</div>}
    </section>
  </div></main>;
}
