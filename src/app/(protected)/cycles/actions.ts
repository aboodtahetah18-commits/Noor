'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { createFinancialCycle } from '@/features/cycles/commands/create-cycle';
import { activateFinancialCycle } from '@/features/cycles/commands/activate-cycle';
import { startCycleClosing } from '@/features/cycles/commands/start-cycle-closing';
export async function createCycleAction(_s:{error?:string},fd:FormData){ const u=await requireAuthenticatedMutationUser(); const r=await createFinancialCycle(u.id,{name:fd.get('name'),startDate:fd.get('startDate'),expectedNextIncomeDate:fd.get('expectedNextIncomeDate')}); if(!r.success)return{error:r.message}; revalidatePath('/dashboard'); redirect(`/cycles/${r.cycle.id}`); }
export async function activateCycleAction(fd:FormData){ const u=await requireAuthenticatedMutationUser(); const id=String(fd.get('cycleId')??''); const r=await activateFinancialCycle(u.id,id); if(!r.success) redirect(`/cycles/${id}?error=${encodeURIComponent(r.message)}`); revalidatePath('/dashboard'); revalidatePath(`/cycles/${id}`); redirect('/dashboard'); }

export async function startCycleClosingAction(fd:FormData){ const u=await requireAuthenticatedMutationUser(); const id=String(fd.get('cycleId')??''); const r=await startCycleClosing(u.id,id); revalidatePath('/dashboard'); revalidatePath(`/cycles/${id}`); if(!r.success) redirect(`/cycles/${id}?error=${encodeURIComponent(r.message)}`); redirect(`/cycles/${id}`); }
