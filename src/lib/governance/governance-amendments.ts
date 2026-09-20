import { createHash, randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';

export type GovernanceAmendmentPriority='NORMAL'|'NEXT_MEETING'|'URGENT';
export type GovernanceAmendmentStatus=
  |'GOVERNOR_REVIEW'
  |'SECRETARY_INTAKE'
  |'COUNCIL_DISCUSSION'
  |'APPROVED_PENDING_EFFECTIVE'
  |'EFFECTIVE'
  |'REJECTED';

export type GovernanceAmendmentRequest={
  requestId:string;
  documentRef:string;
  documentTitle:string;
  roomKey:string;
  clauseRef:string|null;
  currentRule:string|null;
  proposedRule:string;
  rationale:string;
  priority:GovernanceAmendmentPriority;
  status:GovernanceAmendmentStatus;
  requestedAt:string;
  governorReviewedAt:string|null;
  secretaryReceivedAt:string|null;
  councilDecisionAt:string|null;
  councilDecisionId:string|null;
  effectiveAt:string|null;
  nextVersion:string|null;
  discussionNotes:string[];
};

function record(value:unknown):Record<string,unknown>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function text(value:unknown){
  return typeof value==='string'&&value.trim()?value.trim():null;
}
function amendmentId(seed:unknown){
  return 'AMD-'+createHash('sha256').update(JSON.stringify(seed)).digest('hex').slice(0,16).toUpperCase();
}
async function threadId(userId:string,roomKey:'central'|'secretary'|'council'){
  const sql=getRawSql();
  const rows=await sql`select id from public.conversation_threads where user_id=${userId}::uuid and room_key=${roomKey} limit 1`;
  return rows[0]?.id?String(rows[0].id):null;
}
async function appendEvent(args:{
  userId:string;roomKey:'central'|'secretary'|'council';senderKey:string;senderName:string;
  kind:'request'|'followup'|'decision';body:string;structured:Record<string,unknown>;
}){
  const id=await threadId(args.userId,args.roomKey);
  if(!id) throw new Error('GOVERNANCE_THREAD_NOT_FOUND');
  const sql=getRawSql();
  await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${id}::uuid,${args.userId}::uuid,'agent',
      ${args.senderKey},${args.senderName},${args.kind},${args.body},${JSON.stringify(args.structured)}::jsonb
    )
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${id}::uuid`;
}

export async function createGovernanceAmendmentRequest(args:{
  userId:string;documentRef:string;documentTitle:string;roomKey:string;clauseRef?:string|null;
  currentRule?:string|null;proposedRule:string;rationale:string;priority:GovernanceAmendmentPriority;
}){
  const now=new Date().toISOString();
  const requestId=amendmentId({userId:args.userId,documentRef:args.documentRef,now,proposal:args.proposedRule});
  const structured={
    governance_amendment_event:true,
    governance_amendment_request:true,
    request_id:requestId,
    document_ref:args.documentRef,
    document_title:args.documentTitle,
    source_room:args.roomKey,
    clause_ref:args.clauseRef??null,
    current_rule:args.currentRule??null,
    proposed_rule:args.proposedRule,
    rationale:args.rationale,
    priority:args.priority,
    status:'GOVERNOR_REVIEW',
    requested_at:now,
    workflow:['GOVERNOR_REVIEW','SECRETARY_INTAKE','COUNCIL_DISCUSSION','COUNCIL_DECISION','EFFECTIVE_DATE'],
    council_required:true,
    external_execution:false,
    execution_boundary:'طلب تعديل حوكمي فقط؛ لا تصبح السياسة معدلة أو نافذة قبل اعتماد مجلس نماء الأعلى وتاريخ النفاذ',
  };
  await appendEvent({
    userId:args.userId,roomKey:'central',senderKey:'central-governor',senderName:'محافظ بنك نماء المركزي',
    kind:'request',
    body:`وصل طلب تعديل ${args.documentRef} — «${args.documentTitle}». يبدأ الآن بالنقاش والمراجعة لدى المحافظ قبل أي إحالة رسمية. الأولوية: ${args.priority}.`,
    structured,
  });
  return {requestId,status:'GOVERNOR_REVIEW' as const};
}

export async function advanceGovernanceAmendment(args:{
  userId:string;requestId:string;
  action:'GOVERNOR_ACCEPT'|'GOVERNOR_REJECT'|'SECRETARY_ACCEPT'|'COUNCIL_APPROVE'|'COUNCIL_REJECT'|'MARK_EFFECTIVE';
  note?:string|null;decisionId?:string|null;effectiveAt?:string|null;nextVersion?:string|null;
}){
  const current=await getGovernanceAmendment(args.userId,args.requestId);
  if(!current) throw new Error('GOVERNANCE_AMENDMENT_NOT_FOUND');

  const now=new Date().toISOString();
  if(args.action==='GOVERNOR_REJECT'){
    await appendEvent({userId:args.userId,roomKey:'central',senderKey:'central-governor',senderName:'محافظ بنك نماء المركزي',kind:'decision',
      body:`أغلق المحافظ طلب التعديل ${args.requestId} بعد المراجعة الأولية. ${args.note??''}`.trim(),
      structured:{governance_amendment_event:true,request_id:args.requestId,status:'REJECTED',event:'GOVERNOR_REJECTED',note:args.note??null,at:now,external_execution:false}});
    return {status:'REJECTED' as const};
  }
  if(args.action==='GOVERNOR_ACCEPT'){
    await appendEvent({userId:args.userId,roomKey:'secretary',senderKey:'central-secretary',senderName:'أمين السر المركزي',kind:'followup',
      body:`أحال المحافظ طلب التعديل ${args.requestId} إلى أمين السر بعد قبول المراجعة الأولية. يبدأ الآن تجهيز ملف العرض على مجلس نماء الأعلى.`,
      structured:{governance_amendment_event:true,request_id:args.requestId,status:'SECRETARY_INTAKE',event:'GOVERNOR_ACCEPTED',note:args.note??null,at:now,council_required:true,external_execution:false}});
    return {status:'SECRETARY_INTAKE' as const};
  }
  if(args.action==='SECRETARY_ACCEPT'){
    await appendEvent({userId:args.userId,roomKey:'council',senderKey:'council-secretary',senderName:'أمين السر المركزي',kind:'request',
      body:`أدرج أمين السر طلب التعديل ${args.requestId} على مجلس نماء الأعلى للمناقشة قبل أي اعتماد. ${args.note??''}`.trim(),
      structured:{governance_amendment_event:true,request_id:args.requestId,status:'COUNCIL_DISCUSSION',event:'SECRETARY_ACCEPTED',note:args.note??null,at:now,external_execution:false}});
    return {status:'COUNCIL_DISCUSSION' as const};
  }
  if(args.action==='COUNCIL_REJECT'){
    await appendEvent({userId:args.userId,roomKey:'council',senderKey:'central-governor',senderName:'محافظ بنك نماء المركزي',kind:'decision',
      body:`رفض مجلس نماء الأعلى طلب التعديل ${args.requestId}. ${args.note??''}`.trim(),
      structured:{governance_amendment_event:true,request_id:args.requestId,status:'REJECTED',event:'COUNCIL_REJECTED',note:args.note??null,decision_id:args.decisionId??null,at:now,external_execution:false}});
    return {status:'REJECTED' as const};
  }
  if(args.action==='COUNCIL_APPROVE'){
    if(!args.effectiveAt||!args.nextVersion) throw new Error('GOVERNANCE_EFFECTIVE_DATE_AND_VERSION_REQUIRED');
    await appendEvent({userId:args.userId,roomKey:'council',senderKey:'central-governor',senderName:'محافظ بنك نماء المركزي',kind:'decision',
      body:`اعتمد مجلس نماء الأعلى طلب التعديل ${args.requestId}. الإصدار الجديد ${args.nextVersion}، ويبدأ النفاذ في ${args.effectiveAt}. لا يستخدمه النظام قبل تاريخ النفاذ.`,
      structured:{governance_amendment_event:true,request_id:args.requestId,status:'APPROVED_PENDING_EFFECTIVE',event:'COUNCIL_APPROVED',note:args.note??null,decision_id:args.decisionId??args.requestId,effective_at:args.effectiveAt,next_version:args.nextVersion,at:now,external_execution:false}});
    return {status:'APPROVED_PENDING_EFFECTIVE' as const};
  }

  await appendEvent({userId:args.userId,roomKey:'council',senderKey:'central-governor',senderName:'محافظ بنك نماء المركزي',kind:'followup',
    body:`أصبح تعديل ${current.documentRef} نافذًا وفق القرار ${current.councilDecisionId??args.decisionId??args.requestId}. المرجع التشغيلي الجديد هو الإصدار ${current.nextVersion??args.nextVersion??'المعتمد'}.`,
    structured:{governance_amendment_event:true,request_id:args.requestId,status:'EFFECTIVE',event:'MARKED_EFFECTIVE',at:now,external_execution:false}});
  return {status:'EFFECTIVE' as const};
}

export async function addGovernanceAmendmentDiscussion(args:{userId:string;requestId:string;note:string;actor:'GOVERNOR'|'SECRETARY'|'COUNCIL'}){
  const target=await getGovernanceAmendment(args.userId,args.requestId);
  if(!target) throw new Error('GOVERNANCE_AMENDMENT_NOT_FOUND');
  const roomKey=args.actor==='GOVERNOR'?'central':args.actor==='SECRETARY'?'secretary':'council';
  const senderKey=args.actor==='GOVERNOR'?'central-governor':args.actor==='SECRETARY'?'central-secretary':'central-governor';
  const senderName=args.actor==='GOVERNOR'?'محافظ بنك نماء المركزي':args.actor==='SECRETARY'?'أمين السر المركزي':'مجلس نماء الأعلى';
  await appendEvent({userId:args.userId,roomKey,senderKey,senderName,kind:'followup',
    body:args.note,
    structured:{governance_amendment_event:true,governance_amendment_discussion:true,request_id:args.requestId,actor:args.actor,note:args.note,at:new Date().toISOString(),external_execution:false}});
  return {ok:true};
}

export async function getGovernanceAmendment(userId:string,requestId:string){
  const all=await listGovernanceAmendments(userId);
  return all.find(item=>item.requestId===requestId)??null;
}

export async function listGovernanceAmendments(userId:string):Promise<GovernanceAmendmentRequest[]>{
  const sql=getRawSql();
  const rows=await sql`
    select structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'governance_amendment_event'='true'
    order by created_at asc
  `;
  const map=new Map<string,GovernanceAmendmentRequest>();
  for(const row of rows){
    const data=record(row.structured_data);
    const requestId=text(data?.request_id);
    if(!requestId) continue;
    if(data?.governance_amendment_request===true){
      map.set(requestId,{
        requestId,
        documentRef:text(data.document_ref)??'غير مرقم',
        documentTitle:text(data.document_title)??'وثيقة حوكمة',
        roomKey:text(data.source_room)??'central',
        clauseRef:text(data.clause_ref),
        currentRule:text(data.current_rule),
        proposedRule:text(data.proposed_rule)??'',
        rationale:text(data.rationale)??'',
        priority:(text(data.priority) as GovernanceAmendmentPriority)??'NORMAL',
        status:'GOVERNOR_REVIEW',
        requestedAt:text(data.requested_at)??String(row.created_at),
        governorReviewedAt:null,secretaryReceivedAt:null,councilDecisionAt:null,councilDecisionId:null,effectiveAt:null,nextVersion:null,
        discussionNotes:[],
      });
      continue;
    }
    const item=map.get(requestId);
    if(!item) continue;
    if(data?.governance_amendment_discussion===true){
      const note=text(data.note);
      if(note) item.discussionNotes.push(note);
      continue;
    }
    const status=text(data.status) as GovernanceAmendmentStatus|null;
    if(status) item.status=status;
    const event=text(data.event);
    const at=text(data.at)??String(row.created_at);
    if(event==='GOVERNOR_ACCEPTED'||event==='GOVERNOR_REJECTED') item.governorReviewedAt=at;
    if(event==='SECRETARY_ACCEPTED') item.secretaryReceivedAt=at;
    if(event==='COUNCIL_APPROVED'||event==='COUNCIL_REJECTED'){
      item.councilDecisionAt=at;
      item.councilDecisionId=text(data.decision_id);
      item.effectiveAt=text(data.effective_at);
      item.nextVersion=text(data.next_version);
    }
  }
  return [...map.values()].sort((a,b)=>b.requestedAt.localeCompare(a.requestedAt));
}
