# ARCHITECTURE.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

---

# 1. الهدف من الوثيقة

تحدد هذه الوثيقة البنية التقنية للنظام وكيف تتوزع المسؤوليات بين:

* الواجهة.
* منطق التطبيق.
* المحرك المالي.
* قاعدة البيانات.
* المستشار المالي.
* المصادقة.
* المهام الخلفية.
* السجلات والمراقبة.
* النسخ الاحتياطي.
* الاختبارات.
* بيئات التشغيل.

الهدف الأساسي هو بناء نظام:

* قابل للصيانة.
* قابل للاختبار.
* لا يكرر المنطق المالي.
* يحافظ على سلامة البيانات.
* يمنع العمليات المكررة.
* يحافظ على التاريخ المالي.
* مناسب للويب والجوال.
* قابل للتوسع مستقبلًا.

---

# 2. المبادئ المعمارية الملزمة

## ARCH-RULE-001 — Source of Truth واحد

مصدر الحقيقة للحركات المالية الفعلية هو:

```text
POSTED Transactions
```

ومصدر الحقيقة للتخطيط هو:

```text
Approved Plan Version
```

ولا يجوز أن تعتمد الواجهات أو المستشار المالي على نسخ منفصلة غير موثوقة من البيانات.

---

## ARCH-RULE-002 — الواجهة ليست مصدر الحقيقة

Frontend مسؤول عن:

* العرض.
* الإدخال.
* التفاعل.
* التحقق الأولي.

لكن لا يجوز أن يكون مسؤولًا وحده عن:

* القيود المالية.
* الانتقالات الحرجة.
* الحسابات الرسمية.
* منع التكرار.
* سلامة الأرصدة.

---

## ARCH-RULE-003 — الحسابات المالية مركزية

جميع الحسابات الأساسية يجب أن تمر عبر طبقة واحدة مركزية.

مثل:

```text
Safe To Spend
Daily Safe Limit
Projected End Balance
Expected Deficit
Goal Progress
Emergency Completion
Category Utilization
```

ممنوع إعادة تنفيذ نفس المعادلة داخل عدة صفحات.

---

## ARCH-RULE-004 — كل عملية مالية ذرية

أي عملية تؤثر على أكثر من سجل يجب أن تنفذ كعملية واحدة موثوقة.

إما:

```text
COMMIT
```

أو:

```text
ROLLBACK
```

ولا يسمح بحالة:

```text
تم خصم الرصيد
لكن فشل تسجيل العملية
```

أو العكس.

---

## ARCH-RULE-005 — لا تعديل مباشر للحالات

كل انتقال State يجب أن يمر عبر:

```text
State Transition Service
```

بحسب `STATE_MACHINES.md`.

---

## ARCH-RULE-006 — التاريخ المالي Append-Oriented

العمليات التاريخية لا تعدل بطريقة تمحو الحقيقة السابقة.

يستخدم النظام:

* Reversal.
* New Version.
* Cancellation.
* Snapshot.

حسب الكيان.

---

# 3. النمط المعماري العام

البنية المقترحة:

```text
Client
↓
Application Layer
↓
Domain Layer
↓
Data Access Layer
↓
Database
```

مع خدمات مستقلة منطقيًا لـ:

```text
Financial Engine
Recommendation Engine
Forecast Engine
State Machine Engine
```

---

# 4. Frontend Layer

الواجهة مسؤولة عن:

* عرض البيانات.
* النماذج.
* التنقل.
* حالات Loading.
* حالات Error.
* Empty States.
* تنفيذ الإجراءات التي يختارها المستخدم.
* عرض توصيات المستشار.

ولا تقوم مباشرة بتعديل الجداول الحرجة.

---

# 5. واجهتا Desktop وMobile

بناءً على SYSTEM_MASTER:

يجب أن تكون تجربة الجوال مستقلة منطقيًا عن Desktop.

المقصود ليس مشروعين منفصلين.

بل:

```text
Shared Domain
Shared Components
Shared Data
```

مع:

```text
Desktop Layout
Mobile Layout
Tablet Layout
```

مختلفة عند الحاجة.

---

# 6. Application Layer

تستقبل أوامر المستخدم.

أمثلة:

```text
CreateExpense
ReceiveIncome
ApproveFinancialPlan
PayObligation
TransferSaving
ContributeToGoal
WithdrawEmergencyFund
CloseFinancialCycle
```

ولا تتعامل الواجهة مباشرة مع SQL أو الجداول.

---

# 7. Command-Based Operations

كل فعل مهم يمثل Command.

مثال:

```text
RecordExpenseCommand
```

يتضمن:

```text
user_id
cycle_id
account_id
category_id
amount
transaction_date
planning_status
expense_nature
idempotency_key
```

ثم يمر عبر:

```text
Validation
↓
Business Rules
↓
State Validation
↓
Database Transaction
↓
Recalculation
↓
Recommendation Evaluation
```

---

# 8. Domain Layer

هذه أهم طبقة في النظام.

تحتوي على المنطق المالي الحقيقي وليس تفاصيل الواجهة.

وتتكون مبدئيًا من:

```text
FinancialCycleDomain
FinancialPlanDomain
TransactionDomain
BudgetDomain
ObligationDomain
SavingDomain
EmergencyFundDomain
GoalDomain
RecommendationDomain
```

---

# 9. Financial Engine

محرك مالي مركزي مسؤول عن جميع الحسابات.

مبدئيًا:

```text
FinancialEngine
├── calculateAccountBalance()
├── calculateCategoryActual()
├── calculateCategoryRemaining()
├── calculateCategoryUtilization()
├── calculateSafeToSpend()
├── calculateDailySafeLimit()
├── calculateProjectedEndBalance()
├── calculateExpectedDeficit()
├── calculateSavingRate()
├── calculateGoalProgress()
├── calculateEmergencyProgress()
└── calculateCycleSummary()
```

---

# 10. قاعدة Deterministic Calculations

المحرك المالي يجب أن يكون:

```text
Deterministic
```

أي:

# نفس المدخلات

نفس النتيجة دائمًا.

ولا تستخدم نماذج الذكاء الاصطناعي لحساب القيم المالية الأساسية.

---

# 11. AI لا يحسب الرصيد

الذكاء الاصطناعي لا يكون مصدر الحقيقة لـ:

```text
Safe To Spend
Account Balance
Expected Deficit
Budget Remaining
Goal Balance
```

هذه كلها تحسب برمجيًا.

الذكاء الاصطناعي يستخدم لتفسير النتائج وصياغة التوصيات عند الحاجة.

---

# 12. Recommendation Engine

المستشار المالي يبنى بطبقتين.

```text
Rule Engine
↓
AI Explanation Layer
```

---

# 13. Rule Engine

يكتشف الأحداث المالية بطريقة حتمية.

مثال:

```text
Projected End Balance < 0
↓
DEFICIT_RISK
```

أو:

```text
Obligation Status = OVERDUE
↓
OBLIGATION_OVERDUE
```

أو:

```text
Goal Required Contribution
>
Available Financial Capacity
↓
GOAL_UNREALISTIC
```

---

# 14. AI Explanation Layer

بعد اكتشاف الحدث برمجيًا يمكن تمرير بيانات منظمة إلى نموذج الذكاء الاصطناعي.

مثال:

```text
Reason:
CATEGORY_SPEND_RATE_HIGH

Budget:
500

Spent:
470

Elapsed:
45%

Utilization:
94%
```

ثم يطلب منه:

* تفسير الحالة.
* صياغة توصية.
* تقديم خيارات.
* تبسيط الأرقام.

---

# 15. الذكاء الاصطناعي لا يعدل البيانات تلقائيًا

طبقًا لقواعد الأعمال:

```text
AI Recommendation
↓
User Decision
↓
Application Command
↓
Validated Execution
```

وليس:

```text
AI
↓
Direct Database Write
```

---

# 16. Explainability

كل توصية يجب أن تحفظ معها:

```text
reason_code
reason_data
```

بحيث يمكن للنظام إظهار:

> لماذا ظهرت هذه التوصية؟

حتى لو تم تغيير نموذج الذكاء الاصطناعي لاحقًا.

---

# 17. Forecast Engine

التوقع المالي يجب أن يكون خدمة مستقلة منطقيًا.

```text
ForecastEngine
```

مدخلاته على الأقل:

* Actual spending.
* Remaining days.
* Upcoming obligations.
* Expected essential spending.
* Historical patterns عند توفرها.

---

# 18. Forecasting Version 1

بما أن `PENDING-BR-004` لم يحسم المعادلة الدقيقة، لا نعتمد نموذجًا رياضيًا نهائيًا في هذه الوثيقة.

المعمارية فقط تشترط:

```text
Forecast Engine
```

يمكن تغيير خوارزميته دون تغيير بقية النظام.

---

# 19. Financial Health Engine

يتم إنشاء Interface:

```text
FinancialHealthEngine
```

لكن لا يتم اعتماد المعادلة النهائية حتى إغلاق:

```text
PENDING-BR-001
```

---

# 20. Goal Allocation Engine

يتم عزل توزيع القدرة المالية بين الأهداف داخل:

```text
GoalAllocationEngine
```

لكن خوارزمية الأولويات النهائية تبقى معلقة حتى:

```text
PENDING-BR-005
```

---

# 21. Emergency Fund Engine

توجد خدمة:

```text
EmergencyFundEngine
```

تدير:

* الرصيد.
* التغطية.
* الفجوة.
* إعادة البناء.

لكن تعريف الهدف النهائي حسب الأشهر يبقى معلقًا حتى:

```text
PENDING-BR-006
```

---

# 22. State Machine Engine

يجب إنشاء منطق موحد للحالات.

مثال:

```text
transition(
  entity,
  fromState,
  event
)
```

ثم يتحقق من:

* الحالة الحالية.
* الحدث.
* الانتقال المسموح.
* الشروط.
* التسجيل في StateTransitionLog.

---

# 23. Database Layer

## القرار التقني المقترح

قاعدة بيانات علائقية:

```text
PostgreSQL
```

لأن النظام يحتوي على:

* علاقات واضحة.
* معاملات مالية.
* Foreign Keys.
* Unique Constraints.
* Transactions.
* Historical integrity.

هذا قرار معماري مقترح وليس مطلبًا منصوصًا عليه في المصادر.

---

# 24. المنصة المقترحة لقاعدة البيانات

خيار مناسب للإصدار الأول:

```text
Supabase PostgreSQL
```

مع:

```text
Database
Auth
RLS
Edge / Server capabilities
Backups حسب الخطة
```

ويمكن تغيير مقدم الخدمة دون تغيير Domain Model إذا حافظنا على فصل الطبقات.

---

# 25. Database Transactions

العمليات الحرجة تستخدم Database Transaction.

مثال سداد التزام:

```text
BEGIN

Create Transaction(PENDING)
↓
Validate Obligation
↓
Post Financial Transaction
↓
Set Obligation = PAID
↓
Release Reservation
↓
Create Next Occurrence if recurring
↓
Write StateTransitionLog
↓
Set Transaction = POSTED

COMMIT
```

إذا فشلت أي خطوة:

```text
ROLLBACK
```

---

# 26. Idempotency Layer

كل Write حساس يحتوي:

```text
idempotency_key
```

القاعدة:

```text
Same User
+
Same Operation
+
Same Idempotency Key
=
Same Result
```

ولا ينشئ عملية مالية جديدة.

---

# 27. Unique Constraints

المقترح مبدئيًا:

```text
FinancialCycle:
one ACTIVE per user
```

```text
CycleSnapshot:
unique cycle_id
```

```text
PlanVersion:
unique(plan_id, version_number)
```

```text
Idempotency:
unique(user_id, idempotency_key)
```

```text
ObligationOccurrence:
paid_transaction_id unique when not null
```

---

# 28. Money Data Type

يحظر استخدام:

```text
FLOAT
DOUBLE
```

للأموال.

المقترح:

```text
NUMERIC / DECIMAL
```

بدقة ثابتة مناسبة للريال السعودي.

---

# 29. Currency

الإصدار الحالي يستخدم:

```text
SAR
```

لكن Account يحتفظ بـ:

```text
currency
```

حتى لا تمنع المعمارية دعم عملات أخرى مستقبلًا.

---

# 30. Authentication

رغم أن النظام لمستخدم واحد حاليًا، يجب أن يحتوي مصادقة حقيقية.

لا يكفي رابط سري.

المقترح:

```text
Email Authentication
```

مع إمكانية دعم:

```text
Passkey / MFA
```

مستقبلًا.

---

# 31. Authorization

الإصدار الأول:

```text
OWNER
```

فقط.

لكن كل Query وWrite يجب أن يكون مقيدًا بـ:

```text
user_id
```

حتى لو لم يكن هناك مستخدم ثانٍ حاليًا.

---

# 32. Row-Level Security

إذا استخدمت Supabase، يوصى بتفعيل:

```text
RLS
```

بحيث:

```text
auth.uid() = user_id
```

على بيانات المستخدم المالية.

---

# 33. عدم الاعتماد على Frontend Authorization

إخفاء زر ليس حماية.

كل صلاحية حرجة يجب أن تتحقق في:

```text
Server / Database Layer
```

---

# 34. Backend

## القرار المقترح

الـBackend يكون منطقًا Server-Side واضحًا.

يمكن استخدام:

```text
Next.js Server Actions / Route Handlers
```

أو طبقة API مستقلة.

القرار النهائي يجب أن يحافظ على:

```text
UI
≠
Domain Logic
```

---

# 35. Frontend Technology

## القرار المقترح

```text
Next.js
React
TypeScript
```

السبب المعماري:

* Web.
* Responsive.
* Server-side capabilities.
* Type safety.
* دعم جيد لبناء PWA مستقبلًا.
* قابلية مشاركة المكونات.

هذا اقتراح تقني وليس مطلبًا من المصادر.

---

# 36. TypeScript

يجب استخدام أنواع واضحة للكيانات.

مثل:

```text
TransactionType
TransactionStatus
FinancialCycleStatus
GoalStatus
RecommendationStatus
```

ولا تستخدم Strings عشوائية في الواجهة.

---

# 37. Validation Layer

المقترح:

```text
Schema Validation
```

على المدخلات قبل دخول Domain Layer.

مثال:

```text
amount > 0
transaction_date required
category required for EXPENSE
reason required for EMERGENCY_WITHDRAWAL
```

لكن التحقق النهائي يبقى على الخادم.

---

# 38. Repository Layer

الوصول للبيانات لا ينتشر داخل المشروع.

تستخدم Repositories مثل:

```text
TransactionRepository
CycleRepository
PlanRepository
ObligationRepository
GoalRepository
RecommendationRepository
```

---

# 39. Services

الخدمات الأساسية:

```text
FinancialCycleService
FinancialPlanService
TransactionService
BudgetService
ObligationService
SavingService
EmergencyFundService
GoalService
RecommendationService
ForecastService
CycleClosingService
```

---

# 40. Read Models

لا يجب تحميل كل الجداول إلى الواجهة ثم إجراء الحسابات.

يتم بناء Queries مخصصة للقراءة.

مثل:

```text
DashboardSummary
CurrentCycleSummary
BudgetProgress
UpcomingObligations
GoalProgressList
AdvisorFeed
```

---

# 41. Dashboard Architecture

Dashboard لا يمتلك بيانات مستقلة.

بل يجمع:

```text
Financial Engine
+
Read Models
+
Current Cycle
+
Recommendations
```

---

# 42. Cache

لا نحتاج Cache معقدًا في الإصدار الأول.

لكن يمكن استخدام Cache للبيانات المشتقة المكلفة فقط.

ويجب ألا يصبح Cache مصدر الحقيقة.

---

# 43. Recalculation Strategy

بعد عملية مالية:

```text
POST Transaction
↓
Recalculate Current Cycle Metrics
↓
Evaluate Budget Risks
↓
Evaluate Deficit Risk
↓
Evaluate Goal Feasibility
↓
Evaluate Recommendations
```

---

# 44. Event Model

يفضل إنتاج أحداث داخلية مثل:

```text
INCOME_RECEIVED
EXPENSE_POSTED
PLAN_APPROVED
OBLIGATION_PAID
OBLIGATION_OVERDUE
GOAL_CONTRIBUTION_POSTED
EMERGENCY_WITHDRAWAL_POSTED
CYCLE_CLOSED
```

---

# 45. لماذا Events؟

حتى لا يصبح:

```text
TransactionService
```

مسؤولًا بنفسه عن:

* الحساب.
* التوصيات.
* التقارير.
* التنبيهات.
* التاريخ.

بل ينتج حدثًا، وتستجيب الخدمات المختصة.

---

# 46. Event Processing في الإصدار الأول

لا نحتاج Message Broker معقدًا.

يمكن تنفيذ الأحداث داخل التطبيق بصورة موثوقة.

ويظل التصميم قابلًا للتوسع مستقبلًا.

---

# 47. Background Jobs

يحتاج النظام مهام زمنية مثل:

```text
Update obligation statuses
Expire recommendations
Weekly analysis
Cycle reminders
```

ولا تعتمد هذه الوظائف على أن يفتح المستخدم التطبيق.

---

# 48. Obligation Scheduler

مهمة دورية:

```text
UPCOMING
↓
DUE
↓
OVERDUE
```

بحسب التاريخ.

---

# 49. Weekly Analysis

توجد مهمة أسبوعية تقوم بـ:

```text
Calculate
↓
Analyze
↓
Generate Recommendation Summary
```

وفق Workflow الحالي.

---

# 50. Cycle Closing

إغلاق الدورة يجب ألا يكون مجرد تغيير:

```text
status = CLOSED
```

بل Service كاملة:

```text
CycleClosingService
```

تنفذ:

1. Lock cycle.
2. Validate operations.
3. Calculate final metrics.
4. Create CycleSnapshot.
5. Create CycleCategorySnapshots.
6. Generate CycleReview.
7. Close Plan.
8. Close Cycle.
9. Log state transitions.

---

# 51. Snapshot Integrity

بعد إنشاء Snapshot لدورة مغلقة، لا يعاد حساب التاريخ القديم من البيانات الحالية أثناء عرض التقرير.

يتم استخدام Snapshot التاريخي.

---

# 52. Logging

يجب وجود سجلين مختلفين:

## Business Audit

مثل:

```text
StateTransitionLog
Plan Versions
Reversals
```

## Technical Logs

مثل:

```text
request errors
database errors
job failures
AI failures
```

---

# 53. Monitoring

المقترح استخدام خدمة Monitoring مثل:

```text
Sentry
```

أو ما يعادلها.

تراقب:

* JavaScript errors.
* Server errors.
* Failed requests.
* Performance.
* Background job failures.

---

# 54. عدم تسجيل البيانات المالية الحساسة في Logs

لا يجب أن تحتوي Technical Logs على بيانات مالية كاملة بلا حاجة.

مثل:

```text
Full account data
Private notes
Authentication tokens
```

---

# 55. AI Privacy Boundary

لا يرسل للذكاء الاصطناعي إلا الحد الأدنى المطلوب لصياغة التوصية.

مثال:

بدل إرسال جميع Transactions:

```text
Category: Restaurants
Budget: 500
Spent: 470
Elapsed: 45%
```

---

# 56. AI Failure Strategy

إذا تعطل AI:

النظام المالي يجب أن يستمر في العمل.

يظل المستخدم قادرًا على:

* تسجيل المصروف.
* رؤية الرصيد.
* حساب Safe To Spend.
* رؤية العجز.
* استخدام الأهداف.
* إغلاق الدورة.

وقد تختفي فقط الصياغة الذكية مؤقتًا.

---

# 57. Rule-Based Fallback

حتى إذا تعطل AI، Recommendation Engine يمكن أن يعرض رسالة Template.

مثال:

```text
CATEGORY_SPEND_RATE_HIGH
```

↓

> معدل الصرف في هذا البند أعلى من معدل تقدم الدورة.

---

# 58. Security

النظام يتعامل مع بيانات مالية شخصية حساسة.

يجب تطبيق:

* HTTPS.
* Secure authentication.
* Server-side validation.
* RLS.
* CSRF protection عند الحاجة.
* Rate limiting على endpoints الحساسة.
* Secret management.
* عدم وضع مفاتيح سرية داخل Frontend.

---

# 59. Secrets

تخزن:

```text
Database keys
AI keys
Monitoring keys
```

في:

```text
Environment Variables / Secret Manager
```

ولا تدخل Git.

---

# 60. Environment Separation

يجب وجود:

```text
Development
Staging
Production
```

---

# 61. Development

يستخدم للتطوير المحلي والتجارب.

بياناته ليست بيانات Production.

---

# 62. Staging

يشبه Production قدر الإمكان.

يستخدم لـ:

* Migration tests.
* E2E.
* Regression.
* UI review.
* Release validation.

---

# 63. Production

البيئة الفعلية.

لا يتم تنفيذ تغييرات Schema يدويًا بصورة عشوائية عليها.

---

# 64. Database Migrations

كل تغيير في قاعدة البيانات يجب أن يكون Migration versioned.

مثل:

```text
001_initial_schema
002_add_goal_allocations
003_add_cycle_snapshot
```

---

# 65. Git

كل المشروع تحت Source Control.

الفروع المقترحة:

```text
main
develop
feature/*
fix/*
```

أو نموذج أبسط حسب أسلوب التطوير.

---

# 66. CI Quality Gate

قبل دمج أي تغيير:

```text
Lint
↓
Type Check
↓
Unit Tests
↓
Integration Tests
↓
Build
```

وقبل Production يضاف:

```text
E2E
Migration Validation
Security Checks
```

---

# 67. Testing Architecture

## Unit Tests

لـ:

```text
Financial Engine
Business Rules
State Machines
Forecast helpers
```

---

## Integration Tests

لـ:

```text
Database Transactions
Repositories
Services
RLS
Idempotency
```

---

## E2E

للتدفقات الأساسية:

```text
Receive Salary
↓
Approve Plan
↓
Record Expense
↓
Pay Obligation
↓
Contribute to Goal
↓
Close Cycle
```

---

# 68. Critical Test Principle

كل:

```text
BR-XXX
```

حرج يجب ربطه باختبار أو أكثر.

---

# 69. Backup

يجب وجود Backup منتظم لقاعدة البيانات.

وبسبب طبيعة البيانات:

يجب اختبار:

```text
Restore
```

وليس فقط وجود Backup.

---

# 70. Disaster Recovery

على الأقل يجب أن يعرف النظام أو فريق التطوير:

* آخر Backup صالح.
* طريقة الاستعادة.
* ما البيانات الممكن فقدانها.
* خطوات العودة للخدمة.

---

# 71. Mobile Strategy

الإصدار الأول:

```text
Responsive Web App
```

مع إمكانية استخدام:

```text
PWA
```

لاحقًا إذا احتجنا:

* تثبيت على الشاشة.
* تحسين تجربة الجوال.
* بعض الإمكانيات المحلية.

---

# 72. Native Mobile App

لا توجد حاجة معتمدة حاليًا لبناء:

```text
iOS Native
Android Native
```

من البداية.

ويفضل عدم مضاعفة قاعدة الكود دون حاجة.

---

# 73. Offline Mode

المصادر الحالية لا تطلب العمل بدون إنترنت.

لذلك لا نبني Offline Financial Sync في الإصدار الأول.

يمكن إضافته لاحقًا إذا أصبح مطلبًا رسميًا.

---

# 74. API Contracts

قبل كتابة الواجهات النهائية يجب توثيق عقود العمليات.

مثل:

```text
POST /transactions/expense
POST /income/receive
POST /plans/{id}/approve
POST /obligations/{id}/pay
POST /goals/{id}/contribute
POST /cycles/{id}/close
```

التسمية النهائية تعتمد على نمط التنفيذ.

---

# 75. Errors

يجب إنشاء Error Model موحد.

مثل:

```text
VALIDATION_ERROR
INVALID_STATE_TRANSITION
INSUFFICIENT_FINANCIAL_CAPACITY
DUPLICATE_OPERATION
ENTITY_NOT_FOUND
CYCLE_CLOSED
PLAN_NOT_ACTIVE
INVALID_AMOUNT
DATABASE_ERROR
```

---

# 76. Error Response

أي Error يجب أن يحتوي منطقيًا:

```text
code
message
context
retryable
```

دون كشف تفاصيل داخلية حساسة.

---

# 77. Performance

الإصدار الأول لمستخدم واحد، لذلك لا نحتاج تعقيد Scale مبالغًا فيه.

لكن يمنع:

* تحميل كل تاريخ العمليات في كل صفحة.
* Recalculate كامل التاريخ بعد كل مصروف.
* إرسال كل البيانات إلى AI.
* N+1 Queries.
* Queries دون Indexes لاحقًا.

---

# 78. Pagination

قوائم العمليات التاريخية تستخدم:

```text
Pagination
```

وليس:

```text
Load All Transactions
```

---

# 79. Query Indexing

الـIndexes النهائية تحسم عند بناء Schema الفيزيائي.

لكن يجب توقع Indexes على الأقل حول:

```text
user_id
cycle_id
transaction_date
status
category_id
goal_id
due_date
created_at
```

---

# 80. Architecture Decision Records

أي قرار تقني مهم يمكن حفظه في:

```text
/docs/adr/
```

مثال:

```text
ADR-001-postgresql.md
ADR-002-transaction-ledger.md
ADR-003-ai-advisor-boundary.md
```

حتى لا تضيع أسباب القرارات.

---

# 81. المقترح التقني للإصدار الأول

هذه قائمة مقترحة وليست جزءًا محسومًا من المصادر:

```text
Frontend:
Next.js + React + TypeScript

Backend:
Next.js Server Layer

Database:
PostgreSQL

Platform:
Supabase

Authentication:
Supabase Auth

Database Security:
RLS

Validation:
Schema-based validation

Monitoring:
Sentry or equivalent

Testing:
Unit + Integration + Playwright E2E

Deployment:
Managed web hosting

Source Control:
Git + GitHub
```

---

# 82. Architecture Map

```text
USER
│
▼
WEB / MOBILE UI
│
▼
APPLICATION COMMANDS
│
├── Validation
├── Authentication
├── Authorization
└── Idempotency
│
▼
DOMAIN SERVICES
│
├── Transaction Service
├── Budget Service
├── Cycle Service
├── Obligation Service
├── Saving Service
├── Emergency Service
└── Goal Service
│
├───────────────┐
▼               ▼
FINANCIAL       STATE MACHINE
ENGINE          ENGINE
│               │
└───────┬───────┘
        ▼
DATABASE TRANSACTION
        │
        ▼
POSTGRESQL
        │
        ├── Operational Data
        ├── Historical Data
        ├── Snapshots
        └── Audit Logs
        │
        ▼
DOMAIN EVENTS
        │
        ├── Forecast Engine
        ├── Recommendation Rule Engine
        └── Background Jobs
                         │
                         ▼
                   AI EXPLANATION
                         │
                         ▼
                  RECOMMENDATIONS
```

---

# 83. المكونات التي لا تعتمد على AI

يجب أن تعمل دائمًا بدون AI:

```text
Income
Expenses
Accounts
Budget
Safe To Spend
Daily Safe Limit
Obligations
Savings
Emergency Fund
Goals
Cycle Closing
Snapshots
Basic Warnings
```

---

# 84. المكونات التي يمكن أن تستفيد من AI

```text
Natural-language explanations
Financial summaries
Recommendation wording
Pattern explanation
Goal coaching
Monthly review narrative
```

لكن يجب أن تعتمد على أرقام محسوبة من النظام.

---

# 85. قرارات معلقة

## PENDING-ARCH-001

المعادلة النهائية لـ:

```text
Financial Health Score
```

---

## PENDING-ARCH-002

حساب:

```text
Required Financial Buffer
```

---

## PENDING-ARCH-003

معيار:

```text
AT_RISK
```

---

## PENDING-ARCH-004

خوارزمية:

```text
Forecast Engine
```

---

## PENDING-ARCH-005

خوارزمية توزيع الأهداف.

---

## PENDING-ARCH-006

هدف صندوق الطوارئ.

---

## PENDING-ARCH-007

التمثيل الفيزيائي النهائي للتحويلات بين الحسابات.

---

## PENDING-ARCH-008

طريقة Opening Balances.

---

## PENDING-ARCH-009

قرار نهائي حول:

```text
PostgreSQL / Supabase
Next.js
```

قبل بدء التنفيذ.

هي خيارات موصى بها وليست متطلبات أصلية من المصادر.

---

# 86. Definition of Architectural Integrity

تعتبر المعمارية سليمة فقط إذا:

* لا يوجد منطق مالي حرج في الواجهة فقط.
* لا توجد معادلات مكررة.
* كل حركة فعلية مرتبطة بـTransaction.
* كل انتقال State يخضع لقواعد.
* كل Write حساس يدعم Idempotency.
* كل عملية متعددة الخطوات Atomic.
* التاريخ المالي محفوظ.
* Snapshot لا يتغير بعد الإغلاق.
* AI لا يصبح مصدر الحقيقة.
* فشل AI لا يعطل النظام المالي.
* Production منفصل عن Development.
* Schema يتغير فقط عبر Migration.
* الكود قابل للاختبار.

---

# 87. قاعدة الحوكمة النهائية

أي مكون تقني جديد يجب أن يجيب قبل إضافته عن:

```text
ما المشكلة التي يحلها؟
أي Requirement يدعمه؟
أي Business Rule يخدم؟
ما البيانات التي يقرأها؟
ما البيانات التي يكتبها؟
هل يؤثر على State؟
هل يحتاج Transaction؟
هل يحتاج Audit؟
هل يحتاج Test؟
```

إذا لم توجد إجابات واضحة فلا يضاف المكون للنظام.

---

# 88. النتيجة المعمارية

البنية المطلوبة ليست:

```text
واجهة
↓
قاعدة بيانات
```

بل:

```text
واجهة
↓
Application Layer
↓
Domain Rules
↓
Financial Engine
↓
Transactional Data Layer
↓
PostgreSQL
```

مع:

```text
Recommendation Engine
+
AI Advisor
```

كطبقة استشارية فوق النظام المالي، وليس كبديل عنه.

وهذا الفصل هو الأساس لضمان أن النظام المالي يظل دقيقًا وقابلًا للتفسير والاختبار حتى لو تغيرت تقنيات الواجهة أو الذكاء الاصطناعي مستقبلًا.
