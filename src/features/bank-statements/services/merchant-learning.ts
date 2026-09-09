import { rawSql } from '@/infrastructure/db/client';

export type MerchantLearningState = 'NEW'|'LIKELY'|'TRUSTED'|'CONFLICT';

export function deriveMerchantLearningState(confirmationCount:number, correctionCount:number):MerchantLearningState {
  const confirmations=Math.max(0,Number(confirmationCount)||0);
  const corrections=Math.max(0,Number(correctionCount)||0);
  if(corrections>0 && corrections*2>=Math.max(1,confirmations)) return 'CONFLICT';
  if(confirmations>=5 && corrections<=1) return 'TRUSTED';
  if(confirmations>=2) return 'LIKELY';
  return 'NEW';
}

type RecordDecisionInput = {
  userId:string;
  ruleId:string|null;
  rowId:string;
  normalizedMerchant:string|null;
  suggestedKind:string|null;
  chosenKind:string;
  suggestedCategoryId:string|null;
  chosenCategoryId:string|null;
  isNewRule:boolean;
};

export async function recordMerchantLearningDecision(input:RecordDecisionInput) {
  const corrected = !input.isNewRule && Boolean(
    (input.suggestedKind && input.suggestedKind!==input.chosenKind) ||
    ((input.suggestedCategoryId??null)!==(input.chosenCategoryId??null))
  );
  const decisionType=input.isNewRule?'NEW_RULE':corrected?'CORRECTED':'CONFIRMED';

  if(input.ruleId){
    if(corrected){
      await rawSql`update public.merchant_rules
        set correction_count=correction_count+1,last_corrected_at=now(),confidence=greatest(60,confidence-10),approval_mode='REVIEW'
        where id=${input.ruleId} and user_id=${input.userId}`;
    } else {
      await rawSql`update public.merchant_rules
        set last_confirmed_at=now(),confidence=least(100,confidence+2)
        where id=${input.ruleId} and user_id=${input.userId}`;
    }
  }

  await rawSql`insert into public.merchant_learning_events(
      user_id,merchant_rule_id,bank_statement_row_id,normalized_merchant,
      suggested_kind,chosen_kind,suggested_category_id,chosen_category_id,decision_type)
    values(${input.userId},${input.ruleId},${input.rowId},${input.normalizedMerchant},
      ${input.suggestedKind},${input.chosenKind},${input.suggestedCategoryId},${input.chosenCategoryId},${decisionType})`;
  return {decisionType,corrected};
}
