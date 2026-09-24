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
    summary:'الاستحقاقات الحكومية ووثائق التأمين ومواعيد التجديد والمطالبات.',
    fields:[
      {key:'renewals',label:'التجديدات الحكومية القادمة',kind:'textarea'},
      {key:'insurance_policies',label:'وثائق التأمين القائمة',kind:'textarea'},
      {key:'renewal_dates',label:'مواعيد التجديد المعروفة',kind:'textarea'},
      {key:'claims_notes',label:'مطالبات أو تحمل قائم',kind:'textarea'},
    ],
  },
  {
    key:'assets_investments',
    title:'الأصول والاستثمارات',
    summary:'الملكية والقيمة والسيولة والهدف والمخاطر دون اعتبار القيمة السوقية نقدًا متاحًا.',
    fields:[
      {key:'asset_type',label:'نوع الأصل أو الاستثمار'},
      {key:'ownership_share',label:'حصة الملكية'},
      {key:'current_value',label:'القيمة الحالية التقريبية',kind:'number'},
      {key:'valuation_date',label:'تاريخ التقييم',kind:'date'},
      {key:'liquidity_notes',label:'سهولة ومدة التسييل',kind:'textarea'},
      {key:'goal_link',label:'الهدف المرتبط إن وجد'},
      {key:'risk_notes',label:'مخاطر أو قيود مهمة',kind:'textarea'},
    ],
  },
  {
    key:'routine_events',
    title:'الروتين والأحداث المتكررة',
    summary:'أماكن وأوقات وأحداث تتكرر ماليًا؛ يفضل أن يتعلمها النظام من السجل مع إمكانية تصحيح المستخدم.',
    fields:[
      {key:'routine_places',label:'أماكن أو تجار يتكرر الإنفاق عندهم',kind:'textarea'},
      {key:'routine_times',label:'أيام أو أوقات يتكرر فيها الإنفاق',kind:'textarea'},
      {key:'recurring_events',label:'أحداث أو مناسبات متكررة مؤثرة ماليًا',kind:'textarea'},
      {key:'change_notes',label:'تغير حديث في الروتين',kind:'textarea'},
    ],
  },
];
