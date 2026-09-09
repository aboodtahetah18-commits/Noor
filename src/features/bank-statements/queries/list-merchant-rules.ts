import { rawSql } from '@/infrastructure/db/client';

export type MerchantRuleListItem = {
  id:string; normalizedMerchant:string; displayName:string; detectedKind:string; categoryId:string|null;
  categoryName:string|null; approvalMode:'AUTO'|'REVIEW'|'CONFIRM'; priority:number; matchedAccountId:string|null;
  matchedAccountName:string|null; confidence:number; confirmationCount:number; correctionCount:number; learningState:'NEW'|'LIKELY'|'TRUSTED'|'CONFLICT'; isActive:boolean; notes:string|null;
  aliases:Array<{id:string; normalizedAlias:string; displayAlias:string|null; confirmationCount:number; isActive:boolean; city:string|null; branchLabel:string|null}>;
};

export async function listMerchantRules(userId:string):Promise<MerchantRuleListItem[]> {
  const rows=await rawSql`
    select r.id,r.normalized_merchant as "normalizedMerchant",r.display_name as "displayName",r.detected_kind as "detectedKind",
      r.category_id as "categoryId",c.name as "categoryName",r.approval_mode as "approvalMode",r.priority,
      r.matched_account_id as "matchedAccountId",a.name as "matchedAccountName",r.confidence::float8 as confidence,
      r.confirmation_count as "confirmationCount",coalesce(r.correction_count,0) as "correctionCount",
      case
        when coalesce(r.correction_count,0)>0 and coalesce(r.correction_count,0)*2>=greatest(1,r.confirmation_count) then 'CONFLICT'
        when r.confirmation_count>=5 and coalesce(r.correction_count,0)<=1 then 'TRUSTED'
        when r.confirmation_count>=2 then 'LIKELY'
        else 'NEW'
      end as "learningState",r.is_active as "isActive",r.notes,
      coalesce((
        select json_agg(json_build_object(
          'id',ma.id,
          'normalizedAlias',ma.normalized_alias,
          'displayAlias',ma.display_alias,
          'confirmationCount',ma.confirmation_count,
          'isActive',ma.is_active,
          'city',ma.city,
          'branchLabel',ma.branch_label
        ) order by ma.is_active desc,ma.updated_at desc)
        from public.merchant_rule_aliases ma
        where ma.user_id=r.user_id and ma.merchant_rule_id=r.id
      ),'[]'::json) as aliases
    from public.merchant_rules r
    left join public.budget_categories c on c.id=r.category_id and c.user_id=r.user_id
    left join public.accounts a on a.id=r.matched_account_id and a.user_id=r.user_id
    where r.user_id=${userId}
    order by r.is_active desc,r.priority desc,r.updated_at desc`;
  return rows as unknown as MerchantRuleListItem[];
}
