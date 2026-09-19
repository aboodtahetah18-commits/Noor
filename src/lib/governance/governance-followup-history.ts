import { getRawSql } from '@/infrastructure/db/client';

export type GovernanceFollowupHistoryEventType=
  | 'ASSIGNED'
  | 'STATUS_CHANGED'
  | 'DATA_REQUESTED'
  | 'DUE_DATE_SET'
  | 'REMINDER_SET'
  | 'DUE_DATE_CLEARED'
  | 'ESCALATED'
  | 'COMPLETED'
  | 'REOPENED'
  | 'USER_RESPONDED';

export type GovernanceFollowupHistoryEvent={
  eventId:string;
  eventType:GovernanceFollowupHistoryEventType;
  label:string;
  detail:string|null;
  actorKey:string|null;
  actorName:string;
  createdAt:string;
};

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function text(value:unknown){
  return typeof value==='string'&&value.trim()?value.trim():null;
}
function historyKey(registryId:string,followupId:string){
  return registryId+':'+followupId;
}

function statusLabel(status:string){
  if(status==='ASSIGNED') return 'تم إسناد المتابعة';
  if(status==='IN_PROGRESS') return 'بدأت المتابعة';
  if(status==='WAITING_USER') return 'بانتظار المستخدم';
  if(status==='WAITING_OWNER') return 'بانتظار المسؤول أو الجهة';
  if(status==='BLOCKED') return 'تم تعليق المتابعة';
  if(status==='COMPLETED') return 'تم إغلاق المتابعة';
  if(status==='OPEN') return 'أعيد فتح المتابعة';
  return 'تغيرت حالة المتابعة';
}

export async function loadGovernanceFollowupHistories(
  userId:string,
  limitPerFollowup=5,
):Promise<Record<string,GovernanceFollowupHistoryEvent[]>>{
  const sql=getRawSql();
  const rows=await sql`
    select id,sender_key,sender_name,structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid
      and (
        structured_data->>'institutional_decision_followup_event'='true'
        or structured_data->>'institutional_decision_followup_deadline_event'='true'
        or structured_data->>'institutional_decision_followup_user_request'='true'
        or structured_data->>'institutional_decision_followup_escalation'='true'
        or structured_data->>'institutional_decision_followup_user_response'='true'
      )
    order by created_at desc
  `;

  const grouped:Record<string,GovernanceFollowupHistoryEvent[]>={};
  for(const row of rows){
    const data=record(row.structured_data);
    const registryId=text(data?.registry_id);
    const followupId=text(data?.followup_id);
    if(!registryId||!followupId) continue;
    const key=historyKey(registryId,followupId);
    const list=grouped[key]??[];
    if(list.length>=limitPerFollowup) continue;

    const actorName=text(row.sender_name)??'نماء';
    const actorKey=text(row.sender_key);
    const createdAt=String(row.created_at??'');
    const eventId=String(row.id);
    let event:GovernanceFollowupHistoryEvent|null=null;

    if(data?.institutional_decision_followup_user_response===true){
      const attachment=record(data.evidence_attachment);
      const detail=text(data.response_text)??(attachment?('إثبات مرفق: '+String(attachment.file_name??'ملف')):null);
      event={eventId,eventType:'USER_RESPONDED',label:'استلم رد المستخدم وانتقل للتحقق',detail,actorKey,actorName,createdAt};
    }else if(data?.institutional_decision_followup_escalation===true){
      event={eventId,eventType:'ESCALATED',label:'تم التصعيد إلى المحافظ',detail:text(data.escalation_reason),actorKey,actorName,createdAt};
    }else if(data?.institutional_decision_followup_user_request===true){
      event={eventId,eventType:'DATA_REQUESTED',label:'طُلبت بيانات من المستخدم',detail:text(data.requested_data),actorKey,actorName,createdAt};
    }else if(data?.institutional_decision_followup_deadline_event===true){
      const kind=text(data.deadline_event_kind);
      if(kind==='SET_DUE_DATE'){
        event={eventId,eventType:'DUE_DATE_SET',label:'تم تحديد موعد الاستحقاق',detail:text(data.followup_due_date),actorKey,actorName,createdAt};
      }else if(kind==='SET_REMINDER_LEAD'){
        const lead=Number(data.followup_reminder_lead_days);
        event={eventId,eventType:'REMINDER_SET',label:'تم تحديد نافذة التنبيه',detail:Number.isFinite(lead)?('قبل '+lead+' يوم/أيام'):null,actorKey,actorName,createdAt};
      }else if(kind==='CLEAR_DUE_DATE'){
        event={eventId,eventType:'DUE_DATE_CLEARED',label:'تم إلغاء موعد الاستحقاق',detail:null,actorKey,actorName,createdAt};
      }
    }else if(data?.institutional_decision_followup_event===true){
      const eventKind=text(data.event_kind);
      if(eventKind==='REQUEST_USER_DATA') continue;
      const status=text(data.followup_status)??'OPEN';
      const assignedTo=text(data.followup_assigned_to);
      const note=text(data.followup_note);
      if(eventKind==='ASSIGN'){
        event={eventId,eventType:'ASSIGNED',label:'تم إسناد المتابعة',detail:assignedTo?('إلى '+assignedTo):note,actorKey,actorName,createdAt};
      }else if(status==='COMPLETED'){
        event={eventId,eventType:'COMPLETED',label:'تم إغلاق المتابعة',detail:note,actorKey,actorName,createdAt};
      }else if(status==='OPEN'){
        event={eventId,eventType:'REOPENED',label:'أعيد فتح المتابعة',detail:note,actorKey,actorName,createdAt};
      }else{
        event={eventId,eventType:'STATUS_CHANGED',label:statusLabel(status),detail:note,actorKey,actorName,createdAt};
      }
    }

    if(!event) continue;
    list.push(event);
    grouped[key]=list;
  }
  return grouped;
}

export function followupHistoryKey(registryId:string,followupId:string){
  return historyKey(registryId,followupId);
}
