import { getDailyBankOperationsCenter } from '@/features/bank-operations/queries/get-daily-bank-operations-center';
import { getGoalCycleReadiness } from '@/features/goals/queries/get-goal-cycle-readiness';
import { listActiveFundingCases } from '@/features/internal-funding/queries/list-active-funding-cases';
import { getCycleMonthlyReview } from '@/features/cycles/queries/get-cycle-monthly-review';
import { Money } from '@/financial-engine/money';

export type DailyCommandAction = {
  code:'BANK_REVIEW'|'CATEGORY_EXPLANATION'|'GOAL_GAP'|'FUNDING_RECOVERY';
  title:string;
  detail:string;
  href:string;
  count:number;
};

export async function getDailyCommandCenter(userId:string,cycleId:string){
  const [bank,goals,funding,review]=await Promise.all([
    getDailyBankOperationsCenter(userId),
    getGoalCycleReadiness(userId),
    listActiveFundingCases(userId),
    getCycleMonthlyReview(userId,cycleId),
  ]);
  const deviations=review?.categories.filter(c=>c.needsExplanation)??[];
  const goalGaps=goals.items.filter(g=>g.gapThisCycle!==null&&Money.parse(g.gapThisCycle).isPositive());
  const recoveries=funding.filter(f=>f.status==='RECOVERY');
  const activeTrips=funding.filter(f=>f.status==='ACTIVE'&&f.caseType==='TRIP');
  const actions:DailyCommandAction[]=[];
  if(bank.pendingReviewCount>0) actions.push({code:'BANK_REVIEW',title:'عمليات بنكية تحتاج قرارك',detail:`${bank.pendingReviewCount} عملية أو حالة لم تُحسم بعد.`,href:'/bank-operations',count:bank.pendingReviewCount});
  if(deviations.length>0) actions.push({code:'CATEGORY_EXPLANATION',title:'بنود انحرفت 10% أو أكثر',detail:`${deviations.length} بند يحتاج تفسير السبب قبل استخدامه في التعلم القادم.`,href:`/cycles/${cycleId}/review`,count:deviations.length});
  if(goalGaps.length>0) actions.push({code:'GOAL_GAP',title:'أهداف تحتاج تمويل هذه الدورة',detail:`${goalGaps.length} هدف لديه فجوة عن المساهمة المطلوبة.`,href:'/goals',count:goalGaps.length});
  if(recoveries.length>0) actions.push({code:'FUNDING_RECOVERY',title:'تمويل داخلي في مرحلة الاسترداد',detail:`${recoveries.length} تمويل ينتظر خطة استرداد معتمدة منك.`,href:'/internal-funding',count:recoveries.length});
  return {
    actions,
    bankPending:bank.pendingReviewCount,
    duplicateCandidates:bank.duplicateCandidatesCount,
    unexplainedDeviations:deviations.length,
    goalGaps:goalGaps.length,
    fundingRecoveries:recoveries.length,
    activeTrips:activeTrips.length,
  };
}
