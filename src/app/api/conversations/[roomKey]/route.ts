export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { createRoutedReply } from '@/lib/conversations/reply-engine';
import { attachUnifiedDecisionLifecycle, type PersistedReply } from '@/lib/conversations/decision-lifecycle-store';
import { createAssetGoalReply } from '@/lib/conversations/asset-goal-engine';
import { createCrossBankHardGuardReply, createProtectionGuardReply, createSolvencyReply } from '@/lib/conversations/solvency-engine';
import { createHilalFinancingReply } from '@/lib/conversations/hilal-financing-engine';
import { createHilalRestructuringReply } from '@/lib/conversations/hilal-restructuring-engine';
import { appendUserMessage, getConversationRoom, isConversationRoomKey, type ConversationMessageKind } from '@/lib/conversations/store';
import { getGovernorOnboardingStatus, getGovernorWelcome, processGovernorOnboardingMessage } from '@/lib/conversations/governor-onboarding';
import { routePurchaseMessageToOperations } from '@/lib/conversations/operations-message-router';
import { attachGovernanceContext } from '@/lib/governance/governance-context';
import { syncGovernanceMeetingInvitations } from '@/lib/governance/governance-meeting-scheduler';

export async function GET(_request: Request, context: { params: Promise<{ roomKey: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  const { roomKey } = await context.params;
  if (!isConversationRoomKey(roomKey)) return NextResponse.json({ code: 'CONVERSATION_ROOM_NOT_FOUND' }, { status: 404 });
  try {
    const onboarding = await getGovernorOnboardingStatus(user.id);
    if (!onboarding.complete && roomKey !== 'central') return NextResponse.json({ code: 'ONBOARDING_REQUIRED', onboarding }, { status: 423 });
    let room = await getConversationRoom(user.id, roomKey);
    if (!onboarding.complete && roomKey === 'central') {
      const hasCurrentPrompt = room.messages.some((message) => {
        const data = message.structured_data && typeof message.structured_data === 'object'
          ? message.structured_data as Record<string, unknown>
          : {};
        return message.sender_key === 'central-governor'
          && data.onboarding === true
          && data.onboarding_step === onboarding.current_step;
      });
      if (!hasCurrentPrompt) {
        const sql = (await import('@/infrastructure/db/client')).getRawSql();
        const legacy = await sql`
          select id
          from public.conversation_messages
          where thread_id=${room.threadId}::uuid
            and user_id=${user.id}::uuid
            and sender_key='central-governor'
            and (
              body like 'هذه بداية محادثتك%'
              or body like 'مرحبًا بك في نماء.%'
            )
          order by created_at asc
          limit 1
        `;
        const prompt = onboarding.current_step === 'marital_status'
          ? getGovernorWelcome('marital_status')
          : String(onboarding.question ?? '');
        const structured = JSON.stringify({
          onboarding: true,
          onboarding_step: onboarding.current_step,
          onboarding_complete: false,
          next_question: onboarding.question,
          execution_boundary: 'advisory_only',
        });
        if (legacy[0]?.id) {
          await sql`
            update public.conversation_messages
            set body=${prompt}, message_kind='request',
                sender_name='محافظ بنك نماء المركزي',
                structured_data=${structured}::jsonb
            where id=${String(legacy[0].id)}::uuid
              and user_id=${user.id}::uuid
          `;
        } else {
          await sql`
            insert into public.conversation_messages(
              id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
            ) values(
              gen_random_uuid(),${room.threadId}::uuid,${user.id}::uuid,'agent','central-governor',
              'محافظ بنك نماء المركزي','request',${prompt},${structured}::jsonb
            )
          `;
        }
        room = await getConversationRoom(user.id, roomKey);
      }
    }
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
    const capturedOperation = message?.id
      ? await routePurchaseMessageToOperations({userId:user.id,sourceRoom:roomKey,sourceMessageId:String(message.id),text})
      : null;

    const onboarding = await getGovernorOnboardingStatus(user.id);
    if (!onboarding.complete && roomKey !== 'central') {
      return NextResponse.json({ code: 'ONBOARDING_REQUIRED', onboarding }, { status: 423 });
    }

    let reply: PersistedReply | null = null;
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
              onboarding_projection:'projection' in onboardingReply ? onboardingReply.projection : null,
              execution_boundary:'advisory_only'
            })}::jsonb
          )
          returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
        `;
        const row = rows[0];
        reply = row ? {
          ...row,
          id: String(row.id),
          message_kind: String(row.message_kind) as ConversationMessageKind,
          structured_data: row.structured_data && typeof row.structured_data === 'object'
            ? row.structured_data as Record<string, unknown>
            : {},
        } : null;
        if (onboardingReply.completed) await syncGovernanceMeetingInvitations(user.id);
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
    } else if (roomKey === 'operations' || roomKey === 'secretary') {
      reply = await createRoutedReply(user.id, roomKey, text);
    } else {
      const crossBankGuardReply = await createCrossBankHardGuardReply(user.id, roomKey, text);
      const guardReply = crossBankGuardReply ? null : await createProtectionGuardReply(user.id, roomKey, text);
      reply = crossBankGuardReply ?? guardReply ?? await createRoutedReply(user.id, roomKey, text);
    }

    const governanceBoundReply = await attachGovernanceContext(user.id, roomKey, reply ?? null);
    const governedReply = await attachUnifiedDecisionLifecycle(user.id, roomKey, governanceBoundReply);
    return NextResponse.json({ message, reply: governedReply, captured_operation: capturedOperation }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CONVERSATION_WRITE_FAILED';
    if (code === 'CONVERSATION_MESSAGE_INVALID') return NextResponse.json({ code }, { status: 400 });
    console.error('[conversation-message-write]', { roomKey, name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ code: 'CONVERSATION_WRITE_FAILED' }, { status: 503 });
  }
}
