import Link from 'next/link';
import { Money } from '@/financial-engine/money';
import { formatSar } from '@/lib/format-money';
import { dynamicRebalance } from '@/features/bank-governance/smart-financial-allocation';
import type { DashboardSummary } from '@/features/dashboard/types/dashboard';

function safeHalalas(value:string):number|null {
  try {
    const minor=Money.parse(value).minorUnits;
    if(minor<0n||minor>BigInt(Number.MAX_SAFE_INTEGER))return null;
    return Number(minor);
  } catch { return null; }
}

/** Server-only, read-only proposals. Never represents income as unallocated funds. */
export function BankAlgorithmAdvisory({summary}:{summary:DashboardSummary|null}) {
  const live=summary?.cycle.source==='LIVE';
  const emergency=live?summary?.emergencySummary:null;
  const current=emergency?safeHalalas(emergency.currentBalance):null;
  const target=emergency?.targetAmount?safeHalalas(emergency.targetAmount):null;
  const reservePlan=current!==null&&current!==undefined&&target!==null&&target!==undefined
    ?dynamicRebalance({incomingSurplusHalalas:0,reserveCashHalalas:current,protectedReserveHalalas:target,reserveTargetHalalas:target,proposedInvestmentHalalas:0})
    :null;
  const reserveGap=reservePlan?Money.fromMinorUnits(BigInt(reservePlan.reserveGapRemainingHalalas)).toString():null;
  const projected=live?summary?.forecast.projectedEndBalance:null;
  const estimatedDeficit=live?summary?.forecast.expectedDeficit:null;
  return <section className="namaa-bank-algorithm-advisory" aria-labelledby="bank-algorithm-heading">
    <header><p>التحليل المالي المساعد</p><h2 id="bank-algorithm-heading">التوزيع والتوقع وإعادة الموازنة</h2><small>قراءة للبيانات الحالية فقط؛ لا تُنفذ أي حركة مالية أو استثمار تلقائيًا.</small></header>
    <div className="namaa-bank-algorithm-grid">
      <article><h3>التوزيع الذكي</h3><strong>بانتظار الفائض القابل للتوزيع</strong><p>لا يُستخدم الدخل المستلم مرة أخرى قبل التأكد من أنه غير موزع، وتحديد احتياجات التشغيل والاحتياطي الفعلية.</p><Link href="/budget">مراجعة الميزانية</Link></article>
      <article><h3>التدفقات النقدية</h3><strong>{projected!==null&&projected!==undefined?formatSar(projected):'البيانات غير مكتملة'}</strong><p>{projected!==null&&projected!==undefined?'الرصيد المتوقع لنهاية الدورة من محرك نماء المالي الحالي، وليس نتيجة خوارزمية الأشهر الثلاثة الجديدة.':'يتطلب التنبؤ الجديد سجل مصروفات شهريًا مؤكدًا ومخصصات التشغيل.'}</p>{estimatedDeficit!==null&&estimatedDeficit!==undefined?<small>العجز المتوقع: {formatSar(estimatedDeficit)}</small>:null}</article>
      <article><h3>ترميم الاحتياطي</h3><strong>{reserveGap!==null?formatSar(reserveGap):'حد الاحتياطي غير محدد'}</strong><p>{reserveGap!==null?'الفجوة بين رصيد الطوارئ الحالي وهدفه المسجل. عند ورود فائض مؤكد، تكون أولوية ترميمها قبل الاستثمار.':'حدد هدف الاحتياطي ورصيده لاحتساب فجوة الحماية دون افتراضات.'}</p><Link href="/emergency">مراجعة الطوارئ</Link></article>
    </div>
    <p className="namaa-bank-algorithm-disclaimer">أي توزيع أو سحب من الاحتياطي أو استثمار يحتاج مقترح قرار وموافقة صريحة؛ هذه اللوحة لا تعتمد القرارات أو تحفظها.</p>
  </section>;
}
