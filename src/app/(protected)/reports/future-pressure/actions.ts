'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { approveCompositePressureDecisionPackage, cancelCompositePressureDecisionPackage, createCompositePressureDecisionPackage, evaluatePressureDecisionPackageOutcome, syncPressureDecisionPackageExecution } from '@/features/future-pressure/commands/manage-pressure-decision-packages';

const path='/reports/future-pressure';
export async function createCompositePressurePackageAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('pressure-package-create');
  try{
    const ids=formData.getAll('scenarioId').map(String).filter(Boolean);
    const result=await createCompositePressureDecisionPackage(user.id,ids);
    revalidatePath(path); redirect(`${path}?packageCreated=${encodeURIComponent(result.packageId)}`);
  }catch(error){const message=error instanceof Error?error.message:'تعذر إنشاء الحزمة';redirect(`${path}?error=${encodeURIComponent(message.slice(0,220))}`)}
}
export async function approveCompositePressurePackageAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('pressure-package-approve'); const packageId=String(formData.get('packageId')??'');
  try{await approveCompositePressureDecisionPackage(user.id,packageId);revalidatePath(path);redirect(`${path}?packageApproved=${encodeURIComponent(packageId)}`)}catch(error){const message=error instanceof Error?error.message:'تعذر اعتماد الحزمة';redirect(`${path}?error=${encodeURIComponent(message.slice(0,220))}`)}
}
export async function cancelCompositePressurePackageAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('pressure-package-cancel'); const packageId=String(formData.get('packageId')??'');
  try{await cancelCompositePressureDecisionPackage(user.id,packageId);revalidatePath(path);redirect(`${path}?packageCancelled=1`)}catch(error){const message=error instanceof Error?error.message:'تعذر إلغاء الحزمة';redirect(`${path}?error=${encodeURIComponent(message.slice(0,220))}`)}
}

export async function refreshCompositePressurePackageExecutionAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('pressure-package-sync'); const packageId=String(formData.get('packageId')??'');
  try{const r=await syncPressureDecisionPackageExecution(user.id,packageId);revalidatePath(path);redirect(`${path}?packageSynced=${encodeURIComponent(`${r.verified}/${r.total}`)}`)}catch(error){const message=error instanceof Error?error.message:'تعذر تحديث حالة التنفيذ';redirect(`${path}?error=${encodeURIComponent(message.slice(0,220))}`)}
}

export async function evaluateCompositePressurePackageOutcomeAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('pressure-package-outcome-evaluate'); const packageId=String(formData.get('packageId')??'');
  try{const r=await evaluatePressureDecisionPackageOutcome(user.id,packageId);revalidatePath(path);redirect(`${path}?packageEvaluated=${encodeURIComponent(String('outcomeClass' in r ? r.outcomeClass : r.outcomeStatus))}`)}catch(error){const message=error instanceof Error?error.message:'تعذر تقييم نتيجة الحزمة';redirect(`${path}?error=${encodeURIComponent(message.slice(0,220))}`)}
}
