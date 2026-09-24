import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listBankDecisions } from '@/features/bank-decisions/queries/list-bank-decisions';
import { Money, sumMoney } from '@/financial-engine/money';
import { formatSar } from '@/lib/format-money';
import { PageHeader } from '@/components/ui';

const LABEL:Record<string,string>={ROW_CONFIRM:'اعتماد عملية',BATCH_MERCHANT_APPLY:'تعميم تعريف تاجر',AUTO_POST:'اعتماد تلقائي منضبط',MERCHANT_RULE_UPDATE:'تحديث قاعدة تاجر',MERCHANT_ALIAS_ADD:'إضافة اسم بديل',MERCHANT_ALIAS_TOGGLE:'تغيير حالة اسم بديل',IMPORT_APPROVE:'اعتماد دفعة بنكية'};
const IMPACT_KEY_LABELS:Record<string,string>={
  count:'العدد',amount:'المبلغ',status:'الحالة',before:'قبل',after:'بعد',merchant:'التاجر',
  category:'التصنيف',description:'الوصف',reason:'السبب',source:'المصدر',target:'الهدف',
  affectedCount:'العمليات المتأثرة',affectedAmount:'الأثر المالي',rows:'الصفوف',rule:'القاعدة',
};
function impactLabel(key:string):string {
  return IMPACT_KEY_LABELS[key]??'بيان';
}
function impactValue(value:unknown):string {
  if(value==null)return 'غير محدد';
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value);
  if(Array.isArray(value))return value.map(impactValue).join('، ');
  return 'تفاصيل مركبة محفوظة في السجل';
}
function ImpactSummary({value}:{value:unknown}){
  if(!value||typeof value!=='object'||Array.isArray(value)) return <p>{impactValue(value)}</p>;
  return <dl className="namaa-decision-impact-details">
    {Object.entries(value as Record<string,unknown>).map(([key,item])=><div key={key}><dt>{impactLabel(key)}</dt><dd>{impactValue(item)}</dd></div>)}
  </dl>;
}

export default async function DecisionLogPage(){
  const user=await requireAuthenticatedUser();
  const rows=await listBankDecisions(user.id,150);
  const totalOperations=rows.reduce((s,r)=>s+Number(r.affectedCount??0),0);
  const totalAmount=sumMoney(rows.map((r)=>Money.parse(r.affectedAmount??'0.00')));
  const systemCount=rows.filter(r=>r.sourceType==='SYSTEM').length;
  const userCount=rows.length-systemCount;
  return <main className="app-page p47-decision-page namaa-decision-log" dir="rtl"><div className="page-shell p47-analysis-shell namaa-migrated-shell namaa-page-stack">
    <PageHeader
      className="p47-analysis-header namaa-migrated-header"
      eyebrow="سجل القرارات"
      title="التسلسل الزمني"
      description="سجل موثق للقرارات والآثار المرتبطة بالعمليات البنكية."
      actions={<Link className="ux-button ux-button--secondary" href="/bank-operations">العمليات البنكية</Link>}
    />

    <div className="p74-inline-metrics namaa-decision-metrics"><span>الأحداث <b>{rows.length}</b></span><span>العمليات المتأثرة <b>{totalOperations}</b></span><span>الأثر المالي <b>{formatSar(totalAmount.toString())}</b></span><span>المستخدم / النظام <b>{userCount} / {systemCount}</b></span></div>

    <section className="p47-analysis-card namaa-decision-card"><div className="p47-section-heading"><div><span>سجل التدقيق</span><h2>التسلسل الزمني للقرارات</h2></div><small>{rows.length} حدثًا</small></div>
      {rows.length===0?<div className="p47-empty-state"><strong>لا توجد قرارات مسجلة حتى الآن</strong><span>عند اعتماد عملية أو تحديث قاعدة تاجر سيظهر القرار هنا.</span></div>:<div className="p47-decision-feed namaa-decision-feed">{rows.map(row=><article className="p47-decision-item namaa-decision-item" key={row.id}>
        <div className="p47-decision-time"><span>{new Date(row.createdAt).toLocaleDateString('ar-SA')}</span><small>{new Date(row.createdAt).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</small></div>
        <div className="p47-decision-body"><div className="p47-chip-row"><span>{row.sourceType==='SYSTEM'?'النظام':'اعتمادك'}</span><span>{LABEL[row.eventType]??row.eventType}</span></div><h3>{row.merchantName??row.rowDescription??row.importName??'قرار بنكي'}</h3><p>{row.reason?`السبب: ${row.reason}`:'لا يوجد سبب نصي إضافي مسجل.'}</p>{row.impactSummary?<details className="decision-details namaa-decision-details"><summary>عرض تفاصيل الأثر</summary><ImpactSummary value={row.impactSummary}/></details>:null}</div>
        <div className="p47-decision-impact"><strong>{Number(row.affectedCount)} عملية</strong>{row.affectedAmount!=null?<span>{formatSar(String(row.affectedAmount))}</span>:<span>بدون مبلغ مجمع</span>}</div>
      </article>)}</div>}
    </section>
  </div></main>;
}
