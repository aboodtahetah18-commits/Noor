export type PersonalBudgetVariableKind=
  |'money'
  |'percentage'
  |'count'
  |'forecast'
  |'confidence';

export type PersonalBudgetVariableOwner='central'|'hilal'|'solvency'|'assets';

export type PersonalBudgetVariableDefinition={
  key:string;
  arabicName:string;
  kind:PersonalBudgetVariableKind;
  unit:'SAR'|'PERCENT'|'DAYS'|'SCORE_0_100';
  owner:PersonalBudgetVariableOwner;
  description:string;
  excludes:string[];
  nullableWhen?:string;
};

export const PERSONAL_BUDGET_VARIABLES:readonly PersonalBudgetVariableDefinition[]=[
  {key:'verifiedIncome',arabicName:'الدخل المتحقق',kind:'money',unit:'SAR',owner:'hilal',description:'الدخل الذي أصبح تحت تصرف المستخدم فعليًا خلال الدورة.',excludes:['الدخل المتوقع','التحويلات الداخلية','الإلغاءات']},
  {key:'expectedIncome',arabicName:'الدخل المتوقع',kind:'forecast',unit:'SAR',owner:'hilal',description:'دخل مستقبلي يستخدم للتنبؤ فقط قبل التحقق.',excludes:['السيولة القابلة للصرف']},
  {key:'operatingResources',arabicName:'صافي الموارد التشغيلية',kind:'money',unit:'SAR',owner:'hilal',description:'الموارد المتحققة القابلة للاستخدام داخل الدورة قبل التخصيص.',excludes:['الأموال المحمية خارج التشغيل','الدخل المتوقع']},
  {key:'protectedObligations',arabicName:'الالتزامات المحمية',kind:'money',unit:'SAR',owner:'hilal',description:'الاستحقاقات الإلزامية غير المسددة الواجب تغطيتها في الدورة.',excludes:['المسدد','الملغى','المكرر']},
  {key:'reservedEssentials',arabicName:'المصروفات الأساسية المحجوزة',kind:'money',unit:'SAR',owner:'hilal',description:'الرصيد المحجوز المتبقي لتغطية الأساسيات المتوقعة.',excludes:['المنفذ السابق إذا لم يعد التزامًا متبقيًا']},
  {key:'requiredProtection',arabicName:'الحماية المطلوبة',kind:'money',unit:'SAR',owner:'solvency',description:'المبلغ الذي يجب إبقاؤه خارج الإنفاق والتخصيصات غير المحمية.',excludes:['الفائض الحر بعد تجاوز حد الحماية']},
  {key:'requiredGoalAllocations',arabicName:'مخصصات الأهداف الواجبة',kind:'money',unit:'SAR',owner:'assets',description:'مجموع المخصصات النشطة المطلوبة للأهداف في الدورة الحالية.',excludes:['الأهداف المؤجلة','الأهداف غير الممولة']},
  {key:'otherActiveReservations',arabicName:'الحجوزات النشطة الأخرى',kind:'money',unit:'SAR',owner:'central',description:'حجوزات فعالة لا تندرج في الالتزامات أو الأساسيات أو الحماية أو الأهداف.',excludes:['الحجوزات المحررة','الحجوزات المكررة']},
  {key:'trueAvailable',arabicName:'المتاح الحقيقي',kind:'money',unit:'SAR',owner:'hilal',description:'المبلغ القابل للاستخدام بعد جميع التغطيات المطلوبة والفعالة.',excludes:['الرصيد البنكي الخام','الفائض المؤهل للاستثمار تلقائيًا']},
  {key:'operatingDeficit',arabicName:'العجز التشغيلي',kind:'money',unit:'SAR',owner:'hilal',description:'الفجوة بين المتطلبات المحمية والموارد التشغيلية عندما تكون المتطلبات أعلى.',excludes:['انخفاض إنفاق مرن اختياري لا يسبب فجوة']},
  {key:'trueSurplus',arabicName:'الفائض الحقيقي',kind:'money',unit:'SAR',owner:'central',description:'فائض بعد اكتمال التغطيات المطلوبة، وقبل اختبار الأهلية الاستثمارية.',excludes:['رأس المال المؤهل للاستثمار قبل فحوص ملاءة والأصول']},
  {key:'realizedAmount',arabicName:'المنفذ الفعلي',kind:'money',unit:'SAR',owner:'central',description:'المبلغ المؤكد والمطابق المنفذ فعليًا ضمن النطاق والفترة.',excludes:['التوصية','الاعتماد غير المنفذ','المعاملة المعكوسة']},
  {key:'plannedAmount',arabicName:'المخطط للفترة',kind:'money',unit:'SAR',owner:'hilal',description:'القيمة المعتمدة في الخطة لنفس الفترة والنطاق محل المقارنة.',excludes:['خطة قديمة لا تطابق الفترة']},
  {key:'varianceAmount',arabicName:'الانحراف',kind:'money',unit:'SAR',owner:'hilal',description:'الفرق الموقّع بين المنفذ الفعلي والمخطط.',excludes:[]},
  {key:'utilizationPercent',arabicName:'نسبة الاستخدام',kind:'percentage',unit:'PERCENT',owner:'hilal',description:'نسبة المنفذ الفعلي إلى المخطط عندما يكون المخطط أكبر من صفر.',excludes:['حالة الخطة صفر'],nullableWhen:'plannedAmount <= 0'},
  {key:'netRealizedSavings',arabicName:'الادخار الفعلي الصافي',kind:'money',unit:'SAR',owner:'solvency',description:'الزيادة الصافية المؤكدة في المال المصنف ادخارًا خلال الدورة.',excludes:['التحويلات الداخلية التي لا تغير صافي الادخار']},
  {key:'savingsRatePercent',arabicName:'معدل الادخار',kind:'percentage',unit:'PERCENT',owner:'central',description:'نسبة الادخار الفعلي الصافي إلى الدخل المتحقق.',excludes:[],nullableWhen:'verifiedIncome <= 0'},
  {key:'goalRemainingAmount',arabicName:'المتبقي للهدف',kind:'money',unit:'SAR',owner:'assets',description:'قيمة الهدف المتبقية بعد الرصيد المخصص المؤكد.',excludes:[]},
  {key:'requiredGoalContribution',arabicName:'المساهمة الدورية المطلوبة للهدف',kind:'money',unit:'SAR',owner:'assets',description:'المساهمة اللازمة في كل دورة للوصول إلى الهدف ضمن المدة المتبقية.',excludes:[],nullableWhen:'remainingCycles <= 0'},
  {key:'safeGoalCapacity',arabicName:'القدرة الآمنة للهدف',kind:'money',unit:'SAR',owner:'assets',description:'أكبر تخصيص للهدف لا يسبب عجزًا ولا يكسر حد الحماية.',excludes:[]},
  {key:'flexibleRemaining',arabicName:'المتاح المرن المتبقي',kind:'money',unit:'SAR',owner:'hilal',description:'الرصيد المتبقي من مخصص الإنفاق المرن بعد المنفذ الفعلي.',excludes:[]},
  {key:'remainingCycleDays',arabicName:'الأيام المتبقية في الدورة',kind:'count',unit:'DAYS',owner:'hilal',description:'عدد الأيام التقويمية المتبقية حتى نهاية الدورة المالية.',excludes:[]},
  {key:'dailyGuidance',arabicName:'الحد اليومي الاسترشادي',kind:'money',unit:'SAR',owner:'hilal',description:'توزيع استرشادي للمتاح المرن على الأيام المتبقية.',excludes:['الإلزام اليومي','المصروفات الكبيرة غير اليومية دون إعادة توقع']},
  {key:'projectedEndBalance',arabicName:'رصيد نهاية الدورة المتوقع',kind:'forecast',unit:'SAR',owner:'hilal',description:'رصيد متوقع عند نهاية الدورة بناءً على المتبقي والتدفقات التنبؤية المؤهلة.',excludes:['المتاح الحالي القابل للصرف']},
  {key:'calculationConfidence',arabicName:'درجة الثقة الحسابية',kind:'confidence',unit:'SCORE_0_100',owner:'central',description:'مقياس جودة واكتمال وحداثة واتساق مدخلات الحساب.',excludes:['صلاحية تجاوز قاعدة صارمة']},
] as const;

export function personalBudgetVariable(key:string){
  return PERSONAL_BUDGET_VARIABLES.find(item=>item.key===key)??null;
}

export function assertKnownPersonalBudgetVariable(key:string){
  const variable=personalBudgetVariable(key);
  if(!variable) throw new Error('UNKNOWN_PERSONAL_BUDGET_VARIABLE:'+key);
  return variable;
}
