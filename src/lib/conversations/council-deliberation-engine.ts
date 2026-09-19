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
      key:'budget-spending-owner',
      name:'مسؤول الميزانية والإنفاق',
      kind:'recommendation' as ConversationMessageKind,
      body:'أعرض احتياج البنود التشغيلية للدورة على شكل: المطلوب، الحد الأدنى، والهدف المثالي. سأدافع عن كفاية المعيشة والتشغيل، لكنني ملزم أيضًا بإظهار أين يمكن الخفض دون الإضرار بالأساسيات.',
      role:'مسؤول الميزانية والإنفاق',
    },
    {
      key:'obligations-owner',
      name:'مسؤول الالتزامات',
      kind:'risk' as ConversationMessageKind,
      body:'أبدأ بالاستحقاقات والأقساط والديون والفواتير ذات الأولوية. أي مبلغ مستحق خلال الدورة سأوضح إن كان غير قابل للتخفيض، وما أثر أي نقص أو تأخير عليه قبل أن يذهب المال لاستخدام أكثر مرونة.',
      role:'مسؤول الالتزامات',
    },
    {
      key:'liquidity-protection-owner',
      name:'مسؤول السيولة والحماية',
      kind:'recommendation' as ConversationMessageKind,
      body:'أطالب بحصة تكفي الادخار والاحتياط والطوارئ والسيولة الفورية. سأذكر الحد الأدنى الآمن والهدف المثالي، وإذا خُفّض طلبي سأوضح بدقة كيف يتأخر بناء الحماية أو يرتفع خطر نقص السيولة.',
      role:'مسؤول السيولة والحماية',
    },
    {
      key:'goals-owner',
      name:'مسؤول الأهداف',
      kind:'recommendation' as ConversationMessageKind,
      body:'أعرض لكل هدف المساهمة المطلوبة هذه الدورة والحد الأدنى الذي يبقي موعد الإنجاز واقعيًا. إذا أمكن تخفيض مساهمة هدف دون كسر موعده أو احتمال تحقيقه سأصرّح بذلك ولا أطلب أكثر من اللازم.',
      role:'مسؤول الأهداف',
    },
    {
      key:'investment-owner',
      name:'مسؤول الاستثمار',
      kind:'recommendation' as ConversationMessageKind,
      body:'أدافع عن استمرار مسار النمو للمال المؤهل للاستثمار، لكن فقط بعد حماية الالتزامات والسيولة. سأحدد المبلغ المطلوب والحد الأدنى وأثر التأجيل، ثم أطلب من بنك الأصول الفرص المناسبة بدل أن أفترض منتجًا من عندي.',
      role:'مسؤول الاستثمار',
    },
    {
      key:'financial-advisor',
      name:'المستشار الاقتصادي',
      kind:'recommendation' as ConversationMessageKind,
      body:'لن أطالب بحصة مالية. دوري اختبار افتراضات الجميع ضد التضخم والدخل والظروف الاقتصادية والسيناريوهات الخارجية، والتنبيه إذا كانت مطالب أي مسؤول مبنية على افتراض غير واقعي أو قديم.',
      role:'الموازنة الاقتصادية',
    },
    {
      key:'central-secretary',
      name:'أمين السر المركزي',
      kind:'followup' as ConversationMessageKind,
      body:'المحضر الحالي يسجل مطالب المسؤولين الخمسة وحدودهم الدنيا وآثار التخفيض، مع ملاحظات المستشار الاقتصادي. لم يُعتمد أي توزيع بعد. اكتب رأيك أو عدّل أي مبلغ أو اطلب من مسؤول بعينه تبرير طلبه قبل تحويل النقاش إلى مشروع توزيع.',
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
      allocation_meeting:true,
      responsibility_claim_schema:['requested_amount','minimum_amount','ideal_amount','impact_if_reduced'],
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
