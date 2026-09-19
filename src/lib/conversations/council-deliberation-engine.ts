import { randomUUID } from 'node:crypto';
import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationMessageKind } from '@/lib/conversations/store';

export type CouncilDeliberationReply={
  id:string;
  sender_type:'agent';
  sender_key:string;
  sender_name:string;
  message_kind:ConversationMessageKind;
  body:string;
  structured_data:Record<string,unknown>;
  created_at?:string;
};

function topicFrom(text:string){
  if(/(استثمار|أصول|محفظة|فرصة|نسبة)/i.test(text)) return 'الاستثمار والأوزان';
  if(/(احتياط|ملاءة|سيولة|طوارئ)/i.test(text)) return 'الملاءة والاحتياطي';
  if(/(صرف|مصروف|ميزانية|بند|بنود)/i.test(text)) return 'الصرف والميزانية';
  if(/(تمويل|قرض|قسط|دين)/i.test(text)) return 'التمويل';
  return 'الصورة المالية والتأسيس';
}

function makeViews(topic:string){
  return [
    {
      key:'central-secretary',
      name:'أمين السر المركزي',
      kind:'message' as ConversationMessageKind,
      body:`نفتح محور «${topic}». المطلوب ليس رأيًا مختصرًا؛ كل جهة ستوضح طلبها، مبرراته، أثره على بقية البنود، والحد الأدنى المقبول. سأحدّث المحضر الحي وأبقي نقاط الخلاف مفتوحة حتى ترد أنت أو يطلب الرئيس الانتقال للمحور التالي.`,
      role:'تنسيق الاجتماع',
    },
    {
      key:'central-governor',
      name:'محافظ بنك نماء المركزي',
      kind:'recommendation' as ConversationMessageKind,
      body:'في مرحلة التأسيس لا أريد وزنًا كبيرًا يُعامل كأنه ثابت قبل أن نرى السلوك الفعلي لعدة دورات. أريد موازنة الحماية والنمو، مع تجربة أولية قابلة للخفض أو الرفع بدل اعتماد نسبة نهائية من أول اجتماع.',
      role:'رئيس المجلس',
    },
    {
      key:'solvency-manager',
      name:'مدير بنك ملاءة',
      kind:'recommendation' as ConversationMessageKind,
      body:'من جهتي أطلب أولوية واضحة للاحتياطي لأن الصرف ما زال في مرحلة التعلّم. إذا كانت تقلبات البنود غير معروفة فأفضّل هامش حماية أعلى مؤقتًا، ثم نقلّله عندما يثبت أن المصروفات الأساسية مستقرة ويمكن التنبؤ بها.',
      role:'الملاءة والاحتياطي',
    },
    {
      key:'assets-manager',
      name:'مدير بنك الأصول الاستثماري',
      kind:'recommendation' as ConversationMessageKind,
      body:'أتفق على الحذر، لكن تجميد الاستثمار بالكامل يحرمنا من اختبار سلوك المحفظة. أقترح وزنًا استثماريًا مبدئيًا صغيرًا — مثل 3% إلى 5% من المال المؤهل فقط — ثم نرفعه تدريجيًا إذا تحققت الملاءة واستقرت البنود وظهرت فرص مناسبة فعلًا.',
      role:'الأصول والاستثمار',
    },
    {
      key:'hilal-manager',
      name:'مدير بنك الهلال',
      kind:'risk' as ConversationMessageKind,
      body:'أعارض فتح تمويل جديد لمجرد وجود هامش نظري. قبل ذلك نحتاج أن نرى انتظام الصرف وقدرة الميزانية على امتصاص القسط دون ضغط على الاحتياطي أو الأهداف. إذا استقرت الدورة يمكن إعادة عرض التمويل بشروط أو سقف أصغر.',
      role:'التمويل والانضباط',
    },
    {
      key:'financial-advisor',
      name:'المستشار الاقتصادي',
      kind:'recommendation' as ConversationMessageKind,
      body:'الاقتراح الأقرب للتوازن هو اعتماد أوزان تجريبية لا نهائية، مع نقطة مراجعة شهرية. إذا ارتفع الصرف الفعلي نرفع الحماية ونخفض الاستثمار، وإذا استقرت التدفقات نسمح بزيادة تدريجية. المهم أن تكون كل زيادة أو خفض مرتبطة ببيانات لا بالانطباع.',
      role:'الموازنة الاقتصادية',
    },
    {
      key:'central-secretary',
      name:'أمين السر المركزي',
      kind:'followup' as ConversationMessageKind,
      body:'المحضر الحالي يسجل ثلاثة اتجاهات: حماية أعلى مؤقتًا، استثمار مبدئي محدود قابل للتدرج، وعدم فتح تمويل جديد قبل ثبات الصرف. لم يُعتمد شيء بعد. اكتب رأيك أو عدّل النسب أو اطلب من أي عضو توضيحًا قبل أن أحوّل النقاط إلى مشروع قرار.',
      role:'المحضر الحي',
    },
  ];
}

export async function createCouncilDeliberationReplies(userId:string,userText:string):Promise<CouncilDeliberationReply[]>{
  const sql=getRawSql();
  const rows=await sql`select id from public.conversation_threads where user_id=${userId}::uuid and room_key='council' limit 1`;
  const threadId=rows[0]?.id?String(rows[0].id):null;
  if(!threadId) return [];
  const topic=topicFrom(userText);
  const views=makeViews(topic);
  const replies:CouncilDeliberationReply[]=[];
  for(const view of views){
    const structured={
      council_deliberation:true,
      deliberation_stage:'discussion',
      topic,
      speaker_role:view.role,
      requires_user_deliberation:true,
      final_decision:false,
      minutes_live:true,
      execution_boundary:'advisory_only_until_user_ratification',
    };
    const inserted=await sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        ${randomUUID()},${threadId}::uuid,${userId}::uuid,'agent',${view.key},${view.name},${view.kind},${view.body},${JSON.stringify(structured)}::jsonb
      )
      returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    `;
    const row=inserted[0];
    if(row) replies.push({
      ...row,
      id:String(row.id),
      sender_type:'agent',
      sender_key:String(row.sender_key),
      sender_name:String(row.sender_name),
      message_kind:String(row.message_kind) as ConversationMessageKind,
      body:String(row.body),
      structured_data:row.structured_data&&typeof row.structured_data==='object'?row.structured_data as Record<string,unknown>:{},
    });
  }
  await sql`update public.conversation_threads set updated_at=now() where id=${threadId}::uuid`;
  return replies;
}
