import './bank-operations-unified.css';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getDailyBankOperationsCenter } from '@/features/bank-operations/queries/get-daily-bank-operations-center';
import { BanksWide } from './banks-wide';
import { listAccounts } from '@/features/accounts/queries/list-accounts';
import { getGoalCycleReadiness } from '@/features/goals/queries/get-goal-cycle-readiness';
import { getEmergencySummary } from '@/features/emergency/queries/get-emergency-summary';
import { getSavingsSummary } from '@/features/savings/queries/get-savings-summary';
import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';
import { BankAlgorithmAdvisory } from './bank-algorithm-advisory';
import { getMonthlyPostedCashFlow } from '@/features/bank-governance/queries/get-monthly-posted-cash-flow';

export default async function BankOperationsPage({searchParams}:{searchParams:Promise<{error?:string;bank?:string}>}){
  const user=await requireAuthenticatedUser();
  const [center,q,accounts,goals,emergency,savings,financialSummary,cashFlowHistory]=await Promise.all([
    getDailyBankOperationsCenter(user.id),
    searchParams,
    listAccounts(user.id).catch(()=>[]),
    getGoalCycleReadiness(user.id).catch(()=>({cycle:null,items:[]})),
    getEmergencySummary(user.id).catch(()=>null),
    getSavingsSummary(user.id).catch(()=>null),
    getDashboardSummary(user.id).catch(()=>null),
    getMonthlyPostedCashFlow(user.id).catch(()=>[]),
  ]);

  const selected=(q.bank==='hilal'||q.bank==='solvency'||q.bank==='assets')?q.bank:'central';
  const activeAccounts=accounts.filter(account=>account.isActive);
  const totalLiquidity=activeAccounts.reduce((sum,account)=>sum+(Number(account.balance)||0),0);
  const goalsRemaining=goals.items.reduce((sum,goal)=>sum+(Number(goal.remainingAmount)||0),0);
  const goalsGap=goals.items.reduce((sum,goal)=>sum+Math.max(0,Number(goal.gapThisCycle)||0),0);
  const goalsApprovedThisCycle=goals.items.reduce((sum,goal)=>sum+(Number(goal.approvedThisCycle)||0),0);
  const goalsRequiredThisCycle=goals.items.reduce((sum,goal)=>sum+(Number(goal.requiredContribution)||0),0);

  const dashboardData={
    activeAccountCount:activeAccounts.length,
    totalLiquidity,
    activeGoalCount:goals.items.length,
    goalsRemaining,
    goalsGap,
    goalsApprovedThisCycle,
    goalsRequiredThisCycle,
    emergencyBalance:Number(emergency?.currentBalance??0),
    emergencyProgress:Number(emergency?.progressPercent??0),
    emergencyCoverageMonths:emergency?.coverageMonths==null?null:Number(emergency.coverageMonths),
    savingsActual:Number(savings?.actualTransferredAmount??0),
    savingsPlanned:Number(savings?.allocatedAmount??0),
    pendingImportsCount:center.pendingImportsCount,
    duplicateCandidatesCount:center.duplicateCandidatesCount,
    unclassifiedCount:center.unclassifiedCount,
    activeFundingCount:center.activeFundingCount,
    recentApproved:center.recentApproved,
  };

  return <main className="p47-page namaa-banks-unified-page" dir="rtl">
    {q.error ? <section role="alert" className="p47-panel p47-danger-panel"><strong>{q.error}</strong></section> : null}
    <BanksWide selected={selected} pendingReviewCount={center.pendingReviewCount} pendingItems={center.pendingItems} dashboardData={dashboardData}/>
    <BankAlgorithmAdvisory summary={financialSummary} history={cashFlowHistory}/>
  </main>;
}
