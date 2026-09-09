import fs from 'node:fs';
import path from 'node:path';

const mustExist = (p) => { if (!fs.existsSync(p)) throw new Error(`missing: ${p}`); };
const mustContain = (p, t) => { const s=fs.readFileSync(p,'utf8'); if(!s.includes(t)) throw new Error(`${p}: missing ${t}`); };

const layers = {
  unit: ['tests/unit/financial-engine/money.test.ts','tests/unit/state-machines/workflow-state-machine.test.ts'],
  integration: ['tests/integration/income-slice-contract.test.ts','tests/integration/expense-slice-contract.test.ts','tests/integration/transaction-reversal-contract.test.ts','tests/integration/transfer.test.ts','tests/integration/refund-contract.test.ts','tests/integration/obligation-slice-contract.test.ts','tests/integration/savings-slice-contract.test.ts','tests/integration/goals-slice-contract.test.ts','tests/integration/cycle-closing-contract.test.ts'],
  database: ['tests/database/migration-contract.test.ts'],
  security: ['tests/security/security-hardening-contract.test.ts'],
  responsive: ['tests/integration/mobile-hardening-contract.test.ts','tests/unit/tablet/tablet-hardening-contract.test.ts','tests/unit/desktop/desktop-hardening-contract.test.ts','tests/rtl-audit-contract.test.ts'],
  accessibility: ['tests/accessibility/accessibility-audit-contract.test.ts'],
  regression: ['tests/regression/full-regression-contract.test.ts'],
};
for (const files of Object.values(layers)) for (const f of files) mustExist(f);

mustContain('src/features/transactions/schemas/transaction-history.ts','pageSize');
mustContain('src/forecast/deterministic-forecast-engine.ts','P56-V1-CURRENT-CYCLE-PACE');
mustContain('src/features/cycles/services/cycle-closing-service.ts','BUFFER_POLICY_REQUIRED');
mustContain('database/migrations/20260902_022_security_hardening.sql','enable row level security');
mustContain('database/migrations/20260902_023_performance_hardening.sql','recommendations_open_feed_idx');

const testFiles = [];
const walk=(d)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.test\.ts$/.test(e.name))testFiles.push(p)}};
walk('tests');

console.log('Phase 39 regression structural verification: PASS');
console.log(`Regression test files discovered: ${testFiles.length}`);
console.log(`Coverage layers: ${Object.keys(layers).join(', ')}`);
if (!fs.existsSync('package-lock.json')) console.log('REGRESSION-GATE-WARN package-lock.json absent: dependency reproducibility gate remains open.');
if (!fs.existsSync('node_modules')) console.log('REGRESSION-GATE-WARN node_modules absent: executable Vitest/Next suite not run in this environment.');
console.log('Regression operational follow-up: run post-deploy smoke/status/stability on the published production URL.');
