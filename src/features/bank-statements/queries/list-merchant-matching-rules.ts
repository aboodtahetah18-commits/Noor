import { rawSql } from '@/infrastructure/db/client';
import type { DetectedKind } from '../types/bank-statement';

export type MerchantMatchingRule = {
  id:string;
  normalizedMerchant:string;
  detectedKind:DetectedKind;
  categoryId:string|null;
  confidence:number;
  approvalMode:'AUTO'|'REVIEW'|'CONFIRM';
  priority:number;
  matchedAccountId:string|null;
  correctionCount:number;
  confirmationCount:number;
};

/**
 * Returns one matching row for the canonical merchant identity and one row for
 * each active alias. Every alias points back to the same merchant_rule id, so
 * classification learns one merchant identity without duplicating rules.
 */
export async function listMerchantMatchingRules(userId:string):Promise<MerchantMatchingRule[]> {
  const rows=await rawSql`
    select r.id,
           r.normalized_merchant as "normalizedMerchant",
           r.detected_kind as "detectedKind",
           r.category_id as "categoryId",
           r.confidence::float8 as confidence,
           r.approval_mode as "approvalMode",
           r.priority,
           r.matched_account_id as "matchedAccountId",
           coalesce(r.correction_count,0) as "correctionCount",
           r.confirmation_count as "confirmationCount"
      from public.merchant_rules r
     where r.user_id=${userId} and r.is_active=true
    union all
    select r.id,
           a.normalized_alias as "normalizedMerchant",
           r.detected_kind as "detectedKind",
           r.category_id as "categoryId",
           r.confidence::float8 as confidence,
           r.approval_mode as "approvalMode",
           r.priority,
           r.matched_account_id as "matchedAccountId",
           coalesce(r.correction_count,0) as "correctionCount",
           r.confirmation_count as "confirmationCount"
      from public.merchant_rule_aliases a
      join public.merchant_rules r
        on r.id=a.merchant_rule_id and r.user_id=a.user_id
     where a.user_id=${userId} and a.is_active=true and r.is_active=true`;
  return rows.map((r)=>({
    id:String(r.id),
    normalizedMerchant:String(r.normalizedMerchant),
    detectedKind:String(r.detectedKind) as DetectedKind,
    categoryId:r.categoryId?String(r.categoryId):null,
    confidence:Number(r.confidence),
    approvalMode:(r.approvalMode??'REVIEW') as 'AUTO'|'REVIEW'|'CONFIRM',
    priority:Number(r.priority??100),
    matchedAccountId:r.matchedAccountId?String(r.matchedAccountId):null,
    correctionCount:Number(r.correctionCount??0),
    confirmationCount:Number(r.confirmationCount??0),
  }));
}
