import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const exists=(f)=>fs.existsSync(path.join(root,f));
const fail=(m)=>{console.error(`P56-FAIL ${m}`);process.exitCode=1};
const pass=(m)=>console.log(`PASS ${m}`);
const atLeast=(v,a,b,c)=>{const [x=0,y=0,z=0]=v.split('.').map(Number);return x>a||(x===a&&(y>b||(y===b&&z>=c)))};
const pkg=JSON.parse(read('package.json'));
if(atLeast(pkg.version,0,56,0))pass(`P56 version — ${pkg.version}`);else fail(`version ${pkg.version}`);
for(const f of ['src/financial-engine/financial-health.ts','src/financial-engine/budget-risk.ts','src/financial-engine/goal-allocation-policy.ts','src/financial-engine/emergency-coverage.ts','src/forecast/deterministic-forecast-engine.ts','docs/P56_FINANCIAL_DECISIONS.md','tests/unit/financial-engine/p56-financial-policy.test.ts']) {
  if(exists(f)) pass(`artifact ${f}`);
  else fail(`missing ${f}`);
}
const decisions=read('docs/P56_FINANCIAL_DECISIONS.md');
for(const rule of ['PENDING-BR-001','PENDING-BR-002','PENDING-BR-003','PENDING-BR-004','PENDING-BR-005','PENDING-BR-006']) {
  if(decisions.includes(rule)) pass(`decision ${rule}`);
  else fail(`decision missing ${rule}`);
}
const health=read('src/financial-engine/financial-health.ts');
if(health.includes('EQUAL_AVERAGE_AVAILABLE_DIMENSIONS')) pass('health score has no hidden weights'); else fail('health weighting contract missing');
const risk=read('src/financial-engine/budget-risk.ts');
if(risk.includes('input.actualMinorUnits * BigInt(input.cycleDays)')&&risk.includes("'AT_RISK'")) pass('AT_RISK exact linear pace'); else fail('AT_RISK linear pace missing');
const forecast=read('src/forecast/deterministic-forecast-engine.ts');
if(forecast.includes('P56-V1-CURRENT-CYCLE-PACE')&&forecast.toLowerCase().includes('historical')) pass('forecast deterministic V1'); else fail('forecast V1 missing');
const goal=read('src/financial-engine/goal-allocation-policy.ts');
if(goal.includes('SUGGEST_ONLY_USER_APPROVAL_REQUIRED')&&goal.includes('automaticAllocation: false')) pass('goal allocation remains user-approved'); else fail('goal allocation safety missing');
const emergency=read('src/financial-engine/emergency-coverage.ts');
if(emergency.includes('USER_DEFINED_AMOUNT')&&emergency.includes('UNAVAILABLE_NO_ESSENTIAL_BASELINE')) pass('emergency target owner-defined'); else fail('emergency target policy missing');
const buffer=read('src/features/financial-buffer/services/financial-buffer-service.ts');
const bufferUi=read('src/app/(protected)/settings/financial-buffer/page.tsx');
if(buffer.includes('getActiveFinancialBufferPolicy')&&buffer.includes('calculateRequiredFinancialBuffer')&&!bufferUi.includes("'10.00'")&&!bufferUi.includes("'1000.00'"))pass('buffer explicit owner-selected policy, no silent UI default');else fail('buffer policy contract incomplete');
const dashboard=read('src/repositories/dashboard-repository.ts');
if(dashboard.includes("deficitStatus: 'BUFFER_POLICY_REQUIRED'")) pass('dashboard reports real missing prerequisite'); else fail('dashboard stale forecast blocker');
const recommendation=read('src/features/recommendations/engine/run-recommendation-rules.ts');
if(recommendation.includes('calculateCashForecast')&&!recommendation.includes('ISSUE-0004')) pass('recommendations consume finalized forecast'); else fail('recommendation forecast closure missing');
const rollover=read('src/features/cycles/services/cycle-rollover-service.ts');
if(rollover.includes('calculateFinancialHealth')&&rollover.includes('financial_health_score')&&rollover.includes('P56_FINANCIAL_FINALIZATION')) pass('closing snapshot persists finalized health score'); else fail('snapshot financial health integration missing');
const runtimeFiles=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name))runtimeFiles.push(p)}}
walk(path.join(root,'src'));
const stale=[];
for(const p of runtimeFiles){const s=fs.readFileSync(p,'utf8');if(/BLOCKED_PENDING_FORECAST_RULE|BLOCKED_PENDING_BUFFER_RULE|BLOCKED_PENDING_EMERGENCY_TARGET_RULE|ISSUE-0002|ISSUE-0004/.test(s))stale.push(path.relative(root,p));}
if(stale.length===0) pass('no stale unresolved runtime blockers for closed P56 rules'); else fail(`stale P56 blockers: ${stale.join(', ')}`);
const migrations=fs.readdirSync(path.join(root,'database/migrations')).filter(n=>n.endsWith('.sql'));
if(migrations.length===66) pass('migration inventory — 66'); else fail(`migration inventory expected 66 got ${migrations.length}`);
const gate=read('scripts/production-quality-gate.mjs');
if(gate.includes("['P56 financial finalization','node',['scripts/verify-p56.mjs']]")) pass('P56 wired into quality gate'); else fail('P56 quality-gate wiring missing');
if(process.exitCode)process.exit(process.exitCode);
console.log('P56 financial finalization contract: PASS');
