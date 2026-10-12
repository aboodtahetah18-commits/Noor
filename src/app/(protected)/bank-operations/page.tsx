import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getDailyBankOperationsCenter } from '@/features/bank-operations/queries/get-daily-bank-operations-center';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
import { getMonthlyPostedCashFlow } from '@/features/bank-governance/queries/get-monthly-posted-cash-flow';
import { getGoalCycleReadiness } from '@/features/goals/queries/get-goal-cycle-readiness';
import { getEmergencySummary } from '@/features/emergency/queries/get-emergency-summary';
import { getSavingsSummary } from '@/features/savings/queries/get-savings-summary';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { BankAlgorithmAdvisory } from './bank-algorithm-advisory';

const banks=[
 {key:'central',name:'بنك نماء المركزي',description:'الحوكمة والاستقرار والرقابة',icon:'landmark' as const,tone:'central',href:'/governance'},
 {key:'hilal',name:'بنك الهلال',description:'التمويل الداخلي والالتزامات',icon:'repeat2' as const,tone:'hilal',href:'/internal-funding'},
 {key:'solvency',name:'بنك ملاءة',description:'الحماية والاحتياطي والسيولة',icon:'lockKeyhole' as const,tone:'solvency',href:'/emergency'},
 {key:'assets',name:'بنك الأصول الاستثمارية',description:'الأصول والاستثمارات والأهداف',icon:'chart' as const,tone:'assets',href:'/investments'},
] as const;

export default async function BankOperationsPage({searchParams}:{searchParams:Promise<{error?:string;bank?:string}>}){
 const user=await requireAuthenticatedUser();
 const [center,q,financialSummary,cashFlowHistory,goals,emergency,savings]=await Promise.all([
  getDailyBankOperationsCenter(user.id),
  searchParams,
  getDashboardSummary(user.id).catch(()=>null),
  getMonthlyPostedCashFlow(user.id).catch(()=>[]),
  getGoalCycleReadiness(user.id).catch(()=>({cycle:null,items:[]})),
  getEmergencySummary(user.id).catch(()=>null),
  getSavingsSummary(user.id).catch(()=>null),
 ]);
 const selected=banks.find(b=>b.key===q.bank)??banks[0];
 return <main className="p47-page namaa-banks-unified-page namaa-approved-finance namaa-system-banks" dir="rtl">
  <header className="namaa-system-banks-head"><div><h1>بنوك نماء</h1><p>الجهات الأربع لإدارة منظومة نماء المالية</p></div></header>
  {q.error?<p role="alert">{q.error}</p>:null}
  <nav className="namaa-system-bank-grid" aria-label="بنوك نماء">
   {banks.map(bank=><Link href={`/bank-operations/${bank.key}`} key={bank.key} aria-current={selected.key===bank.key?'page':undefined} className={`namaa-system-bank-tile tone-${bank.tone}`}>
    <span className="namaa-system-bank-symbol"><LucideIcon name={bank.icon} size={24}/></span>
    <strong>{bank.name}</strong><small>{bank.description}</small>
   </Link>)}
  </nav>
  <section className="namaa-system-bank-focus">
   <header><span><LucideIcon name={selected.icon} size={24}/></span><div><h2>{selected.name}</h2><p>{selected.description}</p></div></header>
   <div className="namaa-system-bank-facts">
    {selected.key==='central'?<><div><span>عمليات تحتاج مراجعة</span><strong>{center.pendingReviewCount}</strong></div><div><span>عمليات غير مصنفة</span><strong>{center.unclassifiedCount}</strong></div></>:null}
    {selected.key==='hilal'?<><div><span>التمويل الداخلي النشط</span><strong>{center.activeFundingCount}</strong></div><div><span>دفعات كشف معلقة</span><strong>{center.pendingImportsCount}</strong></div></>:null}
    {selected.key==='solvency'?<><div><span>حالة صندوق الطوارئ</span><strong>{emergency?'بيانات متاحة':'غير مكتملة'}</strong></div><div><span>الادخار</span><strong>{savings?'بيانات متاحة':'غير مكتملة'}</strong></div></>:null}
    {selected.key==='assets'?<><div><span>الأهداف المسجلة</span><strong>{goals.items.length}</strong></div><div><span>المتابعة الاستثمارية</span><strong>عبر بنك الأصول</strong></div></>:null}
   </div>
   <div className="namaa-system-bank-actions">
    <Link href={selected.href}><LucideIcon name="layoutGrid" size={20}/> عرض الوحدة</Link>
    <Link href="/conversations"><LucideIcon name="messageSquareText" size={20}/> المحادثة</Link>
    <Link href="/bank-statements"><LucideIcon name="receiptText" size={20}/> الكشوف</Link>
   </div>
  </section>
  <BankAlgorithmAdvisory summary={financialSummary} history={cashFlowHistory}/>
 </main>;
}
