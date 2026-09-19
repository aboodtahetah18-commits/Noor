import { randomUUID, createHash } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import { getMeetingAgendaTrackingState, type MeetingAgendaTrackingState } from '@/lib/allocation/financial-meeting-agenda-tracking';
import type { ConversationMessageKind } from '@/lib/conversations/store';

export type AllocationFinalProposalStatus='READY'|'BLOCKED_BY_AGENDA'|'NEGOTIATION_NOT_READY'|'NO_MEETING_CONTEXT';

export type AllocationFinalProposal={
  status:AllocationFinalProposalStatus;
  proposalId:string|null;
  allocationProposalId:string|null;
  negotiation:Record<string,unknown>|null;
  allocationSnapshot:Record<string,unknown>|null;
  agendaState:MeetingAgendaTrackingState|null;
  resolvedAgendaItems:Array<{itemNumber:number;title:string;note:string|null}>;
  nonBlockingFollowups:Array<{itemNumber:number;title:string;status:string;note:string|null;referredTo:string|null;ownerKey:string|null;ownerName:string|null}>;
  blockingItems:Array<{itemNumber:number;title:string;status:string}>;
  ratificationReady:boolean;
  requiresUserRatification:true;
  externalExecution:false;
};

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function stableId(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);
}

export function buildAllocationFinalProposal(args:{
  allocationProposalId:string|null;
  negotiation:Record<string,unknown>|null;
  allocationSnapshot:Record<string,unknown>|null;
  agendaState:MeetingAgendaTrackingState|null;
}):AllocationFinalProposal{
  const agenda=args.agendaState;
  const blockingItems=(agenda?.items??[])
    .filter(item=>item.priority==='BLOCKING'&&item.status!=='RESOLVED')
    .map(item=>({itemNumber:item.itemNumber,title:item.title,status:item.status}));
  const resolvedAgendaItems=(agenda?.items??[])
    .filter(item=>item.status==='RESOLVED')
    .map(item=>({itemNumber:item.itemNumber,title:item.title,note:item.note}));
  const nonBlockingFollowups=(agenda?.items??[])
    .filter(item=>item.priority!=='BLOCKING'&&item.status!=='RESOLVED')
    .map(item=>({itemNumber:item.itemNumber,title:item.title,status:item.status,note:item.note,referredTo:item.referredTo,ownerKey:item.ownerKey,ownerName:item.ownerName}));

  if(!args.allocationProposalId||!args.negotiation||!args.allocationSnapshot||!agenda){
    return {
      status:'NO_MEETING_CONTEXT',proposalId:null,allocationProposalId:args.allocationProposalId,
      negotiation:args.negotiation,allocationSnapshot:args.allocationSnapshot,agendaState:agenda,
      resolvedAgendaItems,nonBlockingFollowups,blockingItems,ratificationReady:false,
      requiresUserRatification:true,externalExecution:false,
    };
  }

  if(blockingItems.length>0){
    return {
      status:'BLOCKED_BY_AGENDA',proposalId:null,allocationProposalId:args.allocationProposalId,
      negotiation:args.negotiation,allocationSnapshot:args.allocationSnapshot,agendaState:agenda,
      resolvedAgendaItems,nonBlockingFollowups,blockingItems,ratificationReady:false,
      requiresUserRatification:true,externalExecution:false,
    };
  }

  const negotiationStatus=String(args.negotiation.status??'');
  const unresolved=Array.isArray(args.negotiation.unresolvedOwners)
    ? args.negotiation.unresolvedOwners
    : Array.isArray(args.negotiation.unresolved_owners)
      ? args.negotiation.unresolved_owners
      : [];
  if(negotiationStatus!=='BALANCED_DRAFT'||unresolved.length>0){
    return {
      status:'NEGOTIATION_NOT_READY',proposalId:null,allocationProposalId:args.allocationProposalId,
      negotiation:args.negotiation,allocationSnapshot:args.allocationSnapshot,agendaState:agenda,
      resolvedAgendaItems,nonBlockingFollowups,blockingItems,ratificationReady:false,
      requiresUserRatification:true,externalExecution:false,
    };
  }

  const proposalId=`FINAL-${stableId({
    allocationProposalId:args.allocationProposalId,
    negotiation:args.negotiation,
    allocationSnapshot:args.allocationSnapshot,
    agendaMessageId:agenda.agendaMessageId,
    agendaItems:agenda.items.map(item=>({itemId:item.itemId,status:item.status,note:item.note,referredTo:item.referredTo})),
  })}`;

  return {
    status:'READY',proposalId,allocationProposalId:args.allocationProposalId,
    negotiation:args.negotiation,allocationSnapshot:args.allocationSnapshot,agendaState:agenda,
    resolvedAgendaItems,nonBlockingFollowups,blockingItems,ratificationReady:true,
    requiresUserRatification:true,externalExecution:false,
  };
}

export function isAllocationFinalProposalRequest(text:string){
  return /^(إنشاء مشروع التوزيع|انشاء مشروع التوزيع|جهز مشروع التوزيع|تجهيز مشروع التوزيع|مشروع التوزيع النهائي)$/i.test(text.trim());
}

async function loadLatestBalancedDeliberation(userId:string){
  const sql=getRawSql();
  const rows=await sql`
    select m.id,m.thread_id,m.structured_data
    from public.conversation_messages m
    join public.conversation_threads t on t.id=m.thread_id
    where m.user_id=${userId}::uuid and t.user_id=${userId}::uuid and t.room_key='council'
      and coalesce(m.structured_data->>'allocation_proposal_id','')<>''
      and m.structured_data->'negotiation'->>'status'='BALANCED_DRAFT'
    order by m.created_at desc
    limit 1
  `;
  const row=rows[0];
  if(!row) return null;
  const data=record(row.structured_data)??{};
  return {
    sourceMessageId:String(row.id),
    threadId:String(row.thread_id),
    allocationProposalId:typeof data.allocation_proposal_id==='string'?data.allocation_proposal_id:null,
    negotiation:record(data.negotiation),
    allocationSnapshot:record(data.allocation_snapshot),
  };
}

export async function createAllocationFinalProposalReply(userId:string){
  const [deliberation,agendaState]=await Promise.all([
    loadLatestBalancedDeliberation(userId),
    getMeetingAgendaTrackingState(userId),
  ]);
  if(!deliberation) return null;
  const proposal=buildAllocationFinalProposal({
    allocationProposalId:deliberation.allocationProposalId,
    negotiation:deliberation.negotiation,
    allocationSnapshot:deliberation.allocationSnapshot,
    agendaState,
  });

  const sql=getRawSql();
  const existing=proposal.proposalId?await sql`
    select id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${deliberation.threadId}::uuid
      and structured_data->>'allocation_final_proposal_id'=${proposal.proposalId}
    order by created_at desc limit 1
  `:[];
  if(existing[0]) return existing[0];

  const body=proposal.status==='READY'
    ? `مشروع التوزيع النهائي جاهز للاعتماد. تم ربطه بمحضر الاجتماع الحالي: ${proposal.resolvedAgendaItems.length} بندًا محسومًا، و${proposal.nonBlockingFollowups.length} ملاحظة متابعة غير مانعة. لا توجد بنود مانعة مفتوحة، والتفاوض متوازن. للاعتماد اكتب «اعتماد التوزيع».`
    : proposal.status==='BLOCKED_BY_AGENDA'
      ? `لا أستطيع إنشاء مشروع توزيع قابل للاعتماد الآن. توجد ${proposal.blockingItems.length} بنود مانعة غير محسومة: ${proposal.blockingItems.map(item=>`#${item.itemNumber} ${item.title}`).join('، ')}.`
      : proposal.status==='NEGOTIATION_NOT_READY'
        ? 'لا أستطيع إنشاء مشروع توزيع قابل للاعتماد الآن لأن نتيجة التفاوض ليست متوازنة أو ما زالت تحتوي على مطالب غير محسومة.'
        : 'لا توجد بعد جلسة واجتماع مرتبطان بشكل كافٍ لإنشاء مشروع توزيع قابل للاعتماد.';

  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${deliberation.threadId}::uuid,${userId}::uuid,'agent','central-secretary','أمين السر المركزي',
      ${proposal.status==='READY'?'recommendation':'risk'},${body},
      ${JSON.stringify({
        allocation_final_proposal:proposal.status==='READY',
        allocation_final_proposal_id:proposal.proposalId,
        allocation_final_proposal_status:proposal.status,
        allocation_proposal_id:proposal.allocationProposalId,
        negotiation:proposal.negotiation,
        allocation_snapshot:proposal.allocationSnapshot,
        agenda_tracking_state:proposal.agendaState,
        resolved_agenda_items:proposal.resolvedAgendaItems,
        non_blocking_followups:proposal.nonBlockingFollowups,
        blocking_agenda_items:proposal.blockingItems,
        ratification_ready:proposal.ratificationReady,
        ratification_required:true,
        ratified:false,
        source_deliberation_message_id:deliberation.sourceMessageId,
        external_execution:false,
        execution_boundary:'مشروع قرار داخلي فقط؛ لا اعتماد ولا تنفيذ مالي قبل مصادقة المستخدم الصريحة',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  const row=rows[0];
  if(!row) return null;
  return {
    ...row,id:String(row.id),sender_type:'agent' as const,sender_key:String(row.sender_key),sender_name:String(row.sender_name),
    message_kind:String(row.message_kind) as ConversationMessageKind,body:String(row.body),
    structured_data:row.structured_data as Record<string,unknown>,
  };
}
