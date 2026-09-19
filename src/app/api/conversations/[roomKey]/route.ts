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
import { createCouncilDeliberationReplies } from '@/lib/conversations/council-deliberation-engine';
import { isExplicitAllocationRatification, isExplicitAllocationRejection, ratifyLatestAllocationDraft, rejectLatestAllocationDraft } from '@/lib/allocation/allocation-ratification';
import { createFinancialPlanDeviationReplies, isDeviationReviewRequest } from '@/lib/allocation/financial-plan-deviation-engine';
import { parseDeviationResolutionCommand, resolveLatestDeviationCase } from '@/lib/allocation/financial-plan-deviation-resolution';
import { closeFinancialCycleAfterApproval, createFinancialCycleClosureReview, isCycleClosureReviewRequest, isExplicitCycleClosureApproval } from '@/lib/allocation/financial-cycle-closure';
import { createGovernorPreMeetingBriefReply, isGovernorPreMeetingBriefRequest } from '@/lib/allocation/governor-pre-meeting-brief';
import { createMeetingOpeningAgendaReply, isMeetingOpeningAgendaRequest } from '@/lib/allocation/financial-meeting-opening-agenda';
import { applyMeetingAgendaCommand, parseMeetingAgendaCommand } from '@/lib/allocation/financial-meeting-agenda-tracking';
import { createAllocationFinalProposalReply, isAllocationFinalProposalRequest } from '@/lib/allocation/allocation-final-proposal';
import { createRatifiedAllocationDecisionMinutes } from '@/lib/allocation/allocation-decision-minutes';
import { createInstitutionalDecisionRegistryReply, isInstitutionalDecisionRegistryRequest } from '@/lib/governance/institutional-decision-registry';
import { applyDecisionFollowupCommand, parseDecisionFollowupCommand } from '@/lib/governance/institutional-decision-followups';
import { applyFollowupDeadlineCommand, parseFollowupDeadlineCommand } from '@/lib/governance/institutional-decision-followup-deadlines';
import { createGovernanceOversightDashboardReply, isGovernanceOversightDashboardRequest } from '@/lib/governance/governance-oversight-dashboard';

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
    } else if (roomKey === 'central' && onboarding.complete && isGovernanceOversightDashboardRequest(text)) {
      const dashboardReply=await createGovernanceOversightDashboardReply(user.id,'central');
      if(!dashboardReply) return NextResponse.json({message,code:'GOVERNANCE_DASHBOARD_UNAVAILABLE',captured_operation:capturedOperation},{status:409});
      return NextResponse.json({message,reply:dashboardReply,replies:[dashboardReply],captured_operation:capturedOperation},{status:201});
    } else if (roomKey === 'central' && onboarding.complete && parseFollowupDeadlineCommand(text)) {
      const deadlineReply=await applyFollowupDeadlineCommand(user.id,'central',parseFollowupDeadlineCommand(text)!);
      if(!deadlineReply) return NextResponse.json({message,code:'FOLLOWUP_DEADLINE_UNAVAILABLE',captured_operation:capturedOperation},{status:409});
      return NextResponse.json({message,reply:deadlineReply,replies:[deadlineReply],captured_operation:capturedOperation},{status:201});
    } else if (roomKey === 'central' && onboarding.complete && parseDecisionFollowupCommand(text)) {
      const followupReply=await applyDecisionFollowupCommand(user.id,'central',parseDecisionFollowupCommand(text)!);
      if(!followupReply) return NextResponse.json({message,code:'DECISION_FOLLOWUP_UNAVAILABLE',captured_operation:capturedOperation},{status:409});
      return NextResponse.json({message,reply:followupReply,replies:[followupReply],captured_operation:capturedOperation},{status:201});
    } else if (roomKey === 'central' && onboarding.complete && isInstitutionalDecisionRegistryRequest(text)) {
      const registryReply=await createInstitutionalDecisionRegistryReply(user.id,'central');
      if(!registryReply) return NextResponse.json({message,code:'DECISION_REGISTRY_UNAVAILABLE',captured_operation:capturedOperation},{status:409});
      return NextResponse.json({message,reply:registryReply,replies:[registryReply],captured_operation:capturedOperation},{status:201});
    } else if (roomKey === 'central' && onboarding.complete && isGovernorPreMeetingBriefRequest(text)) {
      const governorBriefReply=await createGovernorPreMeetingBriefReply(user.id);
      if(!governorBriefReply) return NextResponse.json({message,code:'GOVERNOR_PRE_MEETING_BRIEF_UNAVAILABLE',captured_operation:capturedOperation},{status:409});
      return NextResponse.json({message,reply:governorBriefReply,replies:[governorBriefReply],captured_operation:capturedOperation},{status:201});
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
    } else if (roomKey === 'council') {
      const meetingAgendaCommand=parseMeetingAgendaCommand(text);
      if(meetingAgendaCommand){
        const agendaCommandReply=await applyMeetingAgendaCommand(user.id,meetingAgendaCommand);
        if(!agendaCommandReply) return NextResponse.json({message,code:'NO_MEETING_AGENDA_TO_TRACK',captured_operation:capturedOperation},{status:409});
        return NextResponse.json({message,reply:agendaCommandReply,replies:[agendaCommandReply],captured_operation:capturedOperation},{status:201});
      }
      if(isMeetingOpeningAgendaRequest(text)){
        const agendaReply=await createMeetingOpeningAgendaReply(user.id);
        if(!agendaReply) return NextResponse.json({message,code:'MEETING_OPENING_AGENDA_UNAVAILABLE',captured_operation:capturedOperation},{status:409});
        return NextResponse.json({message,reply:agendaReply,replies:[agendaReply],captured_operation:capturedOperation},{status:201});
      }
      if(isCycleClosureReviewRequest(text)){
        const closureReview=await createFinancialCycleClosureReview(user.id);
        if(!closureReview) return NextResponse.json({message,code:'NO_ACTIVE_CYCLE_TO_CLOSE',captured_operation:capturedOperation},{status:409});
        return NextResponse.json({message,reply:closureReview,replies:[closureReview],captured_operation:capturedOperation},{status:201});
      }
      if(isExplicitCycleClosureApproval(text)){
        const closureReply=await closeFinancialCycleAfterApproval(user.id);
        if(!closureReply) return NextResponse.json({message,code:'NO_ACTIVE_CYCLE_TO_CLOSE',captured_operation:capturedOperation},{status:409});
        return NextResponse.json({message,reply:closureReply,replies:[closureReply],captured_operation:capturedOperation},{status:201});
      }
      const deviationResolutionCommand=parseDeviationResolutionCommand(text);
      if(deviationResolutionCommand){
        const deviationResolutionReply=await resolveLatestDeviationCase(user.id,deviationResolutionCommand);
        if(!deviationResolutionReply) return NextResponse.json({ message, code:'NO_ACTIVE_DEVIATION_CASE', captured_operation:capturedOperation }, { status:409 });
        return NextResponse.json({ message, reply:deviationResolutionReply, replies:[deviationResolutionReply], captured_operation:capturedOperation }, { status:201 });
      }
      if (isDeviationReviewRequest(text)) {
        const deviationReplies=await createFinancialPlanDeviationReplies(user.id);
        if(!deviationReplies.length) return NextResponse.json({ message, code:'NO_ACTIVE_PLAN_DEVIATION', captured_operation:capturedOperation }, { status:409 });
        return NextResponse.json({ message, reply:deviationReplies.at(-1)??null, replies:deviationReplies, captured_operation:capturedOperation }, { status:201 });
      }
      if(isAllocationFinalProposalRequest(text)){
        const finalProposalReply=await createAllocationFinalProposalReply(user.id);
        if(!finalProposalReply) return NextResponse.json({message,code:'NO_BALANCED_MEETING_TO_FINALIZE',captured_operation:capturedOperation},{status:409});
        return NextResponse.json({message,reply:finalProposalReply,replies:[finalProposalReply],captured_operation:capturedOperation},{status:201});
      }
      if (isExplicitAllocationRatification(text)) {
        const ratificationReply=await ratifyLatestAllocationDraft(user.id);
        if(!ratificationReply) return NextResponse.json({ message, code:'NO_RATIFIABLE_ALLOCATION_PROPOSAL', captured_operation:capturedOperation }, { status:409 });
        const decisionMinutes=await createRatifiedAllocationDecisionMinutes(user.id,String(ratificationReply.id));
        const ratificationReplies=decisionMinutes?[ratificationReply,decisionMinutes]:[ratificationReply];
        return NextResponse.json({ message, reply:ratificationReplies.at(-1)??ratificationReply, replies:ratificationReplies, captured_operation:capturedOperation }, { status:201 });
      }
      if (isExplicitAllocationRejection(text)) {
        const rejectionReply=await rejectLatestAllocationDraft(user.id);
        if(!rejectionReply) return NextResponse.json({ message, code:'NO_BALANCED_ALLOCATION_DRAFT', captured_operation:capturedOperation }, { status:409 });
        return NextResponse.json({ message, reply:rejectionReply, replies:[rejectionReply], captured_operation:capturedOperation }, { status:201 });
      }
      const replies = await createCouncilDeliberationReplies(user.id, text);
      return NextResponse.json({ message, reply: replies.at(-1) ?? null, replies, captured_operation: capturedOperation }, { status: 201 });
    } else if (roomKey === 'secretary' && isGovernanceOversightDashboardRequest(text)) {
      const dashboardReply=await createGovernanceOversightDashboardReply(user.id,'secretary');
      if(!dashboardReply) return NextResponse.json({message,code:'GOVERNANCE_DASHBOARD_UNAVAILABLE',captured_operation:capturedOperation},{status:409});
      return NextResponse.json({message,reply:dashboardReply,replies:[dashboardReply],captured_operation:capturedOperation},{status:201});
    } else if (roomKey === 'secretary' && parseFollowupDeadlineCommand(text)) {
      const deadlineReply=await applyFollowupDeadlineCommand(user.id,'secretary',parseFollowupDeadlineCommand(text)!);
      if(!deadlineReply) return NextResponse.json({message,code:'FOLLOWUP_DEADLINE_UNAVAILABLE',captured_operation:capturedOperation},{status:409});
      return NextResponse.json({message,reply:deadlineReply,replies:[deadlineReply],captured_operation:capturedOperation},{status:201});
    } else if (roomKey === 'secretary' && parseDecisionFollowupCommand(text)) {
      const followupReply=await applyDecisionFollowupCommand(user.id,'secretary',parseDecisionFollowupCommand(text)!);
      if(!followupReply) return NextResponse.json({message,code:'DECISION_FOLLOWUP_UNAVAILABLE',captured_operation:capturedOperation},{status:409});
      return NextResponse.json({message,reply:followupReply,replies:[followupReply],captured_operation:capturedOperation},{status:201});
    } else if (roomKey === 'secretary' && isInstitutionalDecisionRegistryRequest(text)) {
      const registryReply=await createInstitutionalDecisionRegistryReply(user.id,'secretary');
      if(!registryReply) return NextResponse.json({message,code:'DECISION_REGISTRY_UNAVAILABLE',captured_operation:capturedOperation},{status:409});
      return NextResponse.json({message,reply:registryReply,replies:[registryReply],captured_operation:capturedOperation},{status:201});
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
