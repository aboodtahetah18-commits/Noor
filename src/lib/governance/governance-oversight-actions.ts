import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind, ConversationRoomKey } from '@/lib/conversations/store';
import { getInstitutionalDecisionRegistry } from '@/lib/governance/institutional-decision-registry';
import { evaluateFollowupTiming } from '@/lib/governance/institutional-decision-followup-deadlines';
import { followupHistoryKey, loadGovernanceFollowupHistories } from '@/lib/governance/governance-followup-history';

export type OversightQuickActionCommand=
  | {kind:'OPEN_FOLLOWUP';followupNumber:number}
  | {kind:'OPEN_DECISION_CONTEXT';followupNumber:number}
  | {kind:'REQUEST_USER_DATA';followupNumber:number;request:string};

type IndexedFollowup={
  number:number;
  decision:Awaited<ReturnType<typeof getInstitutionalDecisionRegistry>>['decisions'][number];
  followup:Awaited<ReturnType<typeof getInstitutionalDecisionRegistry>>['decisions'][number]['followups'][number];
};

export function parseOversightQuickActionCommand(text:string):OversightQuickActionCommand|null{
  const normalized=text.trim().replace(/\s+/g,' ');
  const open=normalized.match(/^فتح المتابعة\s*(\d+)$/i);
  if(open) return {kind:'OPEN_FOLLOWUP',followupNumber:Number(open[1])};

  const context=normalized.match(/^(?:فتح|عرض) سياق القرار للمتابعة\s*(\d+)$/i);
  if(context) return {kind:'OPEN_DECISION_CONTEXT',followupNumber:Number(context[1])};

  const request=normalized.match(/^طلب بيانات المتابعة\s*(\d+)\s*[:：-]\s*(.+)$/i);
  if(request) return {kind:'REQUEST_USER_DATA',followupNumber:Number(request[1]),request:request[2].trim()};

  return null;
}

function indexFollowups(registry:Awaited<ReturnType<typeof getInstitutionalDecisionRegistry>>){
  let number=0;
  const result:IndexedFollowup[]=[];
  for(const decision of registry.decisions){
    for(const followup of decision.followups){
      number+=1;
      result.push({number,decision,followup});
    }
  }
  return result;
}

export function buildOversightQuickActions(args:{
  followupNumber:number;
  status:string;
  assignedTo:string|null;
  timingState:string;
  escalationEligible:boolean;
}){
  const actions:Array<Record<string,unknown>>=[
    {key:'OPEN_FOLLOWUP',label:'فتح المتابعة',command:`فتح المتابعة ${args.followupNumber}`},
    {key:'OPEN_DECISION_CONTEXT',label:'عرض القرار الأصلي',command:`عرض سياق القرار للمتابعة ${args.followupNumber}`},
  ];
  if(!args.assignedTo){
    actions.push({key:'ASSIGN',label:'إسناد المتابعة',command_template:`إسناد المتابعة ${args.followupNumber} إلى [المسؤول]`});
  }
  if(args.status!=='WAITING_USER'){
    actions.push({key:'REQUEST_USER_DATA',label:'طلب بيانات من المستخدم',command_template:`طلب بيانات المتابعة ${args.followupNumber}: [البيانات المطلوبة]`});
  }
  if(args.escalationEligible){
    actions.push({
      key:'ESCALATE',
      label:'تصعيد للمحافظ',
      command:`تصعيد المتابعة ${args.followupNumber} إلى المحافظ`,
      requires_confirmation:true,
      confirmation_title:'تأكيد التصعيد',
      confirmation_message:'سيُسجل تصعيد إداري رسمي لهذه المتابعة إلى المحافظ بسبب تجاوز موعد الاستحقاق المعتمد. لا يغير القرار المالي ولا ينفذ أي حركة مالية.',
      confirmation_confirm_label:'تأكيد التصعيد',
    });
  }
  actions.push({
    key:'COMPLETE',
    label:'إغلاق المتابعة',
    command:`إكمال المتابعة ${args.followupNumber}`,
    requires_confirmation:true,
    confirmation_title:'تأكيد إغلاق المتابعة',
    confirmation_message:'سيتم تسجيل المتابعة كمكتملة وإزالتها من قائمة المتابعات المفتوحة. القرار الأصلي وسجل الأحداث سيبقيان محفوظين دون حذف.',
    confirmation_confirm_label:'تأكيد الإغلاق',
  });
  return actions;
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

export async function applyOversightQuickActionCommand(
  userId:string,
  roomKey:Extract<ConversationRoomKey,'central'|'secretary'>,
  command:OversightQuickActionCommand,
){
  const [registry,histories]=await Promise.all([
    getInstitutionalDecisionRegistry(userId),
    loadGovernanceFollowupHistories(userId),
  ]);
  const target=indexFollowups(registry).find(item=>item.number===command.followupNumber);
  if(!target) throw new Error('DECISION_FOLLOWUP_NOT_FOUND');
  const threadId=await threadIdFor(userId,roomKey);
  if(!threadId) return null;

  const timing=evaluateFollowupTiming({
    now:new Date(),
    dueDate:target.followup.dueDate??null,
    reminderLeadDays:target.followup.reminderLeadDays??null,
    completed:target.followup.completed,
  });
  const quickActions=buildOversightQuickActions({
    followupNumber:target.number,
    status:target.followup.status,
    assignedTo:target.followup.assignedTo,
    timingState:timing.state,
    escalationEligible:timing.escalationEligible,
  });

  if(command.kind==='OPEN_FOLLOWUP'){
    const body=`المتابعة ${target.number}: «${target.followup.title}». الحالة ${target.followup.status}${target.followup.assignedTo?`، المسؤول ${target.followup.assignedTo}`:''}${target.followup.dueDate?`، موعد الاستحقاق ${target.followup.dueDate}`:'، ولا يوجد موعد استحقاق معتمد'}، والحالة الزمنية ${timing.state}. القرار المرتبط: ${target.decision.title}.`;
    return insertReply({
      userId,threadId,roomKey,body,kind:'followup',
      structured:{
        governance_oversight_followup_detail:true,
        followup_number:target.number,
        registry_id:target.decision.registryId,
        followup_id:target.followup.followupId,
        followup:target.followup,
        history:histories[followupHistoryKey(target.decision.registryId,target.followup.followupId)]??[],
        timing,
        quick_actions:quickActions,
        decision_reference:{
          registry_id:target.decision.registryId,
          source_message_id:target.decision.sourceMessageId,
          source_decision_id:target.decision.sourceDecisionId,
          source_room:'council',
          cycle_id:target.decision.cycleId,
          plan_id:target.decision.planId,
          plan_version_id:target.decision.planVersionId,
        },
        external_execution:false,
      },
    });
  }

  if(command.kind==='OPEN_DECISION_CONTEXT'){
    const body=`سياق القرار المرتبط بالمتابعة ${target.number}: «${target.decision.title}». القرار ${target.decision.registryId}، حالته ${target.decision.status}، وتاريخه ${target.decision.decidedAt}. تم ربطه برسالة المصدر الأصلية لتتمكن الواجهة من فتح سياقه مباشرة دون البحث اليدوي.`;
    return insertReply({
      userId,threadId,roomKey,body,kind:'followup',
      structured:{
        governance_oversight_decision_context:true,
        followup_number:target.number,
        registry_id:target.decision.registryId,
        decision:target.decision,
        navigation_target:{
          room_key:'council',
          source_message_id:target.decision.sourceMessageId,
          source_decision_id:target.decision.sourceDecisionId,
        },
        external_execution:false,
        execution_boundary:'فتح سياق القرار للعرض فقط؛ لا تعديل قرار ولا تنفيذ مالي',
      },
    });
  }

  const sql=getRawSql();
  await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent',
      ${roomKey==='central'?'central-governor':'central-secretary'},
      ${roomKey==='central'?'محافظ بنك نماء المركزي':'أمين السر المركزي'},
      'request',${`نحتاج منك لاستكمال المتابعة ${target.number} «${target.followup.title}»: ${command.request}`},
      ${JSON.stringify({
        institutional_decision_followup_user_request:true,
        registry_id:target.decision.registryId,
        followup_id:target.followup.followupId,
        followup_number:target.number,
        requested_data:command.request,
        external_execution:false,
      })}::jsonb
    )
  `;
  await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent',
      ${roomKey==='central'?'central-governor':'central-secretary'},
      ${roomKey==='central'?'محافظ بنك نماء المركزي':'أمين السر المركزي'},
      'followup','تم تحديث حالة المتابعة إلى «بانتظار المستخدم» وربط طلب البيانات بالقرار الأصلي.',
      ${JSON.stringify({
        institutional_decision_followup_event:true,
        registry_id:target.decision.registryId,
        followup_id:target.followup.followupId,
        followup_number:target.number,
        followup_title:target.followup.title,
        followup_status:'WAITING_USER',
        followup_assigned_to:target.followup.assignedTo,
        followup_note:command.request,
        event_kind:'REQUEST_USER_DATA',
        external_execution:false,
      })}::jsonb
    )
  `;

  return insertReply({
    userId,threadId,roomKey,
    body:`تم إنشاء طلب البيانات للمتابعة ${target.number} وتسجيلها كـ WAITING_USER. لن تعتبر مكتملة حتى يصل الرد وتُحدّث حالتها صراحة.`,
    kind:'followup',
    structured:{
      governance_oversight_quick_action:true,
      action:'REQUEST_USER_DATA',
      registry_id:target.decision.registryId,
      followup_id:target.followup.followupId,
      followup_number:target.number,
      requested_data:command.request,
      external_execution:false,
      execution_boundary:'طلب بيانات وتحديث متابعة فقط؛ لا تعديل قرار ولا تنفيذ مالي',
    },
  });
}
