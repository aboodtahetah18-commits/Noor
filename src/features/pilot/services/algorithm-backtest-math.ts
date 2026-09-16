import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';

export const BACKTEST_COMPONENT_KEYS = [
  'essentials',
  'cashLiquidity',
  'reserveEmergency',
  'debt',
  'incomeShock',
  'spendingFlexibility',
  'assetLiquidity',
  'executionDiscipline',
  'goals',
  'investmentConcentration',
] as const;

export type ComponentKey = (typeof BACKTEST_COMPONENT_KEYS)[number];
export type CandidateWeights = Record<ComponentKey, number>;
export type CandidateThresholds = {
  vulnerableMin: number;
  balancedMin: number;
  stableMin: number;
  strongMin: number;
};
export type FinancialState = 'CRITICAL' | 'VULNERABLE' | 'BALANCED' | 'STABLE' | 'STRONG';

export type BacktestComponents = Record<ComponentKey, number | null>;

export const CURRENT_STATE_THRESHOLDS: CandidateThresholds = {
  vulnerableMin: 40,
  balancedMin: 55,
  stableMin: 70,
  strongMin: 85,
};

export const STATE_RANK: Record<FinancialState, number> = {
  CRITICAL: 0,
  VULNERABLE: 1,
  BALANCED: 2,
  STABLE: 3,
  STRONG: 4,
};

export function validateCandidateWeights(weights: CandidateWeights): void {
  const values = BACKTEST_COMPONENT_KEYS.map((key) => weights[key]);
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new FinancialPlatformError('INVALID_CANDIDATE_WEIGHTS', 422);
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 100) > 0.001) throw new FinancialPlatformError('CANDIDATE_WEIGHTS_MUST_SUM_TO_100', 422);
}

export function validateCandidateThresholds(thresholds: CandidateThresholds): void {
  const { vulnerableMin, balancedMin, stableMin, strongMin } = thresholds;
  const values = [vulnerableMin, balancedMin, stableMin, strongMin];
  if (values.some((value) => !Number.isFinite(value) || value <= 0 || value > 100)) {
    throw new FinancialPlatformError('INVALID_CANDIDATE_THRESHOLDS', 422);
  }
  if (!(vulnerableMin < balancedMin && balancedMin < stableMin && stableMin < strongMin)) {
    throw new FinancialPlatformError('CANDIDATE_THRESHOLDS_MUST_ASCEND', 422);
  }
}

export function scoreWithWeights(components: BacktestComponents, weights: CandidateWeights): number | null {
  let weighted = 0;
  let availableWeight = 0;
  for (const key of BACKTEST_COMPONENT_KEYS) {
    const score = components[key];
    if (score == null) continue;
    const weight = weights[key];
    weighted += score * weight;
    availableWeight += weight;
  }
  if (availableWeight <= 0) return null;
  return weighted / availableWeight;
}

export function classifyScore(score: number, thresholds: CandidateThresholds): FinancialState {
  if (score >= thresholds.strongMin) return 'STRONG';
  if (score >= thresholds.stableMin) return 'STABLE';
  if (score >= thresholds.balancedMin) return 'BALANCED';
  if (score >= thresholds.vulnerableMin) return 'VULNERABLE';
  return 'CRITICAL';
}
