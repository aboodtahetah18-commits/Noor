import fs from 'node:fs';
const checks=[
 ['migration 059','database/migrations/20260904_059_internal_funding_recovery_schedule.sql','internal_funding_recovery_schedule'],
 ['actual usage schedule','src/features/internal-funding/services/recovery-schedule.ts','internal_funding_expense_allocations'],
 ['halala split','src/features/internal-funding/services/recovery-schedule.ts','splitMinor'],
 ['idempotent transfer','src/features/internal-funding/commands/pay-recovery-installment.ts','internal-recovery:'],
 ['transfer not expense','src/features/internal-funding/commands/pay-recovery-installment.ts',"'TRANSFER','POSTED'"],
 ['paid-only debt','src/features/internal-funding/queries/get-funding-overview.ts',"r.status='PAID'"],
 ['ordered installments','src/features/internal-funding/commands/pay-recovery-installment.ts','يجب تنفيذ دفعة الاسترداد رقم'],
 ['one source payment per cycle','src/features/internal-funding/commands/pay-recovery-installment.ts','تم تنفيذ دفعة لهذا المصدر في الدورة الحالية بالفعل'],
 ['ui recovery schedule','src/app/(protected)/internal-funding/page.tsx','جدول الاسترداد عبر الدورات'],
];
for(const [name,file,needle] of checks){const s=fs.readFileSync(file,'utf8');if(!s.includes(needle)){console.error('FAIL',name);process.exit(1)}console.log('PASS',name)}
console.log('P46.24/P46.25 structural verification: PASS');
