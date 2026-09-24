export type ExtendedProfileField={
  key:string;
  label:string;
  placeholder?:string;
  kind?:'text'|'number'|'date'|'textarea'|'select';
  options?:string[];
};
export type ExtendedProfileSection={
  key:string;
  title:string;
  summary:string;
  fields:ExtendedProfileField[];
};

export const extendedProfileSections:ExtendedProfileSection[]=[
  {
    key:'bills_subscriptions',
    title:'الفواتير والاشتراكات',
    summary:'سجّل الفواتير والاشتراكات المتكررة ومبالغها التقريبية حتى لا يعتمد نماء على التخمين.',
    fields:[
      {key:'electricity_bill',label:'متوسط فاتورة الكهرباء شهريًا',kind:'number'},
      {key:'water_bill',label:'متوسط فاتورة المياه شهريًا',kind:'number'},
      {key:'mobile_bill',label:'متوسط فاتورة الجوال شهريًا',kind:'number'},
      {key:'home_internet_bill',label:'متوسط الإنترنت المنزلي شهريًا',kind:'number'},
      {key:'other_bills',label:'فواتير أخرى متكررة',kind:'textarea',placeholder:'اذكر اسم الفاتورة ومتوسط مبلغها وتكرارها.'},
      {key:'subscriptions',label:'الاشتراكات المدفوعة',kind:'textarea',placeholder:'مثل المنصات الرقمية، التطبيقات، الأندية، التخزين السحابي وغيرها مع المبلغ والتكرار.'},
    ],
  },
  {
    key:'daily_living',
    title:'المعيشة اليومية',
    summary:'الطعام والشراب والتسوق والعناية الشخصية والمساهمات المنزلية حسب صرفك الفعلي.',
    fields:[
      {key:'daily_food_average',label:'متوسط الطعام والشراب يوميًا',kind:'number'},
      {key:'monthly_groceries',label:'متوسط البقالة شهريًا',kind:'number'},
      {key:'monthly_shopping',label:'متوسط التسوق شهريًا',kind:'number'},
      {key:'personal_care',label:'متوسط العناية الشخصية شهريًا',kind:'number'},
      {key:'family_household_support',label:'مساهمتك الشهرية مع الأسرة أو المنزل',kind:'number'},
      {key:'other_household_costs',label:'مصاريف منزلية أخرى',kind:'textarea'},
    ],
  },
  {
    key:'housing_details',
    title:'السكن والمرافق',
    summary:'تفاصيل السكن والفواتير والصيانة التي تؤثر على الميزانية والسيولة.',
    fields:[
      {key:'housing_type',label:'نوع السكن',kind:'select',options:['ملك','إيجار','مع العائلة','سكن جهة العمل','غير ذلك']},
      {key:'monthly_housing_cost',label:'التكلفة الشهرية الفعلية',kind:'number'},
      {key:'electricity_average',label:'متوسط الكهرباء',kind:'number'},
      {key:'water_average',label:'متوسط المياه',kind:'number'},
      {key:'internet_average',label:'الإنترنت المنزلي',kind:'number'},
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
      {key:'daily_distance',label:'المسافة اليومية التقريبية بالكيلومتر',kind:'number'},
      {key:'monthly_fuel_cost',label:'متوسط تكلفة الوقود شهريًا',kind:'number'},
      {key:'fuel_type',label:'نوع الطاقة',kind:'select',options:['بنزين','ديزل','كهرباء','هجين','أخرى']},
      {key:'efficiency_notes',label:'استهلاك المركبة أو كفاءتها إن كان معروفًا'},
      {key:'oil_change_cost',label:'متوسط تكلفة تغيير الزيت',kind:'number'},
      {key:'oil_change_interval',label:'كل كم كيلومتر أو شهر تغيّر الزيت؟'},
      {key:'annual_maintenance_cost',label:'متوسط الصيانة السنوية',kind:'number'},
      {key:'insurance_cost',label:'تكلفة التأمين السنوية',kind:'number'},
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
      {key:'subscriptions_notes',label:'الاشتراكات المتكررة',kind:'textarea'},
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
