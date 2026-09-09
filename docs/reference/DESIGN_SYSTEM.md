# DESIGN_SYSTEM.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

---

# 1. الهدف من الوثيقة

تحدد هذه الوثيقة النظام البصري والوظيفي لواجهات المنصة.

وتشمل:

* الهوية البصرية.
* الخطوط.
* الألوان.
* المسافات.
* المقاسات.
* الشبكات.
* البطاقات.
* الأزرار.
* الحقول.
* الجداول.
* القوائم.
* النوافذ.
* حالات النظام.
* حالات التحميل.
* حالات الخطأ.
* حالات النجاح.
* قواعد Desktop.
* قواعد Mobile.
* قواعد RTL.
* إمكانية الوصول Accessibility.

الهدف هو منع تصميم كل شاشة بطريقة مختلفة، وبناء واجهة موحدة وقابلة للتوسع.

---

# 2. فلسفة التصميم

التصميم المطلوب:

```text
هادئ
مالي
احترافي
واضح
حديث
موثوق
مريح
غير مزدحم
```

ولا يجب أن يكون:

```text
صاخب
مليئًا بالتدرجات
مليئًا بالرسوم
مبالغًا في المؤثرات
شبيهًا بتطبيق محاسبي تقليدي
شبيهًا بمحادثة Chatbot فقط
```

---

# 3. شخصية المنتج

الشعور المطلوب للمستخدم:

> أعرف وضعي المالي الآن، وأعرف ماذا أفعل بعد ذلك.

لذلك التصميم يجب أن يعطي إحساس:

```text
Control
Clarity
Confidence
Guidance
```

---

# 4. المبدأ البصري الأول

أهم عنصر بصري في النظام هو:

```text
Safe To Spend
```

ولذلك يجب أن يحصل على أعلى Hierarchy في الصفحة الرئيسية.

ولا يجب أن ينافسه:

* الرصيد البنكي.
* عدد العمليات.
* الرسوم البيانية.
* مؤشرات ثانوية.

---

# 5. Visual Hierarchy

الترتيب البصري الأساسي:

```text
1. الإجراء أو الخطر الحالي
2. Safe To Spend
3. الحالة المالية الحالية
4. الالتزامات القادمة
5. توصية المستشار
6. الميزانية
7. الادخار والطوارئ والأهداف
8. التاريخ والتحليلات
```

---

# 6. اللغة

لغة الواجهة الأساسية:

```text
العربية
```

والاتجاه:

```text
RTL
```

---

# 7. الخط الأساسي

الخط المقترح للنظام:

```text
IBM Plex Sans Arabic
```

ويستخدم في جميع:

* العناوين.
* النصوص.
* الأرقام.
* الأزرار.
* الجداول.
* النوافذ.
* النماذج.

لا يستخدم أكثر من Typeface داخل المنتج دون سبب موثق.

---

# 8. Font Weights

المقترح:

```text
Regular      400
Medium       500
SemiBold     600
Bold         700
```

ويفضل عدم استخدام أوزان أكثر من ذلك.

---

# 9. Typography Scale

## Display

للقيم المالية الكبرى مثل Safe To Spend:

```text
Desktop:
32–40 px

Mobile:
28–34 px
```

---

## H1

عنوان الصفحة:

```text
Desktop:
28 px

Mobile:
24 px
```

---

## H2

عنوان القسم:

```text
22 px
```

---

## H3

عنوان بطاقة:

```text
18 px
```

---

## Body

```text
16 px
```

---

## Secondary Body

```text
14 px
```

---

## Caption

```text
12–13 px
```

ولا تستخدم أحجام صغيرة جدًا لبيانات مالية مهمة.

---

# 10. Line Height

النص العربي يحتاج مساحة رأسية مناسبة.

المقترح:

```text
Headings:
1.3 – 1.4

Body:
1.5 – 1.7
```

---

# 11. Color Strategy

لأن المصادر الحالية لم تعتمد هوية لونية رسمية محددة لهذا النظام، يجب اعتبار الألوان التالية **Design Proposal** حتى اعتمادها.

القاعدة:

```text
Neutral-first
+
Controlled semantic colors
+
One primary brand color
```

---

# 12. Primary Color

المقترح:

```text
Primary:
#2563EB
```

يستخدم في:

* الإجراءات الرئيسية.
* العنصر النشط.
* الروابط الأساسية.
* المؤشرات الإيجابية غير المحاسبية عند الحاجة.

لا يستخدم كلون خلفية لكل شيء.

---

# 13. Neutral Palette

المقترح:

```text
Neutral 950   #111827
Neutral 900   #1F2937
Neutral 700   #374151
Neutral 600   #4B5563
Neutral 500   #6B7280
Neutral 400   #9CA3AF
Neutral 300   #D1D5DB
Neutral 200   #E5E7EB
Neutral 100   #F3F4F6
Neutral 50    #F9FAFB
White         #FFFFFF
```

---

# 14. Success Color

المقترح:

```text
#16A34A
```

يستخدم في:

* مكتمل.
* مدفوع.
* هدف محقق.
* نتيجة إيجابية.

ولا يستخدم لمجرد زيادة الدخل بدون سياق.

---

# 15. Warning Color

المقترح:

```text
#D97706
```

يستخدم في:

* قرب تجاوز الميزانية.
* استحقاق قريب.
* حالة تحتاج انتباهًا.

---

# 16. Danger Color

المقترح:

```text
#DC2626
```

يستخدم في:

* عجز متوقع.
* التزام متأخر.
* تجاوز مؤكد.
* إجراء عكس أو إلغاء خطير.

---

# 17. Info Color

المقترح:

```text
#0284C7
```

يستخدم في:

* معلومات.
* توقعات.
* بيانات غير فعلية.
* التنبيهات التفسيرية.

---

# 18. Semantic Rule

لا يعتمد النظام على اللون وحده.

مثال:

ليس:

```text
●
```

فقط.

بل:

```text
متأخر
●
```

أو:

```text
⚠ معرض للتجاوز
```

---

# 19. Actual vs Projected

يجب أن يكون هناك فرق بصري ثابت بين:

```text
فعلي
متوقع
```

المقترح:

فعلي:

```text
Solid
Strong text
```

متوقع:

```text
Secondary background
Forecast icon / label
```

ولا يعتمد التفريق على اللون وحده.

---

# 20. Planned vs Actual

المصطلحات الثابتة:

```text
المخطط
الفعلي
المتبقي
```

لا تستبدل بـ:

```text
الهدف
الحالي
الباقي
```

في صفحة أخرى.

---

# 21. Allocated vs Transferred

المصطلحات:

```text
مخصص
محول فعليًا
```

ويجب أن يكون الفرق واضحًا بصريًا.

---

# 22. Spacing System

يعتمد النظام وحدة:

```text
4 px
```

Scale:

```text
4
8
12
16
20
24
32
40
48
64
```

---

# 23. Default Spacing

بين العناصر الصغيرة:

```text
8 px
```

بين الحقول:

```text
12–16 px
```

بين البطاقات:

```text
16–24 px
```

بين الأقسام:

```text
24–32 px
```

---

# 24. Page Padding

Desktop:

```text
24–32 px
```

Tablet:

```text
20–24 px
```

Mobile:

```text
16 px
```

---

# 25. Border Radius

يجب أن يكون موحدًا.

المقترح:

```text
Small      8 px
Medium     12 px
Large      16 px
Modal      16–20 px
```

لا تستخدم قيمًا مختلفة عشوائيًا لكل عنصر.

---

# 26. Shadows

تستخدم بشكل خفيف.

المبدأ:

```text
Border first
Shadow second
```

وتجنب:

* الظلال الثقيلة.
* Glow.
* Neumorphism.

---

# 27. Layout Grid — Desktop

المقترح:

```text
12-column grid
```

مع Max Content Width:

```text
1280–1440 px
```

حسب الشاشة.

---

# 28. Desktop App Shell

```text
Sidebar
+
Top Header
+
Main Workspace
```

ويمكن في بعض الصفحات:

```text
Main Workspace
+
Advisor Context Panel
```

---

# 29. Sidebar

عرض مقترح:

```text
240–272 px
```

يدعم:

```text
Expanded
Collapsed
```

---

# 30. Sidebar Item

يحتوي:

```text
Icon
Label
Active State
Optional Badge
```

ولا يحتوي أكثر من عنصر بصري دون حاجة.

---

# 31. Mobile App Shell

الجوال:

```text
Top Bar
+
Scrollable Content
+
Bottom Navigation
```

ولا يستخدم Sidebar Desktop.

---

# 32. Bottom Navigation

خمسة عناصر كحد أعلى:

```text
الرئيسية
الميزانية
إضافة
المستشار
المزيد
```

---

# 33. Mobile Touch Targets

أي عنصر قابل للنقر يجب ألا يقل تقريبًا عن:

```text
44 × 44 px
```

---

# 34. App Header

Desktop يمكن أن يحتوي:

```text
Page Title
Subtitle
Primary Action
Secondary Action
```

Mobile:

```text
Page Title
Primary Action
```

مع تخفيض العناصر الثانوية.

---

# 35. PageHeader

المكون:

```text
PageHeader
```

يتضمن:

* عنوان.
* وصف مختصر عند الحاجة.
* الإجراء الرئيسي.
* الإجراءات الثانوية.

---

# 36. FinancialHeroCard

أهم Component في Dashboard.

يتضمن:

```text
المبلغ الآمن للصرف
القيمة
حتى متى؟
الحد اليومي
التفسير
```

مثال:

```text
المتاح الآمن للصرف

2,140 ريال

حتى الراتب القادم

71 ريال يوميًا
```

---

# 37. Hero Card Priority

يجب أن تكون القيمة:

```text
أكبر عنصر نصي في الصفحة
```

ويجب ألا يوضع بجانبها 5 أرقام بنفس الحجم.

---

# 38. MetricCard

تستخدم للمؤشرات الثانوية:

```text
دخل الدورة
المصروف
المتبقي
نسبة الادخار
```

---

# 39. MetricCard Structure

```text
Label
Value
Optional Context
Optional Trend
```

ولا تحتوي Chart صغيرًا افتراضيًا إلا إذا كان له معنى.

---

# 40. Card System

أنواع البطاقات:

```text
Standard Card
Interactive Card
Alert Card
Summary Card
Financial Hero Card
```

---

# 41. Standard Card

تستخدم للمحتوى العادي.

```text
Background:
White

Border:
Neutral 200

Radius:
12–16 px
```

---

# 42. Interactive Card

يجب أن يظهر أنها قابلة للنقر عبر:

* Cursor.
* Hover.
* Focus.
* Chevron عند الحاجة.

ولا تعتمد على الظل فقط.

---

# 43. Alert Card

تستخدم للمخاطر أو التوصيات.

المحتوى أهم من اللون.

تحتوي:

```text
Icon
Title
Message
Supporting Data
Action
```

---

# 44. RecommendationCard

تحتوي:

```text
نوع التوصية
العنوان
الشرح
الأرقام الداعمة
سبب ظهورها
الإجراء المقترح
```

---

# 45. Recommendation Priority

الأولوية البصرية حسب:

```text
خطر عجز
التزامات متأخرة
التزامات قريبة
Safe To Spend
ادخار وطوارئ
أهداف
تحسينات
```

---

# 46. Button System

الأنواع الأساسية:

```text
Primary
Secondary
Tertiary
Danger
Icon
```

---

# 47. Primary Button

يستخدم لإجراء رئيسي واحد في السياق.

مثال:

```text
إضافة مصروف
اعتماد الخطة
تسجيل السداد
```

---

# 48. Secondary Button

لإجراء مهم لكنه ليس الأساسي.

مثل:

```text
عرض التفاصيل
تعديل
```

---

# 49. Tertiary Button

إجراء منخفض الأولوية:

```text
تجاهل
إلغاء
عودة
```

---

# 50. Danger Button

فقط للأفعال الخطيرة:

```text
عكس العملية
إلغاء الهدف
إغلاق الدورة
```

ولا يستخدم كزر أحمر لكل عملية خروج.

---

# 51. Button Sizes

المقترح:

```text
Small:
32–36 px

Medium:
40–44 px

Large:
48 px
```

الجوال يعتمد غالبًا:

```text
44–48 px
```

---

# 52. Button States

كل زر يجب أن يدعم:

```text
Default
Hover
Pressed
Focus
Disabled
Loading
```

---

# 53. Loading Button

عند الحفظ:

```text
جاري الحفظ...
```

ويعطل الزر لمنع التكرار.

---

# 54. Forms

المبدأ:

```text
Select First
Type When Necessary
```

قدر الإمكان.

---

# 55. Input Height

Desktop:

```text
40–44 px
```

Mobile:

```text
44–48 px
```

---

# 56. Input Structure

```text
Label
Input
Helper Text
Error Text
```

ولا يعتمد النظام على Placeholder بدل Label.

---

# 57. Required Fields

لا تملأ الواجهة بعلامات نجمة.

يمكن:

```text
إظهار "اختياري" للحقول الاختيارية
```

وجعل الباقي مطلوبًا ضمنيًا في السياق.

---

# 58. Money Input

يجب أن يكون واضحًا أنه مبلغ.

مثال:

```text
1,250
ريال
```

ولا تدمج العملة داخل الرقم المخزن.

---

# 59. Number Formatting

العرض:

```text
2,140 ريال
```

أو:

```text
2,140.50 ريال
```

عند الحاجة.

التخزين والحساب مستقلان عن تنسيق العرض.

---

# 60. Date Inputs

يجب استخدام مكون تاريخ واضح.

وعرض:

```text
تاريخ العملية
```

منفصلًا عن:

```text
وقت التسجيل
```

---

# 61. Select

القائمة المنسدلة تستخدم عند وجود مجموعة خيارات محدودة.

مثال:

```text
الحساب
البند
نوع المصروف
```

---

# 62. Single Select Pattern

بعد اختيار عنصر واحد:

```text
اختيار
↓
إخفاء البحث
↓
إظهار العنصر المختار
```

ولا يبقى اسم العنصر مكررًا في نفس السياق.

---

# 63. Checkbox

يستخدم فقط للـBoolean الحقيقي.

ولا يستخدم لاختيار نوع العملية إذا كان Radio أو Segmented Control أوضح.

---

# 64. Radio / Segmented Control

مناسب لـ:

```text
مخطط / غير مخطط
```

أو خيارات صغيرة متبادلة.

---

# 65. Textarea

يستخدم لـ:

```text
الوصف
سبب السحب
سبب تعديل الخطة
```

ولا يكون بحجم ضخم افتراضيًا.

---

# 66. Validation

يجب أن تكون الرسالة بجانب الحقل.

مثال:

```text
أدخل مبلغًا أكبر من صفر.
```

وليس فقط:

```text
حدث خطأ.
```

---

# 67. Inline Validation

لا تظهر أخطاء قبل تفاعل المستخدم مع الحقل إلا إذا كان هناك سبب واضح.

---

# 68. Transaction Form — Mobile

ترتيب:

```text
المبلغ
البند
الحساب
التاريخ
مخطط / غير مخطط
طبيعة المصروف
الوصف
```

---

# 69. Transaction Form — Desktop

يمكن توزيع:

```text
المبلغ + التاريخ
البند + الحساب
مخطط/غير مخطط + الطبيعة
الوصف كامل العرض
```

---

# 70. Tables — Desktop

تستخدم في:

* العمليات.
* التقارير.
* بعض الالتزامات.

ويجب أن تدعم:

```text
Header
Sorting
Pagination
Row Hover
Keyboard Focus
```

---

# 71. Tables — Mobile

لا يتم ضغط جدول Desktop داخل شاشة صغيرة.

يتم تحويل الصفوف إلى:

```text
Cards
```

أو List Rows مناسبة.

---

# 72. Table Density

لا تستخدم جداول كثيفة جدًا.

Minimum row height تقريبًا:

```text
44–48 px
```

---

# 73. StatusBadge

المكون:

```text
StatusBadge
```

يعرض:

```text
Icon optional
Label
Semantic Color
```

---

# 74. Status Examples

```text
مسودة
نشط
متأخر
مدفوع
مكتمل
متجاوز
غير واقعي ماليًا
```

---

# 75. Progress Bar

يستخدم في:

* الأهداف.
* الطوارئ.
* الميزانية.

لكن لا يستخدم كعنصر زخرفي.

---

# 76. Goal Progress

يعرض:

```text
12,000 / 50,000
24%
```

مع Progress Bar.

---

# 77. Budget Progress

يعرض:

```text
المصروف / المخطط
```

ويجب توضيح الحالات:

```text
ضمن الخطة
معرض للتجاوز
متجاوز
```

---

# 78. Over 100%

إذا تجاوزت الميزانية:

لا تتوقف Progress Bar عند 100% وتخفي التجاوز.

يجب عرض:

```text
112%
```

أو:

```text
تجاوز بـ120 ريال
```

---

# 79. Modal

Desktop يستخدم Modal عند الحاجة.

مثل:

```text
تأكيد اعتماد الخطة
عكس عملية
تسجيل السداد
```

---

# 80. Mobile Dialog Pattern

الجوال يفضل:

```text
Bottom Sheet
```

للإجراءات البسيطة.

أما العمليات المعقدة:

```text
Full Screen Flow
```

---

# 81. ConfirmDialog

يجب أن يحتوي:

```text
عنوان واضح
شرح الأثر
الزر الأساسي
الإلغاء
```

---

# 82. Destructive Confirmation

مثال:

```text
عكس العملية؟

سيتم إنشاء عملية عكس ولن يتم حذف العملية الأصلية.
```

---

# 83. EmptyState

يتكون من:

```text
Icon / Illustration optional
Title
Short explanation
Primary action
```

---

# 84. Empty State Rule

لا تعرض:

```text
0
0%
0 ريال
```

في عشر بطاقات فارغة.

اعرض:

```text
ابدأ أول دورة مالية
```

---

# 85. LoadingState

استخدم:

```text
Skeleton
```

للصفحات والبطاقات.

---

# 86. Loading Rule

لا تستخدم Spinner واحدًا وسط صفحة كاملة إذا كان Skeleton أوضح.

---

# 87. ErrorState

يجب أن يجيب:

```text
ماذا حدث؟
هل تم حفظ البيانات؟
ماذا أفعل؟
```

---

# 88. Error Example

```text
تعذر تسجيل المصروف.

لم يتم حفظ العملية أو خصم أي مبلغ.

حاول مرة أخرى.
```

---

# 89. Success Feedback

لا تستخدم Toast مثل:

```text
تم بنجاح
```

فقط عندما تكون النتيجة المالية مهمة.

الأفضل:

```text
تم تسجيل المصروف.

المتاح الآمن الآن:
1,850 ريال
```

---

# 90. Toasts

تستخدم للملاحظات السريعة فقط.

لا تعتمد عليها لرسائل حرجة قد تختفي قبل قراءتها.

---

# 91. Notifications

Notification Center داخل النظام يمكن أن يستخدم:

```text
Badge
List
Priority
Read / Unread
```

لكن Push Notifications ليست جزءًا معتمدًا حاليًا.

---

# 92. Icons

يجب استخدام Icon Set واحد.

المقترح:

```text
Lucide
```

أو مجموعة متناسقة مكافئة.

---

# 93. Icon Style

يفضل:

```text
Outline
Consistent stroke
```

ولا تخلط Filled وOutline دون قاعدة.

---

# 94. Icon Size

```text
Small:
16

Default:
20

Large:
24
```

---

# 95. Icons and RTL

أيقونات الاتجاه مثل:

```text
Back
Forward
Chevron
```

يجب أن تتكيف مع RTL.

---

# 96. Charts

الرسوم البيانية تستخدم فقط إذا أجابت عن سؤال.

مثل:

```text
كيف تغير الإنفاق؟
ما البنود الأعلى؟
كيف تطور الادخار؟
```

---

# 97. Chart Rule

لا تستخدم:

* 3D charts.
* زخارف.
* Pie Charts كثيرة.
* أكثر من 5–7 ألوان.

---

# 98. Preferred Charts

```text
Line
Bar
Progress
Stacked Bar
```

حسب السياق.

---

# 99. Dashboard Charts

الصفحة الرئيسية يجب ألا تتحول إلى Dashboard BI.

الرسوم التفصيلية مكانها:

```text
التقارير
```

---

# 100. Advisor Visual Language

المستشار المالي لا يظهر كـChat Bubble دائمًا.

يستخدم:

```text
Advisor Card
Insight Panel
Recommendation Feed
```

---

# 101. Advisor Identity

يمكن للمستشار استخدام رمز بسيط ثابت.

لكن لا يحتاج:

* شخصية كرتونية.
* Avatar ثلاثي الأبعاد.
* رسوم مبالغ فيها.

---

# 102. Desktop Advisor Panel

يمكن استخدام:

```text
Right/Left Context Panel
```

حسب RTL.

وظيفته:

> عرض توصية مرتبطة بالصفحة الحالية.

---

# 103. Mobile Advisor

التوصيات تظهر كبطاقات مستقلة.

ويمكن فتح التفاصيل في:

```text
Bottom Sheet / Full Screen
```

---

# 104. Mobile Layout

المحتوى:

```text
Single Column
```

في الأغلب.

---

# 105. Mobile Two-Column Rule

يسمح بعمودين فقط للحقول القصيرة والمتوسطة.

مثل:

```text
المبلغ | التاريخ
```

إذا بقيت القراءة والاستخدام مريحين.

---

# 106. Mobile Full Width

الحقول الطويلة:

```text
الوصف
السبب
الهدف
```

بعرض كامل.

---

# 107. Mobile Buttons

الأزرار المرتبطة بنفس الإجراء يفضل أن تكون:

```text
في صف واحد
```

إذا كانت المساحة تسمح.

وإلا يعاد تصميم العملية، وليس تصغير النص عشوائيًا.

---

# 108. Mobile Bottom Sheet

يستخدم لـ:

```text
اختيار نوع العملية
Filters
Quick actions
Confirmations البسيطة
```

---

# 109. Desktop Split View

مناسب لـ:

```text
Transactions List + Details
Budget + Advisor
Goals List + Goal Details
```

---

# 110. Breakpoints

القيم الدقيقة تعتمد على التنفيذ، لكن المقترح:

```text
Mobile:
< 768

Tablet:
768–1023

Desktop:
>= 1024
```

---

# 111. Responsive Rule

الهدف ليس:

```text
تصغير Desktop
```

بل:

```text
إعادة ترتيب الأولويات حسب الجهاز
```

---

# 112. RTL Layout

القواعد:

```text
Navigation on RTL side
Text align start
Icons mirrored when directional
Tables start from right
Inputs RTL where appropriate
```

---

# 113. Numbers in RTL

الأرقام المالية يجب أن تبقى قابلة للقراءة.

مثال:

```text
2,140 ريال
```

ولا يتم كسر ترتيب الرقم بسبب RTL.

---

# 114. Currency Placement

يتم اعتماد صيغة موحدة:

```text
2,140 ريال
```

في جميع الصفحات.

---

# 115. Dates

يجب اعتماد صيغة عرض موحدة.

مثال:

```text
2 سبتمبر 2026
```

أو صيغة رقمية واحدة في الأماكن الضيقة.

---

# 116. Accessibility

يجب دعم:

* Contrast جيد.
* Keyboard Navigation.
* Focus Indicators.
* Screen Reader Labels.
* Touch Targets.
* Reduced Motion عند الحاجة.
* عدم الاعتماد على اللون فقط.

---

# 117. Focus State

أي عنصر تفاعلي يجب أن يمتلك Focus واضحًا.

---

# 118. Hover

Hover تحسين إضافي لـDesktop.

ولا تستخدمه لإخفاء معلومات أساسية لا يمكن الوصول إليها على الجوال.

---

# 119. Motion

المؤثرات:

```text
Fast
Subtle
Functional
```

مثل:

* فتح Bottom Sheet.
* Transition بسيط.
* تحديث Progress.

---

# 120. Motion Duration

تقريبًا:

```text
150–250ms
```

للتفاعلات العادية.

---

# 121. No Decorative Animation

لا تستخدم:

* Particle effects.
* Long animations.
* Animated money.
* Excessive counters.

---

# 122. Dark Mode

المصادر الحالية لا تطلب Dark Mode.

لذلك لا يعتبر جزءًا من الإصدار الأول.

يمكن تصميم Tokens تسمح بإضافته مستقبلًا.

---

# 123. Design Tokens

يجب تعريف Tokens بدل القيم المكررة.

مثل:

```text
color.primary
color.text.primary
color.text.secondary
color.border
color.success
color.warning
color.danger

space.1
space.2
space.3

radius.sm
radius.md
radius.lg

font.size.sm
font.size.md
font.size.lg
```

---

# 124. Hardcoded Values

ممنوع انتشار:

```text
#2563EB
16px
12px
```

في مئات الملفات.

يجب استخدام Tokens.

---

# 125. Component Variants

كل Component يجب أن يستخدم Variants واضحة.

مثال:

```text
Button
├── primary
├── secondary
├── tertiary
└── danger
```

---

# 126. Component States

أي Component تفاعلي يجب أن يعرف:

```text
Default
Hover
Focus
Active
Disabled
Loading
Error
```

بحسب طبيعته.

---

# 127. Component Documentation

كل Component يجب توثيق:

```text
Purpose
Props
Variants
States
Mobile behavior
Desktop behavior
Accessibility
Do
Don't
```

---

# 128. Design QA

قبل اعتماد أي شاشة يجب مراجعة:

```text
RTL
Hierarchy
Spacing
Typography
Responsive
Contrast
States
Touch size
Consistency
No duplication
```

---

# 129. Financial UX QA

يضاف فحص خاص:

```text
هل Actual واضح؟
هل Projected واضح؟
هل Allocated واضح؟
هل Transferred واضح؟
هل Safe To Spend أوضح من Balance؟
هل يوجد أي رقم مالي بدون سياق؟
```

---

# 130. Pending Design Decisions

## PENDING-DS-001

الهوية اللونية النهائية لم تعتمد في المصادر.

القيم الواردة هنا Proposal.

---

## PENDING-DS-002

`Financial Health Score` لا يعتمد له لون أو Gauge نهائي حتى حسم المعادلة.

---

## PENDING-DS-003

لون وحالة `AT_RISK` يمكن تجهيزها بصريًا، لكن معيار تفعيلها لا يزال ماليًا غير محسوم.

---

## PENDING-DS-004

طريقة عرض `Required Financial Buffer` غير معتمدة لأنه لم يحسم حسابيًا.

---

## PENDING-DS-005

الرسوم الخاصة بالتوقع المالي قد تتغير بعد اعتماد Forecast Engine.

---

# 131. Anti-Patterns

ممنوع:

```text
كل Card بلون مختلف
Gradient مبالغ فيه
Glassmorphism ثقيل
Shadow ثقيل
Charts كثيرة
Font صغير
حقول Desktop على Mobile
Sidebar Desktop على Mobile
أكثر من Primary Button في نفس السياق
ألوان حالة بدون نص
حذف Financial Transactions
أرقام بلا تسمية
تحميل كامل البيانات
Chatbot يحتل النظام
```

---

# 132. Dashboard Reference Structure

Desktop:

```text
Page Header
↓
Safe To Spend Hero
↓
Primary Action + Cycle Context
↓
KPI Strip
↓
Forecast + Advisor
↓
Upcoming Obligations
↓
Savings / Emergency / Goals
```

---

# 133. Dashboard Reference Structure — Mobile

```text
Top Header
↓
Safe To Spend
↓
Primary Action
↓
Advisor Alert if important
↓
Cycle Summary
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

# 134. Budget Page Reference

Desktop:

```text
Page Header
↓
Budget Summary
↓
Salary Allocation
↓
Category Table
↓
Contextual Advisor
```

Mobile:

```text
Page Header
↓
Budget Summary
↓
Category Cards
↓
Advisor Cards
```

---

# 135. Transaction Page Reference

Desktop:

```text
Header + Add
↓
Filters
↓
Table
↓
Pagination
```

Mobile:

```text
Header
↓
Search / Filter
↓
Transaction Cards
↓
Floating / Bottom Add Action
```

---

# 136. Goal Page Reference

Desktop:

```text
Goals Summary
↓
Goal Grid / List
↓
Details Panel
```

Mobile:

```text
Summary
↓
Goal Cards
↓
Goal Details
```

---

# 137. Advisor Page Reference

```text
Priority Summary
↓
Recommendation Feed
↓
Recommendation Details
↓
Supporting Data
↓
Actions
```

---

# 138. Design Integrity Definition

التصميم يعتبر سليمًا إذا:

* يظهر أهم قرار قبل التفاصيل.
* Safe To Spend هو الرقم التشغيلي الأبرز.
* الواجهة عربية RTL حقيقية.
* Mobile ليس نسخة مصغرة من Desktop.
* لا تختلط الحالات المالية.
* لا تعتمد الحالة على اللون فقط.
* المكونات موحدة.
* لا توجد مسافات أو أحجام عشوائية.
* كل حالة Loading / Empty / Error مصممة.
* لا يوجد أكثر من Primary Action واضح في نفس السياق.
* المستشار جزء من تجربة النظام وليس بديلًا عنها.
* التصميم يسمح بالتوسع دون إعادة بناء الواجهة بالكامل.

---

# 139. قاعدة الحوكمة

أي Component جديد يجب أن يجيب عن:

```text
ما الغرض منه؟
هل يوجد Component يؤدي نفس الوظيفة؟
ما Variants المطلوبة؟
ما States؟
كيف يعمل على Mobile؟
كيف يعمل على Desktop؟
ما Accessibility requirements؟
هل يستخدم Tokens؟
هل يتوافق مع RTL؟
```

إذا لم توجد إجابة واضحة فلا ينشأ Component جديد.
