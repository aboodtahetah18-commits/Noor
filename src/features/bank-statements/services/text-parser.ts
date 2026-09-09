import type { ParsedStatementRow,DetectedKind,StatementDirection } from '../types/bank-statement';
import { cleanBankDescription } from './bank-adapters';

function westernDigits(value:string){return value.replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));}
function isoDate(input:string):string|null{
  const v=westernDigits(input.trim());
  let m=v.match(/^(\d{4})[-\/.]([01]?\d)[-\/.]([0-3]?\d)$/);
  if(m&&m[1]&&m[2]&&m[3])return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=v.match(/^([0-3]?\d)[-\/.]([01]?\d)[-\/.](\d{4})$/);
  if(m&&m[1]&&m[2]&&m[3])return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return null;
}
function moneyValue(input:string):number|null{
  const s=westernDigits(input).replace(/[٬,\s]/g,'').replace('٫','.').replace(/[()]/g,'');
  const cleaned=s.replace(/[^0-9.\-]/g,'');
  if(!cleaned)return null;
  const n=Number(cleaned);return Number.isFinite(n)?n:null;
}
function classify(description:string,direction:StatementDirection):{kind:DetectedKind;confidence:number}{
  const d=description.toLowerCase();
  if(/استرداد|مرتجع|refund|reversal/.test(d))return {kind:'REFUND',confidence:94};
  if(/رسوم|عمولة|fee|charge/.test(d))return {kind:'FEE',confidence:96};
  if(/تحويل|حوالة|transfer/.test(d))return {kind:'TRANSFER',confidence:90};
  if(direction==='CREDIT'&&/راتب|salary|payroll/.test(d))return {kind:'INCOME',confidence:98};
  return {kind:direction==='CREDIT'?'INCOME':'EXPENSE',confidence:direction==='CREDIT'?72:70};
}
function normalizeMerchant(description:string):string|null{
  const value=description.toLowerCase().replace(/[0-9٠-٩]{3,}/g,' ').replace(/\b(pos|mada|visa|mastercard|purchase|payment|عملية|شراء|مدى|بطاقة)\b/gi,' ').replace(/[^\p{L}\s]/gu,' ').replace(/\s+/g,' ').trim();
  return value.length>=2?value.slice(0,160):null;
}

export function parseBankStatementText(text:string,bankName?:string|null):ParsedStatementRow[]{
  const lines=text.replace(/\u0000/g,' ').split(/\r?\n/).map(v=>v.replace(/\s+/g,' ').trim()).filter(Boolean);
  const result:ParsedStatementRow[]=[];
  const dateRx=/(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}|\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4})/;
  const amountRx=/[-(]?[0-9٠-٩][0-9٠-٩٬,]*(?:[٫.][0-9٠-٩]{1,2})?\)?/g;
  for(let i=0;i<lines.length;i+=1){
    const line=lines[i]??'';
    const dm=line.match(dateRx); if(!dm?.[1])continue;
    const txDate=isoDate(dm[1]); if(!txDate)continue;
    const afterDate=line.replace(dm[0],' ').trim();
    const tokens=[...afterDate.matchAll(amountRx)].map(m=>({raw:m[0],index:m.index??0,value:moneyValue(m[0])})).filter(x=>x.value!==null);
    if(tokens.length===0)continue;
    const amountToken=tokens[0]; if(!amountToken||amountToken.value===null)continue;
    const rawAmount=amountToken.value;
    if(Math.abs(rawAmount)<=0)continue;
    let direction:StatementDirection=rawAmount<0?'DEBIT':'DEBIT';
    if(/دائن|إيداع|ايداع|credit|deposit|راتب|salary|وارد/.test(afterDate.toLowerCase()))direction='CREDIT';
    if(/مدين|خصم|سحب|debit|withdrawal|شراء|purchase|pos|رسوم/.test(afterDate.toLowerCase()))direction='DEBIT';
    const description=cleanBankDescription((afterDate.slice(0,amountToken.index)+' '+afterDate.slice(amountToken.index+amountToken.raw.length)).replace(amountRx,' ').trim(),bankName);
    if(!description)continue;
    const cls=classify(description,direction);
    result.push({rowNumber:i+1,transactionDate:txDate,description,amount:Math.abs(rawAmount).toFixed(2),direction,detectedKind:cls.kind,normalizedMerchant:normalizeMerchant(description),confidence:Math.min(cls.confidence,90),reviewStatus:'NEEDS_REVIEW',rawPayload:line.slice(0,4000)});
  }
  if(result.length===0)throw new Error('تمت قراءة نص PDF، لكن لم أتمكن من تحديد صفوف عمليات موثوقة. جرّب CSV أو XLSX لهذا الكشف.');
  if(result.length>3000)throw new Error('الكشف يحتوي أكثر من 3000 عملية. قسّمه إلى ملفات أصغر.');
  return result;
}
