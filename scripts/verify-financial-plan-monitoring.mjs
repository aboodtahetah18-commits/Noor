import { readFileSync } from 'node:fs';
const monitor=readFileSync('src/lib/allocation/financial-plan-monitoring.ts','utf8');
const job=readFileSync('src/app/api/jobs/financial-engine/route.ts','utf8');

for(const token of ['posted_at is not null','reversed_at is null','EXCEEDED','NO_ACTIVITY','plan_monitoring_fingerprint','external_execution:false']){
  if(!monitor.includes(token)) throw new Error('PLAN-MONITORING-CONTRACT-MISSING '+token);
}
if(/0\.8|80%|90%|warning threshold/i.test(monitor)){
  throw new Error('PLAN-MONITORING-MUST-NOT-INVENT-WARNING-THRESHOLDS');
}
if(!monitor.includes("requires_plan_change:false")){
  throw new Error('PLAN-MONITORING-MUST-NOT-AUTO-REPLAN');
}
if(!job.includes('runFinancialPlanMonitoringJob')){
  throw new Error('PLAN-MONITORING-JOB-NOT-WIRED');
}
console.log('FINANCIAL-PLAN-MONITORING-PASS');
