import { getRawSql } from '@/infrastructure/db/client';

export type GovernancePolicyItem={
  id:string;
  title:string;
  domain:string;
  status:'معتمد';
  summary:string;
};

export const governancePolicies:GovernancePolicyItem[]=[
  {id:'عمليات-استقبال-٢٠٩',title:'مركز العمليات والمطابقة هو قناة الاستقبال الرسمية لرسائل المشتريات',domain:'العمليات والمطابقة',status:'معتمد',summary:'رسائل الشراء تصل إلى مركز العمليات حتى لو أرسلت من دردشة أخرى، دون طلب إعادة الإرسال أو إنشاء نسخة مكررة.'},
  {id:'مجلس-تأسيسي-٢١٠',title:'اجتماع تأسيسي للمجلس بعد أربع وعشرين ساعة',domain:'المجلس والتأسيس',status:'معتمد',summary:'بعد اعتماد التأسيس الأولي يجهز أمين السر اجتماع المجلس للتعارف ومراجعة الصورة المالية ومعايرة احتياجات الخوارزميات.'},
  {id:'حوكمة-عرض-٢١١',title:'إتاحة كاملة للسياسات والصلاحيات والآليات والمحاضر على الجوال',domain:'الحوكمة والشفافية',status:'معتمد',summary:'الملخص مدخل سريع فقط، بينما النص الكامل والإصدار والمحاضر والقرارات المرتبطة تبقى متاحة للمستخدم.'},
  {id:'حوكمة-مراجعة-٢١٢',title:'طلب تعديل أي سياسة أو صلاحية يفتح مسار مراجعة رسمي',domain:'الحوكمة والتطوير',status:'معتمد',summary:'أي تعديل يحفظ كسجل مراجعة مرتبط بالإصدار الحالي ولا يغير التاريخ بصمت.'},
  {id:'لجان-دورية-٢١٣',title:'اجتماعات اللجان الدائمة مجدولة دوريًا بالنسبة للدورة المالية',domain:'اللجان والحوكمة',status:'معتمد',summary:'الاجتماع الدوري لا يعتمد على حدث عشوائي، والاجتماع الطارئ يضاف ولا يلغي الدوري التالي.'},
  {id:'لجان-مشاركة-٢١٤',title:'مشاركة المستخدم في الاجتماعات الدورية متاحة وغير عشوائية',domain:'اللجان وتجربة المستخدم',status:'معتمد',summary:'تصل دعوة وجدول أعمال ويمكن للمستخدم إضافة موضوع أو المشاركة أو مراجعة المحضر لاحقًا.'},
  {id:'تأسيس-مصدر-١٩٨',title:'الحقيقة الأساسية تحفظ مرة واحدة وتربط بها بقية النماذج',domain:'التأسيس والبيانات',status:'معتمد',summary:'الحساب والمركبة والمعال والوثيقة أمثلة لحقائق مرجعية لا تنشأ لها نسخ متعارضة بين النماذج.'},
  {id:'تأسيس-سؤال-١٩٩',title:'لا يعاد سؤال حقيقة صالحة إلا بسبب واضح',domain:'التأسيس والحوار',status:'معتمد',summary:'التكرار مسموح للتحقق أو التعارض أو التقادم فقط، والحقائق الصالحة تعبأ مسبقًا.'},
  {id:'تأسيس-إقفال-٢٠٠',title:'إقفال التأسيس يعتمد اكتمال المجالات الجوهرية لا عدد الأسئلة',domain:'التأسيس والحوكمة',status:'معتمد',summary:'الفروع غير المنطبقة لا تعد نقصًا والتعلم الممتد يمكن أن يستمر بعد التشغيل.'},
  {id:'ميزانية-شراء-٢٠٥',title:'الضريبة المضمنة في الشراء جزء من قيمة العملية وليست بندًا مستقلًا',domain:'المشتريات والميزانية',status:'معتمد',summary:'تسجل قيمة المشتريات كاملة مرة واحدة لتجنب مضاعفة المصروف.'},
];

export const committeeCadence=[
  {id:'COM-P01',name:'لجنة الدورة والميزانية والإنفاق',cadence:'اليوم الأول من كل دورة مالية',emergency:'اجتماع إضافي عند انحراف جوهري أو عجز أو فائض مادي'},
  {id:'COM-P02',name:'لجنة الاستقرار والسيولة والتمويل',cadence:'اليوم الثاني من كل دورة مالية',emergency:'اجتماع إضافي فور طارئ سيولة أو استقرار'},
  {id:'COM-P03',name:'لجنة الأهداف والالتزامات',cadence:'اليوم الرابع من كل دورة مالية',emergency:'اجتماع إضافي عند تعارض هدف مع التزام جوهري'},
  {id:'COM-P04',name:'لجنة الاستثمار والأصول',cadence:'اليوم السابع من كل ثالث دورة مالية',emergency:'اجتماع إضافي عند استثمار أو تسييل أو تركيز مخاطر جوهري'},
  {id:'COM-P05',name:'لجنة السياسات والمخاطر والتدقيق',cadence:'اليوم العاشر من كل ثالث دورة مالية',emergency:'اجتماع إضافي عند خرق سياسة أو خلل رقابي جوهري'},
];

export async function getGovernanceOverview(userId:string){
  const sql=getRawSql();
  const rows=await sql`
    select status,current_step,started_at,completed_at,updated_at
    from public.user_onboarding_state
    where user_id=${userId}::uuid
    limit 1
  `;
  const state=rows[0]??null;
  const completedAt=state?.completed_at?new Date(String(state.completed_at)):null;
  const firstCouncilMeetingAt=completedAt
    ? new Date(completedAt.getTime()+24*60*60*1000).toISOString()
    : null;

  return {
    onboarding:{
      complete:String(state?.status??'')==='COMPLETED',
      completed_at:completedAt?.toISOString()??null,
      first_council_meeting_at:firstCouncilMeetingAt,
    },
    policies:governancePolicies,
    committees:committeeCadence,
    capabilities:[
      'عرض السياسات ومصفوفة الصلاحيات والآليات',
      'عرض المحاضر والقرارات المرتبطة',
      'طلب اجتماع لمراجعة أي فقرة',
      'فتح قضية تعديل دون تغيير النسخة التاريخية',
    ],
  };
}
