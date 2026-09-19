import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationRoomKey } from '@/lib/conversations/store';
import type { PersistedReply } from '@/lib/conversations/decision-lifecycle-store';

type RoomGovernance={
  policy_refs:string[];
  authority_refs:string[];
  execution_boundary:string;
  oversight:string;
};

const GOVERNANCE_BY_ROOM:Record<ConversationRoomKey,RoomGovernance>={
  central:{
    policy_refs:['تأسيس-مصدر-١٩٨','تأسيس-سؤال-١٩٩','تأسيس-إقفال-٢٠٠','حوكمة-عرض-٢١١'],
    authority_refs:['ROLE-GOV','ROLE-CM','ENTITY-COUNCIL'],
    execution_boundary:'لا حركة مالية خارجية تلقائية؛ المستخدم ينفذ ويثبت التنفيذ.',
    oversight:'بنك نماء المركزي',
  },
  operations:{
    policy_refs:['عمليات-استقبال-٢٠٩','بيانات-رسائل-١٦٣','بيانات-تاجر-١٦٤'],
    authority_refs:['دور-مركز-المطابقة','SYS-REC','ROLE-CM'],
    execution_boundary:'الرسالة دليل على الحركة الموصوفة فقط؛ لا تنشئ حركة مالية جديدة بذاتها.',
    oversight:'مركز العمليات والمطابقة — بنك نماء المركزي',
  },
  solvency:{
    policy_refs:['سفر-تمويل-١٨٣','صحة-حماية-١٩٢','تأمين-تسوية-١٩٧'],
    authority_refs:['ENTITY-MAL','ROLE-MAL-MGR','ROLE-CM'],
    execution_boundary:'الدعم أو الحماية المؤسسية لا يساوي تنفيذًا خارجيًا على مال المستخدم.',
    oversight:'بنك ملاءة وبنك نماء المركزي',
  },
  assets:{
    policy_refs:['أصول-قيمة-٢٠١','أصول-هدف-٢٠٢','أصول-عائد-٢٠٣','أصول-تركيز-٢٠٤'],
    authority_refs:['ROLE-AI-MGR','ROLE-IA','ENTITY-COUNCIL'],
    execution_boundary:'لا شراء أو بيع أو تسييل تلقائي؛ التنفيذ بيد المستخدم ثم المطابقة.',
    oversight:'بنك الأصول الاستثماري وبنك نماء المركزي',
  },
  hilal:{
    policy_refs:['ميزانية-تعديل-١٨٠','تأسيس-إقفال-٢٠٠'],
    authority_refs:['ROLE-HL','ROLE-CM','ENTITY-COUNCIL'],
    execution_boundary:'اعتماد العرض لا يعني تنفيذ التمويل أو السداد الفعلي.',
    oversight:'بنك الهلال وبنك نماء المركزي',
  },
  advisor:{
    policy_refs:['تأسيس-مصدر-١٩٨','تأسيس-سؤال-١٩٩'],
    authority_refs:['ROLE-EA','ROLE-GOV'],
    execution_boundary:'الرأي استشاري ولا ينشئ التزامًا أو حركة مالية.',
    oversight:'المحافظ والمستشار الاقتصادي',
  },
  secretary:{
    policy_refs:['حوكمة-عرض-٢١١','حوكمة-مراجعة-٢١٢','لجان-دورية-٢١٣','لجان-مشاركة-٢١٤'],
    authority_refs:['دور-أمين-السر','ENTITY-COUNCIL'],
    execution_boundary:'أمين السر يعرض وينظم ويوثق ولا يعتمد قرارًا ماليًا.',
    oversight:'مجلس نماء الأعلى',
  },
  council:{
    policy_refs:['مجلس-تأسيسي-٢١٠','حوكمة-مراجعة-٢١٢','لجان-دورية-٢١٣'],
    authority_refs:['ENTITY-COUNCIL','ROLE-CHAIR','ROLE-DEPUTY-CHAIR'],
    execution_boundary:'قرار المجلس المؤسسي لا يحرك أموال المستخدم؛ التنفيذ المالي يحتاج أمر المستخدم وإثباته.',
    oversight:'مجلس نماء الأعلى',
  },
};

export function governanceContextForRoom(roomKey:ConversationRoomKey){
  return GOVERNANCE_BY_ROOM[roomKey];
}

export async function attachGovernanceContext(
  userId:string,
  roomKey:ConversationRoomKey,
  reply:PersistedReply|null,
):Promise<PersistedReply|null>{
  if(!reply) return null;
  const context=governanceContextForRoom(roomKey);
  const structured={
    ...(reply.structured_data??{}),
    governance_context:{
      room:roomKey,
      policy_refs:context.policy_refs,
      authority_refs:context.authority_refs,
      execution_boundary:context.execution_boundary,
      oversight:context.oversight,
      policy_version:'الحالية',
    },
  };
  const sql=getRawSql();
  await sql`
    update public.conversation_messages
    set structured_data=${JSON.stringify(structured)}::jsonb
    where id=${reply.id}::uuid and user_id=${userId}::uuid
  `;
  return {...reply,structured_data:structured};
}
