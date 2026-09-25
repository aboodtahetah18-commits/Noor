export type CompactGovernanceBank='central'|'hilal'|'solvency'|'assets';

export type CompactGovernanceUnitType=
  |'article'
  |'clause'
  |'paragraph'
  |'step'
  |'stage'
  |'category'
  |'reason'
  |'method'
  |'calculation'
  |'example';

export type CompactGovernanceArticleBlueprint={
  ref:string;
  title:string;
  owner:CompactGovernanceBank;
  allowedUnits:CompactGovernanceUnitType[];
};

export type CompactGovernanceDocumentBlueprint={
  referenceCode:string;
  title:string;
  purpose:string;
  primaryOwner:CompactGovernanceBank;
  participatingBanks:CompactGovernanceBank[];
  editableUnits:CompactGovernanceUnitType[];
  articles:CompactGovernanceArticleBlueprint[];
};

const allEditableUnits:CompactGovernanceUnitType[]=[
  'article','clause','paragraph','step','stage','category','reason','method','calculation','example',
];

export const COMPACT_GOVERNANCE_BLUEPRINT:readonly CompactGovernanceDocumentBlueprint[]=[
  {
    referenceCode:'NMC-CORE-01',
    title:'المرجع الحسابي لإدارة الميزانية الشخصية والدورة المالية',
    purpose:'توحيد جميع معادلات الدخل والمصروفات والالتزامات والمتاح والعجز والفائض والادخار والأهداف والحدود التشغيلية والحساب العكسي.',
    primaryOwner:'hilal',
    participatingBanks:['central','hilal','solvency','assets'],
    editableUnits:allEditableUnits,
    articles:[
      {ref:'1',title:'مصدر الأرقام وترتيب الاعتماد',owner:'hilal',allowedUnits:['clause','paragraph','reason','method','example']},
      {ref:'2',title:'الدخل المتحقق والمتوقع',owner:'hilal',allowedUnits:['clause','category','calculation','reason','example']},
      {ref:'3',title:'الالتزامات والمصروفات الأساسية',owner:'hilal',allowedUnits:['clause','category','calculation','reason','example']},
      {ref:'4',title:'المتاح الحقيقي والفائض والعجز',owner:'hilal',allowedUnits:['clause','calculation','method','reason','example']},
      {ref:'5',title:'الادخار والأهداف',owner:'assets',allowedUnits:['clause','calculation','method','stage','example']},
      {ref:'6',title:'الإنفاق الآمن حتى نهاية الدورة',owner:'hilal',allowedUnits:['clause','calculation','step','method','example']},
      {ref:'7',title:'الحساب العكسي من الهدف إلى المطلوب',owner:'central',allowedUnits:['clause','calculation','step','method','example']},
      {ref:'8',title:'اختبارات التوازن وعدم تجاوز المال الحقيقي',owner:'central',allowedUnits:['clause','calculation','step','reason','example']},
    ],
  },
  {
    referenceCode:'NMC-CORE-02',
    title:'مرجع الحماية والسيولة والحدود المالية الصارمة',
    purpose:'تحديد المال المحمي والاحتياط والسيولة الوقائية والحدود التي لا يجوز لأي خوارزمية تجاوزها.',
    primaryOwner:'solvency',
    participatingBanks:['central','solvency','hilal','assets'],
    editableUnits:allEditableUnits,
    articles:[
      {ref:'1',title:'تعريف المال المحمي',owner:'solvency',allowedUnits:['clause','category','reason','example']},
      {ref:'2',title:'الاحتياط والطوارئ',owner:'solvency',allowedUnits:['clause','calculation','method','stage','example']},
      {ref:'3',title:'الحد الأدنى للسيولة',owner:'solvency',allowedUnits:['clause','calculation','reason','example']},
      {ref:'4',title:'القيود الصارمة على التخصيص والاستثمار',owner:'central',allowedUnits:['clause','reason','step','example']},
      {ref:'5',title:'الاستثناءات والطوارئ',owner:'solvency',allowedUnits:['clause','stage','step','reason','example']},
    ],
  },
  {
    referenceCode:'NMC-CORE-03',
    title:'مرجع حالات المال والتخصيص والتوازن',
    purpose:'تعريف حالة كل مبلغ ومنع الازدواجية وضمان أن كل تخصيص أو حجز أو تنفيذ قابل للتسوية والمطابقة.',
    primaryOwner:'central',
    participatingBanks:['central','hilal','solvency','assets'],
    editableUnits:allEditableUnits,
    articles:[
      {ref:'1',title:'حالات المال',owner:'central',allowedUnits:['category','clause','reason','example']},
      {ref:'2',title:'الانتقال بين الحالات',owner:'central',allowedUnits:['stage','step','clause','reason','example']},
      {ref:'3',title:'الحجز والتخصيص',owner:'hilal',allowedUnits:['clause','calculation','method','example']},
      {ref:'4',title:'التنفيذ والإثبات والمطابقة',owner:'central',allowedUnits:['stage','step','clause','example']},
      {ref:'5',title:'إعادة التوزيع والمحافظة على التوازن',owner:'hilal',allowedUnits:['calculation','step','clause','example']},
    ],
  },
  {
    referenceCode:'NMC-CORE-04',
    title:'مرجع محرك القرار والتنسيق بين البنوك',
    purpose:'تحويل البيانات والحسابات إلى قرار مفسر وتحديد متى يتدخل الهلال أو ملاءة أو الأصول ومتى يصعد التعارض إلى المركزي.',
    primaryOwner:'central',
    participatingBanks:['central','hilal','solvency','assets'],
    editableUnits:allEditableUnits,
    articles:[
      {ref:'1',title:'دورة القرار',owner:'central',allowedUnits:['stage','step','clause','method','example']},
      {ref:'2',title:'اختصاص بنك الهلال',owner:'hilal',allowedUnits:['clause','reason','category','example']},
      {ref:'3',title:'اختصاص بنك ملاءة',owner:'solvency',allowedUnits:['clause','reason','category','example']},
      {ref:'4',title:'اختصاص بنك الأصول الاستثماري',owner:'assets',allowedUnits:['clause','reason','category','example']},
      {ref:'5',title:'فض التعارض والتنسيق المركزي',owner:'central',allowedUnits:['stage','step','clause','reason','example']},
      {ref:'6',title:'القرار تحت عدم اليقين',owner:'central',allowedUnits:['clause','method','calculation','reason','example']},
    ],
  },
  {
    referenceCode:'NMC-CORE-05',
    title:'مرجع التعلم المستمر للخوارزميات',
    purpose:'تحديد ما تتعلمه الخوارزميات وكيف تقيس الخطأ والثقة ومتى تعدل التوقعات دون تغيير القواعد الصارمة تلقائيًا.',
    primaryOwner:'central',
    participatingBanks:['central','hilal','solvency','assets'],
    editableUnits:allEditableUnits,
    articles:[
      {ref:'1',title:'مصادر التعلم',owner:'central',allowedUnits:['category','clause','reason','example']},
      {ref:'2',title:'التعلم من السلوك المالي',owner:'hilal',allowedUnits:['stage','method','calculation','reason','example']},
      {ref:'3',title:'التعلم من نتائج الحماية والسيولة',owner:'solvency',allowedUnits:['stage','method','calculation','reason','example']},
      {ref:'4',title:'التعلم من الأهداف والاستثمار',owner:'assets',allowedUnits:['stage','method','calculation','reason','example']},
      {ref:'5',title:'الثقة والحد الأدنى للأدلة',owner:'central',allowedUnits:['clause','calculation','reason','example']},
      {ref:'6',title:'الموسمية والاستثناءات',owner:'central',allowedUnits:['category','clause','method','reason','example']},
      {ref:'7',title:'اختبار التعديل قبل النفاذ',owner:'central',allowedUnits:['stage','step','method','calculation','example']},
      {ref:'8',title:'التراجع عن تعلم غير ناجح',owner:'central',allowedUnits:['stage','step','reason','example']},
    ],
  },
  {
    referenceCode:'NMC-CORE-06',
    title:'مرجع الذاكرة المالية ومصدر الحقيقة والمطابقة',
    purpose:'توحيد تخزين الحقائق المالية وسياقها ودرجة الثقة وملكيتها ومنع تكرار السؤال أو تضارب نسخ الحقيقة بين البنوك.',
    primaryOwner:'central',
    participatingBanks:['central','hilal','solvency','assets'],
    editableUnits:allEditableUnits,
    articles:[
      {ref:'1',title:'مصدر الحقيقة الواحد',owner:'central',allowedUnits:['clause','method','reason','example']},
      {ref:'2',title:'بنية الحقيقة المالية',owner:'central',allowedUnits:['category','clause','method','example']},
      {ref:'3',title:'درجة الثقة وحداثة البيانات',owner:'central',allowedUnits:['calculation','clause','reason','example']},
      {ref:'4',title:'الذاكرة السياقية وقرارات المستخدم',owner:'central',allowedUnits:['category','clause','method','example']},
      {ref:'5',title:'المطابقة والتعارض والتصحيح',owner:'central',allowedUnits:['stage','step','reason','example']},
      {ref:'6',title:'مشاركة الحقيقة بين البنوك',owner:'central',allowedUnits:['clause','method','reason','example']},
    ],
  },
  {
    referenceCode:'NMC-CORE-07',
    title:'المرجع المختصر للصلاحيات والحوكمة واللجان',
    purpose:'تحديد من يحسب ومن يوصي ومن يعترض ومن يصعد وما الذي يحتاج موافقة المستخدم دون تضخم في السياسات واللوائح.',
    primaryOwner:'central',
    participatingBanks:['central','hilal','solvency','assets'],
    editableUnits:allEditableUnits,
    articles:[
      {ref:'1',title:'الصلاحيات الأساسية',owner:'central',allowedUnits:['category','clause','reason','example']},
      {ref:'2',title:'حدود أصحاب المسؤوليات',owner:'central',allowedUnits:['clause','category','reason','example']},
      {ref:'3',title:'حدود مديري البنوك',owner:'central',allowedUnits:['clause','category','reason','example']},
      {ref:'4',title:'التصعيد للمحافظ والمجلس',owner:'central',allowedUnits:['stage','step','clause','reason','example']},
      {ref:'5',title:'اللجان والاجتماعات',owner:'central',allowedUnits:['stage','step','category','clause','example']},
      {ref:'6',title:'حدود التنفيذ المالي الخارجي',owner:'central',allowedUnits:['clause','reason','example']},
    ],
  },
] as const;

export function compactGovernanceDocument(referenceCode:string){
  return COMPACT_GOVERNANCE_BLUEPRINT.find(item=>item.referenceCode===referenceCode)??null;
}
