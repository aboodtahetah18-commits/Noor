import { describe, expect, it } from 'vitest';
import {
  Money,
  calculateAccountBalance,
  calculateCategoryActual,
  calculateCategoryRemaining,
  calculateCategoryUtilization,
  calculateDailySafeLimit,
  calculateEmergencyProgress,
  calculateExpectedDeficit,
  calculateGoalProgress,
  calculateSafeToSpend,
  calculateSavingRate,
} from '../../../src/financial-engine';

const m = Money.parse;

describe('Financial Engine Core', () => {
  it('calculates account balance from opening + posted inflows - posted outflows', () => {
    const balance = calculateAccountBalance({
      openingBalance: m('8200.00'),
      postedInflows: [m('1000.00'), m('250.50')],
      postedOutflows: [m('300.25')],
    });
    expect(balance.toString()).toBe('9150.25');
  });

  it('calculates category actual net of refunds and remaining', () => {
    const actual = calculateCategoryActual([m('400.00'), m('70.00')], [m('20.00')]);
    expect(actual.toString()).toBe('450.00');
    expect(calculateCategoryRemaining(m('500.00'), actual).toString()).toBe('50.00');
  });

  it('calculates category utilization over 100%', () => {
    const utilization = calculateCategoryUtilization(m('500.00'), m('600.00'));
    expect(utilization.ratio?.percent).toBe('120.00');
    expect(utilization.hasSpendAgainstZeroBudget).toBe(false);
  });

  it('does not divide by zero for a zero category budget', () => {
    const utilization = calculateCategoryUtilization(m('0.00'), m('25.00'));
    expect(utilization.ratio).toBeNull();
    expect(utilization.hasSpendAgainstZeroBudget).toBe(true);
  });

  it('STS-001 calculates normal Safe To Spend', () => {
    const result = calculateSafeToSpend({
      availableLiquidity: m('10000.00'),
      reservedUnpaidObligations: m('3000.00'),
      remainingEssentialNeeds: m('2000.00'),
      protectedSavings: m('1000.00'),
      protectedEmergencyAllocation: m('500.00'),
      protectedGoalAllocations: m('500.00'),
      requiredFinancialBuffer: m('0.00'), // explicit TEST FIXTURE only
    });
    expect(result.calculated.toString()).toBe('3000.00');
    expect(result.displayAmount.toString()).toBe('3000.00');
    expect(result.protectionDeficit.toString()).toBe('0.00');
    expect(result.status).toBe('AVAILABLE');
  });

  it('STS-002 displays zero when all money is protected', () => {
    const result = calculateSafeToSpend({
      availableLiquidity: m('5000.00'),
      reservedUnpaidObligations: m('3000.00'),
      remainingEssentialNeeds: m('2000.00'),
      protectedSavings: m('0.00'),
      protectedEmergencyAllocation: m('0.00'),
      protectedGoalAllocations: m('0.00'),
      requiredFinancialBuffer: m('0.00'),
    });
    expect(result.displayAmount.toString()).toBe('0.00');
    expect(result.status).toBe('ZERO');
  });

  it('STS-003 preserves a negative calculated amount as deficit while display stays zero', () => {
    const result = calculateSafeToSpend({
      availableLiquidity: m('4300.00'),
      reservedUnpaidObligations: m('3000.00'),
      remainingEssentialNeeds: m('2000.00'),
      protectedSavings: m('0.00'),
      protectedEmergencyAllocation: m('0.00'),
      protectedGoalAllocations: m('0.00'),
      requiredFinancialBuffer: m('0.00'),
    });
    expect(result.calculated.toString()).toBe('-700.00');
    expect(result.displayAmount.toString()).toBe('0.00');
    expect(result.protectionDeficit.toString()).toBe('700.00');
    expect(calculateExpectedDeficit(result.calculated).toString()).toBe('700.00');
  });

  it('calculates daily safe limit without division by zero', () => {
    expect(calculateDailySafeLimit(m('1500.00'), 15).amount.toString()).toBe('100.00');
    const zeroDays = calculateDailySafeLimit(m('1500.00'), 0);
    expect(zeroDays.calculable).toBe(false);
    expect(zeroDays.amount.toString()).toBe('0.00');
  });

  it('calculates goal progress and caps display at 100%', () => {
    const progress = calculateGoalProgress(m('12000.00'), m('50000.00'));
    expect(progress.raw.percent).toBe('24.00');
    expect(progress.complete).toBe(false);

    const complete = calculateGoalProgress(m('55000.00'), m('50000.00'));
    expect(complete.raw.percent).toBe('110.00');
    expect(complete.display.percent).toBe('100.00');
    expect(complete.complete).toBe(true);
  });

  it('calculates emergency progress and saving rate', () => {
    expect(calculateEmergencyProgress(m('12000.00'), m('30000.00')).display.percent).toBe('40.00');
    expect(calculateSavingRate(m('700.00'), m('10000.00'))?.percent).toBe('7.00');
    expect(calculateSavingRate(m('0.00'), m('0.00'))).toBeNull();
  });
});
