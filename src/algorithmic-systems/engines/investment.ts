import type { FinancialSnapshot } from "../domain/types";

export function investableMoney(s:FinancialSnapshot):number {
  return Math.max(
    0,
    s.availableBalance
      - s.dueObligations
      - s.protectedAmount
      - s.nearTermGoalNeed
      - s.reservedAmount
      - s.minimumLivingNeed
  );
}

export interface SuitabilityInputs {
  riskTolerance:number;
  investmentHorizon:number;
  liquidityAdequacy:number;
  diversification:number;
  opportunityDataQuality:number;
  goalCompatibility:number;
}

export function suitabilityScore(i:SuitabilityInputs):number {
  const score =
    0.25*i.riskTolerance +
    0.20*i.investmentHorizon +
    0.20*i.liquidityAdequacy +
    0.15*i.diversification +
    0.10*i.opportunityDataQuality +
    0.10*i.goalCompatibility;
  return Math.max(0, Math.min(100, Math.round(score)));
}
