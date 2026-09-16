import { describe, expect, it } from 'vitest';
import {
  CURRENT_STATE_THRESHOLDS,
  classifyScore,
  scoreWithWeights,
  validateCandidateThresholds,
  validateCandidateWeights,
  type BacktestComponents,
  type CandidateWeights,
} from '@/features/pilot/services/algorithm-backtest-math';

const currentWeights: CandidateWeights = {
  essentials: 18,
  cashLiquidity: 15,
  reserveEmergency: 15,
  debt: 12,
  incomeShock: 10,
  spendingFlexibility: 8,
  assetLiquidity: 7,
  executionDiscipline: 6,
  goals: 5,
  investmentConcentration: 4,
};

describe('algorithm comparative backtest math', () => {
  it('accepts a weight set totaling 100 and rejects invalid totals', () => {
    expect(() => validateCandidateWeights(currentWeights)).not.toThrow();
    expect(() => validateCandidateWeights({ ...currentWeights, essentials: 17 })).toThrowError();
  });

  it('renormalizes over available components instead of treating missing values as zero', () => {
    const components: BacktestComponents = {
      essentials: 100,
      cashLiquidity: 0,
      reserveEmergency: null,
      debt: null,
      incomeShock: null,
      spendingFlexibility: null,
      assetLiquidity: null,
      executionDiscipline: null,
      goals: null,
      investmentConcentration: null,
    };

    const score = scoreWithWeights(components, currentWeights);
    expect(score).not.toBeNull();
    expect(score).toBeCloseTo((100 * 18) / (18 + 15), 8);
  });

  it('classifies the documented state boundaries exactly', () => {
    expect(classifyScore(39.99, CURRENT_STATE_THRESHOLDS)).toBe('CRITICAL');
    expect(classifyScore(40, CURRENT_STATE_THRESHOLDS)).toBe('VULNERABLE');
    expect(classifyScore(55, CURRENT_STATE_THRESHOLDS)).toBe('BALANCED');
    expect(classifyScore(70, CURRENT_STATE_THRESHOLDS)).toBe('STABLE');
    expect(classifyScore(85, CURRENT_STATE_THRESHOLDS)).toBe('STRONG');
  });

  it('rejects threshold bands that are not strictly ascending', () => {
    expect(() => validateCandidateThresholds(CURRENT_STATE_THRESHOLDS)).not.toThrow();
    expect(() => validateCandidateThresholds({
      vulnerableMin: 40,
      balancedMin: 70,
      stableMin: 60,
      strongMin: 85,
    })).toThrowError();
  });
});
