import type { ConversationRoomKey } from '@/lib/conversations/store';

export type GovernedDocumentRef = {
  title:string;
  kind:'record'|'policy'|'charter'|'contract'|'reference';
  version?:string;
  sourceUrl?:string;
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
    roleTitle:'محافظ البنك المركزي',
    entityTitle:'بنك نماء المركزي',
    responsibility:'قيادة التعارف الأول للمستخدم، والقرارات الثقيلة، والوساطة عند تعارض التوصيات، وتطوير الإطار المركزي.',
    observes:'جلسة التأسيس الأولى، القضايا الاستراتيجية، الخلافات والتغييرات الهيكلية وتقدم التأسيس.',
    intervention:'يبدأ مع المستخدم الجديد، ويسأل سؤالًا رئيسيًا واحدًا في كل مرة، ويتدخل لاحقًا عند الحاجة لحكم أو وساطة أو ترجيح أو استشارة عليا.',
    avoids:'لا يدير المعاملات الروتينية بعد التأسيس، ولا يعتمد الحركة النقدية نيابة عن المستخدم.',
    governanceNote:'هو الواجهة البشرية الخوارزمية الأولى للمستخدم الجديد، ويستخدم المعلومات الموثوقة الموجودة بدل إعادة السؤال عنها.',
    sourceRefs:['ROLE-GOV','حوكمة-تأسيس-٢٢'],
    records:[
      {title:'سجل القرارات التأسيسية والحالة النهائية',kind:'record',version:'v2.0',sourceUrl:'https://drive.google.com/file/d/1ry5QdRp_0dJiMasHl8toFaU_VZRTuLG1/view'},
      {title:'الرقابة والتدقيق وسجل الأثر — بنك نماء المركزي',kind:'record',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1TQ62P-prHNBxND75KgFa0KllyOl-jPgrCU5LQ6WLr54/edit'},
      {title:'اللجان والقرارات والاجتماعات — بنك نماء المركزي',kind:'record',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1oupBoVP7fe1JUR-zr46kUfqePhC6MHk-__0UkoROcrE/edit'},
      {title:'تقرير المراجعة الختامية وإغلاق بنك نماء المركزي',kind:'reference',version:'v2.0',sourceUrl:'https://drive.google.com/file/d/1buvI-zbUmyx2_z0bvm3TafN_LKPpIUWV/view'},
    ],
    policies:[
      {title:'الفهرس الرئيسي لبنك نماء المركزي',kind:'reference',version:'v2.0',sourceUrl:'https://drive.google.com/file/d/1Tp5TqMm1Heon8K9-mEXWhkr0aurQmW-z/view'},
      {title:'الميثاق والتعريف المؤسسي — بنك نماء المركزي',kind:'charter',version:'v1.0',sourceUrl:'https://drive.google.com/file/d/10kB1PC7OYChjf6JFWpFBIL51ST-grmQi/view'},
      {title:'الهيكل التنظيمي والأدوار — بنك نماء المركزي',kind:'policy',version:'v1.0',sourceUrl:'https://drive.google.com/file/d/1XZbSjriEZ5ZZLqrlbcBfQMF5t_z0GVwj/view'},
      {title:'مصفوفة الصلاحيات والاعتمادات — بنك نماء المركزي',kind:'policy',version:'v2.1',sourceUrl:'https://docs.google.com/document/d/1xWd9s7-V-QFV13RPYJd_tW17dAGjB4Fh3Bh0LBS837o/edit'},
      {title:'السياسة المالية العليا — بنك نماء المركزي',kind:'policy',version:'v1.0',sourceUrl:'https://drive.google.com/file/d/1abH_UMUKWS7h2-HEVHL1yv0tEZTZUddC/view'},
      {title:'محرك القرار والخوارزميات — بنك نماء المركزي',kind:'policy',version:'v1.0',sourceUrl:'https://drive.google.com/file/d/1EPSUgX7WMZgdZJ_gnxcrd6LBWf8rVwdo/view'},
      {title:'الأوزان والتقييم والمخاطر — بنك نماء المركزي',kind:'policy',version:'v1.0',sourceUrl:'https://drive.google.com/file/d/1AEmEiMTZn5wra2tjDYartHyi7XcOg8do/view'},
      {title:'العلاقة مع البنوك والمحافظ والمستشارين — بنك نماء المركزي',kind:'policy',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1V1396IeCZCdg9pmIXeiTgvmyBJtKSmuwbnB7Y7f7Ueg/edit'},
      {title:'حالات التشغيل والسيناريوهات — بنك نماء المركزي',kind:'policy',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1wuAboukFuAzffWgtsAsz7H0EZkyK61NBaSbLzOSTyIA/edit'},
      {title:'عقد البيانات والتكامل المركزي — بنك نماء',kind:'contract',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1DJ64l0-IMxza5ob9peP7RSpzZn7yxwqFsSYl0qreG2c/edit'},
      {title:'قاعدة التنفيذ البشري والإثبات — بنك نماء المركزي',kind:'policy',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/1tyC2VNP4RbDs1cNbuocBMAdMDsAPZ1BW1jc-Hl9f5lo/edit'},
      {title:'ميثاق أصحاب المسؤوليات المالية والمستشار الاقتصادي',kind:'charter',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/1fXG8jJuS4_WXllyiSYcVP7unKf2jJ-s_AGRa_2xEYLA/edit'},
      {title:'تأسيس مركز العمليات والمطابقة — بنك نماء المركزي',kind:'reference',version:'v0.1',sourceUrl:'https://docs.google.com/document/d/1jtP85JWnHPHoCzRxZFOwqDhyFmRNHnCBYP-0R51fKr0/edit'},
    ],
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
      {title:'الرقابة والتدقيق وسجل الأثر — بنك نماء المركزي',kind:'record',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1TQ62P-prHNBxND75KgFa0KllyOl-jPgrCU5LQ6WLr54/edit'},
    ],
    policies:[
      {title:'تأسيس مركز العمليات والمطابقة — بنك نماء المركزي',kind:'reference',version:'v0.1',sourceUrl:'https://docs.google.com/document/d/1jtP85JWnHPHoCzRxZFOwqDhyFmRNHnCBYP-0R51fKr0/edit'},
      {title:'عقد البيانات والتكامل المركزي — بنك نماء',kind:'contract',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1DJ64l0-IMxza5ob9peP7RSpzZn7yxwqFsSYl0qreG2c/edit'},
      {title:'العلاقة مع البنوك والمحافظ والمستشارين — بنك نماء المركزي',kind:'policy',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1V1396IeCZCdg9pmIXeiTgvmyBJtKSmuwbnB7Y7f7Ueg/edit'},
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
      {title:'ميثاق وتشغيل بنك ملاءة',kind:'charter',sourceUrl:'https://docs.google.com/document/d/1rtRYHnMxMp7u62InuJm9dqiAORkPkGBk-oFJL3K1rw8/edit'},
      {title:'سياسة الحماية والسيولة والطوارئ لبنك ملاءة',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1qoFG-CIdd003DvGqqyccpkf1TGJ-29pOItYBtpciSfc/edit'},
      {title:'دليل الوكلاء ومصفوفة الصلاحيات لبنك ملاءة',kind:'policy',sourceUrl:'https://docs.google.com/document/d/11Z_DtA8vJQqZ02xC4CWu1oGsFBLApZhGWVWjra8-9lA/edit'},
      {title:'دليل العمليات والآليات والخوارزميات التشغيلية لبنك ملاءة',kind:'reference',sourceUrl:'https://docs.google.com/document/d/1armGZRtKTfoIDcwbJ5t1K9LEjNPnNyES7CdD4vvEOiI/edit'},
      {title:'سياسة التعلم والتغيير والتدقيق لبنك ملاءة',kind:'policy',sourceUrl:'https://docs.google.com/document/d/10qY_ADXVjbm1_BRrTRlwCSCM2p1SBos3jztpaHOKaXI/edit'},
      {title:'سياسة رأس مال الحماية والاحتياطي المستثمر لبنك ملاءة',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1_fGVfq_HJnf5lg9FmsNyet59IBOAWFPCrVqtUFNx9IA/edit'},
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
      {title:'ميثاق وتشغيل بنك الأصول الاستثماري',kind:'charter',sourceUrl:'https://docs.google.com/document/d/1Vg-RrBMLCwFYlWBOTsnwv5C9tWOKw-6IuGX7X3hhgnw/edit'},
      {title:'السياسة المالية والاستثمارية الشاملة لبنك الأصول',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1uDE3kINPLykYKjtxZEpgn-TG1qkgOFjeRuUlioWxGjc/edit'},
      {title:'دليل الوكلاء ومصفوفة الصلاحيات لبنك الأصول',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1S91uTKPX3fS9MXAM9DohWjf3oFG2pa_3MEfi48AlXd0/edit'},
      {title:'دليل العمليات والآليات والخوارزميات التشغيلية لبنك الأصول',kind:'reference',sourceUrl:'https://docs.google.com/document/d/1R-MmR_a7kW1EdaIhA98btwfebpyD2w4sRV6RegHCUTo/edit'},
      {title:'سياسة التعلم والتغيير والتدقيق لبنك الأصول',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1PWd0l_KxshiS26kZ2pRClT1WgJCfWJbJ2U6qs-R3NWo/edit'},
      {title:'سياسة رأس المال المؤهل والتوزيع الاستراتيجي لبنك الأصول',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1z8D2uiGW5dEi4fiI3hyjUS0p_NFk8u4eJ6duOj_wiK8/edit'},
      {title:'آليات تحليل الفرص الاستثمارية',kind:'reference',sourceUrl:'https://docs.google.com/document/d/1yUKPCHoFdHkcU_jxGX1-0T0hn8rytDCSEgz8RIHlnak/edit'},
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
      {title:'ميثاق وتشغيل بنك الهلال',kind:'charter',sourceUrl:'https://docs.google.com/document/d/1Z1cnyyVmym1VDGU6ZSFakMIBznUvKPiVr4fuvctkJyo/edit'},
      {title:'سياسة الميزانية والإنفاق والتدفقات النقدية لبنك الهلال',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1YoWUyS1AgqWAZcnAd-HzD3WvG35_aQfbQL5H8oBTmYA/edit'},
      {title:'دليل الوكلاء ومصفوفة الصلاحيات لبنك الهلال',kind:'policy',sourceUrl:'https://docs.google.com/document/d/13TXLBG8Axn862QQZ51yzYfwjVhQbPlNUFEaA3DccbN4/edit'},
      {title:'دليل العمليات والآليات والخوارزميات التشغيلية لبنك الهلال',kind:'reference',sourceUrl:'https://docs.google.com/document/d/182x3t6eGfqFed9j3mNUKsgjJmFPNnOHLUPNzGgcUKEE/edit'},
      {title:'سياسة التمويل الداخلي والائتمان والسداد لبنك الهلال',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1aNBxa_NH4CjXRcEUkm8Mm8t5Iv3nakGHvZO8SD5inQg/edit'},
      {title:'سياسة التعلم والتغيير والتدقيق لبنك الهلال',kind:'policy',sourceUrl:'https://docs.google.com/document/d/1N60Gvu8gYueP5cJ2aA0uZbv-9z3z7_9B9ZX2bW3MKZU/edit'},
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
      {title:'ميثاق أصحاب المسؤوليات المالية والمستشار الاقتصادي',kind:'charter',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/1fXG8jJuS4_WXllyiSYcVP7unKf2jJ-s_AGRa_2xEYLA/edit'},
      {title:'سياسة التعلم الخوارزمي والقرار القابل للتدقيق لمنصة نماء',kind:'policy',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/1wOVhGfO9Pp0LrWF_ZRco0oGG53jpSLOyQjRlZnFqgOQ/edit'},
      {title:'الأوزان والتقييم والمخاطر — بنك نماء المركزي',kind:'policy',version:'v1.0',sourceUrl:'https://drive.google.com/file/d/1AEmEiMTZn5wra2tjDYartHyi7XcOg8do/view'},
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
      {title:'اللجان والقرارات والاجتماعات — بنك نماء المركزي',kind:'record',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1oupBoVP7fe1JUR-zr46kUfqePhC6MHk-__0UkoROcrE/edit'},
      {title:'الرقابة والتدقيق وسجل الأثر — بنك نماء المركزي',kind:'record',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1TQ62P-prHNBxND75KgFa0KllyOl-jPgrCU5LQ6WLr54/edit'},
    ],
    policies:[
      {title:'السياسة المركزية لإدارة القضايا والاجتماعات والقرارات والمتابعة',kind:'policy',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/10GeX1j4W9gHt3BJLjzFkSJ0oftWsJIpPneZx8AcCYu8/edit'},
      {title:'قاعدة جدولة اللجان والمداولة الحية',kind:'policy',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/1M0709DYbrun3IRY300y6JMFxWPXzXRo_nSeNfpIGA6w/edit'},
      {title:'مصفوفة الصلاحيات والاعتمادات — بنك نماء المركزي',kind:'policy',version:'v2.1',sourceUrl:'https://docs.google.com/document/d/1xWd9s7-V-QFV13RPYJd_tW17dAGjB4Fh3Bh0LBS837o/edit'},
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
      {title:'السياسة المركزية لإدارة القضايا والاجتماعات والقرارات والمتابعة',kind:'policy',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/10GeX1j4W9gHt3BJLjzFkSJ0oftWsJIpPneZx8AcCYu8/edit'},
      {title:'قاعدة جدولة اللجان والمداولة الحية',kind:'policy',version:'v1.0',sourceUrl:'https://docs.google.com/document/d/1M0709DYbrun3IRY300y6JMFxWPXzXRo_nSeNfpIGA6w/edit'},
      {title:'السياسة المالية العليا — بنك نماء المركزي',kind:'policy',version:'v1.0',sourceUrl:'https://drive.google.com/file/d/1abH_UMUKWS7h2-HEVHL1yv0tEZTZUddC/view'},
      {title:'اللجان والقرارات والاجتماعات — بنك نماء المركزي',kind:'policy',version:'v1.1',sourceUrl:'https://docs.google.com/document/d/1oupBoVP7fe1JUR-zr46kUfqePhC6MHk-__0UkoROcrE/edit'},
    ],
  },
};
