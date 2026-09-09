# IMPLEMENTATION_PLAN.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

## Master Implementation Plan

---

# 1. الهدف

تحدد هذه الوثيقة الخطة التنفيذية الرسمية لبناء النظام من الصفر حتى Production.

وهي تحول المراجع المعتمدة إلى:

```text
Architecture
↓
Infrastructure
↓
Database
↓
Domain
↓
Application
↓
UI
↓
Testing
↓
Security
↓
Deployment
```

ولا يسمح بالتنفيذ العشوائي بحسب الصفحة أو حسب ما يبدو أسهل.

---

# 2. قاعدة التنفيذ الأساسية

النظام يبنى باستخدام:

```text
Vertical Slices
```

وليس:

```text
Frontend كامل
ثم Backend كامل
ثم Database
```

الصحيح مثلًا:

```text
تسجيل مصروف
↓
Database
↓
Domain Rule
↓
Application Command
↓
API Contract
↓
UI
↓
Tests
↓
Security
```

ثم ننتقل إلى Feature أخرى.

---

# 3. لماذا Vertical Slices؟

لأنها تكشف الأخطاء مبكرًا في:

* Business Rules.
* API.
* Database.
* State Machines.
* UI.
* Security.
* Calculations.

ولا نكتشف في نهاية المشروع أن الواجهة بنيت على نموذج بيانات غير صحيح.

---

# 4. ترتيب سلطة التنفيذ

أي قرار أثناء التطوير يعود للمراجع بالترتيب:

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
↓
API_CONTRACTS.md
↓
DATABASE_SCHEMA.md
↓
TEST_PLAN.md
↓
SECURITY.md
↓
IMPLEMENTATION_PLAN.md
```

---

# 5. التقنية الأساسية

الـStack المعتمد للتنفيذ الأول:

```text
Next.js
React
TypeScript

PostgreSQL
Supabase

Supabase Auth
Supabase RLS
```

مع إبقاء Domain Logic مستقلًا عن تفاصيل Supabase قدر الإمكان.

---

# 6. مدير الحزم

يعتمد مدير حزم واحد فقط.

المقترح:

```text
pnpm
```

ولا يسمح بمزج:

```text
npm
yarn
pnpm
```

داخل نفس المشروع.

---

# 7. Runtime

يعتمد إصدار Node.js LTS ثابت داخل المشروع.

ويثبت في:

```text
package.json
```

أو ملف إدارة الإصدار المناسب.

---

# 8. TypeScript

يستخدم:

```text
strict: true
```

ولا يسمح بتعطيل TypeScript من أجل تجاوز الأخطاء.

---

# 9. قاعدة any

يحظر الاستخدام غير المبرر لـ:

```text
any
```

في Domain أو Financial Engine أو API Contracts.

---

# 10. Project Structure

البنية المقترحة:

```text
src/
├── app/
├── components/
├── features/
├── domain/
├── application/
├── infrastructure/
├── repositories/
├── financial-engine/
├── state-machines/
├── recommendations/
├── forecast/
├── validation/
├── auth/
├── lib/
└── types/

supabase/
├── migrations/
├── seed/
└── tests/

tests/
├── unit/
├── integration/
├── database/
├── api/
├── e2e/
└── security/
```

---

# 11. Feature Structure

كل Feature رئيسية يمكن أن تستخدم:

```text
features/transactions/
├── components/
├── queries/
├── commands/
├── schemas/
├── types/
└── tests/
```

لكن Domain Logic لا يوضع داخل React Components.

---

# 12. Phase 0 — Repository Foundation

أول مرحلة تنفيذية.

المطلوب:

```text
Repository
TypeScript
Next.js
Lint
Formatter
Test Framework
Environment validation
CI base
```

---

# 13. Phase 0 Deliverables

يجب وجود:

```text
package.json
tsconfig.json
eslint config
.gitignore
.env.example
README
CI workflow
```

---

# 14. Environment Validation

يجب التحقق عند التشغيل من وجود Environment Variables المطلوبة.

ولا يكتفى بفشل التطبيق لاحقًا بسبب Variable مفقود.

---

# 15. Environment Separation

إعداد:

```text
Development
Staging
Production
```

من البداية.

حتى لو لم يتم نشر Staging فورًا.

---

# 16. Phase 0 Quality Gate

قبل الاستمرار:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

يجب أن تنجح.

---

# 17. Phase 1 — Database Foundation

يتم تنفيذ `DATABASE_SCHEMA.md`.

الترتيب:

```text
Auth / Profiles
↓
Accounts
↓
Financial Cycles
↓
Expected Income
↓
Plans / Versions
↓
Categories / Allocations
↓
Transactions / Transfers
↓
Obligations
↓
Savings
↓
Emergency
↓
Goals
↓
Recommendations
↓
Snapshots
↓
Audit / Idempotency
```

---

# 18. Migration Rule

كل تغيير Schema:

```text
New Migration
```

ولا يتم تعديل Migration سبق تطبيقها.

---

# 19. Migration Naming

صيغة واضحة مثل:

```text
20260902_001_profiles.sql
20260902_002_accounts.sql
```

أو Timestamp آلي من Supabase CLI.

---

# 20. Foreign Keys

يتم إنشاء العلاقات الفعلية حسب Database Schema.

ولا تترك العلاقات الحرجة كـUUID بلا Foreign Key إذا كانت قابلة للربط الصريح.

---

# 21. Database Constraints First

قبل كتابة Application Validation الكامل، يجب تطبيق القيود الممكنة داخل DB مثل:

```text
NOT NULL
CHECK
UNIQUE
FOREIGN KEY
```

---

# 22. RLS من البداية

لا ننشئ الجداول ثم نؤجل RLS إلى النهاية.

يتم إنشاء:

```text
Table
↓
Constraints
↓
Indexes
↓
RLS
↓
Tests
```

في نفس المرحلة.

---

# 23. Database Test Gate

كل جدول حرج يجب أن يختبر:

```text
Valid insert
Invalid insert
Ownership
Unique constraints
Foreign keys
RLS
```

---

# 24. Phase 2 — Authentication

تنفيذ:

```text
Sign In
Sign Out
Session Validation
Protected Application Layout
```

---

# 25. V1 Authentication

يمكن أن يبدأ بـ:

```text
Email Authentication
```

حسب مزود Auth النهائي.

---

# 26. Protected Routes

كل صفحات النظام المالية:

```text
Authenticated Only
```

---

# 27. No Root Authentication Loop

يجب ألا يطبق منطق حماية يؤدي إلى Redirect Loop.

Routes العامة مثل:

```text
login
auth callback
```

تبقى خارج حماية التطبيق الداخلية.

---

# 28. Auth User Context

ينشأ Helper موحد مثل:

```text
requireAuthenticatedUser()
```

ولا تعاد كتابة منطق قراءة المستخدم في كل Service.

---

# 29. Ownership Context

كل Command يستخدم:

```text
authenticatedUserId
```

من الجلسة.

وليس من Form Input.

---

# 30. Phase 3 — Domain Types

قبل Features المالية:

تنشأ جميع Enums / Union Types الرسمية.

مثل:

```text
FinancialCycleStatus
FinancialPlanStatus
TransactionType
TransactionStatus
ObligationStatus
GoalStatus
RecommendationStatus
SavingAllocationStatus
EmergencyFundStatus
```

---

# 31. No Magic Strings

ممنوع:

```text
if (status === "paid")
```

في مكان و:

```text
"PAID"
```

في مكان آخر.

يستخدم مصدر Types موحد.

---

# 32. Phase 4 — State Machine Engine

إنشاء:

```text
StateMachineEngine
```

قبل تنفيذ Commands التي تغير الحالات.

---

# 33. Transition Contract

شكل منطقي مثل:

```text
canTransition(
 entityType,
 currentState,
 event
)
```

ثم:

```text
transition(...)
```

---

# 34. Transition Responsibilities

يتحقق من:

```text
Current State
Allowed Event
Preconditions
Next State
Audit
```

---

# 35. State Transition Tests

كل Transition في `STATE_MACHINES.md` يحصل على Test.

---

# 36. Forbidden Transition Tests

ليست فقط الانتقالات المسموحة.

يجب اختبار الانتقالات الممنوعة صراحة.

---

# 37. Phase 5 — Financial Engine Core

هذه من أعلى مراحل الخطورة.

يبنى قبل Dashboard الحقيقي.

---

# 38. Financial Engine V1

يتضمن:

```text
calculateAccountBalance()
calculateCategoryActual()
calculateCategoryRemaining()
calculateCategoryUtilization()
calculateSafeToSpend()
calculateDailySafeLimit()
calculateExpectedDeficit()
calculateGoalProgress()
calculateEmergencyProgress()
calculateSavingRate()
```

---

# 39. Forecast Engine

يبنى Interface مستقل:

```text
ForecastEngine
```

لكن لا يتم اختراع Formula نهائية تخالف القرارات المعلقة.

---

# 40. Financial Health Engine

ينشأ:

```text
FinancialHealthEngine interface
```

لكن لا تطبق Formula نهائية حتى إغلاق القاعدة المعلقة الخاصة به.

---

# 41. Financial Engine Rule

لا يستورد:

```text
React
Next.js
Supabase Client
```

---

# 42. Financial Engine Inputs

يأخذ:

```text
Plain typed data
```

ويعيد:

```text
Plain deterministic result
```

---

# 43. Financial Engine Tests

يجب إكمال اختبارات:

```text
STS-001
STS-002
STS-003
Daily Safe
Category
Goal
Emergency
Money Precision
```

قبل الاعتماد.

---

# 44. Phase 6 — Accounts Vertical Slice

أول Slice تشغيلية بسيطة.

تشمل:

```text
Create Account
List Accounts
Account Details
Deactivate Account
Opening Balance
```

---

# 45. Account Opening Balance

يجب تنفيذ القرار النهائي من Database Schema / Domain بصورة موثقة.

لا يسمح بمجرد:

```text
balance = 8200
```

ثم تحديثه يدويًا مستقبلًا.

---

# 46. Accounts UI

تنفيذ:

```text
WF-002
WF-100
WF-101
WF-102
```

وفق Final UI Spec.

---

# 47. Phase 7 — Financial Cycle Slice

تنفيذ:

```text
Create Financial Cycle
Activate Financial Cycle
Get Current Cycle
```

---

# 48. Cycle Commands

حسب API:

```text
API-C-001
API-C-002
```

---

# 49. Cycle States

يطبق:

```text
DRAFT
→ ACTIVE
```

مع رفض أي Transition غير مصرح.

---

# 50. One Active Cycle

يختبر في:

```text
Application
+
Database
```

---

# 51. Phase 8 — Expected Income

تنفيذ:

```text
Create expected income
Edit before relevant locking
List expected incomes
Primary salary source
```

---

# 52. Expected vs Actual

لا يخلط:

```text
ExpectedIncome
```

مع:

```text
POSTED INCOME
```

---

# 53. Phase 9 — Budget Categories

تنفيذ:

```text
Create Category
List
Edit metadata
Deactivate
```

---

# 54. Default Categories

يمكن إنشاء Seed أولي لبنود شائعة مثل:

```text
غذاء
وقود
اتصالات
مواصلات
مطاعم
احتياجات منزلية
مصروف شخصي
```

لكن يسمح للمستخدم بتخصيصها.

---

# 55. Phase 10 — Financial Plan

تنفيذ:

```text
Create Plan Draft
Create Plan Version
Budget Allocations
Approve Plan
Revise Plan
Approve Revision
```

---

# 56. Plan API

يشمل:

```text
API-Q-002
API-C-003
API-C-004
API-C-005
```

---

# 57. Immutable Versions

لا يتم:

```text
UPDATE old approved version
```

عند التعديل.

بل:

```text
New Version
```

---

# 58. Salary Distribution

التوزيع المنطقي:

```text
Obligations
Essentials
Savings
Emergency
Goals
Flexible
```

---

# 59. Plan Draft UI

تنفيذ:

```text
WF-006
WF-020
WF-022
WF-023
```

---

# 60. Phase 11 — Income Vertical Slice

تنفيذ:

```text
Record Income
Expected vs Actual
Partial Income
Income Surplus
```

---

# 61. API

```text
API-C-010
```

---

# 62. Income Transaction

الحالة:

```text
PENDING
→ POSTED
```

---

# 63. Lower Income

إذا:

```text
Actual < Expected
```

تحدث إعادة الحساب حسب Business Rules.

---

# 64. Higher Income

إذا:

```text
Actual > Expected
```

يظهر:

```text
Surplus
```

ولا يضاف تلقائيًا إلى Flexible Budget.

---

# 65. Income Tests

قبل اعتماد Slice:

```text
Expected = Actual
Actual < Expected
Actual > Expected
Partial
Duplicate
Rollback
```

---

# 66. Phase 12 — Expense Vertical Slice

هذه أهم Slice يومية في النظام.

---

# 67. Expense Scope

تنفيذ:

```text
Record Expense
Expense Validation
Category Impact
Safe To Spend Recalculation
Daily Safe Recalculation
Forecast Recalculation
Deficit Evaluation
Recommendation Trigger
```

---

# 68. API

```text
API-C-011
```

---

# 69. UI

تنفيذ:

```text
WF-011
WF-012
VP-003
VP-004
VP-005
VP-006
```

---

# 70. Expense Save Flow

```text
Submit
↓
Disable Button
↓
Generate/Use Idempotency Key
↓
Server Command
↓
Atomic Transaction
↓
Recalculate
↓
Return Financial Impact
↓
Success State
```

---

# 71. Expense Success UI

يعرض:

```text
Amount
Previous Safe To Spend
Current Safe To Spend
Deficit if created
```

ولا يكتفى بـToast.

---

# 72. Expense Quality Gate

لا تعتمد Slice حتى اجتياز:

```text
EXP-API-001
through
EXP-API-008
```

وE2E الكامل.

---

# 73. Phase 13 — Transaction History

تنفيذ:

```text
Transaction List
Transaction Details
Filters
Search
Pagination
```

---

# 74. API

```text
API-Q-010
API-Q-011
```

---

# 75. Mobile / Desktop

Desktop:

```text
Table
```

Mobile:

```text
Compact List
```

---

# 76. Phase 14 — Reversal

تنفيذ:

```text
Reverse Posted Transaction
```

حسب:

```text
API-C-014
```

---

# 77. No Delete

لا يوجد:

```text
Delete Transaction
```

للـPOSTED.

---

# 78. Reversal Audit

يجب تسجيل:

```text
reason
original_transaction_id
reversal effect
state transition
timestamp
```

---

# 79. Phase 15 — Transfer

تنفيذ:

```text
Transfer Between Accounts
```

---

# 80. API

```text
API-C-012
```

---

# 81. Transfer Ledger

ينفذ:

```text
Transfer Header
+
OUT Entry
+
IN Entry
```

ضمن Transaction واحدة.

---

# 82. Transfer Invariant

يجب دائمًا:

```text
Total User Liquidity Before
=
Total User Liquidity After
```

---

# 83. Phase 16 — Refund

تنفيذ:

```text
Refund
```

---

# 84. API

```text
API-C-013
```

---

# 85. Refund Validation

لا يسمح:

```text
Refund > refundable amount
```

وفق القرار النهائي في Domain.

---

# 86. Phase 17 — Obligations

تنفيذ كامل:

```text
Create Template
Create Occurrence
Reserve
List
Pay
Recurring Next Occurrence
DUE
OVERDUE
CANCELLED
```

---

# 87. APIs

```text
API-Q-020
API-C-020
API-C-021
```

---

# 88. Obligation Scheduler

تنفيذ Job لـ:

```text
UPCOMING
→ DUE
→ OVERDUE
```

---

# 89. Reservation Logic

هذه من العمليات الحرجة.

يجب اختبار:

```text
Reserve
Pay
Release
No Double Counting
```

---

# 90. Pay Obligation Transaction

العملية كاملة Atomic.

---

# 91. Recurrence

بعد السداد:

```text
Template
↓
Next Occurrence
```

إذا كان متكررًا.

---

# 92. Phase 18 — Savings

تنفيذ:

```text
Saving Allocation
Saving Summary
Saving Transfer
```

---

# 93. API

```text
API-Q-030
API-C-030
```

---

# 94. Saving Distinctions

يجب دائمًا التفريق بين:

```text
Planned
Allocated
Transferred
```

---

# 95. Savings Source of Truth

Actual Saving يعتمد على:

```text
POSTED SAVING_TRANSFER
```

---

# 96. Phase 19 — Emergency Fund

تنفيذ:

```text
Create / Configure Fund
Contribution
Withdrawal
Progress
Status
Rebuild Analysis
```

---

# 97. APIs

```text
API-Q-040
API-C-040
API-C-041
```

---

# 98. Withdrawal Requirement

لا يسمح بسحب بدون:

```text
reason
```

---

# 99. Emergency Status

تنفيذ:

```text
NOT_CONFIGURED
BUILDING
FUNDED
DEPLETED
```

---

# 100. Emergency Months Coverage

لا تنفذ Formula نهائية حتى اعتماد القاعدة المعلقة.

---

# 101. Phase 20 — Goals

تنفيذ:

```text
Create
Analyze
Activate
Contribute
Pause
Resume
Cancel
Achieve
```

---

# 102. APIs

```text
API-Q-050
API-Q-051
API-C-050
API-C-051
API-C-052
API-C-053
API-C-054
API-C-055
```

---

# 103. Goal Calculation

تنفيذ:

```text
Remaining
Progress
Required Contribution
```

---

# 104. Goal Feasibility

يدعم:

```text
FINANCIALLY_UNREALISTIC
```

عندما تكون المساهمة المطلوبة أكبر من القدرة المالية.

---

# 105. Goal Achievement

عند:

```text
Current >= Target
```

يتم:

```text
→ ACHIEVED
```

---

# 106. Phase 21 — Dashboard Read Model

بعد توفر البيانات التشغيلية الأساسية، يتم بناء Dashboard الحقيقي.

---

# 107. API

```text
API-Q-001
```

---

# 108. Dashboard Read Model

يعيد:

```text
Cycle
Liquidity
Safe To Spend
Daily Safe
Income
Budget
Saving
Forecast
Obligations
Recommendation
Emergency
Goals
```

---

# 109. Dashboard Rule

Frontend لا يعيد حساب هذه الأرقام.

---

# 110. Dashboard UI

تنفيذ:

```text
WF-010
VP-001
VP-002
FINAL_UI_SPEC
```

---

# 111. Dashboard Desktop

الترتيب:

```text
Hero
KPI
Forecast + Advisor
Obligations
Saving / Emergency / Goals
```

---

# 112. Dashboard Mobile

الترتيب مستقل حسب Final UI Spec.

---

# 113. Phase 22 — Recommendation Rule Engine

قبل AI.

---

# 114. Recommendation Rules V1

على الأقل:

```text
DEFICIT_RISK
OBLIGATION_OVERDUE
OBLIGATION_UPCOMING
SAFE_TO_SPEND_ZERO
GOAL_UNREALISTIC
SURPLUS_AVAILABLE
OVER_BUDGET
```

---

# 115. AT_RISK

لا تنفذ Formula نهائية قبل إغلاق:

```text
PENDING-BR-003
```

---

# 116. Recommendation Output

كل Recommendation يجب أن تحتوي:

```text
reason_code
reason_data
type
priority
status
```

---

# 117. Recommendation Deduplication

لا ينشأ نفس Warning كل مرة ينفذ فيها Dashboard Query.

---

# 118. Recommendation Lifecycle

يطبق:

```text
NEW
VIEWED
ACCEPTED
DISMISSED
EXPIRED
RESOLVED
```

---

# 119. Phase 23 — Advisor UI

تنفيذ:

```text
Advisor Feed
Recommendation Details
Why this recommendation
Accept
Dismiss
```

---

# 120. UI References

```text
WF-080
WF-081
VP-080
VP-081
VP-082
```

---

# 121. Phase 24 — AI Explanation Layer

لا يبدأ قبل Rule Engine.

---

# 122. AI Role

AI يستخدم لـ:

```text
Explain
Summarize
Personalize wording
Offer options
```

---

# 123. AI Does Not Calculate

لا يستخدم AI لإنشاء:

```text
Safe To Spend
Balance
Expected Deficit
Goal Balance
Budget Remaining
```

---

# 124. AI Input

يستخدم:

```text
Structured Facts
```

وليس Raw Database Dump.

---

# 125. AI Failure

إذا فشل AI:

```text
Rule-based recommendation remains usable
```

---

# 126. Phase 25 — Forecast Engine V1

بعد توفر Transactions تاريخية وتشغيلية كافية.

---

# 127. Forecast V1

ينفذ فقط المعادلة التي سيتم اعتمادها رسميًا في Business Rules.

إذا بقي:

```text
PENDING-BR-004
```

مفتوحًا، لا نخترع Model نهائيًا.

---

# 128. Phase 26 — Reports

تنفيذ:

```text
Current Cycle Review
Closed Cycle Report
Historical Comparison
```

---

# 129. Closed Cycle Source

يعتمد على:

```text
CycleSnapshot
```

لا إعادة حساب التاريخ من بيانات حالية.

---

# 130. Phase 27 — Cycle Closing

من أكثر العمليات حساسية.

---

# 131. Closing Flow

```text
ACTIVE
↓
CLOSING
↓
Validate
↓
Calculate Final Metrics
↓
Create Snapshot
↓
Create Category Snapshots
↓
Create Review
↓
Close Plan
↓
CLOSED
```

---

# 132. Atomicity

إذا فشل:

```text
Snapshot Creation
```

لا تصبح الدورة:

```text
CLOSED
```

---

# 133. Snapshot Immutability

بعد الإغلاق:

```text
No ordinary update
No ordinary delete
```

---

# 134. Phase 28 — Historical Analysis

تنفيذ:

```text
3 Closed Cycles
6 Closed Cycles
Trend
Average
```

وفق البيانات المتوفرة فقط.

---

# 135. No Fake History

إذا توجد دورتان فقط:

لا يعرض:

```text
6-month average
```

---

# 136. Phase 29 — Weekly Analysis Job

تنفيذ Background Job.

---

# 137. Weekly Job

يقوم:

```text
Recalculate
Analyze
Generate summary / recommendation
```

---

# 138. Job Idempotency

إعادة تشغيل Job لنفس الفترة لا تنشئ مخرجات مكررة.

---

# 139. Phase 30 — Onboarding

بعد استقرار Domain الأساسي.

---

# 140. Onboarding Screens

```text
WF-001
WF-002
WF-003
WF-004
WF-005
WF-006
```

---

# 141. لماذا لا نبني Onboarding أولًا؟

لأن Onboarding يعتمد على:

```text
Accounts
Expected Income
Obligations
Savings
Emergency
Goals
Financial Plan
```

ويجب أن تكون هذه العمليات حقيقية أولًا.

---

# 142. Phase 31 — Settings

تنفيذ:

```text
Profile
Currency
Timezone
Accounts
Budget Categories
Recurring Obligations
```

---

# 143. Currency V1

واجهة النظام:

```text
SAR
```

مع بقاء البنية Future-ready.

---

# 144. Timezone

القيمة الافتراضية:

```text
Asia/Riyadh
```

لكن مصدر التاريخ التشغيلي يجب أن يحترم إعداد المستخدم.

---

# 145. Phase 32 — Mobile Hardening

بعد اكتمال Features الأساسية.

لا يتم مجرد تصغير Desktop.

---

# 146. Mobile Review

كل شاشة تراجع عند:

```text
390 × 844
360 × 800
```

---

# 147. Mobile Checklist

```text
No Desktop Sidebar
No clipped content
No horizontal table
Touch targets >= 44
Bottom navigation correct
Forms comfortable
Keyboard safe
Dialogs converted appropriately
```

---

# 148. Phase 33 — Desktop Hardening

تراجع الشاشات عند:

```text
1440 × 900
1366 × 768
```

---

# 149. Desktop Checklist

```text
Sidebar correct
No content overflow
Tables readable
Dialogs centered
Responsive grid
No excessive card density
```

---

# 150. Phase 34 — Tablet

تراجع:

```text
768 × 1024
```

ولا تعامل بالضرورة كDesktop أو Mobile بصورة عمياء.

---

# 151. Phase 35 — RTL Audit

مراجعة كاملة لـ:

```text
Navigation
Tables
Forms
Dialogs
Chevrons
Back buttons
Pagination
Date pickers
Numbers
Currency
```

---

# 152. Phase 36 — Accessibility

اختبار:

```text
Keyboard
Focus
Labels
Contrast
Screen reader
Touch targets
Error association
```

---

# 153. Phase 37 — Security Hardening

تطبيق `SECURITY.md` بالكامل.

---

# 154. Security Review

يشمل:

```text
Auth
RLS
IDOR
CSRF
XSS
CSP
Secrets
CORS
Rate limiting
Database functions
Logging
AI boundary
```

---

# 155. Phase 38 — Performance

قياس:

```text
Dashboard
Transactions
Obligations
Goals
Advisor
Reports
```

---

# 156. Pagination

لا يسمح بتحميل جميع العمليات التاريخية دفعة واحدة.

---

# 157. N+1

تراجع جميع Read Models لمنع:

```text
One query per row
```

---

# 158. Phase 39 — Full Regression

تشغيل:

```text
Unit
Integration
Database
API
Security
E2E
Responsive
Accessibility
```

---

# 159. Phase 40 — Full System Audit

مراجعة شاملة قبل Staging.

---

# 160. Audit Scope

فحص:

```text
Dead code
Duplicate code
Unused imports
Deprecated code
TODOs
Console logs
Temporary hacks
Unprotected routes
Missing tests
Broken types
Duplicated calculations
Direct DB writes
RLS gaps
```

---

# 161. Zero Dead Code Rule

قبل Production يجب إزالة:

```text
unused
obsolete
temporary
legacy
```

إذا لم يكن له استخدام معتمد.

---

# 162. No Patch Stack

إذا ظهر Bug:

```text
Find Root Cause
↓
Fix Source
↓
Remove obsolete workaround
↓
Regression Test
```

---

# 163. Phase 41 — Staging

نشر نسخة كاملة على:

```text
Staging
```

---

# 164. Staging Database

مستقلة عن Production.

---

# 165. Staging Tests

تشغيل:

```text
Migrations
Auth
RLS
Core E2E
Responsive
Security Smoke
```

---

# 166. Phase 42 — UAT

اختبار استخدام واقعي كامل.

---

# 167. UAT Scenario

```text
First Setup
↓
Salary
↓
Plan
↓
Expenses
↓
Obligation
↓
Savings
↓
Emergency
↓
Goal
↓
Advisor
↓
Cycle Closing
↓
Report
↓
Next Cycle
```

---

# 168. Phase 43 — Production Preparation

قبل Production:

```text
Environment
Secrets
Domain
HTTPS
Security Headers
Database Backup
Monitoring
Error Tracking
Migration Plan
Rollback / Fix-forward plan
```

---

# 169. Production Migration

تجرب Migration أولًا على:

```text
Staging
```

ثم Production.

---

# 170. Phase 44 — Production Release

الإطلاق الأول:

```text
V1.0.0
```

---

# 171. Production Smoke Test

بعد النشر مباشرة:

```text
Login
Dashboard
Accounts
Cycle
Budget
Transactions
Advisor
Goals
Reports
```

---

# 172. Monitoring After Launch

يراقب:

```text
Server errors
Client errors
Failed jobs
DB errors
Auth failures
Slow requests
```

---

# 173. Release Strategy

لا يتم بناء 40 Feature ثم نشرها مرة واحدة دون نقاط تحقق.

داخل Development نعتمد Milestones.

---

# 174. Milestone 1 — Foundation

يشمل:

```text
Repository
Database
Auth
RLS
State Machine
Financial Engine
```

---

# 175. Milestone 2 — Money Core

يشمل:

```text
Accounts
Cycle
Plan
Income
Expense
Transactions
Transfer
Refund
```

---

# 176. Milestone 3 — Financial Control

يشمل:

```text
Obligations
Savings
Emergency
Goals
Safe To Spend
Forecast base
```

---

# 177. Milestone 4 — Advisor

يشمل:

```text
Recommendations
Advisor UI
AI Explanation
```

---

# 178. Milestone 5 — History

يشمل:

```text
Cycle Closing
Snapshots
Reports
Historical comparison
```

---

# 179. Milestone 6 — Product Complete

يشمل:

```text
Onboarding
Settings
Mobile
Desktop
RTL
Accessibility
Security
Performance
```

---

# 180. Milestone 7 — Release

يشمل:

```text
Audit
Staging
UAT
Production
Monitoring
```

---

# 181. Feature Definition of Ready

لا يبدأ Feature حتى يتوفر:

```text
Requirement
Workflow
Business Rules
State
Data Model
API Contract
UI Spec
Test expectations
```

إذا كان أحدها مفقودًا، يعود إلى المرجع قبل الكود.

---

# 182. Feature Definition of Done

لا يعتبر Feature مكتملًا حتى:

```text
Domain
✓

Database
✓

API
✓

UI
✓

Validation
✓

Authorization
✓

Idempotency
✓

Atomicity
✓

Tests
✓

Desktop
✓

Mobile
✓

RTL
✓

Error States
✓

Audit
✓
```

---

# 183. Pull Request Gate

كل PR:

```text
Lint
Typecheck
Unit
Integration
Build
```

لازم تمر.

---

# 184. Financial PR Gate

إذا كان التغيير ماليًا:

يضاف:

```text
Financial Engine Tests
Database Tests
API Contract Tests
Regression Tests
```

---

# 185. Security PR Gate

إذا تغير:

```text
Auth
RLS
Financial write
Database function
Secrets
```

تتم Security Review.

---

# 186. Migration Gate

أي Migration:

```text
Forward test
Constraint test
RLS test
Existing data test
```

---

# 187. Bug Process

كل Bug يسجل:

```text
Reproduction
Root Cause
Affected Rule
Affected Layer
Fix
Regression Test
```

---

# 188. Financial Bug Priority

أي Bug يؤدي إلى:

```text
Wrong Balance
Wrong Safe To Spend
Duplicate Transaction
Lost Transaction
Wrong Snapshot
```

يعتبر:

```text
P0 / Critical
```

---

# 189. Technical Debt Rule

لا ننشئ Technical Debt مقصودًا بدون تسجيله.

---

# 190. Temporary Workaround

إذا اضطر المشروع إلى Workaround:

يجب تسجيل:

```text
Reason
Owner
Removal Condition
Related Issue
```

في `KNOWN_ISSUES.md`.

---

# 191. TODO Rule

لا تستخدم:

```text
TODO
```

غير موثق داخل الكود للإجراءات المالية الحرجة.

---

# 192. Pending Business Rules

قبل تنفيذ Feature يعتمد على:

```text
PENDING-BR-001
PENDING-BR-002
PENDING-BR-003
PENDING-BR-004
PENDING-BR-005
PENDING-BR-006
```

يجب إغلاق القرار أو إبقاء الوظيفة محدودة بالمحدد رسميًا.

---

# 193. لا اختراع قرارات

المطور لا يقرر من نفسه:

```text
Financial Health Score weights
Financial Buffer
AT_RISK threshold
Forecast formula
Goal priority allocation
Emergency target months
```

---

# 194. Change Control

إذا احتجنا تغيير Requirement:

```text
Update Source Document
↓
Update Downstream References
↓
Update Tests
↓
Implement
```

---

# 195. No Code-First Requirement Changes

ممنوع:

```text
نغير الكود الآن
ثم نحدث الوثائق لاحقًا
```

للتغييرات التي تغير منطق النظام.

---

# 196. Traceability

كل Feature مهم يجب أن نستطيع تتبعه:

```text
Requirement
↓
Workflow
↓
BR
↓
State
↓
Data
↓
API
↓
UI
↓
Test
↓
Code
```

---

# 197. Suggested Implementation Order Summary

الترتيب النهائي المختصر:

```text
1 Foundation
2 Database
3 Auth
4 Domain Types
5 State Machine
6 Financial Engine
7 Accounts
8 Cycle
9 Expected Income
10 Categories
11 Financial Plan
12 Income
13 Expense
14 Transaction History
15 Reversal
16 Transfer
17 Refund
18 Obligations
19 Savings
20 Emergency
21 Goals
22 Dashboard
23 Recommendation Rules
24 Advisor
25 AI Explanation
26 Forecast
27 Reports
28 Cycle Closing
29 Historical Analysis
30 Weekly Jobs
31 Onboarding
32 Settings
33 Mobile
34 Desktop
35 Tablet
36 RTL
37 Accessibility
38 Security
39 Performance
40 Regression
41 Full Audit
42 Staging
43 UAT
44 Production
```

---

# 198. قاعدة عدم القفز

لا نبدأ:

```text
AI Advisor
```

قبل:

```text
Financial Engine
+
Rule Engine
```

ولا نبدأ:

```text
Dashboard real data
```

قبل:

```text
Core financial slices
```

ولا نبدأ:

```text
Reports
```

قبل:

```text
Snapshots / Closing
```

ولا نبدأ:

```text
Production
```

قبل:

```text
Security + Tests + Audit
```

---

# 199. النتيجة النهائية

الهدف من خطة التنفيذ هو الوصول من:

```text
Approved Documentation
```

إلى:

```text
Production System
```

بهذا المسار:

```text
Define
↓
Implement
↓
Validate
↓
Test
↓
Secure
↓
Review
↓
Release
↓
Monitor
```

ولكل Feature:

```text
Business Truth
↓
Domain Logic
↓
Database Integrity
↓
Application Command
↓
API Contract
↓
User Experience
↓
Automated Test
```

وبذلك لا تصبح المنصة مجرد واجهة جميلة فوق منطق مالي هش، بل نظامًا ماليًا شخصيًا يمكن الوثوق بنتائجه.
