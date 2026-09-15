import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getConversationContext } from '@/repositories/conversation-context-repository';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const context = await getConversationContext(user.id);
  return NextResponse.json(context);
}
