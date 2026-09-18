import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import {
  canTransitionDecisionLifecycle,
  createDecisionLifecycleEnvelope,
  lifecycleStateForMessage,
  type DecisionLifecycleSource,
  type DecisionLifecycleState,
} from './decision-lifecycle';
import type { ConversationMessageKind, ConversationRoomKey } from './store';

type PersistedReply = {
  id: string;
  message_kind: ConversationMessageKind;
  structured_data: Record<string, unknown>;
  [key: string]: unknown;
};

function sourceForRoom(roomKey: ConversationRoomKey): DecisionLifecycleSource {
  if (roomKey === 'central') return 'CENTRAL';
  if (roomKey === 'solvency') return 'SOLVENCY';
  if (roomKey === 'assets') return 'ASSETS';
  if (roomKey === 'hilal') return 'HILAL';
  if (roomKey === 'advisor') return 'ADVISOR';
  return 'COUNCIL';
}

function stateForReply(reply: PersistedReply): DecisionLifecycleState {
  const data = reply.structured_data ?? {};
  const restructuringState = typeof data.restructuring_state === 'string'
    ? data.restructuring_state
    : null;
  const decisionState = typeof data.decision_state === 'string'
    ? data.decision_state
    : null;
  const crossBank = data.cross_bank_precedence && typeof data.cross_bank_precedence === 'object'
    ? data.cross_bank_precedence as Record<string, unknown>
    : null;

  return lifecycleStateForMessage({
    blocked:
      data.blocked === true
      || decisionState === 'BLOCKED'
      || crossBank?.blocked === true,
    requiresEvidence:
      restructuringState === 'EVIDENCE_REQUIRED'
      || restructuringState === 'EVIDENCE_NOT_VERIFIED',
    verified:
      Boolean(data.evidence_verification)
      && restructuringState !== 'APPLIED',
    applied: restructuringState === 'APPLIED',
    followup: Boolean(data.recovery_followup),
    userConfirmed: restructuringState === 'APPROVED_NOT_APPLIED',
  });
}

function existingLifecycle(metadata: Record<string, unknown>) {
  const raw = metadata.active_decision_lifecycle;
  return raw && typeof raw === 'object'
    ? raw as Record<string, unknown>
    : null;
}

export async function attachUnifiedDecisionLifecycle(
  userId: string,
  roomKey: ConversationRoomKey,
  reply: PersistedReply | null,
): Promise<PersistedReply | null> {
  if (!reply || reply.message_kind === 'message') return reply;

  const sql = getRawSql();
  const rows = await sql`
    select id,metadata
    from public.conversation_threads
    where user_id=${userId} and room_key=${roomKey}
    limit 1
  `;
  const thread = rows[0];
  if (!thread?.id) return reply;

  const metadata = thread.metadata && typeof thread.metadata === 'object'
    ? thread.metadata as Record<string, unknown>
    : {};
  const active = existingLifecycle(metadata);
  const nextState = stateForReply(reply);
  const previousState = active && typeof active.state === 'string'
    ? active.state as DecisionLifecycleState
    : null;
  const canContinue = Boolean(
    active
    && typeof active.decision_reference === 'string'
    && previousState
    && (previousState === nextState || canTransitionDecisionLifecycle(previousState, nextState)),
  );

  const lifecycle = createDecisionLifecycleEnvelope({
    source: sourceForRoom(roomKey),
    state: nextState,
    decisionReference: canContinue
      ? String(active?.decision_reference)
      : `DEC-${randomUUID()}`,
    previousState: canContinue && previousState !== nextState ? previousState : null,
  });

  const structured = {
    ...(reply.structured_data ?? {}),
    decision_lifecycle: lifecycle,
  };
  const nextMetadata = {
    ...metadata,
    active_decision_lifecycle: lifecycle,
  };

  await sql.transaction([
    sql`
      update public.conversation_messages
      set structured_data=${JSON.stringify(structured)}::jsonb
      where id=${reply.id}::uuid and user_id=${userId}
    `,
    sql`
      update public.conversation_threads
      set metadata=${JSON.stringify(nextMetadata)}::jsonb,updated_at=now()
      where id=${String(thread.id)}::uuid and user_id=${userId}
    `,
  ]);

  return {
    ...reply,
    structured_data: structured,
  };
}
