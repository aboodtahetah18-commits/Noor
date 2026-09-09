'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { finalizeOptimizedCyclePlan } from '@/features/plan-finalization/commands/finalize-optimized-cycle-plan';

export async function approveFinalCyclePlanAction(){
  const user=await requireAuthenticatedMutationUser('approve-final-cycle-plan');
  const result=await finalizeOptimizedCyclePlan(user.id);
  if(!result.success) redirect(`/budget/optimizer/review?error=${encodeURIComponent(result.message)}`);
  revalidatePath('/budget');
  revalidatePath('/budget/optimizer');
  revalidatePath('/budget/optimizer/review');
  redirect('/budget/optimizer/review?approved=1');
}
