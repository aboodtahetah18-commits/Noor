import { describe, expect, it } from 'vitest';
import {
  detectConversationIntent,
  recommendedConversationRoom,
} from '@/lib/conversations/reply-engine';

describe('cross-bank conversation routing contract', () => {
  it('routes protection and reserve topics to solvency', () => {
    expect(detectConversationIntent('أريد مراجعة احتياطي الطوارئ والسيولة')).toBe('reserve');
    expect(recommendedConversationRoom('reserve', 'central')).toBe('solvency');
  });

  it('routes investment and goal topics to assets', () => {
    expect(detectConversationIntent('هل أستثمر هذا المبلغ في صندوق؟')).toBe('investment');
    expect(recommendedConversationRoom('investment', 'central')).toBe('assets');

    expect(detectConversationIntent('عندي هدف شراء سيارة بعد سنة')).toBe('goal');
    expect(recommendedConversationRoom('goal', 'central')).toBe('assets');
  });

  it('routes financing topics to Hilal', () => {
    expect(detectConversationIntent('أحتاج تمويل 5000 ريال وسداد على 6 أشهر')).toBe('financing');
    expect(recommendedConversationRoom('financing', 'central')).toBe('hilal');
  });

  it('keeps baseline income and obligation topics with the central bank', () => {
    expect(detectConversationIntent('راتبي الصافي 12000 ريال')).toBe('income');
    expect(recommendedConversationRoom('income', 'assets')).toBe('central');

    expect(detectConversationIntent('الإيجار 2500 ريال شهريًا')).toBe('obligation');
    expect(recommendedConversationRoom('obligation', 'hilal')).toBe('central');
  });

  it('does not invent a transfer for a general message', () => {
    expect(detectConversationIntent('أريد مراجعة وضعي المالي بشكل عام')).toBe('general');
    expect(recommendedConversationRoom('general', 'advisor')).toBe('advisor');
    expect(recommendedConversationRoom('general', 'council')).toBe('council');
  });
});
