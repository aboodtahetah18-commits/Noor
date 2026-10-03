'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { createAccount } from '@/features/accounts/commands/create-account';
import { deactivateAccount } from '@/features/accounts/commands/deactivate-account';
import { deriveAccountType } from '@/features/accounts/account-name-options';
import { bankByName } from '@/features/accounts/banks';

export async function createAccountAction(_previousState: { error?: string }, formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const name = String(formData.get('name') ?? '').trim();
  const bankNameInput = String(formData.get('bankName') ?? '').trim();
  const bank = bankByName(bankNameInput);
  const iban = String(formData.get('iban') ?? '').replace(/\s+/g, '').toUpperCase();
  const result = await createAccount(user.id, {
    name,
    accountType: deriveAccountType(name),
    openingBalance: formData.get('openingBalance'),
    effectiveDate: formData.get('effectiveDate'),
    bankCode: bank?.code,
    bankName: bank?.name ?? (bankNameInput || undefined),
    accountNumber: iban ? iban.slice(6) : undefined,
    iban,
    cardLast4: formData.get('cardLast4'),
  });

  if (!result.success) return { error: result.message };
  revalidatePath('/accounts');
  redirect('/accounts?created=1');
}

export async function deactivateAccountAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const accountId = String(formData.get('accountId') ?? '');
  await deactivateAccount(user.id, accountId);
  revalidatePath('/accounts');
  revalidatePath(`/accounts/${accountId}`);
  redirect('/accounts');
}

export async function updateAccountAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser();
  const accountId=String(formData.get('accountId')??'');
  const name=String(formData.get('name')??'').trim();
  const bankNameInput=String(formData.get('bankName')??'').trim();
  const bank=bankByName(bankNameInput);
  const iban=String(formData.get('iban')??'').replace(/\s+/g,'').toUpperCase();
  const cardLast4=String(formData.get('cardLast4')??'').trim();
  const openingBalance=String(formData.get('openingBalance')??'').trim();
  const effectiveDate=String(formData.get('effectiveDate')??'').trim();
  if(!accountId||!name||!/^-?\d+(?:\.\d{1,2})?$/.test(openingBalance)||!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) redirect(`/accounts/${accountId}/edit?error=${encodeURIComponent('تحقق من البيانات المطلوبة')}`);
  if(iban && !/^SA\d{22}$/.test(iban)) redirect(`/accounts/${accountId}/edit?error=${encodeURIComponent('IBAN السعودي يجب أن يبدأ بـ SA ويتكون من 24 خانة')}`);
  if(cardLast4 && !/^\d{4}$/.test(cardLast4)) redirect(`/accounts/${accountId}/edit?error=${encodeURIComponent('آخر 4 أرقام من البطاقة غير صالحة')}`);
  const { rawSql }=await import('@/infrastructure/db/client');
  try{
    await rawSql`with updated_account as (
      update public.accounts set name=${name},account_type=${deriveAccountType(name)},bank_code=${bank?.code??null},bank_name=${bank?.name??(bankNameInput||null)},account_number=${iban?iban.slice(6):null},iban=${iban||null},card_last4=${cardLast4||null},updated_at=now()
      where id=${accountId} and user_id=${user.id} and is_active=true returning id
    ) update public.account_opening_balances set amount=${openingBalance},effective_date=${effectiveDate}
      where account_id in(select id from updated_account) and user_id=${user.id}`;
  }catch{redirect(`/accounts/${accountId}/edit?error=${encodeURIComponent('تعذر حفظ تعديل الحساب')}`)}
  revalidatePath('/onboarding/accounts');revalidatePath('/accounts');revalidatePath(`/accounts/${accountId}`);
  const returnTo=String(formData.get('returnTo')??'');
  redirect(returnTo==='/onboarding/accounts'?'/onboarding/accounts?updated=1':'/accounts?updated=1');
}
