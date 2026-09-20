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
    records:[{title:"سجل الرسائل والحركات المستلمة",kind:'record'},{title:"سجل المطابقات والتعارضات",kind:'record'},{title:"سجل التسويات والتصحيحات",kind:'record'}],
    policies:[{title:"سياسة المطابقة والتسوية",kind:'policy'},{title:"سياسة التحقق من الرسائل وكشوف الحساب",kind:'policy'},{title:"سياسة أقل صلاحية والوصول للبيانات",kind:'policy'}],
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
    records:[{title:"سجل الاحتياط والحماية",kind:'record'},{title:"سجل حالات الطوارئ",kind:'record'},{title:"سجل طلبات الاستثناء",kind:'record'}],
    policies:[{title:"سياسة الحماية والاحتياط",kind:'policy'},{title:"سياسة السيولة المحمية",kind:'policy'},{title:"ضوابط الطوارئ والاستمرارية",kind:'policy'}],
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
    records:[{title:"سجل الأصول",kind:'record'},{title:"سجل الفرص الاستثمارية",kind:'record'},{title:"سجل قرارات التخصيص والتسييل",kind:'record'}],
    policies:[{title:"سياسة الاستثمار والأصول",kind:'policy'},{title:"سياسة تقييم الفرص",kind:'policy'},{title:"سياسة التسييل والسيولة الاستثمارية",kind:'policy'}],
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
    records:[{title:"سجل طلبات التمويل",kind:'record'},{title:"سجل العروض والقرارات",kind:'record'},{title:"سجل الأقساط وإعادة الجدولة",kind:'record'}],
    policies:[{title:"سياسة التمويل",kind:'policy'},{title:"ضوابط القدرة على السداد",kind:'policy'},{title:"سياسة إعادة الجدولة",kind:'policy'}],
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
    records:[{title:"سجل التحليلات الاقتصادية",kind:'record'},{title:"سجل السيناريوهات",kind:'record'},{title:"سجل تنبيهات الاتجاه",kind:'record'}],
    policies:[{title:"ميثاق أصحاب المسؤوليات المالية والمستشار الاقتصادي",kind:'policy'},{title:"سياسة استخدام الافتراضات الاقتصادية",kind:'policy'},{title:"ضوابط الرأي الاستشاري",kind:'policy'}],
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
    records:[{title:"سجل المحاضر",kind:'record'},{title:"سجل القرارات والاعتمادات",kind:'record'},{title:"سجل المتابعة والإجراءات",kind:'record'}],
    policies:[{title:"سياسة إدارة الاجتماعات",kind:'policy'},{title:"سياسة الإصدارات والسجلات",kind:'policy'},{title:"مصفوفة الصلاحيات",kind:'policy'}],
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
    records:[{title:"سجل قرارات المجلس",kind:'record'},{title:"سجل إحالات اللجان",kind:'record'},{title:"سجل الاعتمادات العليا",kind:'record'}],
    policies:[{title:"ميثاق مجلس نماء الأعلى",kind:'policy'},{title:"السياسة المالية العليا",kind:'policy'},{title:"سياسة اللجان والقرارات والاجتماعات",kind:'policy'}],
  },
};
