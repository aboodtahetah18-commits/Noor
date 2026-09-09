import { describe, expect, it } from 'vitest';
import { rankPressureDecisionScenarios } from '@/features/future-pressure/services/rank-pressure-decision-scenarios';
import type { PressureDecisionScenario } from '@/features/future-pressure/queries/get-pressure-decision-scenarios';
import type { PressureDecisionLearningSummary } from '@/features/future-pressure/queries/get-pressure-decision-learning';

function scenario(id:string, kind:PressureDecisionScenario['kind'], relief:string, timingShiftOnly=false):PressureDecisionScenario {
  return { id, kind, title:id, description:id, targetCycleIndex:0, targetCycleLabel:'current', committedDeficitBefore:'100.00', committedDeficitRelief:relief, committedDeficitAfter:'0.00', tripGapBefore:'0.00', tripGapReliefAtCurrentDeadline:'0.00', tripGapAfterAtCurrentDeadline:'0.00', timingShiftOnly, affectedGoalId:null, affectedGoalName:null, affectedEventId:null, affectedEventTitle:null, amount:relief, sideEffect:'', approvalPath:'/', approvalLabel:'فتح', assumptions:[] };
}
function learning(kind:string, resolved:number, reduced:number, shifted:number, worsened:number, observations:number):PressureDecisionLearningSummary {
  return {scenarioKind:kind,observations,resolvedPackages:resolved,reducedPackages:reduced,shiftedPackages:shifted,worsenedPackages:worsened,mixedPackages:0,observedCommittedRelief:'0.00',observedTripRelief:'0.00',observedShiftedTripGap:'0.00',interpretation:''};
}

describe('pressure decision learning ranking',()=>{
  it('keeps timing-only deferral behind direct relief even with favorable history',()=>{
    const direct=scenario('direct','REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE','50.00');
    const defer=scenario('defer','DEFER_TRIP_ONE_CYCLE','0.00',true);
    const result=rankPressureDecisionScenarios([defer,direct],[learning('DEFER_TRIP_ONE_CYCLE',5,0,0,0,5)]);
    expect(result[0]!.id).toBe('direct');
    expect(result[1]!.id).toBe('defer');
  });

  it('uses favorable co-occurrence history to order comparable direct-relief options',()=>{
    const a=scenario('a','REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE','30.00');
    const b=scenario('b','REDIRECT_CURRENT_FLEXIBLE_HEADROOM','40.00');
    const result=rankPressureDecisionScenarios([b,a],[learning('REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE',2,1,0,0,3),learning('REDIRECT_CURRENT_FLEXIBLE_HEADROOM',0,0,0,2,2)]);
    expect(result[0]!.id).toBe('a');
    expect(result[0]!.learningEvidence.band).toBe('FAVORABLE_ASSOCIATION');
    expect(result[1]!.learningEvidence.band).toBe('CAUTION_ASSOCIATION');
  });

  it('does not let a single observation become learned preference',()=>{
    const a=scenario('a','REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE','20.00');
    const b=scenario('b','REDIRECT_CURRENT_FLEXIBLE_HEADROOM','40.00');
    const result=rankPressureDecisionScenarios([a,b],[learning('REDUCE_GOAL_CONTRIBUTION_ONE_CYCLE',1,0,0,0,1)]);
    expect(result[0]!.id).toBe('b');
    expect(result.find(x=>x.id==='a')?.learningEvidence.band).toBe('LIMITED_HISTORY');
  });
});
