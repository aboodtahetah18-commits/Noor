import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind, ConversationRoomKey } from '@/lib/conversations/store';
import { getInstitutionalDecisionRegistry } from '@/lib/governance/institutional-decision-registry';
import { evaluateFollowupTiming } from '@/lib/governance/institutional-decision-followup-deadlines';
import { buildOversightQuickActions } from '@/lib/governance/governance-oversight-actions';
import { followupHistoryKey, loadGovernanceFollowupHistories, type GovernanceFollowupHistoryEvent } from '@/lib/governance/governance-followup-history';

export type GovernanceOversightFollowupItem={
  number:number;
  registryId:string;
  decisionTitle:string;
  sourceMessageId:string;
  sourceDecisionId:string|null;
  followupId:string;
  title:string;
  status:string;
  assignedTo:string|null;
  dueDate:string|null;
  timingState:string;
  daysUntilDue:number|null;
  quickActions:Array<Record<string,unknown>>;
  history:GovernanceFollowupHistoryEvent[];
};

export type GovernanceOversightEscalation={
  registryId:string;
  followupId:string;
  target:string;
  reason:string;
  dueDate:string|null;
  createdAt:string;
};

export type GovernanceOversightDashboard={
  generatedAt:string;
  openDecisions:number;
  pendingFollowups:number;
  overdueFollowups:GovernanceOversightFollowupItem[];
  waitingUser:GovernanceOversightFollowupItem[];
  waitingOwner:GovernanceOversightFollowupItem[];
  unassigned:GovernanceOversightFollowupItem[];
  blocked:GovernanceOversightFollowupItem[];
  dueSoon:GovernanceOversightFollowupItem[];
  openEscalations:GovernanceOversightEscalation[];
  allOpenFollowups:GovernanceOversightFollowupItem[];
  policies:{
    noInventedDueDates:true;
    noInventedReminderLead:true;
    noAutomaticEscalation:true;
    readOnlyFinancialState:true;
  };
  externalExecution:false;
};

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function text(value:unknown){
  return typeof value==='string'&&value.trim()?value.trim():null;
}

export function buildGovernanceOversightDashboard(args:{
  registry:Awaited<ReturnType<typeof getInstitutionalDecisionRegistry>>;
  now:Date;
  escalations:GovernanceOversightEscalation[];
  histories?:Record<string,GovernanceFollowupHistoryEvent[]>;
}):GovernanceOversightDashboard{
  let number=0;
  const allOpenFollowups:GovernanceOversightFollowupItem[]=[];
  for(const decision of args.registry.decisions){
    for(const followup of decision.followups){
      number+=1;
      if(followup.completed) continue;
      const timing=evaluateFollowupTiming({
        now:args.now,
        dueDate:followup.dueDate??null,
        reminderLeadDays:followup.reminderLeadDays??null,
        completed:followup.completed,
      });
      allOpenFollowups.push({
        number,
        registryId:decision.registryId,
        decisionTitle:decision.title,
        sourceMessageId:decision.sourceMessageId,
        sourceDecisionId:decision.sourceDecisionId,
        followupId:followup.followupId,
        title:followup.title,
        status:followup.status,
        assignedTo:followup.assignedTo,
        dueDate:followup.dueDate??null,
        timingState:timing.state,
        daysUntilDue:timing.daysUntilDue,
        history:args.histories?.[followupHistoryKey(decision.registryId,followup.followupId)]??[],
        quickActions:buildOversightQuickActions({
          followupNumber:number,
          status:followup.status,
          assignedTo:followup.assignedTo,
          timingState:timing.state,
          escalationEligible:timing.escalationEligible,
        }),
      });
    }
  }

  return {
    generatedAt:args.now.toISOString(),
    openDecisions:args.registry.decisions.filter(item=>item.status==='FOLLOWUP_PENDING').length,
    pendingFollowups:allOpenFollowups.length,
    overdueFollowups:allOpenFollowups.filter(item=>item.timingState==='OVERDUE'),
    waitingUser:allOpenFollowups.filter(item=>item.status==='WAITING_USER'),
    waitingOwner:allOpenFollowups.filter(item=>item.status==='WAITING_OWNER'),
    unassigned:allOpenFollowups.filter(item=>!item.assignedTo),
    blocked:allOpenFollowups.filter(item=>item.status==='BLOCKED'),
    dueSoon:allOpenFollowups.filter(item=>item.timingState==='DUE_SOON'||item.timingState==='DUE_TODAY'),
    openEscalations:args.escalations,
    allOpenFollowups,
    policies:{
      noInventedDueDates:true,
      noInventedReminderLead:true,
      noAutomaticEscalation:true,
      readOnlyFinancialState:true,
    },
    externalExecution:false,
  };
}

async function loadOpenEscalations(userId:string):Promise<GovernanceOversightEscalation[]>{
  const sql=getRawSql();
  const rows=await sql`
    select structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'institutional_decision_followup_escalation'='true'
    order by created_at desc
  `;

  const latest=new Map<string,GovernanceOversightEscalation>();
  for(const row of rows){
    const data=record(row.structured_data);
    const registryId=text(data?.registry_id);
    const followupId=text(data?.followup_id);
    if(!registryId||!followupId) continue;
    const key=`${registryId}:${followupId}`;
    if(latest.has(key)) continue;
    latest.set(key,{
      registryId,
      followupId,
      target:text(data?.escalation_target)??'central-governor',
      reason:text(data?.escalation_reason)??'APPROVED_DUE_DATE_PASSED',
      dueDate:text(data?.due_date),
      createdAt:String(row.created_at??''),
    });
  }
  return [...latest.values()];
}

export async function getGovernanceOversightDashboard(userId:string){
  const [registry,escalations,histories]=await Promise.all([
    getInstitutionalDecisionRegistry(userId),
    loadOpenEscalations(userId),
    loadGovernanceFollowupHistories(userId),
  ]);
  const completedKeys=new Set<string>();
  for(const decision of registry.decisions){
    for(const followup of decision.followups){
      if(followup.completed) completedKeys.add(`${decision.registryId}:${followup.followupId}`);
    }
  }
  return buildGovernanceOversightDashboard({
    registry,
    now:new Date(),
    escalations:escalations.filter(item=>!completedKeys.has(`${item.registryId}:${item.followupId}`)),
    histories,
  });
}

export function isGovernanceOversightDashboardRequest(value:string){
  return /^(لوحة الرقابة|لوحة المتابعة|لوحة المحافظ|لوحة أمين السر|اللوحة الرقابية|ملخص الرقابة)$/i.test(value.trim());
}

export async function createGovernanceOversightDashboardReply(
  userId:string,
  roomKey:Extract<ConversationRoomKey,'central'|'secretary'>,
){
  const dashboard=await getGovernanceOversightDashboard(userId);
  const sql=getRawSql();
  const rows=await sql`
    select id from public.conversation_threads
    where user_id=${userId}::uuid and room_key=${roomKey}
    limit 1
  `;
  const threadId=rows[0]?.id?String(rows[0].id):null;
  if(!threadId) return null;

  const body=`اللوحة الرقابية: ${dashboard.openDecisions} قرارًا ما زال تحت المتابعة، و${dashboard.pendingFollowups} متابعة مفتوحة، منها ${dashboard.overdueFollowups.length} متأخرة فعليًا، ${dashboard.waitingUser.length} بانتظار المستخدم، ${dashboard.waitingOwner.length} بانتظار مسؤول/جهة، ${dashboard.unassigned.length} بلا إسناد، ${dashboard.blocked.length} معلقة، و${dashboard.openEscalations.length} تصعيدًا مفتوحًا. لا أصف شيئًا بأنه متأخر أو قريب دون موعد أو نافذة تنبيه معتمدين.`;

  const inserted=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent',
      ${roomKey==='central'?'central-governor':'central-secretary'},
      ${roomKey==='central'?'محافظ بنك نماء المركزي':'أمين السر المركزي'},
      'followup',${body},
      ${JSON.stringify({
        governance_oversight_dashboard:true,
        dashboard,
        open_decisions:dashboard.openDecisions,
        pending_followups:dashboard.pendingFollowups,
        overdue_followups:dashboard.overdueFollowups,
        waiting_user:dashboard.waitingUser,
        waiting_owner:dashboard.waitingOwner,
        unassigned_followups:dashboard.unassigned,
        blocked_followups:dashboard.blocked,
        open_escalations:dashboard.openEscalations,
        external_execution:false,
        execution_boundary:'لوحة رقابية للقراءة والمتابعة فقط؛ لا تعديل قرار ولا تنفيذ مالي',
      })}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  const row=inserted[0];
  if(!row) return null;
  return {
    ...row,id:String(row.id),sender_type:'agent' as const,sender_key:String(row.sender_key),sender_name:String(row.sender_name),
    message_kind:String(row.message_kind) as ConversationMessageKind,body:String(row.body),
    structured_data:row.structured_data as Record<string,unknown>,
  };
}
