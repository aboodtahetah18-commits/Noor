'use server';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { transferSaving } from '@/features/savings/commands/transfer-saving';
export async function transferSavingAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser();
  const result=await transferSaving(user.id,{savingAllocationId:String(formData.get('savingAllocationId')??''),fromAccountId:String(formData.get('fromAccountId')??''),toAccountId:String(formData.get('toAccountId')??''),amount:String(formData.get('amount')??''),transactionDate:String(formData.get('transactionDate')??''),description:String(formData.get('description')??''),idempotencyKey:String(formData.get('idempotencyKey')||randomUUID())});
  if(!result.success){ redirect(`/savings/transfer?error=${encodeURIComponent(result.message)}`); return; }
  redirect(`/savings?transferred=1&transactionId=${encodeURIComponent(result.data.outTransactionId)}`);
}
