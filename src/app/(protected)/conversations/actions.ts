'use server';

import { revalidatePath } from 'next/cache';
import {
  requireAuthenticatedMutationUser,
  requireAuthenticatedUser,
} from '@/auth/require-authenticated-user';
import {
  addUserMessage,
  createGovernorThread,
} from '@/repositories/conversation-repository';

export async function createGovernorConversationAction() {
  const user = await requireAuthenticatedMutationUser('conversation-create');
  await createGovernorThread(user.id);
  revalidatePath('/conversations');
}

export async function sendConversationMessageAction(formData: FormData) {
  const user = await requireAuthenticatedMutationUser('conversation-message');
  const threadId = String(formData.get('threadId') ?? '');
  const body = String(formData.get('body') ?? '').trim();

  if (!threadId || !body || body.length > 12000) {
    throw new Error('Invalid conversation message');
  }

  await addUserMessage(user.id, threadId, body);
  revalidatePath('/conversations');
}

export async function loadConversationUserAction() {
  return requireAuthenticatedUser();
}
