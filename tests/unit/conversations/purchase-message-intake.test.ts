import { describe, expect, it } from 'vitest';
import { parsePurchaseMessage } from '@/lib/conversations/purchase-message-intake';

describe('purchase message intake',()=>{
  it('parses PoS purchase without assuming the ambiguous عبر identifier is a card number',()=>{
    const parsed=parsePurchaseMessage(`شراء PoS
عبر:2361;مدى-أثير
بـSAR 5
لـmaqhaa sh
19/9/26 23:07`);
    expect(parsed).toMatchObject({
      kind:'POS',
      amount:5,
      currency:'SAR',
      transactionDate:'2026-09-19',
      transactionTime:'23:07',
      merchantRaw:'maqhaa sh',
      cardLast4:null,
      instrumentHint:'2361',
    });
  });

  it('parses online card purchase with card account merchant and remaining balance',()=>{
    const parsed=parsePurchaseMessage(`شراء عبر الإنترنت
بطاقة: **6883 VISA
مبلغ: 30.75 SAR
حساب: **9702
لدى: APPLE.COM/BILL
في: 2026-09-16 13:22
الرصيد المتبقي: ريال 28.75`);
    expect(parsed).toMatchObject({
      kind:'ONLINE',
      amount:30.75,
      transactionDate:'2026-09-16',
      transactionTime:'13:22',
      merchantRaw:'APPLE.COM/BILL',
      cardLast4:'6883',
      accountLast4:'9702',
      remainingBalance:28.75,
    });
  });

  it('parses AlinmaPay internet purchase and leaves missing merchant unknown',()=>{
    const parsed=parsePurchaseMessage(`شراء انترنت
بـ585 SAR
من 0104*
من AlinmaPay
مدى *9943
في 18/08/26 16:45`);
    expect(parsed).toMatchObject({
      kind:'ONLINE',
      amount:585,
      transactionDate:'2026-08-18',
      transactionTime:'16:45',
      merchantRaw:null,
      cardLast4:'9943',
    });
  });
});
