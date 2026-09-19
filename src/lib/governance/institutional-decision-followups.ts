import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind, ConversationRoomKey } from '@/lib/conversations/store';
import { getInstitutionalDecisionRegistry, type InstitutionalDecisionFollowup } from '@/lib/governance/institutional-decision-registry';

export type DecisionFollowupStatus='OPEN'|'ASSIGNED'|'IN_PROGRESS'|'WAITING_USER'|'WAITING_OWNER'|'VERIFICATION_PENDING'|'BLOCKED'|'COMPLETED';

export type DecisionFollowupCommand=
  | {kind:'SHOW'}
  | {kind:'ASSIGN';followupNumber:number;assignedTo:string}
  | {kind:'STATUS';followupNumber:number;status:Exclude<DecisionFollowupStatus,'ASSIGNED'>;note:string|null};

export function parseDecisionFollowupCommand(text:string):DecisionFollowupCommand|null{
  const normalized=text.trim().replace(/\s+/g,' ');
  if(/^(متابعات القرارات|متابعات السجل|حالة متابعات القرارات|عرض المتابعات)$/i.test(normalized)) return {kind:'SHOW'};

  const assign=normalized.match(/^إسناد المتابعة\s*(\d+)\s*(?:إلى|الى)\s*(.+)$/i);
  if(assign?.[1]&&assign[2]) return {kind:'ASSIGN',followupNumber:Number(assign[1]),assignedTo:assign[2].trim()};

  const inProgress=normalized.match(/^بدء المتابعة\s*(\d+)(?:\s*[:：-]\s*(.+))?$/i);
  if(inProgress) return {kind:'STATUS',followupNumber:Number(inProgress[1]),status:'IN_PROGRESS',note:inProgress[2]?.trim()||null};

  const waitingUser=normalized.match(/^المتابعة\s*(\d+)\s*(?:بانتظار|تنتظر)\s*المستخدم(?:\s*[:：-]\s*(.+))?$/i);
  if(waitingUser) return {kind:'STATUS',followupNumber:Number(waitingUser[1]),status:'WAITING_USER',note:waitingUser[2]?.trim()||null};

  const waitingOwner=normalized.match(/^المتابعة\s*(\d+)\s*(?:بانتظار|تنتظر)\s*(?:المسؤول|الجهة)(?:\s*[:：-]\s*(.+))?$/i);
  if(waitingOwner) return {kind:'STATUS',followupNumber:Number(waitingOwner[1]),status:'WAITING_OWNER',note:waitingOwner[2]?.trim()||null};

  const blocked=normalized.match(/^تعليق المتابعة\s*(\d+)(?:\s*[:：-]\s*(.+))?$/i);
  if(blocked) return {kind:'STATUS',followupNumber:Number(blocked[1]),status:'BLOCKED',note:blocked[2]?.trim()||null};

  const complete=normalized.match(/^(?:إكمال|إغلاق|اغلاق) المتابعة\s*(\d+)(?:\s*[:：-]\s*(.+))?$/i);
  if(complete) return {kind:'STATUS',followupNumber:Number(complete[1]),status:'COMPLETED',note:complete[2]?.trim()||null};

  const reopen=normalized.match(/^إعادة فتح المتابعة\s*(\d+)(?:\s*[:：-]\s*(.+))?$/i);
  if(reopen) return {kind:'STATUS',followupNumber:Number(reopen[1]),status:'OPEN',note:reopen[2]?.trim()||null};

  return null;
}

type IndexedFollowup={number:number;registryId:string;decisionTitle:string;followup:InstitutionalDecisionFollowup};

function indexFollowups(decisions:Awaited<ReturnType<typeof getInstitutionalDecisionRegistry>>['decisions']){
  let index=0;
  const items:IndexedFollowup[]=[];
  for(const decision of decisions){
    for(const followup of decision.followups){
      index+=1;
      items.push({number:index,registryId:decision.registryId,decisionTitle:decision.title,followup});
    }
  }
  return items;
}

async function threadIdFor(userId:string,roomKey:Extract<ConversationRoomKey,'central'|'secretary'>){
  const sql=getRawSql();
  const rows=await sql`select id from public.conversation_threads where user_id=${userId}::uuid and room_key=${roomKey} limit 1`;
  return rows[0]?.id?String(rows[0].id):null;
}

async function insertReply(args:{
  userId:string;threadId:string;roomKey:Extract<ConversationRoomKey,'central'|'secretary'>;
  body:string;kind:ConversationMessageKind;structured:Record<string,unknown>;
}){
  const sql=getRawSql();
  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${args.threadId}::uuid,${args.userId}::uuid,'agent',
      ${args.roomKey==='central'?'central-governor':'central-secretary'},
      ${args.roomKey==='central'?'محافظ بنك نماء المركزي':'أمين السر المركزي'},
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

export async function applyDecisionFollowupCommand(
  userId:string,
  roomKey:Extract<ConversationRoomKey,'central'|'secretary'>,
  command:DecisionFollowupCommand,
){
  const registry=await getInstitutionalDecisionRegistry(userId);
  const indexed=indexFollowups(registry.decisions);
  const threadId=await threadIdFor(userId,roomKey);
  if(!threadId) return null;

  if(command.kind==='SHOW'){
    const open=indexed.filter(item=>!item.followup.completed);
    const waiting=open.filter(item=>item.followup.status==='WAITING_USER'||item.followup.status==='WAITING_OWNER');
    const blocked=open.filter(item=>item.followup.status==='BLOCKED');
    const unassigned=open.filter(item=>!item.followup.assignedTo);
    const body=indexed.length===0
      ? 'لا توجد متابعات مرتبطة بقرارات مؤسسية حتى الآن.'
      : `متابعات القرارات: ${indexed.length} إجمالًا، ${open.length} مفتوحة، ${waiting.length} بانتظار طرف، ${blocked.length} معلقة، و${unassigned.length} بلا مسؤول محدد. لا أصف متابعة بأنها متأخرة زمنيًا دون موعد استحقاق معتمد.`;
    return insertReply({
      userId,threadId,roomKey,body,kind:'followup',
      structured:{
        institutional_decision_followups:true,
        indexed_followups:indexed,
        totals:{all:indexed.length,open:open.length,waiting:waiting.length,blocked:blocked.length,unassigned:unassigned.length},
        lateness_policy:'NO_OVERDUE_WITHOUT_APPROVED_DUE_DATE',
        external_execution:false,
      },
    });
  }

  const target=indexed.find(item=>item.number===command.followupNumber);
  if(!target) throw new Error('DECISION_FOLLOWUP_NOT_FOUND');

  const nextStatus=command.kind==='ASSIGN'?'ASSIGNED':command.status;
  const assignedTo=command.kind==='ASSIGN'?command.assignedTo:target.followup.assignedTo;
  const note=command.kind==='STATUS'?command.note:null;

  await insertReply({
    userId,threadId,roomKey,
    body:command.kind==='ASSIGN'
      ? `تم إسناد المتابعة ${command.followupNumber} «${target.followup.title}» إلى ${command.assignedTo}. هذا إسناد متابعة داخل نماء وليس تنفيذًا ماليًا.`
      : nextStatus==='COMPLETED'
        ? `تم إغلاق المتابعة ${command.followupNumber} «${target.followup.title}» كمكتملة.${note?` الملاحظة: ${note}`:''}`
        : `تم تحديث المتابعة ${command.followupNumber} «${target.followup.title}» إلى ${nextStatus}.${note?` الملاحظة: ${note}`:''}`,
    kind:nextStatus==='BLOCKED'?'risk':nextStatus==='COMPLETED'?'decision':'followup',
    structured:{
      institutional_decision_followup_event:true,
      registry_id:target.registryId,
      followup_id:target.followup.followupId,
      followup_number:command.followupNumber,
      followup_title:target.followup.title,
      followup_status:nextStatus,
      followup_assigned_to:assignedTo,
      followup_note:note,
      event_kind:command.kind,
      external_execution:false,
      execution_boundary:'تحديث حالة متابعة مؤسسية فقط؛ لا تعديل قرار ولا تنفيذ مالي',
    },
  });

  const refreshed=await getInstitutionalDecisionRegistry(userId);
  const refreshedTarget=indexFollowups(refreshed.decisions).find(item=>item.registryId===target.registryId&&item.followup.followupId===target.followup.followupId);
  return insertReply({
    userId,threadId,roomKey,
    body:refreshedTarget
      ? `الحالة الحالية للمتابعة: ${refreshedTarget.followup.status}${refreshedTarget.followup.assignedTo?` — المسؤول: ${refreshedTarget.followup.assignedTo}`:''}.`
      : 'تم تسجيل تحديث المتابعة.',
    kind:'followup',
    structured:{
      institutional_decision_followup_status:true,
      registry_id:target.registryId,
      followup_id:target.followup.followupId,
      followup:refreshedTarget?.followup??null,
      external_execution:false,
    },
  });
}
