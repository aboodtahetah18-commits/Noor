# KNOWN_ISSUES.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

## Known Issues, Open Decisions & Technical Debt Register

---

# 1. الهدف

هذه الوثيقة هي السجل الرسمي لكل:

* مشكلة معروفة.
* قرار لم يحسم.
* تعارض بين المراجع.
* قيد مؤقت.
* Technical Debt.
* Workaround.
* خطر تنفيذي.
* Feature يجب تقييدها إلى أن يعتمد منطقها.
* مشكلة ظهرت أثناء التطوير ولم تعالج بعد.

الهدف هو منع:

```text
Unknown Assumption
↓
Developer Guess
↓
Hidden Business Logic
↓
Financial Error
```

---

# 2. القاعدة الأساسية

وجود عنصر داخل:

```text
KNOWN_ISSUES.md
```

يعني أن المشروع **يعرف بوجوده**.

ولا يعني:

```text
يمكن تجاهله
```

ولا يعني:

```text
يقرر المطور حله كما يريد
```

---

# 3. أنواع العناصر

يعتمد التصنيف:

```text
OPEN_DECISION
BUG
SECURITY
DATA_INTEGRITY
DOCUMENTATION
TECHNICAL_DEBT
PERFORMANCE
UX
INFRASTRUCTURE
LIMITATION
```

---

# 4. حالات Issue

```text
OPEN
IN_REVIEW
DECISION_REQUIRED
BLOCKED
APPROVED_FOR_FIX
IN_PROGRESS
FIXED
VERIFIED
CLOSED
ACCEPTED_LIMITATION
```

---

# 5. مستويات الخطورة

```text
P0 — Critical
P1 — High
P2 — Medium
P3 — Low
```

---

# 6. تعريف P0

أي مشكلة قد تسبب:

```text
Wrong Balance
Wrong Safe To Spend
Lost Transaction
Duplicate Transaction
Wrong Snapshot
Cross-user Data Exposure
Financial History Corruption
```

تصنف:

```text
P0
```

---

# 7. تعريف P1

مثل:

* خطأ جوهري في الميزانية.
* التزام بحالة خاطئة.
* Goal state خاطئة.
* عجز متوقع خاطئ.
* State Transition غير صحيح.
* RLS ناقص.
* عملية مالية غير Atomic.

---

# 8. تعريف P2

مثل:

* Workflow غير صحيح.
* UI State خاطئة.
* Filter.
* Pagination.
* Recommendation منخفضة الخطورة.
* مشكلة Responsive مهمة دون أثر مالي.

---

# 9. تعريف P3

مثل:

* Cosmetic Issue.
* نص.
* Spacing.
* تحسين داخلي محدود.

---

# 10. Issue ID

كل عنصر يستخدم:

```text
ISSUE-XXXX
```

مثال:

```text
ISSUE-0001
ISSUE-0002
```

ولا يعاد استخدام الرقم.

---

# 11. Issue Template

```text
## ISSUE-XXXX — العنوان

Type:
Priority:
Status:

Description:

Source:

Affected Features:

Financial Impact:

Current Behavior:

Expected Behavior:

Decision / Fix Required:

Blocking:

Tests Required:

Resolution:

Related Change:
```

---

# 12. OPEN DECISIONS

هذه أعلى مجموعة أولوية حاليًا.

---

# ISSUE-0001 — Financial Health Score Formula

```text
Type:
OPEN_DECISION

Priority:
P1

Status:
DECISION_REQUIRED
```

## المشكلة

الرؤية تتطلب:

```text
Financial Health Score
0–100
```

لكن المعادلة النهائية والأوزان لم تعتمد.

---

## المصدر

```text
PENDING-BR-001
PENDING-ARCH-001
PENDING-SM-002
PENDING-DM-005
```

---

## العوامل المرشحة الموجودة في الرؤية

تشمل مفاهيم مثل:

* الالتزام بالميزانية.
* معدل الادخار.
* صندوق الطوارئ.
* الالتزامات إلى الدخل.
* المصروف غير المخطط.
* تقدم الأهداف.
* العجز.

لكن لم تعتمد أوزان رسمية.

---

## الخطر

إذا اخترع المطور الأوزان:

سيظهر رقم:

```text
Financial Health = 78
```

بدون أساس مالي معتمد.

---

## القاعدة المؤقتة

يجوز إنشاء:

```text
FinancialHealthEngine Interface
```

لكن:

```text
No Production Score Formula
```

حتى اعتماد القرار.

---

## Blocking

يحجب:

* الرقم النهائي للصحة المالية.
* الحالات مثل EXCELLENT / GOOD / WARNING / CRITICAL.
* أي Recommendation تعتمد على Score النهائي.

---

# ISSUE-0002 — Required Financial Buffer

```text
Type:
OPEN_DECISION

Priority:
P0

Status:
DECISION_REQUIRED
```

## المشكلة

المعادلة الأساسية لـ:

```text
Safe To Spend
```

تتضمن:

```text
Required Financial Buffer
```

لكن طريقة حسابه غير معتمدة.

---

## المصدر

```text
PENDING-BR-002
PENDING-ARCH-002
PENDING-DM-004
```

---

## لماذا P0؟

لأن:

```text
Required Financial Buffer
```

يدخل مباشرة في:

```text
Safe To Spend
```

وهو المؤشر التشغيلي الأهم في النظام.

---

## القاعدة المؤقتة

لا يجوز اختيار:

```text
5%
10%
500 SAR
```

أو أي قيمة افتراضية مالية دون اعتماد.

---

## أثناء التطوير

يمكن دعم:

```text
Buffer = 0
```

فقط كحالة Test واضحة ومعلنة، وليس باعتبار أن الصفر هو القرار المالي النهائي.

---

## Blocking

يحجب الاعتماد النهائي لـ:

```text
calculateSafeToSpend()
```

في Production.

---

# ISSUE-0003 — Budget AT_RISK Threshold

```text
Type:
OPEN_DECISION

Priority:
P1

Status:
DECISION_REQUIRED
```

## المشكلة

الحالات:

```text
NORMAL
AT_RISK
OVER_BUDGET
```

معتمدة.

لكن الانتقال:

```text
NORMAL
→
AT_RISK
```

ليس له Threshold رياضي نهائي.

---

## المصدر

```text
PENDING-BR-003
PENDING-SM-001
PENDING-ARCH-003
PENDING-DM-006
```

---

## الثابت حاليًا

```text
Actual Spend > Budget
→
OVER_BUDGET
```

معتمد.

أما:

```text
AT_RISK
```

فغير محسوم.

---

## أمثلة لا يجوز اعتمادها تلقائيًا

لا يخترع المطور:

```text
80% budget used
```

أو:

```text
spending rate > elapsed rate × 1.2
```

دون اعتماد.

---

## القاعدة المؤقتة

يطبق:

```text
NORMAL
OVER_BUDGET
```

بصورة كاملة.

أما:

```text
AT_RISK
```

فتبقى خلف Rule Interface أو Feature Flag حتى إغلاق القرار.

---

# ISSUE-0004 — Forecast Algorithm

```text
Type:
OPEN_DECISION

Priority:
P1

Status:
DECISION_REQUIRED
```

## المشكلة

النظام يحتاج:

```text
Projected End Balance
Expected Deficit
```

لكن الخوارزمية الرياضية الدقيقة للتوقع لم تعتمد.

---

## المصدر

```text
PENDING-BR-004
PENDING-ARCH-004
PENDING-DM-007
```

---

## المدخلات المطلوبة معروفة

يجب أن يستخدم التوقع على الأقل:

* Actual Spending.
* Days Elapsed.
* Remaining Days.
* Upcoming Obligations.
* Expected Expenses.

وقد يستخدم Historical Patterns لاحقًا.

---

## غير المعتمد

كيفية وزن هذه البيانات ودمجها رياضيًا.

---

## الخطر

أي Model مختلق قد يعطي:

```text
Projected Balance
```

مضللًا.

---

## القاعدة المؤقتة

يبنى:

```text
ForecastEngine Interface
```

واختبارات Contract.

لكن Formula النهائية لا تثبت قبل القرار.

---

# ISSUE-0005 — Multiple Goals Allocation

```text
Type:
OPEN_DECISION

Priority:
P1

Status:
DECISION_REQUIRED
```

## المشكلة

عند وجود عدة أهداف وعدم كفاية القدرة المالية:

كيف يتم توزيع المبلغ بينها؟

---

## المصدر

```text
PENDING-BR-005
PENDING-ARCH-005
PENDING-DM-008
```

---

## الخيارات الممكنة غير المعتمدة

مثل:

```text
Priority First
Equal Distribution
Target Date First
Weighted Distribution
```

لا يعتبر أي منها قرارًا معتمدًا.

---

## القاعدة المؤقتة

يسمح للنظام بحساب:

```text
Required Contribution per Goal
```

لكن لا يعيد توزيع قدرة مالية محدودة بين الأهداف تلقائيًا.

---

## القرار النهائي للمستخدم

إلى أن تعتمد الخوارزمية:

يعرض النظام المشكلة ويترك تعديل المساهمات للمستخدم.

---

# ISSUE-0006 — Emergency Fund Target

```text
Type:
OPEN_DECISION

Priority:
P1

Status:
DECISION_REQUIRED
```

## المشكلة

الصندوق يدعم:

```text
Current Balance
Target
Completion %
```

لكن كيفية تحديد الهدف الأمثل وفق عدد أشهر المصروفات لم تعتمد.

---

## المصدر

```text
PENDING-BR-006
PENDING-ARCH-006
PENDING-SM-004
PENDING-DM-009
```

---

## غير المعتمد

مثل:

```text
3 months
6 months
12 months
```

أو كيفية تعريف:

```text
Monthly Essential Expenses
```

لأغراض التغطية.

---

## القاعدة المؤقتة

في V1 يمكن للمستخدم إدخال:

```text
Emergency Target Amount
```

يدويًا.

ويحسب النظام:

```text
Current / Target
```

بصورة صحيحة.

---

## ما لا يعرض كحقيقة

لا يعرض:

```text
صندوقك يغطي 5.7 أشهر
```

حتى اعتماد المعادلة.

---

# 13. DOCUMENTATION CONSISTENCY ISSUES

---

# ISSUE-0007 — Transfer Model Pending Marker Is Outdated

```text
Type:
DOCUMENTATION

Priority:
P2

Status:
APPROVED_FOR_FIX
```

## المشكلة

`ARCHITECTURE.md` ما زال يحتوي:

```text
PENDING-ARCH-007
```

بخصوص النموذج الفيزيائي للتحويلات.

لكن:

```text
DATABASE_SCHEMA.md
```

اعتمد بالفعل:

```text
Transfer Header
+
Two Ledger Entries
```

مع:

```text
transaction_direction = IN / OUT
```

---

## القرار الفعلي

يعتبر النموذج:

```text
RESOLVED
```

على مستوى التصميم الفيزيائي.

---

## المطلوب

تحديث `ARCHITECTURE.md` لاحقًا لإغلاق:

```text
PENDING-ARCH-007
```

وتسجيل التغيير في `CHANGELOG.md`.

---

## Blocking

لا يحجب بدء Foundation.

---

# ISSUE-0008 — Opening Balance Pending Marker Is Outdated

```text
Type:
DOCUMENTATION

Priority:
P2

Status:
APPROVED_FOR_FIX
```

## المشكلة

`ARCHITECTURE.md` ما زال يحتوي:

```text
PENDING-ARCH-008
```

لكن `DATABASE_SCHEMA.md` اعتمد:

```text
OPENING BALANCE
=
Setup Event
```

مع جدول:

```text
account_opening_balances
```

وصيغة الرصيد:

```text
Opening Balance
+
POSTED Inflows
-
POSTED Outflows
```

---

## القرار الفعلي

فتح الحساب لا يستخدم:

```text
account.balance
```

كمصدر حقيقة.

---

## المطلوب

إغلاق:

```text
PENDING-ARCH-008
```

وما يقابله من Pending في Data Model عندما تتم مزامنة الوثائق.

---

# ISSUE-0009 — Technology Stack Pending Marker Is Outdated

```text
Type:
DOCUMENTATION

Priority:
P2

Status:
APPROVED_FOR_FIX
```

## المشكلة

`ARCHITECTURE.md` يسجل:

```text
PENDING-ARCH-009
```

حول اختيار التقنية.

لكن `IMPLEMENTATION_PLAN.md` اعتمد للتنفيذ الأول:

```text
Next.js
React
TypeScript

PostgreSQL
Supabase

Supabase Auth
Supabase RLS
```

---

## القرار

يعتبر:

```text
Technology Stack for V1
=
APPROVED
```

وفق `IMPLEMENTATION_PLAN.md`.

---

## المطلوب

تحديث المرجع الأعلى عند أول Documentation Synchronization Pass.

---

# 14. DATA MODEL SYNCHRONIZATION

---

# ISSUE-0010 — PENDING-DM-001 Needs Closure

```text
Type:
DOCUMENTATION

Priority:
P2

Status:
IN_REVIEW
```

## الأصل

`DATA_MODEL.md` ترك نوع تخزين الرصيد الفيزيائي مفتوحًا بين:

```text
Direct Calculation
Cached Balance
Ledger
```

---

## القرار اللاحق

`DATABASE_SCHEMA.md` حسم أن:

```text
Account Balance
=
Opening Balance
+
POSTED Inflows
-
POSTED Outflows
```

ولا يوجد:

```text
accounts.balance
```

كمصدر حقيقة.

---

## المطلوب

إغلاق:

```text
PENDING-DM-001
```

عند تحديث Data Model.

---

# ISSUE-0011 — PENDING-DM-002 Needs Closure

```text
Type:
DOCUMENTATION

Priority:
P2

Status:
IN_REVIEW
```

## الأصل

طريقة التحويل كانت معلقة في Data Model.

---

## القرار اللاحق

اعتماد:

```text
Transfer Header
+
Two Ledger Entries
```

---

## المطلوب

إغلاق:

```text
PENDING-DM-002
```

---

# ISSUE-0012 — PENDING-DM-003 Needs Partial Closure

```text
Type:
DOCUMENTATION

Priority:
P2

Status:
IN_REVIEW
```

## المشكلة

`PENDING-DM-003` يتناول Opening Balances لـ:

* Accounts.
* Goals.
* Emergency Fund.

---

## ما حسم

Accounts:

```text
account_opening_balances
```

تم حسمه.

---

## ما يحتاج مراجعة

Opening balances لـ:

```text
Goals
Emergency Fund
```

يجب التأكد من تمثيلهما النهائي قبل اعتبار:

```text
PENDING-DM-003
```

مغلقًا بالكامل.

---

# 15. CURRENT V1 LIMITATIONS

هذه ليست Bugs.

بل قيود واعية لنطاق V1.

---

# ISSUE-0013 — Single User V1

```text
Type:
LIMITATION

Priority:
P3

Status:
ACCEPTED_LIMITATION
```

النظام V1 لمستخدم واحد:

```text
OWNER
```

لكن جميع البيانات تبقى مرتبطة بـ:

```text
user_id
```

للسماح بالتوسع مستقبلًا.

---

# ISSUE-0014 — No Native Mobile App

```text
Type:
LIMITATION

Priority:
P3

Status:
ACCEPTED_LIMITATION
```

V1:

```text
Responsive Web
```

يشمل:

* Desktop.
* Mobile Web.
* Tablet.

ولا يتطلب تطبيق iOS/Android Native.

---

# ISSUE-0015 — No Offline Mode

```text
Type:
LIMITATION

Priority:
P3

Status:
ACCEPTED_LIMITATION
```

لا يوجد Offline-first architecture في V1.

لا يتم اختراع Local Financial Ledger في Browser.

---

# ISSUE-0016 — Receipt Attachments Deferred

```text
Type:
LIMITATION

Priority:
P3

Status:
ACCEPTED_LIMITATION
```

الميزات التالية مستقبلية:

* Receipt.
* Invoice image.
* Merchant.
* Location.

ولا تحجب V1.

---

# ISSUE-0017 — Complex Investments Excluded

```text
Type:
LIMITATION

Priority:
P3

Status:
ACCEPTED_LIMITATION
```

خارج V1:

* Stocks.
* Crypto.
* Complex Investments.
* Business Accounting.
* Taxes.

---

# ISSUE-0018 — Complex Credit Card Accounting Deferred

```text
Type:
LIMITATION

Priority:
P3

Status:
ACCEPTED_LIMITATION
```

يمكن دعم المنطق الأساسي مستقبلًا بحيث:

```text
Purchase
=
Expense
```

و:

```text
Credit Card Payment
≠
Expense Again
```

لكن نظام البطاقات الائتمانية الكامل ليس جزءًا إلزاميًا من V1 الحالي.

---

# 16. SECURITY KNOWN ISSUES POLICY

عند ظهور مشكلة أمنية:

لا توضع فقط في هذه الوثيقة ثم تؤجل بلا تقييم.

---

## P0 Security

مثل:

```text
RLS Bypass
Cross-user read
Cross-user write
Exposed Service Role
Unauthenticated financial endpoint
```

يمنع Release فورًا.

---

# 17. DATA INTEGRITY ISSUE POLICY

أي مشكلة تؤثر على:

```text
Transaction Posting
Ledger
Snapshot
Plan Version
Obligation Reservation
```

تعامل كـP0 أو P1 حسب أثرها.

---

# 18. WORKAROUND POLICY

إذا اضطر المشروع إلى حل مؤقت:

يجب إنشاء Issue يحتوي:

```text
Workaround
Reason
Introduced Version
Owner
Removal Condition
Target Fix
Regression Risk
```

---

# 19. قاعدة Workaround

غير مسموح:

```text
Temporary fix
```

داخل الكود بدون Issue رسمي.

---

# 20. TODO Policy

أي TODO داخل Financial Code يجب أن يحتوي:

```text
ISSUE-XXXX
```

مثال:

```text
TODO(ISSUE-0043)
```

ولا يسمح بـ:

```text
TODO fix later
```

فقط.

---

# 21. Technical Debt

Technical Debt المقصود يسجل هنا.

مثال:

```text
ISSUE-0105
Temporary sequential query implementation
to be replaced with optimized read model
before Production.
```

---

# 22. Issue Blocking Levels

يمكن تحديد:

```text
Blocks Development
Blocks Feature
Blocks Staging
Blocks Production
Non-blocking
```

---

# 23. Current Blocking Matrix

## Blocks Core Production Logic

```text
ISSUE-0002
Required Financial Buffer
```

لأنه يؤثر مباشرة على Safe To Spend.

---

## Blocks Final Forecast

```text
ISSUE-0004
```

---

## Blocks Final AT_RISK

```text
ISSUE-0003
```

---

## Blocks Financial Health Score

```text
ISSUE-0001
```

---

## Blocks Automatic Multi-goal Allocation

```text
ISSUE-0005
```

---

## Blocks Emergency Months Coverage

```text
ISSUE-0006
```

---

# 24. ما لا يحجب Foundation

يمكن البدء في:

```text
Repository
CI
Database Foundation
Auth
RLS
Domain Types
State Machine infrastructure
Financial Engine infrastructure
Accounts
```

دون انتظار جميع القرارات الستة.

---

# 25. قاعدة Feature Boundary

إذا وصل التنفيذ إلى Feature تعتمد على Issue مفتوح:

```text
Stop at the approved boundary
```

ولا نخترع القرار.

---

# 26. مثال

Forecast:

```text
Interface
✓

Types
✓

Tests for interface behavior
✓

Final mathematical model
✗
```

حتى إغلاق:

```text
ISSUE-0004
```

---

# 27. مثال Safe To Spend

يمكن بناء:

```text
calculateSafeToSpend()
```

مع Input صريح:

```text
requiredFinancialBuffer
```

لكن لا تقوم الدالة باختراع قيمة Buffer بنفسها.

---

# 28. مثال AT_RISK

يمكن بناء State:

```text
AT_RISK
```

وآلية الانتقال.

لكن Rule Trigger النهائي يظل منفصلًا حتى اعتماد Threshold.

---

# 29. Issue Resolution

لا يغلق Issue بمجرد كتابة:

```text
تم الحل
```

---

# 30. شروط الإغلاق

يحتاج:

```text
Decision or Root Cause
✓

Source Document Updated
✓

Downstream Documents Reviewed
✓

Implementation Updated
✓

Tests Added / Updated
✓

Security Review if applicable
✓

CHANGELOG Entry
✓
```

---

# 31. FIXED vs VERIFIED

```text
FIXED
```

يعني أن التغيير نفذ.

```text
VERIFIED
```

يعني أن الاختبارات أثبتت صحة الحل.

ولا يغلق P0 مالي قبل:

```text
VERIFIED
```

---

# 32. CLOSED

الحالة:

```text
CLOSED
```

تستخدم بعد:

```text
Verified
+
Documentation Synced
+
Changelog Updated
```

---

# 33. Reopened Issue

إذا عاد Bug:

لا ينشأ Issue جديد تلقائيًا إذا كان نفس Root Cause.

يمكن:

```text
CLOSED
→
OPEN
```

مع تسجيل سبب إعادة الفتح.

---

# 34. Duplicate Issues

إذا كانت مشكلتان لنفس Root Cause:

يحتفظ Issue رئيسي واحد.

والآخر:

```text
DUPLICATE OF ISSUE-XXXX
```

---

# 35. Root Cause Rule

لا نعالج:

```text
Symptom
```

ونترك:

```text
Root Cause
```

---

# 36. مثال

غير صحيح:

```text
Button sometimes creates duplicate expense.
Fix:
Disable button.
```

لأن المشكلة قد تبقى عند Network Retry.

الصحيح:

```text
UI disable
+
Server Idempotency
+
Database uniqueness
```

---

# 37. Issue Evidence

يمكن للإصدار المستقبلي من Issue أن يحتوي:

* Screenshot.
* Request ID.
* Stack trace sanitized.
* Test failure.
* Migration reference.

لكن لا يحتوي أسرارًا.

---

# 38. Sensitive Data

لا يوضع داخل Issues:

```text
Password
Access Token
Refresh Token
Service Role
API Key
Full Private Financial Dataset
```

---

# 39. Production Incident

إذا كانت المشكلة Incident في Production:

يجب ربطها أيضًا بسجل Incident المناسب.

---

# 40. Release Blockers

لا يسمح بـProduction مع Issue مفتوح من نوع:

```text
P0
```

---

# 41. P1 Release Rule

P1 يحتاج قرارًا صريحًا قبل Production:

```text
Fix
or
Accepted Limitation
```

ولا يبقى مجهولًا.

---

# 42. Documentation Issues

Issues:

```text
ISSUE-0007
ISSUE-0008
ISSUE-0009
ISSUE-0010
ISSUE-0011
ISSUE-0012
```

يجب إغلاقها في أول:

```text
Documentation Synchronization Pass
```

قبل تثبيت Release Candidate.

---

# 43. أول Documentation Synchronization Pass

يجب أن يحدث قبل بدء تنفيذ الأجزاء التي تعتمد على القرارات المتأثرة.

المطلوب:

```text
ARCHITECTURE.md
↓
close resolved pending items

DATA_MODEL.md
↓
close resolved pending items

DATABASE_SCHEMA.md
↓
confirm final decisions

IMPLEMENTATION_PLAN.md
↓
confirm execution references

CHANGELOG.md
↓
record synchronization
```

---

# 44. Pending Decision Register

القائمة الرسمية الحالية:

```text
ISSUE-0001
Financial Health Score

ISSUE-0002
Required Financial Buffer

ISSUE-0003
AT_RISK Threshold

ISSUE-0004
Forecast Algorithm

ISSUE-0005
Multiple Goals Allocation

ISSUE-0006
Emergency Fund Target
```

---

# 45. لا يوجد قرار سابع مخفي

أي قرار مالي جديد يظهر أثناء التنفيذ يجب إضافته هنا فورًا.

ولا يضاف مباشرة في الكود.

---

# 46. قاعدة Source of Truth

`KNOWN_ISSUES.md` لا يحدد الحل المالي النهائي.

بعد اعتماد الحل:

يتم تحديث:

```text
BUSINESS_RULES.md
```

أولًا.

ثم الوثائق التابعة.

---

# 47. Example Resolution Flow

```text
ISSUE-0003
AT_RISK Threshold

↓ Decision Approved

BUSINESS_RULES.md
Update BR-081 / pending rule

↓

STATE_MACHINES.md
Update NORMAL → AT_RISK trigger

↓

DATA_MODEL.md
Update analytical rule

↓

ARCHITECTURE.md
Update Budget Risk Engine

↓

API / UI if affected

↓

TEST_PLAN.md
Add exact cases

↓

Implementation

↓

CHANGELOG.md

↓

Issue VERIFIED / CLOSED
```

---

# 48. Development Governance

قبل تنفيذ أي Feature:

نسأل:

```text
هل يعتمد على Known Issue مفتوح؟
```

إذا:

```text
No
```

نبدأ.

إذا:

```text
Yes
```

نحدد:

```text
Can implement infrastructure only?
```

أو:

```text
Decision required first?
```

---

# 49. KNOWN_ISSUES Definition of Done

الوثيقة تعتبر سليمة عندما:

```text
All known open financial decisions recorded
✓

All known documentation inconsistencies recorded
✓

Every issue has priority
✓

Every issue has state
✓

Every critical issue has blocking scope
✓

No hidden workaround
✓

No undocumented TODO in financial code
✓

Resolved issues linked to CHANGELOG
✓
```

---

# 50. الوضع الحالي قبل البرمجة

الوضع المرجعي الحالي:

```text
Core Product Vision
DEFINED

Workflows
DEFINED

Business Rules
DEFINED
with 6 explicit pending decisions

State Machines
DEFINED
with dependent pending states

Data Model
DEFINED

Architecture
DEFINED

UX Architecture
DEFINED

Design System
DEFINED

Wireframes
DEFINED

Visual Prototype Specification
DEFINED

Final UI Specification
DEFINED

API Contracts
DEFINED

Database Schema
DEFINED

Test Plan
DEFINED

Security
DEFINED

Implementation Plan
DEFINED

Known Issues
NOW DEFINED
```

---

# 51. ما يعنيه ذلك

لم يعد مسموحًا أثناء التنفيذ استخدام:

```text
"I assumed..."
```

في منطق مالي حرج.

إما أن القرار:

```text
APPROVED
```

أو:

```text
KNOWN ISSUE / OPEN DECISION
```

---

# 52. القاعدة النهائية

كل مشكلة أو قرار غير محسوم يجب أن يكون:

```text
Visible
Traceable
Prioritized
Owned
Testable
Resolvable
```

ولا توجد مشكلة حرجة مخفية داخل الكود.

المسار النهائي:

```text
Problem
↓
ISSUE
↓
Root Cause / Decision
↓
Source Update
↓
Implementation
↓
Tests
↓
CHANGELOG
↓
VERIFIED
↓
CLOSED
```
