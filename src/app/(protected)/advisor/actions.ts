'use server';

import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { transitionRecommendation } from '@/features/recommendations/commands/transition-recommendation';
import { getRecommendationDetails } from '@/features/recommendations/queries/get-recommendation-details';
import { createDecisionRequestFromRecommendation,recordUserDecision,type UserDecisionAction } from '@/features/financial-engine/services/decision-service';
import { FinancialPlatformError } from '@/features/financial-engine/services/financial-platform-error';

export async function viewRecommendationAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const id = String(formData.get('recommendationId') ?? '');
  if (!id) redirect('/advisor?error=RECOMMENDATION_ID_REQUIRED');
  const details = await getRecommendationDetails(user.id, id);
  if (!details) redirect('/advisor?error=RECOMMENDATION_NOT_FOUND');
  if (details.recommendation.status === 'NEW') await transitionRecommendation(user.id, id, 'VIEW_RECOMMENDATION');
  redirect(`/advisor/${id}`);
}

export async function acceptRecommendationAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser('advisor-decision-request');
  const id = String(formData.get('recommendationId') ?? '');
  const details = await getRecommendationDetails(user.id, id);
  if (!details) redirect('/advisor?error=RECOMMENDATION_NOT_FOUND');
  try {
    if (details.recommendation.status !== 'ACCEPTED') await transitionRecommendation(user.id, id, 'ACCEPT_RECOMMENDATION');
    const result = await createDecisionRequestFromRecommendation({ userId:user.id,recommendationId:id });
    redirect(`/advisor/${id}?accepted=1&decisionStatus=${encodeURIComponent(String(result.request.status))}`);
  } catch (error) {
    if (error instanceof FinancialPlatformError) redirect(`/advisor/${id}?error=${encodeURIComponent(error.code)}`);
    throw error;
  }
}

export async function respondRecommendationDecisionAction(formData:FormData){
  const user=await requireAuthenticatedMutationUser('advisor-user-decision');
  const recommendationId=String(formData.get('recommendationId')??'');
  const decisionRequestId=String(formData.get('decisionRequestId')??'');
  const action=String(formData.get('action')??'') as UserDecisionAction;
  if(!recommendationId||!decisionRequestId||!['APPROVE','REJECT','DEFER','MODIFY'].includes(action))redirect('/advisor?error=INVALID_DECISION');
  try{
    const result=await recordUserDecision({userId:user.id,decisionRequestId,action});
    redirect(`/advisor/${recommendationId}?decision=${encodeURIComponent(action)}&decisionStatus=${encodeURIComponent(result.requestStatus)}`);
  }catch(error){
    if(error instanceof FinancialPlatformError)redirect(`/advisor/${recommendationId}?error=${encodeURIComponent(error.code)}`);
    throw error;
  }
}

export async function dismissRecommendationAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const id = String(formData.get('recommendationId') ?? '');
  if (!id) redirect('/advisor?error=RECOMMENDATION_ID_REQUIRED');
  await transitionRecommendation(user.id, id, 'DISMISS_RECOMMENDATION');
  redirect('/advisor?dismissed=1');
}
