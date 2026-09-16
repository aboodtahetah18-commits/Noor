import fs from 'node:fs';

const required = [
  'src/app/(protected)/cases/[caseId]/actions.ts',
  'src/app/(protected)/cases/[caseId]/governance-action-panel.tsx',
  'src/features/governance/services/get-governance-action-capabilities.ts',
  'src/features/governance/services/release-governed-algorithm-change-from-case.ts',
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`GOVERNANCE_ACTION_SURFACE_MISSING:${file}`);
}

const actions = fs.readFileSync(required[0], 'utf8');
const panel = fs.readFileSync(required[1], 'utf8');
const releaseFromCase = fs.readFileSync(required[3], 'utf8');

for (const symbol of [
  'recordGovernedAlgorithmDecision',
  'decideGovernedRollbackReview',
  'releaseGovernedAlgorithmChangeFromCase',
  'executeGovernedAlgorithmRollback',
]) {
  if (!actions.includes(symbol)) throw new Error(`GOVERNANCE_ACTION_SERVER_GATE_MISSING:${symbol}`);
}
if (!panel.includes('required') || !panel.includes('confirm')) {
  throw new Error('GOVERNANCE_ACTION_EXPLICIT_CONFIRMATION_MISSING');
}
if (!releaseFromCase.includes('buildGovernedReleaseArtifact') || !releaseFromCase.includes('lifecycle_json') || !releaseFromCase.includes('spec_json')) {
  throw new Error('GOVERNANCE_RELEASE_NOT_REBUILT_FROM_PERSISTED_SOURCE');
}

const sensitiveRoutes = [
  'src/app/api/pilot/change-governance/decisions/route.ts',
  'src/app/api/pilot/change-governance/releases/route.ts',
  'src/app/api/pilot/change-governance/rollbacks/route.ts',
];
for (const route of sensitiveRoutes) {
  const source = fs.readFileSync(route, 'utf8');
  if (source.includes("@/features/pilot/services/algorithm-governance-write-service")) {
    throw new Error(`GOVERNANCE_DIRECT_WRITE_BYPASS_PRESENT:${route}`);
  }
}
if (!fs.readFileSync(sensitiveRoutes[0], 'utf8').includes('recordGovernedAlgorithmDecision')) {
  throw new Error('GOVERNANCE_DECISION_ROUTE_NOT_AUTHORIZED');
}
if (!fs.readFileSync(sensitiveRoutes[1], 'utf8').includes('releaseGovernedAlgorithmChangeFromCase')) {
  throw new Error('GOVERNANCE_RELEASE_ROUTE_NOT_AUTHORIZED');
}
if (!fs.readFileSync(sensitiveRoutes[2], 'utf8').includes('executeGovernedAlgorithmRollback')) {
  throw new Error('GOVERNANCE_ROLLBACK_ROUTE_NOT_AUTHORIZED');
}

console.log('GOVERNANCE-ACTION-SURFACE-CONTRACT-PASS');
