'use server';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { createExpectedIncome } from '@/features/expected-income/commands/create-expected-income';
import { updateExpectedIncome } from '@/features/expected-income/commands/update-expected-income';

function input(fd:FormData,cycleId:string){ return { cycleId, sourceName:fd.get('sourceName'), expectedAmount:fd.get('expectedAmount'), expectedDate:fd.get('expectedDate'), incomeKind:fd.get('incomeKind'), isPrimary:fd.get('isPrimary')==='on' }; }
export async function createExpectedIncomeAction(cycleId:string,fd:FormData){ const u=await requireAuthenticatedMutationUser(); const r=await createExpectedIncome(u.id,input(fd,cycleId)); if(r.success){revalidatePath(`/cycles/${cycleId}`);revalidatePath(`/cycles/${cycleId}/income`);} }
export async function updateExpectedIncomeAction(cycleId:string,id:string,fd:FormData){ const u=await requireAuthenticatedMutationUser(); const r=await updateExpectedIncome(u.id,id,input(fd,cycleId)); if(r.success){revalidatePath(`/cycles/${cycleId}`);revalidatePath(`/cycles/${cycleId}/income`);} }
