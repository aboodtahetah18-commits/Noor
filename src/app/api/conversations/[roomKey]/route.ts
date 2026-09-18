export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { createRoutedReply } from '@/lib/conversations/reply-engine';
import { attachUnifiedDecisionLifecycle } from '@/lib/conversations/decision-lifecycle-store';
import { createAssetGoalReply } from '@/lib/conversations/asset-goal-engine';
import { createCrossBankHardGuardReply, createProtectionGuardReply, createSolvencyReply } from '@/lib/conversations/solvency-engine';
import { createHilalFinancingReply } from '@/lib/conversations/hilal-financing-engine';
import { createHilalRestructuringReply } from '@/lib/conversations/hilal-restructuring-engine';
import { appendUserMessage, getConversationRoom, isConversationRoomKey } from '@/lib/conversations/store';
import { getGovernorOnboardingStatus, processGovernorOnboardingMessage } from '@/lib/conversations/governor-onboarding';

export async function GET(_request: Request, context: { params: Promise<{ roomKey: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  const { roomKey } = await context.params;
  if (!isConversationRoomKey(roomKey)) return NextResponse.json({ code: 'CONVERSATION_ROOM_NOT_FOUND' }, { status: 404 });
  try {
    const onboarding = await getGovernorOnboardingStatus(user.id);
    if (!onboarding.complete && roomKey !== 'central') return NextResponse.json({ code: 'ONBOARDING_REQUIRED', onboarding }, { status: 423 });
    const room = await getConversationRoom(user.id, roomKey);
    return NextResponse.json({ ...room, onboarding });
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

    const onboarding = await getGovernorOnboardingStatus(user.id);
    if (!onboarding.complete && roomKey !== 'central') {
      return NextResponse.json({ code: 'ONBOARDING_REQUIRED', onboarding }, { status: 423 });
    }

    let reply;
    if (roomKey === 'central' && !onboarding.complete) {
      const onboardingReply = await processGovernorOnboardingMessage(user.id, text);
      if (onboardingReply) {
        const thread = await getConversationRoom(user.id, 'central');
        const agent = thread.room.participants[0];
        const sql = (await import('@/infrastructure/db/client')).getRawSql();
        const rows = await sql`
          insert into public.conversation_messages(
            id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
          ) values(
            gen_random_uuid(),${thread.threadId}::uuid,${user.id}::uuid,'agent',
            ${agent?.key ?? 'central-governor'},${agent?.name ?? 'محافظ بنك نماء المركزي'},'request',
            ${onboardingReply.body},
            ${JSON.stringify({
              onboarding:true,
              onboarding_step:onboardingReply.current_step,
              onboarding_complete:onboardingReply.completed,
              next_question:onboardingReply.next_question,
              execution_boundary:'advisory_only'
            })}::jsonb
          )
          returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
        `;
        reply = rows[0] ?? null;
      } else {
        reply = await createRoutedReply(user.id, roomKey, text);
      }
    } else if (roomKey === 'solvency') {
      reply = await createSolvencyReply(user.id, text);
    } else if (roomKey === 'assets') {
      const goalReply = await createAssetGoalReply(user.id, text);
      const guardReply = goalReply ? null : await createProtectionGuardReply(user.id, roomKey, text);
      reply = goalReply ?? guardReply ?? await createRoutedReply(user.id, roomKey, text);
    } else if (roomKey === 'hilal') {
      const restructuringReply = await createHilalRestructuringReply(user.id, text);
      const financingReply = restructuringReply ? null : await createHilalFinancingReply(user.id, text);
      reply = restructuringReply ?? financingReply ?? await createRoutedReply(user.id, roomKey, text);
    } else {
      const crossBankGuardReply = await createCrossBankHardGuardReply(user.id, roomKey, text);
      const guardReply = crossBankGuardReply ? null : await createProtectionGuardReply(user.id, roomKey, text);
      reply = crossBankGuardReply ?? guardReply ?? await createRoutedReply(user.id, roomKey, text);
    }

    const governedReply = await attachUnifiedDecisionLifecycle(user.id, roomKey, reply ?? null);
    return NextResponse.json({ message, reply: governedReply }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CONVERSATION_WRITE_FAILED';
    if (code === 'CONVERSATION_MESSAGE_INVALID') return NextResponse.json({ code }, { status: 400 });
    console.error('[conversation-message-write]', { roomKey, name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'CONVERSATION_WRITE_FAILED' }, { status: 503 });
  }
}
