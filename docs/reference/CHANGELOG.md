# CHANGELOG.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

## Master Project Change Log

---

# 1. الهدف

هذه الوثيقة هي السجل الرسمي لجميع التغييرات المهمة في المشروع.

تستخدم لتوثيق:

* التغييرات الوظيفية.
* التغييرات المالية.
* التغييرات المعمارية.
* تغييرات قاعدة البيانات.
* تغييرات API.
* تغييرات الواجهة.
* تغييرات الأمن.
* تغييرات الاختبارات.
* إصلاحات الأخطاء.
* إزالة الأكواد القديمة.
* القرارات التي تغير أحد المراجع المعتمدة.

---

# 2. لماذا نحتاج Changelog؟

لمنع هذا السيناريو:

```text
النظام كان يعمل بطريقة
↓
تم تغيير شيء
↓
لا نعرف ماذا تغير
↓
لا نعرف لماذا
↓
لا نعرف أي قواعد تأثرت
```

الصحيح:

```text
Change
↓
Reason
↓
Affected References
↓
Implementation
↓
Tests
↓
Recorded
```

---

# 3. قاعدة أساسية

أي تغيير يؤثر على:

```text
Business Logic
Financial Calculation
State
Database
API Contract
Security
User Workflow
Historical Integrity
```

يجب أن يسجل هنا.

---

# 4. ما لا يحتاج Changelog؟

لا يلزم تسجيل كل تعديل تجميلي صغير مثل:

```text
تصحيح مسافة داخل تعليق
تنسيق Markdown
إصلاح typo داخلي بلا أثر
```

إلا إذا كان جزءًا من Release أو Audit أكبر.

---

# 5. مصادر الحقيقة

`CHANGELOG.md` لا يحل محل الوثائق الأصلية.

مثال:

إذا تغيرت قاعدة مالية:

```text
BUSINESS_RULES.md
```

هي مصدر الحقيقة.

أما:

```text
CHANGELOG.md
```

فيسجل أن القاعدة تغيرت ولماذا.

---

# 6. قاعدة عدم التعديل الصامت

ممنوع تغيير Behavior معتمد داخل الكود فقط.

المسار الصحيح:

```text
Decision
↓
Update Source Document
↓
Update Downstream Documents
↓
Update Tests
↓
Implement
↓
Record in CHANGELOG
```

---

# 7. Versioning

يعتمد المشروع:

```text
Semantic Versioning
```

بالشكل:

```text
MAJOR.MINOR.PATCH
```

مثال:

```text
1.0.0
1.1.0
1.1.1
2.0.0
```

---

# 8. MAJOR

تستخدم عند تغيير غير متوافق جوهريًا.

مثل:

* تغيير أساسي في نموذج الحسابات.
* تغيير مصدر الحقيقة المالي.
* تغيير دورة النظام بصورة غير متوافقة.
* إعادة هيكلة كبرى تؤثر على API عامة مستقرة.
* Migration غير متوافقة معماريًا.

مثال:

```text
1.x.x
→
2.0.0
```

---

# 9. MINOR

تستخدم لإضافة Feature متوافقة.

مثل:

```text
إضافة المستشار المالي
إضافة تقرير جديد
إضافة Goal Workflow
إضافة دعم جديد داخل V1
```

مثال:

```text
1.2.0
→
1.3.0
```

---

# 10. PATCH

تستخدم لإصلاح Bug أو تحسين متوافق.

مثل:

```text
إصلاح Safe To Spend calculation bug
إصلاح duplicated transaction prevention
إصلاح UI clipping
```

مثال:

```text
1.3.0
→
1.3.1
```

---

# 11. ما قبل الإصدار الأول

أثناء Development يمكن استخدام:

```text
0.x.x
```

مثل:

```text
0.1.0
Foundation
```

```text
0.2.0
Money Core
```

حتى الوصول إلى:

```text
1.0.0
```

---

# 12. Release States

يمكن استخدام:

```text
Draft
Development
Staging
Release Candidate
Production
```

---

# 13. Release Candidate

صيغة:

```text
1.0.0-rc.1
1.0.0-rc.2
```

قبل Production عند الحاجة.

---

# 14. Changelog Format

كل إصدار يسجل بهذا الشكل:

```text
## [Version] — YYYY-MM-DD

### Added
### Changed
### Fixed
### Security
### Database
### Removed
### Deprecated
### Known Issues
```

ولا يلزم استخدام كل قسم إذا لم يوجد شيء فيه.

---

# 15. Added

للFeatures الجديدة.

مثال:

```text
### Added

- إضافة تسجيل المصروف.
- إضافة حساب Safe To Spend.
- إضافة دعم Idempotency.
```

---

# 16. Changed

للسلوك الموجود الذي تغير.

مثال:

```text
### Changed

- تعديل ترتيب توزيع الراتب ليعطي الالتزامات أولوية قبل الادخار.
```

---

# 17. Fixed

للأخطاء التي أصلحت.

مثال:

```text
### Fixed

- إصلاح تكرار المصروف عند إعادة إرسال Request بعد Timeout.
```

---

# 18. Security

للتغييرات الأمنية المهمة.

مثال:

```text
### Security

- إضافة RLS إلى transactions.
- منع Client من إرسال user_id كمصدر موثوق.
```

---

# 19. Database

للتغييرات البنيوية في قاعدة البيانات.

مثال:

```text
### Database

- إضافة unique index لمنع وجود أكثر من دورة ACTIVE لكل مستخدم.
```

---

# 20. Removed

للأشياء المحذوفة نهائيًا.

مثال:

```text
### Removed

- إزالة helper قديم كان يحسب الرصيد من الواجهة.
```

---

# 21. Deprecated

لشيء ما زال موجودًا مؤقتًا لكنه مقرر إزالته.

مثال:

```text
### Deprecated

- LegacyDashboardQuery سيزال بعد تحويل جميع الصفحات إلى DashboardReadModel.
```

---

# 22. Known Issues

يذكر فقط مختصرًا.

التفاصيل الكاملة توضع في:

```text
KNOWN_ISSUES.md
```

---

# 23. Change ID

لكل تغيير جوهري يمكن إعطاء معرف:

```text
CHG-XXXX
```

مثال:

```text
CHG-0001
CHG-0002
```

---

# 24. قاعدة Change ID

لا يعاد استخدام معرف Change حذف سابقًا.

---

# 25. سجل التغيير التفصيلي

للتغييرات المهمة يستخدم:

```text
Change ID:
Version:
Date:
Type:
Status:
Reason:
Affected References:
Affected Features:
Database Impact:
API Impact:
Security Impact:
Migration Required:
Tests Added/Updated:
Backward Compatibility:
Rollback / Fix-forward:
Notes:
```

---

# 26. Change Types

الأنواع:

```text
FEATURE
BUG_FIX
BUSINESS_RULE
ARCHITECTURE
DATABASE
API
SECURITY
UX
PERFORMANCE
REFACTOR
REMOVAL
DOCUMENTATION
```

---

# 27. Change Status

```text
PROPOSED
APPROVED
IMPLEMENTED
VERIFIED
RELEASED
REJECTED
```

---

# 28. Proposed

يعني:

التغيير مطروح فقط.

ولا يجوز اعتباره مصدر حقيقة.

---

# 29. Approved

يعني:

تم اعتماد القرار ويمكن تحديث المراجع وتنفيذه.

---

# 30. Implemented

يعني:

تم تطبيقه في الكود.

ولا يعني أنه جاهز للإصدار بعد.

---

# 31. Verified

يعني:

اجتاز الاختبارات المطلوبة.

---

# 32. Released

يعني:

وصل إلى البيئة المستهدفة رسميًا.

---

# 33. Rejected

يحتفظ بالسجل إذا كان القرار مهمًا.

حتى نعرف أن الاقتراح تمت مراجعته ورفضه.

---

# 34. Affected References

أي تغيير يجب أن يحدد المراجع ذات الصلة.

مثل:

```text
SYSTEM_MASTER.md
BUSINESS_RULES.md
STATE_MACHINES.md
API_CONTRACTS.md
DATABASE_SCHEMA.md
TEST_PLAN.md
```

---

# 35. Business Rule Changes

إذا تغيرت:

```text
BR-XXX
```

يجب أن يسجل:

```text
Old Rule
New Rule
Reason
Affected Tests
```

---

# 36. مثال Business Rule Change

```text
CHG-0042

Type:
BUSINESS_RULE

Affected:
BR-081

Old:
AT_RISK threshold unspecified

New:
AT_RISK when defined formula is satisfied

Reason:
Formula formally approved

Tests:
BUD-RISK-001..008
```

---

# 37. State Machine Change

إذا أضيف State أو Transition:

يجب تسجيل:

```text
Entity
Old States
New States
Allowed Transitions
Forbidden Transitions
Migration Impact
Tests
```

---

# 38. Database Change

أي Schema Change يسجل:

```text
Migration ID
Tables
Columns
Constraints
Indexes
RLS
Data Migration
```

---

# 39. Migration Reference

مثال:

```text
Migration:
20260910_014_add_transaction_direction.sql
```

---

# 40. لا تعديل Migration قديمة

إذا كانت Migration مطبقة:

لا تغير.

ينشأ:

```text
New Migration
```

ويسجل التغيير.

---

# 41. API Change

إذا تغير Contract:

يسجل:

```text
API ID
Old Input/Output
New Input/Output
Compatibility
Frontend Impact
Tests
```

---

# 42. Breaking API Change

إذا كان التغيير غير متوافق:

يجب تحديده صراحة:

```text
BREAKING
```

---

# 43. Financial Calculation Change

هذه أعلى فئات التغيير حساسية.

إذا تغير:

```text
Safe To Spend
Daily Safe
Forecast
Goal calculation
Emergency calculation
Financial Health
```

يجب تسجيل:

* الصيغة السابقة.
* الصيغة الجديدة.
* السبب.
* تاريخ بدء التطبيق.
* هل يعاد حساب التاريخ؟
* Tests.
* أثر Snapshot.

---

# 44. Historical Recalculation

القاعدة الافتراضية:

```text
Closed Snapshot
≠
Recalculate silently
```

أي تغيير خوارزمية مستقبلية لا يعيد كتابة التاريخ المالي المغلق تلقائيًا.

---

# 45. Calculation Version

يمكن مستقبلًا حفظ:

```text
calculation_version
```

داخل Snapshots الحساسة إذا احتجنا مقارنة النتائج عبر خوارزميات مختلفة.

---

# 46. Forecast Version

نظرًا لأن Forecast قد يتطور:

يمكن استخدام:

```text
forecast_model_version
```

إذا أصبح ذلك ضروريًا.

---

# 47. Recommendation Rule Change

إذا تغير Trigger لتوصية:

يسجل:

```text
reason_code
old trigger
new trigger
priority change
deduplication impact
```

---

# 48. AI Prompt Changes

لا يلزم Version كامل لكل تغيير لغوي بسيط.

لكن إذا تغير Prompt بطريقة تؤثر على:

* نوع التوصية.
* التفسير.
* الخصوصية.
* البيانات المرسلة.

يجب تسجيله.

---

# 49. Security Change

أي تغيير في:

```text
Auth
RLS
Secrets
CSP
CORS
Cookies
Authorization
Service Role
Security Definer
Rate Limits
```

يسجل ضمن Security.

---

# 50. Security Fix Disclosure

داخل Changelog الداخلي يمكن تسجيل التفاصيل الفنية المناسبة.

لكن لا يتم نسخ Secret أو Credential أو بيانات حساسة داخل الملف.

---

# 51. UI Change

تغييرات UI المهمة تسجل إذا أثرت على:

* Navigation.
* Workflow.
* Primary Action.
* Financial interpretation.
* Desktop/Mobile behavior.
* Accessibility.

---

# 52. Cosmetic Change

التغييرات التجميلية البحتة يمكن تجميعها تحت:

```text
UI Polish
```

بدل إنشاء سجل منفصل لكل Pixel.

---

# 53. Mobile Change

إذا كان التغيير Mobile-only يذكر:

```text
Scope:
Mobile
```

ولا يفترض أنه يغير Desktop.

---

# 54. Desktop Change

نفس القاعدة:

```text
Scope:
Desktop
```

---

# 55. Shared Change

إذا أثر على كلاهما:

```text
Scope:
Shared
```

---

# 56. Bug Fix Requirements

أي Bug مالي يجب أن يسجل:

```text
Root Cause
Fix
Regression Test
Affected Data
```

---

# 57. لا تسجيل "تم الإصلاح" فقط

غير مقبول:

```text
Fixed expense bug.
```

للأخطاء المهمة.

الصحيح:

```text
Root cause:
Duplicate retry created a second posted transaction.

Fix:
Enforced user_id + idempotency_key uniqueness and returned original result.

Regression:
EXP-IDEM-004
```

---

# 58. Data Corruption Bug

إذا تسبب Bug في بيانات خاطئة:

يجب أن يسجل:

```text
Affected Versions
Affected Records
Detection Method
Correction Method
Verification
```

---

# 59. Correction Script

إذا استخدم Script لتصحيح بيانات:

يجب:

* حفظه ضمن مسار Migration أو Maintenance المناسب.
* مراجعته.
* اختباره.
* عدم تشغيله عشوائيًا من جهاز مطور.

---

# 60. Refactor

Refactor الذي لا يغير Behavior يسجل إذا كان كبيرًا.

مثال:

```text
Moved Safe To Spend calculation from three services into FinancialEngine.
```

---

# 61. Refactor Rule

يجب أن تكون النتيجة:

```text
Same Inputs
↓
Same Financial Outputs
```

إذا كان Refactor بلا تغيير أعمال.

---

# 62. Removal

قبل حذف Component أو Service كبير:

يتم التأكد من:

```text
No references
No active API use
No migration dependency
No tests requiring it
```

---

# 63. Dead Code Removal

يمكن تجميع إزالة Dead Code الناتجة من Full Audit تحت Change واحد.

---

# 64. Dependency Change

تحديث Dependency مهم يسجل إذا:

* Major version.
* Security fix.
* Framework change.
* Database client change.
* Auth change.

---

# 65. Framework Upgrade

مثال:

```text
Next.js 16
→
Next.js 17
```

يسجل كتغيير معماري/تقني مهم.

---

# 66. Release Entry

كل Release رسمي يجب أن يكون له Block مستقل.

---

# 67. Unreleased Section

أعلى الملف يوجد:

```text
## [Unreleased]
```

للتغييرات التي لم تصدر بعد.

---

# 68. Unreleased Rule

عند إصدار Version:

يتم نقل التغييرات من:

```text
Unreleased
```

إلى:

```text
[Version] — Date
```

---

# 69. Template

```text
## [Unreleased]

### Added

### Changed

### Fixed

### Security

### Database

### Removed

### Deprecated

### Known Issues
```

---

# 70. Release Template

```text
## [1.0.0] — YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Security
- ...

### Database
- ...

### Removed
- ...

### Known Issues
- ...
```

---

# 71. Change Detail Template

```text
### CHG-XXXX — عنوان التغيير

Version:
Date:
Type:
Status:
Scope:

Reason:

Affected References:

Affected Features:

Business Rules:

State Machines:

API:

Database:

Security:

Migration:

Tests:

Backward Compatibility:

Data Impact:

Fix-forward / Rollback:

Notes:
```

---

# 72. Initial Documentation Baseline

المشروع بدأ بإنشاء مجموعة مراجع قبل البرمجة.

يجب تسجيل ذلك كBaseline.

---

# 73. Version 0.1.0 — Documentation Foundation

```text
## [0.1.0] — 2026-09-02

### Added

- SYSTEM_MASTER.md
- WORKFLOWS.md
- BUSINESS_RULES.md
- STATE_MACHINES.md
- DATA_MODEL.md
- ARCHITECTURE.md
- UX_ARCHITECTURE.md
- DESIGN_SYSTEM.md
- WIREFRAMES.md
- VISUAL_PROTOTYPE.md
- FINAL_UI_SPEC.md
- API_CONTRACTS.md
- DATABASE_SCHEMA.md
- TEST_PLAN.md
- SECURITY.md
- IMPLEMENTATION_PLAN.md
- CHANGELOG.md
```

---

# 74. Documentation Baseline Meaning

الإصدار:

```text
0.1.0
```

لا يعني أن التطبيق البرمجي موجود.

بل يعني:

```text
Specification Baseline
```

تم تأسيسه.

---

# 75. Next Baseline

بعد إضافة:

```text
KNOWN_ISSUES.md
```

يصبح لدينا Baseline مرجعي كامل قبل التنفيذ.

---

# 76. Milestone Versions

المقترح:

```text
0.1.0
Documentation Baseline

0.2.0
Foundation

0.3.0
Money Core

0.4.0
Financial Control

0.5.0
Advisor

0.6.0
History + Reporting

0.7.0
Product Hardening

0.8.0
Staging

0.9.0
Release Candidate

1.0.0
Production V1
```

---

# 77. 0.2.0 — Foundation Scope

يتوقع أن يشمل:

```text
Repository
CI
Database Foundation
Authentication
RLS
Domain Types
State Machine
Financial Engine
```

---

# 78. 0.3.0 — Money Core

يشمل:

```text
Accounts
Financial Cycle
Expected Income
Plan
Income
Expense
Transaction History
Reversal
Transfer
Refund
```

---

# 79. 0.4.0 — Financial Control

يشمل:

```text
Obligations
Savings
Emergency Fund
Goals
Dashboard
```

---

# 80. 0.5.0 — Advisor

يشمل:

```text
Recommendation Engine
Advisor Feed
AI Explanation Layer
```

---

# 81. 0.6.0 — History

يشمل:

```text
Cycle Closing
Snapshots
Reports
Historical Comparison
Weekly Analysis
```

---

# 82. 0.7.0 — Product Hardening

يشمل:

```text
Onboarding
Settings
Mobile
Tablet
Desktop
RTL
Accessibility
Security Hardening
Performance
```

---

# 83. 0.8.0 — Staging

يشمل نسخة Staging متكاملة.

---

# 84. 0.9.0 — Release Candidate

نسخة المرشح للإنتاج.

---

# 85. 1.0.0 — Production

الإصدار الأول المستقر.

---

# 86. Release Notes vs Changelog

`CHANGELOG.md` تقني ومنهجي.

أما Release Notes الموجهة للمستخدم يمكن أن تكون أبسط.

---

# 87. Git Commits ليست Changelog

وجود Git History لا يلغي الحاجة إلى Changelog.

Git يخبر:

```text
ما الملفات التي تغيرت؟
```

Changelog يخبر:

```text
ماذا تغير في النظام ولماذا؟
```

---

# 88. Pull Request Reference

يمكن لكل Entry أن يحتوي:

```text
PR:
#123
```

عند توفر GitHub.

---

# 89. Issue Reference

يمكن إضافة:

```text
Issue:
ISSUE-0041
```

---

# 90. Known Issue Resolution

عند إصلاح Issue من `KNOWN_ISSUES.md`:

يسجل:

```text
Fixed:
ISSUE-XXXX
```

داخل Changelog.

---

# 91. Pending Decision Resolution

إذا تم حسم:

```text
PENDING-BR-XXX
```

يجب أن يظهر في Changelog.

---

# 92. مثال

```text
### CHG-0031 — اعتماد معادلة Financial Buffer

Type:
BUSINESS_RULE

Status:
APPROVED

Affected:
PENDING-BR-002
BR-062
FinancialEngine
API-Q-001
TEST_PLAN.md

Result:
Required Financial Buffer formula formally defined.
```

---

# 93. تاريخ التغيير

جميع التواريخ تستخدم:

```text
YYYY-MM-DD
```

داخل السجلات التقنية.

---

# 94. Timezone

عند الحاجة للتوقيت الكامل:

```text
ISO 8601
```

مع المنطقة الزمنية.

---

# 95. Author

يمكن مستقبلًا إضافة:

```text
Author
Reviewer
Approver
```

إذا أصبح المشروع متعدد المساهمين.

في V1 ليست إلزامية لأن المشروع لمستخدم/مالك واحد.

---

# 96. Security Sensitive Entries

ممنوع وضع:

```text
password
token
secret
private key
service role value
```

داخل Changelog.

---

# 97. Database Credentials

حتى لو تم تدويرها:

لا يتم تسجيل القيمة القديمة أو الجديدة.

فقط:

```text
Database credential rotated.
```

---

# 98. Release Blockers

إذا كان Release يحتوي Known Issue من نوع:

```text
P0
P1
```

لا يصبح Release جاهزًا.

---

# 99. Verification

قبل نقل Change إلى:

```text
VERIFIED
```

يجب أن تكون الاختبارات المرتبطة ناجحة.

---

# 100. Released

قبل وضع:

```text
RELEASED
```

يجب أن يكون التغيير موجودًا فعليًا في البيئة المقصودة.

---

# 101. Staging vs Production

يمكن توثيق:

```text
Released to Staging
```

بشكل منفصل عن:

```text
Released to Production
```

---

# 102. Rollback

للتغييرات غير المالية البسيطة يمكن Rollback تقليدي.

لكن للتغييرات المالية وقاعدة البيانات:

الأولوية:

```text
Fix Forward
```

خصوصًا بعد وجود بيانات جديدة.

---

# 103. Rollback Warning

لا يتم Rollback Migration بصورة قد تحذف بيانات Production بلا تحليل.

---

# 104. Change Impact Levels

يمكن تصنيف التغيير:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

# 105. CRITICAL Change

يشمل:

* Source of Truth.
* Financial calculation.
* Transaction posting.
* Idempotency.
* Snapshot integrity.
* Authentication/RLS.
* Migration قد تؤثر على بيانات مالية.

---

# 106. HIGH Change

يشمل:

* State Machines.
* Obligation reservation.
* Goal lifecycle.
* Cycle closing.
* Recommendation logic عالي الأولوية.

---

# 107. MEDIUM Change

يشمل:

* Workflow.
* API Query.
* UI behavior.
* Reports.

---

# 108. LOW Change

يشمل:

* Cosmetic UI.
* Internal refactor منخفض المخاطر.
* Documentation typo.

---

# 109. Critical Change Approval

أي Critical Change يجب أن يراجع مقابل:

```text
BUSINESS_RULES
STATE_MACHINES
DATABASE_SCHEMA
TEST_PLAN
SECURITY
```

قبل التطبيق.

---

# 110. Changelog Review During Audit

في Full System Audit يتم مقارنة:

```text
Changelog
vs
Actual Code
vs
Migrations
vs
Documentation
```

للكشف عن التغييرات التي لم توثق.

---

# 111. Undocumented Behavior

إذا وجد Behavior فعلي غير موثق:

لا يتم اعتماده تلقائيًا.

يتم:

```text
Investigate
↓
Determine Intended Behavior
↓
Update Source Reference أو Code
↓
Tests
↓
Changelog
```

---

# 112. No Legacy Accumulation

عند اعتماد طريقة جديدة وإزالة القديمة:

يسجل:

```text
Removed legacy implementation
```

ولا يترك الكودان يعملان معًا دون سبب.

---

# 113. Changelog لا يستخدم كقائمة مهام

المهام المستقبلية لا تكتب هنا كـFeature مكتملة.

توضع في:

```text
KNOWN_ISSUES.md
```

أو نظام Issues.

---

# 114. Planned Feature

لا يسجل تحت:

```text
Added
```

حتى يتم تنفيذه.

---

# 115. Documentation Changes

تعديل وثيقة جوهري يسجل.

مثال:

```text
Changed BUSINESS_RULES BR-081 definition.
```

---

# 116. Documentation Typo

لا يلزم سجل مستقل.

---

# 117. Definition of Done — Change

أي Change مهم لا يعتبر مكتملًا حتى:

```text
Decision documented
✓

Source reference updated
✓

Downstream references reviewed
✓

Code updated
✓

Tests updated
✓

Migration updated if needed
✓

Security reviewed if needed
✓

Changelog entry added
✓
```

---

# 118. Changelog Governance

القاعدة النهائية:

```text
No silent change.
```

كل تغيير جوهري يجب أن نستطيع الإجابة عنه:

```text
ماذا تغير؟
لماذا تغير؟
متى؟
أي إصدار؟
ما المراجع المتأثرة؟
ما الكود المتأثر؟
هل تغيرت قاعدة البيانات؟
هل تغير الأمن؟
كيف اختبرناه؟
هل أثر على بيانات سابقة؟
```

---

# 119. القالب الابتدائي للملف

```text
# CHANGELOG.md

## [Unreleased]

### Added

### Changed

### Fixed

### Security

### Database

### Removed

### Deprecated

### Known Issues


## [0.1.0] — 2026-09-02

### Added

- Documentation and specification baseline for the Personal Financial Advisor system.
```

---

# 120. النتيجة النهائية

`CHANGELOG.md` يجعل تطور النظام:

```text
Traceable
Auditable
Versioned
Explainable
```

ويمنع أن يتحول المشروع مع الوقت إلى مجموعة تعديلات لا يعرف أحد مصدرها أو سببها.

والقاعدة الحاكمة:

```text
Requirement Change
↓
Reference Update
↓
Implementation
↓
Verification
↓
Changelog
```

ولا يتم قبول تغيير جوهري خارج هذا المسار.

---

## [0.4.0] — 2026-09-02

### Added
- تنفيذ Phase 4 — State Machine Engine كمحرك Domain مركزي typed.
- إضافة انتقالات الدورة والخطة والالتزامات والأهداف والعمليات والتخصيصات والتوصيات.
- إضافة رفض صريح للانتقالات غير الموثقة.
- إضافة دعم شروط الانتقال وإخراج Audit-ready لكل انتقال ناجح.
- إضافة Analytical State Resolvers للحالات التي تستمد من البيانات بدل أحداث المستخدم.
- إضافة اختبارات للانتقالات المسموحة والممنوعة والحالات التحليلية.

### Changed
- إزالة محرك State Machine تجريبي قديم واختباره لمنع وجود مصدرين متعارضين لمنطق الحالات.

### Known Issues
- `AT_RISK` لا يملك Trigger رياضيًا نهائيًا حتى إغلاق `ISSUE-0003`.
- تطبيق Schema على Neon main ما زال مؤجلًا إلى أن يعمل مسار Branch الآمن في الموصل.
