import { existsSync, readFileSync } from 'node:fs';
const checks=[];
function has(file,...tokens){
  if(!existsSync(file)) return false;
  const s=readFileSync(file,'utf8');
  return tokens.every(t=>s.includes(t));
}
function add(name,ok){checks.push([name,ok]);}
add('contextual learning 10%',has('src/features/cycles/queries/get-cycle-monthly-review.ts','SIGNIFICANT_VARIANCE_PERCENT=10','needsExplanation'));
add('temporary/recurring/permanent + seasons',has('src/app/(protected)/cycles/[id]/review/page.tsx','TEMPORARY','RECURRING','PERMANENT','RAMADAN','EID_FITR','WINTER'));
add('historical learning page + forecast accuracy',has('src/app/(protected)/reports/learning/page.tsx','ماذا تعلّم النظام عني؟','دقة التوقعات السابقة'));
add('internal funding 10% actual use',has('PHASE_44_INTERNAL_FUNDING_BANK_LINK_0_44_20.md','10%','actually used'));
add('internal funding schema',existsSync('database/migrations/20260903_040_internal_funding_trip_ledger.sql'));
add('goal cycle commitments',existsSync('database/migrations/20260903_041_goal_cycle_commitments.sql'));
add('salary allocation optimizer',existsSync('database/migrations/20260903_042_salary_allocation_optimizer.sql')&&existsSync('src/features/budget-optimizer/queries/get-salary-allocation-optimizer.ts'));
add('surplus routing',existsSync('database/migrations/20260903_043_surplus_routing_drafts.sql'));
add('final plan review',existsSync('database/migrations/20260903_044_cycle_plan_finalization.sql')&&existsSync('src/app/(protected)/budget/optimizer/review/page.tsx'));
add('contextual historical migration',existsSync('database/migrations/20260903_045_contextual_historical_learning.sql'));
add('daily bank operations',existsSync('src/app/(protected)/bank-operations/page.tsx'));
add('merchant aliases unlimited model',existsSync('database/migrations/20260903_046_merchant_aliases.sql')&&has('src/app/(protected)/merchants/page.tsx','أسماء نقاط البيع','alias'));
add('merchant city/branch context',has('database/migrations/20260903_049_bank_decision_audit_and_alias_context.sql','city text','branch_label text'));
add('merchant correction learning',existsSync('database/migrations/20260903_047_merchant_learning_feedback.sql'));
add('safe batch propagation',has('PHASE_45_SAFE_EXCEPTION_BATCH_RESOLUTION_0_45_6.md','exact normalized merchant','does not copy funding/trip/goal'));
add('safe known-message auto post',existsSync('database/migrations/20260903_048_safe_message_auto_post.sql')&&has('src/features/bank-statements/services/safe-message-auto-post.ts','duplicate'));
add('decision audit log',existsSync('src/app/(protected)/decision-log/page.tsx')&&existsSync('src/features/bank-decisions/services/record-bank-decision.ts'));
add('adaptive daily guidance',has('src/features/cash-forecast/services/cash-forecast-service.ts','plannedSpendToDate','spendVariance','adaptiveDailyLimit','recommendations'));
add('dashboard live safe-to-spend source',has('src/repositories/dashboard-repository.ts','calculateCashForecast','safeUntilIncome','adaptiveDailyLimit'));
add('dashboard daily command center',existsSync('src/features/dashboard/queries/get-daily-command-center.ts')&&has('src/app/(protected)/dashboard/page.tsx','ما الذي يحتاج تدخلك الآن؟'));
add('cycle closing test repaired',!has('tests/integration/cycle-closing-contract.test.ts','CYCLE_CLOSING_BLOCKERS')&&has('tests/integration/cycle-closing-contract.test.ts','BUFFER_POLICY_REQUIRED'));
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'}: ${name}`);
if(failed.length){console.error(`Conversation scope audit failed: ${failed.length}`);process.exit(1)}
console.log(`Conversation scope audit: PASS (${checks.length} checks)`);
