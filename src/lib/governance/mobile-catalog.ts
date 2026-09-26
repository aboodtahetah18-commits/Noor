import { COMPACT_AUTHORITIES, COMPACT_PROCEDURES } from '@/lib/governance/compact-authority-model';
import { COMPACT_CORE_GOVERNANCE_DOCUMENTS } from '@/content/governance/compact-core-documents';
import { COMPACT_GOVERNANCE_STAGE_FORMS } from '@/lib/governance/compact-governance-forms';

export type GovernanceCatalogItem={
  id:string;
  title:string;
  summary:string;
  owner:string;
  status:'معتمد'|'مرجع';
  version:string;
  details:string[];
};

export const governanceCatalog:GovernanceCatalogItem[]=[
  {
    id:'المراجع-الحاكمة',
    title:'المراجع الحاكمة السبعة',
    summary:'المصدر الوحيد للقواعد الحاكمة الحالية بدل السياسات واللوائح القديمة.',
    owner:'بنك نماء المركزي والبنوك المختصة',
    status:'مرجع',
    version:'الحالية',
    details:COMPACT_CORE_GOVERNANCE_DOCUMENTS.map(item=>item.referenceCode+' — '+item.title),
  },
  {
    id:'الإجراءات-المختصرة',
    title:'الإجراءات السبعة',
    summary:'سبعة مسارات تشغيل فقط من المطابقة حتى التحقق من تنفيذ المستخدم.',
    owner:'الجهات المالكة حسب الإجراء',
    status:'معتمد',
    version:'الحالية',
    details:COMPACT_PROCEDURES.map(item=>item.arabicName+' — '+item.purpose),
  },
  {
    id:'الصلاحيات-المختصرة',
    title:'الصلاحيات السبعة',
    summary:'صلاحيات محددة للقراءة والحساب والطلب والتوصية والتسجيل والتصعيد والاعتماد.',
    owner:'مجلس نماء الأعلى',
    status:'معتمد',
    version:'الحالية',
    details:COMPACT_AUTHORITIES.map(item=>item.arabicName+' — '+item.description),
  },
  {
    id:'نماذج-المراحل',
    title:'نماذج التشغيل',
    summary:'نموذج واحد جاهز لكل مرحلة من مراحل الحوكمة المختصرة.',
    owner:'مركز العمليات والمطابقة والجهة المالكة لكل إجراء',
    status:'معتمد',
    version:'الحالية',
    details:COMPACT_GOVERNANCE_STAGE_FORMS.map(item=>'المرحلة '+item.stage+' — '+item.title+' — المخرج: '+item.output),
  },
  {
    id:'اللجان',
    title:'اللجان الأساسية',
    summary:'لجنتان دائمتان فقط، والاجتماعات الأخرى مؤقتة حسب الحاجة.',
    owner:'بنك نماء المركزي',
    status:'معتمد',
    version:'الحالية',
    details:[
      'لجنة الدورة المالية والتوازن: للدورة والإنفاق والالتزامات والحماية والأهداف والتعارضات.',
      'لجنة المراجعة والمخاطر والتعلم: للمخاطر وجودة الحسابات والتعلم والتغييرات الحوكمية.',
      'أي لجنة أو اجتماع إضافي يكون مؤقتًا ومسببًا ولا ينشأ كهيكل دائم تلقائيًا.',
    ],
  },
  {
    id:'حدود-التنفيذ',
    title:'حدود التنفيذ المالي',
    summary:'النظام يحسب ويحلل ويوصي ويوثق؛ التنفيذ المالي الخارجي يبقى بيد المستخدم.',
    owner:'المستخدم',
    status:'معتمد',
    version:'الحالية',
    details:[
      'لا توجد صلاحية حوكمة تمنح تنفيذًا ماليًا خارجيًا تلقائيًا.',
      'الموافقة الداخلية لا تعني أن المال تحرك فعليًا.',
      'أي تنفيذ خارجي يحتاج تنفيذ المستخدم ثم إثباتًا ومطابقة وإعادة حساب عند الحاجة.',
    ],
  },
];
