import type { IntelligentStatementRow } from './intelligence';
import type { MerchantMatchingRule } from '../queries/list-merchant-matching-rules';

export type SafeMessageDecision={
  eligible:boolean;
  reason:string;
  exactRuleId:string|null;
};

export function decideSafeMessageAutoPost(row:IntelligentStatementRow,rules:MerchantMatchingRule[]):SafeMessageDecision{
  if(!row.transactionDate)return {eligible:false,reason:'تاريخ العملية غير محسوم',exactRuleId:null};
  if(!row.transactionTime)return {eligible:false,reason:'وقت العملية غير متوفر، لذلك يلزم التحقق من عدم التكرار',exactRuleId:null};
  if(row.duplicateCandidate)return {eligible:false,reason:'توجد شبهة تكرار تحتاج قرار المستخدم',exactRuleId:null};
  if(row.matchedAccountId)return {eligible:false,reason:'العملية مرتبطة بتحويل/حساب مقابل وتحتاج مراجعة السياق',exactRuleId:null};
  if(row.direction!=='DEBIT'||!(row.detectedKind==='EXPENSE'||row.detectedKind==='FEE'))return {eligible:false,reason:'الاعتماد المنضبط مخصص للمشتريات/المصروفات المعروفة فقط',exactRuleId:null};
  if(!row.categoryId)return {eligible:false,reason:'لا يوجد بند مالي موثوق للعملية',exactRuleId:null};
  if(!row.normalizedMerchant)return {eligible:false,reason:'اسم التاجر غير واضح',exactRuleId:null};
  const exact=rules.find(r=>r.normalizedMerchant===row.normalizedMerchant && r.id===row.merchantRuleId);
  if(!exact)return {eligible:false,reason:'مطابقة التاجر ليست حرفية مع اسم معتمد',exactRuleId:null};
  const conflict=exact.correctionCount>0 && exact.correctionCount*2>=Math.max(1,exact.confirmationCount);
  if(conflict)return {eligible:false,reason:'للتاجر تصحيحات متعارضة سابقة',exactRuleId:exact.id};
  if(exact.approvalMode!=='AUTO')return {eligible:false,reason:'قاعدة التاجر لم تعتمد بعد للمعالجة التلقائية',exactRuleId:exact.id};
  return {eligible:true,reason:'اسم التاجر مطابق حرفيًا لقاعدة معتمدة، والبند معروف، ولا توجد شبهة تكرار أو سياق خاص',exactRuleId:exact.id};
}
