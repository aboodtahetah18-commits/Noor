export type CompactAuthorityAction=
  |'READ_CONFIRMED_DATA'
  |'CALCULATE_AND_ANALYZE'
  |'REQUEST_MISSING_DATA'
  |'RECOMMEND_WITHIN_DOMAIN'
  |'RECORD_INTERNAL_CONTEXT'
  |'ESCALATE_CASE'
  |'APPROVE_GOVERNANCE_CHANGE';

export type CompactProcedureKey=
  |'RECONCILE_DATA'
  |'RECALCULATE_CYCLE'
  |'HANDLE_DEVIATION'
  |'HANDLE_PROTECTION_RISK'
  |'EVALUATE_GOAL_OR_INVESTMENT'
  |'ESCALATE_AND_APPROVE'
  |'VERIFY_USER_EXECUTION';

export type CompactAuthorityRoleKind=
  |'governor'
  |'central_bank_manager'
  |'bank_manager'
  |'responsibility_owner'
  |'advisor'
  |'operations'
  |'secretary'
  |'council';

export type CompactAuthorityDefinition={
  action:CompactAuthorityAction;
  arabicName:string;
  description:string;
  allowedKinds:readonly CompactAuthorityRoleKind[];
  externalExecution:false;
};

export type CompactProcedureDefinition={
  key:CompactProcedureKey;
  arabicName:string;
  purpose:string;
  steps:readonly string[];
  ownerKinds:readonly CompactAuthorityRoleKind[];
};

export const COMPACT_AUTHORITIES:readonly CompactAuthorityDefinition[]=[
  {
    action:'READ_CONFIRMED_DATA',
    arabicName:'قراءة البيانات المؤكدة',
    description:'قراءة البيانات اللازمة للاختصاص من مصدر الحقيقة دون إنشاء نسخة مالية موازية.',
    allowedKinds:['governor','central_bank_manager','bank_manager','responsibility_owner','advisor','operations','secretary','council'],
    externalExecution:false,
  },
  {
    action:'CALCULATE_AND_ANALYZE',
    arabicName:'الحساب والتحليل',
    description:'إعادة الحساب والتحليل باستخدام المحركات المعتمدة دون تغيير الواقع المالي.',
    allowedKinds:['governor','central_bank_manager','bank_manager','responsibility_owner','advisor','operations','council'],
    externalExecution:false,
  },
  {
    action:'REQUEST_MISSING_DATA',
    arabicName:'طلب البيانات الناقصة',
    description:'طلب معلومة أو إثبات عندما يكون غيابه مؤثرًا في الحساب أو القرار.',
    allowedKinds:['governor','central_bank_manager','bank_manager','responsibility_owner','advisor','operations','secretary','council'],
    externalExecution:false,
  },
  {
    action:'RECOMMEND_WITHIN_DOMAIN',
    arabicName:'التوصية داخل الاختصاص',
    description:'إصدار توصية مفسرة داخل حدود الاختصاص والحدود الصارمة.',
    allowedKinds:['governor','central_bank_manager','bank_manager','responsibility_owner','advisor','council'],
    externalExecution:false,
  },
  {
    action:'RECORD_INTERNAL_CONTEXT',
    arabicName:'تسجيل السياق والحالة الداخلية',
    description:'تحديث الذاكرة أو حالة القضية أو المحضر دون اعتبار ذلك تنفيذًا ماليًا.',
    allowedKinds:['governor','central_bank_manager','bank_manager','responsibility_owner','advisor','operations','secretary','council'],
    externalExecution:false,
  },
  {
    action:'ESCALATE_CASE',
    arabicName:'التصعيد',
    description:'رفع التعارض أو الخطر أو الاستثناء إلى الجهة الأعلى بدل تجاوزه محليًا.',
    allowedKinds:['governor','central_bank_manager','bank_manager','responsibility_owner','advisor','operations','secretary'],
    externalExecution:false,
  },
  {
    action:'APPROVE_GOVERNANCE_CHANGE',
    arabicName:'اعتماد تغيير حوكمي',
    description:'اعتماد تعديل جوهري في السياسة أو الصلاحية أو القاعدة بعد المرور بمسار الحوكمة.',
    allowedKinds:['council'],
    externalExecution:false,
  },
] as const;

export const COMPACT_PROCEDURES:readonly CompactProcedureDefinition[]=[
  {
    key:'RECONCILE_DATA',
    arabicName:'مطابقة البيانات',
    purpose:'حسم التعارضات والتكرار ونقص الإثبات قبل الحساب.',
    steps:['قراءة مصدر الحقيقة','كشف التعارض أو التكرار','طلب الإثبات عند الحاجة','تحديث الحالة أو فتح تعارض'],
    ownerKinds:['operations','central_bank_manager','bank_manager'],
  },
  {
    key:'RECALCULATE_CYCLE',
    arabicName:'إعادة حساب الدورة',
    purpose:'إنتاج المتاح والعجز والفائض والحدود من المحرك الحسابي الموحد.',
    steps:['قراءة المدخلات المؤكدة','تشغيل المحرك الموحد','فحص قيود التوازن','حفظ أثر الحساب'],
    ownerKinds:['central_bank_manager','bank_manager','responsibility_owner'],
  },
  {
    key:'HANDLE_DEVIATION',
    arabicName:'معالجة الانحراف',
    purpose:'فهم سبب تجاوز أو انخفاض بند قبل تعديل الخطة.',
    steps:['قياس الانحراف','اختبار كونه مؤقتًا أو متكررًا','طلب السياق الناقص','اقتراح معالجة أو تصعيد'],
    ownerKinds:['bank_manager','responsibility_owner'],
  },
  {
    key:'HANDLE_PROTECTION_RISK',
    arabicName:'معالجة خطر الحماية أو الالتزام',
    purpose:'حماية الاستحقاقات والسيولة قبل الإنفاق أو الاستثمار الاختياري.',
    steps:['تحديد الفجوة','فحص البيانات الحديثة','تجميد التوصيات المتعارضة داخليًا','اقتراح المعالجة أو التصعيد'],
    ownerKinds:['bank_manager','responsibility_owner','central_bank_manager'],
  },
  {
    key:'EVALUATE_GOAL_OR_INVESTMENT',
    arabicName:'تقييم هدف أو استثمار',
    purpose:'قياس القدرة والملاءمة قبل التخصيص أو التوصية الاستثمارية.',
    steps:['حساب القدرة الآمنة','فحص أثر الحماية والالتزامات','مقارنة البدائل','إصدار توصية مفسرة'],
    ownerKinds:['bank_manager','responsibility_owner','advisor'],
  },
  {
    key:'ESCALATE_AND_APPROVE',
    arabicName:'التصعيد والاعتماد',
    purpose:'تمرير ما يتجاوز التفويض دون إنشاء لجان أو إجراءات إضافية بلا حاجة.',
    steps:['تحديد سبب التصعيد','إرفاق الحساب والأدلة','مراجعة المحافظ أو المجلس حسب النوع','تسجيل القرار والإصدار'],
    ownerKinds:['governor','central_bank_manager','secretary','council'],
  },
  {
    key:'VERIFY_USER_EXECUTION',
    arabicName:'التحقق من تنفيذ المستخدم',
    purpose:'فصل القرار الداخلي عن التنفيذ المالي الخارجي ثم مطابقة ما حدث فعليًا.',
    steps:['إنشاء طلب تنفيذ للمستخدم عند الحاجة','انتظار التنفيذ البشري','جمع الإثبات','مطابقة الأثر وإعادة الحساب'],
    ownerKinds:['operations','secretary','central_bank_manager'],
  },
] as const;

export function compactAuthorityAllowed(kind:CompactAuthorityRoleKind,action:CompactAuthorityAction){
  const authority=COMPACT_AUTHORITIES.find(item=>item.action===action);
  return Boolean(authority?.allowedKinds.includes(kind));
}

export function compactProcedure(key:CompactProcedureKey){
  return COMPACT_PROCEDURES.find(item=>item.key===key)??null;
}
