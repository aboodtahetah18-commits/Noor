import { Money } from '@/financial-engine/money';
import type { ParsedStatementRow, DetectedKind } from '../types/bank-statement';

type MerchantRule = { id:string; normalizedMerchant:string; detectedKind:DetectedKind; categoryId:string|null; confidence:number; approvalMode?:'AUTO'|'REVIEW'|'CONFIRM'; priority?:number; matchedAccountId?:string|null; correctionCount?:number; confirmationCount?:number };
type OwnAccount = { id:string; name:string; bankName:string|null; accountNumber:string|null; iban:string|null; cardLast4:string|null };
type TransactionCandidate = { id:string; accountId:string|null; amount:string; transactionDate:string; transactionType:string; description:string|null };
type HistoricMerchantRow = { normalizedMerchant:string|null; transactionDate:string|null; amount:string; direction:'DEBIT'|'CREDIT' };

export type IntelligentStatementRow = ParsedStatementRow & {
  categoryId: string | null;
  merchantRuleId: string | null;
  matchedAccountId: string | null;
  matchedTransactionId: string | null;
  duplicateCandidate: boolean;
  duplicateScore: number;
  recurringCandidate: boolean;
  recurringIntervalDays: number | null;
  recurringScore: number;
  decisionSource: 'HEURISTIC'|'MERCHANT_RULE'|'INTERNAL_TRANSFER'|'DUPLICATE_MATCH';
  decisionReason: string;
};

function dayDistance(a:string|null,b:string):number {
  if(!a) return 999;
  const x=Date.parse(`${a}T00:00:00Z`), y=Date.parse(`${b}T00:00:00Z`);
  if(!Number.isFinite(x)||!Number.isFinite(y)) return 999;
  return Math.abs(Math.round((x-y)/86400000));
}
function digits(value:string|null){return (value??'').replace(/\D/g,'');}
function containsAccountIdentifier(description:string, account:OwnAccount):boolean {
  const raw=description.toLowerCase();
  const numeric=digits(description);
  const iban=digits(account.iban);
  const acct=digits(account.accountNumber);
  if(iban.length>=8 && numeric.includes(iban.slice(-8))) return true;
  if(acct.length>=6 && numeric.includes(acct.slice(-6))) return true;
  if(account.cardLast4 && numeric.includes(account.cardLast4)) return true;
  const bank=(account.bankName??'').trim().toLowerCase();
  const name=account.name.trim().toLowerCase();
  return Boolean(bank && name && raw.includes(bank) && raw.includes(name));
}
function kindMatchesTransaction(kind:DetectedKind, type:string, direction:'DEBIT'|'CREDIT') {
  if(direction==='DEBIT') return ['EXPENSE','TRANSFER','OBLIGATION_PAYMENT','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','GOAL_CONTRIBUTION'].includes(type);
  if(kind==='REFUND') return type==='REFUND';
  return ['INCOME','REFUND','TRANSFER'].includes(type);
}
function merchantTokens(value:string):Set<string>{
  return new Set(value.toLowerCase().replace(/[^\p{L}\s]/gu,' ').split(/\s+/).map(v=>v.trim()).filter(v=>v.length>1));
}
function merchantSimilarity(a:string,b:string):number{
  if(a===b)return 1;
  const A=merchantTokens(a), B=merchantTokens(b);
  if(A.size===0||B.size===0)return 0;
  let intersection=0;
  for(const token of A)if(B.has(token))intersection+=1;
  const union=new Set([...A,...B]).size;
  const jaccard=union?intersection/union:0;
  const compactA=a.replace(/\s+/g,''), compactB=b.replace(/\s+/g,'');
  const containment=(compactA.includes(compactB)||compactB.includes(compactA))?0.9:0;
  return Math.max(jaccard,containment);
}
function findMerchantRule(value:string|null,rules:MerchantRule[]):{rule:MerchantRule;similarity:number}|null{
  if(!value)return null;
  let best:{rule:MerchantRule;similarity:number}|null=null;
  for(const rule of [...rules].sort((a,b)=>(b.priority??100)-(a.priority??100))){
    const similarity=merchantSimilarity(value,rule.normalizedMerchant);
    if(similarity>=0.78 && (!best||similarity>best.similarity || (similarity===best.similarity && (rule.priority??100)>(best.rule.priority??100))))best={rule,similarity};
  }
  return best;
}
function recurringSignal(row:ParsedStatementRow, history:HistoricMerchantRow[]):{candidate:boolean;interval:number|null;score:number}{
  const normalizedMerchant=row.normalizedMerchant;
  const transactionDate=row.transactionDate;
  if(!normalizedMerchant||!transactionDate)return {candidate:false,interval:null,score:0};
  const comparable=history
    .filter(h=>Boolean(h.normalizedMerchant && h.transactionDate) && merchantSimilarity(normalizedMerchant,h.normalizedMerchant as string)>=0.82 && h.direction===row.direction)
    .filter((h)=>{
      const target=Money.parse(row.amount);
      const difference=Money.parse(h.amount).subtract(target).abs();
      const percentageTolerance=Money.fromMinorUnits((target.minorUnits*12n+50n)/100n);
      const tolerance=percentageTolerance.compare(Money.parse('5.00'))>=0?percentageTolerance:Money.parse('5.00');
      return difference.compare(tolerance)<=0;
    })
    .map(h=>({date:h.transactionDate as string,days:dayDistance(h.transactionDate,transactionDate)}))
    .filter(h=>h.days>=20&&h.days<=100)
    .sort((a,b)=>a.days-b.days);
  if(comparable.length===0)return {candidate:false,interval:null,score:0};
  const nearest=comparable[0];
  if(!nearest)return {candidate:false,interval:null,score:0};
  let score=78;
  if(nearest.days>=25&&nearest.days<=35)score=94;
  else if(nearest.days>=50&&nearest.days<=70)score=90;
  else if(nearest.days>=80&&nearest.days<=100)score=86;
  return {candidate:true,interval:nearest.days,score};
}

export function enrichStatementRows(rows:ParsedStatementRow[], sourceAccountId:string, rules:MerchantRule[], accounts:OwnAccount[], txs:TransactionCandidate[], history:HistoricMerchantRow[]=[]): IntelligentStatementRow[] {
  return rows.map((row)=>{
    let kind=row.detectedKind;
    let confidence=row.confidence;
    let categoryId:string|null=null;
    let merchantRuleId:string|null=null;
    let matchedAccountId:string|null=null;
    let matchedTransactionId:string|null=null;
    let duplicateCandidate=false;
    let duplicateScore=0;
    let decisionSource:IntelligentStatementRow['decisionSource']='HEURISTIC';
    let decisionReason='تحليل أولي من وصف العملية واتجاهها';
    let matchedRule:MerchantRule|null=null;

    const match=findMerchantRule(row.normalizedMerchant,rules);
    if(match){
      const {rule,similarity}=match;
      kind=rule.detectedKind;
      categoryId=rule.categoryId;
      merchantRuleId=rule.id;
      confidence=Math.max(similarity===1?97:95,Number(rule.confidence)||95);
      decisionSource='MERCHANT_RULE';
      matchedRule=rule;
      matchedAccountId=rule.matchedAccountId??null;
      decisionReason=`قاعدة محفوظة للتاجر · أولوية ${rule.priority??100}`;
    }

    if(kind==='TRANSFER'){
      const target=accounts.find(a=>a.id!==sourceAccountId && containsAccountIdentifier(row.description,a));
      if(target){
        matchedAccountId=target.id;
        confidence=99;
        decisionSource='INTERNAL_TRANSFER';
        decisionReason='تم التعرف على حساب آخر تملكه داخل وصف التحويل';
      }
    }

    const transactionDate=row.transactionDate;
    if(transactionDate){
      const candidate=txs
        .filter(t=>t.accountId===sourceAccountId && Money.parse(t.amount).compare(Money.parse(row.amount))===0 && kindMatchesTransaction(kind,t.transactionType,row.direction))
        .map(t=>({t,days:dayDistance(transactionDate,t.transactionDate)}))
        .filter(x=>x.days<=1)
        .sort((a,b)=>a.days-b.days)[0];
      if(candidate){
        duplicateCandidate=true;
        matchedTransactionId=candidate.t.id;
        duplicateScore=candidate.days===0?99:92;
        confidence=Math.max(confidence,duplicateScore);
        decisionSource='DUPLICATE_MATCH';
        decisionReason='توجد عملية مسجلة بنفس الحساب والمبلغ وبتاريخ قريب';
      }
    }

    const recurring=recurringSignal(row,history);
    const ruleMode=matchedRule?.approvalMode??'REVIEW';
    const hasLearningConflict=Boolean(matchedRule && (matchedRule.correctionCount??0)>0 && (matchedRule.correctionCount??0)*2>=Math.max(1,matchedRule.confirmationCount??0));
    const auto = Boolean(matchedAccountId) || Boolean(merchantRuleId && confidence>=95 && ruleMode==='AUTO' && !hasLearningConflict);
    const forceReview=duplicateCandidate || Boolean(merchantRuleId && (ruleMode==='REVIEW'||ruleMode==='CONFIRM'||hasLearningConflict));
    const reviewStatus=forceReview?'NEEDS_REVIEW':auto?'AUTO':row.reviewStatus;
    if(hasLearningConflict) decisionReason+=' · توجد تصحيحات سابقة لهذا التاجر، لذلك يحتاج مراجعة';
    else if(matchedRule && ruleMode==='CONFIRM') decisionReason+=' · يتطلب تأكيدك دائمًا';
    else if(matchedRule && ruleMode==='REVIEW') decisionReason+=' · يعرض للمراجعة قبل الاعتماد';
    else if(matchedRule && ruleMode==='AUTO') decisionReason+=' · يسمح بالاعتماد التلقائي';
    return {...row,detectedKind:kind,confidence,reviewStatus,categoryId,merchantRuleId,matchedAccountId,matchedTransactionId,duplicateCandidate,duplicateScore,recurringCandidate:recurring.candidate,recurringIntervalDays:recurring.interval,recurringScore:recurring.score,decisionSource,decisionReason};
  });
}
