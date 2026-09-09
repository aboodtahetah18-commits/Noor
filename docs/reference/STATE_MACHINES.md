# STATE_MACHINES.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

---

# 1. الهدف من الوثيقة

تحدد هذه الوثيقة حالات الكيانات الأساسية داخل النظام، والانتقالات المسموحة بينها.

الهدف منها:

* منع تغيير الحالات بطريقة عشوائية.
* منع الوصول إلى حالات غير منطقية.
* جعل السلوك المالي قابلاً للاختبار.
* توحيد منطق Backend وFrontend.
* جعل كل تغيير حالة قابلًا للتفسير والتتبع.

ولا تعتبر أي حالة أو انتقال غير موثق هنا مسموحًا افتراضيًا.

---

# 2. قاعدة عامة

كل كيان له State Machine يجب أن يمتلك:

* Current State
* Previous State عند الحاجة
* Transition Event
* Transition Time
* Transition Reason عند الحاجة

ولا يجوز تعديل الحالة مباشرة من الواجهة دون المرور بمنطق الانتقال المعتمد.

---

# 3. دورة الحياة المالية Financial Cycle

## الحالات

```text
DRAFT
ACTIVE
CLOSING
CLOSED
```

---

## 3.1 DRAFT

تعني:

تم إنشاء دورة مالية لكنها لم تصبح الدورة التشغيلية المعتمدة بعد.

يمكن خلالها:

* تحديد تاريخ البداية.
* تحديد الدخل المتوقع.
* تحديد تاريخ الدخل القادم.
* تجهيز الخطة.
* مراجعة الالتزامات والتخصيصات.

---

## 3.2 ACTIVE

تعني:

الدورة المالية الحالية فعالة.

يسمح خلالها بـ:

* تسجيل الدخل.
* تسجيل المصروفات.
* سداد الالتزامات.
* تحويل الادخار.
* دعم الطوارئ.
* المساهمة في الأهداف.
* إعادة الحساب.
* إصدار التوصيات.

---

## 3.3 CLOSING

حالة انتقالية لإغلاق الدورة.

خلالها يتم:

* التحقق من العمليات.
* احتساب المؤشرات النهائية.
* حساب المخطط مقابل الفعلي.
* إنشاء Snapshot.
* إنشاء تقرير نهاية الدورة.

ولا يجب إضافة عمليات مالية عادية جديدة أثناء الإغلاق.

---

## 3.4 CLOSED

تعني:

الدورة مكتملة ومؤرشفة.

تصبح نتائجها تاريخية.

ولا يتم تعديلها بصورة تؤدي إلى تغيير نتائجها الأصلية دون إجراء تصحيحي موثق.

---

# 4. انتقالات Financial Cycle

```text
DRAFT
→ ACTIVE
```

الحدث:

```text
ACTIVATE_CYCLE
```

الشروط:

* وجود تاريخ بداية.
* وجود تاريخ دخل قادم متوقع.
* وجود البيانات الأساسية اللازمة للحساب.

---

```text
ACTIVE
→ CLOSING
```

الحدث:

```text
START_CLOSING
```

---

```text
CLOSING
→ CLOSED
```

الحدث:

```text
COMPLETE_CLOSING
```

الشروط:

* اكتمال الحسابات النهائية.
* حفظ Snapshot.
* إنشاء النتائج النهائية.

---

## الانتقالات الممنوعة

```text
DRAFT → CLOSED
```

ممنوع.

```text
CLOSED → ACTIVE
```

ممنوع كإجراء اعتيادي.

```text
CLOSED → DRAFT
```

ممنوع.

---

# 5. الخطة المالية Financial Plan

## الحالات

```text
PLAN_DRAFT
ACTIVE_PLAN
REVISED
CLOSED_PLAN
```

---

## 5.1 PLAN_DRAFT

الخطة ما زالت قيد الإعداد.

يمكن تعديل:

* الالتزامات.
* الاحتياجات.
* الادخار.
* الطوارئ.
* الأهداف.
* المصروف المرن.

---

## 5.2 ACTIVE_PLAN

الخطة تم اعتمادها وأصبحت المرجع الرسمي للدورة.

ويتم استخدامها في:

* Planned vs Actual.
* اكتشاف التجاوز.
* التوقعات.
* التحليل.

---

## 5.3 REVISED

تعني:

تم تعديل خطة كانت معتمدة.

يجب الاحتفاظ بـ:

* النسخة السابقة.
* سبب التعديل.
* وقت التعديل.
* القيم المعدلة.

لا يعني ذلك حذف الخطة الأصلية.

---

## 5.4 CLOSED_PLAN

تعني:

الدورة المرتبطة بالخطة أغلقت.

وتصبح الخطة مرجعًا تاريخيًا.

---

# 6. انتقالات Financial Plan

```text
PLAN_DRAFT
→ ACTIVE_PLAN
```

الحدث:

```text
APPROVE_PLAN
```

---

```text
ACTIVE_PLAN
→ REVISED
```

الحدث:

```text
REVISE_PLAN
```

الشرط:

تسجيل التعديل.

---

بعد إنشاء النسخة المعدلة:

```text
REVISED
→ ACTIVE_PLAN
```

الحدث:

```text
APPROVE_REVISION
```

---

```text
ACTIVE_PLAN
→ CLOSED_PLAN
```

عند إغلاق الدورة.

---

# 7. بند الميزانية Budget Category Status

هذه حالة تحليلية وليست بالضرورة Workflow إداري.

## الحالات

```text
NORMAL
AT_RISK
OVER_BUDGET
```

---

## 7.1 NORMAL

الصرف ضمن الخطة ولا توجد إشارة خطر واضحة.

---

## 7.2 AT_RISK

البند لم يتجاوز الميزانية بعد، لكن معدل الإنفاق يشير إلى خطر تجاوز.

ملاحظة:

الحد الرياضي الدقيق للانتقال إلى هذه الحالة غير محسوم بعد وفق:

```text
PENDING-BR-003
```

---

## 7.3 OVER_BUDGET

إذا:

```text
Actual Spend > Budget
```

تصبح الحالة:

```text
OVER_BUDGET
```

---

# 8. انتقالات Budget Category

```text
NORMAL
→ AT_RISK
```

عندما تتحقق قاعدة الخطر المستقبلية.

---

```text
AT_RISK
→ OVER_BUDGET
```

عندما:

```text
Actual Spend > Budget
```

---

يمكن العودة:

```text
AT_RISK
→ NORMAL
```

إذا تحسن الوضع نتيجة تعديل فعلي أو إعادة تقييم صحيحة.

أما:

```text
OVER_BUDGET
→ NORMAL
```

فلا يحدث بتغيير العرض فقط.

إذا تم تعديل الخطة رسميًا، يجب حفظ أن البند تجاوز الخطة الأصلية قبل التعديل لأغراض التحليل التاريخي.

---

# 9. الالتزام المالي Obligation

## الحالات

```text
UPCOMING
DUE
OVERDUE
PAID
CANCELLED
```

تمت إضافة `CANCELLED` كحالة تشغيلية لازمة لإيقاف التزام لم يعد صالحًا، على أن تستخدم دون حذف التاريخ.

---

# 10. تعريف حالات Obligation

## UPCOMING

الاستحقاق مستقبلي.

---

## DUE

وصل تاريخ الاستحقاق.

---

## OVERDUE

مر تاريخ الاستحقاق دون تسجيل السداد.

---

## PAID

تم تسجيل سداد الاستحقاق.

---

## CANCELLED

تم إلغاء الاستحقاق أو لم يعد مطلوبًا.

ولا يعني ذلك حذف سجل الالتزام.

---

# 11. انتقالات Obligation

```text
UPCOMING
→ DUE
```

عند الوصول إلى تاريخ الاستحقاق.

---

```text
DUE
→ OVERDUE
```

إذا انتهى تاريخ الاستحقاق دون سداد.

---

```text
UPCOMING
→ PAID
```

مسموح عند السداد المبكر.

---

```text
DUE
→ PAID
```

عند السداد.

---

```text
OVERDUE
→ PAID
```

عند سداد الالتزام المتأخر.

---

يمكن:

```text
UPCOMING
→ CANCELLED
```

وفق قرار المستخدم.

---

ولا يجوز:

```text
PAID → UPCOMING
```

لنفس الاستحقاق.

إذا كان الالتزام متكررًا يتم إنشاء استحقاق جديد مستقل.

---

# 12. الالتزام المتكرر Recurring Obligation

التكرار ليس State للالتزام نفسه.

بل خاصية مثل:

```text
ONCE
MONTHLY
QUARTERLY
SEMI_ANNUAL
ANNUAL
```

عند الوصول إلى:

```text
PAID
```

أو معالجة الاستحقاق حسب السياسة، يتم إنشاء الاستحقاق التالي كسجل جديد:

```text
UPCOMING
```

---

# 13. الهدف المالي Financial Goal

## الحالات

```text
DRAFT
ACTIVE
FINANCIALLY_UNREALISTIC
PAUSED
ACHIEVED
CANCELLED
```

---

# 14. DRAFT Goal

الهدف قيد الإعداد.

لم يدخل بعد في التخصيصات المالية الفعلية.

---

# 15. ACTIVE Goal

الهدف معتمد ونشط.

يتم:

* احتساب المساهمة المطلوبة.
* تضمينه في التخصيص.
* متابعة التقدم.

---

# 16. FINANCIALLY_UNREALISTIC

حالة تحليلية تشير إلى:

```text
Required Contribution
>
Available Financial Capacity
```

ولا تعني حذف الهدف أو منعه.

بل تعني أن:

التاريخ أو المبلغ أو الخطة الحالية غير واقعية ماليًا.

---

# 17. PAUSED Goal

تم تعليق المساهمات مؤقتًا.

الرصيد الحالي محفوظ.

ولا يدخل الهدف في المساهمات المطلوبة أثناء التوقف.

---

# 18. ACHIEVED Goal

إذا:

```text
Current Balance >= Target Amount
```

يصبح:

```text
ACHIEVED
```

---

# 19. CANCELLED Goal

تم إلغاء الهدف.

يحفظ السجل التاريخي.

ويجب أن تحدد معالجة الرصيد الموجود عند الإلغاء لاحقًا كقرار منفصل.

---

# 20. انتقالات Financial Goal

```text
DRAFT
→ ACTIVE
```

عند اعتماد الهدف.

---

```text
ACTIVE
→ FINANCIALLY_UNREALISTIC
```

إذا تجاوز المطلوب القدرة المالية.

---

يمكن العودة:

```text
FINANCIALLY_UNREALISTIC
→ ACTIVE
```

إذا:

* تغير التاريخ.
* تغير المبلغ.
* تغيرت القدرة المالية.
* ارتفع الرصيد الحالي.

---

```text
ACTIVE
→ PAUSED
```

بقرار المستخدم.

---

```text
PAUSED
→ ACTIVE
```

عند استئناف الهدف.

---

```text
ACTIVE
→ ACHIEVED
```

عند اكتماله.

---

```text
FINANCIALLY_UNREALISTIC
→ ACHIEVED
```

مسموح إذا اكتمل الرصيد مباشرة.

---

```text
DRAFT / ACTIVE / PAUSED / FINANCIALLY_UNREALISTIC
→ CANCELLED
```

مسموح بقرار المستخدم.

---

## انتقالات ممنوعة

```text
ACHIEVED → ACTIVE
```

ممنوع لنفس الهدف بصورة اعتيادية.

```text
CANCELLED → ACTIVE
```

يفضل إنشاء هدف جديد أو عملية إعادة فتح صريحة مستقبلًا، وليس تغييرًا مباشرًا.

---

# 21. عملية مالية Financial Transaction

العملية المالية نفسها لا تحتاج Workflow طويلًا، لكن تحتاج حالة سلامة تنفيذية.

## الحالات

```text
PENDING
POSTED
REVERSED
FAILED
```

---

# 22. PENDING Transaction

العملية تم إنشاؤها لكنها لم تصبح مؤثرة ماليًا بصورة نهائية.

---

# 23. POSTED Transaction

العملية نجحت وأصبحت جزءًا من الحسابات الرسمية.

---

# 24. REVERSED Transaction

تم عكس أثر عملية سابقة بطريقة موثقة.

هذا أفضل من حذف العملية المالية التاريخية.

---

# 25. FAILED Transaction

فشل تنفيذ العملية.

ولا يجب أن تؤثر على الأرصدة أو المؤشرات.

---

# 26. انتقالات Financial Transaction

```text
PENDING
→ POSTED
```

عند نجاح العملية بالكامل.

---

```text
PENDING
→ FAILED
```

عند فشلها.

---

```text
POSTED
→ REVERSED
```

عند إجراء تصحيح أو عكس معتمد.

---

## ممنوع

```text
FAILED → POSTED
```

لنفس محاولة التنفيذ دون إعادة معالجة واضحة.

```text
REVERSED → POSTED
```

ممنوع كتعديل مباشر.

---

# 27. أنواع العمليات Transaction Type

النوع منفصل عن الحالة.

يدعم النظام مبدئيًا:

```text
INCOME
EXPENSE
TRANSFER
REFUND
SAVING_TRANSFER
EMERGENCY_CONTRIBUTION
EMERGENCY_WITHDRAWAL
GOAL_CONTRIBUTION
OBLIGATION_PAYMENT
```

هذه الأنواع لا تعني جميعها دخلًا أو مصروفًا استهلاكيًا.

---

# 28. الادخار Saving Allocation

يجب الفصل بين حالة التخصيص وحالة التنفيذ.

## الحالات

```text
PLANNED
ALLOCATED
TRANSFERRED
PARTIALLY_TRANSFERRED
CANCELLED
```

---

# 29. تعريف حالات Saving

## PLANNED

المبلغ موجود ضمن الخطة فقط.

---

## ALLOCATED

المبلغ محمي ومحجوز من المصروف المتاح.

---

## PARTIALLY_TRANSFERRED

تم تحويل جزء من المبلغ فعليًا.

---

## TRANSFERRED

تم تحويل كامل المبلغ المخصص.

---

## CANCELLED

تم إلغاء التخصيص رسميًا.

---

# 30. انتقالات Saving

```text
PLANNED
→ ALLOCATED
```

بعد اعتماد الخطة.

---

```text
ALLOCATED
→ PARTIALLY_TRANSFERRED
```

عند تحويل جزء.

---

```text
ALLOCATED
→ TRANSFERRED
```

عند تحويل كامل المبلغ.

---

```text
PARTIALLY_TRANSFERRED
→ TRANSFERRED
```

بعد إكمال التحويل.

---

# 31. تخصيص صندوق الطوارئ Emergency Allocation

يمكن استخدام نفس المنطق:

```text
PLANNED
ALLOCATED
PARTIALLY_TRANSFERRED
TRANSFERRED
CANCELLED
```

مع الاحتفاظ بصندوق الطوارئ نفسه ككيان مستقل يحمل الرصيد والهدف.

---

# 32. صندوق الطوارئ Emergency Fund Status

الحالة هنا تحليلية.

## الحالات

```text
NOT_CONFIGURED
BUILDING
FUNDED
DEPLETED
```

---

## NOT_CONFIGURED

لم يتم تحديد هدف للصندوق بعد.

---

## BUILDING

```text
0 < Current Balance < Target
```

---

## FUNDED

```text
Current Balance >= Target
```

---

## DEPLETED

الرصيد وصل إلى صفر بعد أن كان الصندوق مستخدمًا.

---

# 33. انتقالات Emergency Fund

```text
NOT_CONFIGURED
→ BUILDING
```

عند تعريف الهدف ووجود رصيد أقل منه.

---

```text
BUILDING
→ FUNDED
```

عند الوصول إلى الهدف.

---

```text
FUNDED
→ BUILDING
```

بعد سحب يخفض الرصيد عن الهدف.

---

```text
BUILDING
→ DEPLETED
```

عند وصول الرصيد إلى صفر.

---

```text
DEPLETED
→ BUILDING
```

عند بدء إعادة بناء الصندوق.

---

# 34. التوصية المالية Recommendation

## الحالات

```text
NEW
VIEWED
ACCEPTED
DISMISSED
EXPIRED
RESOLVED
```

---

# 35. NEW Recommendation

تم إنشاء توصية جديدة ولم تتم مراجعتها بعد.

---

# 36. VIEWED Recommendation

اطلع المستخدم عليها.

---

# 37. ACCEPTED Recommendation

قرر المستخدم تطبيق التوصية.

ولا يعني ذلك بالضرورة أن الإجراء تم ماليًا بعد.

---

# 38. DISMISSED Recommendation

رفض المستخدم التوصية أو تجاهلها صراحة.

---

# 39. EXPIRED Recommendation

لم تعد التوصية صالحة بسبب تغير الظروف المالية أو انتهاء الفترة.

---

# 40. RESOLVED Recommendation

السبب الذي أدى إلى التوصية لم يعد قائمًا.

مثال:

تحذير من التزام متأخر ثم تم السداد.

---

# 41. انتقالات Recommendation

```text
NEW
→ VIEWED
```

---

```text
NEW / VIEWED
→ ACCEPTED
```

---

```text
NEW / VIEWED
→ DISMISSED
```

---

```text
NEW / VIEWED
→ EXPIRED
```

عند فقدان الصلاحية.

---

```text
NEW / VIEWED / ACCEPTED
→ RESOLVED
```

إذا تمت معالجة السبب.

---

# 42. أنواع التوصيات

نوع التوصية منفصل عن حالتها.

الأنواع المعتمدة حاليًا:

```text
WARNING
OPPORTUNITY
CORRECTION
GOAL
POSITIVE
```

---

# 43. حالة خطر العجز Deficit Risk

هذه حالة تحليلية للنظام.

## الحالات

```text
NO_DEFICIT
DEFICIT_RISK
```

---

## الانتقال

إذا:

```text
Projected End Balance < 0
```

فالحالة:

```text
DEFICIT_RISK
```

---

إذا عاد:

```text
Projected End Balance >= 0
```

فالحالة:

```text
NO_DEFICIT
```

---

# 44. Safe To Spend Status

إضافة إلى القيمة المالية، يمكن للنظام استخدام حالة تحليلية.

## الحالات المقترحة

```text
AVAILABLE
ZERO
```

ولا نضيف مستويات مثل:

```text
LOW
CRITICAL
```

حاليًا لأن المصادر لم تحدد حدودًا رقمية لها.

---

## AVAILABLE

إذا:

```text
Safe To Spend > 0
```

---

## ZERO

إذا كانت المعادلة الحسابية:

```text
<= 0
```

ويعرض النظام:

```text
Safe To Spend = 0
```

مع الاحتفاظ بـ:

```text
Expected Deficit
```

إذا وجد.

---

# 45. Monthly Review / Cycle Review

تقرير نهاية الدورة ليس له Workflow معقد.

يمكن أن يستخدم:

```text
GENERATING
READY
ARCHIVED
FAILED
```

---

## GENERATING

يتم احتساب النتائج.

---

## READY

تم إنشاء التقرير بنجاح.

---

## ARCHIVED

تم ربطه بدورة مغلقة تاريخيًا.

---

## FAILED

حدث خطأ أثناء إنشاء التقرير.

ولا يجب أن يؤدي فشل التقرير إلى فقدان العمليات المالية الأصلية.

---

# 46. حالات التحليل التاريخي

الدورة المستخدمة في المتوسطات يجب أن تكون:

```text
CLOSED
```

ولا تستخدم:

```text
DRAFT
ACTIVE
CLOSING
```

كدورة مكتملة عند احتساب:

* متوسط 3 أشهر.
* متوسط 6 أشهر.

وفق قواعد الأعمال الحالية.

---

# 47. قواعد الانتقال العامة

## SM-RULE-001

لا يجوز تنفيذ انتقال غير موجود في هذه الوثيقة دون إضافته أولًا إلى الوثائق المرجعية.

---

## SM-RULE-002

كل انتقال يغير قيمة مالية يجب أن يمر داخل عملية موثوقة Transactional Operation.

---

## SM-RULE-003

فشل الانتقال يجب ألا يترك الكيان في حالة نصف مكتملة.

---

## SM-RULE-004

حالة الواجهة يجب أن تكون انعكاسًا لحالة النظام وليست مصدر الحقيقة.

---

## SM-RULE-005

الانتقالات الزمنية مثل:

```text
UPCOMING → DUE → OVERDUE
```

يجب أن تعتمد على التاريخ الفعلي للنظام.

---

## SM-RULE-006

الحالات التحليلية مثل:

```text
AT_RISK
FINANCIALLY_UNREALISTIC
DEFICIT_RISK
```

يجب إعادة تقييمها عند تغير البيانات المؤثرة.

---

## SM-RULE-007

لا يتم حذف تاريخ الانتقال بعد حدوثه إذا كان له أثر مالي أو تحليلي.

---

# 48. الحالات التي ما زالت معلقة

هناك حالات تعتمد على قواعد لم تحسم نهائيًا.

## PENDING-SM-001

الانتقال الدقيق:

```text
NORMAL → AT_RISK
```

لبند الميزانية.

يعتمد على:

```text
PENDING-BR-003
```

---

## PENDING-SM-002

الحالات التفصيلية لمؤشر الصحة المالية.

مثل:

```text
EXCELLENT
GOOD
WARNING
CRITICAL
```

غير معتمدة حتى اعتماد معادلة:

```text
Financial Health Score
```

وأوزانها.

---

## PENDING-SM-003

مستويات Safe To Spend مثل:

```text
HEALTHY
LOW
CRITICAL
```

غير معتمدة حاليًا لعدم وجود حدود رقمية.

---

## PENDING-SM-004

الحالات التفصيلية لتغطية صندوق الطوارئ بعدد الأشهر غير معتمدة حتى تحديد:

```text
PENDING-BR-006
```

---

# 49. الخريطة الشاملة للحالات الرئيسية

```text
FINANCIAL CYCLE
DRAFT
→ ACTIVE
→ CLOSING
→ CLOSED
```

```text
FINANCIAL PLAN
PLAN_DRAFT
→ ACTIVE_PLAN
↔ REVISED
→ CLOSED_PLAN
```

```text
OBLIGATION
UPCOMING
→ DUE
→ OVERDUE
→ PAID
```

أو:

```text
UPCOMING
→ PAID
```

---

```text
FINANCIAL GOAL
DRAFT
→ ACTIVE
↔ FINANCIALLY_UNREALISTIC
↔ PAUSED
→ ACHIEVED
```

---

```text
TRANSACTION
PENDING
→ POSTED
→ REVERSED
```

أو:

```text
PENDING
→ FAILED
```

---

```text
RECOMMENDATION
NEW
→ VIEWED
→ ACCEPTED / DISMISSED / EXPIRED / RESOLVED
```

---

```text
EMERGENCY FUND
NOT_CONFIGURED
→ BUILDING
→ FUNDED
```

مع إمكانية:

```text
FUNDED
→ BUILDING
→ DEPLETED
→ BUILDING
```

---

# 50. قاعدة الحوكمة

أي State جديدة يجب ألا تضاف مباشرة داخل الكود.

يجب أن تمر عبر:

```text
Requirement
↓
Workflow
↓
Business Rule
↓
State Machine
↓
Data Model
↓
Validation
↓
Test
↓
Implementation
```

ويعتبر الكود الذي يحتوي على حالة أو انتقال غير موثق هنا انحرافًا عن تصميم النظام.
