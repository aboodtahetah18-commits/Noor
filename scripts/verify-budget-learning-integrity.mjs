import fs from 'node:fs';

const reviewPath='src/features/financial-plan/services/review-initial-budget-draft.ts';
const actionPath='src/app/(protected)/budget/actions.ts';
const review=fs.readFileSync(reviewPath,'utf8');
const actions=fs.readFileSync(actionPath,'utf8');
const errors=[];

const requiredReviewSnippets=[
  "t.transaction_date>=${cycleStart}::date-interval '90 days'",
  "t.transaction_date<${cycleStart}::date",
  "date_trunc('month',${cycleStart}::date)-interval '18 months'",
  "observedMonths:monthly.observedMonths",
  "averageErrorRatio:learned?.averageErrorRatio??null",
  "biasStability:learned?.biasStability??'INSUFFICIENT'",
  "seasonalityApplied:effectiveSeasonalityApplied",
  "historicalMonthlyAverage:history.actual90d/3",
];
for(const snippet of requiredReviewSnippets){
  if(!review.includes(snippet)) errors.push(`Missing review invariant: ${snippet}`);
}

const forbiddenReviewSnippets=[
  "current_date-interval '90 days'",
  "date_trunc('month',current_date)-interval '18 months'",
  "observedMonths:monthly.observedMonths,\n      historicalMonthlyAverage",
  "r.recurrence_kind",
  "r.interval_cycles",
  "availableFromFreeMargin:number",
];
for(const snippet of forbiddenReviewSnippets){
  if(review.includes(snippet)) errors.push(`Obsolete review logic remains: ${snippet}`);
}

if(!actions.includes("previousDecision.allocationType===nextAllocationType")){
  errors.push('Persistent priority learning must treat allocation-type changes as a new decision');
}
if(!actions.includes("priorityScope==='THIS_CYCLE'&&(priority||temporaryExtraAmount!==null)&&!priorityReason")){
  errors.push('Temporary extra amount must require a contextual reason');
}
if(!actions.includes("temporary_baseline_amount=planned_amount")){
  errors.push('Applied temporary funding must preserve its pre-adjustment baseline');
}

const staleOutputFields=[
  'learnedPosition:',
  'averageSignedBias:',
  'recentSignedBias:',
  'namedSeasonCoverage:',
  'availableFromFreeMargin:',
];
for(const field of staleOutputFields){
  const typeStart=review.indexOf('export type TemporaryExtraAmountSuggestion=');
  const typeEnd=review.indexOf('export type TemporaryBudgetFundingSource=');
  const typeBlock=typeStart>=0&&typeEnd>typeStart?review.slice(typeStart,typeEnd):'';
  if(typeBlock.includes(field)) errors.push(`Unused public estimate field remains: ${field}`);
}

if(errors.length){
  console.error('BUDGET-LEARNING-INTEGRITY-FAIL');
  for(const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('BUDGET-LEARNING-INTEGRITY-PASS');
