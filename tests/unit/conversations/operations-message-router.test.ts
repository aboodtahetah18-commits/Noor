import { describe, expect, it } from 'vitest';
import { looksLikePurchaseMessage, parsePurchaseMessage } from '@/lib/conversations/operations-message-router';

describe('governed purchase message routing',()=>{
  it('recognizes a Saudi purchase SMS and extracts amount and card suffix',()=>{
    const text='شراء عبر الانترنت VISA **6883 بمبلغ 30.75 ريال لدى APPLE.COM/BILL بتاريخ 2026-09-16';
    expect(looksLikePurchaseMessage(text)).toBe(true);
    expect(parsePurchaseMessage(text)).toMatchObject({
      amount:30.75,
      card_last4:'6883',
      merchant:'APPLE.COM/BILL',
      occurred_on:'2026-09-16',
      currency:'ريال سعودي',
    });
  });

  it('does not treat an ordinary amount discussion as a purchase message',()=>{
    expect(looksLikePurchaseMessage('هدفي ادخار 5000 ريال خلال سنة')).toBe(false);
  });
});
