'use server';

import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';

export async function analyzeDailyBankMessageAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('daily-bank-message-analyze');
  const message=String(formData.get('message')??'').trim();
  const accountId=String(formData.get('accountId')??'').trim()||null;
  if(!message) redirect('/bank-operations?error=ألصق الرسالة البنكية أولًا');
  if(message.length>4000) redirect('/bank-operations?error=الرسالة البنكية طويلة جدًا');
  try{
    const { importBankMessage }=await import('@/features/bank-statements/commands/import-message');
    const result=await importBankMessage(user.id,message,accountId);
    if(result.autoApproved) redirect(`/bank-operations?approved=1&importId=${result.importId}`);
    redirect(`/bank-statements/${result.importId}?from=daily`);
  }catch(error){
    const text=error instanceof Error?error.message:'تعذر تحليل الرسالة البنكية';
    redirect(`/bank-operations?error=${encodeURIComponent(text.slice(0,220))}`);
  }
}
