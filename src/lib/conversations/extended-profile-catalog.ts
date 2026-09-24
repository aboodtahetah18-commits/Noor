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
  managedElsewhere?:boolean;
  foundationFactKey?:string;
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
    summary:'كل سجل سكن أو مرفق يضاف مرة واحدة ثم يظهر في جدول قابل للتعديل والحذف.',
    fields:[],
    table:{
      addLabel:'إضافة سجل سكن أو مرفق',
      emptyLabel:'لا توجد بيانات سكن أو مرافق مسجلة بعد.',
      columns:[
        {key:'category',label:'النوع',kind:'select',options:['سكن','إيجار','مرفق','صيانة','إصلاح','أخرى'],mobileVisible:true},
        {key:'name',label:'البيان',mobileVisible:true},
        {key:'amount',label:'القيمة',kind:'number',mobileVisible:true},
        {key:'recurrence',label:'الدورية',kind:'select',options:['شهري','ربع سنوي','نصف سنوي','سنوي','مرة واحدة','عند الحاجة']},
        {key:'due_day',label:'يوم الاستحقاق',kind:'number'},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
      ],
    },
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
        {key:'fuel_efficiency',label:'الكفاءة كم/لتر',kind:'number'},
        {key:'fuel_price',label:'سعر اللتر',kind:'number'},
        {key:'estimated_fuel_cost',label:'تكلفة الوقود الشهرية التقديرية',kind:'number',mobileVisible:true},
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
      categoryOptions:['تغيير زيت','زيت وفلتر','فلاتر','إطارات','بطارية','فرامل','فحص دوري','صيانة عامة','أخرى'],
      allowCustomCategory:true,
      columns:[
        {key:'category',label:'نوع الصيانة',kind:'select',mobileVisible:true},
        {key:'custom_category',label:'اسم الصيانة الجديدة'},
        {key:'vehicle',label:'المركبة',kind:'select',mobileVisible:true},
        {key:'schedule_pattern',label:'نمط الجدولة',kind:'select',options:['ثابت','متناوب']},
        {key:'interval_value',label:'كل كم',kind:'number'},
        {key:'interval_unit',label:'الوحدة',kind:'select',options:['شهر','ألف كم']},
        {key:'primary_amount',label:'قيمة الدورة الأولى',kind:'number',mobileVisible:true},
        {key:'alternate_name',label:'الدورة المتناوبة'},
        {key:'alternate_amount',label:'قيمة الدورة المتناوبة',kind:'number'},
        {key:'forecast_value',label:'أحسب التكلفة حتى (بنفس وحدة الجدولة)',kind:'number'},
        {key:'forecast_occurrences',label:'عدد الدورات المحسوب',kind:'number'},
        {key:'forecast_total',label:'إجمالي التكلفة المحسوب',kind:'number',mobileVisible:true},
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
      categoryOptions:['تأمين سنوي','تجديد استمارة','تجديد رخصة','فحص دوري','إطارات','رسوم تمويل','اشتراك مواقف','أخرى'],
      allowCustomCategory:true,
      columns:[
        {key:'category',label:'الإلزام',kind:'select',mobileVisible:true},
        {key:'custom_category',label:'اسم الإلزام الجديد'},
        {key:'vehicle',label:'المركبة',kind:'select',mobileVisible:true},
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
    summary:'لا يظهر هذا القسم إلا عند وجود رحلة فعلية؛ كل رحلة سجل مستقل قابل للتعديل والحذف.',
    fields:[],
    table:{
      addLabel:'إضافة رحلة',
      emptyLabel:'لا توجد رحلات مسجلة.',
      columns:[
        {key:'trip_purpose',label:'الغرض أو نوع الرحلة',mobileVisible:true},
        {key:'destination',label:'الوجهة',mobileVisible:true},
        {key:'start_date',label:'تاريخ البداية',kind:'date'},
        {key:'end_date',label:'تاريخ النهاية',kind:'date'},
        {key:'travelers',label:'عدد المسافرين',kind:'number'},
        {key:'transport',label:'وسيلة النقل'},
        {key:'budget',label:'الميزانية',kind:'number',mobileVisible:true},
        {key:'currency',label:'العملة'},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
      ],
    },
  },
  {
    key:'budget_behavior',
    title:'سلوك بنود الميزانية',
    summary:'يمكن تسجيل البند نفسه بأكثر من سياق، مثل مطاعم أيام العمل ومطاعم نهاية الأسبوع، مع حساب كل نمط مستقلًا.',
    fields:[],
    table:{
      addLabel:'إضافة بند',
      emptyLabel:'ابدأ بأول بند من سلوكك الفعلي.',
      categoryOptions:['المطاعم','المقاهي','البقالة','الاتصالات','الترفيه','العناية الشخصية','الهدايا والمناسبات','الملابس','التوصيل','الدورات والتطوير','أخرى'],
      allowCustomCategory:true,
      columns:[
        {key:'category',label:'البند',kind:'select',mobileVisible:true},
        {key:'custom_category',label:'اسم البند الجديد'},
        {key:'spend_context',label:'سياق المصروف',kind:'select',options:['أيام العمل','نهاية الأسبوع','جميع الأيام','موسمي أو مناسبة','حسب الحاجة'],mobileVisible:true},
        {key:'beneficiary',label:'المستفيد',kind:'select'},
        {key:'frequency_period',label:'التكرار',kind:'select',options:['يومي','أسبوعي','شهري'],mobileVisible:true},
        {key:'occurrences',label:'عدد المرات في فترة التكرار',kind:'number'},
        {key:'unit_cost',label:'تكلفة المرة الواحدة',kind:'number'},
        {key:'monthly_total',label:'الإجمالي الشهري المحسوب',kind:'number',mobileVisible:true},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
      ],
    },
  },
  {
    key:'beneficiaries',
    title:'المستفيدون',
    summary:'أضف الأشخاص الذين ترتبط بهم مصاريف أو دورات أو التزامات، ثم استخدمهم مباشرة من قوائم الاختيار في بقية النماذج.',
    fields:[],
    table:{
      addLabel:'إضافة مستفيد',
      emptyLabel:'لا توجد بيانات مستفيدين بعد.',
      columns:[
        {key:'name',label:'اسم المستفيد',mobileVisible:true},
        {key:'relationship',label:'العلاقة',kind:'select',options:['أنا','زوج/زوجة','ابن/ابنة','والد/والدة','قريب','موظف أو عامل','جهة أو مؤسسة','أخرى'],mobileVisible:true},
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
        {key:'beneficiary',label:'المستفيد',kind:'select'},
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
    managedElsewhere:true,
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
    key:'obligations',
    foundationFactKey:'obligations',
    title:'الالتزامات',
    summary:'الالتزامات المسجلة سابقًا تظهر هنا ويمكن تعديلها أو إضافة التزام جديد أو حذفه.',
    fields:[],
    table:{
      addLabel:'إضافة التزام',
      emptyLabel:'لا توجد التزامات مسجلة بعد.',
      columns:[
        {key:'name',label:'الالتزام',mobileVisible:true},
        {key:'provider',label:'الجهة'},
        {key:'amount',label:'القيمة',kind:'number',mobileVisible:true},
        {key:'recurrence',label:'الدورية',kind:'select',options:['شهري','كل شهرين','ربع سنوي','نصف سنوي','سنوي','مرة واحدة','أخرى']},
        {key:'due_day',label:'يوم الاستحقاق',kind:'number'},
        {key:'remaining_balance',label:'الرصيد المتبقي',kind:'number'},
        {key:'end_date',label:'تاريخ الانتهاء',kind:'date'},
        {key:'finance_cost',label:'تكلفة التمويل',kind:'number'},
        {key:'notes',label:'ملاحظات',kind:'textarea'},
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
