# TEST_PLAN.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

## Master Test Plan

---

# 1. الهدف

تحدد هذه الوثيقة استراتيجية الاختبار الشاملة للنظام.

الهدف ليس فقط التأكد أن:

```text
الزر يعمل
```

بل التأكد من أن النظام:

* يحسب الأموال بصورة صحيحة.
* لا يكرر العمليات.
* لا يفقد البيانات.
* لا يسمح بحالات مالية غير منطقية.
* يطبق Business Rules.
* يطبق State Machines.
* يطبق API Contracts.
* يطبق Database Constraints.
* يحمي البيانات المالية.
* يعمل على Desktop وMobile.
* يتعامل مع الأخطاء بصورة سليمة.
* يستطيع التعافي من الفشل.
* يحافظ على التاريخ المالي.

---

# 2. فلسفة الاختبار

القاعدة الأساسية:

```text
Financial Correctness
>
UI Convenience
```

أي خطأ يؤدي إلى رقم مالي خاطئ يعتبر أعلى خطورة من خطأ بصري اعتيادي.

---

# 3. مستويات الخطورة

## Critical

خطأ قد يؤدي إلى:

* فقدان بيانات مالية.
* مضاعفة عملية مالية.
* رصيد خاطئ.
* Safe To Spend خاطئ.
* الوصول لبيانات مستخدم آخر.
* حذف تاريخ مالي.
* عملية نصف مكتملة.
* إغلاق دورة بنتائج غير صحيحة.

---

## High

خطأ يؤثر على:

* الميزانية.
* الالتزامات.
* الأهداف.
* الادخار.
* صندوق الطوارئ.
* التوقع.
* State Transition.

دون فقد كامل للبيانات.

---

## Medium

خطأ في:

* Workflow.
* Filtering.
* Pagination.
* UI State.
* Recommendation presentation.

---

## Low

خطأ بصري محدود لا يؤثر على القرار المالي.

---

# 4. أنواع الاختبارات

يجب أن يحتوي المشروع على:

```text
Unit Tests
Integration Tests
Database Tests
API Contract Tests
State Machine Tests
Financial Calculation Tests
Security Tests
E2E Tests
UI Tests
Responsive Tests
Accessibility Tests
Regression Tests
Performance Tests
Recovery Tests
```

---

# 5. Unit Tests

تستخدم لاختبار الوظائف الحتمية الصغيرة.

الأولوية القصوى:

```text
FinancialEngine
StateMachineEngine
ForecastEngine
Goal calculations
Emergency calculations
Budget calculations
```

---

# 6. Financial Engine Tests

يجب اختبار:

```text
calculateAccountBalance()
calculateCategoryActual()
calculateCategoryRemaining()
calculateCategoryUtilization()
calculateSafeToSpend()
calculateDailySafeLimit()
calculateProjectedEndBalance()
calculateExpectedDeficit()
calculateSavingRate()
calculateGoalProgress()
calculateEmergencyProgress()
```

---

# 7. قاعدة Deterministic Testing

لنفس المدخلات:

```text
Input A
```

يجب دائمًا الحصول على:

```text
Output A
```

ولا يجوز أن تختلف النتائج بسبب:

* الوقت غير المثبت.
* ترتيب السجلات.
* AI.
* الواجهة.
* Cache.

---

# 8. Money Precision Tests

يجب اختبار:

```text
0.01
0.10
1.99
100.00
999999.99
```

والتأكد من عدم ظهور أخطاء Floating Point مثل:

```text
0.1 + 0.2
=
0.30000000004
```

---

# 9. Safe To Spend Tests

يجب اختبار على الأقل:

## STS-001 — الحالة الطبيعية

```text
السيولة = 10,000
الالتزامات = 3,000
الاحتياجات = 2,000
الادخار = 1,000
الطوارئ = 500
الأهداف = 500
Buffer = 0
```

المتوقع:

```text
Safe To Spend = 3,000
```

---

## STS-002 — النتيجة صفر

إذا كانت جميع الأموال محجوزة:

```text
Safe To Spend = 0
```

---

## STS-003 — النتيجة الحسابية سالبة

مثال:

```text
Calculated = -700
```

واجهة Safe To Spend:

```text
0
```

لكن:

```text
Expected Deficit = 700
```

يجب ألا يختفي.

---

# 10. Daily Safe Limit Tests

مثال:

```text
Safe To Spend = 1,500
Days = 15
```

النتيجة:

```text
100
```

---

## حالة صفر أيام

إذا:

```text
Remaining Days = 0
```

يجب ألا تحدث:

```text
Division By Zero
```

---

# 11. Category Utilization Tests

مثال:

```text
Budget = 500
Actual = 250
```

النتيجة:

```text
50%
```

---

## تجاوز

```text
Budget = 500
Actual = 600
```

النتيجة:

```text
120%
OVER_BUDGET
```

ولا يتم إخفاء نسبة التجاوز عند 100%.

---

## Budget Zero

```text
Budget = 0
Actual > 0
```

يجب ألا تحدث قسمة على صفر.

---

# 12. Goal Progress Tests

```text
Target = 50,000
Current = 12,000
```

النتيجة:

```text
24%
```

---

## Goal Complete

```text
Current >= Target
```

الحالة:

```text
ACHIEVED
```

وعرض النسبة الأساسي:

```text
100%
```

---

# 13. Emergency Fund Tests

```text
Current = 12,000
Target = 30,000
```

النتيجة:

```text
40%
BUILDING
```

---

## Fully Funded

```text
Current >= Target
```

الحالة:

```text
FUNDED
```

---

## Depleted

بعد أن كان الصندوق مستخدمًا:

```text
Current = 0
```

الحالة:

```text
DEPLETED
```

---

# 14. Business Rule Coverage

كل:

```text
BR-XXX
```

يجب أن يرتبط بواحد أو أكثر من Test IDs.

مثال:

```text
BR-028
Expense Amount > 0
```

يرتبط:

```text
EXP-VALID-001
```

---

# 15. Business Rule Traceability

يتم إنشاء Matrix:

```text
Business Rule
Test ID
Test Type
Expected Result
Status
```

ولا تعتبر القاعدة منفذة دون Test.

---

# 16. State Machine Tests

كل Transition يجب اختبار:

```text
Allowed Transition
Forbidden Transition
Precondition Failure
Audit Creation
Rollback
```

---

# 17. Financial Cycle States

يجب اختبار:

```text
DRAFT → ACTIVE
ACTIVE → CLOSING
CLOSING → CLOSED
```

---

## الانتقالات الممنوعة

```text
DRAFT → CLOSED
CLOSED → ACTIVE
CLOSED → DRAFT
```

يجب أن تفشل.

---

# 18. Financial Plan Tests

```text
PLAN_DRAFT → ACTIVE_PLAN
ACTIVE_PLAN → REVISED
REVISED → ACTIVE_PLAN
ACTIVE_PLAN → CLOSED_PLAN
```

مع حفظ Version السابقة.

---

# 19. Transaction State Tests

المسموح:

```text
PENDING → POSTED
PENDING → FAILED
POSTED → REVERSED
```

الممنوع:

```text
FAILED → POSTED
REVERSED → POSTED
```

---

# 20. Obligation State Tests

```text
UPCOMING → DUE
DUE → OVERDUE
UPCOMING → PAID
DUE → PAID
OVERDUE → PAID
UPCOMING → CANCELLED
```

---

## Forbidden Obligation Transition

```text
PAID → UPCOMING
```

لنفس Occurrence يجب أن يفشل.

---

# 21. Goal State Tests

اختبار:

```text
DRAFT → ACTIVE
ACTIVE → FINANCIALLY_UNREALISTIC
FINANCIALLY_UNREALISTIC → ACTIVE
ACTIVE → PAUSED
PAUSED → ACTIVE
ACTIVE → ACHIEVED
→ CANCELLED
```

---

# 22. Goal Forbidden Tests

```text
ACHIEVED → ACTIVE
CANCELLED → ACTIVE
```

يجب أن تفشل بالطريقة الاعتيادية.

---

# 23. Recommendation Tests

```text
NEW → VIEWED
NEW → ACCEPTED
VIEWED → ACCEPTED
NEW → DISMISSED
VIEWED → DISMISSED
NEW → EXPIRED
ACCEPTED → RESOLVED
```

---

# 24. Database Constraint Tests

كل Constraint فعلي يجب اختباره.

---

# 25. One Active Cycle

محاولة إنشاء:

```text
ACTIVE Cycle A
ACTIVE Cycle B
```

لنفس المستخدم:

```text
FAIL
```

---

# 26. Expense Amount

```text
amount = 0
```

يجب أن يفشل.

```text
amount < 0
```

يجب أن يفشل.

---

# 27. Expense Category

مصروف بدون:

```text
category_id
```

يجب أن يفشل.

---

# 28. Posted Timestamp

```text
status = POSTED
posted_at = NULL
```

يجب أن يفشل.

---

# 29. Obligation Paid Integrity

```text
status = PAID
paid_transaction_id = NULL
```

يجب أن يفشل.

---

# 30. Goal Value

```text
target_amount <= 0
```

يجب أن يفشل.

---

# 31. Transfer Same Account

```text
from_account_id
=
to_account_id
```

يجب أن يفشل.

---

# 32. Plan Version

محاولة إنشاء:

```text
plan_id = X
version_number = 2
```

مرتين:

```text
FAIL
```

---

# 33. Cycle Snapshot

محاولة Snapshot ثانية لنفس Cycle:

```text
FAIL
```

---

# 34. Snapshot Modification

بعد إنشاء Snapshot:

```text
UPDATE
```

يجب أن يرفض في المسار الاعتيادي.

---

# 35. Snapshot Delete

```text
DELETE
```

يجب أن يرفض.

---

# 36. Idempotency Tests

هذه من أهم اختبارات النظام.

---

# 37. Duplicate Expense Test

إرسال:

```text
RecordExpense
```

مرتين بنفس:

```text
idempotency_key
```

يجب أن ينتج:

```text
One Financial Transaction
```

فقط.

---

# 38. Rapid Double Click

محاكاة:

```text
Click Save
Click Save
```

بسرعة.

يجب ألا ينتج مصروفان.

---

# 39. Retry After Timeout

السيناريو:

```text
Client sends expense
↓
Server succeeds
↓
Response lost
↓
Client retries
```

يجب أن تعاد نتيجة العملية الأصلية.

ولا ينشأ مصروف جديد.

---

# 40. Concurrent Duplicate Requests

طلبان بنفس Idempotency Key يصلان في نفس اللحظة.

النتيجة:

```text
One execution
```

فقط.

---

# 41. Atomicity Tests

أي عملية متعددة السجلات يجب اختبار فشل كل خطوة منها.

---

# 42. Pay Obligation Atomic Test

محاكاة فشل بعد:

```text
Create payment transaction
```

وقبل:

```text
Mark obligation PAID
```

المتوقع:

```text
ROLLBACK
```

ولا يبقى Payment منشورًا دون تحديث الالتزام.

---

# 43. Goal Contribution Atomic Test

إذا فشل تحديث الهدف:

يجب ألا تبقى المساهمة كعملية مكتملة وحدها.

---

# 44. Emergency Withdrawal Atomic Test

إذا فشل تسجيل سبب السحب أو البيانات التابعة:

لا يتم نشر السحب.

---

# 45. Transfer Atomic Test

إذا نجح:

```text
OUT
```

وفشل:

```text
IN
```

يجب Rollback كامل العملية.

---

# 46. Cycle Closing Atomicity

إذا فشل إنشاء:

```text
CycleSnapshot
```

لا تصبح الدورة:

```text
CLOSED
```

---

# 47. API Contract Tests

كل:

```text
API-C-XXX
```

و:

```text
API-Q-XXX
```

يجب أن يمتلك Contract Test.

---

# 48. Command Contract Tests

لكل Command:

```text
Valid Input
Invalid Input
Unauthenticated
Unauthorized
Invalid State
Duplicate Request
Database Failure
Expected Response
Side Effects
```

---

# 49. Query Contract Tests

لكل Query:

```text
Correct shape
Correct ownership
Correct filters
Correct sorting
Correct pagination
No internal fields leaked
```

---

# 50. Record Expense API Tests

على الأقل:

```text
EXP-API-001 valid expense
EXP-API-002 zero amount
EXP-API-003 missing category
EXP-API-004 inactive account
EXP-API-005 closed cycle
EXP-API-006 duplicate key
EXP-API-007 unauthorized account
EXP-API-008 DB rollback
```

---

# 51. Record Income Tests

تشمل:

```text
Expected = Actual
Actual < Expected
Actual > Expected
Partial Income
Multiple Income Entries
Duplicate Request
```

---

# 52. Lower Income Scenario

```text
Expected = 10,000
Actual = 8,500
```

يجب أن تعتمد الحسابات على:

```text
8,500
```

لا:

```text
10,000
```

---

# 53. Higher Income Scenario

```text
Expected = 10,000
Actual = 11,500
```

الفرق:

```text
1,500
```

لا يضاف تلقائيًا إلى Flexible Spending.

---

# 54. Refund Tests

يجب اختبار:

```text
Full Refund
Partial Refund
Refund > Original Expense
Invalid Original Transaction
Already Reversed Transaction
```

---

# 55. Transfer Tests

يجب إثبات:

```text
Total Liquidity Before
=
Total Liquidity After
```

للتحويل الداخلي.

---

# 56. Obligation Tests

تشمل:

```text
Early Payment
On-time Payment
Overdue Payment
Recurring Next Occurrence
Reservation Release
No Double Release
```

---

# 57. Reservation Critical Test

قبل السداد:

```text
Obligation Reserved = 1,200
```

بعد السداد:

* السيولة تنخفض 1,200.
* الحجز يزول.

لكن Safe To Spend يجب ألا يزيد 1,200 بصورة خاطئة بسبب Double Counting.

---

# 58. Savings Tests

تأكد من الفرق بين:

```text
Planned
Allocated
Transferred
```

---

# 59. Saving Allocation Test

تخصيص:

```text
1,000
```

لا يعني:

```text
Actual Saving = 1,000
```

حتى يتم التحويل فعليًا.

---

# 60. Emergency Tests

اختبار:

```text
Contribution
Partial Contribution
Withdrawal
Withdrawal Without Reason
Withdrawal to Zero
Rebuild
```

---

# 61. Goals Tests

اختبار:

```text
Create Goal
Analyze Goal
Activate
Contribute
Partial Progress
Unrealistic
Pause
Resume
Achieve
Cancel
```

---

# 62. Forecast Tests

حتى اعتماد الخوارزمية النهائية:

يتم اختبار Interface والسلوك العام فقط.

يجب التأكد من:

```text
Projected ≠ Actual
```

و:

```text
Projected < 0
→ DEFICIT_RISK
```

---

# 63. Recommendation Engine Tests

كل Recommendation Rule يجب أن يملك:

```text
Trigger Test
No-trigger Test
Priority Test
Deduplication Test
Resolution Test
```

---

# 64. Recommendation Deduplication

إذا ظل نفس الخطر موجودًا:

لا ينشئ النظام نفس التوصية عشرات المرات.

---

# 65. Conflicting Recommendation Test

يجب ألا يعرض النظام في الوقت ذاته:

```text
زد مصروفك المرن
```

و:

```text
خفض مصروفك المرن فورًا
```

لنفس الحالة دون تفسير.

---

# 66. AI Independence Tests

تعطيل AI بالكامل.

ثم التأكد أن المستخدم ما زال يستطيع:

```text
تسجيل مصروف
تسجيل دخل
رؤية Safe To Spend
رؤية الميزانية
سداد التزام
الادخار
الطوارئ
الأهداف
إغلاق الدورة
```

---

# 67. AI Hallucination Protection

إذا أعاد AI رقمًا غير موجود في `reason_data`:

لا يستخدم الرقم لتغيير:

```text
Balance
Safe To Spend
Budget
Goal
```

---

# 68. AI Failure Test

إذا أعاد AI:

```text
Timeout
500
Invalid Response
```

تظل العملية المالية ناجحة إذا كان الجزء المالي قد نجح.

---

# 69. Security Tests

التفصيل الأكبر سيكون في:

```text
SECURITY.md
```

لكن `TEST_PLAN` يفرض الحد الأدنى.

---

# 70. Cross-User Access

مستخدم A يحاول قراءة:

```text
Account B
```

لمستخدم B.

المتوقع:

```text
DENIED
```

---

# 71. ID Tampering

تغيير:

```text
account_id
goal_id
cycle_id
transaction_id
```

يدويًا في Request إلى ID لا يملكه المستخدم.

المتوقع:

```text
FORBIDDEN / NOT_FOUND
```

دون تسريب وجود الكيان إذا كان ذلك أكثر أمانًا.

---

# 72. RLS Tests

يجب اختبار:

```text
SELECT
INSERT
UPDATE
DELETE
```

لكل جدول حساس.

---

# 73. Authentication Tests

```text
No Session
Expired Session
Invalid Token
Revoked Session
Valid Session
```

---

# 74. Sensitive Data Exposure

يجب التأكد أن Responses لا تحتوي:

```text
service_role
auth secrets
database internals
request hashes
internal security metadata
stack traces
```

---

# 75. UI E2E Tests

الأداة المقترحة:

```text
Playwright
```

---

# 76. E2E — First Setup

```text
Create Account
↓
Add Financial Account
↓
Set Expected Salary
↓
Add Obligation
↓
Configure Saving
↓
Configure Emergency
↓
Add Goal
↓
Create First Plan
↓
Approve
↓
Dashboard
```

---

# 77. E2E — Salary Day

```text
Receive Salary
↓
Compare Expected / Actual
↓
Review Distribution
↓
Approve
↓
Safe To Spend appears
```

---

# 78. E2E — Daily Expense

```text
Dashboard
↓
Quick Add
↓
Expense
↓
Enter Amount
↓
Choose Category
↓
Choose Account
↓
Save
↓
Success
↓
Updated Safe To Spend
```

---

# 79. E2E — Obligation

```text
Obligations
↓
Open Obligation
↓
Pay
↓
Confirm
↓
PAID
↓
Next Occurrence
```

---

# 80. E2E — Goal

```text
Create Goal
↓
Analyze
↓
Activate
↓
Contribute
↓
Updated Progress
```

---

# 81. E2E — Emergency

```text
Emergency Fund
↓
Withdraw
↓
Enter Reason
↓
Confirm
↓
Balance Updated
↓
Recommendation
```

---

# 82. E2E — Cycle Closing

```text
Review Cycle
↓
Start Closing
↓
CLOSING
↓
Snapshot
↓
Report
↓
CLOSED
↓
Next Cycle Proposal
```

---

# 83. Negative E2E Tests

اختبار المستخدم وهو يحاول:

```text
Save twice
Refresh during save
Back during save
Submit invalid amount
Use deleted/inactive account
Pay paid obligation
Edit closed cycle
Reverse reversed transaction
```

---

# 84. Network Failure Tests

يجب اختبار:

```text
Connection drops before request
Connection drops during request
Connection drops after server success
Slow network
Request timeout
```

---

# 85. Critical Network Scenario

```text
Expense POST succeeds on server
↓
Client loses connection before response
↓
User retries
```

يجب عدم التكرار.

---

# 86. Browser Refresh Tests

Refresh أثناء:

```text
Expense Form
Plan Revision
Cycle Closing
Goal Contribution
```

يجب ألا يسبب عمليات إضافية.

---

# 87. Concurrency Tests

حتى مع مستخدم واحد يمكن وجود:

```text
Laptop
+
Mobile
```

مفتوحين في نفس الوقت.

---

# 88. Concurrent Expense

تسجيل عمليتين مختلفتين متزامنتين:

يجب احتسابهما كلتيهما بصورة صحيحة.

---

# 89. Concurrent Plan Revision

الجهاز A يفتح Version 2.

الجهاز B يعتمد Version 3.

الجهاز A يحاول تعديل Version 2.

المتوقع:

```text
CONFLICT
```

ولا يكتب فوق Version 3.

---

# 90. Concurrent Obligation Payment

الجهازان يحاولان دفع نفس الالتزام.

يجب:

```text
One Payment Only
```

---

# 91. Concurrent Cycle Closing

جهازان يحاولان إغلاق نفس الدورة.

يجب إنشاء:

```text
One Snapshot
```

فقط.

---

# 92. Responsive Testing

الأجهزة المرجعية:

```text
1440 × 900
1366 × 768
768 × 1024
390 × 844
360 × 800
```

---

# 93. Desktop Tests

التأكد من:

```text
Sidebar
Tables
Dialogs
Split Views
Spacing
No horizontal overflow
```

---

# 94. Mobile Tests

التأكد من:

```text
Bottom Navigation
Bottom Sheets
Touch Targets
Forms
Keyboard
No desktop sidebar
No clipped cards
No horizontal tables
```

---

# 95. RTL Tests

يجب اختبار:

```text
Sidebar
Navigation
Back Arrows
Chevrons
Tables
Forms
Money
Dates
Pagination
Dialogs
Bottom Sheets
Progress
```

---

# 96. Arabic Number Context

التأكد من أن:

```text
2,140 ريال
```

لا ينكسر بصريًا بسبب اتجاه النص.

---

# 97. Accessibility Tests

على الأقل:

```text
Keyboard navigation
Visible focus
Accessible names
Contrast
Form labels
Error association
Touch target
Screen reader landmarks
```

---

# 98. Color Independence

الحالات مثل:

```text
متأخر
متجاوز
مكتمل
```

يجب فهمها بدون الاعتماد على اللون فقط.

---

# 99. Performance Tests

رغم أن النظام شخصي، يجب تحديد Budgets منطقية.

---

# 100. Dashboard Performance

لا يحمل:

```text
All Historical Transactions
```

عند فتح Dashboard.

---

# 101. Transaction Pagination

اختبار:

```text
100
1,000
10,000
```

عملية تاريخية.

يجب استمرار Pagination وعدم تحميل الجميع.

---

# 102. Query Performance

قياس أهم Queries:

```text
Dashboard
Transaction List
Obligations
Goals
Advisor Feed
Cycle Report
```

---

# 103. N+1 Test

التأكد من عدم تنفيذ Query منفصلة لكل:

```text
Transaction
Goal
Obligation
```

في القوائم.

---

# 104. Background Job Tests

اختبار:

```text
Obligation Scheduler
Recommendation Expiry
Weekly Analysis
Cycle Reminders
```

---

# 105. Obligation Scheduler

عند تغير التاريخ:

```text
UPCOMING → DUE → OVERDUE
```

يجب أن يحدث مرة واحدة بصورة صحيحة.

---

# 106. Scheduler Idempotency

تشغيل Job نفسه مرتين:

لا يجب أن ينشئ:

* استحقاقات مكررة.
* توصيات مكررة.
* انتقالات مكررة.

---

# 107. Historical Integrity Tests

بعد إغلاق دورة:

يتم تعديل بيانات حالية مستقبلية.

ثم فتح تقرير الدورة القديمة.

يجب أن تظل نتائج التقرير كما كانت في Snapshot.

---

# 108. Plan Version Integrity

بعد:

```text
V1
→ V2
→ V3
```

يجب استمرار إمكانية معرفة:

* ماذا كان في V1؟
* ماذا تغير؟
* لماذا؟
* متى؟

---

# 109. Reversal Integrity Tests

عملية أصلية:

```text
POSTED
```

ثم:

```text
REVERSE
```

يجب:

* بقاء الأصل.
* وجود سجل عكس.
* تحديث الحالة.
* تصحيح الأثر المالي.
* عدم اعتبار Refund هو Reversal.

---

# 110. Data Migration Tests

كل Migration يجب اختبارها على:

```text
Empty Database
Existing Development Data
Staging-like Data
```

---

# 111. Migration Roll-forward

المبدأ الأساسي:

```text
Fix Forward
```

بعد نشر Migration.

ولا تعدل Migration المنشورة.

---

# 112. Backup Tests

يجب التأكد من:

```text
Backup Exists
```

لكن الأهم:

```text
Restore Works
```

---

# 113. Restore Drill

دوريًا في بيئة غير Production:

```text
Backup
↓
Restore
↓
Integrity Tests
↓
Application Smoke Test
```

---

# 114. Smoke Tests

بعد كل Deployment:

```text
Login
Dashboard
Create test-safe operation in non-production
Read transactions
Load budget
Load advisor
Load goals
```

---

# 115. Regression Suite

أي Bug مالي تم إصلاحه:

يجب إضافة:

```text
Regression Test
```

قبل اعتبار الإصلاح مكتملًا.

---

# 116. Root Cause Rule

لا يغلق Bug بـ:

```text
Patch
```

فقط.

يجب:

```text
Find Root Cause
↓
Fix
↓
Regression Test
```

---

# 117. Test Data

لا تستخدم بيانات Production الحقيقية في Development أو الاختبارات الآلية.

---

# 118. Seed Data

يبنى Dataset ثابت مثل:

```text
Income = 10,000

Accounts:
Checking = 8,000
Savings = 12,000

Obligations = 3,200
Essentials = 2,100
Saving = 1,000
Emergency = 500
Goals = 1,000
Flexible = 2,200
```

---

# 119. Scenario Fixtures

يجب وجود Fixtures لـ:

```text
Healthy Cycle
Deficit Cycle
No Income
Partial Income
Over-budget Cycle
Overdue Obligation
Emergency Depleted
Goal Unrealistic
Goal Achieved
Closed Cycle
```

---

# 120. Test Isolation

كل Test يجب ألا يعتمد على نتيجة Test سابق.

---

# 121. Time Control

الاختبارات الزمنية يجب أن تستخدم Clock ثابتًا.

خصوصًا:

```text
Due dates
Next income
Remaining days
Overdue
Cycle closing
Recommendation expiry
```

---

# 122. AI Test Isolation

Unit Tests لا تستدعي AI حقيقيًا.

تستخدم:

```text
Mock / Stub
```

---

# 123. External Dependency Failure

محاكاة:

```text
AI unavailable
Database temporary error
Monitoring unavailable
```

والتأكد من عدم فساد البيانات المالية.

---

# 124. Quality Gate

أي Pull Request يجب أن ينجح في:

```text
Lint
Typecheck
Unit Tests
Integration Tests
Database Tests
Build
```

---

# 125. Production Gate

قبل Production:

```text
All Critical Tests
All High Tests
E2E Core Flows
Security Tests
Migration Test
RLS Test
Backup Verification
Performance Smoke
Visual Review
```

---

# 126. No-Go Conditions

يمنع النشر إذا وجد:

```text
Critical Bug
Financial Calculation Failure
Duplicate Transaction Risk
Broken Idempotency
Broken RLS
Failed Migration
Snapshot Integrity Failure
State Machine Bypass
```

---

# 127. Bug Severity

## P0

بيانات مالية خاطئة أو تسريب أو فقد.

```text
Block Release
```

---

## P1

وظيفة مالية رئيسية لا تعمل.

```text
Block Release
```

---

## P2

خلل متوسط مع Workaround.

يمكن تقييمه قبل النشر.

---

## P3

خلل بصري أو منخفض التأثير.

---

# 128. Traceability Matrix

المرجع النهائي للاختبارات يجب أن يربط:

```text
Requirement
↓
Workflow
↓
BR
↓
State
↓
API Contract
↓
DB Constraint
↓
Test Case
```

---

# 129. مثال Traceability

```text
تسجيل مصروف
↓
Workflow #7
↓
BR-028..BR-034
↓
PENDING → POSTED
↓
API-C-011
↓
transactions constraints
↓
EXP-API-001..008
↓
E2E-DAY-001
```

---

# 130. Coverage Priorities

الأولوية:

```text
1. Money
2. State
3. Security
4. Historical Integrity
5. Idempotency
6. Workflows
7. UI
8. Visual Polish
```

---

# 131. Coverage Target

لا نعتمد رقم Coverage وحده كمؤشر جودة.

مثال:

```text
90% coverage
```

لا يعني أن النظام صحيح إذا لم تختبر السيناريوهات المالية الخطرة.

---

# 132. Mandatory 100% Logical Coverage

يجب أن تمتلك جميع:

```text
Critical Business Rules
Allowed State Transitions
Forbidden State Transitions
Financial Engine formulas
```

اختبارات صريحة.

---

# 133. Manual UAT

قبل الإنتاج يقوم المستخدم باختبار سيناريو واقعي كامل.

---

# 134. UAT Scenario

```text
إعداد النظام
↓
تسجيل راتب
↓
اعتماد الخطة
↓
عدة مصروفات
↓
التزام
↓
ادخار
↓
هدف
↓
طوارئ
↓
توصية
↓
إغلاق دورة
↓
تقرير
↓
دورة جديدة
```

---

# 135. UAT Acceptance

المستخدم يجب أن يستطيع الإجابة بسهولة عن:

```text
أين ذهبت أموالي؟
كم أستطيع أن أصرف الآن؟
هل وضعي يتحسن؟
ماذا أفعل بعد ذلك؟
```

---

# 136. Test Documentation

عند فشل Test يجب تسجيل:

```text
Test ID
Environment
Input
Expected
Actual
Logs
Screenshot عند الحاجة
Severity
Related Requirement
```

---

# 137. Definition of Test Done

Feature لا تعتبر مختبرة حتى:

```text
Happy Path
✓

Validation
✓

Negative Cases
✓

State Transitions
✓

Atomicity
✓

Idempotency
✓

Authorization
✓

Database Constraints
✓

Error UX
✓

Desktop
✓

Mobile
✓

RTL
✓

Regression
✓
```

---

# 138. Definition of Release Ready

الإصدار جاهز فقط إذا:

```text
0 P0
0 P1

Critical Financial Tests
100% Passed

Security Critical Tests
100% Passed

Core E2E
100% Passed

Database Migration
Passed

RLS
Passed

Backup
Verified

No unresolved data-integrity issue
```

---

# 139. الاختبارات المعلقة

بعض الاختبارات النهائية لا يمكن كتابتها حسابيًا قبل حسم القواعد التالية:

```text
Financial Health Score
AT_RISK exact threshold
Advanced Forecasting Formula
Required Financial Buffer
Goal Allocation Priority
Emergency Months Coverage
```

يتم إنشاء Test Placeholders لها فقط حتى اعتماد القواعد.

---

# 140. قاعدة الحوكمة

أي Business Rule جديدة:

```text
New BR
↓
New / Updated Test
```

أي State جديدة:

```text
New State
↓
Allowed + Forbidden Transition Tests
```

أي API جديد:

```text
New API
↓
Contract Tests
```

أي Bug:

```text
Bug
↓
Root Cause
↓
Fix
↓
Regression Test
```

ولا يعتبر التغيير مكتملًا دون تحديث الاختبارات المرتبطة به.

---

# 141. النتيجة النهائية

هدف خطة الاختبار هو جعل هذا التسلسل صحيحًا دائمًا:

```text
User Action
↓
Validated Command
↓
Allowed State
↓
Atomic Transaction
↓
Correct Financial Result
↓
Correct Historical Record
↓
Correct Read Model
↓
Correct UI
```

وأي اختبار يثبت كسر هذا التسلسل يجب أن يمنع إصدار النسخة حتى يتم إصلاح السبب الجذري.
