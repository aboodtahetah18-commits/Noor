# DATA_MODEL.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

---

# 1. الهدف من الوثيقة

تحدد هذه الوثيقة نموذج البيانات المنطقي للنظام.

الهدف منها هو تحديد:

* الكيانات الرئيسية.
* العلاقات بينها.
* المفاتيح الأساسية.
* المفاتيح المرجعية.
* الحقول المالية.
* الحالات.
* القيود.
* البيانات التاريخية.
* ما يجب تخزينه.
* وما يجب حسابه عند الطلب.

هذه الوثيقة لا تحدد بعد:

* نوع قاعدة البيانات النهائي.
* أسماء SQL النهائية.
* Indexes النهائية.
* RLS.
* API.
* ORM.

يتم حسم ذلك في مرحلة Architecture.

---

# 2. المبادئ الأساسية لنموذج البيانات

## DM-RULE-001 — استخدام IDs ثابتة

كل كيان رئيسي يجب أن يمتلك معرفًا فريدًا غير مبني على الاسم.

مثل:

```text
id
```

ولا تستخدم أسماء البنود أو الحسابات أو الأهداف كمفاتيح مرجعية.

---

## DM-RULE-002 — التاريخ المالي لا يحذف

أي عملية أصبحت جزءًا من سجل مالي لا يتم حذفها بطريقة تفقد التاريخ.

يتم استخدام:

* Status.
* Reversal.
* Cancellation.
* Historical Versions.

بحسب نوع الكيان.

---

## DM-RULE-003 — الفصل بين المخطط والفعلي

يجب الفصل بين:

```text
Planned
Actual
```

في جميع الكيانات التي تحتاج ذلك.

---

## DM-RULE-004 — الفصل بين الحالة والنوع

مثال:

```text
Transaction Type = EXPENSE
Transaction Status = POSTED
```

وهما مفهومان منفصلان.

---

## DM-RULE-005 — لا تخزن قيمة يمكن اشتقاقها بلا حاجة

القيم التي يمكن حسابها دائمًا من مصدر الحقيقة لا تخزن كحقيقة مالية مستقلة إلا إذا كانت Snapshot تاريخية.

مثال:

```text
Goal Progress %
```

يفضل حسابها من:

```text
Current Balance / Target Amount
```

أما عند إغلاق دورة فيمكن حفظ النتيجة ضمن Snapshot.

---

# 3. الخريطة العامة للكيانات

الكيانات الأساسية:

```text
User
Account
FinancialCycle
FinancialPlan
PlanVersion
BudgetCategory
BudgetAllocation
Transaction
ObligationTemplate
ObligationOccurrence
SavingAllocation
EmergencyFund
EmergencyAllocation
FinancialGoal
GoalAllocation
Recommendation
CycleSnapshot
CycleReview
StateTransitionLog
```

---

# 4. User

رغم أن النظام حاليًا لمستخدم واحد، يجب ألا تبنى البيانات بدون `user_id` حتى لا نضطر لإعادة تصميم النظام لاحقًا.

## User

```text
id
display_name
base_currency
timezone
created_at
updated_at
```

### base_currency

الإصدار الحالي:

```text
SAR
```

### timezone

يجب حفظ المنطقة الزمنية لأن:

* تاريخ الاستحقاق.
* إغلاق الدورة.
* الأيام المتبقية.
* التوصيات الزمنية.

تعتمد عليها.

---

# 5. Account

يمثل المكان الذي توجد فيه الأموال.

مثل:

* حساب بنكي.
* حساب توفير.
* نقد.
* محفظة.

لا يعني ذلك أن دعم جميع الأنواع مطلوب من أول إصدار، لكن وجود الكيان ضروري لأن المصروفات الحالية تتطلب تحديد الحساب المستخدم.

## Account

```text
id
user_id
name
account_type
currency
is_active
created_at
updated_at
```

## account_type

مبدئيًا:

```text
BANK
SAVINGS
CASH
OTHER
```

ولا يتم اعتماد أنواع أخرى إلا عند الحاجة.

---

# 6. رصيد الحساب

مصدر الحقيقة للرصيد لا يجب أن يكون رقمًا يتم تعديله يدويًا في عشرات الأماكن.

الأصل:

```text
Account
↓
Posted Transactions
↓
Balance
```

أي:

```text
Account Balance
=
Opening Balance
+
Posted Inflows
-
Posted Outflows
```

إذا كان النظام يحتاج Opening Balance في الإصدار الأول، يتم تمثيله بعملية مالية موثقة أو بحقل تأسيسي واضح.

---

# 7. FinancialCycle

تمثل دورة مالية مستقلة.

## FinancialCycle

```text
id
user_id
name
start_date
expected_next_income_date
status
activated_at
closing_started_at
closed_at
created_at
updated_at
```

## status

وفق State Machine:

```text
DRAFT
ACTIVE
CLOSING
CLOSED
```

---

# 8. قاعدة دورة واحدة فعالة

في الإصدار الحالي، لا ينبغي وجود أكثر من دورة:

```text
ACTIVE
```

لنفس المستخدم في الوقت نفسه.

---

# 9. FinancialPlan

لكل دورة خطة مالية.

## FinancialPlan

```text
id
user_id
cycle_id
current_version_id
status
created_at
approved_at
closed_at
updated_at
```

## status

```text
PLAN_DRAFT
ACTIVE_PLAN
REVISED
CLOSED_PLAN
```

---

# 10. PlanVersion

لأن الخطة المعتمدة لا يجوز تعديلها بصمت، يجب استخدام Versions.

## PlanVersion

```text
id
plan_id
version_number
revision_reason
is_current
created_at
approved_at
```

مثال:

```text
v1
v2
v3
```

لا يتم استبدال `v1` عند تعديل الخطة.

بل تنشأ نسخة جديدة.

---

# 11. BudgetCategory

يمثل بند الميزانية.

مثل:

* غذاء.
* وقود.
* مطاعم.
* اتصالات.
* مصروف شخصي.

## BudgetCategory

```text
id
user_id
name
category_group
expense_nature_default
is_essential
is_active
created_at
updated_at
```

---

# 12. category_group

يجب أن يدعم التصنيف الهيكلي المتوافق مع توزيع الراتب.

مبدئيًا:

```text
OBLIGATION
ESSENTIAL
SAVING
EMERGENCY
GOAL
FLEXIBLE
```

لكن الالتزامات والادخار والطوارئ والأهداف لها كيانات مستقلة أيضًا.

هذا الحقل يستخدم للتصنيف وليس ليحل محل كياناتها التشغيلية.

---

# 13. expense_nature_default

القيمة الافتراضية الممكنة:

```text
NECESSARY
IMPORTANT
OPTIONAL
ENTERTAINMENT
```

أما `UNPLANNED` فهو يفضل أن يبقى صفة للعملية نفسها وليس طبيعة ثابتة للبند.

---

# 14. BudgetAllocation

يمثل تخصيص مبلغ لبند معين داخل نسخة من الخطة.

## BudgetAllocation

```text
id
plan_version_id
category_id
planned_amount
allocation_type
created_at
updated_at
```

## allocation_type

مبدئيًا:

```text
OBLIGATION
ESSENTIAL
SAVING
EMERGENCY
GOAL
FLEXIBLE
```

---

# 15. لماذا BudgetAllocation مستقل؟

حتى نستطيع الاحتفاظ بـ:

```text
Plan Version 1:
Fuel = 500

Plan Version 2:
Fuel = 650
```

بدون فقدان الخطة الأصلية.

---

# 16. Transaction

هذا هو سجل العمليات المالية المركزي.

## Transaction

```text
id
user_id
cycle_id
account_id
transaction_type
status
amount
transaction_date
description
category_id
planning_status
expense_nature
related_transaction_id
obligation_occurrence_id
goal_id
emergency_fund_id
created_at
posted_at
reversed_at
updated_at
```

---

# 17. Transaction Type

وفق State Machine:

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

# 18. Transaction Status

```text
PENDING
POSTED
REVERSED
FAILED
```

---

# 19. planning_status

للمصروفات:

```text
PLANNED
UNPLANNED
```

ولا يلزم استخدامه لجميع أنواع العمليات.

---

# 20. expense_nature

للمصروف:

```text
NECESSARY
IMPORTANT
OPTIONAL
ENTERTAINMENT
UNPLANNED
```

ويجب التمييز بين:

```text
expense_nature
```

و:

```text
planning_status
```

حتى لو كان بينهما تداخل دلالي في بعض الحالات.

---

# 21. related_transaction_id

يستخدم لربط عمليات مثل:

```text
REFUND
```

بالمصروف الأصلي.

ويستخدم أيضًا عند الحاجة لربط عملية عكس أو معالجة مالية ذات صلة.

---

# 22. التحويل بين الحسابات

التحويل:

```text
TRANSFER
```

لا يعتبر:

* Income.
* Expense.

ومن الأفضل أن يمثل داخليًا بصورة تسمح بإظهار:

```text
From Account
To Account
```

يمكن تحقيق ذلك مستقبلًا إما:

* عبر Transaction + TransferDetail.
* أو عمليتين مترابطتين.

لا يتم حسم النموذج الفيزيائي النهائي هنا قبل Architecture.

---

# 23. Income

لا نحتاج بالضرورة جدول Income مستقل إذا كان:

```text
Transaction Type = INCOME
```

يمثل الدخل الفعلي.

لكن الدخل المتوقع للدورة يجب أن يبقى منفصلًا عن الدخل الفعلي.

لذلك يضاف كيان:

```text
ExpectedIncome
```

---

# 24. ExpectedIncome

## ExpectedIncome

```text
id
user_id
cycle_id
source_name
expected_amount
expected_date
income_kind
is_primary
created_at
updated_at
```

## income_kind

مبدئيًا:

```text
SALARY
ADDITIONAL_INCOME
BONUS
OTHER
```

ولا يتم استخدام `REFUND` كدخل متوقع.

---

# 25. الفرق بين ExpectedIncome وTransaction

```text
ExpectedIncome
=
ماذا نتوقع أن يصل
```

بينما:

```text
Transaction(INCOME)
=
ماذا وصل فعلًا
```

وهذا ضروري لتطبيق:

```text
Expected vs Actual
```

---

# 26. ObligationTemplate

يمثل الالتزام المتكرر نفسه.

مثال:

```text
فاتورة الإنترنت
الإيجار
قسط السيارة
```

## ObligationTemplate

```text
id
user_id
name
default_amount
recurrence
priority
expected_account_id
is_active
created_at
updated_at
```

## recurrence

```text
ONCE
MONTHLY
QUARTERLY
SEMI_ANNUAL
ANNUAL
```

---

# 27. ObligationOccurrence

يمثل استحقاقًا فعليًا محدد التاريخ.

مثال:

```text
فاتورة الإنترنت - سبتمبر 2026
```

## ObligationOccurrence

```text
id
user_id
template_id
cycle_id
due_date
amount
status
is_reserved
paid_transaction_id
created_at
paid_at
cancelled_at
updated_at
```

## status

```text
UPCOMING
DUE
OVERDUE
PAID
CANCELLED
```

---

# 28. لماذا فصل Template عن Occurrence؟

لمنع هذا الخطأ:

```text
فاتورة الإنترنت
```

تتغير إلى مدفوعة ثم نفقد استحقاق الشهر التالي.

الصحيح:

```text
Template
↓
Occurrence Sep
Occurrence Oct
Occurrence Nov
```

كل استحقاق سجل مستقل.

---

# 29. SavingAllocation

يمثل خطة الادخار داخل دورة معينة.

## SavingAllocation

```text
id
user_id
cycle_id
plan_version_id
planned_amount
allocated_amount
actual_transferred_amount
status
created_at
updated_at
```

## status

```text
PLANNED
ALLOCATED
PARTIALLY_TRANSFERRED
TRANSFERRED
CANCELLED
```

---

# 30. Actual Saving

المبلغ الفعلي للادخار لا يثبت بمجرد تغيير:

```text
actual_transferred_amount
```

دون عملية مالية داعمة.

مصدر الحقيقة هو:

```text
Transaction Type = SAVING_TRANSFER
Status = POSTED
```

ويجوز استخدام `actual_transferred_amount` كقيمة مشتقة أو Cached Aggregate لاحقًا.

---

# 31. EmergencyFund

كيان مستقل حسب المتطلبات.

## EmergencyFund

```text
id
user_id
name
target_amount
status
created_at
updated_at
```

## status

```text
NOT_CONFIGURED
BUILDING
FUNDED
DEPLETED
```

---

# 32. رصيد صندوق الطوارئ

يفضل أن يكون رصيد الصندوق مشتقًا من:

```text
EMERGENCY_CONTRIBUTION
-
EMERGENCY_WITHDRAWAL
```

بدل وجود رقم قابل للتغيير يدويًا بدون سجل.

---

# 33. EmergencyAllocation

يمثل مساهمة الدورة الحالية في صندوق الطوارئ.

## EmergencyAllocation

```text
id
user_id
cycle_id
plan_version_id
emergency_fund_id
planned_amount
allocated_amount
actual_transferred_amount
status
created_at
updated_at
```

## status

```text
PLANNED
ALLOCATED
PARTIALLY_TRANSFERRED
TRANSFERRED
CANCELLED
```

---

# 34. سحب الطوارئ

العملية:

```text
Transaction Type = EMERGENCY_WITHDRAWAL
```

ويجب أن تحتوي أيضًا على معلومات السبب.

لذلك يضاف:

```text
EmergencyWithdrawalDetail
```

---

# 35. EmergencyWithdrawalDetail

```text
id
transaction_id
reason
emergency_type
created_at
```

ولا يجوز وجود Emergency Withdrawal مكتمل دون سبب وفق قواعد الأعمال.

---

# 36. FinancialGoal

## FinancialGoal

```text
id
user_id
name
target_amount
target_date
priority
status
start_date
created_at
updated_at
achieved_at
cancelled_at
```

## status

```text
DRAFT
ACTIVE
FINANCIALLY_UNREALISTIC
PAUSED
ACHIEVED
CANCELLED
```

---

# 37. رصيد الهدف

يفضل ألا يكون:

```text
current_balance
```

رقمًا يدويًا منفصلًا عن سجل المساهمات.

مصدر الحقيقة:

```text
SUM(
POSTED GOAL_CONTRIBUTION transactions
)
```

مع إمكانية وجود Opening Balance عند إنشاء الهدف إذا كان المستخدم قد بدأ الادخار قبل استخدام النظام.

---

# 38. GoalAllocation

يمثل مساهمة الهدف في دورة محددة.

## GoalAllocation

```text
id
user_id
goal_id
cycle_id
plan_version_id
planned_amount
allocated_amount
actual_contributed_amount
created_at
updated_at
```

---

# 39. Goal Contribution

كل مساهمة فعلية:

```text
Transaction Type = GOAL_CONTRIBUTION
```

وترتبط بـ:

```text
goal_id
```

---

# 40. Recommendation

يمثل توصية صادرة من المستشار المالي.

## Recommendation

```text
id
user_id
cycle_id
recommendation_type
status
priority
title
message
reason_code
reason_data
related_category_id
related_goal_id
related_obligation_occurrence_id
created_at
viewed_at
accepted_at
dismissed_at
expired_at
resolved_at
```

---

# 41. Recommendation Type

```text
WARNING
OPPORTUNITY
CORRECTION
GOAL
POSITIVE
```

---

# 42. Recommendation Status

```text
NEW
VIEWED
ACCEPTED
DISMISSED
EXPIRED
RESOLVED
```

---

# 43. reason_code

مهم جدًا لكي تكون التوصية قابلة للتفسير.

مثال:

```text
CATEGORY_SPEND_RATE_HIGH
DEFICIT_RISK
OBLIGATION_OVERDUE
SAFE_TO_SPEND_ZERO
GOAL_UNREALISTIC
SURPLUS_AVAILABLE
```

ولا تعتبر هذه قائمة نهائية قبل تعريف Recommendation Engine.

---

# 44. reason_data

يحتوي البيانات الداعمة للتوصية.

مثال مفاهيمي:

```text
budget = 500
spent = 470
cycle_elapsed_percent = 45
utilization_percent = 94
```

الهدف:

إمكانية معرفة لماذا تم إنشاء التوصية.

---

# 45. CycleSnapshot

من أهم الجداول التاريخية.

عند إغلاق الدورة يحفظ Snapshot مستقل.

## CycleSnapshot

```text
id
user_id
cycle_id
closed_at
expected_income
actual_income
planned_expense
actual_expense
planned_saving
actual_saving
emergency_contribution
goal_contributions
safe_to_spend_final
projected_end_balance_final
actual_end_balance
surplus_amount
deficit_amount
financial_health_score
snapshot_data
created_at
```

---

# 46. Financial Health Score

الحقل موجود لأن النظام يشترط Snapshot تاريخيًا.

لكن قيمة المؤشر لا تعتمد نهائيًا حتى حسم:

```text
PENDING-BR-001
```

لذلك يجب ألا تبنى معادلة نهائية له في هذه المرحلة.

---

# 47. CycleReview

يمثل تقرير نهاية الدورة.

## CycleReview

```text
id
user_id
cycle_id
snapshot_id
status
summary
advisor_summary
created_at
ready_at
archived_at
failed_at
```

## status

```text
GENERATING
READY
ARCHIVED
FAILED
```

---

# 48. تفاصيل البنود داخل Snapshot

لتحليل:

```text
Planned vs Actual
```

لكل بند، يضاف:

```text
CycleCategorySnapshot
```

---

# 49. CycleCategorySnapshot

```text
id
snapshot_id
category_id
planned_amount
actual_amount
variance_amount
utilization_percent
final_status
created_at
```

## final_status

```text
NORMAL
AT_RISK
OVER_BUDGET
```

مع ملاحظة أن معيار:

```text
AT_RISK
```

غير محسوم بعد.

---

# 50. StateTransitionLog

لأن الحالات ذات أثر مالي وتشغيلي، نحتاج سجل انتقالات موحد.

## StateTransitionLog

```text
id
user_id
entity_type
entity_id
from_state
to_state
event
reason
created_at
```

---

# 51. entity_type

مثل:

```text
FINANCIAL_CYCLE
FINANCIAL_PLAN
OBLIGATION
GOAL
TRANSACTION
SAVING_ALLOCATION
EMERGENCY_FUND
RECOMMENDATION
CYCLE_REVIEW
```

---

# 52. لماذا StateTransitionLog؟

حتى يمكن لاحقًا معرفة:

```text
متى أصبح الالتزام OVERDUE؟
متى تم اعتماد الخطة؟
متى تحول الهدف إلى ACHIEVED؟
متى تم عكس العملية؟
```

---

# 53. PlanRevisionLog

بالإضافة إلى Versioning يفضل وجود سجل سبب التعديل.

يمكن إما دمجه داخل:

```text
PlanVersion
```

أو إنشاء:

```text
PlanRevisionLog
```

النموذج النهائي يحسم في Architecture.

المهم أن المصدر الحالي يشترط حفظ:

* القيمة السابقة.
* القيمة الجديدة.
* وقت التعديل.
* سبب التعديل عند الحاجة.

---

# 54. العلاقات الرئيسية

```text
User
1
↓
*
Account
```

```text
User
1
↓
*
FinancialCycle
```

```text
FinancialCycle
1
↓
1..*
FinancialPlan
```

عمليًا قد تكون خطة واحدة مع Versions.

---

```text
FinancialPlan
1
↓
*
PlanVersion
```

---

```text
PlanVersion
1
↓
*
BudgetAllocation
```

---

```text
FinancialCycle
1
↓
*
Transaction
```

---

```text
BudgetCategory
1
↓
*
Transaction
```

---

```text
ObligationTemplate
1
↓
*
ObligationOccurrence
```

---

```text
ObligationOccurrence
0..1
↓
1
OBLIGATION_PAYMENT Transaction
```

---

```text
FinancialGoal
1
↓
*
GoalAllocation
```

---

```text
FinancialGoal
1
↓
*
GOAL_CONTRIBUTION Transaction
```

---

```text
EmergencyFund
1
↓
*
EmergencyAllocation
```

---

```text
EmergencyFund
1
↓
*
Emergency Transactions
```

---

```text
FinancialCycle
1
↓
*
Recommendation
```

---

```text
FinancialCycle
1
↓
0..1
CycleSnapshot
```

---

```text
CycleSnapshot
1
↓
*
CycleCategorySnapshot
```

---

# 55. ERD مفاهيمي مختصر

```text
USER
│
├── ACCOUNTS
│     └── TRANSACTIONS
│
├── FINANCIAL CYCLES
│     │
│     ├── EXPECTED INCOME
│     │
│     ├── FINANCIAL PLAN
│     │      └── PLAN VERSIONS
│     │             └── BUDGET ALLOCATIONS
│     │
│     ├── TRANSACTIONS
│     │
│     ├── OBLIGATION OCCURRENCES
│     │
│     ├── SAVING ALLOCATIONS
│     │
│     ├── EMERGENCY ALLOCATIONS
│     │
│     ├── GOAL ALLOCATIONS
│     │
│     ├── RECOMMENDATIONS
│     │
│     └── CYCLE SNAPSHOT
│            └── CATEGORY SNAPSHOTS
│
├── OBLIGATION TEMPLATES
│      └── OBLIGATION OCCURRENCES
│
├── FINANCIAL GOALS
│      ├── GOAL ALLOCATIONS
│      └── GOAL CONTRIBUTIONS
│
└── EMERGENCY FUND
       ├── EMERGENCY ALLOCATIONS
       └── EMERGENCY TRANSACTIONS
```

---

# 56. القيم المالية التي تعتبر Source of Truth

مصدر الحقيقة المالي يجب أن يكون:

```text
POSTED Transactions
```

بالنسبة للحركات الفعلية.

بينما التخطيط مصدره:

```text
Approved Plan Version
```

---

# 57. القيم المشتقة

يفضل حساب القيم التالية بدل جعلها قابلة للتعديل المباشر:

```text
Account Balance
Goal Current Balance
Emergency Fund Current Balance
Category Actual Spend
Category Remaining Amount
Category Utilization %
Safe To Spend
Daily Safe Limit
Projected End Balance
Expected Deficit
Goal Progress %
Emergency Completion %
```

---

# 58. القيم التي تحفظ كـSnapshot

عند إغلاق الدورة يجوز تخزين النتائج المشتقة ضمن Snapshot حتى تظل التقارير التاريخية ثابتة.

مثل:

```text
Safe To Spend Final
Financial Health Score
Utilization %
Surplus
Deficit
Actual vs Planned
```

---

# 59. Safe To Spend

لا يتم إنشاء جدول باسم:

```text
SafeToSpend
```

في النموذج الأساسي.

بل هو ناتج حسابي يعتمد على:

```text
Available Liquidity
Reserved Obligations
Remaining Essential Needs
Protected Savings
Protected Emergency Allocation
Protected Goal Allocations
Required Financial Buffer
```

ويحفظ فقط عند الحاجة التاريخية داخل Snapshot.

---

# 60. Required Financial Buffer

يوجد في المعادلات الحالية، لكن طريقة حسابه غير محسومة:

```text
PENDING-BR-002
```

لذلك لا يتم إنشاء منطق رقمي نهائي له بعد.

يمكن أن يكون لاحقًا:

* Setting.
* Calculated Value.
* Cycle-level Value.

ويحسم في مرحلة الحسابات.

---

# 61. Financial Health Score

يوجد كمؤشر مطلوب، لكن المعادلة والأوزان غير محسومة.

لذلك:

```text
financial_health_score
```

قد يوجد داخل Snapshot كحقل قابل للإضافة لاحقًا، لكن لا تعتبر قيمته الحالية محددة حتى اعتماد المعادلة.

---

# 62. حالات البيانات المحسوبة

القيم مثل:

```text
AT_RISK
DEFICIT_RISK
FINANCIALLY_UNREALISTIC
```

لا يجب تعديلها يدويًا من المستخدم.

يتم اشتقاقها من القواعد والتحليلات.

---

# 63. منع الازدواج

يجب تصميم Unique Constraints لاحقًا لمنع حالات مثل:

* تسجيل نفس العملية مرتين.
* إنشاء أكثر من Snapshot لنفس الدورة.
* إنشاء أكثر من Plan Version بنفس version number.
* ربط نفس عملية السداد باستحقاقين.
* استخدام نفس idempotency key مرتين.

---

# 64. Idempotency

نظرًا لقاعدة منع الحفظ المكرر، يجب أن تدعم عمليات الكتابة الحرجة لاحقًا:

```text
idempotency_key
```

خصوصًا:

* تسجيل مصروف.
* تسجيل دخل.
* سداد التزام.
* تحويل ادخار.
* مساهمة هدف.
* مساهمة أو سحب طوارئ.

تفاصيل التطبيق تترك لـ Architecture.

---

# 65. الدقة المالية

جميع الحقول المالية يجب أن تدعم دقة مناسبة للعملة.

ولا تستخدم:

```text
float
```

لتخزين الأموال بصورة غير منضبطة.

نوع التخزين الفيزيائي النهائي يحدد لاحقًا في قاعدة البيانات.

---

# 66. التواريخ

يجب الفصل بين:

```text
transaction_date
created_at
posted_at
```

لأن العملية قد:

* تحدث بتاريخ مالي معين.
* تسجل تقنيًا في وقت آخر.
* تعتمد أو تنشر في وقت ثالث.

---

# 67. عدم الخلط بين Dates

مثال:

```text
due_date
```

خاص بالاستحقاق.

```text
transaction_date
```

خاص بالعملية المالية.

```text
created_at
```

خاص بوقت إنشاء السجل تقنيًا.

---

# 68. Soft Delete

لا يتم اعتماد حذف نهائي للكيانات المالية التاريخية.

للكيانات المرجعية مثل Category يمكن استخدام:

```text
is_active = false
```

بدل حذفها إذا أصبحت مرتبطة ببيانات تاريخية.

---

# 69. Future Multi-User Readiness

رغم أن الإصدار الأول لمستخدم واحد، يجب ربط الكيانات الرئيسية بـ:

```text
user_id
```

حتى لا تضطر المنصة لاحقًا لإعادة تصميم جميع العلاقات عند دعم تعدد المستخدمين.

---

# 70. الجداول المرجعية مقابل التشغيلية

## Reference / Configuration

```text
User
Account
BudgetCategory
ObligationTemplate
FinancialGoal
EmergencyFund
```

## Operational

```text
FinancialCycle
FinancialPlan
PlanVersion
BudgetAllocation
ExpectedIncome
Transaction
ObligationOccurrence
SavingAllocation
EmergencyAllocation
GoalAllocation
Recommendation
```

## Historical

```text
CycleSnapshot
CycleCategorySnapshot
CycleReview
StateTransitionLog
```

---

# 71. البيانات التي لا نضيفها الآن

بناءً على النطاق الحالي لا نضيف في الإصدار الأول:

* Investment Portfolio.
* Stocks.
* Crypto.
* Tax Records.
* Business Accounting.
* Multi-user household structures.
* Complex Credit Card Ledger.

إلا إذا تم توسيع المتطلبات لاحقًا.

---

# 72. البطاقة الائتمانية

تم ذكرها في Workflow كحالة مستقبلية.

لذلك لا يتم تصميم نموذج Credit Card كامل الآن.

لكن يجب ألا تمنع المعمارية إضافته مستقبلًا.

---

# 73. Receipts / Attachments

SYSTEM_MASTER يعتبر:

* صورة الفاتورة.
* الإيصال.

ميزات مستقبلية.

لذلك لا تعد جزءًا إلزاميًا من نموذج الإصدار الأول.

يمكن لاحقًا إضافة:

```text
Attachment
```

مرتبط بـ:

```text
Transaction
```

دون تغيير جوهر النموذج المالي.

---

# 74. Merchant / Location

أيضًا تعتبر مستقبلية حاليًا.

لا يتم فرض:

```text
merchant_id
location
```

في الإصدار الأول.

---

# 75. البيانات اللازمة للوحة الرئيسية

يجب أن يمكن اشتقاق:

```text
Net Income
Current Spending
Remaining Budget
Safe To Spend
Saving Rate
Emergency Fund Status
Goals Progress
Upcoming Obligations
Financial Health Score
```

من نموذج البيانات الحالي دون الحاجة إلى جداول مستقلة لكل بطاقة Dashboard.

---

# 76. البيانات اللازمة للمستشار المالي

يجب أن يستطيع Recommendation Engine قراءة:

* الدورة الحالية.
* الخطة المعتمدة.
* العمليات الفعلية.
* البنود.
* الالتزامات.
* الادخار.
* صندوق الطوارئ.
* الأهداف.
* Snapshot التاريخي.

ولا يعتمد على بيانات واجهة مؤقتة.

---

# 77. البيانات اللازمة للتعلم التاريخي

المتوسطات التاريخية يجب أن تعتمد على:

```text
CLOSED Financial Cycles
+
CycleSnapshot
+
CycleCategorySnapshot
```

ولا تعتبر الدورة النشطة دورة مكتملة.

---

# 78. نقاط غير محسومة في نموذج البيانات

## PENDING-DM-001

نوع التخزين الفيزيائي النهائي للأرصدة:

* حساب مباشر من Transactions.
* Cached Balance.
* Ledger.

يحسم في Architecture.

---

## PENDING-DM-002

النموذج الفيزيائي للتحويل بين حسابين.

---

## PENDING-DM-003

تمثيل Opening Balance للحسابات والأهداف والطوارئ.

---

## PENDING-DM-004

طريقة تخزين `Required Financial Buffer`.

مرتبطة بـ:

```text
PENDING-BR-002
```

---

## PENDING-DM-005

تفاصيل Financial Health Score.

مرتبطة بـ:

```text
PENDING-BR-001
```

---

## PENDING-DM-006

قواعد `AT_RISK`.

مرتبطة بـ:

```text
PENDING-BR-003
```

---

## PENDING-DM-007

آلية Forecasting التفصيلية.

مرتبطة بـ:

```text
PENDING-BR-004
```

---

## PENDING-DM-008

طريقة توزيع القدرة المالية بين عدة أهداف عند عدم كفايتها.

مرتبطة بـ:

```text
PENDING-BR-005
```

---

## PENDING-DM-009

تعريف هدف صندوق الطوارئ حسب عدد الأشهر.

مرتبطة بـ:

```text
PENDING-BR-006
```

---

# 79. قاعدة الحوكمة

أي كيان أو حقل مالي جديد يجب ألا يضاف مباشرة إلى قاعدة البيانات.

يجب أن يمر عبر:

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
Architecture
↓
Migration
↓
Validation
↓
Tests
↓
Implementation
```

---

# 80. النتيجة النهائية للنموذج

نموذج البيانات يجب أن يحقق ثلاثة مبادئ:

## Financial Integrity

لا توجد حركة مالية بدون سجل يمكن تتبعه.

## Historical Integrity

لا تضيع الخطط أو النتائج السابقة عند التعديل.

## Explainability

كل رقم أو توصية يمكن الرجوع إلى البيانات التي أدت إليه.

وهذه المبادئ الثلاثة تعتبر أساس قاعدة البيانات للنظام.
