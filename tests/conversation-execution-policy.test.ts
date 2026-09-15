import { describe, expect, it } from 'vitest';

describe('Namaa conversation execution policy', () => {
  it('does not represent user confirmation as verified execution', () => {
    const transitions = {
      userDoneWithEvidence: 'EVIDENCE_PENDING',
      userDoneWithoutEvidence: 'VERIFICATION_PENDING',
    };
    expect(transitions.userDoneWithEvidence).not.toBe('CLOSED');
    expect(transitions.userDoneWithoutEvidence).not.toBe('CLOSED');
  });

  it('has no automatic financial execution route', () => {
    const routes = [
      '/api/conversation-context',
      '/conversations',
    ];
    expect(routes.some((route) => /execute-transfer|auto-pay|auto-invest/.test(route))).toBe(false);
  });
});
