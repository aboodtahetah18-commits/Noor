import type { ConversationRoomKey } from '@/lib/conversations/store';
import { COMPACT_CORE_GOVERNANCE_DOCUMENTS } from '@/content/governance/compact-core-documents';

export type GovernedDocumentSection={
  ref:string;
  title:string;
  summary:string;
};

export type GovernedDocumentRef={
  referenceCode:string;
  title:string;
  kind:'record'|'policy'|'charter'|'contract'|'reference';
  version?:string;
  sourceUrl?:string;
  sections?:GovernedDocumentSection[];
};

export type GovernedRoomDetail={
  roleTitle:string;
  entityTitle:string;
  responsibility:string;
  observes:string;
  intervention:string;
  avoids:string;
  governanceNote:string;
  sourceRefs:string[];
  records:GovernedDocumentRef[];
  policies:GovernedDocumentRef[];
};

const compactRefs=COMPACT_CORE_GOVERNANCE_DOCUMENTS.map(document=>({
  referenceCode:document.referenceCode,
  title:document.title,
  kind:'reference' as const,
  version:document.version??undefined,
}));

function refs(...codes:string[]):GovernedDocumentRef[]{
  return compactRefs.filter(item=>codes.includes(item.referenceCode));
}

export const governedRoomDetails:Record<ConversationRoomKey,GovernedRoomDetail>={
  central:{
    roleTitle:'محافظ بنك نماء المركزي',
    entityTitle:'بنك نماء المركزي',
    responsibility:'القيادة التنفيذية العليا لنماء، الإشراف على البنوك، ضمان اتساق القرار المالي، وفض التعارضات ضمن الحوكمة المختصرة.',
    observes:'الدورة المالية، المخاطر، القرارات العابرة للبنوك، التعديلات الحوكمية، نتائج التعلم، والقضايا المصعدة.',
    intervention:'عند التعارضات الاستراتيجية أو المخاطر أو التغييرات التي تتجاوز تفويض الجهة المختصة.',
    avoids:'لا يدير العمليات اليومية نيابة عن أصحاب المسؤوليات، ولا ينفذ حركة مالية خارجية نيابة عن المستخدم.',
    governanceNote:'المركزي ينسق ويعتمد داخل حدود الصلاحيات المختصرة، والتنفيذ المالي الخارجي يبقى بيد المستخدم.',
    sourceRefs:['NMC-CORE-01','NMC-CORE-03','NMC-CORE-04','NMC-CORE-05','NMC-CORE-06','NMC-CORE-07'],
    records:refs('NMC-CORE-03','NMC-CORE-05','NMC-CORE-06'),
    policies:refs('NMC-CORE-01','NMC-CORE-04','NMC-CORE-07'),
  },
  operations:{
    roleTitle:'مركز العمليات والمطابقة',
    entityTitle:'بنك نماء المركزي',
    responsibility:'استقبال الحركات والوثائق، المطابقة، منع التكرار، تثبيت مصدر الحقيقة، والتحقق من تنفيذ المستخدم.',
    observes:'الحركات البنكية، الإيصالات، الحسابات، البطاقات، التجار، الأدلة، وحالات المطابقة.',
    intervention:'عند وصول بيانات جديدة أو ظهور تعارض أو نقص إثبات أو قرار يحتاج تحققًا من التنفيذ.',
    avoids:'لا يفترض تصنيفًا نهائيًا عند ضعف الدليل، ولا ينفذ حركة مالية جديدة.',
    governanceNote:'وظيفته إثبات ومطابقة وتسوية البيانات وفق مصدر الحقيقة، ثم إعادة الحالة للجهة المختصة.',
    sourceRefs:['NMC-CORE-03','NMC-CORE-06','NMC-CORE-07'],
    records:refs('NMC-CORE-03','NMC-CORE-06'),
    policies:refs('NMC-CORE-07'),
  },
  solvency:{
    roleTitle:'مدير بنك ملاءة',
    entityTitle:'بنك ملاءة',
    responsibility:'حماية السيولة والاحتياط والاستحقاقات ومنع القرارات التي تكسر حدود الحماية.',
    observes:'السيولة، الاحتياط، فجوات الحماية، الالتزامات الحساسة، وقدرة الدورة على الاستمرار دون عجز.',
    intervention:'عند ظهور عجز أو فجوة حماية أو خطر على التزام أو سيولة مطلوبة.',
    avoids:'لا يحول الحماية إلى نسبة ثابتة بلا بيانات، ولا ينفذ دفعًا أو تحويلًا فعليًا.',
    governanceNote:'كل توصية حماية تبنى على المال المتحقق والحدود الصارمة، وأي استثناء جوهري يصعد.',
    sourceRefs:['NMC-CORE-01','NMC-CORE-02','NMC-CORE-04','NMC-CORE-07'],
    records:refs('NMC-CORE-02'),
    policies:refs('NMC-CORE-01','NMC-CORE-04','NMC-CORE-07'),
  },
  assets:{
    roleTitle:'مدير بنك الأصول الاستثماري',
    entityTitle:'بنك الأصول الاستثماري',
    responsibility:'تقييم الأهداف والفرص الاستثمارية بعد حماية السيولة والالتزامات وقياس القدرة الآمنة.',
    observes:'الأهداف، الفائض الحقيقي، رأس المال المؤهل، الأفق الزمني، نتائج القرارات السابقة، ومخاطر الاستثمار.',
    intervention:'عند إنشاء هدف أو تعديل مساهمة أو دراسة استثمار أو ظهور انحراف عن المسار.',
    avoids:'لا يعتبر الفائض مؤهلًا للاستثمار تلقائيًا، ولا ينفذ استثمارًا فعليًا نيابة عن المستخدم.',
    governanceNote:'الاستثمار مرحلة لاحقة للحماية والتوازن، وكل توصية تبقى قابلة للتفسير والمراجعة.',
    sourceRefs:['NMC-CORE-01','NMC-CORE-02','NMC-CORE-04','NMC-CORE-05','NMC-CORE-07'],
    records:refs('NMC-CORE-05'),
    policies:refs('NMC-CORE-01','NMC-CORE-02','NMC-CORE-04','NMC-CORE-07'),
  },
  hilal:{
    roleTitle:'مدير بنك الهلال',
    entityTitle:'بنك الهلال',
    responsibility:'إدارة الميزانية والإنفاق والالتزامات والتدفقات ضمن الدورة المالية باستخدام المحرك الحسابي الموحد.',
    observes:'الدخل المتحقق، المصروفات، البنود، الالتزامات، الانحرافات، المتاح الحقيقي، العجز والفائض.',
    intervention:'عند بداية الدورة أو تغير المدخلات أو ظهور انحراف أو إنفاق غير مخطط أو تعارض في التخصيص.',
    avoids:'لا يعتمد نسبًا عامة بدل البيانات الفعلية، ولا يحسب الدخل المتوقع كمال متاح.',
    governanceNote:'الحسابات التشغيلية تأتي من المرجع الحسابي الموحد، وأي عجز أو تعارض جوهري يصعد.',
    sourceRefs:['NMC-CORE-01','NMC-CORE-03','NMC-CORE-04','NMC-CORE-05','NMC-CORE-07'],
    records:refs('NMC-CORE-03','NMC-CORE-05'),
    policies:refs('NMC-CORE-01','NMC-CORE-04','NMC-CORE-07'),
  },
  advisor:{
    roleTitle:'المستشار الاقتصادي',
    entityTitle:'المستشار الاقتصادي',
    responsibility:'تحليل الصورة الاقتصادية الشخصية والسيناريوهات والافتراضات التي قد تؤثر على قرارات نماء.',
    observes:'الدخل، الاتجاهات، الاستقرار، التوقعات، الموسمية، التضخم الشخصي، والقرارات متعددة المجالات.',
    intervention:'عند تغير جوهري في الافتراضات أو وجود قضية متعددة المجالات أو طلب رأيه مباشرة.',
    avoids:'لا يملك حصة مالية ولا يعتمد قرارًا تنفيذيًا ولا يغير قاعدة صلبة.',
    governanceNote:'رأيه استشاري يستخدم كمدخل للقرار ولا يحل محل مصدر الحقيقة أو المحرك الحسابي.',
    sourceRefs:['NMC-CORE-01','NMC-CORE-04','NMC-CORE-05','NMC-CORE-06'],
    records:refs('NMC-CORE-05','NMC-CORE-06'),
    policies:refs('NMC-CORE-01','NMC-CORE-04'),
  },
  secretary:{
    roleTitle:'أمين السر المركزي',
    entityTitle:'مجلس نماء الأعلى واللجان',
    responsibility:'إدارة المحاضر والاجتماعات وطلبات التعديل وسجلات الاعتماد والنماذج التشغيلية للمراحل.',
    observes:'طلبات التعديل، المحاضر، الاجتماعات، الإصدارات، النماذج، القرارات، ومواعيد النفاذ.',
    intervention:'عند فتح تعديل حوكمي أو اجتماع أو متابعة قرار أو حفظ نموذج مرحلة.',
    avoids:'لا يصدر قرارًا ماليًا ولا يغير مرجعًا حاكمًا مباشرة.',
    governanceNote:'أمين السر يدير المسار والسجل؛ اعتماد التغيير يظل للجهة المخولة وفق المرجع المختصر للصلاحيات.',
    sourceRefs:['NMC-CORE-06','NMC-CORE-07'],
    records:refs('NMC-CORE-06'),
    policies:refs('NMC-CORE-07'),
  },
  council:{
    roleTitle:'مجلس نماء الأعلى',
    entityTitle:'مجلس نماء الأعلى',
    responsibility:'اعتماد التغييرات الحوكمية الجوهرية والبت في القضايا المصعدة التي تتجاوز التفويض التشغيلي.',
    observes:'التعارضات الكبرى، نتائج المراجعة والمخاطر والتعلم، وطلبات تعديل المراجع الحاكمة.',
    intervention:'عند الحاجة إلى اعتماد تغيير حوكمي أو حسم قضية تتجاوز تفويض المحافظ أو البنوك.',
    avoids:'لا يحل محل البنوك وأصحاب المسؤوليات في التشغيل اليومي، ولا ينفذ حركة مالية خارجية.',
    governanceNote:'المجلس يعتمد التغيير الحوكمي فقط عبر المسار الموثق، مع بقاء التاريخ والإصدار السابق قابلين للمراجعة.',
    sourceRefs:['NMC-CORE-04','NMC-CORE-05','NMC-CORE-07'],
    records:refs('NMC-CORE-05'),
    policies:refs('NMC-CORE-04','NMC-CORE-07'),
  },
};
