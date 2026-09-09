'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getCycleMonthlyReview } from '@/features/cycles/queries/get-cycle-monthly-review';
import { rawSql } from '@/infrastructure/db/client';
import { saveCategoryContext } from '@/features/historical-learning/commands/save-category-context';

function collectRecommendations(review:NonNullable<Awaited<ReturnType<typeof getCycleMonthlyReview>>>,fd:FormData){
  return review.recommendations.map((r,index)=>{
    const action=String(fd.get(`action_${index}`)??r.action);
    const amount=String(fd.get(`amount_${index}`)??r.suggestedAmount);
    return {...r,action:['KEEP','INCREASE','REDUCE','PAUSE','ADD'].includes(action)?action:r.action,suggestedAmount:/^\d+(?:\.\d{1,2})?$/.test(amount)?amount:r.suggestedAmount};
  });
}

async function persistReview(fd:FormData,status:'DRAFT'|'REVIEWED'){
  const user=await requireAuthenticatedMutationUser();
  const cycleId=String(fd.get('cycleId')??'');
  const review=await getCycleMonthlyReview(user.id,cycleId);
  if(!review) return redirect('/dashboard');
  const notes=String(fd.get('notes')??'').trim().slice(0,2000);
  const selected=collectRecommendations(review,fd);
  const overspent=review.categories.filter(c=>c.status==='OVER').length;
  const unused=review.categories.filter(c=>c.status==='UNUSED').length;
  if(status==='REVIEWED'&&!review.bank.ready) redirect(`/cycles/${cycleId}/review?approveError=${encodeURIComponent('أكمل المصالحة البنكية قبل اعتماد مراجعة الدورة.')}`);
  await rawSql`insert into public.cycle_monthly_reviews(user_id,cycle_id,status,bank_reconciliation_ready,unresolved_bank_items,overspent_categories,unused_categories,recurring_candidates,next_cycle_recommendations,user_notes,reviewed_at)
    values(${user.id},${cycleId},${status},${review.bank.ready},${review.bank.unresolved},${overspent},${unused},${review.recurringCandidates},${JSON.stringify(selected)}::jsonb,${notes||null},${status==='REVIEWED'?new Date().toISOString():null})
    on conflict(user_id,cycle_id) do update set status=excluded.status,bank_reconciliation_ready=excluded.bank_reconciliation_ready,unresolved_bank_items=excluded.unresolved_bank_items,overspent_categories=excluded.overspent_categories,unused_categories=excluded.unused_categories,recurring_candidates=excluded.recurring_candidates,next_cycle_recommendations=excluded.next_cycle_recommendations,user_notes=excluded.user_notes,reviewed_at=excluded.reviewed_at,updated_at=now()`;
  revalidatePath(`/cycles/${cycleId}/review`);
  redirect(`/cycles/${cycleId}/review?${status==='DRAFT'?'saved':'approved'}=1`);
}

export async function saveCycleMonthlyReviewAction(fd:FormData){return persistReview(fd,'DRAFT');}
export async function approveCycleMonthlyReviewAction(fd:FormData){return persistReview(fd,'REVIEWED');}

export async function closeCycleAndPrepareNextAction(fd:FormData){
  const user=await requireAuthenticatedMutationUser();
  const cycleId=String(fd.get('cycleId')??'');
  const { closeAndPrepareNextCycle } = await import('@/features/cycles/services/cycle-rollover-service');
  const r=await closeAndPrepareNextCycle(user.id,cycleId);
  if(!r.success) redirect(`/cycles/${cycleId}/review?closeError=${encodeURIComponent(r.message)}`);
  revalidatePath('/dashboard');
  revalidatePath(`/cycles/${cycleId}`);
  redirect(`/cycles/${r.nextCycleId}?rolled=1`);
}


export async function saveCategoryContextAction(fd:FormData){
  const user=await requireAuthenticatedMutationUser();
  const cycleId=String(fd.get('cycleId')??'');
  const categoryId=String(fd.get('categoryId')??'');
  const direction=String(fd.get('direction')??'NORMAL');
  const reasonCodes=fd.getAll('reasonCodes').map(String);
  const result=await saveCategoryContext(user.id,{cycleId,categoryId,direction,reasonCodes,customReason:String(fd.get('customReason')??''),persistence:String(fd.get('persistence')??'TEMPORARY'),seasonCode:String(fd.get('seasonCode')??''),customSeasonName:String(fd.get('customSeasonName')??''),useForNextPlan:fd.get('useForNextPlan')==='on'});
  if(!result.success)redirect(`/cycles/${cycleId}/review?contextError=${encodeURIComponent(result.message)}`);
  revalidatePath(`/cycles/${cycleId}/review`);
  revalidatePath('/reports/learning');
  redirect(`/cycles/${cycleId}/review?contextSaved=1`);
}
