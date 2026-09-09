import { Money } from '@/financial-engine/money';
import type { ParsedStatementRow,StatementDirection,DetectedKind } from '../types/bank-statement';
import { cleanBankDescription,detectSaudiBankFromText } from './bank-adapters';

export type ParsedBankMessage={row:ParsedStatementRow;cardLast4:string|null;bankName:string|null};
function western(v:string){return v.replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));}
function normalizeMerchant(d:string){const v=d.toLowerCase().replace(/[0-9٠-٩]{3,}/g,' ').replace(/[^\p{L}\s]/gu,' ').replace(/\s+/g,' ').trim();return v.length>1?v.slice(0,160):null;}
function pad2(v:string){return v.padStart(2,'0');}
function parseDateToken(text:string):{token:string|null,date:string|null}{
  const token=text.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/)?.[1]??null;
  if(!token)return {token:null,date:null};
  const p=token.split(/[-\/]/);
  const first=p[0]??'';
  const second=p[1]??'';
  const third=p[2]??'';
  let y='',m='',d='';
  if(first.length===4){y=first;m=second;d=third;}
  else if(third.length===4){d=first;m=second;y=third;}
  else {
    // Saudi bank SMS commonly emits YY/M/D, e.g. 26/8/29 for 2026-08-29.
    const yy=Number(first);
    if(yy>=20&&yy<=79){y=`20${pad2(first||'0')}`;m=second;d=third;}
    else {d=first;m=second;y=`20${pad2(third||'0')}`;}
  }
  const date=`${y}-${pad2(m)}-${pad2(d)}`;
  const parsed=Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(parsed)?{token,date}:{token,date:null};
}
export function parseBankMessage(message:string):ParsedBankMessage{
  const text=western(message.replace(/\s+/g,' ').trim()); if(text.length<8)throw new Error('الرسالة البنكية قصيرة جدًا.');
  const currencyFirst=text.match(/(?:SAR|SR|ر\.?س\.?|ريال)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
  const currencyLast=text.match(/([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:SAR|SR|ر\.?س\.?|ريال)/i);
  const amountNamed=text.match(/(?:مبلغ|amount)\s*[:\-]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
  const amountMatch=currencyFirst??currencyLast??amountNamed;
  let amount: Money;
  try {
    amount=Money.parse(amountMatch?.[1]?.replace(/,/g,'')??'');
  } catch {
    throw new Error('لم أتعرف على مبلغ العملية في الرسالة.');
  }
  if(!amount.isPositive())throw new Error('لم أتعرف على مبلغ العملية في الرسالة.');
  const cardLast4=text.match(/(?:بطاقة|card|عبر)[^0-9]{0,12}(?:\*|x|X|•)*\s*([0-9]{4})\b/i)?.[1]??null;
  const parsedDate=parseDateToken(text);
  const transactionDate=parsedDate.date;
  const transactionTime=text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)?.slice(1,3).join(':')??null;
  let direction:StatementDirection=/إيداع|ايداع|وارد|راتب|credit|deposit|received/i.test(text)?'CREDIT':'DEBIT';
  let kind:DetectedKind='EXPENSE',confidence=86;if(/تحويل|حوالة|transfer/i.test(text)){kind='TRANSFER';confidence=92;}else if(/استرداد|مرتجع|refund|reversal/i.test(text)){kind='REFUND';confidence=95;direction='CREDIT';}else if(/رسوم|عمولة|fee|charge/i.test(text)){kind='FEE';confidence=96;}else if(direction==='CREDIT'){kind='INCOME';confidence=/راتب|salary/i.test(text)?99:88;}
  const bank=detectSaudiBankFromText(text);
  const description=cleanBankDescription(text.replace(amountMatch?.[0]??'',' ').replace(parsedDate.token??'',' ').replace(transactionTime??'',' ').trim(),bank?.displayName??null).slice(0,500);
  return {cardLast4,bankName:bank?.displayName??null,row:{rowNumber:1,transactionDate,transactionTime,description,amount:amount.toString(),direction,detectedKind:kind,normalizedMerchant:normalizeMerchant(description),confidence,reviewStatus:confidence>=95?'AUTO':'NEEDS_REVIEW',rawPayload:message.slice(0,4000)}};
}
