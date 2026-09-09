# DATABASE_SCHEMA.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

## PostgreSQL / Supabase Database Schema Specification

---

# 1. الهدف

هذه الوثيقة تحول:

```text
DATA_MODEL.md
+
BUSINESS_RULES.md
+
STATE_MACHINES.md
+
ARCHITECTURE.md
+
API_CONTRACTS.md
```

إلى تصميم قاعدة بيانات فعلي.

وتحدد:

* الجداول.
* الأعمدة.
* أنواع البيانات.
* Primary Keys.
* Foreign Keys.
* Unique Constraints.
* Check Constraints.
* Indexes.
* RLS.
* Audit.
* Idempotency.
* Snapshot Integrity.
* Migration Rules.

---

# 2. قاعدة البيانات المعتمدة

التقنية المقترحة:

```text
PostgreSQL
```

والبيئة المفضلة للإصدار الأول:

```text
Supabase PostgreSQL
```

---

# 3. المبادئ الأساسية

## DB-RULE-001

مصدر الحقيقة المالي:

```text
POSTED Transactions
```

---

## DB-RULE-002

مصدر حقيقة التخطيط:

```text
Approved Current Plan Version
```

---

## DB-RULE-003

الأموال لا تخزن باستخدام:

```text
FLOAT
REAL
DOUBLE PRECISION
```

---

## DB-RULE-004

النوع المالي الأساسي:

```text
NUMERIC(18,2)
```

للإصدار الأول.

---

## DB-RULE-005

كل جدول مملوك للمستخدم يجب أن يحتوي:

```text
user_id UUID NOT NULL
```

---

## DB-RULE-006

كل سجل رئيسي يستخدم:

```text
UUID
```

كمفتاح أساسي.

---

## DB-RULE-007

لا تستخدم الأسماء كمفاتيح مرجعية.

---

## DB-RULE-008

الحذف الفيزيائي للبيانات المالية التاريخية ممنوع بصورة اعتيادية.

---

# 4. UUID

المقترح:

```text
gen_random_uuid()
```

كمولد افتراضي.

---

# 5. الوقت

الأعمدة التقنية تستخدم:

```text
TIMESTAMPTZ
```

مثل:

```text
created_at
updated_at
posted_at
closed_at
```

---

# 6. التاريخ المالي

يستخدم:

```text
DATE
```

مثل:

```text
transaction_date
due_date
start_date
target_date
expected_date
```

ولا يخلط مع وقت إنشاء السجل.

---

# 7. العملة

الإصدار الأول:

```text
SAR
```

لكن العملة تخزن باستخدام:

```text
CHAR(3)
```

متوافقة منطقيًا مع ISO Currency Code.

---

# 8. Schema Namespace

يمكن استخدام:

```text
public
```

في Supabase V1.

ويمكن مستقبلًا فصل:

```text
financial
audit
analytics
```

إذا ازدادت المنصة تعقيدًا.

---

# 9. users

يفضل ربط مستخدم التطبيق بـ:

```text
auth.users
```

في Supabase.

جدول Profile:

```text
profiles
```

---

# 10. profiles

```text
id UUID PRIMARY KEY
display_name TEXT
base_currency CHAR(3) NOT NULL DEFAULT 'SAR'
timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh'
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

## Foreign Key

```text
id → auth.users.id
ON DELETE CASCADE
```

---

# 11. accounts

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
name TEXT NOT NULL
account_type TEXT NOT NULL
currency CHAR(3) NOT NULL DEFAULT 'SAR'
is_active BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 12. accounts.account_type

القيم:

```text
BANK
SAVINGS
CASH
OTHER
```

---

# 13. accounts constraints

```text
CHECK (length(trim(name)) > 0)
```

```text
CHECK (
 account_type IN (
   'BANK',
   'SAVINGS',
   'CASH',
   'OTHER'
 )
)
```

---

# 14. Account Name Uniqueness

لا يلزم أن يكون الاسم Unique عالميًا.

المقترح:

```text
UNIQUE(user_id, name)
```

للحسابات النشطة.

إذا احتجنا إعادة استخدام الاسم بعد تعطيل الحساب، يمكن استخدام Partial Unique Index.

---

# 15. financial_cycles

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
name TEXT NOT NULL
start_date DATE NOT NULL
expected_next_income_date DATE NOT NULL
status TEXT NOT NULL DEFAULT 'DRAFT'
activated_at TIMESTAMPTZ
closing_started_at TIMESTAMPTZ
closed_at TIMESTAMPTZ
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 16. financial_cycles.status

```text
DRAFT
ACTIVE
CLOSING
CLOSED
```

---

# 17. Cycle Date Constraint

```text
CHECK (
 expected_next_income_date >= start_date
)
```

---

# 18. One Active Cycle Per User

Partial Unique Index:

```text
UNIQUE(user_id)
WHERE status = 'ACTIVE'
```

كما يمنع وجود أكثر من دورة:

```text
CLOSING
```

بالتوازي إذا اعتبر الإغلاق استمرارًا للدورة التشغيلية.

يفضل Index إضافي:

```text
UNIQUE(user_id)
WHERE status IN ('ACTIVE','CLOSING')
```

ويعتمد واحد فقط من النموذجين في Migration النهائي.

---

# 19. expected_incomes

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
cycle_id UUID NOT NULL
source_name TEXT NOT NULL
expected_amount NUMERIC(18,2) NOT NULL
expected_date DATE NOT NULL
income_kind TEXT NOT NULL
is_primary BOOLEAN NOT NULL DEFAULT false
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 20. income_kind

```text
SALARY
ADDITIONAL_INCOME
BONUS
OTHER
```

---

# 21. expected_income constraints

```text
CHECK (expected_amount > 0)
```

---

# 22. Primary Expected Income

يمكن السماح بدخل أساسي واحد لكل دورة:

```text
UNIQUE(cycle_id)
WHERE is_primary = true
```

إذا ثبت لاحقًا أن هذا يعكس سلوك المنتج النهائي.

---

# 23. financial_plans

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
cycle_id UUID NOT NULL
current_version_id UUID
status TEXT NOT NULL DEFAULT 'PLAN_DRAFT'
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
approved_at TIMESTAMPTZ
closed_at TIMESTAMPTZ
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 24. Financial Plan Status

```text
PLAN_DRAFT
ACTIVE_PLAN
REVISED
CLOSED_PLAN
```

---

# 25. One Plan Per Cycle

الإصدار الأول:

```text
UNIQUE(cycle_id)
```

فالنسخ تكون في:

```text
plan_versions
```

وليس Plans متعددة.

---

# 26. plan_versions

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
plan_id UUID NOT NULL
version_number INTEGER NOT NULL
revision_reason TEXT
is_current BOOLEAN NOT NULL DEFAULT false
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
approved_at TIMESTAMPTZ
```

---

# 27. Plan Version Constraints

```text
CHECK (version_number > 0)
```

```text
UNIQUE(plan_id, version_number)
```

---

# 28. One Current Version

Partial Unique Index:

```text
UNIQUE(plan_id)
WHERE is_current = true
```

---

# 29. budget_categories

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
name TEXT NOT NULL
category_group TEXT NOT NULL
expense_nature_default TEXT
is_essential BOOLEAN NOT NULL DEFAULT false
is_active BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 30. category_group

```text
OBLIGATION
ESSENTIAL
SAVING
EMERGENCY
GOAL
FLEXIBLE
```

---

# 31. expense_nature_default

```text
NECESSARY
IMPORTANT
OPTIONAL
ENTERTAINMENT
```

ولا يستخدم:

```text
UNPLANNED
```

كDefault ثابت للبند.

---

# 32. Category Name

Partial Unique:

```text
UNIQUE(user_id, lower(name))
WHERE is_active = true
```

---

# 33. budget_allocations

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
plan_version_id UUID NOT NULL
category_id UUID NOT NULL
planned_amount NUMERIC(18,2) NOT NULL
allocation_type TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 34. Budget Allocation Constraints

```text
CHECK (planned_amount >= 0)
```

```text
UNIQUE(plan_version_id, category_id)
```

---

# 35. transactions

هذا هو أهم جدول مالي في النظام.

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
cycle_id UUID
account_id UUID
transaction_type TEXT NOT NULL
status TEXT NOT NULL DEFAULT 'PENDING'
amount NUMERIC(18,2) NOT NULL
transaction_date DATE NOT NULL
description TEXT
category_id UUID
planning_status TEXT
expense_nature TEXT
related_transaction_id UUID
obligation_occurrence_id UUID
goal_id UUID
emergency_fund_id UUID
idempotency_key TEXT
posted_at TIMESTAMPTZ
reversed_at TIMESTAMPTZ
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 36. Transaction Types

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

---

# 37. Transaction Status

```text
PENDING
POSTED
REVERSED
FAILED
```

---

# 38. Amount Constraint

```text
CHECK (amount > 0)
```

---

# 39. planning_status

```text
PLANNED
UNPLANNED
```

---

# 40. expense_nature

```text
NECESSARY
IMPORTANT
OPTIONAL
ENTERTAINMENT
UNPLANNED
```

---

# 41. Expense Required Fields

للعملية:

```text
transaction_type = 'EXPENSE'
```

يجب:

```text
category_id IS NOT NULL
planning_status IS NOT NULL
expense_nature IS NOT NULL
account_id IS NOT NULL
```

يمكن تنفيذ ذلك عبر CHECK Constraint مناسب.

---

# 42. Income Required Account

عند:

```text
transaction_type = 'INCOME'
```

يجب:

```text
account_id IS NOT NULL
```

---

# 43. Posted Timestamp

إذا:

```text
status = 'POSTED'
```

يجب:

```text
posted_at IS NOT NULL
```

---

# 44. Reversed Timestamp

إذا:

```text
status = 'REVERSED'
```

يجب:

```text
reversed_at IS NOT NULL
```

---

# 45. Transaction Idempotency

```text
UNIQUE(user_id, idempotency_key)
```

عندما:

```text
idempotency_key IS NOT NULL
```

Partial Unique Index.

---

# 46. Transaction Self Reference

```text
related_transaction_id
→ transactions.id
```

مع منع:

```text
related_transaction_id = id
```

---

# 47. Transfer Model

يجب حسم التمثيل الفيزيائي هنا.

اعتماد النموذج التالي:

```text
Transfer Header
+
Two Ledger Entries
```

لأنه الأكثر أمانًا في حساب الأرصدة.

---

# 48. transfers

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
cycle_id UUID
from_account_id UUID NOT NULL
to_account_id UUID NOT NULL
amount NUMERIC(18,2) NOT NULL
transaction_date DATE NOT NULL
description TEXT
idempotency_key TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
posted_at TIMESTAMPTZ
```

---

# 49. Transfer Constraint

```text
CHECK (from_account_id <> to_account_id)
CHECK (amount > 0)
```

---

# 50. Transfer Ledger

ينشأ للـTransfer عمليتان داخليتان مترابطتان:

```text
TRANSFER_OUT
TRANSFER_IN
```

لكن بما أن Transaction Types المعتمدة حاليًا تحتوي `TRANSFER` فقط، لا نضيف Types عامة جديدة إلى Domain Model.

في التنفيذ الفيزيائي يمكن إضافة:

```text
transaction_direction
```

للـTransfer entries فقط:

```text
OUT
IN
```

دون تغيير المعنى المالي العام.

---

# 51. transaction_direction

عمود اختياري في transactions:

```text
transaction_direction TEXT
```

قيمه:

```text
IN
OUT
```

ويستخدم فقط للعمليات التي تحتاج حركة حساب داخلية.

---

# 52. لماذا؟

حتى يكون:

```text
Account Balance
```

قابلًا للاشتقاق من Ledger فعلي.

ولا يتم تعديل الرصيد مباشرة.

---

# 53. obligation_templates

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
name TEXT NOT NULL
default_amount NUMERIC(18,2) NOT NULL
recurrence TEXT NOT NULL
priority INTEGER
expected_account_id UUID
is_active BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 54. recurrence

```text
ONCE
MONTHLY
QUARTERLY
SEMI_ANNUAL
ANNUAL
```

---

# 55. Obligation Amount

```text
CHECK (default_amount > 0)
```

---

# 56. Priority

لا نعتمد Ranking ماليًا معقدًا حاليًا.

إذا استخدم Integer:

```text
CHECK(priority >= 1)
```

---

# 57. obligation_occurrences

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
template_id UUID NOT NULL
cycle_id UUID
due_date DATE NOT NULL
amount NUMERIC(18,2) NOT NULL
status TEXT NOT NULL DEFAULT 'UPCOMING'
is_reserved BOOLEAN NOT NULL DEFAULT false
paid_transaction_id UUID
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
paid_at TIMESTAMPTZ
cancelled_at TIMESTAMPTZ
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 58. Obligation Status

```text
UPCOMING
DUE
OVERDUE
PAID
CANCELLED
```

---

# 59. Obligation Constraints

```text
CHECK (amount > 0)
```

إذا:

```text
status = 'PAID'
```

يجب:

```text
paid_transaction_id IS NOT NULL
paid_at IS NOT NULL
```

---

# 60. Paid Transaction Unique

```text
UNIQUE(paid_transaction_id)
WHERE paid_transaction_id IS NOT NULL
```

---

# 61. CANCELLED

إذا:

```text
status = 'CANCELLED'
```

يجب:

```text
cancelled_at IS NOT NULL
```

---

# 62. saving_allocations

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
cycle_id UUID NOT NULL
plan_version_id UUID NOT NULL
planned_amount NUMERIC(18,2) NOT NULL
allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0
status TEXT NOT NULL DEFAULT 'PLANNED'
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 63. Saving Allocation Status

```text
PLANNED
ALLOCATED
PARTIALLY_TRANSFERRED
TRANSFERRED
CANCELLED
```

---

# 64. Saving Amount Constraints

```text
CHECK(planned_amount >= 0)
CHECK(allocated_amount >= 0)
```

ولا يكون:

```text
actual_transferred_amount
```

مصدر حقيقة مخزن إلزاميًا.

المصدر الحقيقي:

```text
SUM(POSTED SAVING_TRANSFER)
```

---

# 65. emergency_funds

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
name TEXT NOT NULL DEFAULT 'صندوق الطوارئ'
target_amount NUMERIC(18,2)
status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED'
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 66. Emergency Status

```text
NOT_CONFIGURED
BUILDING
FUNDED
DEPLETED
```

---

# 67. Emergency Target

إذا موجود:

```text
CHECK(target_amount > 0)
```

---

# 68. One Main Emergency Fund

للإصدار الأول يمكن فرض:

```text
UNIQUE(user_id)
```

على `emergency_funds`.

وبذلك يصبح للمستخدم صندوق طوارئ واحد فقط في V1.

---

# 69. emergency_allocations

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
cycle_id UUID NOT NULL
plan_version_id UUID NOT NULL
emergency_fund_id UUID NOT NULL
planned_amount NUMERIC(18,2) NOT NULL
allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0
status TEXT NOT NULL DEFAULT 'PLANNED'
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 70. Emergency Allocation Constraints

```text
CHECK(planned_amount >= 0)
CHECK(allocated_amount >= 0)
```

---

# 71. emergency_withdrawal_details

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id UUID NOT NULL UNIQUE
reason TEXT NOT NULL
emergency_type TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 72. Emergency Reason Constraint

```text
CHECK(length(trim(reason)) > 0)
```

---

# 73. financial_goals

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
name TEXT NOT NULL
target_amount NUMERIC(18,2) NOT NULL
target_date DATE
priority INTEGER
status TEXT NOT NULL DEFAULT 'DRAFT'
start_date DATE NOT NULL
achieved_at TIMESTAMPTZ
cancelled_at TIMESTAMPTZ
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 74. Goal Status

```text
DRAFT
ACTIVE
FINANCIALLY_UNREALISTIC
PAUSED
ACHIEVED
CANCELLED
```

---

# 75. Goal Constraints

```text
CHECK(target_amount > 0)
```

إذا `target_date` موجود:

```text
CHECK(target_date >= start_date)
```

---

# 76. Goal Completion

إذا:

```text
status = 'ACHIEVED'
```

يجب:

```text
achieved_at IS NOT NULL
```

---

# 77. Goal Cancellation

إذا:

```text
status = 'CANCELLED'
```

يجب:

```text
cancelled_at IS NOT NULL
```

---

# 78. goal_allocations

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
goal_id UUID NOT NULL
cycle_id UUID NOT NULL
plan_version_id UUID NOT NULL
planned_amount NUMERIC(18,2) NOT NULL
allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 79. Goal Allocation Constraints

```text
CHECK(planned_amount >= 0)
CHECK(allocated_amount >= 0)
```

---

# 80. Unique Goal Allocation

```text
UNIQUE(goal_id, plan_version_id)
```

---

# 81. recommendations

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
cycle_id UUID
recommendation_type TEXT NOT NULL
status TEXT NOT NULL DEFAULT 'NEW'
priority INTEGER NOT NULL
title TEXT NOT NULL
message TEXT NOT NULL
reason_code TEXT NOT NULL
reason_data JSONB NOT NULL DEFAULT '{}'::jsonb
related_category_id UUID
related_goal_id UUID
related_obligation_occurrence_id UUID
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
viewed_at TIMESTAMPTZ
accepted_at TIMESTAMPTZ
dismissed_at TIMESTAMPTZ
expired_at TIMESTAMPTZ
resolved_at TIMESTAMPTZ
```

---

# 82. Recommendation Type

```text
WARNING
OPPORTUNITY
CORRECTION
GOAL
POSITIVE
```

---

# 83. Recommendation Status

```text
NEW
VIEWED
ACCEPTED
DISMISSED
EXPIRED
RESOLVED
```

---

# 84. Recommendation Priority

الرقم الأقل أو الأعلى يجب أن يكون له معنى موحد.

المقترح:

```text
1 = Highest Priority
```

مع:

```text
CHECK(priority >= 1)
```

---

# 85. reason_data

نوع:

```text
JSONB
```

لأن البيانات الداعمة تختلف حسب التوصية.

لكن لا يوضع داخله مصدر الحقيقة المالي الوحيد.

---

# 86. recommendation_events uniqueness

حتى لا ينشئ Rule Engine نفس التوصية عشرات المرات يمكن استخدام:

```text
deduplication_key
```

اختياري.

---

# 87. deduplication_key

يضاف:

```text
deduplication_key TEXT
```

ثم Partial Unique حسب:

```text
user_id
cycle_id
deduplication_key
```

للتوصيات غير النهائية.

التصميم الدقيق يعتمد على Recommendation Engine.

---

# 88. cycle_snapshots

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
cycle_id UUID NOT NULL UNIQUE
closed_at TIMESTAMPTZ NOT NULL
expected_income NUMERIC(18,2) NOT NULL DEFAULT 0
actual_income NUMERIC(18,2) NOT NULL DEFAULT 0
planned_expense NUMERIC(18,2) NOT NULL DEFAULT 0
actual_expense NUMERIC(18,2) NOT NULL DEFAULT 0
planned_saving NUMERIC(18,2) NOT NULL DEFAULT 0
actual_saving NUMERIC(18,2) NOT NULL DEFAULT 0
emergency_contribution NUMERIC(18,2) NOT NULL DEFAULT 0
goal_contributions NUMERIC(18,2) NOT NULL DEFAULT 0
safe_to_spend_final NUMERIC(18,2) NOT NULL DEFAULT 0
projected_end_balance_final NUMERIC(18,2)
actual_end_balance NUMERIC(18,2)
surplus_amount NUMERIC(18,2) NOT NULL DEFAULT 0
deficit_amount NUMERIC(18,2) NOT NULL DEFAULT 0
financial_health_score NUMERIC(5,2)
snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 89. Snapshot Integrity

بعد إنشاء Snapshot:

```text
UPDATE
```

و:

```text
DELETE
```

يمنعان على مستوى التطبيق.

ويمكن استخدام Database Trigger دفاعي يمنع تعديل Snapshot إلا بواسطة إجراء إداري خاص جدًا.

---

# 90. Financial Health Score

يسمح:

```text
NULL
```

حتى اعتماد معادلته.

ولا يتم توليد قيمة وهمية.

---

# 91. cycle_category_snapshots

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
snapshot_id UUID NOT NULL
category_id UUID NOT NULL
planned_amount NUMERIC(18,2) NOT NULL DEFAULT 0
actual_amount NUMERIC(18,2) NOT NULL DEFAULT 0
variance_amount NUMERIC(18,2) NOT NULL DEFAULT 0
utilization_percent NUMERIC(8,2)
final_status TEXT
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 92. Unique Category Snapshot

```text
UNIQUE(snapshot_id, category_id)
```

---

# 93. final_status

```text
NORMAL
AT_RISK
OVER_BUDGET
```

لكن `AT_RISK` لا يتم حسم معادلته هنا.

---

# 94. cycle_reviews

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
cycle_id UUID NOT NULL UNIQUE
snapshot_id UUID NOT NULL UNIQUE
status TEXT NOT NULL DEFAULT 'GENERATING'
summary TEXT
advisor_summary TEXT
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
ready_at TIMESTAMPTZ
archived_at TIMESTAMPTZ
failed_at TIMESTAMPTZ
```

---

# 95. Cycle Review Status

```text
GENERATING
READY
ARCHIVED
FAILED
```

---

# 96. state_transition_logs

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
entity_type TEXT NOT NULL
entity_id UUID NOT NULL
from_state TEXT
to_state TEXT NOT NULL
event TEXT NOT NULL
reason TEXT
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 97. State Logs Immutable

السجل:

```text
INSERT ONLY
```

بصورة اعتيادية.

لا يوجد Update/Delete من التطبيق.

---

# 98. idempotency_records

يفضل جدول مركزي بدل الاعتماد فقط على Transactions.

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
idempotency_key TEXT NOT NULL
operation_type TEXT NOT NULL
request_hash TEXT
resource_type TEXT
resource_id UUID
response_payload JSONB
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
completed_at TIMESTAMPTZ
expires_at TIMESTAMPTZ
```

---

# 99. Idempotency Unique

```text
UNIQUE(user_id, idempotency_key)
```

---

# 100. Idempotency Status

```text
PROCESSING
COMPLETED
FAILED
```

---

# 101. لماذا جدول Idempotency مستقل؟

لأنه يحمي:

* المصروف.
* الدخل.
* السداد.
* التحويل.
* الادخار.
* الطوارئ.
* الهدف.
* اعتماد الخطة.
* إغلاق الدورة.

وليس Transaction فقط.

---

# 102. account_opening_balances

لحسم الرصيد الافتتاحي بصورة نظيفة، يعتمد الإصدار الأول:

```text
OPENING BALANCE
=
Setup Event
```

بدل تعديل رصيد الحساب يدويًا.

---

# 103. Opening Balance Representation

الأفضل إنشاء:

```text
account_opening_balances
```

كسجل تأسيسي مستقل.

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL
account_id UUID NOT NULL UNIQUE
amount NUMERIC(18,2) NOT NULL
effective_date DATE NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

# 104. Opening Balance

يسمح:

```text
amount >= 0
```

في الإصدار الأول.

---

# 105. Account Balance Formula

```text
Opening Balance
+
POSTED Inflows
-
POSTED Outflows
```

---

# 106. لا يوجد account.balance

لا نخزن:

```text
balance
```

في جدول `accounts` كمصدر حقيقة.

يمكن إنشاء:

```text
View
Materialized View
Cached Read Model
```

لكن المصدر يبقى Ledger.

---

# 107. Foreign Keys

جميع:

```text
user_id
```

ترتبط بـ:

```text
profiles.id
```

---

# 108. Foreign Key Strategy

للتاريخ المالي:

غالبًا:

```text
ON DELETE RESTRICT
```

أو:

```text
NO ACTION
```

وليس CASCADE.

---

# 109. لماذا؟

لمنع:

```text
Delete Category
↓
Delete Transactions
```

وهو غير مقبول.

---

# 110. Soft Deactivation

الجداول المرجعية تستخدم:

```text
is_active
```

مثل:

```text
accounts
budget_categories
obligation_templates
```

---

# 111. Indexes — transactions

إلزامي:

```text
(user_id, transaction_date DESC)
```

```text
(user_id, cycle_id, transaction_date DESC)
```

```text
(user_id, account_id, transaction_date DESC)
```

```text
(user_id, category_id, transaction_date DESC)
```

```text
(cycle_id, status)
```

---

# 112. Transaction Type Index

```text
(user_id, transaction_type, transaction_date DESC)
```

---

# 113. Indexes — obligations

```text
(user_id, status, due_date)
```

```text
(user_id, due_date)
```

```text
(template_id, due_date)
```

---

# 114. Indexes — goals

```text
(user_id, status)
```

```text
(user_id, target_date)
```

---

# 115. Indexes — recommendations

```text
(user_id, status, priority, created_at DESC)
```

```text
(user_id, cycle_id, status)
```

---

# 116. Indexes — cycles

```text
(user_id, start_date DESC)
```

```text
(user_id, status)
```

---

# 117. Indexes — snapshots

```text
(user_id, closed_at DESC)
```

---

# 118. RLS Principle

كل جدول يحتوي:

```text
user_id
```

يفعل له:

```text
ENABLE ROW LEVEL SECURITY
```

---

# 119. Standard Owner Policy

مفهوميًا:

```text
auth.uid() = user_id
```

لـ:

```text
SELECT
INSERT
UPDATE
```

حسب نوع الجدول.

---

# 120. DELETE Policies

لا يمنح DELETE اعتياديًا على:

```text
transactions
cycle_snapshots
state_transition_logs
plan_versions المعتمدة
cycle_category_snapshots
```

---

# 121. Nested Ownership

جداول لا تحتوي مباشرة `user_id` مثل:

```text
plan_versions
budget_allocations
cycle_category_snapshots
```

يجب إما:

1. إضافة `user_id` لتسهيل RLS.
2. أو استخدام Exists Policy عبر Parent.

الموصى به لهذا المشروع:

```text
إضافة user_id حتى للجداول الحساسة التابعة
```

إذا لم يسبب ازدواجًا غير منضبط.

---

# 122. قاعدة Ownership Redundancy

إذا أضيف `user_id` إلى Child Table:

يجب التحقق من أنه يطابق Parent.

ولا يسمح:

```text
child.user_id != parent.user_id
```

---

# 123. Database Functions

يمكن إنشاء Functions مركزية للعمليات المركبة.

مثل:

```text
record_expense()
pay_obligation()
post_transfer()
reverse_transaction()
close_cycle()
```

لكن:

هذه Functions ليست بديلًا عن Domain Layer.

هي طبقة ضمان ذرية داخل قاعدة البيانات عند الحاجة.

---

# 124. Triggers Policy

نستخدم Triggers بأقل قدر ممكن.

---

# 125. Triggers مسموحة

مناسب لـ:

```text
updated_at
immutable snapshots
immutable audit logs
```

---

# 126. Triggers غير مناسبة

لا نضع كامل Business Logic في Trigger مثل:

```text
Safe To Spend calculation
Goal allocation
Advisor logic
Forecast calculation
```

هذه تبقى في Domain Services.

---

# 127. updated_at Trigger

يمكن استخدام Function موحدة:

```text
set_updated_at()
```

على الجداول القابلة للتعديل.

---

# 128. Snapshot Immutability Trigger

عند محاولة:

```text
UPDATE cycle_snapshots
DELETE cycle_snapshots
```

يرفض بصورة اعتيادية.

---

# 129. State Transition Protection

لا تعتمد قاعدة البيانات على:

```text
CHECK status IN (...)
```

فقط.

الانتقال نفسه يفرض في:

```text
StateTransitionService
```

ويمكن إضافة DB Function حرجة مستقبلًا كطبقة حماية إضافية.

---

# 130. Views

يمكن بناء:

```text
account_balances_v
```

---

# 131. account_balances_v

يعرض:

```text
account_id
user_id
opening_balance
total_inflow
total_outflow
balance
```

اعتمادًا على:

```text
POSTED Transactions
```

---

# 132. current_cycle_metrics_v

لا يفضل وضع Safe To Spend كاملًا في View إذا كانت معادلته معقدة ومتغيرة.

يمكن أن تكون:

```text
Application Read Model
```

بدل SQL View.

---

# 133. Historical Views

يمكن إنشاء:

```text
closed_cycle_summary_v
```

تعتمد حصريًا على:

```text
cycle_snapshots
```

---

# 134. No Recalculation of Closed History

التقارير المغلقة لا تقرأ العمليات الحالية لإعادة بناء الأرقام التاريخية.

بل:

```text
CycleSnapshot
```

هو المرجع.

---

# 135. Concurrency

اعتماد Revision يستخدم:

```text
version_number
```

أو:

```text
updated_at
```

للـOptimistic Concurrency.

الموصى به:

```text
version_number
```

---

# 136. Database Transaction Boundaries

العمليات التالية يجب أن تكون داخل Transaction واحدة:

```text
Record Expense
Record Income
Transfer
Refund
Pay Obligation
Saving Transfer
Emergency Contribution
Emergency Withdrawal
Goal Contribution
Reverse Transaction
Approve Plan
Approve Revision
Close Cycle
```

---

# 137. Record Expense Atomicity

```text
BEGIN

reserve idempotency key
create transaction PENDING
validate cycle
validate account
validate category
post transaction
write state log if required
complete idempotency

COMMIT
```

الحسابات المشتقة تعاد بعد ذلك ضمن نفس Application Operation.

---

# 138. Pay Obligation Atomicity

```text
BEGIN

lock occurrence
verify status
create payment
post transaction
mark obligation PAID
remove reservation
create next occurrence
write transition
complete idempotency

COMMIT
```

---

# 139. Row Locking

في العمليات الحساسة يستخدم:

```text
SELECT ... FOR UPDATE
```

عند الحاجة لمنع سباق الطلبات.

خصوصًا:

* سداد التزام.
* إغلاق دورة.
* Revision approval.
* Goal completion.
* Idempotency execution.

---

# 140. Referential Integrity

مثال:

عملية:

```text
OBLIGATION_PAYMENT
```

مرتبطة بـ:

```text
obligation_occurrence_id
```

ويجب أن يكون السجل لنفس المستخدم.

---

# 141. Cross-Entity Validation

PostgreSQL FK وحده لا يضمن تطابق:

```text
user_id
```

عبر كل الكيانات.

يجب تطبيق ذلك في Domain Layer وربما Composite Constraints عند الحاجة.

---

# 142. Audit Philosophy

هناك نوعان:

```text
Financial History
Business Audit
```

---

# 143. Financial History

يأتي من:

```text
Transactions
Plan Versions
Snapshots
```

---

# 144. Business Audit

يأتي من:

```text
StateTransitionLog
Revision Reason
Reversal Reason
Emergency Withdrawal Reason
```

---

# 145. Reversal

لا يجرى:

```text
DELETE FROM transactions
```

لتصحيح عملية POSTED.

بل:

```text
Reversal
```

موثق.

---

# 146. Reversal Representation

يفضل:

```text
original transaction
+
reversal transaction
+
original.status = REVERSED
```

مع:

```text
related_transaction_id
```

يربط الاثنين.

---

# 147. Refund ≠ Reversal

```text
REFUND
```

حدث تجاري حقيقي.

بينما:

```text
REVERSAL
```

تصحيح لسجل سابق.

لا يخلطان.

---

# 148. Data Retention

لا تحذف الدورات المغلقة.

لا تحذف العمليات المنشورة.

لا تحذف Snapshots.

لا تحذف Audit Logs.

---

# 149. Backup

البيانات يجب أن تدخل Backup منتظم حسب خطة Supabase المختارة.

---

# 150. Restore Test

وجود Backup لا يكفي.

يجب لاحقًا اختبار:

```text
Restore
```

في بيئة غير Production.

---

# 151. Migration Policy

كل تغيير Schema يكون Migration منفصلة.

---

# 152. Migration Naming

مثل:

```text
001_initial_extensions
002_profiles
003_accounts
004_financial_cycles
005_plans
006_transactions
007_obligations
008_savings
009_emergency
010_goals
011_recommendations
012_snapshots
013_audit
014_rls
015_indexes
```

---

# 153. Migration Rule

ممنوع تعديل Migration منشورة في Production.

بل:

```text
Create new migration
```

---

# 154. Migration Transaction

كل Migration قابلة لذلك يجب تنفيذها:

```text
BEGIN
...
COMMIT
```

---

# 155. Enum Strategy

رغم إمكانية PostgreSQL ENUM، يفضل في V1 استخدام:

```text
TEXT
+
CHECK
```

للحالات المتغيرة نسبيًا.

السبب:

تعديل PostgreSQL ENUM أكثر تعقيدًا في التطوير المستمر.

---

# 156. Enum Exception

يمكن استخدام PostgreSQL ENUM فقط إذا ثبت أن القيمة مستقرة جدًا.

لكن لا نحتاجه في V1.

---

# 157. Decimal Precision

```text
NUMERIC(18,2)
```

يدعم نطاقًا أكبر بكثير من احتياجات المستخدم الشخصية.

---

# 158. Currency Precision

الريال السعودي يستخدم منزلتين عشريتين في النظام الحالي.

---

# 159. JSONB

يستخدم فقط عندما تكون البنية متغيرة فعلًا.

مثل:

```text
reason_data
snapshot_data
response_payload
```

---

# 160. ممنوع JSON لكل شيء

لا تخزن:

```text
transactions
goals
accounts
allocations
```

كـJSON blobs.

تبقى علاقية.

---

# 161. Generated Values

قيم مثل:

```text
Goal Progress
Emergency Completion
Category Utilization
Account Balance
```

يفضل حسابها.

لا تخزن إلا ضمن Snapshot أو Cache غير مصدر للحقيقة.

---

# 162. Safe To Spend Storage

لا يخزن:

```text
safe_to_spend
```

كقيمة ثابتة في الدورة الحالية باعتبارها مصدر حقيقة.

بل يحسب من Financial Engine.

---

# 163. Safe To Spend Snapshot

عند إغلاق الدورة يسمح بحفظ:

```text
safe_to_spend_final
```

داخل Snapshot.

---

# 164. Daily Safe Limit

لا يحتاج جدولًا خاصًا.

يحسَب:

```text
Safe To Spend
/
Remaining Days
```

وفق القاعدة المعتمدة.

---

# 165. Forecast Storage

Forecast الحالي لا يلزم حفظ كل نسخة منه.

لكن يمكن مستقبلاً إضافة:

```text
forecast_runs
```

إذا احتجنا تحليل دقة التوقعات.

غير مطلوب في V1.

---

# 166. Financial Health

لا ننشئ:

```text
financial_health_rules
```

أو أوزان نهائية حتى اعتماد المعادلة.

---

# 167. AT_RISK

لا ننشئ Constraint عدديًا له حاليًا.

الحالة يحسبها Engine عند توفر القاعدة النهائية.

---

# 168. Required Financial Buffer

لا ينشأ مبلغ افتراضي عشوائي.

حتى تعتمد القاعدة:

```text
Required Financial Buffer
```

يبقى:

```text
0 أو configuration غير مفعل
```

لكن لا يقدم ذلك للمستخدم كقاعدة مالية معتمدة.

---

# 169. Emergency Months Coverage

لا نخزن:

```text
months_covered
```

كقيمة فعلية مستقلة حاليًا.

حتى اعتماد طريقة حساب المصروف الأساسي الشهري.

---

# 170. Goal Available Capacity

لا تخزن كحقل ثابت في الهدف.

تحسب من Financial Engine وقت التحليل.

---

# 171. Database Security

يمنع الوصول المباشر غير المصرح إلى البيانات المالية.

---

# 172. Service Role

```text
service_role
```

لا يظهر للـFrontend.

---

# 173. Client Access

Client يستخدم فقط:

```text
anon key
+
authenticated session
+
RLS
```

إذا استخدم Supabase Client مباشرة للقراءة المسموحة.

---

# 174. Sensitive Writes

الكتابات المالية الحساسة يفضل أن تمر عبر:

```text
Server-side Application Layer
```

وليس Direct Client Insert.

---

# 175. Example RLS — accounts

Concept:

```text
USING (
  auth.uid() = user_id
)
```

---

# 176. Example RLS — transactions

قراءة:

```text
auth.uid() = user_id
```

أما إنشاء العمليات المالية فيفضل أن يتم عبر الخادم.

---

# 177. Application Database Role

الخادم يستخدم Role يسمح بالعمليات اللازمة لكنه يظل يفرض:

```text
Authenticated User Context
```

في Application Layer.

---

# 178. Data Exposure

Read Models لا تعيد:

* idempotency records.
* internal hashes.
* technical logs.
* raw auth identifiers.
* internal security fields.

---

# 179. Database Definition of Done

Schema لا تعتبر جاهزة حتى:

```text
Primary Keys
✓

Foreign Keys
✓

Check Constraints
✓

Unique Constraints
✓

Indexes
✓

RLS
✓

Money Precision
✓

No Float
✓

Historical Integrity
✓

Idempotency
✓

Atomic Operations
✓

Snapshots
✓

State Audit
✓

Migration Plan
✓
```

---

# 180. Integrity Test Matrix

يجب اختبار على الأقل:

```text
إنشاء دورتين ACTIVE لنفس المستخدم
→ يجب أن يفشل

مصروف بمبلغ 0
→ يجب أن يفشل

مصروف بدون Category
→ يجب أن يفشل

POSTED transaction بدون posted_at
→ يجب أن يفشل

التزام PAID بدون paid transaction
→ يجب أن يفشل

هدف بقيمة سالبة
→ يجب أن يفشل

حساب آخر مستخدم
→ يجب أن يرفض عبر RLS

نفس idempotency key مرتين
→ لا تكرر العملية

حذف Snapshot
→ يرفض

حذف Transaction POSTED
→ يرفض من Application Policy

تعديل Plan Version تاريخية
→ يرفض

Transfer لنفس الحساب
→ يرفض
```

---

# 181. قاعدة الحوكمة النهائية

لا يتم إضافة عمود أو جدول لمجرد سهولة تنفيذ شاشة.

قبل أي Schema Change يجب تحديد:

```text
ما الكيان؟
ما مصدر الحقيقة؟
هل القيمة مخزنة أم مشتقة؟
هل لها تاريخ مالي؟
هل يجب حفظها كSnapshot؟
هل يمكن حذفها؟
ما FK؟
ما Constraint؟
ما Index؟
ما RLS؟
ما أثرها على API Contracts؟
ما أثرها على Business Rules؟
```

---

# 182. النتيجة النهائية

قاعدة البيانات يجب أن تجعل الحالات الخطأ:

```text
صعبة أو مستحيلة
```

بدل الاعتماد فقط على أن المطور:

```text
لن يرتكب خطأ
```

والتسلسل الصحيح يصبح:

```text
User Intent
↓
API Contract
↓
Domain Validation
↓
State Validation
↓
Atomic Database Transaction
↓
Constraints
↓
POSTED Financial History
↓
Financial Engine
↓
Read Model
↓
UI
```

وبذلك تصبح قاعدة البيانات آخر خط دفاع عن سلامة أموال المستخدم وتاريخه المالي.
