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
  kind?:'text'|'number'|'select';
  options?:string[];
};
export type ExtendedProfileSection={
  key:string;
  title:string;
  summary:string;
  fields:ExtendedProfileField[];
  table?:{
    addLabel:string;
    emptyLabel:string;
    columns:ExtendedProfileTableColumn[];
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
        {key:'name',label:'الفاتورة'},
        {key:'amount',label:'القيمة',kind:'number'},
        {key:'recurrence',label:'الدورية',kind:'select',options:['شهري','كل شهرين','ربع سنوي','نصف سنوي','سنوي','حسب الاستهلاك','أخرى']},
        {key:'due_note',label:'موعد/ملاحظة'},
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
        {key:'name',label:'الاشتراك'},
        {key:'amount',label:'القيمة',kind:'number'},
        {key:'recurrence',label:'الدورية',kind:'select',options:['شهري','ربع سنوي','نصف سنوي','سنوي','أخرى']},
        {key:'due_note',label:'موعد/ملاحظة'},
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
    title:'المركبات والتنقل',
    summary:'الموديل والاستخدام والوقود والتأمين والصيانة لتقدير تكلفة التنقل بواقعية.',
    fields:[
      {key:'vehicle_make',label:'الشركة'},
      {key:'vehicle_model',label:'الموديل'},
      {key:'vehicle_year',label:'سنة الصنع',kind:'number'},
      {key:'ownership',label:'الملكية',kind:'select',options:['مملوكة','تمويل','إيجار','جهة العمل','أخرى']},
      {key:'monthly_distance',label:'المسافة الشهرية التقريبية بالكيلومتر',kind:'number'},
      {key:'fuel_type',label:'نوع الطاقة',kind:'select',options:['بنزين','ديزل','كهرباء','هجين','أخرى']},
      {key:'efficiency_notes',label:'الكفاءة أو الاستهلاك إن كان معروفًا'},
      {key:'maintenance_notes',label:'صيانة أو إصلاح معروف قادم',kind:'textarea'},
    ],
  },
  {
    key:'travel_profile',
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
    summary:'المطاعم والمقاهي والبقالة والاتصالات والاشتراكات والترفيه والعناية حسب السلوك الفعلي.',
    fields:[
      {key:'restaurants_frequency',label:'تكرار المطاعم'},
      {key:'restaurants_average',label:'متوسط وجبة خارج المنزل',kind:'number'},
      {key:'cafes_frequency',label:'تكرار المقاهي'},
      {key:'cafes_average',label:'متوسط الطلب في المقهى',kind:'number'},
      {key:'groceries_frequency',label:'تكرار البقالة'},
      {key:'groceries_average',label:'متوسط سلة البقالة',kind:'number'},
      {key:'telecom_notes',label:'خدمات الاتصالات الأساسية',kind:'textarea'},
      {key:'leisure_notes',label:'الترفيه والهوايات والعناية الشخصية',kind:'textarea'},
    ],
  },
  {
    key:'health_education_family',
    title:'الصحة والتعليم والأسرة',
    summary:'المصاريف المؤثرة والضرورية والموسمية لكل مستفيد دون جمع تفاصيل طبية غير لازمة.',
    fields:[
      {key:'health_recurring',label:'مصروف صحي دوري أو علاج معروف',kind:'textarea'},
      {key:'insurance_coverage',label:'التغطية التأمينية والتحمل المعروف',kind:'textarea'},
      {key:'education_costs',label:'تعليم أو تدريب قائم وتكاليفه',kind:'textarea'},
      {key:'family_nonmonthly',label:'مصروفات أسرية غير شهرية معروفة',kind:'textarea'},
      {key:'shared_costs',label:'مساهمات طرف آخر في المصروفات المشتركة',kind:'textarea'},
    ],
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
