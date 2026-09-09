'use server';
import { randomUUID } from 'node:crypto';
import { OBLIGATION_RECURRENCES, type ObligationRecurrence } from '@/domain/types';import { redirect } from 'next/navigation';import { revalidatePath } from 'next/cache';import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';import { startOnboarding } from '@/features/onboarding/commands/start-onboarding';import { createAccount } from '@/features/accounts/commands/create-account';import { deriveAccountType } from '@/features/accounts/account-name-options';import { bankByName } from '@/features/accounts/banks';import { setupFirstIncome } from '@/features/onboarding/commands/setup-first-income';import { markOnboardingStep } from '@/features/onboarding/commands/mark-onboarding-step';import { createObligationTemplate } from '@/features/obligations/commands/create-obligation-template';import { getOnboardingStatus } from '@/features/onboarding/queries/get-onboarding-status';import { finalizeOnboarding } from '@/features/onboarding/commands/finalize-onboarding';import { createManualOnboardingPlan } from '@/features/financial-plan/commands/create-manual-onboarding-plan';import { approvePlan } from '@/features/financial-plan/commands/approve-plan';
export async function startOnboardingAction(){const u=await requireAuthenticatedMutationUser();await startOnboarding(u.id);redirect('/onboarding/accounts')}
export async function addOnboardingAccountAction(f:FormData){const u=await requireAuthenticatedMutationUser();const name=String(f.get('name')??'').trim();const bankName=String(f.get('bankName')??'').trim();const bank=bankByName(bankName);const iban=String(f.get('iban')??'').replace(/\s+/g,'').toUpperCase();const r=await createAccount(u.id,{name,accountType:deriveAccountType(name),openingBalance:f.get('openingBalance'),effectiveDate:f.get('effectiveDate'),bankCode:bank?.code,bankName:bank?.name ?? (bankName || undefined),accountNumber:iban?iban.slice(6):undefined,iban,cardLast4:f.get('cardLast4')});if(!r.success)redirect('/onboarding/accounts?error='+encodeURIComponent(r.message));redirect('/onboarding/accounts?created=1')}
export async function continueFromAccountsAction(){const u=await requireAuthenticatedMutationUser();const s=await getOnboardingStatus(u.id);if(s.accountsCount<1)redirect('/onboarding/accounts?error='+encodeURIComponent('أضف حسابًا واحدًا على الأقل قبل المتابعة'));await markOnboardingStep(u.id,3);redirect('/onboarding/income')}
export async function setupFirstIncomeAction(f:FormData){const u=await requireAuthenticatedMutationUser();const r=await setupFirstIncome(u.id,{cycleName:String(f.get('cycleName')??''),startDate:String(f.get('startDate')??''),expectedNextIncomeDate:String(f.get('expectedNextIncomeDate')??''),sourceName:String(f.get('sourceName')??''),expectedAmount:String(f.get('expectedAmount')??''),expectedDate:String(f.get('expectedDate')??''),incomeKind:String(f.get('incomeKind')??'SALARY'),isPrimary:String(f.get('isPrimary')??'')==='on'});if(!r.success)redirect('/onboarding/income?error='+encodeURIComponent(r.message));redirect('/onboarding/obligations')}
function parseRecurrence(value:string):ObligationRecurrence|undefined{return OBLIGATION_RECURRENCES.find(item=>item===value)}

export async function addOnboardingObligationAction(f:FormData){const u=await requireAuthenticatedMutationUser();const priority=String(f.get('priority')??'');const recurrence=parseRecurrence(String(f.get('recurrence')??'MONTHLY'));if(!recurrence)redirect('/onboarding/obligations?error='+encodeURIComponent('قيمة تكرار الالتزام غير صالحة'));const r=await createObligationTemplate(u.id,{name:String(f.get('name')??''),defaultAmount:String(f.get('defaultAmount')??''),recurrence,priority:priority?Number(priority):undefined,firstDueDate:String(f.get('firstDueDate')??''),idempotencyKey:randomUUID()});if(!r.success)redirect('/onboarding/obligations?error='+encodeURIComponent(r.message));revalidatePath('/onboarding/obligations');redirect('/onboarding/obligations?created=1')}
export async function continueFromObligationsAction(){const u=await requireAuthenticatedMutationUser();await markOnboardingStep(u.id,5,{obligationsReviewed:true});redirect('/onboarding/controls')}
export async function continueFromControlsAction(){const u=await requireAuthenticatedMutationUser();await markOnboardingStep(u.id,6,{controlsReviewed:true});redirect('/onboarding/plan')}
export async function completeOnboardingAction(){const u=await requireAuthenticatedMutationUser();const r=await finalizeOnboarding(u.id);if(!r.success)redirect('/onboarding/plan?error='+encodeURIComponent(r.message));redirect('/dashboard')}

export async function updateOnboardingIncomeAction(f:FormData){
  const u=await requireAuthenticatedMutationUser();const cycleId=String(f.get('cycleId')??'');
  const cycleName=String(f.get('cycleName')??'').trim(),startDate=String(f.get('startDate')??''),expectedNextIncomeDate=String(f.get('expectedNextIncomeDate')??'');
  const sourceName=String(f.get('sourceName')??'').trim(),expectedAmount=String(f.get('expectedAmount')??''),expectedDate=String(f.get('expectedDate')??''),incomeKind=String(f.get('incomeKind')??'SALARY'),isPrimary=String(f.get('isPrimary')??'')==='on';
  const { rawSql }=await import('@/infrastructure/db/client');
  if(!cycleId||!cycleName||!sourceName||!/^\d+(?:\.\d{1,2})?$/.test(expectedAmount))redirect('/onboarding/income?edit=1&error='+encodeURIComponent('تحقق من بيانات الدخل'));
  const rows=await rawSql`with c as (update public.financial_cycles set name=${cycleName},start_date=${startDate},expected_next_income_date=${expectedNextIncomeDate},updated_at=now() where id=${cycleId} and user_id=${u.id} and status='DRAFT' returning id),
  e as (update public.expected_incomes set source_name=${sourceName},expected_amount=${expectedAmount},expected_date=${expectedDate},income_kind=${incomeKind},is_primary=${isPrimary},updated_at=now() where user_id=${u.id} and cycle_id=${cycleId} and exists(select 1 from c) returning id)
  select (select count(*) from c)::int c,(select count(*) from e)::int e`;
  if(Number(rows[0]?.c)!==1)redirect('/onboarding/income?edit=1&error='+encodeURIComponent('تعذر تعديل الدورة بعد تفعيلها'));
  revalidatePath('/onboarding/income');revalidatePath('/onboarding/plan');redirect('/onboarding/plan?incomeUpdated=1');
}

function manualPlanItems(fd:FormData){
  const names=fd.getAll('itemName').map(v=>String(v).trim());
  const amounts=fd.getAll('plannedAmount').map(v=>String(v).trim());
  const types=fd.getAll('allocationType').map(v=>String(v).trim());
  const recurrence=fd.getAll('recurrenceKind').map(v=>String(v).trim());
  const intervals=fd.getAll('intervalCycles').map(v=>String(v).trim());
  const starts=fd.getAll('startCycleDate').map(v=>String(v).trim());
  const notes=fd.getAll('ruleNote').map(v=>String(v).trim());
  return names.map((name,i)=>({name,plannedAmount:amounts[i]??'',allocationType:types[i]??'ESSENTIAL',recurrenceKind:recurrence[i]??'MONTHLY',intervalCycles:Number(intervals[i]??1),startCycleDate:starts[i]??'',note:notes[i]??''}));
}
export async function createOnboardingPlanAction(fd:FormData){
  const u=await requireAuthenticatedMutationUser();
  const s=await getOnboardingStatus(u.id);
  if(!s.cycleId||s.expectedIncomeCount<1)redirect('/onboarding/income');
  if(!s.obligationsReviewed)redirect('/onboarding/obligations');
  if(!s.controlsReviewed)redirect('/onboarding/controls');
  if(s.planId)redirect('/onboarding/plan');
  const r=await createManualOnboardingPlan(u.id,{cycleId:String(fd.get('cycleId')??''),items:manualPlanItems(fd)});
  if(!r.success)redirect('/onboarding/plan?error='+encodeURIComponent(r.message));
  revalidatePath('/onboarding/plan');
  redirect('/onboarding/plan?created=1');
}
export async function approveOnboardingPlanAction(planId:string){
  const u=await requireAuthenticatedMutationUser();
  const s=await getOnboardingStatus(u.id);
  if(!s.planId||s.planId!==planId)redirect('/onboarding/plan?error='+encodeURIComponent('الخطة لا تتبع دورة الإعداد الحالية'));
  const r=await approvePlan(u.id,planId);
  if(!r.success)redirect('/onboarding/plan?error='+encodeURIComponent('تعذر اعتماد الخطة الأولى'));
  revalidatePath('/onboarding/plan');
  redirect('/onboarding/plan?approved=1');
}
