'use server';

import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { transitionRecommendation } from '@/features/recommendations/commands/transition-recommendation';
import { getRecommendationDetails, getAcceptedNextAction } from '@/features/recommendations/queries/get-recommendation-details';

export async function viewRecommendationAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const id = String(formData.get('recommendationId') ?? '');
  if (!id) redirect('/advisor?error=RECOMMENDATION_ID_REQUIRED');
  const details = await getRecommendationDetails(user.id, id);
  if (!details) redirect('/advisor?error=RECOMMENDATION_NOT_FOUND');
  if (details.recommendation.status === 'NEW') {
    await transitionRecommendation(user.id, id, 'VIEW_RECOMMENDATION');
  }
  redirect(`/advisor/${id}`);
}

export async function acceptRecommendationAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const id = String(formData.get('recommendationId') ?? '');
  const details = await getRecommendationDetails(user.id, id);
  if (!details) redirect('/advisor?error=RECOMMENDATION_NOT_FOUND');
  await transitionRecommendation(user.id, id, 'ACCEPT_RECOMMENDATION');
  const next = getAcceptedNextAction(details.reasonCode);
  redirect(`/advisor/${id}?accepted=1&nextAction=${encodeURIComponent(next.code)}`);
}

export async function dismissRecommendationAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser();
  const id = String(formData.get('recommendationId') ?? '');
  if (!id) redirect('/advisor?error=RECOMMENDATION_ID_REQUIRED');
  await transitionRecommendation(user.id, id, 'DISMISS_RECOMMENDATION');
  redirect('/advisor?dismissed=1');
}
