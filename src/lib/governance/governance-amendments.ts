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

export type GovernanceChangeAction='ADD'|'EDIT'|'DELETE';
export type GovernanceUnitType=
  |'article'
  |'clause'
  |'paragraph'
  |'step'
  |'stage'
  |'category'
  |'reason'
  |'method'
  |'calculation'
  |'input'
  |'output'
  |'condition'
  |'validation'
  |'limit'
  |'example';

export type GovernanceAmendmentRequest={
  requestId:string;
  documentRef:string;
  documentTitle:string;
  roomKey:string;
  clauseRef:string|null;
  parentRef:string|null;
  changeAction:GovernanceChangeAction;
  unitType:GovernanceUnitType;
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

export type GovernanceTypoCorrection={
  correctionId:string;
  documentRef:string;
  documentTitle:string;
  roomKey:string;
  clauseRef:string|null;
  currentRule:string;
  correctedRule:string;
  rationale:string;
  correctedAt:string;
  status:'APPLIED';
};

export type GovernanceDirectChange={
  changeId:string;
  documentRef:string;
  documentTitle:string;
  roomKey:string;
  unitRef:string;
  parentRef:string|null;
  changeAction:GovernanceChangeAction;
  unitType:GovernanceUnitType;
  currentRule:string|null;
  proposedRule:string;
  rationale:string;
  changedAt:string;
  status:'APPLIED';
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


const governanceUnitLabels:Record<GovernanceUnitType,string>={
  article:'المادة',
  clause:'البند',
  paragraph:'الفقرة',
  step:'الخطوة',
  stage:'المرحلة',
  category:'النوع',
  reason:'السبب',
  method:'الطريقة',
  calculation:'طريقة الحساب',
  input:'المدخل',
  output:'المخرج',
  condition:'الشرط',
  validation:'التحقق',
  limit:'الحد',
  example:'المثال',
};

function unitLinePrefix(unitType:GovernanceUnitType,unitRef:string){
  return governanceUnitLabels[unitType]+' '+unitRef+':';
}

function governanceUnitLabel(unitType:GovernanceUnitType){
  return governanceUnitLabels[unitType];
}

function governanceUnitLinePattern(){
  return '(?:المادة|البند|الفقرة|الخطوة|المرحلة|النوع|السبب|الطريقة|طريقة الحساب|المدخل|المخرج|الشرط|التحقق|الحد|المثال)';
}
function escapeRegExp(value:string){
  return value.replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/[{}]/g,'\\$&');
}
function normalizedComparableLine(value:string){
  return value
    .trim()
    .replace(/^#{1,6}\s*/u,'')
    .replace(/^[-*•]+\s*/u,'')
    .replace(/\*\*|__|\*|_|\`/g,'')
    .replace(/[A-Za-z][A-Za-z0-9_./:-]*/g,'')
    .replace(/^\d+(?:\.\d+)*[.)-]?\s*/u,'')
    .replace(new RegExp('^'+governanceUnitLinePattern()+'\\s+\\d+(?:\\.\\d+)*\\s*[:.)-]?\\s*','u'),'')
    .replace(/\s+[—–-]\s+/g,'، ')
    .replace(/\s{2,}/g,' ')
    .replace(/\s+([،؛:.])/g,'$1')
    .trim();
}
function findCurrentRuleLine(lines:string[],currentRule?:string|null){
  const target=currentRule?.trim();
  if(!target)return -1;
  const exact=lines.findIndex(line=>line.trim()===target);
  if(exact>=0)return exact;
  const normalizedTarget=normalizedComparableLine(target);
  if(!normalizedTarget)return -1;
  return lines.findIndex(line=>normalizedComparableLine(line)===normalizedTarget);
}
function applyStructuredChange(content:string,change:{
  changeAction:GovernanceChangeAction;unitType:GovernanceUnitType;unitRef:string;parentRef?:string|null;
  currentRule?:string|null;proposedRule:string;
}){
  const prefix=unitLinePrefix(change.unitType,change.unitRef);
  const lines=content.replace(/\r/g,'').split('\n');
  const currentRuleIndex=findCurrentRuleLine(lines,change.currentRule);
  const prefixIndex=lines.findIndex(line=>line.trim().startsWith(prefix));

  if(change.changeAction==='DELETE'){
    let targetIndex=change.unitType==='paragraph'&&currentRuleIndex>=0?currentRuleIndex:prefixIndex;
    if(targetIndex<0&&change.unitType==='clause'){
      const legacyPattern=new RegExp('^'+escapeRegExp(change.unitRef)+'(?:\\s|[.)-])');
      targetIndex=lines.findIndex(line=>legacyPattern.test(line.trim()));
    }
    if(targetIndex<0&&currentRuleIndex>=0)targetIndex=currentRuleIndex;
    if(targetIndex<0)return content;

    let endIndex=targetIndex+1;
    if(change.unitType==='article'){
      while(endIndex<lines.length&&!/^المادة\s+\d+/u.test(lines[endIndex]?.trim()??''))endIndex+=1;
    }else if(change.unitType==='clause'){
      while(endIndex<lines.length
        &&!new RegExp('^(?:المادة|البند)\\s+\\d+','u').test(lines[endIndex]?.trim()??'')
        &&!/^\d+(?:\.\d+)+\s/u.test(lines[endIndex]?.trim()??''))endIndex+=1;
    }
    lines.splice(targetIndex,endIndex-targetIndex);
    return lines.join('\n').replace(/\n{3,}/g,'\n\n');
  }

  if(change.changeAction==='EDIT'){
    if(change.unitType==='paragraph'&&currentRuleIndex>=0){
      const sourceLine=lines[currentRuleIndex]??'';
      lines[currentRuleIndex]=change.currentRule&&sourceLine.includes(change.currentRule)
        ?sourceLine.replace(change.currentRule,change.proposedRule.trim())
        :change.proposedRule.trim();
      return lines.join('\n');
    }
    const linePattern=new RegExp('^'+escapeRegExp(prefix)+'\\s*.*$','mu');
    if(linePattern.test(content))return content.replace(linePattern,prefix+' '+change.proposedRule.trim());
    if(change.currentRule&&content.includes(change.currentRule))return content.replace(change.currentRule,change.proposedRule.trim());
    if(currentRuleIndex>=0){
      lines[currentRuleIndex]=change.proposedRule.trim();
      return lines.join('\n');
    }
    return content;
  }

  const newLine=prefix+' '+change.proposedRule.trim();
  if(lines.some(line=>line.trim().startsWith(prefix)))return content;
  if(change.unitType==='article')return content.trimEnd()+'\n\n'+newLine+'\n';

  const rawParent=String(change.parentRef??'').trim();
  const parentRef=rawParent.replace(new RegExp('^'+governanceUnitLinePattern()+'\\s+','u'),'').trim();
  const parentIndex=lines.findIndex(line=>{
    const trimmed=line.trim();
    return new RegExp('^'+governanceUnitLinePattern()+'\\s+'+escapeRegExp(parentRef)+'\\s*:','u').test(trimmed);
  });
  if(parentIndex<0)return content.trimEnd()+'\n'+newLine+'\n';

  let insertAt=parentIndex+1;
  for(let i=parentIndex+1;i<lines.length;i++){
    const line=lines[i]?.trim()??'';
    if(/^المادة\s+/u.test(line))break;
    if(change.unitType!=='clause'&&/^البند\s+/u.test(line))break;
    insertAt=i+1;
  }
  lines.splice(insertAt,0,newLine);
  return lines.join('\n');
}

export async function createGovernanceDirectChange(args:{
  userId:string;documentRef:string;documentTitle:string;roomKey:string;unitRef:string;parentRef?:string|null;
  changeAction:GovernanceChangeAction;unitType:GovernanceUnitType;currentRule?:string|null;proposedRule:string;rationale:string;
}){
  const duplicate=(await listGovernanceDirectChanges(args.userId)).find(item=>
    item.documentRef===args.documentRef
    &&item.unitRef===args.unitRef
    &&item.unitType===args.unitType
    &&item.changeAction===args.changeAction
    &&(item.currentRule??'')===(args.currentRule??'')
    &&item.proposedRule===args.proposedRule
  );
  if(duplicate)return {changeId:duplicate.changeId,status:'APPLIED' as const,unitRef:duplicate.unitRef,deduplicated:true};

  const now=new Date().toISOString();
  const changeId='DIR-'+createHash('sha256')
    .update(JSON.stringify({userId:args.userId,documentRef:args.documentRef,now,unitRef:args.unitRef,proposedRule:args.proposedRule}))
    .digest('hex').slice(0,16).toUpperCase();
  await appendEvent({
    userId:args.userId,roomKey:'central',senderKey:'central-governor',senderName:'محافظ بنك نماء المركزي',kind:'followup',
    body:'تم '+(args.changeAction==='ADD'?'إضافة':args.changeAction==='DELETE'?'حذف':'تعديل')+' '+governanceUnitLabel(args.unitType)+' '+args.unitRef+' في «'+args.documentTitle+'» ضمن التحرير المباشر.',
    structured:{
      governance_direct_change:true,change_id:changeId,document_ref:args.documentRef,document_title:args.documentTitle,
      source_room:args.roomKey,unit_ref:args.unitRef,parent_ref:args.parentRef??null,change_action:args.changeAction,
      unit_type:args.unitType,current_rule:args.currentRule??null,proposed_rule:args.proposedRule,rationale:args.rationale,
      changed_at:now,status:'APPLIED',council_required:false,governance_change:false,external_execution:false,
    },
  });
  return {changeId,status:'APPLIED' as const,unitRef:args.unitRef};
}

export async function listGovernanceDirectChanges(userId:string):Promise<GovernanceDirectChange[]>{
  const sql=getRawSql();
  const rows=await sql`
    select structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'governance_direct_change'='true'
    order by created_at asc
  `;
  return rows.map(row=>{
    const data=record(row.structured_data)??{};
    return {
      changeId:text(data.change_id)??'DIR-UNKNOWN',
      documentRef:text(data.document_ref)??'غير مرقم',
      documentTitle:text(data.document_title)??'وثيقة حوكمة',
      roomKey:text(data.source_room)??'central',
      unitRef:text(data.unit_ref)??'غير مرقم',
      parentRef:text(data.parent_ref),
      changeAction:(text(data.change_action) as GovernanceChangeAction)??'EDIT',
      unitType:(text(data.unit_type) as GovernanceUnitType)??'paragraph',
      currentRule:text(data.current_rule),
      proposedRule:text(data.proposed_rule)??'',
      rationale:text(data.rationale)??'',
      changedAt:text(data.changed_at)??String(row.created_at),
      status:'APPLIED' as const,
    };
  });
}

function directChangeSemanticKey(change:GovernanceDirectChange){
  return [
    change.documentRef,
    change.unitType,
    change.unitRef,
    change.changeAction,
    change.parentRef??'',
    change.currentRule??'',
    change.proposedRule,
  ].join('\u001f');
}

export async function applyGovernanceDirectChanges(userId:string,documentRef:string,content:string){
  const changes=(await listGovernanceDirectChanges(userId)).filter(item=>item.documentRef===documentRef);
  const seen=new Set<string>();
  return changes.reduce((next,change)=>{
    const key=directChangeSemanticKey(change);
    if(seen.has(key))return next;
    seen.add(key);
    return applyStructuredChange(next,{
      changeAction:change.changeAction,unitType:change.unitType,unitRef:change.unitRef,parentRef:change.parentRef,
      currentRule:change.currentRule,proposedRule:change.proposedRule,
    });
  },content);
}

export async function createGovernanceTypoCorrection(args:{
  userId:string;documentRef:string;documentTitle:string;roomKey:string;clauseRef?:string|null;
  currentRule:string;correctedRule:string;rationale:string;
}){
  const now=new Date().toISOString();
  const correctionId='TYP-'+createHash('sha256')
    .update(JSON.stringify({userId:args.userId,documentRef:args.documentRef,now,currentRule:args.currentRule,correctedRule:args.correctedRule}))
    .digest('hex').slice(0,16).toUpperCase();
  await appendEvent({
    userId:args.userId,
    roomKey:'central',
    senderKey:'central-governor',
    senderName:'محافظ بنك نماء المركزي',
    kind:'followup',
    body:`تم تسجيل تصحيح مطبعي على «${args.documentTitle}» دون تغيير في الحكم أو المضمون الحوكمي.`,
    structured:{
      governance_typo_correction:true,
      correction_id:correctionId,
      document_ref:args.documentRef,
      document_title:args.documentTitle,
      source_room:args.roomKey,
      clause_ref:args.clauseRef??null,
      current_rule:args.currentRule,
      corrected_rule:args.correctedRule,
      rationale:args.rationale,
      corrected_at:now,
      status:'APPLIED',
      council_required:false,
      governance_change:false,
      external_execution:false,
      execution_boundary:'تصحيح لغوي أو مطبعي فقط؛ إذا تغيّر المعنى أو الحكم فيجب فتح طلب تعديل حوكمي مستقل',
    },
  });
  return {correctionId,status:'APPLIED' as const};
}

export async function listGovernanceTypoCorrections(userId:string):Promise<GovernanceTypoCorrection[]>{
  const sql=getRawSql();
  const rows=await sql`
    select structured_data,created_at
    from public.conversation_messages
    where user_id=${userId}::uuid
      and structured_data->>'governance_typo_correction'='true'
    order by created_at desc
  `;
  return rows.map(row=>{
    const data=record(row.structured_data)??{};
    return {
      correctionId:text(data.correction_id)??'TYP-UNKNOWN',
      documentRef:text(data.document_ref)??'غير مرقم',
      documentTitle:text(data.document_title)??'وثيقة حوكمة',
      roomKey:text(data.source_room)??'central',
      clauseRef:text(data.clause_ref),
      currentRule:text(data.current_rule)??'',
      correctedRule:text(data.corrected_rule)??'',
      rationale:text(data.rationale)??'',
      correctedAt:text(data.corrected_at)??String(row.created_at),
      status:'APPLIED' as const,
    };
  });
}

export async function applyGovernanceTypoCorrections(userId:string,documentRef:string,content:string){
  const corrections=(await listGovernanceTypoCorrections(userId))
    .filter(item=>item.documentRef===documentRef)
    .sort((a,b)=>a.correctedAt.localeCompare(b.correctedAt));
  let next=content;
  for(const correction of corrections){
    if(correction.currentRule&&correction.correctedRule&&next.includes(correction.currentRule)){
      next=next.replace(correction.currentRule,correction.correctedRule);
    }
  }
  return next;
}

export async function createGovernanceAmendmentRequest(args:{
  userId:string;documentRef:string;documentTitle:string;roomKey:string;clauseRef?:string|null;parentRef?:string|null;
  changeAction?:GovernanceChangeAction;unitType?:GovernanceUnitType;
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
    parent_ref:args.parentRef??null,
    change_action:args.changeAction??'EDIT',
    unit_type:args.unitType??'paragraph',
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
    await appendEvent({userId:args.userId,roomKey:'central',senderKey:'central-governor',senderName:'محافظ بنك نماء المركزي',kind:'decision',
      body:`بعد المراجعة الأولية، وافق المحافظ على إحالة طلب التعديل ${args.requestId} إلى أمين السر لاستكمال المسار الحوكمي. ${args.note??''}`.trim(),
      structured:{governance_amendment_event:true,request_id:args.requestId,status:'SECRETARY_INTAKE',event:'GOVERNOR_ACCEPTED',note:args.note??null,at:now,council_required:true,external_execution:false}});
    await appendEvent({userId:args.userId,roomKey:'secretary',senderKey:'central-secretary',senderName:'أمين السر المركزي',kind:'followup',
      body:`استلم أمين السر طلب التعديل ${args.requestId} المحال من المحافظ. يبدأ الآن تجهيز ملف العرض على مجلس نماء الأعلى وتحديد توقيت المناقشة وفق الأولوية.`,
      structured:{governance_amendment_event:true,request_id:args.requestId,status:'SECRETARY_INTAKE',event:'SECRETARY_RECEIVED',note:args.note??null,at:now,council_required:true,external_execution:false}});
    return {status:'SECRETARY_INTAKE' as const};
  }
  if(args.action==='SECRETARY_ACCEPT'){
    await appendEvent({userId:args.userId,roomKey:'secretary',senderKey:'central-secretary',senderName:'أمين السر المركزي',kind:'decision',
      body:`أكمل أمين السر تجهيز طلب التعديل ${args.requestId} وأدرجه على مجلس نماء الأعلى للمناقشة. ${args.note??''}`.trim(),
      structured:{governance_amendment_event:true,request_id:args.requestId,status:'COUNCIL_DISCUSSION',event:'SECRETARY_ACCEPTED',note:args.note??null,at:now,external_execution:false}});
    await appendEvent({userId:args.userId,roomKey:'council',senderKey:'council-secretary',senderName:'أمين السر المركزي',kind:'request',
      body:`أُدرج طلب التعديل ${args.requestId} على مجلس نماء الأعلى للمناقشة قبل أي اعتماد. لا يصبح أي تعديل نافذًا من مجرد المناقشة.`,
      structured:{governance_amendment_event:true,request_id:args.requestId,status:'COUNCIL_DISCUSSION',event:'COUNCIL_AGENDA_CREATED',note:args.note??null,at:now,external_execution:false}});
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
    if(!data) continue;
    const requestId=text(data.request_id);
    if(!requestId) continue;
    if(data.governance_amendment_request===true){
      map.set(requestId,{
        requestId,
        documentRef:text(data.document_ref)??'غير مرقم',
        documentTitle:text(data.document_title)??'وثيقة حوكمة',
        roomKey:text(data.source_room)??'central',
        clauseRef:text(data.clause_ref),
        parentRef:text(data.parent_ref),
        changeAction:(text(data.change_action) as GovernanceChangeAction)??'EDIT',
        unitType:(text(data.unit_type) as GovernanceUnitType)??'paragraph',
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
    if(data.governance_amendment_discussion===true){
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



export async function applyEffectiveGovernanceAmendments(userId:string,documentRef:string,content:string){
  const amendments=(await listGovernanceAmendments(userId))
    .filter(item=>item.documentRef===documentRef&&item.status==='EFFECTIVE')
    .sort((a,b)=>a.requestedAt.localeCompare(b.requestedAt));
  return amendments.reduce((next,item)=>{
    const rawRef=item.clauseRef??'';
    const unitRef=rawRef.replace(new RegExp('^'+governanceUnitLinePattern()+'\\s+','u'),'').trim();
    if(!unitRef)return next;
    return applyStructuredChange(next,{
      changeAction:item.changeAction,unitType:item.unitType,unitRef,parentRef:item.parentRef,
      currentRule:item.currentRule,proposedRule:item.proposedRule,
    });
  },content);
}

export type GovernanceAmendmentConversationCommand=
  |{kind:'DISCUSS';requestId:string;note:string}
  |{kind:'GOVERNOR_ACCEPT';requestId:string;note:string|null}
  |{kind:'GOVERNOR_REJECT';requestId:string;note:string|null}
  |{kind:'SECRETARY_ACCEPT';requestId:string;note:string|null}
  |{kind:'COUNCIL_APPROVE';requestId:string;nextVersion:string;effectiveAt:string;decisionId:string|null;note:string|null}
  |{kind:'COUNCIL_REJECT';requestId:string;decisionId:string|null;note:string|null};

export function parseGovernanceAmendmentConversationCommand(
  roomKey:'central'|'secretary'|'council',
  value:string,
):GovernanceAmendmentConversationCommand|null{
  const textValue=value.trim().replace(/\s+/g,' ');
  const discuss=textValue.match(/^مناقشة طلب التعديل\s+(AMD-[A-Z0-9]+)\s*[:：-]\s*(.+)$/i);
  if(discuss?.[1]&&discuss[2]) return {kind:'DISCUSS',requestId:discuss[1].toUpperCase(),note:discuss[2].trim()};

  if(roomKey==='central'){
    const accept=textValue.match(/^إحالة طلب التعديل\s+(AMD-[A-Z0-9]+)\s+(?:إلى|الى)\s+أمين السر(?:\s*[:：-]\s*(.+))?$/i);
    if(accept?.[1]) return {kind:'GOVERNOR_ACCEPT',requestId:accept[1].toUpperCase(),note:accept[2]?.trim()||null};
    const reject=textValue.match(/^رفض طلب التعديل\s+(AMD-[A-Z0-9]+)(?:\s*[:：-]\s*(.+))?$/i);
    if(reject?.[1]) return {kind:'GOVERNOR_REJECT',requestId:reject[1].toUpperCase(),note:reject[2]?.trim()||null};
  }

  if(roomKey==='secretary'){
    const accept=textValue.match(/^إدراج طلب التعديل\s+(AMD-[A-Z0-9]+)\s+(?:على|في)\s+مجلس نماء(?:\s*[:：-]\s*(.+))?$/i);
    if(accept?.[1]) return {kind:'SECRETARY_ACCEPT',requestId:accept[1].toUpperCase(),note:accept[2]?.trim()||null};
  }

  if(roomKey==='council'){
    const approve=textValue.match(/^اعتماد طلب التعديل\s+(AMD-[A-Z0-9]+)\s+الإصدار\s+([^\s]+)\s+النفاذ\s+(\d{4}-\d{2}-\d{2})(?:\s+القرار\s+([^\s]+))?(?:\s*[:：-]\s*(.+))?$/i);
    if(approve?.[1]&&approve[2]&&approve[3]) return {
      kind:'COUNCIL_APPROVE',
      requestId:approve[1].toUpperCase(),
      nextVersion:approve[2],
      effectiveAt:approve[3],
      decisionId:approve[4]?.trim()||null,
      note:approve[5]?.trim()||null,
    };
    const reject=textValue.match(/^رفض طلب التعديل\s+(AMD-[A-Z0-9]+)(?:\s+القرار\s+([^\s]+))?(?:\s*[:：-]\s*(.+))?$/i);
    if(reject?.[1]) return {kind:'COUNCIL_REJECT',requestId:reject[1].toUpperCase(),decisionId:reject[2]?.trim()||null,note:reject[3]?.trim()||null};
  }

  return null;
}

export async function applyGovernanceAmendmentConversationCommand(args:{
  userId:string;
  roomKey:'central'|'secretary'|'council';
  command:GovernanceAmendmentConversationCommand;
}){
  const command=args.command;
  if(command.kind==='DISCUSS'){
    const actor=args.roomKey==='central'?'GOVERNOR':args.roomKey==='secretary'?'SECRETARY':'COUNCIL';
    await addGovernanceAmendmentDiscussion({userId:args.userId,requestId:command.requestId,note:command.note,actor});
    return getGovernanceAmendment(args.userId,command.requestId);
  }
  if(command.kind==='GOVERNOR_ACCEPT'||command.kind==='GOVERNOR_REJECT'){
    return advanceGovernanceAmendment({
      userId:args.userId,requestId:command.requestId,action:command.kind,note:command.note,
    });
  }
  if(command.kind==='SECRETARY_ACCEPT'){
    return advanceGovernanceAmendment({
      userId:args.userId,requestId:command.requestId,action:'SECRETARY_ACCEPT',note:command.note,
    });
  }
  if(command.kind==='COUNCIL_APPROVE'){
    return advanceGovernanceAmendment({
      userId:args.userId,requestId:command.requestId,action:'COUNCIL_APPROVE',
      note:command.note,decisionId:command.decisionId,effectiveAt:command.effectiveAt,nextVersion:command.nextVersion,
    });
  }
  return advanceGovernanceAmendment({
    userId:args.userId,requestId:command.requestId,action:'COUNCIL_REJECT',
    note:command.note,decisionId:command.decisionId,
  });
}
