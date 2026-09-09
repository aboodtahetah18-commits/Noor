import fs from 'node:fs';
const checks=[
 ['migration 060','database/migrations/20260904_060_recovery_cycle_reservations.sql','due_cycle_id'],
 ['cycle reservation query','src/features/internal-funding/queries/get-cycle-recovery-reservations.ts','next_installment'],
 ['priority before goals','src/features/budget-optimizer/queries/get-salary-allocation-optimizer.ts',"if(kind==='EMERGENCY_RECOVERY') return 20"],
 ['optimizer principal','src/features/budget-optimizer/queries/get-salary-allocation-optimizer.ts','recoveryPrincipal'],
 ['UI reservation','src/app/(protected)/budget/optimizer/page.tsx','استرداد التمويل الداخلي المحجوز لهذه الدورة'],
 ['snapshot recovery','src/features/plan-finalization/commands/finalize-optimized-cycle-plan.ts','recovery:{total:review.recoveryDemand'],
];
for(const [n,f,x] of checks){if(!fs.readFileSync(f,'utf8').includes(x)){console.error('FAIL',n);process.exit(1)}console.log('PASS',n)}
console.log('P46.26/P46.27 structural verification: PASS');
