import type { FinancialSnapshot } from "../domain/types";

export function coverableBalance(s:FinancialSnapshot):number {
  return Math.max(0, s.availableBalance - s.protectedAmount - s.reservedAmount - s.minimumLivingNeed);
}

export function obligationCoverageGap(s:FinancialSnapshot):number {
  return Math.max(0, s.dueObligations - coverableBalance(s));
}

export function obligationCoverageRatio(s:FinancialSnapshot):number {
  if (s.dueObligations <= 0) return 1;
  return Math.min(1, coverableBalance(s)/s.dueObligations);
}
