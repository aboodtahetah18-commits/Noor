import { getRawSql } from '@/infrastructure/db/client';
import {
  readActiveFinancialLearningFactors,
  readFinancialLearningLifecycle,
  saveFinancialLearningLifecycleStore,
  type FinancialLearningLifecycleItem,
} from '@/lib/finance/financial-learning-lifecycle';
import {
  evaluateFinancialLearningPostActivation,
  type FinancialLearningPostActivationKind,
  type FinancialLearningPostActivationRow,
} from '@/lib/finance/financial-learning-post-activation';

type ClosedCycleRow=FinancialLearningPostActivationRow&{startDate:string};

function supportedKind(kind:FinancialLearningLifecycleItem['kind']):kind is FinancialLearningPostActivationKind{
  return kind==='EXPENSE_BASELINE'||kind==='SAVING_EXPECTATION'||kind==='INCOME_REALIZATION';
}

function factorForItem(
  item:FinancialLearningLifecycleItem,
  factors:Awaited<ReturnType<typeof readActiveFinancialLearningFactors>>,
){
  if(item.parameterKey==='forecast.expenseBaselineFactor')return factors.factors.expenseBaselineFactor;
  if(item.parameterKey==='forecast.savingExpectationFactor')return factors.factors.savingExpectationFactor;
  if(item.parameterKey==='forecast.incomeRealizationFactor')return factors.factors.incomeRealizationFactor;
  return null;
}

async function readRecentClosedCycles(userId:string):Promise<ClosedCycleRow[]>{
  const sql=getRawSql();
  const rows=await sql`
    select
      cs.cycle_id::text,
      fc.start_date::text,
      cs.expected_income::text,
      cs.actual_income::text,
      cs.planned_expense::text,
      cs.actual_expense::text,
      cs.planned_saving::text,
      cs.actual_saving::text
    from public.cycle_snapshots cs
    join public.financial_cycles fc
      on fc.id=cs.cycle_id and fc.user_id=cs.user_id
    where cs.user_id=${userId}::uuid
      and fc.status='CLOSED'
    order by fc.start_date desc,fc.created_at desc
    limit 12
  `;
  const numberValue=(value:unknown)=>{
    const n=Number(value);
    return Number.isFinite(n)?n:0;
  };
  return rows.map(row=>({
    cycleId:String(row.cycle_id),
    startDate:String(row.start_date),
    expectedIncome:numberValue(row.expected_income),
    actualIncome:numberValue(row.actual_income),
    plannedExpense:numberValue(row.planned_expense),
    actualExpense:numberValue(row.actual_expense),
    plannedSaving:numberValue(row.planned_saving),
    actualSaving:numberValue(row.actual_saving),
  }));
}

export async function monitorActiveFinancialLearning(userId:string){
  const [store,factors,rows]=await Promise.all([
    readFinancialLearningLifecycle(userId),
    readActiveFinancialLearningFactors(userId),
    readRecentClosedCycles(userId),
  ]);
  const now=new Date().toISOString();
  let changed=false;

  for(const item of Object.values(store.items)){
    if(item.status!=='ACTIVE'||!supportedKind(item.kind)||!item.activatedAt)continue;
    const activeFactor=factorForItem(item,factors);
    if(activeFactor===null)continue;
    const activationDate=item.activatedAt.slice(0,10);
    const postRows=rows.filter(row=>row.startDate>=activationDate);
    const evaluation=evaluateFinancialLearningPostActivation({
      rows:postRows,
      kind:item.kind,
      activeFactor,
      minimumSampleSize:2,
      rollbackReviewThresholdPercent:10,
    });
    const previousState=item.monitoring?.state??null;
    item.monitoring={
      ...evaluation,
      evaluatedAt:now,
    };
    if(previousState!==evaluation.state){
      item.history.push({
        at:now,
        action:'SYNC',
        actorRole:'financial-learning-monitor',
        note:evaluation.reason,
        from:item.status,
        to:item.status,
      });
    }
    changed=true;
  }

  if(changed)await saveFinancialLearningLifecycleStore(userId,store);
  const activeItems=Object.values(store.items).filter(item=>item.status==='ACTIVE');
  const rollbackReviewRequired=activeItems.filter(item=>item.monitoring?.state==='ROLLBACK_REVIEW_REQUIRED');

  return {
    store,
    activeFactors:factors,
    activeItems,
    rollbackReviewRequired,
    hasRollbackReviewRequired:rollbackReviewRequired.length>0,
  };
}
