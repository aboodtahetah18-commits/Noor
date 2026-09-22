import type { ConversationRoomKey } from '@/lib/conversations/store';
import { CENTRAL_ACTIVE_POLICIES } from '@/content/governance/central-active-policies';

export type GovernedDocumentSection = {
  ref:string;
  title:string;
  summary:string;
};

export type GovernedDocumentRef = {
  referenceCode:string;
  title:string;
  kind:'record'|'policy'|'charter'|'contract'|'reference';
  version?:string;
  sourceUrl?:string;
  sections?:GovernedDocumentSection[];
};

export type GovernedRoomDetail = {
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

export const governedRoomDetails:Record<ConversationRoomKey,GovernedRoomDetail>={
  central:{
    roleTitle:'محافظ بنك نماء المركزي',
    entityTitle:'بنك نماء المركزي',
    responsibility:'القيادة التنفيذية العليا لنماء، الإشراف على مديري البنوك، ضمان الاتساق المؤسسي، وفض التعارضات الاستراتيجية ضمن الحوكمة.',
    observes:'جلسة التأسيس الأولى، القضايا الاستراتيجية، الخلافات والتغييرات الهيكلية وتقدم التأسيس.',
    intervention:'يتدخل في التأسيس والقرارات العابرة للبنوك والتعارضات الاستراتيجية وما يتجاوز تفويض مدير بنك نماء المركزي أو مديري البنوك.',
    avoids:'لا يدير المعاملات الروتينية بعد التأسيس، ولا يعتمد الحركة النقدية نيابة عن المستخدم.',
    governanceNote:'محافظ نماء أعلى دور تنفيذي إشرافي، بينما يقود مدير بنك نماء المركزي التشغيل اليومي للمركزي ويتابع أصحاب المسؤوليات مباشرة.',
    sourceRefs:['ROLE-GOV','حوكمة-تأسيس-٢٢'],
    records:[
      {referenceCode:'NMC-REG-01',title:'سجل القرارات التأسيسية والحالة النهائية',kind:'record',version:'v2.0',sourceUrl:'https://drive.google.com/file/d/1ry5QdRp_0dJiMasHl8toFaU_VZRTuLG1/view'},
      {referenceCode:'NMC-REG-02',title:'الرقابة والتدقيق وسجل الأثر — بنك نماء المركزي',kind:'record',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1TQ62P-prHNBxND75KgFa0KllyOl-jPgrCU5LQ6WLr54/edit'},
      {referenceCode:'NMC-REG-03',title:'اللجان والقرارات والاجتماعات — بنك نماء المركزي',kind:'record',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1oupBoVP7fe1JUR-zr46kUfqePhC6MHk-__0UkoROcrE/edit'},
      {referenceCode:'NMC-REF-01',title:'تقرير المراجعة الختامية وإغلاق بنك نماء المركزي',kind:'reference',version:'v2.0',sourceUrl:'https://drive.google.com/file/d/1buvI-zbUmyx2_z0bvm3TafN_LKPpIUWV/view'},
    ],
    policies:[
      {referenceCode:'NMC-REF-02',title:'الفهرس الرئيسي لبنك نماء المركزي',kind:'reference',version:'v2.0',sourceUrl:'https://drive.google.com/file/d/1Tp5TqMm1Heon8K9-mEXWhkr0aurQmW-z/view'},
      {referenceCode:'NMC-CONST-01',title:'دستور منصة نماء والمعمار المؤسسي والتشغيلي الأعلى',kind:'charter',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/1Vy12Q4MS-oB5Ma-8L5ynyG3WKHdTtB71d0lbiajm9Z0/edit?usp=drivesdk'},
      ...CENTRAL_ACTIVE_POLICIES.map(policy=>({referenceCode:policy.referenceCode,title:policy.title,kind:'policy' as const,version:policy.version??undefined})),
      {referenceCode:'NMC-CTR-01',title:'عقد البيانات والتكامل المركزي — بنك نماء',kind:'contract',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1DJ64l0-IMxza5ob9peP7RSpzZn7yxwqFsSYl0qreG2c/edit'},
      {referenceCode:'NMC-CHR-02',title:'ميثاق أصحاب المسؤوليات المالية والمستشار الاقتصادي',kind:'charter',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/1fXG8jJuS4_WXllyiSYcVP7unKf2jJ-s_AGRa_2xEYLA/edit'},
      {referenceCode:'NMC-REF-03',title:'تأسيس مركز العمليات والمطابقة — بنك نماء المركزي',kind:'reference',version:'v0.1',sourceUrl:'https://docs.google.com/document/d/1jtP85JWnHPHoCzRxZFOwqDhyFmRNHnCBYP-0R51fKr0/edit'},
    ]
  },
  operations:{
    roleTitle:'مركز العمليات والمطابقة',
    entityTitle:'بنك نماء المركزي',
    responsibility:'إدارة استقبال الرسائل البنكية وكشوف الحسابات والإيصالات والحركات، واستخراج بياناتها ومطابقتها ومنع التكرار وربطها بالحساب أو البطاقة والتاجر قبل التصنيف والتسوية.',
    observes:'الرسائل البنكية، كشوف الحساب، الإيصالات، المبالغ، التجار، التواريخ، الحسابات، وآخر أربعة أرقام من البطاقات عند الحاجة.',
    intervention:'عند إرسال عملية جديدة أو ظهور تعارض أو نقص يمنع المطابقة.',
    avoids:'لا ينشئ حركة مالية خارجية ولا يفترض تصنيفًا نهائيًا عند انخفاض الثقة.',
    governanceNote:'وحدة تشغيلية مستقلة داخل بنك نماء المركزي وليست مستشارًا ولا بنكًا تابعًا. وظيفتها إثبات ومطابقة وتسوية البيانات؛ لا تملك الميزانية ولا البنود. تستدعي أحد أصحاب المسؤوليات المالية الخمسة أو المستشار الاقتصادي عند الحاجة، وتوجّه الناتج للجهة المختصة.',
    sourceRefs:['دور-مركز-المطابقة','عمليات-استقبال-٢٠٩','خوارزمية-توجيه-١٦٤'],
    records:[
      {referenceCode:'OPS-REG-01',title:'الرقابة والتدقيق وسجل الأثر — بنك نماء المركزي',kind:'record',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1TQ62P-prHNBxND75KgFa0KllyOl-jPgrCU5LQ6WLr54/edit'},
    ],
    policies:[
      {referenceCode:'OPS-REF-01',title:'تأسيس مركز العمليات والمطابقة — بنك نماء المركزي',kind:'reference',version:'v0.1',sourceUrl:'https://docs.google.com/document/d/1jtP85JWnHPHoCzRxZFOwqDhyFmRNHnCBYP-0R51fKr0/edit'},
      {referenceCode:'OPS-CTR-01',title:'عقد البيانات والتكامل المركزي — بنك نماء',kind:'contract',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1DJ64l0-IMxza5ob9peP7RSpzZn7yxwqFsSYl0qreG2c/edit'},
      {referenceCode:'NMC-POL-01',title:'سياسة الحوكمة والتشغيل المركزي لبنك نماء المركزي',kind:'policy',version:'v1.0'},
      {referenceCode:'NMC-POL-05',title:'سياسة البيانات وجودتها ودرجة الثقة',kind:'policy',version:'v1.0'},
      {referenceCode:'NMC-POL-07',title:'سياسة التنفيذ البشري والإثبات والمتابعة',kind:'policy',version:'v1.0'},
    ],
  },
  solvency:{
    roleTitle:'مدير بنك ملاءة',
    entityTitle:'بنك ملاءة',
    responsibility:'تقييم الحاجات غير التشغيلية الكبيرة أو الطارئة أو الجسرية، ودعم المؤسسات ومقارنة بدائل الدفع والتمويل.',
    observes:'سيولة ملاءة، الحالات المحالة، بدائل التمويل والدفع.',
    intervention:'عند حاجة ضمن اختصاص ملاءة، أو دعم مؤسسي، أو قرار مهم أو رفض أو اعتراض.',
    avoids:'لا يتدخل في المصروفات اليومية العادية التي تخص التشغيل المعتاد.',
    governanceNote:'يعتمد العرض المؤسسي ضمن السياسة، لا الحركة النقدية الفعلية للمستخدم.',
    sourceRefs:['ROLE-MAL-MGR','ENTITY-MAL'],
    records:[],
    policies:[
      {referenceCode:'MAL-CHR-01',title:'ميثاق وتشغيل بنك ملاءة',kind:'charter',sourceUrl:'https://docs.google.com/document/d/1rtRYHnMxMp7u62InuJm9dqiAORkPkGBk-oFJL3K1rw8/edit'},
      {referenceCode:'MAL-POL-01',title:'سياسة الحماية والسيولة والطوارئ لبنك ملاءة',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1qoFG-CIdd003DvGqqyccpkf1TGJ-29pOItYBtpciSfc/edit'},
      {referenceCode:'MAL-POL-02',title:'دليل الوكلاء ومصفوفة الصلاحيات لبنك ملاءة',kind:'policy',sourceUrl:'https://docs.google.com/document/d/11Z_DtA8vJQqZ02xC4CWu1oGsFBLApZhGWVWjra8-9lA/edit'},
      {referenceCode:'MAL-REF-01',title:'دليل العمليات والآليات والخوارزميات التشغيلية لبنك ملاءة',kind:'reference',sourceUrl:'https://docs.google.com/document/d/1armGZRtKTfoIDcwbJ5t1K9LEjNPnNyES7CdD4vvEOiI/edit'},
      {referenceCode:'MAL-POL-03',title:'سياسة التعلم والتغيير والتدقيق لبنك ملاءة',kind:'policy',sourceUrl:'https://docs.google.com/document/d/10qY_ADXVjbm1_BRrTRlwCSCM2p1SBos3jztpaHOKaXI/edit'},
      {referenceCode:'MAL-POL-04',title:'سياسة رأس مال الحماية والاحتياطي المستثمر لبنك ملاءة',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1_fGVfq_HJnf5lg9FmsNyet59IBOAWFPCrVqtUFNx9IA/edit'},
    ],
  },
  assets:{
    roleTitle:'مدير بنك الأصول الاستثماري',
    entityTitle:'بنك الأصول الاستثماري',
    responsibility:'إدارة التخطيط الرأسمالي والأهداف المتوسطة والطويلة والفرص الاستثمارية والمتابعة الشهرية لمسار الأهداف.',
    observes:'الأهداف، التقدم الشهري، الأصول والاستثمارات.',
    intervention:'عند إنشاء هدف أو انحراف عن المسار أو فرصة أو خطر استثماري أو اجتماع ذي صلة.',
    avoids:'لا يتدخل في الحركات اليومية غير المرتبطة بالأهداف أو الأصول.',
    governanceNote:'يعتمد الخطة المؤسسية لا تنفيذ الاستثمار النقدي الفعلي.',
    sourceRefs:['ROLE-AI-MGR'],
    records:[],
    policies:[
      {referenceCode:'AST-CHR-01',title:'ميثاق وتشغيل بنك الأصول الاستثماري',kind:'charter',sourceUrl:'https://docs.google.com/document/d/1Vg-RrBMLCwFYlWBOTsnwv5C9tWOKw-6IuGX7X3hhgnw/edit'},
      {referenceCode:'AST-POL-01',title:'السياسة المالية والاستثمارية الشاملة لبنك الأصول',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1uDE3kINPLykYKjtxZEpgn-TG1qkgOFjeRuUlioWxGjc/edit'},
      {referenceCode:'AST-POL-02',title:'دليل الوكلاء ومصفوفة الصلاحيات لبنك الأصول',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1S91uTKPX3fS9MXAM9DohWjf3oFG2pa_3MEfi48AlXd0/edit'},
      {referenceCode:'AST-REF-01',title:'دليل العمليات والآليات والخوارزميات التشغيلية لبنك الأصول',kind:'reference',sourceUrl:'https://docs.google.com/document/d/1R-MmR_a7kW1EdaIhA98btwfebpyD2w4sRV6RegHCUTo/edit'},
      {referenceCode:'AST-POL-03',title:'سياسة التعلم والتغيير والتدقيق لبنك الأصول',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1PWd0l_KxshiS26kZ2pRClT1WgJCfWJbJ2U6qs-R3NWo/edit'},
      {referenceCode:'AST-POL-04',title:'سياسة رأس المال المؤهل والتوزيع الاستراتيجي لبنك الأصول',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1z8D2uiGW5dEi4fiI3hyjUS0p_NFk8u4eJ6duOj_wiK8/edit'},
      {referenceCode:'AST-REF-02',title:'آليات تحليل الفرص الاستثمارية',kind:'reference',sourceUrl:'https://docs.google.com/document/d/1yUKPCHoFdHkcU_jxGX1-0T0hn8rytDCSEgz8RIHlnak/edit'},
    ],
  },
  hilal:{
    roleTitle:'مدير بنك الهلال',
    entityTitle:'بنك الهلال',
    responsibility:'التمويل التشغيلي والاكتتاب والتسعير الديناميكي وإدارة محفظة التمويل.',
    observes:'محفظة الهلال، البنود، السيولة والقدرة على السداد.',
    intervention:'عند شرح عرض أو رفض أو إعادة جدولة، أو عند ضغط التمويل على النطاقات الآمنة.',
    avoids:'لا يتدخل في العمليات الاعتيادية المتوافقة مع السياسة.',
    governanceNote:'يعتمد العرض المؤسسي لا التنفيذ النقدي، ولا يستخدم حدودًا رقمية ثابتة غير معتمدة.',
    sourceRefs:['ROLE-HL'],
    records:[],
    policies:[
      {referenceCode:'HIL-CHR-01',title:'ميثاق وتشغيل بنك الهلال',kind:'charter',sourceUrl:'https://docs.google.com/document/d/1Z1cnyyVmym1VDGU6ZSFakMIBznUvKPiVr4fuvctkJyo/edit'},
      {referenceCode:'HIL-POL-01',title:'سياسة الميزانية والإنفاق والتدفقات النقدية لبنك الهلال',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1YoWUyS1AgqWAZcnAd-HzD3WvG35_aQfbQL5H8oBTmYA/edit'},
      {referenceCode:'HIL-POL-02',title:'دليل الوكلاء ومصفوفة الصلاحيات لبنك الهلال',kind:'policy',sourceUrl:'https://docs.google.com/document/d/13TXLBG8Axn862QQZ51yzYfwjVhQbPlNUFEaA3DccbN4/edit'},
      {referenceCode:'HIL-REF-01',title:'دليل العمليات والآليات والخوارزميات التشغيلية لبنك الهلال',kind:'reference',sourceUrl:'https://docs.google.com/document/d/182x3t6eGfqFed9j3mNUKsgjJmFPNnOHLUPNzGgcUKEE/edit'},
      {referenceCode:'HIL-POL-03',title:'سياسة التمويل الداخلي والائتمان والسداد لبنك الهلال',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1aNBxa_NH4CjXRcEUkm8Mm8t5Iv3nakGHvZO8SD5inQg/edit'},
      {referenceCode:'HIL-POL-04',title:'سياسة التعلم والتغيير والتدقيق لبنك الهلال',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1N60Gvu8gYueP5cJ2aA0uZbv-9z3z7_9B9ZX2bW3MKZU/edit'},
    ],
  },
  advisor:{
    roleTitle:'المستشار الاقتصادي',
    entityTitle:'المستشار الاقتصادي',
    responsibility:'تحليل الصورة الاقتصادية الشخصية الكلية: الدخل والاتجاهات والاستقرار والتوقعات والتضخم الشخصي.',
    observes:'الدخل، الاتجاهات، التضخم الشخصي، الدورة والاستقرار العام.',
    intervention:'عند تغير دخل أو اتجاه جوهري، أو قضية متعددة المجالات، أو عند طلب رأيه مباشرة.',
    avoids:'لا يدير تفاصيل كل بند يوميًا إذا لم تمس الصورة الكلية.',
    governanceNote:'دوره استشاري، ولا يعتمد حركة نقدية.',
    sourceRefs:['ROLE-EA'],
    records:[],
    policies:[
      {referenceCode:'ADV-CHR-01',title:'ميثاق أصحاب المسؤوليات المالية والمستشار الاقتصادي',kind:'charter',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/1fXG8jJuS4_WXllyiSYcVP7unKf2jJ-s_AGRa_2xEYLA/edit'},
      {referenceCode:'NMC-POL-06',title:'سياسة التعلم الخوارزمي والذاكرة المالية',kind:'policy',version:'v1.0'},
      {referenceCode:'NMC-POL-04',title:'سياسة المخاطر المركزية والتحليل الاستباقي',kind:'policy',version:'v1.0'},
    ],
  },
  secretary:{
    roleTitle:'أمين السر المركزي',
    entityTitle:'مجلس نماء الأعلى واللجان',
    responsibility:'إدارة المحاضر، جداول الأعمال، ملفات الاجتماعات، استرجاع السياسات والصلاحيات، وفتح طلبات المراجعة والمتابعة.',
    observes:'المحاضر والسياسات والإصدارات والقرارات والإجراءات والمواعيد.',
    intervention:'عند طلب سياسة أو محضر أو اجتماع أو متابعة قضية أو تعديل قاعدة.',
    avoids:'لا يصدر قرارًا ماليًا ولا يغيّر سياسة حاكمة مباشرة.',
    governanceNote:'هو المدخل الحواري لمركز الحوكمة والاجتماعات، مع حفظ النسخ التاريخية والتعديلات الرسمية.',
    sourceRefs:['دور-أمين-السر','حوكمة-عرض-٢١١','حوكمة-مراجعة-٢١٢'],
    records:[
      {referenceCode:'SEC-REG-01',title:'اللجان والقرارات والاجتماعات — بنك نماء المركزي',kind:'record',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1oupBoVP7fe1JUR-zr46kUfqePhC6MHk-__0UkoROcrE/edit'},
      {referenceCode:'SEC-REG-02',title:'الرقابة والتدقيق وسجل الأثر — بنك نماء المركزي',kind:'record',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1TQ62P-prHNBxND75KgFa0KllyOl-jPgrCU5LQ6WLr54/edit'},
    ],
    policies:[
      {referenceCode:'NMC-POL-08',title:'سياسة إدارة السياسات واللوائح والتغيير المؤسسي',kind:'policy',version:'v1.0'},
      {referenceCode:'NMC-POL-02',title:'سياسة الصلاحيات والتفويض والتصعيد لبنك نماء المركزي',kind:'policy',version:'v1.0'},
    ],
  },
  council:{
    roleTitle:'مجلس نماء الأعلى',
    entityTitle:'مجلس نماء الأعلى',
    responsibility:'البت في القرارات الكبرى والنهائية، والإشراف على اللجان، واعتماد التوجهات العليا، وحسم القضايا التي تتجاوز صلاحيات اللجان.',
    observes:'تقارير اللجان والقضايا الكبرى.',
    intervention:'عند القضايا المصعدة التي تحتاج قرارًا أعلى متعدد التخصصات.',
    avoids:'لا يحل محل البنوك أو المستشارين في التشغيل اليومي.',
    governanceNote:'يرأسه المحافظ، والاعتماد المؤسسي يبقى ضمن Hard Guards، والتنفيذ المالي الفعلي يبقى بحسب صلاحيات المستخدم.',
    sourceRefs:['ENTITY-COUNCIL','ROLE-CHAIR'],
    records:[],
    policies:[
      {referenceCode:'NMC-POL-08',title:'سياسة إدارة السياسات واللوائح والتغيير المؤسسي',kind:'policy',version:'v1.0'},
      {referenceCode:'NMC-POL-02',title:'سياسة الصلاحيات والتفويض والتصعيد لبنك نماء المركزي',kind:'policy',version:'v1.0'},
      {referenceCode:'NMC-POL-03',title:'سياسة القرار المالي المركزي وإدارة التعارضات',kind:'policy',version:'v1.0'},
    ],
  },
};
