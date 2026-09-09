'use server';
import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { importBankStatementFile } from '@/features/bank-statements/commands/import-file';

export async function uploadBankStatementAction(formData:FormData) {
  const user = await requireAuthenticatedMutationUser('bank-statement-upload');
  const accountId = String(formData.get('accountId') ?? '').trim();
  const file = formData.get('statement');
  if (!accountId) redirect('/bank-statements?error=اختر الحساب أولًا');
  if (!(file instanceof File) || file.size===0) { redirect('/bank-statements?error=اختر ملف كشف الحساب'); return; }
  if (file.size > 8*1024*1024) redirect('/bank-statements?error=الحد الأقصى للملف 8MB');
  const lower = file.name.toLowerCase();
  if (!(lower.endsWith('.csv')||lower.endsWith('.xlsx')||lower.endsWith('.pdf'))) redirect('/bank-statements?error=استخدم ملف CSV أو XLSX أو PDF نصي');
  let importId = '';
  try {
    const result = await importBankStatementFile(user.id,accountId,file.name,await file.arrayBuffer());
    importId = result.importId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر تحليل كشف الحساب';
    redirect(`/bank-statements?error=${encodeURIComponent(message.slice(0,220))}`);
  }
  redirect(`/bank-statements/${importId}`);
}

export async function analyzeBankMessageAction(formData:FormData) {
  const user = await requireAuthenticatedMutationUser('bank-message-analyze');
  const message = String(formData.get('message') ?? '').trim();
  const accountId = String(formData.get('accountId') ?? '').trim() || null;
  if (!message) redirect('/bank-statements?error=ألصق الرسالة البنكية أولًا');
  if (message.length > 4000) redirect('/bank-statements?error=الرسالة البنكية طويلة جدًا');
  let importId='';
  try {
    const { importBankMessage } = await import('@/features/bank-statements/commands/import-message');
    const result=await importBankMessage(user.id,message,accountId);
    importId=result.importId;
    if(result.autoApproved) redirect(`/bank-operations?approved=1&importId=${importId}`);
  } catch(error) {
    const messageText=error instanceof Error?error.message:'تعذر تحليل الرسالة البنكية';
    redirect(`/bank-statements?error=${encodeURIComponent(messageText.slice(0,220))}`);
  }
  redirect(`/bank-statements/${importId}`);
}

export async function reviewBankStatementRowAction(formData:FormData) {
  const user = await requireAuthenticatedMutationUser('bank-statement-row-review');
  const importId=String(formData.get('importId')??'').trim();
  const rowId=String(formData.get('rowId')??'').trim();
  const detectedKind=String(formData.get('detectedKind')??'UNKNOWN').trim();
  const categoryId=String(formData.get('categoryId')??'').trim() || null;
  const matchedAccountId=String(formData.get('matchedAccountId')??'').trim() || null;
  const displayName=String(formData.get('displayName')??'').trim();
  const remember=formData.get('remember')==='on';
  const fundingCaseId=String(formData.get('fundingCaseId')??'').trim() || null;
  const applyScope=String(formData.get('applyScope')??'THIS_ONLY').trim();
  const allowed=['EXPENSE','INCOME','TRANSFER','REFUND','FEE','UNKNOWN'];
  if(!importId||!rowId||!allowed.includes(detectedKind)) redirect(`/bank-statements/${importId}?error=بيانات المراجعة غير مكتملة`);
  try {
    const { rawSql } = await import('@/infrastructure/db/client');
    const rows=await rawSql`select normalized_merchant as "normalizedMerchant",merchant_rule_id as "merchantRuleId",detected_kind as "suggestedKind",category_id as "suggestedCategoryId",amount::text as "rowAmount",description from public.bank_statement_rows where id=${rowId} and import_id=${importId} and user_id=${user.id} limit 1`;
    if(!rows[0]) throw new Error('العملية غير موجودة');
    if(categoryId){
      const cats=await rawSql`select id from public.budget_categories where id=${categoryId} and user_id=${user.id} and is_active=true limit 1`;
      if(!cats[0]) throw new Error('التصنيف غير صالح');
    }
    if(matchedAccountId){
      const accounts=await rawSql`select id from public.accounts where id=${matchedAccountId} and user_id=${user.id} and is_active=true limit 1`;
      if(!accounts[0]) throw new Error('الحساب المقابل غير صالح');
    }
    if(fundingCaseId){
      if(!(detectedKind==='EXPENSE'||detectedKind==='FEE')) throw new Error('ربط التمويل متاح للمصروفات فقط.');
      if(!categoryId) throw new Error('اختر البند قبل ربط العملية بتمويل.');
      const funding=await rawSql`select id from public.internal_funding_cases where id=${fundingCaseId} and user_id=${user.id} and status in ('PLANNING','ACTIVE') limit 1`;
      if(!funding[0]) throw new Error('التمويل المحدد غير نشط.');
    }
    let ruleId:string|null=rows[0].merchantRuleId?String(rows[0].merchantRuleId):null;
    const normalizedMerchant=rows[0].normalizedMerchant?String(rows[0].normalizedMerchant):'';
    if(remember && normalizedMerchant && displayName){
      if(ruleId){
        const existing=await rawSql`select id,normalized_merchant as "normalizedMerchant" from public.merchant_rules where id=${ruleId} and user_id=${user.id} limit 1`;
        if(existing[0]){
          await rawSql`update public.merchant_rules set detected_kind=${detectedKind},category_id=${categoryId},confidence=100,confirmation_count=confirmation_count+1,is_active=true where id=${ruleId} and user_id=${user.id}`;
          if(String(existing[0].normalizedMerchant)!==normalizedMerchant){
            const canonicalConflict=await rawSql`select id from public.merchant_rules where user_id=${user.id} and normalized_merchant=${normalizedMerchant} and id<>${ruleId} limit 1`;
            const aliasConflict=await rawSql`select merchant_rule_id as "merchantRuleId" from public.merchant_rule_aliases where user_id=${user.id} and normalized_alias=${normalizedMerchant} limit 1`;
            if(!canonicalConflict[0] && (!aliasConflict[0] || String(aliasConflict[0].merchantRuleId)===ruleId)){
              await rawSql`insert into public.merchant_rule_aliases(user_id,merchant_rule_id,normalized_alias,display_alias,is_active,confirmation_count)
                values(${user.id},${ruleId},${normalizedMerchant},${displayName.slice(0,160)},true,1)
                on conflict(user_id,normalized_alias) do update set is_active=true,confirmation_count=public.merchant_rule_aliases.confirmation_count+1`;
            }
          }
        } else {
          ruleId=null;
        }
      }
      if(!ruleId){
        const ruleRows=await rawSql`
          insert into public.merchant_rules(user_id,normalized_merchant,display_name,detected_kind,category_id,confidence,confirmation_count,is_active)
          values(${user.id},${normalizedMerchant},${displayName.slice(0,160)},${detectedKind},${categoryId},100,1,true)
          on conflict(user_id,normalized_merchant) do update set
            display_name=excluded.display_name,detected_kind=excluded.detected_kind,category_id=excluded.category_id,
            confidence=100,confirmation_count=public.merchant_rules.confirmation_count+1,is_active=true
          returning id`;
        ruleId=ruleRows[0]?String(ruleRows[0].id):null;
      }
    }
    const previousRuleId=rows[0].merchantRuleId?String(rows[0].merchantRuleId):null;
    if(normalizedMerchant && (remember || previousRuleId)){
      const { recordMerchantLearningDecision } = await import('@/features/bank-statements/services/merchant-learning');
      await recordMerchantLearningDecision({
        userId:user.id,
        ruleId:ruleId??previousRuleId,
        rowId,
        normalizedMerchant,
        suggestedKind:rows[0].suggestedKind?String(rows[0].suggestedKind):null,
        chosenKind:detectedKind,
        suggestedCategoryId:rows[0].suggestedCategoryId?String(rows[0].suggestedCategoryId):null,
        chosenCategoryId:categoryId,
        isNewRule:Boolean(remember && !previousRuleId),
      });
    }
    await rawSql`update public.bank_statement_rows set detected_kind=${detectedKind},category_id=${categoryId},matched_account_id=${matchedAccountId},funding_case_id=${fundingCaseId},merchant_rule_id=coalesce(${ruleId},merchant_rule_id),confidence=100,review_status='CONFIRMED',decision_source='USER' where id=${rowId} and import_id=${importId} and user_id=${user.id}`;
    const { recordBankDecision } = await import('@/features/bank-decisions/services/record-bank-decision');
    await recordBankDecision({userId:user.id,eventType:'ROW_CONFIRM',sourceType:'USER',sourceId:rowId,merchantRuleId:ruleId??previousRuleId,bankStatementRowId:rowId,importId,affectedCount:1,affectedAmount:String(rows[0].rowAmount??'0.00'),beforeState:{kind:rows[0].suggestedKind??null,categoryId:rows[0].suggestedCategoryId??null},afterState:{kind:detectedKind,categoryId,matchedAccountId,fundingCaseId},impactSummary:{financialPosting:false,merchantKnowledge:Boolean(remember||previousRuleId),contextGeneralized:false},reason:'اعتماد المستخدم لتصنيف العملية قبل ترحيلها المالي'});

    // Generalize confirmed merchant knowledge only when the user explicitly requests it.
    // Financial context is intentionally NOT generalized: funding, trip/goal links, counterpart accounts,
    // duplicate matches and transaction IDs stay untouched for every matching row.
    if(applyScope==='EXACT_MATCHES' && normalizedMerchant && (detectedKind==='EXPENSE'||detectedKind==='FEE') && categoryId){
      const directionRows=await rawSql`select direction from public.bank_statement_rows where id=${rowId} and user_id=${user.id} limit 1`;
      const direction=directionRows[0]?String(directionRows[0].direction):'';
      if(direction){
        const matching=await rawSql`select count(*)::int as count
          from public.bank_statement_rows r
          join public.bank_statement_imports i on i.id=r.import_id and i.user_id=r.user_id
          where r.user_id=${user.id}
            and r.id<>${rowId}
            and r.normalized_merchant=${normalizedMerchant}
            and r.direction=${direction}
            and r.review_status='NEEDS_REVIEW'
            and r.duplicate_candidate=false
            and r.matched_account_id is null
            and r.funding_case_id is null
            and i.status in ('REVIEW','READY')`;
        const matchedCount=Number(matching[0]?.count??0);
        await rawSql`update public.bank_statement_rows r set
          detected_kind=${detectedKind},
          category_id=${categoryId},
          merchant_rule_id=coalesce(${ruleId},r.merchant_rule_id),
          confidence=100,
          review_status='CONFIRMED',
          decision_source='USER',
          decision_reason='تم تطبيق تعريف التاجر الذي اعتمده المستخدم على العمليات المطابقة حرفيًا'
        from public.bank_statement_imports i
        where i.id=r.import_id and i.user_id=r.user_id
          and r.user_id=${user.id}
          and r.id<>${rowId}
          and r.normalized_merchant=${normalizedMerchant}
          and r.direction=${direction}
          and r.review_status='NEEDS_REVIEW'
          and r.duplicate_candidate=false
          and r.matched_account_id is null
          and r.funding_case_id is null
          and i.status in ('REVIEW','READY')`;
        if(ruleId){
          // Explicit batch confirmation means future exact merchant-name matches may be posted automatically,
          // but only after the strict duplicate/context checks in safe-message-auto-post.
          await rawSql`update public.merchant_rules set
            approval_mode='AUTO',
            confirmation_count=confirmation_count+${matchedCount},
            last_confirmed_at=now()
            where id=${ruleId} and user_id=${user.id}`;
        }
        if(matchedCount>0){
          const amountRows=await rawSql`select coalesce(sum(r.amount),0)::text as amount from public.bank_statement_rows r join public.bank_statement_imports i on i.id=r.import_id and i.user_id=r.user_id where r.user_id=${user.id} and r.id<>${rowId} and r.normalized_merchant=${normalizedMerchant} and r.direction=${direction} and r.review_status='CONFIRMED' and r.decision_reason='تم تطبيق تعريف التاجر الذي اعتمده المستخدم على العمليات المطابقة حرفيًا' and i.status in ('REVIEW','READY')`;
          await recordBankDecision({userId:user.id,eventType:'BATCH_MERCHANT_APPLY',sourceType:'USER',sourceId:rowId,merchantRuleId:ruleId,bankStatementRowId:rowId,importId,affectedCount:matchedCount,affectedAmount:String((amountRows[0] as { amount?: unknown } | undefined)?.amount??'0.00'),beforeState:{scope:'EXACT_MATCHES'},afterState:{kind:detectedKind,categoryId,normalizedMerchant},impactSummary:{financialPosting:false,merchantKnowledge:true,tripGoalFundingCopied:false},reason:'تطبيق تعريف التاجر والبند على الأسماء المطابقة حرفيًا فقط بعد موافقة المستخدم'});
        }
      }
    }

    await rawSql`update public.bank_statement_imports i set review_count=(select count(*) from public.bank_statement_rows r where r.import_id=i.id and r.review_status='NEEDS_REVIEW'),auto_classified_count=(select count(*) from public.bank_statement_rows r where r.import_id=i.id and r.review_status in ('AUTO','CONFIRMED')) where i.user_id=${user.id} and i.status in ('REVIEW','READY')`;
  } catch(error){
    const message=error instanceof Error?error.message:'تعذر حفظ المراجعة';
    redirect(`/bank-statements/${importId}?error=${encodeURIComponent(message.slice(0,180))}`);
  }
  redirect(`/bank-statements/${importId}`);
}

export async function approveBankStatementImportAction(formData:FormData) {
  const user = await requireAuthenticatedMutationUser('bank-statement-approve');
  const importId=String(formData.get('importId')??'').trim();
  const closingRaw=String(formData.get('closingBalance')??'').trim();
  if(!importId) redirect('/bank-statements?error=جلسة كشف الحساب غير محددة');
  const closingBalance=closingRaw===''?null:closingRaw.replace(/,/g,'');
  if(closingBalance!==null && (!/^\d+(?:\.\d{1,2})?$/.test(closingBalance)||Number(closingBalance)<0)) redirect(`/bank-statements/${importId}?error=${encodeURIComponent('رصيد البنك الختامي غير صالح')}`);
  try {
    const { approveBankStatementImport } = await import('@/features/bank-statements/commands/approve-import');
    await approveBankStatementImport(user.id,importId,closingBalance);
    const { rawSql }=await import('@/infrastructure/db/client');
    const summary=await rawSql`select count(*)::int as count,coalesce(sum(amount),0)::text as amount from public.bank_statement_rows where user_id=${user.id} and import_id=${importId} and review_status<>'NEEDS_REVIEW'`;
    const { recordBankDecision }=await import('@/features/bank-decisions/services/record-bank-decision');
    await recordBankDecision({userId:user.id,eventType:'IMPORT_APPROVE',sourceType:'USER',sourceId:importId,importId,affectedCount:Number(summary[0]?.count??1)||1,affectedAmount:String((summary[0] as { amount?: unknown } | undefined)?.amount??'0.00'),afterState:{closingBalance},impactSummary:{financialPosting:true},reason:'اعتماد المستخدم لدفعة العمليات البنكية بعد المراجعة'});
  } catch(error){
    const message=error instanceof Error?error.message:'تعذر اعتماد كشف الحساب';
    redirect(`/bank-statements/${importId}?error=${encodeURIComponent(message.slice(0,220))}`);
  }
  redirect(`/bank-statements/${importId}?approved=1`);
}

export async function saveMerchantRuleGovernanceAction(formData:FormData) {
  const user = await requireAuthenticatedMutationUser('merchant-rule-governance');
  const returnTo=String(formData.get('returnTo')??'/bank-statements').trim()==='/merchants'?'/merchants':'/bank-statements';
  const ruleId=String(formData.get('ruleId')??'').trim();
  const approvalMode=String(formData.get('approvalMode')??'REVIEW').trim();
  const priorityRaw=String(formData.get('priority')??'100').trim();
  const matchedAccountId=String(formData.get('matchedAccountId')??'').trim()||null;
  const notes=String(formData.get('notes')??'').trim()||null;
  if(!ruleId||!['AUTO','REVIEW','CONFIRM'].includes(approvalMode)) redirect(`${returnTo}?error=${encodeURIComponent('إعدادات القاعدة غير صالحة')}`);
  const priority=Number(priorityRaw);
  if(!Number.isInteger(priority)||priority<1||priority>999) redirect(`${returnTo}?error=${encodeURIComponent('أولوية القاعدة يجب أن تكون بين 1 و999')}`);
  try {
    const { rawSql } = await import('@/infrastructure/db/client');
    if(matchedAccountId){
      const account=await rawSql`select id from public.accounts where id=${matchedAccountId} and user_id=${user.id} and is_active=true limit 1`;
      if(!account[0]) throw new Error('الحساب المقابل غير صالح');
    }
    const before=await rawSql`select approval_mode as "approvalMode",priority,matched_account_id as "matchedAccountId",notes from public.merchant_rules where id=${ruleId} and user_id=${user.id} limit 1`;
    await rawSql`update public.merchant_rules set approval_mode=${approvalMode},priority=${priority},matched_account_id=${matchedAccountId},notes=${notes} where id=${ruleId} and user_id=${user.id}`;
    const { recordBankDecision }=await import('@/features/bank-decisions/services/record-bank-decision');
    await recordBankDecision({userId:user.id,eventType:'MERCHANT_RULE_UPDATE',sourceType:'USER',sourceId:ruleId,merchantRuleId:ruleId,beforeState:before[0]??null,afterState:{approvalMode,priority,matchedAccountId,notes},impactSummary:{futureMerchantMatching:true,financialPosting:false},reason:'تحديث المستخدم لحوكمة قاعدة التاجر'});
  } catch(error){
    const message=error instanceof Error?error.message:'تعذر تحديث القاعدة';
    redirect(`${returnTo}?error=${encodeURIComponent(message.slice(0,180))}`);
  }
  redirect(`${returnTo}?rules=updated`);
}

export async function toggleMerchantRuleAction(formData:FormData) {
  const user = await requireAuthenticatedMutationUser('merchant-rule-toggle');
  const ruleId=String(formData.get('ruleId')??'').trim();
  const enable=String(formData.get('enable')??'false')==='true';
  if(!ruleId) redirect('/bank-statements?error=القاعدة غير محددة');
  try {
    const { rawSql } = await import('@/infrastructure/db/client');
    await rawSql`update public.merchant_rules set is_active=${enable} where id=${ruleId} and user_id=${user.id}`;
  } catch(error){
    const message=error instanceof Error?error.message:'تعذر تحديث حالة القاعدة';
    redirect(`/bank-statements?error=${encodeURIComponent(message.slice(0,180))}`);
  }
  redirect('/bank-statements?rules=updated');
}

export async function addMerchantAliasAction(formData:FormData) {
  const user = await requireAuthenticatedMutationUser('merchant-alias-add');
  const ruleId=String(formData.get('ruleId')??'').trim();
  const returnTo=String(formData.get('returnTo')??'/bank-statements').trim()==='/merchants'?'/merchants':'/bank-statements';
  const aliasRaw=String(formData.get('alias')??'').trim();
  const city=String(formData.get('city')??'').trim()||null;
  const branchLabel=String(formData.get('branchLabel')??'').trim()||null;
  if(!ruleId||!aliasRaw) redirect(`${returnTo}?error=${encodeURIComponent('أدخل المسمى البديل')}`);
  try {
    const { rawSql } = await import('@/infrastructure/db/client');
    const { normalizeMerchantIdentity } = await import('@/features/bank-statements/services/normalize-merchant');
    const normalizedAlias=normalizeMerchantIdentity(aliasRaw);
    if(!normalizedAlias) throw new Error('المسمى البديل غير صالح.');
    const owner=await rawSql`select id,normalized_merchant as "normalizedMerchant" from public.merchant_rules where id=${ruleId} and user_id=${user.id} limit 1`;
    if(!owner[0]) throw new Error('التاجر غير موجود.');
    if(String(owner[0].normalizedMerchant)===normalizedAlias) throw new Error('هذا هو المسمى الأساسي للتاجر بالفعل.');
    const canonicalConflict=await rawSql`select id,display_name as "displayName" from public.merchant_rules where user_id=${user.id} and normalized_merchant=${normalizedAlias} and id<>${ruleId} limit 1`;
    if(canonicalConflict[0]) throw new Error(`هذا المسمى مستخدم كتاجر مستقل: ${String(canonicalConflict[0].displayName)}. راجعه قبل الدمج.`);
    const aliasConflict=await rawSql`select a.id,r.display_name as "displayName",a.merchant_rule_id as "merchantRuleId" from public.merchant_rule_aliases a join public.merchant_rules r on r.id=a.merchant_rule_id where a.user_id=${user.id} and a.normalized_alias=${normalizedAlias} limit 1`;
    if(aliasConflict[0] && String(aliasConflict[0].merchantRuleId)!==ruleId) throw new Error(`هذا المسمى مربوط مسبقًا بالتاجر: ${String(aliasConflict[0].displayName)}.`);
    await rawSql`
      insert into public.merchant_rule_aliases(user_id,merchant_rule_id,normalized_alias,display_alias,city,branch_label,is_active,confirmation_count)
      values(${user.id},${ruleId},${normalizedAlias},${aliasRaw.slice(0,160)},${city},${branchLabel},true,1)
      on conflict(user_id,normalized_alias) do update set
        display_alias=excluded.display_alias,
        city=coalesce(excluded.city,public.merchant_rule_aliases.city),
        branch_label=coalesce(excluded.branch_label,public.merchant_rule_aliases.branch_label),
        is_active=true,
        confirmation_count=public.merchant_rule_aliases.confirmation_count+1`;
    const { recordBankDecision }=await import('@/features/bank-decisions/services/record-bank-decision');
    await recordBankDecision({userId:user.id,eventType:'MERCHANT_ALIAS_ADD',sourceType:'USER',sourceId:ruleId,merchantRuleId:ruleId,afterState:{rawAlias:aliasRaw.slice(0,160),normalizedAlias,city,branchLabel},impactSummary:{futureMerchantMatching:true,financialPosting:false},reason:'إضافة اسم بنكي بديل للتاجر الموحد'});
  } catch(error) {
    const message=error instanceof Error?error.message:'تعذر إضافة المسمى البديل';
    redirect(`${returnTo}?error=${encodeURIComponent(message.slice(0,220))}`);
  }
  redirect(`${returnTo}?rules=updated`);
}

export async function toggleMerchantAliasAction(formData:FormData) {
  const user = await requireAuthenticatedMutationUser('merchant-alias-toggle');
  const aliasId=String(formData.get('aliasId')??'').trim();
  const returnTo=String(formData.get('returnTo')??'/bank-statements').trim()==='/merchants'?'/merchants':'/bank-statements';
  if(!aliasId) redirect(`${returnTo}?error=${encodeURIComponent('المسمى البديل غير محدد')}`);
  try {
    const { rawSql } = await import('@/infrastructure/db/client');
    const before=await rawSql`select merchant_rule_id as "merchantRuleId",display_alias as "displayAlias",is_active as "isActive" from public.merchant_rule_aliases where id=${aliasId} and user_id=${user.id} limit 1`;
    await rawSql`update public.merchant_rule_aliases set is_active=not is_active where id=${aliasId} and user_id=${user.id}`;
    if(before[0]){const { recordBankDecision }=await import('@/features/bank-decisions/services/record-bank-decision');await recordBankDecision({userId:user.id,eventType:'MERCHANT_ALIAS_TOGGLE',sourceType:'USER',sourceId:aliasId,merchantRuleId:String(before[0].merchantRuleId),beforeState:before[0],afterState:{isActive:!Boolean(before[0].isActive)},impactSummary:{futureMerchantMatching:true,financialPosting:false},reason:'تغيير حالة الاسم البنكي البديل'});}
  } catch(error) {
    const message=error instanceof Error?error.message:'تعذر تحديث المسمى البديل';
    redirect(`${returnTo}?error=${encodeURIComponent(message.slice(0,180))}`);
  }
  redirect(`${returnTo}?rules=updated`);
}
