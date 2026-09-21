import type { ConversationRoomKey } from '@/lib/conversations/store';
import { FINANCIAL_RESPONSIBILITY_ROLES, ECONOMIC_ADVISOR } from '@/lib/advisors/approved-advisors';

export type AlgorithmRoleKind='governor'|'central_bank_manager'|'bank_manager'|'responsibility_owner'|'advisor'|'operations'|'secretary'|'council';
export type AlgorithmRoleRef={
  referenceCode:string;
  key:string;
  name:string;
  kind:AlgorithmRoleKind;
  homeRoom:ConversationRoomKey;
  reportsTo:string;
  mandate:string;
  accountableFor:string[];
  kpis:string[];
  escalation:string[];
  prohibited:string[];
  policyRefs:string[];
};

const ownerByKey=new Map(FINANCIAL_RESPONSIBILITY_ROLES.map(item=>[item.key,item]));

function ownerRole(args:{
  referenceCode:string;
  key:string;
  homeRoom:ConversationRoomKey;
  policyRefs:string[];
}):AlgorithmRoleRef{
  const role=ownerByKey.get(args.key);
  if(!role) throw new Error('FINANCIAL_RESPONSIBILITY_ROLE_NOT_FOUND');
  return {
    referenceCode:args.referenceCode,
    key:role.key,
    name:role.name,
    kind:'responsibility_owner',
    homeRoom:args.homeRoom,
    reportsTo:'مدير بنك نماء المركزي',
    mandate:role.mandate,
    accountableFor:[...role.accountableFor],
    kpis:[...role.kpis],
    escalation:[...role.escalation],
    prohibited:[...role.prohibited],
    policyRefs:args.policyRefs,
  };
}

export const ALGORITHM_ROLE_REGISTRY:readonly AlgorithmRoleRef[]=[
  {
    referenceCode:'ROLE-NAM-GOV-01',
    key:'central-governor',
    name:'محافظ نماء',
    kind:'governor',
    homeRoom:'central',
    reportsTo:'مجلس نماء الأعلى',
    mandate:'القيادة التنفيذية العليا لنماء، الإشراف على مديري البنوك، ضمان الاتساق المؤسسي، وترجيح التعارضات الاستراتيجية ضمن الحوكمة.',
    accountableFor:['الاتساق المؤسسي','سلامة القرارات الثقيلة','حسم التعارضات العابرة للبنوك','جودة التصعيد للمجلس'],
    kpis:['وضوح مبررات القرار','نسبة القرارات القابلة للتدقيق','زمن حسم التعارضات','جودة التكامل بين البنوك'],
    escalation:['تغيير سياسة حاكمة','تعارض بين بنوك','قرار يتجاوز تفويض جهة واحدة'],
    prohibited:['لا يدير التفاصيل اليومية بدل مديري البنوك','لا ينفذ حركة مالية خارجية','لا يتجاوز القواعد الصارمة','لا يعتمد تعديل سياسة خارج مسار المجلس'],
    policyRefs:['NMC-POL-01','NMC-POL-02','NMC-POL-03','NMC-POL-08'],
  },
  {
    referenceCode:'ROLE-NMC-MGR-01',
    key:'central-bank-manager',
    name:'مدير بنك نماء المركزي',
    kind:'central_bank_manager',
    homeRoom:'central',
    reportsTo:'محافظ نماء',
    mandate:'قيادة التشغيل اليومي لبنك نماء المركزي، متابعة أصحاب المسؤوليات والمستشار الاقتصادي، ضمان اكتمال التحليل والتنسيق بين البنوك، ورفع التعارضات التي تتجاوز التفويض.',
    accountableFor:['جودة التشغيل المركزي','اكتمال التحليلات','تنسيق أصحاب المسؤوليات','جودة التصعيد للمحافظ'],
    kpis:['زمن إغلاق التعارضات التشغيلية','اكتمال البيانات قبل القرار','جودة توزيع القضايا على المسؤولين','نسبة التصعيدات الصحيحة'],
    escalation:['تعارض عابر للبنوك','اعتراض مخاطر ملزم','تغيير سياسة أو صلاحية','قرار يتجاوز التفويض التشغيلي'],
    prohibited:['لا يحل محل المسؤول المختص في الرأي الفني','لا يلغي اعتراضًا ملزمًا بلا مسار حوكمي','لا ينفذ أموال المستخدم','لا يغير سياسة أو قاعدة صارمة منفردًا'],
    policyRefs:['NMC-POL-01','NMC-POL-02','NMC-POL-03','NMC-POL-08'],
  },
  {
    referenceCode:'ROLE-OPS-01',
    key:'operations-center',
    name:'مركز العمليات والمطابقة',
    kind:'operations',
    homeRoom:'operations',
    reportsTo:'مدير بنك نماء المركزي',
    mandate:'استقبال الرسائل والكشوف والإيصالات ومطابقة الحركات ومنع التكرار وربط الإثباتات بالعملية الصحيحة.',
    accountableFor:['جودة المطابقة','منع التكرار','سلامة ربط الحساب أو البطاقة','حالة التسوية'],
    kpis:['دقة المطابقة','زمن التسوية','نسبة التعارضات المحسومة','نسبة الحركات غير المصنفة'],
    escalation:['تعارض يمنع المطابقة','نقص دليل جوهري','انخفاض الثقة في التصنيف'],
    prohibited:['لا ينفذ حركة مالية','لا يملك الميزانية أو البنود','لا يفترض تصنيفًا نهائيًا عند انخفاض الثقة'],
    policyRefs:['OPS-REF-01','OPS-CTR-01','OPS-POL-01'],
  },
  {
    referenceCode:'ROLE-MAL-MGR-01',
    key:'solvency-manager',
    name:'مدير بنك ملاءة',
    kind:'bank_manager',
    homeRoom:'solvency',
    reportsTo:'محافظ نماء',
    mandate:'إدارة نطاق الحماية والسيولة والطوارئ ورفع التوصيات المؤسسية ضمن سياسة بنك ملاءة.',
    accountableFor:['كفاية الحماية','سلامة قرارات الملاءة','جودة التصعيدات'],
    kpis:['استقرار أشهر التغطية','جودة توصيات الطوارئ','انخفاض القرارات المخالفة للسيولة'],
    escalation:['هبوط الحماية','حاجة طارئة كبيرة','تعارض مع الاستثمار أو الالتزامات'],
    prohibited:['لا ينفذ تحويلًا','لا يسحب من أموال المستخدم','لا يغير سياسة البنك منفردًا'],
    policyRefs:['MAL-CHR-01','MAL-POL-01','MAL-POL-02','MAL-POL-04'],
  },
  ownerRole({
    referenceCode:'ROLE-MAL-LIQ-01',key:'liquidity-protection-owner',homeRoom:'solvency',
    policyRefs:['MAL-POL-01','MAL-POL-04','NMC-POL-03'],
  }),
  {
    referenceCode:'ROLE-AST-MGR-01',
    key:'assets-manager',
    name:'مدير بنك الأصول الاستثماري',
    kind:'bank_manager',
    homeRoom:'assets',
    reportsTo:'محافظ نماء',
    mandate:'إدارة الأصول والأهداف والاستثمار ومراجعة الخطط والفرص والانحرافات ضمن سياسة بنك الأصول.',
    accountableFor:['سلامة خطة الأصول','تقدم الأهداف','جودة الفرص الاستثمارية'],
    kpis:['تقدم الأهداف','العائد المعدل بالمخاطر','سلامة السيولة المؤهلة للاستثمار'],
    escalation:['فرصة كبيرة','تعارض هدف مع سيولة','حاجة لتغيير سياسة استثمار'],
    prohibited:['لا ينفذ شراء أو بيع','لا يضمن عائدًا','لا يغير سياسة الاستثمار منفردًا'],
    policyRefs:['AST-CHR-01','AST-POL-01','AST-POL-02','AST-POL-04'],
  },
  ownerRole({
    referenceCode:'ROLE-AST-GOAL-01',key:'goals-owner',homeRoom:'assets',
    policyRefs:['AST-POL-01','AST-POL-04','NMC-POL-03'],
  }),
  ownerRole({
    referenceCode:'ROLE-AST-INV-01',key:'investment-owner',homeRoom:'assets',
    policyRefs:['AST-POL-01','AST-POL-04','AST-REF-02','NMC-POL-05'],
  }),
  {
    referenceCode:'ROLE-HIL-MGR-01',
    key:'hilal-manager',
    name:'مدير بنك الهلال',
    kind:'bank_manager',
    homeRoom:'hilal',
    reportsTo:'محافظ نماء',
    mandate:'إدارة التمويل والانضباط والميزانية التشغيلية ضمن نطاق بنك الهلال ورفع التوصيات دون تنفيذ خارجي.',
    accountableFor:['سلامة قرارات التمويل','القدرة على السداد','انضباط التدفقات'],
    kpis:['نسبة التغطية','جودة إعادة الجدولة','انخفاض حالات الضغط غير الآمن'],
    escalation:['خطر تعثر','تمويل يضغط دورة لاحقة','حاجة لتغيير سياسة تمويل'],
    prohibited:['لا ينفذ تمويلًا خارجيًا','لا يسدد نيابة عن المستخدم','لا يتجاوز حدود القدرة على السداد'],
    policyRefs:['HIL-CHR-01','HIL-POL-01','HIL-POL-02','HIL-POL-03'],
  },
  ownerRole({
    referenceCode:'ROLE-HIL-BUD-01',key:'budget-spending-owner',homeRoom:'hilal',
    policyRefs:['HIL-POL-01','NMC-POL-03'],
  }),
  ownerRole({
    referenceCode:'ROLE-HIL-OBL-01',key:'obligations-owner',homeRoom:'hilal',
    policyRefs:['HIL-POL-03','NMC-POL-03'],
  }),
  {
    referenceCode:'ROLE-ADV-ECO-01',
    key:ECONOMIC_ADVISOR.key,
    name:ECONOMIC_ADVISOR.name,
    kind:'advisor',
    homeRoom:'advisor',
    reportsTo:'مدير بنك نماء المركزي',
    mandate:ECONOMIC_ADVISOR.mandate,
    accountableFor:['جودة التحليل الاقتصادي','اختبار السيناريوهات','تصحيح الافتراضات العابرة للجهات'],
    kpis:[...ECONOMIC_ADVISOR.kpis],
    escalation:['تغير اقتصادي جوهري','تعارض افتراضات بين جهات','مخاطر كلية على الخطة'],
    prohibited:[...ECONOMIC_ADVISOR.prohibited],
    policyRefs:['ADV-CHR-01','ADV-POL-01','ADV-POL-02'],
  },
  {
    referenceCode:'ROLE-SEC-01',
    key:'central-secretary',
    name:'أمين السر المركزي',
    kind:'secretary',
    homeRoom:'secretary',
    reportsTo:'مجلس نماء الأعلى',
    mandate:'إدارة المحاضر والسياسات والاجتماعات والإحالات والمتابعة وحفظ النسخ التاريخية.',
    accountableFor:['سلامة المحاضر','اكتمال جدول الأعمال','تتبع القرارات','حفظ الإصدارات'],
    kpis:['اكتمال المحاضر','زمن الإحالة','دقة ربط القرار بالمرجع','نسبة المتابعات المغلقة'],
    escalation:['طلب تعديل سياسة','قرار يحتاج مجلس','تأخر متابعة حوكمي'],
    prohibited:['لا يصدر قرارًا ماليًا','لا يغير سياسة مباشرة','لا ينفذ حركة مالية'],
    policyRefs:['SEC-POL-01','SEC-POL-02','SEC-POL-03'],
  },
  {
    referenceCode:'ROLE-COU-01',
    key:'namaa-council',
    name:'مجلس نماء الأعلى',
    kind:'council',
    homeRoom:'council',
    reportsTo:'المستخدم ضمن حدود الحوكمة',
    mandate:'اعتماد القرارات الكبرى والسياسات والصلاحيات والتعديلات التي تتجاوز تفويض الجهات.',
    accountableFor:['سلامة الاعتمادات العليا','جودة تغيير السياسات','فصل الواجبات','قابلية التدقيق'],
    kpis:['جودة قرارات المجلس','نسبة القرارات الموثقة','عدد التجاوزات الصفرية للقواعد الصارمة'],
    escalation:['قرار خارج الإطار الحالي','تعارض مؤسسي كبير','تغيير صلاحية أو سياسة حاكمة'],
    prohibited:['لا ينفذ أموال المستخدم','لا يلغي القواعد الصارمة','لا يغير التاريخ الحوكمي صامتًا'],
    policyRefs:['COU-POL-01','COU-POL-02','COU-POL-03','COU-POL-04'],
  },
] as const;

export function algorithmRolesForRoom(roomKey:ConversationRoomKey){
  return ALGORITHM_ROLE_REGISTRY.filter(role=>role.homeRoom===roomKey);
}

export function algorithmRoleByKey(key:string){
  return ALGORITHM_ROLE_REGISTRY.find(role=>role.key===key)??null;
}
