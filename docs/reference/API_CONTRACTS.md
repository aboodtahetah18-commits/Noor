# API_CONTRACTS.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

## Application / API Contracts

---

# 1. الهدف

تحدد هذه الوثيقة العقود الرسمية بين:

```text
Frontend
↓
Application Layer
↓
Domain Services
```

لكل عملية رئيسية في النظام.

كل Contract يجب أن يحدد:

* Command / Query.
* Input.
* Validation.
* Business Rules.
* State Preconditions.
* Success Output.
* Error Codes.
* Side Effects.
* Recalculation.
* Audit.
* Idempotency عند الحاجة.

ولا تعتبر أسماء HTTP النهائية ملزمة إذا تم استخدام Server Actions أو RPC بدل REST.

---

# 2. المبادئ العامة

## API-RULE-001

الواجهة لا ترسل قيمًا محسوبة لتصبح مصدر الحقيقة.

مثل:

```text
safe_to_spend
account_balance
goal_progress
expected_deficit
```

هذه تحسب في الخادم.

---

## API-RULE-002

كل Write مالي حساس يتطلب:

```text
idempotency_key
```

---

## API-RULE-003

كل Write يتحقق من:

```text
Authentication
Authorization
Validation
Business Rules
Current State
```

قبل التنفيذ.

---

## API-RULE-004

العملية متعددة السجلات:

```text
Atomic
```

إما تنجح كاملة أو تفشل كاملة.

---

## API-RULE-005

الـResponse بعد عملية مالية يجب أن يتضمن النتائج المحدثة الضرورية للواجهة.

ولا يجبر Frontend على إعادة بناء الحسابات بنفسه.

---

# 3. Standard Success Envelope

النموذج المنطقي:

```text
success: true
data: {...}
meta:
  request_id
  processed_at
```

---

# 4. Standard Error Envelope

```text
success: false

error:
  code
  message
  field
  context
  retryable

meta:
  request_id
```

لا يعرض:

* SQL.
* Stack Trace.
* Secret.
* Internal DB detail.

---

# 5. Standard Error Codes

```text
VALIDATION_ERROR
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
INVALID_STATE_TRANSITION
DUPLICATE_OPERATION
CYCLE_NOT_ACTIVE
CYCLE_CLOSED
PLAN_NOT_ACTIVE
INVALID_AMOUNT
INSUFFICIENT_FINANCIAL_CAPACITY
CONFLICT
DATABASE_ERROR
INTERNAL_ERROR
```

---

# 6. Authentication Context

لا تعتمد الأوامر على:

```text
user_id
```

قادمة من Client كمصدر موثوق.

المستخدم يستخرج من جلسة المصادقة.

أي `user_id` داخلي يجب مطابقته مع المستخدم المصادق.

---

# 7. Query — Get Dashboard

## Contract ID

```text
API-Q-001
```

## Logical Name

```text
GetDashboardSummary
```

## Input

```text
cycle_id optional
```

إذا لم يرسل:

يستخدم النظام الدورة النشطة للمستخدم.

---

## Output

```text
cycle
  id
  name
  status
  start_date
  expected_next_income_date
  remaining_days

liquidity
  total

safe_to_spend
  amount
  status

daily_safe_limit
  amount

income
  expected
  actual

budget
  planned
  actual
  remaining

saving
  planned
  actual
  rate

forecast
  projected_end_balance
  expected_deficit
  deficit_status

upcoming_obligations[]

top_recommendation

emergency_summary

goal_summaries[]
```

---

## Rules

* لا يحسب Frontend Safe To Spend.
* لا يعرض Projected كActual.
* الدورة المغلقة تستخدم Snapshot للتاريخ.

---

# 8. Command — Create Financial Cycle

## Contract ID

```text
API-C-001
```

## Input

```text
name
start_date
expected_next_income_date
expected_income[]
idempotency_key
```

---

## Validation

```text
start_date required
expected_next_income_date required
expected_next_income_date >= start_date
```

---

## Initial State

```text
DRAFT
```

---

## Success

```text
cycle
  id
  status = DRAFT
```

---

## Errors

```text
VALIDATION_ERROR
CONFLICT
DUPLICATE_OPERATION
```

---

# 9. Command — Activate Financial Cycle

## Contract ID

```text
API-C-002
```

## Event

```text
ACTIVATE_CYCLE
```

## Preconditions

```text
Current State = DRAFT
```

ويجب توافر شروط التفعيل المعتمدة.

---

## Success

```text
cycle.status = ACTIVE
activated_at
```

ويكتب:

```text
StateTransitionLog
```

---

## Errors

```text
INVALID_STATE_TRANSITION
VALIDATION_ERROR
```

---

# 10. Query — Get Current Plan

```text
API-Q-002
```

## Output

```text
plan
  id
  status
  current_version

allocations[]
  category_id
  category_name
  allocation_type
  planned_amount

totals
  obligations
  essentials
  saving
  emergency
  goals
  flexible
```

---

# 11. Command — Approve Plan

## Contract ID

```text
API-C-003
```

## Input

```text
plan_id
expected_version_number
idempotency_key
```

---

## Preconditions

```text
PLAN_DRAFT
```

---

## Event

```text
APPROVE_PLAN
```

---

## Side Effects

```text
Plan status → ACTIVE_PLAN
Saving allocations → ALLOCATED
Emergency allocations → ALLOCATED
Goal allocations active
Recalculate Safe To Spend
Evaluate recommendations
StateTransitionLog
```

---

## Errors

```text
INVALID_STATE_TRANSITION
CONFLICT
DUPLICATE_OPERATION
```

---

# 12. Command — Revise Plan

## Contract ID

```text
API-C-004
```

## Input

```text
plan_id
changes[]
  allocation_id
  new_amount

revision_reason
expected_version_number
idempotency_key
```

---

## Preconditions

```text
ACTIVE_PLAN
```

---

## Required

```text
revision_reason
```

---

## Side Effects

```text
Create new PlanVersion
Preserve old PlanVersion
Plan → REVISED
```

ثم لا تصبح النسخة الجديدة فعالة حتى:

```text
APPROVE_REVISION
```

---

# 13. Command — Approve Revision

```text
API-C-005
```

## Preconditions

```text
REVISED
```

## Success

```text
new version becomes current
plan status → ACTIVE_PLAN
old version preserved
recalculate financial metrics
```

---

# 14. Command — Record Income

## Contract ID

```text
API-C-010
```

## Input

```text
cycle_id
account_id
amount
transaction_date
source_name
income_kind
expected_income_id optional
is_partial optional
description optional
idempotency_key
```

---

## Validation

```text
amount > 0
transaction_date required
account exists and active
cycle permits financial transactions
```

---

## Transaction Type

```text
INCOME
```

---

## Transaction State Flow

```text
PENDING
→ POSTED
```

أو:

```text
PENDING
→ FAILED
```

---

## Side Effects

```text
Increase liquidity
Compare expected vs actual
Recalculate plan if required
Recalculate Safe To Spend
Recalculate forecast
Evaluate recommendations
```

---

## Special Behavior

إذا:

```text
Actual < Expected
```

يعاد الحساب وفق الفعلي.

إذا:

```text
Actual > Expected
```

يظهر فائض دخل ولا يضاف تلقائيًا إلى Flexible Budget.

---

# 15. Command — Record Expense

## Contract ID

```text
API-C-011
```

## Input

```text
cycle_id
account_id
category_id
amount
transaction_date
planning_status
expense_nature
description optional
idempotency_key
```

---

## Validation

```text
amount > 0
category_id required
account_id required
planning_status ∈ PLANNED | UNPLANNED
expense_nature valid
cycle ACTIVE
```

---

## Business Rules

يرتبط على الأقل بـ:

```text
BR-028
BR-029
BR-030
BR-031
BR-032
BR-033
BR-034
BR-101
BR-102
BR-103
BR-104
```

---

## Execution

```text
BEGIN

Create PENDING transaction
Validate references
Post EXPENSE
Recalculate category actual
Recalculate category remaining
Recalculate category utilization
Recalculate Safe To Spend
Recalculate Daily Safe Limit
Recalculate Forecast
Evaluate Deficit Risk
Evaluate Recommendations
Set transaction POSTED

COMMIT
```

---

## Success Response

```text
transaction
  id
  status
  amount

financial_impact
  previous_safe_to_spend
  current_safe_to_spend
  safe_to_spend_change
  daily_safe_limit
  projected_end_balance
  expected_deficit
  deficit_status

budget_impact
  category_id
  planned
  actual
  remaining
  utilization_percent
  status

recommendations_created[]
```

---

## Error Behavior

إذا فشل أي جزء:

```text
ROLLBACK
```

ولا يتغير الرصيد.

---

# 16. Command — Transfer Between Accounts

## Contract ID

```text
API-C-012
```

## Input

```text
from_account_id
to_account_id
amount
transaction_date
description optional
idempotency_key
```

---

## Validation

```text
from != to
amount > 0
both accounts active
same authenticated owner
```

---

## Business Meaning

```text
TRANSFER
```

ولا يدخل:

```text
Income
Expense
```

---

## Success

يجب أن يكون صافي أثره على إجمالي سيولة المستخدم:

```text
0
```

مع تحديث أرصدة الحسابين.

---

# 17. Command — Record Refund

## Contract ID

```text
API-C-013
```

## Input

```text
original_transaction_id
account_id
amount
transaction_date
description optional
idempotency_key
```

---

## Validation

يجب أن تشير العملية الأصلية إلى مصروف صالح.

---

## Transaction Type

```text
REFUND
```

---

## Side Effects

* إعادة المبلغ للسيولة.
* إعادة أثره إلى البند المناسب.
* تحديث الميزانية.
* تحديث Safe To Spend.
* حفظ `related_transaction_id`.

---

# 18. Query — List Transactions

```text
API-Q-010
```

## Input

```text
page
page_size
date_from optional
date_to optional
transaction_type optional
category_id optional
account_id optional
planning_status optional
search optional
sort optional
```

---

## Output

```text
items[]
pagination
```

ولا يعيد جميع السجلات دفعة واحدة.

---

# 19. Query — Transaction Details

```text
API-Q-011
```

## Output

```text
transaction
related_transaction
obligation
goal
emergency_fund
```

حسب نوع العملية.

---

# 20. Command — Reverse Transaction

```text
API-C-014
```

## Input

```text
transaction_id
reason
idempotency_key
```

---

## Preconditions

```text
transaction.status = POSTED
```

---

## Event

```text
POSTED → REVERSED
```

---

## Required

```text
reason
```

---

## Side Effects

```text
Create documented reversal effect
Update original transaction state
Recalculate all affected financial values
StateTransitionLog
```

ولا يتم حذف الأصل.

---

# 21. Query — List Obligations

```text
API-Q-020
```

## Input

```text
status optional
cycle_id optional
```

## Sorting Default

```text
OVERDUE
DUE
UPCOMING
PAID
```

ثم حسب due_date.

---

# 22. Command — Create Obligation Template

```text
API-C-020
```

## Input

```text
name
default_amount
recurrence
priority
expected_account_id optional
first_due_date
idempotency_key
```

---

## Validation

```text
default_amount > 0
valid recurrence
due date required
```

---

## Side Effects

إنشاء:

```text
ObligationTemplate
+
First ObligationOccurrence
```

حسب الحاجة.

---

# 23. Command — Pay Obligation

## Contract ID

```text
API-C-021
```

## Input

```text
obligation_occurrence_id
account_id
amount
transaction_date
idempotency_key
```

---

## Preconditions

الحالة:

```text
UPCOMING
DUE
OVERDUE
```

---

## Execution

```text
BEGIN

Validate occurrence
Create PENDING OBLIGATION_PAYMENT
Post transaction
Set occurrence PAID
Release reservation
Create next occurrence if recurring
Write state transition
Recalculate financial metrics
Evaluate recommendations

COMMIT
```

---

## Success

```text
obligation.status = PAID
next_occurrence optional
updated_safe_to_spend
```

---

# 24. Query — Savings Summary

```text
API-Q-030
```

## Output

```text
planned_amount
allocated_amount
actual_transferred_amount
remaining_to_transfer
status
```

---

# 25. Command — Transfer Saving

```text
API-C-030
```

## Input

```text
saving_allocation_id
from_account_id
to_account_id
amount
transaction_date
idempotency_key
```

---

## Type

```text
SAVING_TRANSFER
```

---

## Rules

لا يعد:

```text
Expense
```

ويزيد Actual Saving فقط بعد `POSTED`.

---

# 26. Query — Emergency Fund

```text
API-Q-040
```

## Output

```text
fund
  target_amount
  current_balance
  completion_percent
  status

current_cycle
  planned
  allocated
  actual_transferred
```

عدد الأشهر المغطاة لا يعاد كقيمة نهائية حتى اعتماد القاعدة المرتبطة به.

---

# 27. Command — Emergency Contribution

```text
API-C-040
```

## Input

```text
emergency_fund_id
from_account_id
amount
transaction_date
idempotency_key
```

## Type

```text
EMERGENCY_CONTRIBUTION
```

---

# 28. Command — Emergency Withdrawal

```text
API-C-041
```

## Input

```text
emergency_fund_id
destination_account_id
amount
transaction_date
reason
emergency_type
idempotency_key
```

---

## Validation

```text
amount > 0
reason required
```

---

## Type

```text
EMERGENCY_WITHDRAWAL
```

---

## Side Effects

```text
Reduce emergency balance
Recalculate completion
Recalculate gap
Evaluate rebuild recommendation
Recalculate financial position
```

---

# 29. Query — List Goals

```text
API-Q-050
```

## Output per Goal

```text
id
name
status
target_amount
current_balance
remaining_amount
progress_percent
target_date
required_contribution
```

---

# 30. Command — Create Goal

```text
API-C-050
```

## Input

```text
name
target_amount
opening_balance optional
start_date
target_date
priority
idempotency_key
```

---

## Initial State

```text
DRAFT
```

---

## Side Effect

تشغيل:

```text
Goal Feasibility Evaluation
```

---

# 31. Query — Analyze Goal

```text
API-Q-051
```

أو Command غير مؤثر.

## Input

```text
target_amount
current_balance
target_date
priority
```

## Output

```text
remaining_amount
remaining_cycles
required_contribution
available_financial_capacity
feasibility_status
```

---

## Feasibility

```text
ACTIVE-compatible
```

أو:

```text
FINANCIALLY_UNREALISTIC
```

---

# 32. Command — Activate Goal

```text
API-C-051
```

## Preconditions

```text
DRAFT
```

## Event

```text
DRAFT → ACTIVE
```

أو الحالة التحليلية المناسبة إذا كانت غير واقعية حسب التصميم النهائي.

---

# 33. Command — Contribute To Goal

```text
API-C-052
```

## Input

```text
goal_id
account_id
amount
transaction_date
idempotency_key
```

## Type

```text
GOAL_CONTRIBUTION
```

---

## Side Effects

```text
Increase goal current balance
Recalculate progress
Recalculate remaining
Recalculate projected completion
Evaluate ACHIEVED
```

---

## If Complete

```text
Current Balance >= Target Amount
```

ثم:

```text
Goal → ACHIEVED
```

---

# 34. Command — Pause Goal

```text
API-C-053
```

## Transition

```text
ACTIVE
→ PAUSED
```

---

# 35. Command — Resume Goal

```text
API-C-054
```

## Transition

```text
PAUSED
→ ACTIVE
```

بعد إعادة التقييم.

---

# 36. Command — Cancel Goal

```text
API-C-055
```

## Input

```text
goal_id
reason optional
```

## Transition

الحالات المسموحة حسب State Machine:

```text
→ CANCELLED
```

مع حفظ التاريخ.

---

# 37. Query — Advisor Feed

```text
API-Q-060
```

## Input

```text
status optional
type optional
priority optional
page
page_size
```

## Output

```text
recommendations[]
  id
  recommendation_type
  status
  priority
  title
  message
  reason_code
  supporting_summary
  created_at
```

---

# 38. Query — Recommendation Details

```text
API-Q-061
```

## Output

```text
recommendation
reason_code
reason_data
related_entity
suggested_actions[]
```

---

# 39. Command — View Recommendation

```text
API-C-060
```

## Transition

```text
NEW
→ VIEWED
```

---

# 40. Command — Accept Recommendation

```text
API-C-061
```

## Transition

```text
NEW / VIEWED
→ ACCEPTED
```

ولا ينفذ الإجراء المالي المقترح تلقائيًا.

يعيد النظام:

```text
next_action
```

مثل:

```text
OPEN_PLAN_REVISION
OPEN_GOAL_EDIT
OPEN_SAVING_TRANSFER
```

---

# 41. Command — Dismiss Recommendation

```text
API-C-062
```

## Transition

```text
NEW / VIEWED
→ DISMISSED
```

---

# 42. Query — Current Forecast

```text
API-Q-070
```

## Output

```text
projected_end_balance
expected_deficit
deficit_status
remaining_days
calculated_at
forecast_version
```

ولا يعتبر Projected رقمًا Actual.

---

# 43. Query — Historical Cycles

```text
API-Q-080
```

يعيد فقط البيانات المناسبة للتاريخ.

للدورات:

```text
CLOSED
```

يستخدم:

```text
CycleSnapshot
```

---

# 44. Query — Cycle Report

```text
API-Q-081
```

## Input

```text
cycle_id
```

إذا كانت الدورة:

```text
CLOSED
```

المصدر:

```text
CycleSnapshot
CycleCategorySnapshot
CycleReview
```

---

# 45. Command — Start Cycle Closing

```text
API-C-080
```

## Preconditions

```text
cycle.status = ACTIVE
```

## Transition

```text
ACTIVE → CLOSING
```

---

# 46. Command — Complete Cycle Closing

```text
API-C-081
```

هذه ليست عملية UI بسيطة.

تنفذها:

```text
CycleClosingService
```

---

## Required Execution

```text
Lock cycle
Validate transactions
Calculate final metrics
Create CycleSnapshot
Create CycleCategorySnapshots
Generate CycleReview
Close Financial Plan
Close Financial Cycle
Write StateTransitionLogs
```

---

## Final Transition

```text
CLOSING → CLOSED
```

---

## Failure

إذا فشل الإغلاق:

لا تتحول الدورة إلى CLOSED جزئيًا.

---

# 47. Query — Next Cycle Proposal

```text
API-Q-082
```

## Inputs

```text
closed_cycle_id
```

## Output

```text
previous_plan
actual_results
historical_averages_available
upcoming_obligations
active_goals
proposed_allocations
explanations
```

لكن الخوارزميات غير المحسومة لا تخترع داخل الـAPI.

---

# 48. Query — Accounts

```text
API-Q-090
```

## Output

```text
accounts[]
  id
  name
  account_type
  currency
  balance
  is_active

total_liquidity
```

---

# 49. Command — Create Account

```text
API-C-090
```

## Input

```text
name
account_type
currency
opening_balance
idempotency_key
```

طريقة تمثيل Opening Balance في قاعدة البيانات تعتمد على القرار النهائي المعلق.

---

# 50. Command — Update Account

```text
API-C-091
```

يسمح بتعديل البيانات المرجعية.

لا يسمح بتعديل الرصيد المالي مباشرة كتجاوز لسجل العمليات.

---

# 51. Command — Deactivate Account

```text
API-C-092
```

يستخدم:

```text
is_active = false
```

عند وجود تاريخ مالي.

ولا تحذف الحسابات المرتبطة بسجلات تاريخية.

---

# 52. Query — Budget Categories

```text
API-Q-100
```

## Output

```text
id
name
category_group
expense_nature_default
is_essential
is_active
```

---

# 53. Command — Create Category

```text
API-C-100
```

---

# 54. Command — Update Category

```text
API-C-101
```

---

# 55. Command — Deactivate Category

```text
API-C-102
```

لا يحذف التاريخ المرتبط بها.

---

# 56. Query — Current Cycle Metrics

```text
API-Q-110
```

هذا Read Model داخلي مهم.

## Output

```text
account_balances
total_liquidity
reserved_obligations
remaining_essential_needs
protected_savings
protected_emergency
protected_goals
required_financial_buffer
safe_to_spend
daily_safe_limit
projected_end_balance
expected_deficit
```

---

# 57. Financial Engine Ownership

جميع العقود التي تحتاج أرقامًا مالية تستدعي:

```text
FinancialEngine
```

ولا تنفذ المعادلات داخل كل Handler.

---

# 58. Recommendation Evaluation

بعد الأحداث التالية:

```text
INCOME_RECEIVED
EXPENSE_POSTED
PLAN_APPROVED
PLAN_REVISED
OBLIGATION_PAID
OBLIGATION_OVERDUE
SAVING_TRANSFER_POSTED
EMERGENCY_WITHDRAWAL_POSTED
GOAL_CONTRIBUTION_POSTED
```

تشغل:

```text
RecommendationEvaluation
```

---

# 59. Event Contracts

الأحداث الداخلية تستخدم Payload صغيرًا.

مثال:

```text
EXPENSE_POSTED

transaction_id
user_id
cycle_id
occurred_at
```

الخدمات الأخرى تقرأ التفاصيل من مصدر الحقيقة بدل نسخ جميع البيانات في Event.

---

# 60. Idempotency Contract

لأي Write حساس:

Client ينشئ:

```text
idempotency_key
```

الخادم يحفظ نتيجة التنفيذ.

إذا أعيد نفس الطلب بنفس المفتاح:

```text
لا ينشأ سجل مالي جديد
```

بل تعاد نتيجة العملية الأصلية.

---

# 61. Optimistic UI

لا تستخدم Optimistic Update للعمليات المالية التي تعرض كأنها مؤكدة قبل استجابة الخادم.

يمكن إظهار:

```text
جاري التسجيل
```

لكن:

```text
POSTED
```

لا يظهر حتى نجاح الخادم.

---

# 62. Concurrency

عمليات تعديل الخطة تستخدم:

```text
expected_version_number
```

لمنع الكتابة فوق نسخة أحدث.

إذا اختلف:

```text
CONFLICT
```

---

# 63. Pagination Standard

القوائم التاريخية تستخدم:

```text
page_size
cursor
```

أو نموذج Pagination موحد يحدد في التنفيذ.

لا يسمح لكل Endpoint باختراع نمط مختلف.

---

# 64. Date Contract

يجب الفصل بين:

```text
transaction_date
created_at
posted_at
due_date
```

ولا يستخدم واحد بدل الآخر.

---

# 65. Currency Contract

المبلغ:

```text
amount
```

يرسل كقيمة Decimal قابلة للتحويل الآمن.

ولا يستخدم Floating Point غير منضبط.

---

# 66. Timezone

التواريخ الزمنية التقنية تحفظ بطريقة معيارية.

لكن حساب:

```text
اليوم
تاريخ الاستحقاق
الأيام المتبقية
```

يستخدم Timezone المستخدم.

---

# 67. Validation Responsibility

Frontend:

```text
Fast UX Validation
```

Server:

```text
Authoritative Validation
```

Database:

```text
Integrity Constraints
```

---

# 68. State Responsibility

لا يقبل Endpoint:

```text
new_status
```

عشوائيًا من Client.

بدلًا منه:

```text
PayObligation
ApprovePlan
PauseGoal
```

ثم الخادم يحدد الحالة الصحيحة.

---

# 69. Read Model Responsibility

Frontend لا يحتاج إلى فهم كل الجداول.

مثال Dashboard يستهلك:

```text
DashboardSummary
```

بدل:

```text
Accounts
+
Transactions
+
Plans
+
Goals
+
Obligations
```

ثم يعيد بناء النظام محليًا.

---

# 70. AI Contract Boundary

أي طلب AI يحصل على:

```text
Structured Financial Facts
```

وليس صلاحية الوصول الحر لقاعدة البيانات.

مثال:

```text
reason_code
reason_data
user_language
desired_tone
```

---

# 71. AI Output

مخرجات AI غير موثوقة حسابيًا.

يتم التعامل معها كـ:

```text
Explanation Text
Recommendation Wording
```

ولا يسمح لها بتغيير:

```text
amount
status
balance
state
```

---

# 72. AI Failure Contract

إذا فشل AI:

العقد المالي الأساسي ينجح.

يمكن أن يعود:

```text
advisor_explanation_status = unavailable
```

ولا يتم إرجاع العملية المالية كفاشلة بسبب فشل صياغة التوصية.

---

# 73. Audit Requirements

الأوامر التالية يجب أن تنتج Audit / State logs عند الحاجة:

```text
Approve Plan
Revise Plan
Activate Cycle
Close Cycle
Pay Obligation
Reverse Transaction
Pause Goal
Resume Goal
Cancel Goal
Recommendation State Changes
```

---

# 74. Security Requirements

كل Contract يجب أن يحقق:

```text
Authenticated
Owner scoped
Server validated
RLS protected where applicable
No raw secrets
No cross-user access
```

---

# 75. Pending API Decisions

لا تحسم هذه الوثيقة:

```text
REST vs Server Actions
Exact URLs
RPC naming
ORM choice
Pagination physical strategy
Transfer physical ledger representation
Opening Balance representation
```

هذه قرارات تنفيذية بشرط عدم تغيير المعنى المعتمد.

---

# 76. Pending Financial Logic

لا تنشئ العقود معادلات نهائية لـ:

```text
Financial Health Score
Required Financial Buffer
AT_RISK threshold
Advanced Forecasting
Goal priority allocation
Emergency month coverage
```

حتى إغلاق الـPENDING Business Rules الخاصة بها.

---

# 77. Minimum API Contract Test

لكل Command مالي:

```text
Valid request succeeds
Invalid request rejected
Unauthorized rejected
Duplicate idempotency doesn't duplicate
Invalid state rejected
Database failure rolls back
Response metrics correct
Audit recorded when required
```

---

# 78. API Definition of Done

أي Contract يعتبر مكتملًا إذا حدد:

```text
Input
Validation
Authentication
Authorization
Business Rules
State Preconditions
Idempotency
Atomicity
Success Output
Errors
Side Effects
Recalculation
Audit
Tests
```

---

# 79. قاعدة الحوكمة

ممنوع إنشاء Endpoint جديد مباشرة بسبب احتياج شاشة.

يجب أولًا تحديد:

```text
ما Command أو Query؟
أي Workflow يخدم؟
أي Business Rules؟
أي State؟
أي Entities؟
هل هو Read أم Write؟
هل يحتاج Idempotency؟
هل يحتاج Atomic Transaction؟
ما Audit المطلوب؟
```

ثم يوثق هنا قبل التنفيذ.

---

# 80. النتيجة

الغرض من API ليس مجرد:

```text
إرسال بيانات واستقبال JSON
```

بل فرض الحدود الصحيحة بين:

```text
User Intent
↓
Application Command
↓
Business Rules
↓
State Machine
↓
Financial Engine
↓
Transactional Persistence
↓
Read Model
↓
UI
```

وبذلك لا تستطيع الواجهة أو أي تكامل مستقبلي تجاوز المنطق المالي الأساسي للنظام.
