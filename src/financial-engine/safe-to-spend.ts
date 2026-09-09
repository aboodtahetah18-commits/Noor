import { Money, sumMoney } from './money';

export interface SafeToSpendInput {
  availableLiquidity: Money;
  reservedUnpaidObligations: Money;
  remainingEssentialNeeds: Money;
  protectedSavings: Money;
  protectedEmergencyAllocation: Money;
  protectedGoalAllocations: Money;
  /**
   * RequiredFinancialBuffer is intentionally supplied by the caller.
   * P56 resolves the buffer rule through an explicit owner-selected active policy; no financial default is imposed.
   */
  requiredFinancialBuffer: Money;
}

export interface SafeToSpendResult {
  calculated: Money;
  displayAmount: Money;
  protectionDeficit: Money;
  status: 'AVAILABLE' | 'ZERO';
}

export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendResult {
  const protectedAmounts = sumMoney([
    input.reservedUnpaidObligations,
    input.remainingEssentialNeeds,
    input.protectedSavings,
    input.protectedEmergencyAllocation,
    input.protectedGoalAllocations,
    input.requiredFinancialBuffer,
  ]);

  const calculated = input.availableLiquidity.subtract(protectedAmounts);
  const displayAmount = calculated.max(Money.zero());
  const protectionDeficit = calculated.isNegative() ? calculated.negate() : Money.zero();

  return {
    calculated,
    displayAmount,
    protectionDeficit,
    status: displayAmount.isPositive() ? 'AVAILABLE' : 'ZERO',
  };
}
