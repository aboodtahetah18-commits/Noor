import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';
import { recommendationRepository } from '@/repositories/recommendation-repository';
import type { RecommendationCandidate, RecommendationRuleRunResult } from '@/features/recommendations/types/recommendation';
import { calculateCashForecast } from '@/features/cash-forecast/services/cash-forecast-service';

export async function runRecommendationRules(userId: string, cycleId: string): Promise<RecommendationRuleRunResult> {
  const cycleRows = await rawSql`select id,status from public.financial_cycles where id=${cycleId}::uuid and user_id=${userId} limit 1`;
  const cycle = cycleRows[0] as Record<string,unknown> | undefined;
  if (!cycle) throw new Error('CYCLE_NOT_FOUND');
  if (!['ACTIVE','CLOSING'].includes(String(cycle.status))) throw new Error('RECOMMENDATION_ENGINE_REQUIRES_OPERATIONAL_CYCLE');

  const [obligations, goals, surplus, categories] = await Promise.all([
    rawSql`select oo.id,ot.name,oo.amount::text,oo.due_date::text,oo.status from public.obligation_occurrences oo join public.obligation_templates ot on ot.id=oo.template_id and ot.user_id=oo.user_id where oo.user_id=${userId} and (oo.cycle_id=${cycleId}::uuid or oo.cycle_id is null) and oo.status in ('OVERDUE','UPCOMING')`,
    rawSql`select id,name,target_amount::text,target_date::text from public.financial_goals where user_id=${userId} and status='FINANCIALLY_UNREALISTIC'`,
    rawSql`select coalesce((select sum(t.amount) from public.transactions t where t.user_id=${userId} and t.cycle_id=${cycleId}::uuid and t.transaction_type='INCOME' and t.status='POSTED'),0)::text actual,
      coalesce((select sum(e.expected_amount) from public.expected_incomes e where e.user_id=${userId} and e.cycle_id=${cycleId}::uuid),0)::text expected`,
    rawSql`with cp as (select current_version_id from public.financial_plans where user_id=${userId} and cycle_id=${cycleId}::uuid and status in ('ACTIVE_PLAN','REVISED') limit 1), actual as (
      select t.category_id, greatest(coalesce(sum(case when t.transaction_type='EXPENSE' then t.amount else 0 end),0)-coalesce(sum(case when t.transaction_type='REFUND' then t.amount else 0 end),0),0) amount
      from public.transactions t where t.user_id=${userId} and t.cycle_id=${cycleId}::uuid and t.status='POSTED' and t.transaction_type in ('EXPENSE','REFUND') group by t.category_id)
      select ba.category_id,bc.name,ba.planned_amount::text,coalesce(a.amount,0)::text actual_amount from public.budget_allocations ba join cp on cp.current_version_id=ba.plan_version_id join public.budget_categories bc on bc.id=ba.category_id left join actual a on a.category_id=ba.category_id where ba.user_id=${userId} and coalesce(a.amount,0)>ba.planned_amount`,
  ]);

  const candidates: RecommendationCandidate[] = [];
  for (const raw of obligations) { const r=raw as Record<string,unknown>; const overdue=String(r.status)==='OVERDUE'; candidates.push({cycleId,type:'WARNING',priority:1,title:overdue?'التزام متأخر':'التزام قادم',message:overdue?`الالتزام «${String(r.name)}» متأخر ويحتاج إلى معالجة.`:`الالتزام «${String(r.name)}» قادم ويجب إبقاء مبلغه محجوزًا.`,reasonCode:overdue?'OBLIGATION_OVERDUE':'OBLIGATION_UPCOMING',reasonData:{amount:String(r.amount),dueDate:String(r.due_date)},deduplicationKey:`${String(r.status)}:${String(r.id)}`,relatedObligationOccurrenceId:String(r.id)}); }
  for (const raw of goals) { const r=raw as Record<string,unknown>; candidates.push({cycleId,type:'GOAL',priority:1,title:'هدف يحتاج إلى مراجعة',message:`الهدف «${String(r.name)}» مصنف حاليًا كغير واقعي ماليًا وفق القدرة المعروفة.`,reasonCode:'GOAL_UNREALISTIC',reasonData:{targetAmount:String(r.target_amount),targetDate:r.target_date?String(r.target_date):null},deduplicationKey:`GOAL_UNREALISTIC:${String(r.id)}`,relatedGoalId:String(r.id)}); }
  const s = surplus[0] as Record<string, unknown> | undefined;
  if (s) {
    const actualIncome = Money.parse(String(s.actual ?? '0.00'));
    const expectedIncome = Money.parse(String(s.expected ?? '0.00'));
    if (expectedIncome.isPositive() && actualIncome.compare(expectedIncome) > 0) {
      const amount = actualIncome.subtract(expectedIncome).toString();
      candidates.push({cycleId,type:'OPPORTUNITY',priority:1,title:'فائض دخل متاح للمراجعة',message:'الدخل الفعلي أعلى من الدخل المتوقع. الفائض لم يُضف تلقائيًا إلى المصروف المرن.',reasonCode:'SURPLUS_AVAILABLE',reasonData:{expected:expectedIncome.toString(),actual:actualIncome.toString(),surplus:amount},deduplicationKey:`SURPLUS_AVAILABLE:${cycleId}`});
    }
  }
  for (const raw of categories) { const r=raw as Record<string,unknown>; candidates.push({cycleId,type:'WARNING',priority:1,title:'تجاوز في بند الميزانية',message:`البند «${String(r.name)}» تجاوز المبلغ المخطط.`,reasonCode:'OVER_BUDGET',reasonData:{planned:String(r.planned_amount),actual:String(r.actual_amount)},deduplicationKey:`OVER_BUDGET:${String(r.category_id)}`,relatedCategoryId:String(r.category_id)}); }

  const forecast = await calculateCashForecast(userId, cycleId);
  const blockedRules: RecommendationRuleRunResult['blockedRules'] = [];
  if (forecast.success) {
    const deficit = Money.parse(forecast.forecast.protectionDeficit);
    if (deficit.isPositive()) candidates.push({cycleId,type:'WARNING',priority:1,title:'خطر عجز متوقع',message:`التوقع الحالي يظهر فجوة حماية قدرها ${deficit.toString()} ريال قبل الدخل القادم.`,reasonCode:'DEFICIT_RISK',reasonData:{projectedEndBalance:forecast.forecast.projectedEndBalance,expectedDeficit:deficit.toString(),engineVersion:forecast.forecast.engineVersion},deduplicationKey:`DEFICIT_RISK:${cycleId}`});
    const safe = Money.parse(forecast.forecast.safeUntilIncome);
    if (safe.isZero()) candidates.push({cycleId,type:'WARNING',priority:1,title:'المتاح الآمن للصرف وصل إلى صفر',message:'لا يوجد حاليًا مبلغ آمن للصرف بعد حماية الالتزامات والتخصيصات والاحتياطي المعتمد.',reasonCode:'SAFE_TO_SPEND_ZERO',reasonData:{requiredBuffer:forecast.forecast.requiredBuffer,engineVersion:forecast.forecast.engineVersion},deduplicationKey:`SAFE_TO_SPEND_ZERO:${cycleId}`});
  } else {
    blockedRules.push({ reasonCode: 'DEFICIT_RISK', issue: forecast.code }, { reasonCode: 'SAFE_TO_SPEND_ZERO', issue: forecast.code });
  }
  const activeKeys = candidates.map((c)=>c.deduplicationKey);
  const created = await recommendationRepository.insertManyIfAbsent(userId, candidates);
  const resolved=await recommendationRepository.resolveInactiveOpen(userId,cycleId,activeKeys);
  return {created,resolved,activeReasonCodes:[...new Set(candidates.map(c=>c.reasonCode))],blockedRules};
}
