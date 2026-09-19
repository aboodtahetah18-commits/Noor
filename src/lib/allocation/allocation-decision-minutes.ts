import { createHash, randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind } from '@/lib/conversations/store';

export type AllocationDecisionParticipant={
  key:string;
  name:string;
  role:string|null;
};

export type AllocationDecisionReservation={
  ownerKey:string;
  ownerName:string;
  type:'HOLD'|'NEEDS_EVIDENCE';
  note:string;
};

export type AllocationDecisionFollowup={
  itemNumber:number;
  title:string;
  status:string;
  assignedTo:string|null;
  assignmentSource:'REFERRED_TO'|'AGENDA_OWNER'|'UNASSIGNED';
  note:string|null;
};

export type AllocationDecisionMinutes={
  decisionId:string;
  proposalId:string;
  ratifiedAt:string;
  cycleId:string|null;
  planId:string|null;
  planVersionId:string|null;
  planVersionNumber:number|null;
  participants:AllocationDecisionParticipant[];
  resolvedAgendaItems:Array<{itemNumber:number;title:string;note:string|null}>;
  reservations:AllocationDecisionReservation[];
  followups:AllocationDecisionFollowup[];
  allocationSummary:{
    status:string|null;
    requestedAfter:number|null;
    availableIncome:number|null;
    remainingGap:number|null;
  };
  userIsFinalDecisionMaker:true;
  externalExecution:false;
};

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function num(value:unknown){
  const n=typeof value==='number'?value:Number(value);
  return Number.isFinite(n)?n:null;
}
function stableId(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);
}

export function buildAllocationDecisionMinutes(args:{
  proposalId:string;
  ratifiedAt:string;
  cycleId:string|null;
  planId:string|null;
  planVersionId:string|null;
  planVersionNumber:number|null;
  participants:AllocationDecisionParticipant[];
  negotiation:Record<string,unknown>;
  resolvedAgendaItems:unknown[];
  nonBlockingFollowups:unknown[];
}):AllocationDecisionMinutes{
  const turns=Array.isArray(args.negotiation.turns)?args.negotiation.turns:[];
  const reservations:AllocationDecisionReservation[]=turns.flatMap(turn=>{
    const row=record(turn);
    if(!row) return [];
    const action=String(row.action??'');
    if(action!=='HOLD'&&action!=='NEEDS_EVIDENCE') return [];
    return [{
      ownerKey:String(row.ownerKey??''),
      ownerName:String(row.ownerName??''),
      type:action as 'HOLD'|'NEEDS_EVIDENCE',
      note:String(row.reason??''),
    }];
  });

  const resolvedAgendaItems=args.resolvedAgendaItems.flatMap(item=>{
    const row=record(item);
    if(!row) return [];
    return [{
      itemNumber:Number(row.itemNumber??0),
      title:String(row.title??''),
      note:typeof row.note==='string'?row.note:null,
    }];
  });

  const followups:AllocationDecisionFollowup[]=args.nonBlockingFollowups.flatMap(item=>{
    const row=record(item);
    if(!row) return [];
    const referredTo=typeof row.referredTo==='string'&&row.referredTo.trim()?row.referredTo.trim():null;
    const ownerName=typeof row.ownerName==='string'&&row.ownerName.trim()?row.ownerName.trim():null;
    return [{
      itemNumber:Number(row.itemNumber??0),
      title:String(row.title??''),
      status:String(row.status??'OPEN'),
      assignedTo:referredTo??ownerName,
      assignmentSource:referredTo?'REFERRED_TO':ownerName?'AGENDA_OWNER':'UNASSIGNED',
      note:typeof row.note==='string'?row.note:null,
    }];
  });

  const stable={
    proposalId:args.proposalId,
    ratifiedAt:args.ratifiedAt,
    cycleId:args.cycleId,
    planVersionId:args.planVersionId,
    participants:args.participants,
    resolvedAgendaItems,
    reservations,
    followups,
  };

  return {
    decisionId:`DEC-${stableId(stable)}`,
    proposalId:args.proposalId,
    ratifiedAt:args.ratifiedAt,
    cycleId:args.cycleId,
    planId:args.planId,
    planVersionId:args.planVersionId,
    planVersionNumber:args.planVersionNumber,
    participants:args.participants,
    resolvedAgendaItems,
    reservations,
    followups,
    allocationSummary:{
      status:typeof args.negotiation.status==='string'?args.negotiation.status:null,
      requestedAfter:num(args.negotiation.requestedAfter),
      availableIncome:num(args.negotiation.availableIncome),
      remainingGap:num(args.negotiation.remainingGap),
    },
    userIsFinalDecisionMaker:true,
    externalExecution:false,
  };
}

async function loadParticipants(userId:string,threadId:string,sourceAllocationProposalId:string|null){
  if(!sourceAllocationProposalId) return [];
  const sql=getRawSql();
  const rows=await sql`
    select sender_key,sender_name,structured_data
    from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${threadId}::uuid
      and structured_data->>'allocation_proposal_id'=${sourceAllocationProposalId}
      and sender_type='agent'
    order by created_at asc
  `;
  const seen=new Set<string>();
  const participants:AllocationDecisionParticipant[]=[];
  for(const row of rows){
    const key=String(row.sender_key??'');
    if(!key||seen.has(key)) continue;
    seen.add(key);
    const data=record(row.structured_data);
    participants.push({
      key,
      name:String(row.sender_name??key),
      role:typeof data?.speaker_role==='string'?data.speaker_role:null,
    });
  }
  return participants;
}

export async function createRatifiedAllocationDecisionMinutes(userId:string,ratificationMessageId:string){
  const sql=getRawSql();
  const rows=await sql`
    select id,thread_id,structured_data,created_at
    from public.conversation_messages
    where id=${ratificationMessageId}::uuid and user_id=${userId}::uuid
      and structured_data->>'allocation_ratified'='true'
    limit 1
  `;
  const ratification=rows[0];
  if(!ratification) return null;
  const data=record(ratification.structured_data)??{};
  const proposalId=String(data.allocation_ratification_proposal_id??'');
  if(!proposalId) return null;

  const existing=await sql`
    select id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${String(ratification.thread_id)}::uuid
      and structured_data->>'allocation_decision_minutes'='true'
      and structured_data->>'allocation_decision_proposal_id'=${proposalId}
    order by created_at desc limit 1
  `;
  if(existing[0]) return existing[0];

  const sourceProposalRows=await sql`
    select structured_data
    from public.conversation_messages
    where user_id=${userId}::uuid and thread_id=${String(ratification.thread_id)}::uuid
      and structured_data->>'allocation_final_proposal_id'=${proposalId}
      and structured_data->>'allocation_final_proposal'='true'
    order by created_at desc limit 1
  `;
  const sourceProposal=record(sourceProposalRows[0]?.structured_data)??{};
  const sourceAllocationProposalId=typeof sourceProposal.allocation_proposal_id==='string'?sourceProposal.allocation_proposal_id:null;
  const participants=await loadParticipants(userId,String(ratification.thread_id),sourceAllocationProposalId);

  const materialization=record(data.planning_materialization);
  const negotiation=record(data.negotiation)??{};
  const minutes=buildAllocationDecisionMinutes({
    proposalId,
    ratifiedAt:typeof data.ratified_at==='string'?data.ratified_at:String(ratification.created_at),
    cycleId:typeof data.cycle_id==='string'?data.cycle_id:null,
    planId:typeof data.plan_id==='string'?data.plan_id:null,
    planVersionId:typeof data.plan_version_id==='string'?data.plan_version_id:null,
    planVersionNumber:num(materialization?.versionNumber),
    participants,
    negotiation,
    resolvedAgendaItems:Array.isArray(data.resolved_agenda_items)?data.resolved_agenda_items:[],
    nonBlockingFollowups:Array.isArray(data.non_blocking_followups)?data.non_blocking_followups:[],
  });

  const unassigned=minutes.followups.filter(item=>item.assignmentSource==='UNASSIGNED').length;
  const body=`محضر القرار النهائي ${minutes.decisionId}: تم اعتماد مشروع التوزيع ${proposalId}. سجل المحضر ${minutes.participants.length} مشاركًا/جهة مشاركة، و${minutes.resolvedAgendaItems.length} بندًا محسومًا، و${minutes.reservations.length} تحفظًا/موقفًا مسجلًا من جولة التفاوض، و${minutes.followups.length} متابعة بعد الاجتماع${unassigned?` منها ${unassigned} بلا مسؤول محدد وتحتاج إسنادًا`:''}. الخطة الناتجة مرتبطة بالإصدار ${minutes.planVersionNumber??'—'}. الاعتماد قرار داخلي؛ التنفيذ المالي الخارجي يبقى بيد المستخدم.`;

  const inserted=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${String(ratification.thread_id)}::uuid,${userId}::uuid,'agent','central-secretary','أمين السر المركزي','decision',
      ${body},
      ${JSON.stringify({
        allocation_decision_minutes:true,
        allocation_decision_id:minutes.decisionId,
        allocation_decision_proposal_id:proposalId,
        decision_minutes:minutes,
        participants:minutes.participants,
        resolved_agenda_items:minutes.resolvedAgendaItems,
        reservations:minutes.reservations,
        followups:minutes.followups,
        plan_id:minutes.planId,
        plan_version_id:minutes.planVersionId,
        cycle_id:minutes.cycleId,
        ratified_at:minutes.ratifiedAt,
        user_is_final_decision_maker:true,
        external_execution:false,
        execution_boundary:'محضر قرار مؤسسي داخلي؛ لا ينفذ تحويلًا أو سدادًا أو استثمارًا خارجيًا',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  return inserted[0]??null;
}
