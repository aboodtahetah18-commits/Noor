import type { CompactProcedureKey } from '@/lib/governance/compact-authority-model';

export type CompactGovernanceFormFieldType='text'|'textarea'|'number'|'date'|'select'|'evidence'|'decision';

export type CompactGovernanceFormField={
  key:string;
  label:string;
  type:CompactGovernanceFormFieldType;
  required:boolean;
  placeholder?:string;
  options?:readonly string[];
};

export type CompactGovernanceStageForm={
  id:string;
  procedureKey:CompactProcedureKey;
  title:string;
  purpose:string;
  stage:number;
  owner:string;
  trigger:string;
  output:string;
  fields:readonly CompactGovernanceFormField[];
  checklist:readonly string[];
};

export const COMPACT_GOVERNANCE_STAGE_FORMS:readonly CompactGovernanceStageForm[]=[
  {
    id:'FORM-01',
    procedureKey:'RECONCILE_DATA',
    title:'نموذج مطابقة البيانات',
    purpose:'تثبيت مصدر الحقيقة وحسم التعارض أو النقص قبل أي حساب.',
    stage:1,
    owner:'مركز العمليات والمطابقة',
    trigger:'وجود بيانات جديدة أو متعارضة أو ناقصة الإثبات.',
    output:'بيانات مؤكدة أو تعارض مفتوح بمالك واضح.',
    fields:[
      {key:'subject',label:'البيان أو الحركة',type:'text',required:true},
      {key:'source',label:'المصدر',type:'text',required:true},
      {key:'currentValue',label:'القيمة الحالية',type:'text',required:false},
      {key:'conflict',label:'وصف التعارض أو النقص',type:'textarea',required:false},
      {key:'evidence',label:'الإثبات',type:'evidence',required:false},
      {key:'resolution',label:'نتيجة المطابقة',type:'decision',required:true,options:['مؤكد','يحتاج إثبات','متعارض','مرفوض']},
    ],
    checklist:['قراءة مصدر الحقيقة','منع التكرار','التحقق من الإثبات','تسجيل النتيجة أو فتح تعارض'],
  },
  {
    id:'FORM-02',
    procedureKey:'RECALCULATE_CYCLE',
    title:'نموذج إعادة حساب الدورة',
    purpose:'إعادة بناء المؤشرات المالية من المدخلات المؤكدة فقط.',
    stage:2,
    owner:'المحرك الحسابي الموحد',
    trigger:'تغير دخل أو التزام أو خطة أو تنفيذ أو نتيجة مطابقة.',
    output:'المتاح والعجز والفائض والحدود مع أثر حساب قابل للتفسير.',
    fields:[
      {key:'cycle',label:'الدورة المالية',type:'text',required:true},
      {key:'verifiedIncome',label:'الدخل المتحقق',type:'number',required:true},
      {key:'protectedObligations',label:'الالتزامات المحمية',type:'number',required:true},
      {key:'reservedEssentials',label:'الأساسيات المحجوزة',type:'number',required:true},
      {key:'requiredProtection',label:'الحماية المطلوبة',type:'number',required:true},
      {key:'notes',label:'ملاحظات المدخلات',type:'textarea',required:false},
    ],
    checklist:['قراءة المدخلات المؤكدة','تشغيل المحرك','فحص قيود التوازن','حفظ أثر الحساب'],
  },
  {
    id:'FORM-03',
    procedureKey:'HANDLE_DEVIATION',
    title:'نموذج معالجة الانحراف',
    purpose:'فهم الانحراف قبل تعديل الخطة أو اعتبار السلوك نمطًا.',
    stage:3,
    owner:'مسؤول الميزانية والإنفاق',
    trigger:'تجاوز أو انخفاض أو إنفاق غير مخطط.',
    output:'سبب مصنف + معالجة مقترحة أو تصعيد.',
    fields:[
      {key:'item',label:'البند',type:'text',required:true},
      {key:'planned',label:'المخطط',type:'number',required:true},
      {key:'actual',label:'المنفذ',type:'number',required:true},
      {key:'reason',label:'سبب الانحراف',type:'textarea',required:true},
      {key:'pattern',label:'طبيعة الانحراف',type:'select',required:true,options:['مؤقت','متكرر','استثنائي','غير محسوم']},
      {key:'action',label:'المعالجة المقترحة',type:'decision',required:true,options:['استمرار الخطة','تعديل الخطة','طلب بيانات','تصعيد']},
    ],
    checklist:['قياس الانحراف','تحديد السبب','تمييز المؤقت من المتكرر','اقتراح معالجة أو تصعيد'],
  },
  {
    id:'FORM-04',
    procedureKey:'HANDLE_PROTECTION_RISK',
    title:'نموذج معالجة خطر الحماية',
    purpose:'حماية الالتزامات والسيولة قبل الإنفاق أو الاستثمار المرن.',
    stage:4,
    owner:'مسؤول السيولة والحماية',
    trigger:'عجز أو فجوة حماية أو استحقاق معرض للخطر.',
    output:'خطة معالجة أو تصعيد مع بقاء التنفيذ المالي بيد المستخدم.',
    fields:[
      {key:'risk',label:'الخطر',type:'textarea',required:true},
      {key:'gap',label:'قيمة الفجوة',type:'number',required:true},
      {key:'dueDate',label:'تاريخ الاستحقاق',type:'date',required:false},
      {key:'evidence',label:'الأدلة الحالية',type:'evidence',required:false},
      {key:'mitigation',label:'المعالجة المقترحة',type:'textarea',required:true},
      {key:'decision',label:'القرار الداخلي',type:'decision',required:true,options:['معالجة محلية','طلب بيانات','تصعيد','انتظار تنفيذ المستخدم']},
    ],
    checklist:['تحديد الفجوة','فحص البيانات الحديثة','منع التوصيات المتعارضة','تسجيل المعالجة أو التصعيد'],
  },
  {
    id:'FORM-05',
    procedureKey:'EVALUATE_GOAL_OR_INVESTMENT',
    title:'نموذج تقييم هدف أو استثمار',
    purpose:'قياس القدرة الآمنة والبدائل قبل أي تخصيص أو توصية استثمارية.',
    stage:5,
    owner:'مسؤول الأهداف أو الاستثمار',
    trigger:'إضافة هدف أو دراسة استثمار أو تعديل مساهمة.',
    output:'توصية مفسرة مبنية على القدرة الآمنة.',
    fields:[
      {key:'subject',label:'الهدف أو الاستثمار',type:'text',required:true},
      {key:'requiredAmount',label:'المبلغ المطلوب',type:'number',required:true},
      {key:'safeCapacity',label:'القدرة الآمنة',type:'number',required:true},
      {key:'horizon',label:'الأفق الزمني',type:'text',required:false},
      {key:'alternatives',label:'البدائل',type:'textarea',required:true},
      {key:'recommendation',label:'التوصية',type:'decision',required:true,options:['مناسب','مناسب بتعديل','غير مناسب الآن','تصعيد للمراجعة']},
    ],
    checklist:['حساب القدرة الآمنة','فحص الحماية والالتزامات','مقارنة البدائل','إصدار توصية مفسرة'],
  },
  {
    id:'FORM-06',
    procedureKey:'ESCALATE_AND_APPROVE',
    title:'نموذج التصعيد والاعتماد',
    purpose:'تمرير ما يتجاوز التفويض بمسار واحد قصير وموثق.',
    stage:6,
    owner:'المحافظ وأمين السر ومجلس نماء الأعلى',
    trigger:'تعارض أو استثناء أو تعديل حوكمي يتجاوز التفويض المحلي.',
    output:'قرار معتمد أو مرفوض مع السبب والإصدار.',
    fields:[
      {key:'caseTitle',label:'موضوع التصعيد',type:'text',required:true},
      {key:'reason',label:'سبب التصعيد',type:'textarea',required:true},
      {key:'calculation',label:'ملخص الحساب والأثر',type:'textarea',required:true},
      {key:'evidence',label:'الأدلة',type:'evidence',required:false},
      {key:'decision',label:'قرار الجهة المخولة',type:'decision',required:true,options:['اعتماد','رفض','إعادة للدراسة','طلب استكمال']},
      {key:'effectiveDate',label:'تاريخ النفاذ عند الاعتماد',type:'date',required:false},
    ],
    checklist:['تحديد سبب التصعيد','إرفاق الحساب والأدلة','المراجعة من الجهة المخولة','تسجيل القرار والإصدار'],
  },
  {
    id:'FORM-07',
    procedureKey:'VERIFY_USER_EXECUTION',
    title:'نموذج التحقق من تنفيذ المستخدم',
    purpose:'فصل القرار الداخلي عن التنفيذ الخارجي ومطابقة ما حدث فعليًا.',
    stage:7,
    owner:'مركز العمليات والمطابقة',
    trigger:'وجود قرار أو توصية تحتاج تنفيذًا ماليًا من المستخدم.',
    output:'تنفيذ مثبت أو غير منفذ أو متعارض مع إعادة الحساب عند الحاجة.',
    fields:[
      {key:'decisionRef',label:'مرجع القرار',type:'text',required:true},
      {key:'requestedAction',label:'الإجراء المطلوب من المستخدم',type:'textarea',required:true},
      {key:'executionStatus',label:'حالة التنفيذ',type:'decision',required:true,options:['تم التنفيذ','تم جزئيًا','لم ينفذ','تم بشكل مختلف']},
      {key:'executedAmount',label:'المبلغ المنفذ',type:'number',required:false},
      {key:'evidence',label:'إثبات التنفيذ',type:'evidence',required:false},
      {key:'variance',label:'الفارق أو الملاحظة',type:'textarea',required:false},
    ],
    checklist:['طلب التنفيذ من المستخدم','انتظار التنفيذ البشري','جمع الإثبات','مطابقة الأثر وإعادة الحساب'],
  },
] as const;

export function compactGovernanceStageForm(procedureKey:CompactProcedureKey){
  return COMPACT_GOVERNANCE_STAGE_FORMS.find(item=>item.procedureKey===procedureKey)??null;
}
