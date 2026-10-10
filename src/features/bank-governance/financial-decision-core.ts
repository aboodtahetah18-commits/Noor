/**
 * Namaa financial decision core.
 * All values are integer halalas. No AI calls, automatic loans, or external transfers.
 * Operations are pure so they can be audited before being connected to persistence.
 */
export type BankId = 'HILAL' | 'MALATH' | 'OSOOL';
export type ActionKind = 'CLASSIFY' | 'NOTIFY' | 'TRANSFER' | 'LOAN' | 'INVEST' | 'SALARY_ALLOCATION' | 'POLICY_CHANGE';
export type ApprovalStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EXECUTED';

export interface BankPolicy {
  bank: BankId;
  permittedCategories: readonly string[];
  protectedMinimumHalalas: number;
  lowLiquidityThresholdHalalas: number;
}
export interface DecisionExample {
  bank: BankId;
  category: string;
  merchantKey: string;
  action: ActionKind;
  outcome: string;
  corrected?: boolean;
}
export interface LearnedPattern {
  bank: BankId;
  merchantKey: string;
  category: string;
  observations: number;
  matches: number;
  consistency: number;
  suggestedAction: 'CLASSIFY';
}
export interface DecisionRequest {
  id: string;
  bank: BankId;
  kind: ActionKind;
  amountHalalas: number;
  reason: string;
  status: ApprovalStatus;
  approvedBy?: string;
}
export interface BankSnapshot {
  bank: BankId;
  cashHalalas: number;
  externalLiabilitiesHalalas: number;
  internalReceivablesHalalas: number;
  internalPayablesHalalas: number;
}
const guardedActions = new Set<ActionKind>(['TRANSFER', 'LOAN', 'INVEST', 'SALARY_ALLOCATION', 'POLICY_CHANGE']);
const assertMoney = (n: number) => {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('INVALID_MONEY_AMOUNT');
};
export function detectClassificationPatterns(
  examples: readonly DecisionExample[],
  minimumSamples = 3,
  minimumConsistency = 0.8,
): LearnedPattern[] {
  if (!Number.isSafeInteger(minimumSamples) || minimumSamples < 2 || minimumConsistency <= 0 || minimumConsistency > 1) {
    throw new Error('INVALID_LEARNING_CONFIGURATION');
  }
  const groups = new Map<string, DecisionExample[]>();
  for (const example of examples) {
    if (example.action !== 'CLASSIFY' || !example.merchantKey.trim() || example.corrected) continue;
    const key = JSON.stringify([example.bank, example.merchantKey.trim().toLowerCase()]);
    groups.set(key, [...(groups.get(key) ?? []), example]);
  }
  const proposals: LearnedPattern[] = [];
  for (const rows of groups.values()) {
    if (rows.length < minimumSamples) continue;
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    const [category, matches] = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const consistency = matches / rows.length;
    if (consistency >= minimumConsistency) {
      proposals.push({
        bank: rows[0].bank, merchantKey: rows[0].merchantKey, category,
        observations: rows.length, matches, consistency, suggestedAction: 'CLASSIFY',
      });
    }
  }
  return proposals.sort((a, b) => b.consistency - a.consistency || b.observations - a.observations);
}
export function proposeDecision(input: Omit<DecisionRequest, 'status' | 'approvedBy'>): DecisionRequest {
  assertMoney(input.amountHalalas);
  if (!input.id.trim() || !input.reason.trim()) throw new Error('REQUIRED_DECISION_FIELDS');
  return { ...input, status: 'PROPOSED' };
}
export function approveDecision(request: DecisionRequest, ownerId: string): DecisionRequest {
  if (request.status !== 'PROPOSED' || !ownerId.trim()) throw new Error('APPROVAL_NOT_ALLOWED');
  return { ...request, status: 'APPROVED', approvedBy: ownerId };
}
export function rejectDecision(request: DecisionRequest): DecisionRequest {
  if (request.status !== 'PROPOSED') throw new Error('REJECTION_NOT_ALLOWED');
  return { ...request, status: 'REJECTED' };
}
export function canExecute(request: DecisionRequest, policy: BankPolicy): boolean {
  if (request.bank !== policy.bank) return false;
  if (guardedActions.has(request.kind)) return request.status === 'APPROVED' && Boolean(request.approvedBy);
  return request.status === 'APPROVED' && Boolean(request.approvedBy);
}
/** Loan capacity calculation respects the protected reserve; never authorizes transfer. */
export function availableToLend(cashHalalas: number, policy: BankPolicy): number {
  assertMoney(cashHalalas);
  assertMoney(policy.protectedMinimumHalalas);
  return Math.max(0, cashHalalas - policy.protectedMinimumHalalas);
}
/** Internal receivables/payables cancel out on consolidation; do not count twice. */
export function consolidatedPosition(banks: readonly BankSnapshot[]) {
  let cashHalalas = 0, externalLiabilitiesHalalas = 0, internalReceivablesHalalas = 0, internalPayablesHalalas = 0;
  for (const bank of banks) {
    for (const amount of [bank.cashHalalas, bank.externalLiabilitiesHalalas, bank.internalReceivablesHalalas, bank.internalPayablesHalalas]) assertMoney(amount);
    cashHalalas += bank.cashHalalas;
    externalLiabilitiesHalalas += bank.externalLiabilitiesHalalas;
    internalReceivablesHalalas += bank.internalReceivablesHalalas;
    internalPayablesHalalas += bank.internalPayablesHalalas;
  }
  if (internalReceivablesHalalas !== internalPayablesHalalas) throw new Error('UNBALANCED_INTERNAL_LEDGER');
  return { cashHalalas, externalLiabilitiesHalalas, netLiquidPositionHalalas: cashHalalas - externalLiabilitiesHalalas };
}
export const defaultBankPolicies: Readonly<Record<BankId, BankPolicy>> = {
  HILAL: { bank: 'HILAL', permittedCategories: ['DAILY_EXPENSE', 'BILLS', 'OBLIGATIONS'], protectedMinimumHalalas: 0, lowLiquidityThresholdHalalas: 0 },
  MALATH: { bank: 'MALATH', permittedCategories: ['EMERGENCY', 'SAVINGS', 'GOALS'], protectedMinimumHalalas: 0, lowLiquidityThresholdHalalas: 0 },
  OSOOL: { bank: 'OSOOL', permittedCategories: ['INVESTMENTS', 'ASSETS'], protectedMinimumHalalas: 0, lowLiquidityThresholdHalalas: 0 },
};
