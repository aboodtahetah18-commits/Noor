export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { appendUserMessage, getConversationRoom, isConversationRoomKey } from '@/lib/conversations/store';

export async function GET(_request: Request, context: { params: Promise<{ roomKey: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  const { roomKey } = await context.params;
  if (!isConversationRoomKey(roomKey)) return NextResponse.json({ code: 'CONVERSATION_ROOM_NOT_FOUND' }, { status: 404 });
  try {
    return NextResponse.json(await getConversationRoom(user.id, roomKey));
  } catch (error) {
    console.error('[conversation-room-read]', { roomKey, name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'CONVERSATION_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ roomKey: string }> }) {
  const { roomKey } = await context.params;
  if (!isConversationRoomKey(roomKey)) return NextResponse.json({ code: 'CONVERSATION_ROOM_NOT_FOUND' }, { status: 404 });
  const user = await requireAuthenticatedMutationUser('conversation-message');
  let body: { body?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'CONVERSATION_INPUT_INVALID' }, { status: 400 });
  }
  try {
    const message = await appendUserMessage(user.id, user.name || 'أنت', roomKey, String(body.body ?? ''));
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CONVERSATION_WRITE_FAILED';
    if (code === 'CONVERSATION_MESSAGE_INVALID') return NextResponse.json({ code }, { status: 400 });
    console.error('[conversation-message-write]', { roomKey, name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'CONVERSATION_WRITE_FAILED' }, { status: 503 });
  }
}
