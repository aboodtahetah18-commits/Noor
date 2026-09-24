import { describe, expect, it } from 'vitest';
import {
  candidateScore,
  isCandidateEligible,
  type ProactiveCandidate,
} from '../../src/lib/conversations/daily-conversation-orchestrator';
import {
  normalizeProactiveConversationMemory,
  registerPrompt,
  registerUserLearning,
} from '../../src/lib/conversations/proactive-conversation-memory';

const candidate:ProactiveCandidate={
  key:'missing-bills',
  roomKey:'hilal',
  senderKey:'budget-spending-owner',
  senderName:'مسؤول الميزانية والإنفاق',
  kind:'request',
  basePriority:96,
  cooldownDays:10,
  requestedFact:'extended:bills',
  title:'استكمال الفواتير',
  body:'سؤال',
  reason:'بيانات ناقصة',
};

describe('ذاكرة المبادرة اليومية في نماء',()=>{
  it('لا يعيد طلب معلومة موجودة أصلًا في الذاكرة المشتركة',()=>{
    const memory=normalizeProactiveConversationMemory(null);
    expect(isCandidateEligible(candidate,memory,new Set(['extended:bills']),new Date('2026-09-24T08:00:00Z'))).toBe(false);
  });

  it('يحترم مهلة إعادة السؤال إذا لم يرد المستخدم',()=>{
    const base=normalizeProactiveConversationMemory(null);
    const memory=registerPrompt(base,candidate.key,'2026-09-20T08:00:00Z');
    expect(isCandidateEligible(candidate,memory,new Set(),new Date('2026-09-24T08:00:00Z'))).toBe(false);
    expect(isCandidateEligible(candidate,memory,new Set(),new Date('2026-10-02T08:00:00Z'))).toBe(true);
  });

  it('يتعلم من الرد ويمنع تكرار السؤال لمدة أطول',()=>{
    const base=registerPrompt(normalizeProactiveConversationMemory(null),candidate.key,'2026-09-20T08:00:00Z');
    const learned=registerUserLearning(base,'hilal','فاتورة الجوال 75 ريال شهريًا','2026-09-20T09:00:00Z',candidate.key);
    expect(learned.prompts[candidate.key]?.lastAnswerExcerpt).toContain('75');
    expect(isCandidateEligible(candidate,learned,new Set(),new Date('2026-10-05T08:00:00Z'))).toBe(false);
    expect(isCandidateEligible(candidate,learned,new Set(),new Date('2026-10-25T08:00:00Z'))).toBe(true);
  });

  it('يرفع أولوية البنك الذي يتفاعل معه المستخدم مع بقاء أولوية المخاطر أعلى',()=>{
    const base=normalizeProactiveConversationMemory({
      rooms:{hilal:{userTurns:12,lastUserAt:'2026-09-24T07:00:00Z',lastPromptAnsweredAt:null}},
    });
    expect(candidateScore(candidate,base,new Date('2026-09-24T08:00:00Z'))).toBeGreaterThan(candidate.basePriority);
    const risk={...candidate,key:'risk',basePriority:140,roomKey:'solvency' as const};
    expect(candidateScore(risk,base,new Date('2026-09-24T08:00:00Z'))).toBeGreaterThan(candidateScore(candidate,base,new Date('2026-09-24T08:00:00Z')));
  });
});
