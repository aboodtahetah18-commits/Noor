import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind } from '@/lib/conversations/store';
import type { FinancialMeetingOpeningAgenda, FinancialMeetingAgendaItem } from '@/lib/allocation/financial-meeting-opening-agenda';

export type MeetingAgendaItemStatus='OPEN'|'NEEDS_DATA'|'REFERRED'|'READY_FOR_DECISION'|'RESOLVED';
export type MeetingAgendaTrackingItem={
  itemId:string;
  itemNumber:number;
  title:string;
  priority:FinancialMeetingAgendaItem['priority'];
  ownerKey:string|null;
  ownerName:string|null;
  status:MeetingAgendaItemStatus;
  note:string|null;
  referredTo:string|null;
  updatedAt:string|null;
};
export type MeetingAgendaTrackingState={
  agendaMessageId:string;
  agendaCycleId:string|null;
  items:MeetingAgendaTrackingItem[];
  blockingOpenCount:number;
  openCount:number;
  canCloseMeeting:boolean;
  noAutomaticDecision:true;
  noAutomaticAllocationChange:true;
};

export type MeetingAgendaCommand=
  | {kind:'SHOW_STATUS'}
  | {kind:'UPDATE';itemNumber:number;status:MeetingAgendaItemStatus;note:string|null;referredTo:string|null}
  | {kind:'CLOSE_MEETING'};

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

export function parseMeetingAgendaCommand(text:string):MeetingAgendaCommand|null{
  const normalized=text.trim().replace(/\s+/g,' ');
  if(/^(حالة الاجتماع|حالة جدول الأعمال|حالة جدول اعمال الاجتماع)$/i.test(normalized)) return {kind:'SHOW_STATUS'};
  if(/^(إنهاء الاجتماع|انهاء الاجتماع|إغلاق الاجتماع|اغلاق الاجتماع)$/i.test(normalized)) return {kind:'CLOSE_MEETING'};

  const resolved=normalized.match(/^(?:حسم|حل) البند\s*(\d+)(?:\s*[:：-]\s*(.+))?$/i);
  if(resolved) return {kind:'UPDATE',itemNumber:Number(resolved[1]),status:'RESOLVED',note:resolved[2]?.trim()||null,referredTo:null};

  const needs=normalized.match(/^البند\s*(\d+)\s*(?:يحتاج|يحتاج إلى|يحتاج الى)\s*بيانات(?:\s*[:：-]\s*(.+))?$/i);
  if(needs) return {kind:'UPDATE',itemNumber:Number(needs[1]),status:'NEEDS_DATA',note:needs[2]?.trim()||null,referredTo:null};

  const ready=normalized.match(/^البند\s*(\d+)\s*(?:جاهز للقرار|جاهز للحسم)(?:\s*[:：-]\s*(.+))?$/i);
  if(ready) return {kind:'UPDATE',itemNumber:Number(ready[1]),status:'READY_FOR_DECISION',note:ready[2]?.trim()||null,referredTo:null};

  const referred=normalized.match(/^إحالة البند\s*(\d+)\s*(?:إلى|الى)\s*(.+)$/i);
  if(referred) return {kind:'UPDATE',itemNumber:Number(referred[1]),status:'REFERRED',note:null,referredTo:referred[2].trim()};

  const reopen=normalized.match(/^إعادة فتح البند\s*(\d+)(?:\s*[:：-]\s*(.+))?$/i);
  if(reopen) return {kind:'UPDATE',itemNumber:Number(reopen[1]),status:'OPEN',note:reopen[2]?.trim()||null,referredTo:null};

  return null;
}

async function loadLatestAgenda(userId:string){
  const sql=getRawSql();
  const rows=await sql`
    select id,thread_id,structured_data
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'meeting_opening_agenda'='true'
    order by created_at desc
    limit 1
  `;
  const row=rows[0];
  if(!row) return null;
  const data=record(row.structured_data);
  const agenda=record(data?.agenda) as unknown as FinancialMeetingOpeningAgenda|null;
  if(!agenda||!Array.isArray(agenda.items)) return null;
  return {messageId:String(row.id),threadId:String(row.thread_id),agenda};
}

async function loadTrackingEvents(userId:string,agendaMessageId:string){
  const sql=getRawSql();
  return sql`
    select structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'meeting_agenda_tracking_event'='true'
      and structured_data->>'agenda_message_id'=${agendaMessageId}
    order by created_at asc
  `;
}

export async function getMeetingAgendaTrackingState(userId:string):Promise<MeetingAgendaTrackingState|null>{
  const latest=await loadLatestAgenda(userId);
  if(!latest) return null;
  const events=await loadTrackingEvents(userId,latest.messageId);
  const eventByItem=new Map<string,{status:MeetingAgendaItemStatus;note:string|null;referredTo:string|null;updatedAt:string}>();
  for(const event of events){
    const data=record(event.structured_data);
    const itemId=typeof data?.agenda_item_id==='string'?data.agenda_item_id:null;
    const status=typeof data?.agenda_item_status==='string'?data.agenda_item_status as MeetingAgendaItemStatus:null;
    if(!itemId||!status) continue;
    eventByItem.set(itemId,{
      status,
      note:typeof data?.agenda_item_note==='string'?data.agenda_item_note:null,
      referredTo:typeof data?.agenda_item_referred_to==='string'?data.agenda_item_referred_to:null,
      updatedAt:String(event.created_at??''),
    });
  }
  const items=latest.agenda.items.map((item,index)=>{
    const event=eventByItem.get(item.id);
    return {
      itemId:item.id,itemNumber:index+1,title:item.title,priority:item.priority,
      ownerKey:item.ownerKey,ownerName:item.ownerName,
      status:event?.status??'OPEN',
      note:event?.note??null,
      referredTo:event?.referredTo??null,
      updatedAt:event?.updatedAt??null,
    };
  });
  const blockingOpenCount=items.filter(item=>item.priority==='BLOCKING'&&item.status!=='RESOLVED').length;
  const openCount=items.filter(item=>item.status!=='RESOLVED').length;
  return {
    agendaMessageId:latest.messageId,
    agendaCycleId:latest.agenda.cycleId,
    items,blockingOpenCount,openCount,
    canCloseMeeting:blockingOpenCount===0,
    noAutomaticDecision:true,
    noAutomaticAllocationChange:true,
  };
}

async function insertSecretaryReply(args:{
  userId:string;threadId:string;body:string;kind:ConversationMessageKind;structured:Record<string,unknown>;
}){
  const sql=getRawSql();
  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${args.threadId}::uuid,${args.userId}::uuid,'agent','central-secretary','أمين السر المركزي',
      ${args.kind},${args.body},${JSON.stringify(args.structured)}::jsonb
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

export async function applyMeetingAgendaCommand(userId:string,command:MeetingAgendaCommand){
  const latest=await loadLatestAgenda(userId);
  if(!latest) return null;

  if(command.kind==='SHOW_STATUS'){
    const state=await getMeetingAgendaTrackingState(userId);
    if(!state) return null;
    const body=`حالة الاجتماع: ${state.items.length} بندًا، المفتوح منها ${state.openCount}، والمانع للإغلاق ${state.blockingOpenCount}. ${state.canCloseMeeting?'لا توجد بنود مانعة مفتوحة ويمكن إنهاء الاجتماع إذا رغبت.':'لا يمكن إنهاء الاجتماع قبل حسم البنود المانعة أو إبقائها صراحة كقرارات غير محسومة تمنع الاعتماد.'}`;
    return insertSecretaryReply({
      userId,threadId:latest.threadId,body,kind:'followup',
      structured:{meeting_agenda_status:true,agenda_message_id:latest.messageId,tracking_state:state,external_execution:false}
    });
  }

  if(command.kind==='CLOSE_MEETING'){
    const state=await getMeetingAgendaTrackingState(userId);
    if(!state) return null;
    if(!state.canCloseMeeting){
      const blockers=state.items.filter(item=>item.priority==='BLOCKING'&&item.status!=='RESOLVED').map(item=>`#${item.itemNumber} ${item.title}`);
      return insertSecretaryReply({
        userId,threadId:latest.threadId,
        body:`لا يمكن إنهاء الاجتماع الآن. ما زالت البنود المانعة التالية مفتوحة: ${blockers.join('، ')}. يلزم حسمها أولًا أو إعادة البيانات ثم تحديث حالتها.`,
        kind:'risk',
        structured:{meeting_close_blocked:true,agenda_message_id:latest.messageId,blocking_items:blockers,tracking_state:state,external_execution:false}
      });
    }
    return insertSecretaryReply({
      userId,threadId:latest.threadId,
      body:'تم إنهاء الاجتماع من ناحية المحضر. لا توجد بنود مانعة مفتوحة. نتائج الجلسة تبقى وفق حالتها الحالية، وأي مشروع توزيع يحتاج اعتماد المستخدم الصريح قبل أن يصبح قرارًا معتمدًا.',
      kind:'followup',
      structured:{meeting_closed:true,agenda_message_id:latest.messageId,tracking_state:state,ratification_still_required:true,external_execution:false}
    });
  }

  const item=latest.agenda.items[command.itemNumber-1];
  if(!item) throw new Error('MEETING_AGENDA_ITEM_NOT_FOUND');

  await insertSecretaryReply({
    userId,threadId:latest.threadId,
    body:command.status==='RESOLVED'
      ? `تم حسم البند ${command.itemNumber}: ${item.title}.${command.note?` الملاحظة: ${command.note}`:''}`
      : command.status==='NEEDS_DATA'
        ? `تم تحديث البند ${command.itemNumber} إلى «يحتاج بيانات»: ${item.title}.${command.note?` المطلوب: ${command.note}`:''}`
        : command.status==='REFERRED'
          ? `تمت إحالة البند ${command.itemNumber}: ${item.title} إلى ${command.referredTo??'جهة أخرى'}، وسيبقى مفتوحًا حتى يعود الرد ويتم حسمه.`
          : command.status==='READY_FOR_DECISION'
            ? `البند ${command.itemNumber} أصبح جاهزًا للقرار: ${item.title}. لا يعني ذلك اعتماد القرار تلقائيًا.`
            : `تمت إعادة فتح البند ${command.itemNumber}: ${item.title}.`,
    kind:command.status==='NEEDS_DATA'?'request':command.status==='READY_FOR_DECISION'?'recommendation':'followup',
    structured:{
      meeting_agenda_tracking_event:true,
      agenda_message_id:latest.messageId,
      agenda_item_id:item.id,
      agenda_item_number:command.itemNumber,
      agenda_item_title:item.title,
      agenda_item_priority:item.priority,
      agenda_item_status:command.status,
      agenda_item_note:command.note,
      agenda_item_referred_to:command.referredTo,
      no_automatic_decision:true,
      no_automatic_allocation_change:true,
      external_execution:false,
    }
  });

  const state=await getMeetingAgendaTrackingState(userId);
  return insertSecretaryReply({
    userId,threadId:latest.threadId,
    body:state
      ? `تحديث المحضر: بقي ${state.openCount} بندًا غير محسوم، منها ${state.blockingOpenCount} مانع/موانع للإغلاق.`
      : 'تم تحديث المحضر.',
    kind:'followup',
    structured:{meeting_agenda_status:true,agenda_message_id:latest.messageId,tracking_state:state,external_execution:false}
  });
}
