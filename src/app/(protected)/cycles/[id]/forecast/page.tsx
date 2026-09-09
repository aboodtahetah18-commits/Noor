import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getFinancialCycle } from '@/features/cycles/queries/get-cycle';
import { getCashForecast } from '@/features/cash-forecast/queries/get-cash-forecast';
import type { CashForecast } from '@/features/cash-forecast/services/cash-forecast-service';
import { formatSar } from '@/lib/format-money';
const riskLabel={HEALTHY:'مستقر',WATCH:'يحتاج انتباه',RISK:'خطر على الاحتياطي'} as const;
export default async function ForecastPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const u=await requireAuthenticatedUser(); const cycle=await getFinancialCycle(u.id,id); if(!cycle)notFound();
  const result=await getCashForecast(u.id,id);
  return <main className="foundation-page p47-closure-page" dir="rtl"><section className="foundation-card">
    <p className="eyebrow">وضعك اليوم</p><div className="title-with-help"><h1>وضعك المالي حتى الراتب</h1></div>
    {!result.success?<div className="error-banner">{result.message}</div>:<ForecastView f={result.forecast}/>} 
  </section></main>;
}
function ForecastView({f}:{f:CashForecast}){
 return <><div className="summary-grid">
  <div className="summary-card"><span>المتاح حتى الراتب</span><strong>{formatSar(f.safeUntilIncome)}</strong></div>
  <div className="summary-card"><span>الحد اليومي</span><strong>{formatSar(f.adaptiveDailyLimit)}</strong></div>
  <div className="summary-card"><span>فرق إيقاع الصرف</span><strong>{formatSar(f.spendVariance)}</strong></div>
  <div className="summary-card"><span>الأيام المتبقية</span><strong>{f.remainingDays}</strong></div>
 </div>
 <div className="foundation-card ux-section-offset"><h2>مسار الصرف المرن</h2>
  <p>ميزانية البنود المرنة: <strong>{formatSar(f.plannedVariableBudget)}</strong></p>
  <p>خط الإيقاع الحسابي حتى اليوم: <strong>{formatSar(f.plannedSpendToDate)}</strong></p>
  <p>المصروف الفعلي حتى اليوم: <strong>{formatSar(f.actualVariableSpend)}</strong></p>
  <p>نسبة الصرف إلى خط الإيقاع: <strong>{f.spendPacePercent==null?'—':`${f.spendPacePercent.toFixed(1)}%`}</strong></p>
  <p>متوسط الصرف اليومي الفعلي: <strong>{formatSar(f.averageDailyVariableSpend)}</strong></p>
 </div>
 <div className="foundation-card ux-section-offset"><h2>التوقع حتى الراتب</h2>
  <p>الصرف المتغير المتوقع المتبقي: <strong>{formatSar(f.projectedVariableSpend)}</strong></p><p>الرصيد المتوقع قبل الراتب: <strong>{formatSar(f.projectedEndBalance)}</strong></p>
  <p>الاحتياطي المحمي: <strong>{formatSar(f.requiredBuffer)}</strong></p><p>الحالة: <strong>{riskLabel[f.risk]}</strong></p>{f.protectionDeficit!=='0.00'&&<p className="error-banner">عجز حماية متوقع: {formatSar(f.protectionDeficit)}</p>}
 </div>
 <div className="foundation-card ux-section-offset"><h2>توجيه اليوم</h2>{f.recommendations.map(r=><p key={r.code}>{r.message}</p>)}</div>
 </>;
}
