export type ExtendedProfileField={
  key:string;
  label:string;
  placeholder?:string;
  kind?:'text'|'number'|'date'|'textarea'|'select';
  options?:string[];
};
export type ExtendedProfileTableColumn={
  key:string;
  label:string;
  kind?:'text'|'number'|'select'|'date'|'textarea';
  options?:string[];
  mobileVisible?:boolean;
  placeholder?:string;
};
export type ExtendedProfileSection={
  key:string;
  title:string;
  summary:string;
  fields:ExtendedProfileField[];
  hiddenByDefault?:boolean;
  table?:{
    addLabel:string;
    emptyLabel:string;
    columns:ExtendedProfileTableColumn[];
    categoryOptions?:string[];
    allowCustomCategory?:boolean;
  };
};

export const extendedProfileSections:ExtendedProfileSection[]=[
  {
    key:'bills',
    title:'الفواتير',
    summary:'سجل الفواتير التي تسددها فعليًا. أدخل قيمة الفاتورة نفسها ودورية الاستحقاق، وليس متوسطًا تقديريًا.',
    fields:[],
    table:{
      addLabel:'إضافة فاتورة',
      emptyLabel:'لا توجد فواتير مسجلة بعد.',
      columns:[
        {key:'name',label:'الفاتورة',mobileVisible:true},
        {key:'amount',label:'القيمة',kind:'number',mobileVisible:true},
        {key:'recurrence',label:'الدورية',kind:'select',options:['شهري','كل شهرين','ربع سنوي','نصف سنوي','سنوي','حسب الاستهلاك','أخرى']},
        {key:'due_day',label:'يوم الاستحقاق',kind:'number'},
      ],
    },
  },
  {
    key:'subscriptions',
    title:'الاشتراكات',
    summary:'سجل كل اشتراك متكرر كمبلغ مستقل، مع دورية السداد.',
    fields:[],
    table:{
      addLabel:'إضافة اشتراك',
      emptyLabel:'لا توجد اشتراكات مسجلة بعد.',
      columns:[
        {key:'name',label:'الاشتراك',mobileVisible:true},
        {key:'amount',label:'القيمة',kind:'number',mobileVisible:true},
        {key:'recurrence',label:'الدورية',kind:'select',options:['شهري','ربع سنوي','نصف سنوي','سنوي','أخرى']},
        {key:'due_day',label:'يوم الاستحقاق',kind:'number'},
      ],
    },
  },
  {
    key:'housing_details',
    title:'السكن والمرافق',
    summary:'تفاصيل السكن والفواتير والصيانة التي تؤثر على الميزانية والسيولة.',
    fields:[
      {key:'housing_type',label:'نوع السكن',kind:'select',options:['ملك','إيجار','مع العائلة','سكن جهة العمل','غير ذلك']},
      {key:'monthly_housing_cost',label:'التكلفة الشهرية الفعلية',kind:'number'},
      {key:'maintenance_notes',label:'صيانة أو إصلاحات معروفة قادمة',kind:'textarea'},
    ],
  },
  {
    key:'vehicle_details',
    title:'بيانات المركبات',
    summary:'أضف كل مركبة مرة واحدة، ثم عدّلها أو احذفها من الجدول عند الحاجة.',
    fields:[],
    table:{
      addLabel:'إضافة مركبة',
      emptyLabel:'لا توجد مركبات مسجلة بعد.',
      columns:[
        {key:'vehicle_name',label:'اسم السيارة',mobileVisible:true},
        {key:'vehicle_make',label:'الشركة'},
        {key:'vehicle_year',label:'سنة الصنع',kind:'number',mobileVisible:true},
        {key:'ownership',label:'الملكية',kind:'select',options:['مملوكة','تمويل','إيجار','جهة العمل','أخرى']},
        {key:'monthly_distance',label:'المسافة الشهرية كم',kind:'number'},
        {key:'fuel_type',label:'نوع الطاقة',kind:'select',options:['بنزين','ديزل','كهرباء','هجين','أخرى']},
        {key:'efficiency_notes',label:'الكفاءة أو الاستهلاك'},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
      ],
    },
  },
  {
    key:'vehicle_maintenance',
    title:'الصيانة الدورية',
    summary:'سجل الزيت والفلاتر والإطارات وأي صيانة دورية أو قادمة على المركبات.',
    fields:[],
    table:{
      addLabel:'إضافة صيانة',
      emptyLabel:'لا توجد أعمال صيانة مسجلة بعد.',
      columns:[
        {key:'name',label:'الصيانة',mobileVisible:true},
        {key:'vehicle',label:'المركبة'},
        {key:'amount',label:'القيمة',kind:'number',mobileVisible:true},
        {key:'recurrence',label:'الدورية',kind:'select',options:['شهري','كل 3 أشهر','كل 6 أشهر','سنوي','حسب الكيلومترات','عند الحاجة']},
        {key:'due_day',label:'يوم الاستحقاق',kind:'number'},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
      ],
    },
  },
  {
    key:'vehicle_expenses',
    title:'إلزامات ومصاريف المركبة',
    summary:'التأمين، الاستمارة، الرخصة، الإطارات، والفحوصات أو أي التزام معروف للمركبة.',
    fields:[],
    table:{
      addLabel:'إضافة إلزام للمركبة',
      emptyLabel:'لا توجد إلزامات مركبة مسجلة بعد.',
      columns:[
        {key:'name',label:'الإلزام',mobileVisible:true},
        {key:'vehicle',label:'المركبة'},
        {key:'amount',label:'القيمة',kind:'number',mobileVisible:true},
        {key:'recurrence',label:'الدورية',kind:'select',options:['شهري','ربع سنوي','نصف سنوي','سنوي','كل سنتين','عند الحاجة']},
        {key:'due_day',label:'يوم الاستحقاق',kind:'number'},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
      ],
    },
  },
  {
    key:'travel_profile',
    hiddenByDefault:true,
    title:'الرحلات والسفر',
    summary:'نمط الرحلات والتكاليف والحجوزات والعملة دون اعتبار الخطة التزامًا قبل ثبوتها.',
    fields:[
      {key:'trip_purpose',label:'الغرض أو نوع الرحلة'},
      {key:'destination',label:'الوجهة'},
      {key:'start_date',label:'تاريخ البداية إن عرف',kind:'date'},
      {key:'end_date',label:'تاريخ النهاية إن عرف',kind:'date'},
      {key:'travelers',label:'عدد المسافرين الذين تتحمل تكلفتهم',kind:'number'},
      {key:'transport',label:'وسيلة النقل'},
      {key:'lodging_notes',label:'السكن أو الحجز',kind:'textarea'},
      {key:'budget_notes',label:'ميزانية أو تكاليف معروفة',kind:'textarea'},
      {key:'currency',label:'عملة الإنفاق إن كانت مختلفة'},
    ],
  },
  {
    key:'budget_behavior',
    title:'سلوك بنود الميزانية',
    summary:'أضف كل بند مرة واحدة. البنود التي تم تسجيلها تختفي من قائمة الاختيار، ويمكنك إنشاء بند جديد عبر «أخرى».',
    fields:[],
    table:{
      addLabel:'إضافة بند',
      emptyLabel:'ابدأ بأول بند من سلوكك الفعلي.',
      categoryOptions:['المطاعم','المقاهي','البقالة','الاتصالات','الترفيه','العناية الشخصية','الهدايا والمناسبات','الملابس','التوصيل','أخرى'],
      allowCustomCategory:true,
      columns:[
        {key:'category',label:'البند',kind:'select',mobileVisible:true},
        {key:'custom_category',label:'اسم البند الجديد'},
        {key:'frequency',label:'التكرار',placeholder:'مثال: 4 مرات شهريًا'},
        {key:'average_amount',label:'متوسط العملية',kind:'number',mobileVisible:true},
        {key:'monthly_limit',label:'الحد الشهري إن وجد',kind:'number'},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
      ],
    },
  },
  {
    key:'health_education_family',
    title:'الصحة والتعليم والأسرة',
    summary:'أضف المصروفات الصحية والتعليمية والتدريبية ودعم الأسرة كمصروفات مستقلة قابلة للتعديل.',
    fields:[],
    table:{
      addLabel:'إضافة مصروف',
      emptyLabel:'لا توجد مصروفات صحية أو تعليمية أو أسرية مسجلة بعد.',
      columns:[
        {key:'category',label:'النوع',kind:'select',options:['صحة','تأمين صحي','تعليم','دورة أو تدريب','دعم الأب أو الأم','مصروف أسري','مصاريف أطفال','أخرى'],mobileVisible:true},
        {key:'beneficiary',label:'المستفيد'},
        {key:'amount',label:'القيمة',kind:'number',mobileVisible:true},
        {key:'recurrence',label:'الدورية',kind:'select',options:['شهري','ربع سنوي','نصف سنوي','سنوي','موسمي','مرة واحدة','عند الحاجة']},
        {key:'due_day',label:'يوم الاستحقاق',kind:'number'},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
      ],
    },
  },
  {
    key:'renewals_insurance',
    title:'التجديدات والتأمينات',
    summary:'سجل كل تجديد أو وثيقة تأمين كسجل مستقل مع الموعد والقيمة، ثم عدّله أو احذفه عند الحاجة.',
    fields:[],
    table:{
      addLabel:'إضافة تجديد أو تأمين',
      emptyLabel:'لا توجد تجديدات أو وثائق تأمين مسجلة بعد.',
      columns:[
        {key:'category',label:'النوع',kind:'select',options:['تجديد حكومي','تأمين مركبة','تأمين صحي','تأمين ممتلكات','وثيقة أخرى','مطالبة تأمينية','أخرى'],mobileVisible:true},
        {key:'name',label:'اسم الاستحقاق أو الوثيقة',mobileVisible:true},
        {key:'provider',label:'الجهة أو شركة التأمين'},
        {key:'amount',label:'القيمة',kind:'number',mobileVisible:true},
        {key:'due_date',label:'تاريخ الاستحقاق',kind:'date'},
        {key:'recurrence',label:'الدورية',kind:'select',options:['شهري','ربع سنوي','نصف سنوي','سنوي','كل سنتين','مرة واحدة','عند الحاجة']},
        {key:'policy_number',label:'رقم الوثيقة/المرجع'},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
      ],
    },
  },
  {
    key:'assets_investments',
    title:'الأصول والاستثمارات',
    summary:'سجل الأصول العامة والأسهم المباشرة هنا. الصناديق والمحافظ الاستثمارية التفصيلية تُدار من صفحة البنك المختص.',
    fields:[],
    table:{
      addLabel:'إضافة أصل أو استثمار',
      emptyLabel:'لا توجد أصول أو استثمارات مسجلة بعد.',
      categoryOptions:['عقار','أرض','ذهب أو معادن','وديعة','نقد','أسهم مباشرة','مشروع أو حصة ملكية','سيارة كأصل','مقتنيات ذات قيمة','أخرى'],
      allowCustomCategory:true,
      columns:[
        {key:'category',label:'نوع الأصل أو الاستثمار',kind:'select',mobileVisible:true},
        {key:'custom_category',label:'اسم النوع الجديد'},
        {key:'name',label:'اسم الأصل أو الاستثمار',mobileVisible:true},
        {key:'ownership_share',label:'حصة الملكية %',kind:'number'},
        {key:'current_value',label:'القيمة الحالية',kind:'number',mobileVisible:true},
        {key:'valuation_date',label:'تاريخ التقييم',kind:'date'},
        {key:'liquidity_notes',label:'سهولة ومدة التسييل',kind:'textarea'},
        {key:'goal_link',label:'الهدف المرتبط'},
        {key:'risk_notes',label:'مخاطر أو قيود',kind:'textarea'},
        {key:'share_count',label:'عدد الأسهم',kind:'number'},
        {key:'share_cost',label:'متوسط تكلفة السهم',kind:'number'},
        {key:'total_cost',label:'إجمالي التكلفة',kind:'number'},
        {key:'market_price',label:'سعر السهم الحالي',kind:'number'},
        {key:'market_value',label:'القيمة السوقية',kind:'number'},
      ],
    },
  },
  {
    key:'routine_events',
    title:'الروتين والأحداث المتكررة',
    summary:'حوّل الروتين المؤثر ماليًا إلى سجلات واضحة يمكن إضافتها وتعديلها وحذفها.',
    fields:[],
    table:{
      addLabel:'إضافة روتين أو حدث',
      emptyLabel:'لا توجد أنماط روتينية أو أحداث متكررة مسجلة بعد.',
      columns:[
        {key:'category',label:'النوع',kind:'select',options:['مكان متكرر','وقت متكرر','مناسبة','التزام اجتماعي','نشاط متكرر','تغير في الروتين','أخرى'],mobileVisible:true},
        {key:'name',label:'الوصف',mobileVisible:true},
        {key:'frequency',label:'التكرار'},
        {key:'estimated_amount',label:'الأثر المالي التقريبي',kind:'number',mobileVisible:true},
        {key:'preferred_day',label:'اليوم أو الموعد'},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
      ],
    },
  },
];
