'use server';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { transferBetweenAccounts } from '@/features/transfers/commands/transfer-between-accounts';

export async function transferAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser();
  const result=await transferBetweenAccounts(user.id,{
    cycleId:String(formData.get('cycleId')??''), fromAccountId:String(formData.get('fromAccountId')??''),
    toAccountId:String(formData.get('toAccountId')??''), amount:String(formData.get('amount')??''),
    transactionDate:String(formData.get('transactionDate')??''), description:String(formData.get('description')??''),
    idempotencyKey:String(formData.get('idempotencyKey')||randomUUID()),
  });
  if(!result.success) { redirect(`/transfers/new?error=${encodeURIComponent(result.message)}`); return; }
  redirect(`/transactions/${result.data.outTransactionId}?transfer=success`);
}
