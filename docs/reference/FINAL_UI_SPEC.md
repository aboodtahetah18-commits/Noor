# FINAL_UI_SPEC.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

## Final User Interface Specification

---

# 1. الهدف

هذه الوثيقة هي المرجع التنفيذي النهائي لبناء واجهات النظام.

بعد اعتمادها لا يجوز للمطور أن يقرر من تلقاء نفسه:

* ترتيب العناصر.
* شكل التنقل.
* أولوية البيانات.
* المصطلحات.
* حالات الواجهة.
* سلوك Desktop مقابل Mobile.
* نمط النوافذ.
* طريقة عرض الحالات المالية.

أي تغيير في هذه الأمور يجب أن يعود إلى هذه الوثيقة أو إلى المرجع الأعلى المرتبط بها.

---

# 2. ترتيب سلطة المراجع

عند وجود تعارض يكون التسلسل:

```text
SYSTEM_MASTER.md
↓
WORKFLOWS.md
↓
BUSINESS_RULES.md
↓
STATE_MACHINES.md
↓
DATA_MODEL.md
↓
ARCHITECTURE.md
↓
UX_ARCHITECTURE.md
↓
DESIGN_SYSTEM.md
↓
WIREFRAMES.md
↓
VISUAL_PROTOTYPE.md
↓
FINAL_UI_SPEC.md
```

ولا يجوز أن تغير الواجهة قاعدة مالية معتمدة.

---

# 3. اللغة والاتجاه

لغة النظام الأساسية:

```text
Arabic
```

الاتجاه:

```text
RTL
```

ويطبق RTL على:

* App Shell.
* Sidebar.
* Bottom Navigation.
* Tables.
* Forms.
* Dialogs.
* Sheets.
* Icons الاتجاهية.
* Breadcrumbs.
* Pagination.
* Date navigation.

---

# 4. المصطلحات الرسمية

يجب استخدام المصطلحات التالية بصورة ثابتة:

```text
Safe To Spend
→ المتاح الآمن للصرف

Daily Safe Limit
→ الحد اليومي الآمن

Actual
→ الفعلي

Planned
→ المخطط

Projected
→ المتوقع

Allocated
→ المخصص

Transferred
→ المحول فعليًا

Remaining
→ المتبقي

Financial Cycle
→ الدورة المالية

Financial Plan
→ الخطة المالية

Recommendation
→ توصية

Obligation
→ التزام

Emergency Fund
→ صندوق الطوارئ
```

ممنوع تغيير المصطلح بين شاشة وأخرى دون اعتماد.

---

# 5. الهوية البصرية

الطابع:

```text
Professional
Financial
Calm
Modern
Trustworthy
Minimal
```

ممنوع:

* Glassmorphism ثقيل.
* Gradients مبالغ فيها.
* 3D.
* Neumorphism.
* زخارف مالية.
* رسوم عملات متحركة.
* ألوان كثيرة بلا معنى.
* Shadows ثقيلة.

---

# 6. الخط

الخط:

```text
IBM Plex Sans Arabic
```

الأوزان:

```text
400
500
600
700
```

لا يستخدم خط آخر داخل التطبيق في الإصدار الأول.

---

# 7. Typography Tokens

```text
Display Desktop   40px / 700
Display Mobile    32px / 700

H1 Desktop        28px / 700
H1 Mobile         24px / 700

H2                22px / 600
H3                18px / 600

Body              16px / 400
Body Medium       16px / 500
Secondary         14px / 400
Caption           13px / 400
```

---

# 8. Spacing Tokens

```text
space-1   4px
space-2   8px
space-3   12px
space-4   16px
space-5   20px
space-6   24px
space-8   32px
space-10  40px
space-12  48px
space-16  64px
```

لا تستخدم مسافات عشوائية خارج النظام إلا لسبب موثق.

---

# 9. Radius Tokens

```text
radius-sm     8px
radius-md     12px
radius-lg     16px
radius-modal  20px
```

---

# 10. الألوان

الألوان الحالية تظل Design Tokens قابلة لتثبيت الهوية قبل Production.

```text
Primary
#2563EB

Text Strong
#111827

Text
#374151

Text Secondary
#6B7280

Border
#E5E7EB

Surface
#FFFFFF

Surface Secondary
#F9FAFB

Success
#16A34A

Warning
#D97706

Danger
#DC2626

Info
#0284C7
```

---

# 11. قاعدة ألوان الحالات

لا يعرض لون منفرد دون نص.

الصحيح:

```text
⚠ معرض للتجاوز
```

وليس:

```text
●
```

فقط.

---

# 12. App Shell — Desktop

الشاشة:

```text
Sidebar
+
Main Workspace
+
Optional Context Panel
```

Sidebar:

```text
240–272px
```

المحتوى:

```text
max-width: 1440px
```

Page Padding:

```text
32px
```

---

# 13. Desktop Sidebar

الترتيب:

```text
الرئيسية
الميزانية
العمليات
الالتزامات
الادخار
الطوارئ
الأهداف
المستشار المالي
التقارير
الحسابات

────────────

الإعدادات
```

كل عنصر:

```text
Icon
Label
Optional Badge
```

الحالة النشطة واضحة لكن غير مبالغ فيها.

---

# 14. App Shell — Mobile

يتكون من:

```text
Top Bar
+
Scrollable Page
+
Bottom Navigation
```

لا يوجد Desktop Sidebar على Mobile.

Padding:

```text
16px
```

---

# 15. Bottom Navigation

الترتيب:

```text
الرئيسية
الميزانية
إضافة
المستشار
المزيد
```

عدد العناصر ثابت عند خمسة.

---

# 16. "المزيد"

يحتوي:

```text
العمليات
الالتزامات
الادخار
الطوارئ
الأهداف
التقارير
الحسابات
الإعدادات
```

---

# 17. Page Header

Desktop:

```text
عنوان الصفحة
وصف قصير عند الحاجة

Primary Action
Secondary Action
```

Mobile:

```text
عنوان
Primary Action عند الحاجة
```

لا تزدحم الترويسة بإجراءات ثانوية.

---

# 18. FinancialHeroCard

أهم Component في النظام.

المحتوى الإلزامي:

```text
المتاح الآمن للصرف

{safe_to_spend} ريال

حتى الدخل القادم

{daily_safe_limit} ريال يوميًا
```

والسيولة تظهر ثانويًا:

```text
إجمالي السيولة: {liquidity}
```

---

# 19. قاعدة Safe To Spend

في الحالات الطبيعية:

```text
Safe To Spend
```

هو الرقم الأكبر في Dashboard.

لا يجوز جعل:

```text
Account Balance
```

أكبر منه.

---

# 20. Dashboard Desktop

الترتيب النهائي:

```text
PageHeader
↓
FinancialHeroCard
↓
KPI Strip
↓
Forecast + Advisor
↓
Upcoming Obligations
↓
Saving / Emergency / Goals
```

---

# 21. Dashboard Mobile

الترتيب:

```text
Top Bar
↓
Critical Alert إذا وجد
↓
Safe To Spend
↓
Primary Action
↓
Advisor
↓
Cycle Context
↓
Upcoming Obligation
↓
Budget Summary
↓
Saving
↓
Emergency
↓
Goals
↓
Bottom Navigation
```

---

# 22. Dashboard Primary Action

يتغير حسب السياق.

```text
No Cycle
→ بدء دورة مالية

DRAFT Cycle
→ إكمال الخطة

Income Not Received
→ تسجيل نزول الراتب

Plan Awaiting Approval
→ مراجعة واعتماد الخطة

ACTIVE
→ إضافة عملية

Cycle Ending
→ مراجعة الدورة
```

---

# 23. KPI Strip

المؤشرات فقط:

```text
دخل الدورة
المصروف
المتبقي من الميزانية
نسبة الادخار
```

لا تضاف بطاقات KPI جديدة تلقائيًا.

---

# 24. Forecast Card

العنوان:

```text
التوقع حتى الراتب القادم
```

ويجب أن تحمل البيانات المتوقعة Label صريحًا:

```text
متوقع
```

---

# 25. Advisor Card

يحتوي:

```text
نوع التوصية
العنوان
الشرح
الأرقام الداعمة
CTA
```

مثال:

```text
تنبيه مالي

ميزانية المطاعم معرضة للتجاوز.

470 من 500 ريال
94%

[ عرض التوصية ]
```

---

# 26. ترتيب التوصيات

```text
1. خطر العجز
2. التزام متأخر
3. التزام قريب
4. Safe To Spend
5. الادخار والطوارئ
6. الأهداف
7. تحسين المصروف
8. الإيجابيات
```

---

# 27. Quick Add

Mobile:

```text
Bottom Sheet
```

Desktop:

```text
Dialog
```

الخيارات:

```text
مصروف
دخل
تحويل
استرداد
```

الترتيب يبدأ دائمًا بالمصروف.

---

# 28. إضافة مصروف — Mobile

Full Screen Flow.

الترتيب:

```text
المبلغ
البند
الحساب
التاريخ
مخطط / غير مخطط
طبيعة المصروف
الوصف
زر التسجيل
```

---

# 29. Money Input

حقل المبلغ ليس Input نصيًا تقليديًا.

يظهر كحقل رقمي رئيسي كبير.

صيغة العرض:

```text
250
ريال
```

---

# 30. اختيار البند

النمط:

```text
Search
↓
Select
↓
Hide Search
↓
Show Selected Item
```

بعد الاختيار:

```text
المطاعم    ×
```

---

# 31. اختيار الحساب

يستخدم نفس Single Select Pattern.

---

# 32. التاريخ

القيمة الافتراضية:

```text
اليوم
```

ويستطيع المستخدم تعديلها.

---

# 33. مخطط / غير مخطط

يستخدم:

```text
Segmented Control
```

ولا يستخدم Dropdown.

---

# 34. طبيعة المصروف

الخيارات:

```text
ضروري
مهم
اختياري
ترفيهي
غير مخطط
```

الجوال:

يمكن تقسيمها على صفين عند الحاجة.

لا يتم تصغير الخط لتناسب صفًا واحدًا.

---

# 35. زر تسجيل المصروف

الحالات:

```text
Default
Disabled
Loading
```

عند التنفيذ:

```text
جاري التسجيل...
```

ويمنع النقر المتكرر.

---

# 36. نجاح تسجيل المصروف

لا يستخدم Toast وحده.

يعرض:

```text
✓ تم تسجيل المصروف

250 ريال

المتاح الآمن الآن
1,890 ريال

قبل العملية
2,140 ريال
```

---

# 37. نجاح مع خطر مالي

إذا نتج Deficit:

```text
✓ تم تسجيل المصروف

تنبيه مالي

العجز المتوقع
310 ريال

[ مراجعة الوضع ]
```

---

# 38. صفحة الميزانية Desktop

الترتيب:

```text
PageHeader
↓
Budget Summary
↓
Salary Distribution
↓
Budget Categories
↓
Advisor Context
```

---

# 39. Budget Summary

يعرض:

```text
الدخل الفعلي
إجمالي المخصص
المتبقي
حالة الخطة
```

---

# 40. Salary Distribution

الفئات:

```text
الالتزامات
الاحتياجات الأساسية
الادخار
الطوارئ
الأهداف
المصروف المرن
```

يمكن استخدام Stacked Bar لكن يجب وجود الأرقام بجانبها.

---

# 41. Budget Table — Desktop

الأعمدة:

```text
البند
المخطط
الفعلي
المتبقي
الاستخدام
الحالة
```

---

# 42. Budget Cards — Mobile

لكل بند:

```text
اسم البند
الحالة

الفعلي / المخطط

Progress

المتبقي
```

---

# 43. Budget Status

```text
NORMAL
→ ضمن الخطة

AT_RISK
→ معرض للتجاوز

OVER_BUDGET
→ متجاوز
```

---

# 44. تعديل خطة معتمدة

لا يظهر Edit Inline مباشر.

التدفق:

```text
تعديل الخطة
↓
القيمة الحالية
↓
القيمة الجديدة
↓
سبب التعديل
↓
مراجعة
↓
اعتماد النسخة الجديدة
```

---

# 45. العمليات Desktop

تستخدم Table.

الأعمدة:

```text
التاريخ
الوصف
البند
الحساب
النوع
المبلغ
```

مع:

* Search.
* Filters.
* Sorting.
* Pagination.

---

# 46. العمليات Mobile

تستخدم Compact List.

كل عنصر:

```text
الوصف               المبلغ
التاريخ

البند
الحساب
نوع العملية
```

---

# 47. تفاصيل العملية

تعرض:

```text
المبلغ
النوع
الحالة
التاريخ المالي
البند
الحساب
مخطط/غير مخطط
طبيعة المصروف
الوصف
وقت التسجيل
```

---

# 48. العمليات التاريخية

للعملية:

```text
POSTED
```

لا يوجد:

```text
حذف
```

الإجراء المناسب:

```text
عكس العملية
```

---

# 49. عكس العملية

Confirmation:

```text
عكس العملية؟

العملية الأصلية لن تحذف.

سيتم إنشاء عملية عكس موثقة.

سبب العكس:
[...]

[ تأكيد العكس ]
[ إلغاء ]
```

---

# 50. الالتزامات

الترتيب:

```text
متأخرة
مستحقة الآن
قادمة
مدفوعة
```

---

# 51. Obligation Card

يحتوي:

```text
الاسم
المبلغ
تاريخ الاستحقاق
الفترة المتبقية
التكرار
الحالة
```

CTA:

```text
تسجيل السداد
```

---

# 52. تسجيل السداد

```text
المبلغ
الحساب
التاريخ
```

ثم:

```text
تأكيد السداد
```

---

# 53. الادخار

الشاشة يجب أن تعرض الثلاثة بشكل مستقل:

```text
المخطط
المخصص
المحول فعليًا
```

ولا تستخدم قيمة واحدة باسم "الادخار".

---

# 54. صندوق الطوارئ

يعرض:

```text
الرصيد الحالي
الهدف
نسبة الاكتمال
مساهمة الدورة
```

الأفعال:

```text
إضافة مساهمة
سحب طارئ
```

---

# 55. السحب الطارئ

يتطلب:

```text
المبلغ
الحساب المستلم
السبب
نوع الحالة
التاريخ
```

ولا يسمح بإرسال النموذج بدون السبب.

---

# 56. الأهداف

Goal Card:

```text
اسم الهدف
الحالة
المتوفر / المطلوب
النسبة
التاريخ المستهدف
المساهمة المطلوبة
```

---

# 57. هدف غير واقعي

لا تكفي Badge.

يجب عرض:

```text
المطلوب
4,000 ريال

القدرة الحالية
1,500 ريال

الفجوة
2,500 ريال
```

ثم:

```text
تمديد التاريخ
تعديل الهدف
إيقاف مؤقت
```

---

# 58. المستشار المالي

الواجهة:

```text
Recommendation Feed
```

وليست Chat-first.

كل Recommendation تحتوي:

```text
Type
Priority
Title
Reason
Supporting Data
Explanation
Action
```

---

# 59. لماذا ظهرت هذه التوصية؟

يجب أن تكون متاحة في كل Recommendation Detail.

تعتمد على:

```text
reason_code
reason_data
```

---

# 60. التقارير

لا تتطابق مع Dashboard.

التقارير للإجابة:

```text
ماذا حدث؟
كيف تغير الأداء؟
```

Dashboard للإجابة:

```text
ماذا أفعل الآن؟
```

---

# 61. تقرير الدورة

يحتوي:

```text
الدخل المتوقع مقابل الفعلي
المصروف المخطط مقابل الفعلي
الادخار المخطط مقابل الفعلي
الفائض / العجز
المصروف غير المخطط
أكبر تجاوز
الأهداف
الطوارئ
ملخص المستشار
```

---

# 62. الحسابات

صفحة الحسابات تعرض:

```text
إجمالي السيولة
الحسابات
الأرصدة
```

مع تنبيه ثابت:

> إجمالي السيولة لا يعني المبلغ الآمن للصرف.

---

# 63. الإعدادات

الأقسام المعتمدة:

```text
الملف الشخصي
العملة
المنطقة الزمنية
الحسابات
بنود الميزانية
الالتزامات المتكررة
```

---

# 64. Forms Desktop

الحقول القصيرة يمكن أن تظهر عمودين.

مثال:

```text
المبلغ | التاريخ

البند | الحساب
```

والحقول الطويلة كامل العرض.

---

# 65. Forms Mobile

في الأغلب:

```text
Single Column
```

ويسمح بعمودين للحقول القصيرة فقط إذا كان الاستخدام مريحًا.

---

# 66. Button System

```text
Primary
Secondary
Tertiary
Danger
Icon
```

---

# 67. Primary Button

واحد فقط قدر الإمكان لكل سياق.

---

# 68. Button Heights

```text
Desktop:
40–44px

Mobile:
44–48px
```

---

# 69. Input Heights

```text
Desktop:
40–44px

Mobile:
44–48px
```

---

# 70. Tables

Desktop:

```text
Table
```

Mobile:

```text
Cards / List Rows
```

ولا يتم إجبار جدول Desktop على شاشة الجوال.

---

# 71. Empty States

يجب أن تتضمن:

```text
Title
Explanation
Primary Action
```

مثال:

```text
لا توجد أهداف مالية بعد.

أنشئ هدفك الأول لمتابعة تقدمك.

[ إضافة هدف ]
```

---

# 72. Dashboard Empty State

لا تعرض عدة بطاقات صفرية.

تعرض:

```text
ابدأ أول دورة مالية

وزع دخلك واعرف المبلغ الآمن للصرف.

[ بدء دورة مالية ]
```

---

# 73. Loading

تستخدم Skeletons.

لا تستخدم صفحة بيضاء مع Spinner وحيد إذا كان Skeleton ممكنًا.

---

# 74. Error

كل رسالة تجيب:

```text
ما الذي فشل؟
هل تغيرت البيانات؟
ما الخطوة التالية؟
```

مثال:

```text
تعذر تسجيل العملية.

لم يتم حفظها أو خصم أي مبلغ.

[ إعادة المحاولة ]
```

---

# 75. AI Failure

يجب ألا يعطل:

```text
الحسابات
الميزانية
Safe To Spend
العمليات
الأهداف
الالتزامات
```

يظهر فقط:

```text
تعذر إنشاء الشرح الذكي حاليًا.
```

---

# 76. حالة Deficit

عند:

```text
Projected End Balance < 0
```

Dashboard يعيد ترتيب نفسه.

أعلى الشاشة:

```text
عجز متوقع

740 ريال

قبل الراتب القادم

[ مراجعة الخطة ]
```

ثم:

```text
المتاح الآمن للصرف
0 ريال
```

---

# 77. التزام متأخر

إذا وجد:

```text
OVERDUE
```

يظهر قبل الالتزامات العادية.

---

# 78. Session Expired

```text
انتهت جلستك.

سجل الدخول مرة أخرى للوصول إلى بياناتك المالية.

[ تسجيل الدخول ]
```

ولا تبقى معلومات حساسة ظاهرة.

---

# 79. Accessibility

الإلزامي:

* Keyboard Navigation.
* Focus States.
* ARIA / Accessible Labels.
* Color Contrast.
* Touch Targets ≥ 44px على Mobile.
* Screen-reader labels.
* Reduced motion support.
* عدم الاعتماد على اللون وحده.

---

# 80. Icons

يستخدم Icon Set واحد فقط.

الموصى به:

```text
Lucide
```

الأحجام:

```text
16px
20px
24px
```

---

# 81. Motion

```text
150–250ms
```

وتستخدم فقط لتوضيح الانتقال أو الحالة.

لا توجد Decorative Animation.

---

# 82. Breakpoints

```text
Mobile
< 768px

Tablet
768px–1023px

Desktop
>= 1024px
```

---

# 83. الأجهزة المرجعية للاختبار

```text
1440 × 900
1366 × 768
768 × 1024
390 × 844
360 × 800
```

---

# 84. Responsive Rule

لا يتم:

```text
Shrink Desktop
```

بل:

```text
Recompose UX
```

حسب الجهاز.

---

# 85. الحالة التقنية مقابل النص العربي

الحالات التقنية لا تظهر للمستخدم.

مثال:

```text
ACTIVE_PLAN
→ معتمدة

OVERDUE
→ متأخر

ACHIEVED
→ مكتمل

FINANCIALLY_UNREALISTIC
→ غير واقعي ماليًا
```

---

# 86. Security UX

لا تعرض:

* Internal IDs.
* Database IDs.
* Auth IDs.
* Debug data.
* Raw API errors.
* SQL errors.
* Stack traces.

---

# 87. Data Refresh UX

بعد أي عملية ناجحة يجب تحديث القيم المرتبطة بها.

مثال تسجيل مصروف:

```text
Transaction List
Budget Actual
Budget Remaining
Safe To Spend
Daily Safe Limit
Forecast
Recommendation Evaluation
```

ويجب ألا تظهر أجزاء من الصفحة بأرقام قديمة وأخرى جديدة.

---

# 88. Financial Consistency

يمنع وجود:

```text
Safe To Spend = 2,000
```

في Dashboard و:

```text
Safe To Spend = 1,850
```

في صفحة أخرى لنفس اللحظة.

كل الواجهات تستخدم نفس Read Model / Financial Engine output.

---

# 89. Success State Principle

بعد الإجراءات المالية المهمة يعرض النظام:

```text
العملية
+
أثرها المالي
```

وليس:

```text
تم الحفظ
```

فقط.

---

# 90. Confirmation Matrix

Confirmation مطلوب لـ:

```text
اعتماد خطة
اعتماد Revision
إغلاق دورة
عكس عملية
إلغاء هدف
سحب طوارئ
```

غير مطلوب لـ:

```text
عرض التفاصيل
البحث
التصفية
التنقل
فتح توصية
```

---

# 91. Destructive Actions

تستخدم:

```text
Danger Variant
```

فقط إذا كان الإجراء:

* عكس.
* إلغاء.
* إغلاق نهائي.
* تعطيل له أثر واضح.

---

# 92. Component Inventory

المكونات الأساسية:

```text
AppShell
Sidebar
BottomNavigation
TopBar
PageHeader

FinancialHeroCard
MetricCard
ForecastCard
RecommendationCard
CycleCard

BudgetSummary
BudgetDistribution
BudgetCategoryRow
BudgetCategoryCard

TransactionTable
TransactionListItem
TransactionForm
TransactionDetails

ObligationCard
SavingSummary
EmergencySummary
GoalCard

StatusBadge
ProgressBar

MoneyInput
DateInput
Select
SearchSelect
SegmentedControl
Textarea

Modal
BottomSheet
ConfirmDialog

EmptyState
LoadingSkeleton
ErrorState
SuccessState
```

---

# 93. Component Reuse Rule

قبل إنشاء Component جديد:

```text
هل يوجد Component حالي يؤدي نفس الوظيفة؟
```

إذا نعم:

يستخدم Variant.

ولا ينشأ مكون جديد لتغيير بسيط في الشكل.

---

# 94. Component Quality Requirements

كل Component يجب أن يملك:

```text
Purpose
Variants
States
RTL Behavior
Desktop Behavior
Mobile Behavior
Accessibility
Loading
Disabled
Error عند الحاجة
```

---

# 95. Visual Regression

الشاشات الحرجة يجب أن تدخل لاحقًا في Visual Regression Tests:

```text
Dashboard Desktop
Dashboard Mobile
Add Expense
Budget
Transactions
Obligations
Goals
Advisor
```

---

# 96. الحالات المطلوب بناؤها فعليًا

لا تعتبر الصفحة مكتملة بHappy Path فقط.

يجب دعم:

```text
Loading
Empty
Error
Success
Disabled
No Permission عند الحاجة مستقبلًا
No Active Cycle
Deficit Risk
Overdue
AI Failure
```

---

# 97. نقاط غير محسومة لا تزال معلقة

لا يتم اختراع تصميم نهائي لـ:

```text
Financial Health Score
Required Financial Buffer
Emergency Months Coverage
```

حتى اعتماد المعادلات المرتبطة بها.

---

# 98. Definition of UI Done

واجهة أي Feature لا تعتبر مكتملة حتى:

```text
Desktop
✓

Mobile
✓

RTL
✓

Loading
✓

Empty
✓

Error
✓

Success
✓

Validation
✓

Accessibility
✓

Responsive
✓

Business Rule Alignment
✓

State Machine Alignment
✓

No duplicate information
✓

No raw technical state exposed
✓
```

---

# 99. Definition of Final UI Integrity

الواجهة النهائية تعتبر سليمة إذا:

1. يعرف المستخدم فورًا كم يستطيع الصرف.
2. Safe To Spend أوضح من الرصيد البنكي.
3. يستطيع تسجيل المصروف بسرعة.
4. يعرف أثر العملية بعد تنفيذها.
5. لا تختلط القيم الفعلية والمتوقعة.
6. لا تختلط القيم المخصصة والمنفذة.
7. لا يوجد حذف صامت للعمليات المالية.
8. المستشار يشرح ولا يتحكم.
9. الجوال مصمم كجوال.
10. Desktop يستفيد من المساحة.
11. جميع الحالات المهمة مصممة.
12. RTL سليم.
13. التصميم موحد.
14. الأرقام المالية تأتي من مصدر واحد.
15. كل واجهة تساعد على فهم أو قرار أو إجراء.

---

# 100. قاعدة الحوكمة النهائية

أي تعديل UI بعد اعتماد هذه الوثيقة يجب تصنيفه أولًا:

```text
Visual Only
UX Behavior
Business Logic
Financial Logic
Data Model
State Transition
```

إذا تجاوز:

```text
Visual Only
```

يجب مراجعة المرجع الأعلى المتأثر قبل التنفيذ.

ولا يجوز استخدام التصميم كطريقة لتجاوز قواعد النظام.
