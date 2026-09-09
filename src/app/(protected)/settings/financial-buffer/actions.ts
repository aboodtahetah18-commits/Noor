'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { saveFinancialBufferPolicy } from '@/features/financial-buffer/commands/save-financial-buffer-policy';
export async function saveFinancialBufferPolicyAction(fd:FormData){
  const user=await requireAuthenticatedMutationUser();
  const result=await saveFinancialBufferPolicy(user.id,{mode:fd.get('mode'),fixedAmount:fd.get('fixedAmount'),percent:fd.get('percent')});
  if(!result.success)redirect(`/settings/financial-buffer?error=${encodeURIComponent(result.message)}`);
  revalidatePath('/settings'); revalidatePath('/settings/financial-buffer');
  redirect('/settings/financial-buffer?saved=1');
}
