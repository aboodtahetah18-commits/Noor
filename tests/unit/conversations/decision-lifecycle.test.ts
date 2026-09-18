import { describe, expect, it } from 'vitest';
import {
  canTransitionDecisionLifecycle,
  createDecisionLifecycleEnvelope,
  lifecycleStateForMessage,
} from '@/lib/conversations/decision-lifecycle';

describe('unified decision lifecycle', () => {
  it('allows the governed human-execution path', () => {
    expect(canTransitionDecisionLifecycle('PROPOSED', 'REVIEWED')).toBe(true);
    expect(canTransitionDecisionLifecycle('REVIEWED', 'USER_CONFIRMED')).toBe(true);
    expect(canTransitionDecisionLifecycle('USER_CONFIRMED', 'EVIDENCE_REQUIRED')).toBe(true);
    expect(canTransitionDecisionLifecycle('EVIDENCE_REQUIRED', 'VERIFIED')).toBe(true);
    expect(canTransitionDecisionLifecycle('VERIFIED', 'APPLIED')).toBe(true);
    expect(canTransitionDecisionLifecycle('APPLIED', 'FOLLOWUP')).toBe(true);
  });

  it('forbids bypassing evidence from review directly to applied', () => {
    expect(canTransitionDecisionLifecycle('REVIEWED', 'APPLIED')).toBe(false);
  });

  it('keeps execution explicitly human and evidence-led', () => {
    const envelope = createDecisionLifecycleEnvelope({
      source: 'HILAL',
      state: 'REVIEWED',
      decisionReference: 'DEC-TEST-1',
      now: '2026-09-18T00:00:00.000Z',
    });
    expect(envelope).toMatchObject({
      decision_reference: 'DEC-TEST-1',
      execution_boundary: 'advisory_only',
      user_execution_required: true,
      evidence_required_before_applied: true,
    });
  });

  it('maps blocked, evidence, applied and follow-up messages to canonical states', () => {
    expect(lifecycleStateForMessage({ blocked: true })).toBe('BLOCKED');
    expect(lifecycleStateForMessage({ requiresEvidence: true })).toBe('EVIDENCE_REQUIRED');
    expect(lifecycleStateForMessage({ applied: true })).toBe('APPLIED');
    expect(lifecycleStateForMessage({ followup: true })).toBe('FOLLOWUP');
  });
});
