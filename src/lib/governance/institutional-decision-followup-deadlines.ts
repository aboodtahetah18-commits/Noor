import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind, ConversationRoomKey } from '@/lib/conversations/store';
import { getInstitutionalDecisionRegistry, type InstitutionalDecisionFollowup } from '@/lib/governance/institutional-decision-registry';

export type FollowupTimingState='NO_DUE_DATE'|'ON_TIME'|'DUE_SOON'|'DUE_TODAY'|'OVERDUE'|'COMPLETED';
export type FollowupDeadlineCommand=
  | {kind:'SET_DUE_DATE';followupNumber:number;dueDate:string}
  | {kind:'SET_REMINDER_LEAD';followupNumber:number;leadDays:number}
  | {kind:'CLEAR_DUE_DATE';followupNumber:number}
  | {kind:'ESCALATE';followupNumber:number;target:'GOVERNOR'}
  | {kind:'SHOW_DEADLINES'};

function validIsoDate(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d=new Date(`${value}T00:00:00Z`);
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}

export function parseFollowupDeadlineCommand(text:string):FollowupDeadlineCommand|null{
  const normalized=text.trim().replace(/\s+/g,' ');
  if(/^(مواعيد المتابعات|حالة مواعيد المتابعات|عرض مواعيد المتابعات)$/i.test(normalized)) return {kind:'SHOW_DEADLINES'};

  const due=normalized.match(/^موعد المتابعة\s*(\d+)\s*(\d{4}-\d{2}-\d{2})$/i);
  if(due?.[1]&&due[2]&&validIsoDate(due[2])) return {kind:'SET_DUE_DATE',followupNumber:Number(due[1]),dueDate:due[2]};

  const lead=normalized.match(/^تنبيه المتابعة\s*(\d+)\s*قبل\s*(\d+)\s*أيام?$/i);
  if(lead) return {kind:'SET_REMINDER_LEAD',followupNumber:Number(lead[1]),leadDays:Number(lead[2])};

  const clear=normalized.match(/^إلغاء موعد المتابعة\s*(\d+)$/i);
  if(clear) return {kind:'CLEAR_DUE_DATE',followupNumber:Number(clear[1])};

  const escalate=normalized.match(/^تصعيد المتابعة\s*(\d+)\s*(?:إلى|الى)\s*المحافظ$/i);
  if(escalate) return {kind:'ESCALATE',followupNumber:Number(escalate[1]),target:'GOVERNOR'};

  return null;
}

function startOfUtcDay(value:Date){
  return Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate());
}

export function evaluateFollowupTiming(args:{
  now:Date;
  dueDate:string|null;
  reminderLeadDays:number|null;
  completed:boolean;
}):{state:FollowupTimingState;daysUntilDue:number|null;escalationEligible:boolean}{
  if(args.completed) return {state:'COMPLETED',daysUntilDue:null,escalationEligible:false};
  if(!args.dueDate) return {state:'NO_DUE_DATE',daysUntilDue:null,escalationEligible:false};

  const due=new Date(`${args.dueDate}T00:00:00Z`);
  if(!Number.isFinite(due.getTime())) return {state:'NO_DUE_DATE',daysUntilDue:null,escalationEligible:false};
  const daysUntilDue=Math.floor((startOfUtcDay(due)-startOfUtcDay(args.now))/86400000);
  if(daysUntilDue<0) return {state:'OVERDUE',daysUntilDue,escalationEligible:true};
  if(daysUntilDue===0) return {state:'DUE_TODAY',daysUntilDue,escalationEligible:false};
  if(args.reminderLeadDays!==null&&args.reminderLeadDays>=0&&daysUntilDue<=args.reminderLeadDays){
    return {state:'DUE_SOON',daysUntilDue,escalationEligible:false};
  }
  return {state:'ON_TIME',daysUntilDue,escalationEligible:false};
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

export async function applyFollowupDeadlineCommand(
  userId:string,
  roomKey:Extract<ConversationRoomKey,'central'|'secretary'>,
  command:FollowupDeadlineCommand,
){
  const registry=await getInstitutionalDecisionRegistry(userId);
  const indexed=indexFollowups(registry.decisions);
  const threadId=await threadIdFor(userId,roomKey);
  if(!threadId) return null;

  if(command.kind==='SHOW_DEADLINES'){
    const evaluated=indexed.map(item=>({
      number:item.number,
      title:item.followup.title,
      assignedTo:item.followup.assignedTo,
      dueDate:item.followup.dueDate??null,
      reminderLeadDays:item.followup.reminderLeadDays??null,
      ...evaluateFollowupTiming({
        now:new Date(),
        dueDate:item.followup.dueDate??null,
        reminderLeadDays:item.followup.reminderLeadDays??null,
        completed:item.followup.completed,
      }),
    }));
    const overdue=evaluated.filter(item=>item.state==='OVERDUE');
    const dueSoon=evaluated.filter(item=>item.state==='DUE_SOON'||item.state==='DUE_TODAY');
    const noDate=evaluated.filter(item=>item.state==='NO_DUE_DATE');
    const body=`مواعيد المتابعات: ${evaluated.length} إجمالًا، ${overdue.length} متأخرة فعليًا بحسب موعد معتمد، ${dueSoon.length} في نافذة تنبيه معتمدة/مستحقة اليوم، و${noDate.length} بلا موعد استحقاق. لا أعتبر أي متابعة «قريبة» دون نافذة تنبيه حددها المستخدم.`;
    return insertReply({
      userId,threadId,roomKey,body,kind:overdue.length?'risk':'followup',
      structured:{
        institutional_decision_followup_deadlines:true,
        deadlines:evaluated,
        totals:{all:evaluated.length,overdue:overdue.length,due_soon:dueSoon.length,no_due_date:noDate.length},
        timing_policy:'NO_DUE_SOON_WITHOUT_EXPLICIT_REMINDER_LEAD',
        escalation_policy:'OVERDUE_MAKES_ESCALATION_ELIGIBLE_BUT_NEVER_AUTO_ESCALATES',
        external_execution:false,
      },
    });
  }

  const target=indexed.find(item=>item.number===command.followupNumber);
  if(!target) throw new Error('DECISION_FOLLOWUP_NOT_FOUND');

  if(command.kind==='ESCALATE'){
    const timing=evaluateFollowupTiming({
      now:new Date(),
      dueDate:target.followup.dueDate??null,
      reminderLeadDays:target.followup.reminderLeadDays??null,
      completed:target.followup.completed,
    });
    if(!timing.escalationEligible) throw new Error('FOLLOWUP_ESCALATION_NOT_ELIGIBLE');
    return insertReply({
      userId,threadId,roomKey,
      body:`تم تسجيل تصعيد المتابعة ${command.followupNumber} «${target.followup.title}» إلى محافظ بنك نماء المركزي لأنها تجاوزت موعد الاستحقاق المعتمد. التصعيد إداري فقط ولا يغيّر القرار أو ينفذ إجراءً ماليًا.`,
      kind:'risk',
      structured:{
        institutional_decision_followup_escalation:true,
        registry_id:target.registryId,
        followup_id:target.followup.followupId,
        followup_number:command.followupNumber,
        escalation_target:'central-governor',
        escalation_reason:'APPROVED_DUE_DATE_PASSED',
        due_date:target.followup.dueDate??null,
        external_execution:false,
      },
    });
  }

  const dueDate=command.kind==='SET_DUE_DATE'?command.dueDate:command.kind==='CLEAR_DUE_DATE'?null:target.followup.dueDate??null;
  const reminderLeadDays=command.kind==='SET_REMINDER_LEAD'?command.leadDays:command.kind==='CLEAR_DUE_DATE'?null:target.followup.reminderLeadDays??null;
  if(command.kind==='SET_REMINDER_LEAD'&&(!Number.isInteger(command.leadDays)||command.leadDays<0||command.leadDays>365)){
    throw new Error('FOLLOWUP_REMINDER_LEAD_INVALID');
  }

  const body=command.kind==='SET_DUE_DATE'
    ? `تم اعتماد موعد استحقاق المتابعة ${command.followupNumber} «${target.followup.title}» بتاريخ ${command.dueDate}.`
    : command.kind==='SET_REMINDER_LEAD'
      ? `تم اعتماد نافذة تنبيه المتابعة ${command.followupNumber} قبل ${command.leadDays} يوم/أيام من موعد الاستحقاق. لن تُستخدم أي نافذة افتراضية غير هذه.`
      : `تم إلغاء موعد استحقاق المتابعة ${command.followupNumber}. لن توصف بأنها متأخرة أو قريبة من الاستحقاق ما لم يعتمد موعد جديد.`;

  return insertReply({
    userId,threadId,roomKey,body,kind:'followup',
    structured:{
      institutional_decision_followup_deadline_event:true,
      registry_id:target.registryId,
      followup_id:target.followup.followupId,
      followup_number:command.followupNumber,
      followup_due_date:dueDate,
      followup_reminder_lead_days:reminderLeadDays,
      deadline_event_kind:command.kind,
      external_execution:false,
      execution_boundary:'تحديث موعد متابعة مؤسسية فقط؛ لا تعديل قرار ولا تنفيذ مالي',
    },
  });
}
