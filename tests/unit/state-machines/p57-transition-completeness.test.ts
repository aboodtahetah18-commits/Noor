import { describe, expect, it } from 'vitest';
import {
  allocationTransitions,
  financialCycleTransitions,
  financialPlanTransitions,
  goalTransitions,
  obligationTransitions,
  recommendationTransitions,
  transactionTransitions,
} from '@/state-machines/definitions';

const tables = {
  FINANCIAL_CYCLE: financialCycleTransitions,
  FINANCIAL_PLAN: financialPlanTransitions,
  OBLIGATION: obligationTransitions,
  GOAL: goalTransitions,
  TRANSACTION: transactionTransitions,
  SAVING_ALLOCATION: allocationTransitions,
  RECOMMENDATION: recommendationTransitions,
} as const;

describe('P57 state-machine transition completeness', () => {
  it('keeps every declared transition explicit and terminal states free of hidden outgoing transitions', () => {
    let transitionCount = 0;
    for (const [entity, table] of Object.entries(tables)) {
      for (const [from, events] of Object.entries(table)) {
        expect(Object.keys(events).length, `${entity}:${from}`).toBeGreaterThan(0);
        transitionCount += Object.keys(events).length;
      }
    }
    expect(transitionCount).toBeGreaterThanOrEqual(30);
  });

  it('keeps historical terminal states out of transition tables', () => {
    expect(financialCycleTransitions).not.toHaveProperty('CLOSED');
    expect(transactionTransitions).not.toHaveProperty('FAILED');
    expect(transactionTransitions).not.toHaveProperty('REVERSED');
    expect(goalTransitions).not.toHaveProperty('ACHIEVED');
    expect(goalTransitions).not.toHaveProperty('CANCELLED');
  });
});
