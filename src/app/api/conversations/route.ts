export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listConversationRooms } from '@/lib/conversations/store';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  try {
    const rooms = await listConversationRooms(user.id);
    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('[conversations-list]', { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'CONVERSATIONS_UNAVAILABLE' }, { status: 503 });
  }
}
