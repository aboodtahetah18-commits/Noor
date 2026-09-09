# VISUAL_PROTOTYPE.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

---

# 1. هدف المرحلة

تحويل:

```text
SYSTEM_MASTER
+
WORKFLOWS
+
BUSINESS_RULES
+
STATE_MACHINES
+
DATA_MODEL
+
ARCHITECTURE
+
UX_ARCHITECTURE
+
DESIGN_SYSTEM
+
WIREFRAMES
```

إلى نموذج بصري موحد يمكن مراجعته قبل البرمجة.

الـVisual Prototype لا يملك صلاحية تغيير:

* Business Rules.
* Workflows.
* State Machines.
* المعنى المالي للبيانات.
* مصدر الحقيقة.
* الحقول الإلزامية.

إذا كشف التصميم مشكلة في أي منها، يتم الرجوع إلى المرجع الأصلي وتحديثه أولًا.

---

# 2. استراتيجية بناء Prototype

لا يتم تصميم جميع شاشات النظام دفعة واحدة.

يتم البناء على أربع جولات:

```text
ROUND 1
Core Experience

ROUND 2
Financial Management

ROUND 3
Advisor + Reporting

ROUND 4
States + Edge Cases
```

---

# 3. ROUND 1 — Core Experience

يتم تصميم أهم تجربة في النظام أولًا.

الشاشات:

```text
VP-001 Dashboard Desktop
VP-002 Dashboard Mobile
VP-003 Quick Add Mobile
VP-004 Add Expense Mobile
VP-005 Add Expense Desktop
VP-006 Expense Success
```

هذه الجولة يجب اعتمادها قبل استكمال بقية النظام.

---

# 4. لماذا نبدأ بهذه الشاشات؟

لأن الاستخدام اليومي الأساسي هو:

```text
فتح النظام
↓
معرفة Safe To Spend
↓
تسجيل مصروف
↓
معرفة أثر المصروف
```

إذا لم تكن هذه التجربة ممتازة، فلن تنجح بقية المنصة مهما كان تصميمها جيدًا.

---

# 5. VP-001 — Dashboard Desktop

## هدف الشاشة

الإجابة خلال أقل وقت ممكن عن:

```text
كم أستطيع أن أصرف؟
هل هناك خطر؟
ماذا يجب أن أفعل الآن؟
```

---

# 6. الهيكل العام Desktop

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar │ Header                                                     │
│         │                                                            │
│         │ Financial Status                                           │
│         │                                                            │
│         │ Safe To Spend Hero                                         │
│         │                                                            │
│         │ KPI Strip                                                  │
│         │                                                            │
│         │ Forecast             Advisor                               │
│         │                                                            │
│         │ Upcoming Obligations                                       │
│         │                                                            │
│         │ Savings      Emergency      Goals                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

# 7. Desktop Sidebar

يظهر في الجهة المناسبة لاتجاه RTL.

يحتوي:

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

الإعدادات
```

المبدأ:

```text
Navigation
≠
Decoration
```

ولا تستخدم خلفية ثقيلة أو تأثيرات مبالغ فيها.

---

# 8. Desktop Header

يعرض:

```text
الرئيسية
```

مع سياق زمني ثانوي:

```text
دورة سبتمبر 2026
```

والإجراء الرئيسي:

```text
+ إضافة عملية
```

---

# 9. Financial Hero

يجب أن يكون أكبر عنصر بصري في الصفحة.

المحتوى:

```text
المتاح الآمن للصرف

2,140 ريال

حتى الراتب القادم

71 ريال يوميًا
```

مع توضيح ثانوي:

```text
إجمالي السيولة: 8,200 ريال
```

لكن:

```text
8,200
```

لا يجب أن ينافس بصريًا:

```text
2,140
```

---

# 10. Hero Visual Hierarchy

الترتيب:

```text
Label
↓
Safe To Spend Amount
↓
Time Context
↓
Daily Safe Limit
↓
Liquidity Context
```

---

# 11. KPI Strip

يحتوي فقط على:

```text
دخل الدورة
10,000 ريال

المصروف
3,460 ريال

المتبقي من الميزانية
2,540 ريال

نسبة الادخار
7%
```

ويمنع زيادة عدد البطاقات بلا حاجة.

---

# 12. Forecast Card

العنوان:

```text
التوقع حتى الراتب القادم
```

المحتوى:

```text
إذا استمر معدل الإنفاق الحالي

المتوقع أن يتبقى:
860 ريال
```

مع Label واضح:

```text
متوقع
```

حتى لا يختلط بالفعلي.

---

# 13. Advisor Card

العنوان:

```text
المستشار المالي
```

التوصية:

```text
ميزانية المطاعم معرضة للتجاوز

استهلكت 94% من الميزانية
بينما مضى 45% من الدورة.
```

الإجراء:

```text
عرض التوصية
```

والإجراء المنخفض:

```text
تجاهل
```

---

# 14. Upcoming Obligations

يعرض أهم التزامات الدورة القادمة فقط.

مثال:

```text
قسط السيارة
1,200 ريال
بعد 3 أيام

فاتورة الإنترنت
250 ريال
بعد 6 أيام
```

الإجراء:

```text
عرض جميع الالتزامات
```

---

# 15. Financial Progress Area

ثلاثة أجزاء:

```text
الادخار
الطوارئ
الأهداف
```

مثال:

```text
الادخار
700 / 1,000 ريال

صندوق الطوارئ
12,000 / 30,000 ريال

شراء سيارة
12,000 / 50,000 ريال
```

---

# 16. Desktop Layout Priority

عند شاشة عريضة:

```text
Hero
12 columns
```

ثم:

```text
Forecast
6 columns

Advisor
6 columns
```

ثم:

```text
Upcoming Obligations
7–8 columns

Progress
4–5 columns
```

ولا تجعل كل شيء شبكة بطاقات متساوية.

---

# 17. VP-002 — Dashboard Mobile

الجوال له ترتيب مستقل.

---

# 18. Mobile Hierarchy

```text
Top Header
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
Upcoming Obligations
↓
Budget Summary
↓
Savings / Emergency / Goals
↓
Bottom Navigation
```

---

# 19. Mobile Header

```text
الرئيسية

Notification Icon
```

ولا يحتوي شريطًا علويًا ضخمًا.

---

# 20. Safe To Spend Mobile

يعرض:

```text
المتاح الآمن للصرف

2,140 ريال

حتى الراتب القادم

71 ريال يوميًا
```

ويجب أن يكون مرئيًا دون Scroll عند فتح الصفحة في الحالات الطبيعية.

---

# 21. Primary Action Mobile

بعد Hero مباشرة:

```text
+ إضافة عملية
```

زر واضح وكامل العرض أو شبه كامل العرض.

---

# 22. Advisor Mobile

إذا كانت هناك توصية ذات أولوية:

```text
تنبيه من المستشار

ميزانية المطاعم معرضة للتجاوز

عرض التوصية
```

---

# 23. Cycle Context Mobile

بطاقة صغيرة:

```text
دورة سبتمبر 2026

الراتب القادم
27 سبتمبر

المتبقي
25 يومًا
```

---

# 24. Upcoming Obligation Mobile

لا تعرض قائمة طويلة.

مثال:

```text
الالتزام القادم

قسط السيارة
1,200 ريال

بعد 3 أيام
```

مع:

```text
عرض الكل
```

---

# 25. Budget Summary Mobile

```text
الميزانية

المخطط
6,000 ريال

المصروف
3,460 ريال

المتبقي
2,540 ريال
```

---

# 26. Savings Mobile

```text
الادخار

700 / 1,000 ريال

70%
```

مع Progress Bar.

---

# 27. Emergency Mobile

```text
صندوق الطوارئ

12,000 / 30,000 ريال

40%
```

---

# 28. Goal Mobile

```text
شراء سيارة

12,000 / 50,000 ريال

24%
```

---

# 29. Bottom Navigation

العناصر:

```text
الرئيسية
الميزانية
إضافة
المستشار
المزيد
```

العنصر الأوسط:

```text
إضافة
```

يحصل على أولوية واضحة دون أن يتحول إلى عنصر بصري مبالغ فيه.

---

# 30. VP-003 — Quick Add Mobile

عند الضغط على:

```text
إضافة
```

يفتح Bottom Sheet.

المحتوى:

```text
إضافة عملية

مصروف
دخل
تحويل
استرداد
```

ويجب أن يكون:

* سريعًا.
* واضحًا.
* يمكن إغلاقه بالسحب أو زر الإغلاق.
* لا يغطي الصفحة بطريقة مربكة.

---

# 31. ترتيب Quick Add

أعلى أولوية:

```text
مصروف
```

ثم:

```text
دخل
تحويل
استرداد
```

لأن تسجيل المصروف هو الاستخدام اليومي الأكثر تكرارًا وفق التدفق الحالي.

---

# 32. VP-004 — Add Expense Mobile

هذه من أهم شاشات النظام.

الهدف:

```text
تسجيل مصروف بأقل احتكاك ممكن
```

---

# 33. Expense Mobile Layout

```text
إضافة مصروف

المبلغ
[ 250 ] ريال

البند
[ المطاعم ]

الحساب
[ الحساب الجاري ]

التاريخ
[ اليوم ]

الخطة
[ مخطط ] [ غير مخطط ]

طبيعة المصروف
[ ضروري ]
[ مهم ]
[ اختياري ]
[ ترفيهي ]
[ غير مخطط ]

الوصف
[ اختياري ]

[ تسجيل المصروف ]
```

---

# 34. Money Input

المبلغ يجب أن يحصل على أولوية قوية.

يكون:

```text
Large Numeric Input
```

وليس حقل نص عادي.

---

# 35. Category Selection

يتبع قاعدة:

```text
Select First
Type When Necessary
```

بعد الاختيار:

```text
المطاعم
×
```

ويختفي حقل البحث حتى يقرر المستخدم تغيير الاختيار.

---

# 36. Account Selection

نفس القاعدة:

```text
الحساب الجاري
×
```

ولا يعرض اسم الحساب مرتين في النافذة.

---

# 37. Date

القيمة الافتراضية:

```text
اليوم
```

مع إمكانية التغيير.

---

# 38. Planning Status

يستخدم:

```text
Segmented Control
```

```text
مخطط
غير مخطط
```

وليس Dropdown.

---

# 39. Expense Nature

إذا كانت المساحة لا تسمح بخمسة أزرار في صف واحد:

لا يتم تصغير النص.

يستخدم تصميم:

```text
2 rows
```

أو Picker مناسب.

---

# 40. Save Button

الزر:

```text
تسجيل المصروف
```

الحالات:

```text
Default
Loading
Disabled
```

عند Loading:

```text
جاري التسجيل...
```

ويمنع الضغط المكرر.

---

# 41. VP-005 — Add Expense Desktop

تستخدم نافذة مركزة أو Form Panel.

الترتيب:

```text
المبلغ          التاريخ

البند           الحساب

مخطط/غير مخطط   طبيعة المصروف

الوصف
```

الإجراءات:

```text
تسجيل المصروف
إلغاء
```

---

# 42. VP-006 — Expense Success

بعد نجاح تسجيل المصروف لا يكتفى بـToast.

يعرض:

```text
تم تسجيل المصروف

250 ريال
```

ثم أهم أثر:

```text
المتاح الآمن الآن

1,890 ريال
```

وسياق:

```text
قبل العملية
2,140 ريال
```

---

# 43. إذا ولّد المصروف خطر عجز

يظهر:

```text
تم تسجيل المصروف

لكن يوجد تنبيه مهم

العجز المتوقع
310 ريال
```

الإجراء:

```text
مراجعة الوضع
```

---

# 44. ROUND 1 Acceptance Criteria

لا تعتمد الجولة الأولى إلا إذا:

* Safe To Spend واضح خلال أول نظرة.
* لا يختلط Balance مع Safe To Spend.
* تسجيل المصروف سريع.
* الأثر بعد الحفظ واضح.
* Desktop غير مزدحم.
* Mobile لا يستخدم Sidebar.
* المستشار ظاهر لكن لا يسيطر على الصفحة.
* جميع النصوص RTL صحيحة.
* الأزرار الأساسية واضحة.
* لا يوجد تكرار للمعلومات.
* لا توجد رسوم بيانية غير ضرورية.

---

# 45. ROUND 2 — Financial Management

بعد اعتماد الجولة الأولى، يتم تصميم:

```text
VP-020 Budget Desktop
VP-021 Budget Mobile

VP-030 Transactions Desktop
VP-031 Transactions Mobile
VP-032 Transaction Details

VP-040 Obligations Desktop
VP-041 Obligations Mobile
VP-042 Pay Obligation

VP-050 Savings
VP-060 Emergency Fund

VP-070 Goals Desktop
VP-071 Goals Mobile
VP-072 Goal Details
```

---

# 46. Budget Visual Principle

الصفحة تجيب:

> كيف تم توزيع الدخل؟ وهل الصرف الفعلي يسير وفق الخطة؟

ولا تتحول إلى Spreadsheet.

---

# 47. Budget Desktop

الترتيب:

```text
Page Header
↓
Budget Summary
↓
Salary Allocation
↓
Budget Categories
↓
Contextual Advisor
```

---

# 48. Salary Allocation Visual

يمكن تمثيل التوزيع باستخدام:

```text
Stacked Horizontal Distribution
```

أو List واضحة.

لكن يجب دائمًا ظهور القيم الرقمية.

لا تعتمد على الرسم وحده.

---

# 49. Category Desktop

الحقول:

```text
البند
المخطط
الفعلي
المتبقي
الاستخدام
الحالة
```

---

# 50. Category Mobile

Card:

```text
المطاعم
معرض للتجاوز

470 / 500 ريال

94%

المتبقي
30 ريال
```

---

# 51. Transactions Desktop

يستخدم Table لأنه مناسب للبيانات التاريخية.

لا يتم استخدام Cards كبيرة لكل عملية على Desktop.

---

# 52. Transactions Mobile

يستخدم:

```text
Compact List Cards
```

مثال:

```text
مطاعم                -85 ريال
اليوم، 8:40 م

المطاعم
الحساب الجاري
```

---

# 53. Obligations

الأولوية:

```text
OVERDUE
↓
DUE
↓
UPCOMING
↓
PAID
```

ولا يتم ترتيبها فقط حسب تاريخ الإنشاء.

---

# 54. Savings Visual

يجب أن يظهر الفرق بين:

```text
المخطط
المخصص
المحول فعليًا
```

بوضوح.

---

# 55. Emergency Visual

يعرض:

```text
Current
Target
Progress
Contribution
Withdrawals
```

ولا نعرض عدد الأشهر المغطاة بقيمة فعلية حتى حسم المعادلة المرتبطة بها.

---

# 56. Goals Visual

كل Goal Card يجب أن يعطي فورًا:

```text
ما الهدف؟
كم وصلت؟
كم بقي؟
متى؟
هل الخطة واقعية؟
```

---

# 57. ROUND 3 — Advisor + Reporting

الشاشات:

```text
VP-080 Advisor Desktop
VP-081 Advisor Mobile
VP-082 Recommendation Details

VP-090 Reports
VP-091 Cycle Report
VP-092 Historical Comparison
```

---

# 58. Advisor Visual Principle

المستشار ليس:

```text
ChatGPT Clone
```

ولا واجهة محادثة طويلة.

بل:

```text
Priority Feed
+
Financial Insights
+
Recommendations
```

---

# 59. Advisor Priority

الترتيب:

```text
Deficit Risk
Overdue Obligation
Upcoming Obligation
Safe To Spend Risk
Savings / Emergency
Goals
Spending Optimization
Positive Feedback
```

---

# 60. Recommendation Card

تحتوي:

```text
نوع التوصية
العنوان
السبب
أرقام داعمة
التفسير
الإجراء
```

---

# 61. Explanation Layer

يجب وجود:

```text
لماذا ظهرت هذه التوصية؟
```

بشكل واضح.

---

# 62. Reports Visual Principle

التقارير ليست نسخة من Dashboard.

هدفها:

```text
Understand Past Performance
```

وليس:

```text
Manage Today
```

---

# 63. Cycle Report

يعرض:

```text
Expected vs Actual Income
Planned vs Actual Expense
Planned vs Actual Saving
Surplus / Deficit
Unplanned Spending
Category Variance
Goal Contributions
Emergency Activity
Advisor Summary
```

---

# 64. Historical Comparison

تعتمد فقط على:

```text
CLOSED Cycles
```

ولا تعرض فترة لا تتوفر لها بيانات كافية.

---

# 65. ROUND 4 — System States

يتم تصميم الحالات التالية:

```text
No Active Cycle
Draft Plan
Active Plan
Revised Plan
Safe To Spend = 0
Deficit Risk
Overdue Obligation
No Transactions
No Goals
No Recommendations
Emergency Depleted
Goal Unrealistic
Goal Achieved
Loading
Error
AI Failure
Session Expired
```

---

# 66. Deficit Dashboard

عند وجود:

```text
DEFICIT_RISK
```

يجب أن تتغير Hierarchy.

الجزء الأول يصبح:

```text
عجز متوقع

740 ريال

قبل الراتب القادم

راجع الخطة الآن
```

ثم Safe To Spend:

```text
0 ريال
```

ولا يتم إخفاء العجز بمجرد أن Safe To Spend أصبح صفرًا.

---

# 67. Overdue Obligation State

إذا يوجد التزام متأخر:

يظهر في أعلى الأولويات:

```text
التزام متأخر

فاتورة ...
250 ريال

متأخرة منذ يومين

[ تسجيل السداد ]
```

---

# 68. Empty Dashboard

لا يعرض:

```text
0
0
0
0
```

بل:

```text
ابدأ أول دورة مالية

وزع دخلك واعرف المبلغ الآمن للصرف.

[ بدء دورة مالية ]
```

---

# 69. Loading

يستخدم:

```text
Skeleton
```

بنفس بنية المحتوى.

ولا تعرض الصفحة بيضاء.

---

# 70. Error

مثال:

```text
تعذر تحميل بياناتك المالية.

لم يتم إجراء أي تغيير.

[ إعادة المحاولة ]
```

---

# 71. AI Failure

يظل:

```text
Safe To Spend
Budget
Transactions
Goals
Obligations
```

يعمل.

وتظهر فقط:

```text
تعذر إنشاء الشرح الذكي حاليًا.
```

---

# 72. Visual Prototype Devices

يجب اختبار التصميم على الأقل على:

```text
Desktop:
1440 × 900

Laptop:
1366 × 768

Tablet:
768 × 1024

Mobile:
390 × 844

Small Mobile:
360 × 800
```

---

# 73. RTL QA

يتم فحص:

```text
Sidebar
Bottom Navigation
Tables
Forms
Numbers
Currency
Chevrons
Back Buttons
Date Pickers
Bottom Sheets
Dialogs
Progress
```

بشكل منفصل.

---

# 74. Financial QA أثناء التصميم

في كل شاشة يتم السؤال:

```text
هل الفعلي واضح؟
هل المتوقع واضح؟
هل المخطط واضح؟
هل المخصص واضح؟
هل المحول فعليًا واضح؟
هل Safe To Spend أوضح من Balance؟
هل أي رقم يمكن فهمه بشكل خاطئ؟
```

---

# 75. Visual Consistency QA

يتم فحص:

```text
Typography
Spacing
Radius
Borders
Button Height
Input Height
Icon Size
Card Padding
Section Spacing
Status Styles
```

---

# 76. Interaction QA

يتم اختبار:

```text
Hover
Focus
Pressed
Disabled
Loading
Error
Success
```

---

# 77. لا تعتمد الألوان النهائية بعد

الألوان الموجودة في:

```text
DESIGN_SYSTEM.md
```

ما زالت Proposal.

لذلك أثناء Prototype يمكن استخدامها لاختبار النظام البصري، لكن لا تصبح نهائية حتى المراجعة البصرية.

---

# 78. Prototype Review Questions

بعد الجولة الأولى يجب الإجابة عن:

1. هل الصفحة تبدو كمنتج مالي احترافي؟
2. هل أعرف فورًا كم يمكنني الصرف؟
3. هل Safe To Spend أوضح من Balance؟
4. هل أعرف الإجراء التالي؟
5. هل المستشار مفيد أم مزعج؟
6. هل يوجد ازدحام؟
7. هل هناك معلومة مكررة؟
8. هل التسجيل اليومي سريع؟
9. هل الجوال مريح بيد واحدة؟
10. هل Desktop يستفيد فعليًا من المساحة؟
11. هل اللغة العربية طبيعية؟
12. هل RTL سليم؟
13. هل التصميم يبدو نظامًا واحدًا وليس صفحات منفصلة؟

---

# 79. Prototype Approval Gate

لا ننتقل إلى:

```text
FINAL_UI_SPEC.md
```

حتى تعتمد بصريًا:

```text
Dashboard Desktop
Dashboard Mobile
Quick Add
Expense Form
Expense Success
```

لأن هذه الشاشات تحدد لغة المنتج كاملة.

---

# 80. المرحلة التالية بعد الاعتماد

```text
VISUAL PROTOTYPE
↓
VISUAL REVIEW
↓
REVISIONS
↓
FINAL_UI_SPEC.md
```

ثم:

```text
API_CONTRACTS.md
DATABASE_SCHEMA.md
TEST_PLAN.md
IMPLEMENTATION_PLAN.md
```

قبل بدء Production Development.

---

# 81. قاعدة الحوكمة النهائية

لا يتم اعتماد أي اختيار بصري لأنه:

```text
جميل فقط
```

بل يجب أن يحقق واحدًا أو أكثر من:

```text
Clarity
Decision
Action
Safety
Speed
Consistency
Accessibility
```

ويعتبر أي تصميم يضع الجمال على حساب وضوح القرار المالي تصميمًا مرفوضًا.
