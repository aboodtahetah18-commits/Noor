import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getDailyBankOperationsCenter } from '@/features/bank-operations/queries/get-daily-bank-operations-center';
import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { formatSar } from '@/lib/format-money';
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

  const groupedBanks=new Map<string,{count:number;balance:number}>();
  for(const account of activeAccounts){
    const name=account.bankName?.trim() || 'حسابات دون بنك محدد';
    const existing=groupedBanks.get(name)??{count:0,balance:0};
    groupedBanks.set(name,{count:existing.count+1,balance:existing.balance+(Number(account.balance)||0)});
  }
  const bankList=Array.from(groupedBanks.entries()).sort(([a],[b])=>a.localeCompare(b,'ar'));

  return <main className="p47-page namaa-banks-unified-page namaa-approved-finance" dir="rtl">
    <header className="namaa-approved-banks-title">
      <div><h1>البنوك</h1><p>متابعة حساباتك البنكية وإدارتها من مكان واحد</p></div>
      <Link href="/accounts/new" className="p47-primary-action"><LucideIcon name="plus" size={20}/> إضافة حساب بنكي</Link>
    </header>
    {q.error?<section role="alert" className="p47-panel p47-danger-panel"><strong>{q.error}</strong></section>:null}
    <section className="namaa-approved-banks-summary">
      <div><span>إجمالي أرصدة الحسابات</span><strong>{formatSar(String(totalLiquidity))}</strong><small>{activeAccounts.length} حساب نشط</small></div>
      <LucideIcon name="landmark" size={32}/>
    </section>
    <section className="namaa-approved-banks-list" aria-label="قائمة البنوك">
      <div className="namaa-approved-banks-section-heading"><h2>قائمة البنوك</h2><span>{bankList.length} جهة</span></div>
      {bankList.length?bankList.map(([name,info])=><Link key={name} href="/accounts" className="namaa-approved-bank-row">
        <span className="namaa-approved-bank-icon"><LucideIcon name="landmark" size={24}/></span>
        <span className="namaa-approved-bank-name"><strong>{name}</strong><small>{info.count} حساب</small></span>
        <strong className="namaa-approved-bank-balance">{formatSar(String(info.balance))}</strong>
        <LucideIcon name="chevronLeft" size={20}/>
      </Link>):<div className="namaa-approved-banks-empty">لم تُضف حسابات بنكية بعد. ابدأ بإضافة حسابك الأول.</div>}
    </section>
    <section className="namaa-approved-banks-actions" aria-label="عمليات البنوك">
      <Link href="/bank-statements"><LucideIcon name="receiptText" size={20}/> الكشوف البنكية</Link>
      <Link href="/conversations"><LucideIcon name="messageSquareText" size={20}/> محادثات البنوك</Link>
      <Link href="/bank-operations/review"><LucideIcon name="listChecks" size={20}/> مراجعة العمليات</Link>
    </section>
    <section className="namaa-approved-banks-summary namaa-approved-banks-secondary">
      <div><span>عمليات تحتاج مراجعة</span><strong>{center.pendingReviewCount}</strong><small>{center.pendingImportsCount} كشف/دفعة تحتاج مراجعة</small></div>
      <LucideIcon name="listChecks" size={24}/>
    </section>
    <BankAlgorithmAdvisory summary={financialSummary} history={cashFlowHistory}/>
  </main>;
}
