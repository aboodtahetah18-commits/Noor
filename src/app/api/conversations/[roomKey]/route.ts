export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { createRoutedReply } from '@/lib/conversations/reply-engine';
import { createAssetGoalReply } from '@/lib/conversations/asset-goal-engine';
import { createProtectionGuardReply, createSolvencyReply } from '@/lib/conversations/solvency-engine';
import { createHilalFinancingReply } from '@/lib/conversations/hilal-financing-engine';
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
    const text = String(body.body ?? '');
    const message = await appendUserMessage(user.id, user.name || 'أنت', roomKey, text);

    let reply;
    if (roomKey === 'solvency') {
      reply = await createSolvencyReply(user.id, text);
    } else if (roomKey === 'assets') {
      const goalReply = await createAssetGoalReply(user.id, text);
      const guardReply = goalReply ? null : await createProtectionGuardReply(user.id, roomKey, text);
      reply = goalReply ?? guardReply ?? await createRoutedReply(user.id, roomKey, text);
    } else if (roomKey === 'hilal') {
      const financingReply = await createHilalFinancingReply(user.id, text);
      reply = financingReply ?? await createRoutedReply(user.id, roomKey, text);
    } else {
      const guardReply = await createProtectionGuardReply(user.id, roomKey, text);
      reply = guardReply ?? await createRoutedReply(user.id, roomKey, text);
    }

    return NextResponse.json({ message, reply }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CONVERSATION_WRITE_FAILED';
    if (code === 'CONVERSATION_MESSAGE_INVALID') return NextResponse.json({ code }, { status: 400 });
    console.error('[conversation-message-write]', { roomKey, name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'CONVERSATION_WRITE_FAILED' }, { status: 503 });
  }
}
