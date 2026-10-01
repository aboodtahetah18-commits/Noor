import { describe, expect, it } from 'vitest';
import { evaluateTemporaryEstimateConfidence } from '@/features/budget/services/temporary-estimate-confidence';

describe('temporary estimate unified confidence',()=>{
  it('allows direct use only when history, outcomes and season evidence are strong',()=>{
    const result=evaluateTemporaryEstimateConfidence({
      observedMonths:8,
      coefficientOfVariation:0.2,
      outcomeCount:5,
      averageErrorRatio:0.1,
      learningConfirmations:6,
      biasStability:'STABLE_UNDER',
      biasApplied:true,
      seasonalityApplied:true,
      namedSeasonApplied:true,
      namedSeasonHistoricalOccurrences:3,
    });

    expect(result.level).toBe('HIGH');
    expect(result.requiresManualAmount).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('keeps a useful but uncertain estimate in manual confirmation mode',()=>{
    const result=evaluateTemporaryEstimateConfidence({
      observedMonths:5,
      coefficientOfVariation:0.4,
      outcomeCount:4,
      averageErrorRatio:0.25,
      learningConfirmations:4,
      biasStability:'INSUFFICIENT',
      biasApplied:false,
      seasonalityApplied:true,
      namedSeasonApplied:false,
      namedSeasonHistoricalOccurrences:0,
    });

    expect(result.level).toBe('MEDIUM');
    expect(result.requiresManualAmount).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThan(75);
  });

  it('caps confidence when the spending history is too short',()=>{
    const result=evaluateTemporaryEstimateConfidence({
      observedMonths:2,
      coefficientOfVariation:0.2,
      outcomeCount:5,
      averageErrorRatio:0.05,
      learningConfirmations:8,
      biasStability:'STABLE_OVER',
      biasApplied:true,
      seasonalityApplied:true,
      namedSeasonApplied:true,
      namedSeasonHistoricalOccurrences:4,
    });

    expect(result.score).toBeLessThanOrEqual(49);
    expect(result.level).toBe('LOW');
    expect(result.requiresManualAmount).toBe(true);
  });

  it('penalizes recent drift instead of presenting old learning as stable confidence',()=>{
    const stable=evaluateTemporaryEstimateConfidence({
      observedMonths:8,
      coefficientOfVariation:0.3,
      outcomeCount:5,
      averageErrorRatio:0.2,
      learningConfirmations:6,
      biasStability:'STABLE_UNDER',
      biasApplied:true,
      seasonalityApplied:false,
      namedSeasonApplied:false,
      namedSeasonHistoricalOccurrences:0,
    });
    const shifting=evaluateTemporaryEstimateConfidence({
      observedMonths:8,
      coefficientOfVariation:0.3,
      outcomeCount:5,
      averageErrorRatio:0.2,
      learningConfirmations:6,
      biasStability:'SHIFTING',
      biasApplied:false,
      seasonalityApplied:false,
      namedSeasonApplied:false,
      namedSeasonHistoricalOccurrences:0,
    });

    expect(shifting.score).toBeLessThan(stable.score);
    expect(shifting.evidence.join(' ')).toContain('السلوك الحديث تغيّر');
  });
});
