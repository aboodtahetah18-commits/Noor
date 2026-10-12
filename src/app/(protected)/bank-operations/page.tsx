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
 return <main className="p47-page namaa-banks-unified-page namaa-approved-finance namaa-system-banks namaa-v2 namaa-v2-banks" dir="rtl">
  <p className="namaa-v2-banks__intro">الجهات الأربع لإدارة منظومة نماء المالية</p>
  {q.error?<p role="alert">{q.error}</p>:null}
  <nav className="namaa-system-bank-grid" aria-label="بنوك نماء">
   {banks.map(bank=><Link href={`/bank-operations/${bank.key}`} key={bank.key} aria-current={selected.key===bank.key?'page':undefined} className={`namaa-system-bank-tile tone-${bank.tone}`}>
    <span className="namaa-system-bank-symbol"><LucideIcon name={bank.icon} size={20}/></span>
    <strong>{bank.name}</strong><small>{bank.description}</small>
   </Link>)}
  </nav>
 </main>;
}
