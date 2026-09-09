import fs from 'node:fs';
import path from 'node:path';

const requiredLayers = {
  unit: [
    'tests/unit/financial-engine/money.test.ts',
    'tests/unit/state-machines/workflow-state-machine.test.ts',
  ],
  integration: [
    'tests/integration/income-slice-contract.test.ts',
    'tests/integration/expense-slice-contract.test.ts',
    'tests/integration/transaction-reversal-contract.test.ts',
    'tests/integration/transfer.test.ts',
    'tests/integration/refund-contract.test.ts',
    'tests/integration/obligation-slice-contract.test.ts',
    'tests/integration/savings-slice-contract.test.ts',
    'tests/integration/goals-slice-contract.test.ts',
    'tests/integration/cycle-closing-contract.test.ts',
  ],
  database: ['tests/database/migration-contract.test.ts'],
  security: ['tests/security/security-hardening-contract.test.ts'],
  responsive: [
    'tests/integration/mobile-hardening-contract.test.ts',
    'tests/unit/tablet/tablet-hardening-contract.test.ts',
    'tests/unit/desktop/desktop-hardening-contract.test.ts',
    'tests/rtl-audit-contract.test.ts',
  ],
  accessibility: ['tests/accessibility/accessibility-audit-contract.test.ts'],
  regression: ['tests/regression/full-regression-contract.test.ts'],
};

const failures = [];
for (const [layer, files] of Object.entries(requiredLayers)) {
  for (const file of files) {
    if (!fs.existsSync(file)) failures.push(`${layer}: missing ${file}`);
  }
}

const testFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.test\.ts$/.test(entry.name)) testFiles.push(file);
  }
};
walk('tests');

if (failures.length) {
  console.error('Regression contract verification: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Regression contract verification: PASS');
console.log(`Regression test files discovered: ${testFiles.length}`);
console.log(`Coverage layers: ${Object.keys(requiredLayers).join(', ')}`);
