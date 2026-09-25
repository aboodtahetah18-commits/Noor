import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind } from '@/lib/conversations/store';
import {
  advanceFinancialLearningLifecycle,
  syncFinancialLearningLifecycle,
  type FinancialLearningLifecycleItem,
} from '@/lib/finance/financial-learning-lifecycle';

export type LearningCommitteeResponseType=
  |'STATUS'
  |'SUBMIT_REVIEW'
  |'APPROVE'
  |'REJECT'
  |'ACTIVATE'
  |'ROLLBACK'
  |'EXPLAIN';

export function classifyLearningCommitteeResponse(value:string):LearningCommitteeResponseType{
  const text=value.trim();
  if(/تراجع|ارجع|إلغاء التفعيل|الغ التفعيل/i.test(text))return 'ROLLBACK';
  if(/فعّل|فعل|تفعيل|طبق المعايرة/i.test(text))return 'ACTIVATE';
  if(/ارفض|رفض|لا أعتمد|لا تعتمد/i.test(text))return 'REJECT';
  if(/اعتمد|موافق|أوافق|وافق/i.test(text))return 'APPROVE';
  if(/للمراجعة|ارفع.*مراجعة|أرسل.*مراجعة|احل.*مراجعة/i.test(text))return 'SUBMIT_REVIEW';
  if(/ليش|لماذا|اشرح|التفاصيل|الدليل|الاختبار/i.test(text))return 'EXPLAIN';
  return 'STATUS';
}

function percent(value:number|null){
  if(value===null||!Number.isFinite(value))return 'غير متاح';
  return new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:1}).format(value)+'٪';
}

function factor(value:number){
  return new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:3}).format(value);
}

function lifecyclePriority(status:FinancialLearningLifecycleItem['status']){
  const order:Record<FinancialLearningLifecycleItem['status'],number>={
    IN_REVIEW:1,
    BACKTEST_PASSED:2,
    APPROVED:3,
    ACTIVE:4,
    REJECTED:5,
    ROLLED_BACK:6,
  };
  return order[status];
}

function activeCandidate(items:FinancialLearningLifecycleItem[]){
  return items
    .filter(item=>!['REJECTED','ROLLED_BACK'].includes(item.status))
    .sort((a,b)=>lifecyclePriority(a.status)-lifecyclePriority(b.status)||b.confidence-a.confidence)[0]??null;
}

function candidateSummary(item:FinancialLearningLifecycleItem){
  return item.title+
    '. المعامل المقترح '+factor(item.proposedValue)+
    '، الثقة '+percent(item.confidence)+
    '، ومتوسط الخطأ قبل الاختبار '+percent(item.baselineErrorPercent)+
    ' وبعده '+percent(item.candidateErrorPercent)+
    '، والتحسن '+percent(item.improvementPercent)+'.';
}

function nextInstruction(item:FinancialLearningLifecycleItem){
  if(item.status==='BACKTEST_PASSED')return 'إذا رغبت، قل: أرسل للمراجعة.';
  if(item.status==='IN_REVIEW')return 'يمكن الآن اعتماد المقترح أو رفضه بعد مراجعة الأدلة.';
  if(item.status==='APPROVED')return 'المقترح معتمد لكنه غير مفعل. قل: فعّل المعايرة، لتطبيقها على التوقعات فقط.';
  if(item.status==='ACTIVE')return 'المعايرة نشطة على التوقعات فقط، ويمكن التراجع عنها دون تغيير القواعد الصارمة.';
  return '';
}

export async function createLearningCommitteeConversationReply(args:{
  userId:string;
  meetingId:string;
  userText:string;
}){
  const sql=getRawSql();
  const threadRows=await sql`
    select id from public.conversation_threads
    where user_id=${args.userId}::uuid and room_key='council'
    limit 1
  `;
  const threadId=threadRows[0]?.id?String(threadRows[0].id):null;
  if(!threadId)return null;

  const synced=await syncFinancialLearningLifecycle(args.userId);
  const items=Object.values(synced.store.items);
  let item=activeCandidate(items);
  const responseType=classifyLearningCommitteeResponse(args.userText);
  let body='';
  let actionResult:Awaited<ReturnType<typeof advanceFinancialLearningLifecycle>>|null=null;

  if(!item){
    body='راجعت نتائج التعلم المستمر ولا يوجد حاليًا مقترح معايرة اجتاز الاختبار الخلفي ويحتاج قرارًا.';
  }else if(responseType==='EXPLAIN'){
    body=candidateSummary(item)+' الأدلة مبنية على '+item.confidence+'٪ ثقة، والتحسين لا يغير أي حد حماية أو قاعدة حوكمة. '+nextInstruction(item);
  }else if(responseType==='SUBMIT_REVIEW'){
    if(item.status!=='BACKTEST_PASSED'){
      body='هذا المقترح ليس في مرحلة الإحالة للمراجعة الآن. حالته الحالية: '+item.status+'. '+nextInstruction(item);
    }else{
      actionResult=await advanceFinancialLearningLifecycle({
        userId:args.userId,candidateKey:item.key,action:'SUBMIT_REVIEW',note:'إحالة من لجنة المراجعة والمخاطر والتعلم',
      });
      item=actionResult.item;
      body='تم إدخال «'+item.title+'» في المراجعة الرسمية. '+candidateSummary(item)+' القرار المتاح الآن: اعتماد أو رفض.';
    }
  }else if(responseType==='APPROVE'){
    if(item.status!=='IN_REVIEW'){
      body='لا يمكن اعتماد هذا المقترح في مرحلته الحالية. '+nextInstruction(item);
    }else{
      actionResult=await advanceFinancialLearningLifecycle({
        userId:args.userId,candidateKey:item.key,action:'APPROVE',note:'اعتماد معايرة ناعمة بعد نجاح الاختبار الخلفي',
      });
      item=actionResult.item;
      body='تم اعتماد «'+item.title+'» كمعايرة ناعمة فقط. لم تُفعّل بعد، ولم تتغير أي قاعدة صلبة. '+nextInstruction(item);
    }
  }else if(responseType==='REJECT'){
    if(item.status!=='IN_REVIEW'){
      body='لا يوجد مقترح في مرحلة المراجعة يمكن رفضه الآن. '+nextInstruction(item);
    }else{
      actionResult=await advanceFinancialLearningLifecycle({
        userId:args.userId,candidateKey:item.key,action:'REJECT',note:'رفض بعد المراجعة',
      });
      body='تم رفض المقترح وحفظ سبب القرار في السجل. لن يطبق النظام هذه المعايرة.';
      item=activeCandidate(Object.values(actionResult.store.items));
    }
  }else if(responseType==='ACTIVATE'){
    if(item.status!=='APPROVED'){
      body='لا يمكن التفعيل قبل الاعتماد. '+nextInstruction(item);
    }else{
      actionResult=await advanceFinancialLearningLifecycle({
        userId:args.userId,candidateKey:item.key,action:'ACTIVATE',note:'تفعيل على طبقة التوقعات فقط',
      });
      item=actionResult.item;
      body='تم تفعيل «'+item.title+'» على التوقعات فقط. الحسابات الصلبة والمتاح الحقيقي وحدود الحماية لم تتغير. ويمكن التراجع إلى القيمة السابقة.';
    }
  }else if(responseType==='ROLLBACK'){
    const active=items.find(candidate=>candidate.status==='ACTIVE')??null;
    if(!active){
      body='لا توجد معايرة تعلم نشطة يمكن التراجع عنها حاليًا.';
    }else{
      actionResult=await advanceFinancialLearningLifecycle({
        userId:args.userId,candidateKey:active.key,action:'ROLLBACK',note:'تراجع يدوي عن المعايرة النشطة',
      });
      body='تم التراجع عن «'+active.title+'» وإعادة معامل التوقع إلى قيمته السابقة. لم تتأثر السجلات التاريخية.';
      item=activeCandidate(Object.values(actionResult.store.items));
    }
  }else{
    body=candidateSummary(item)+' الحالة الحالية: '+item.status+'. '+nextInstruction(item);
  }

  const messageKind:ConversationMessageKind=item?.status==='IN_REVIEW'?'request':'message';
  const structuredData={
    scope_kind:'meeting',
    meeting_id:args.meetingId,
    meeting_title:'لجنة المراجعة والمخاطر والتعلم',
    learning_committee:true,
    response_type:responseType,
    candidate_key:item?.key??null,
    candidate_status:item?.status??null,
    parameter_key:item?.parameterKey??null,
    proposed_value:item?.proposedValue??null,
    confidence:item?.confidence??null,
    backtest_before:item?.baselineErrorPercent??null,
    backtest_after:item?.candidateErrorPercent??null,
    backtest_improvement:item?.improvementPercent??null,
    active_factors:actionResult?.activeFactors??null,
    external_execution:false,
    hard_rules_mutable:false,
    execution_boundary:'المعايرة الناعمة تؤثر على طبقة التوقعات فقط ولا تعدل القواعد الصارمة أو التنفيذ المالي.',
  };

  const rows=await sql`
    insert into public.conversation_messages(
      id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
    ) values(
      ${randomUUID()},${threadId}::uuid,${args.userId}::uuid,'agent',
      'central-governor','لجنة المراجعة والمخاطر والتعلم',${messageKind},${body},${JSON.stringify(structuredData)}::jsonb
    )
    returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
  `;
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return rows[0]??null;
}
