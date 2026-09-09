# SECURITY.md

## نظام إدارة الميزانية الشخصية والمستشار المالي

## Security Architecture & Controls

---

# 1. الهدف

تحدد هذه الوثيقة المتطلبات الأمنية الملزمة للنظام.

الهدف هو حماية:

* الهوية.
* الحساب.
* البيانات المالية.
* العمليات المالية.
* التاريخ المالي.
* الجلسات.
* الأسرار.
* قاعدة البيانات.
* خدمات الذكاء الاصطناعي.
* النسخ الاحتياطية.
* سجلات النظام.

الأمن هنا ليس طبقة تضاف في نهاية المشروع.

بل جزء من:

```text
Architecture
+
API
+
Database
+
Application
+
Operations
```

من البداية.

---

# 2. طبيعة البيانات

جميع بيانات النظام تعتبر:

```text
PRIVATE
+
SENSITIVE FINANCIAL DATA
```

حتى لو كان الإصدار الأول لمستخدم واحد فقط.

وتشمل:

* الدخل.
* الراتب.
* الأرصدة.
* المصروفات.
* الحسابات.
* الالتزامات.
* الأهداف.
* الادخار.
* صندوق الطوارئ.
* التوصيات المالية.
* التاريخ المالي.

---

# 3. Security Principles

## SEC-RULE-001 — Zero Trust Between Layers

لا تعتبر أي بيانات قادمة من:

```text
Browser
Mobile Client
URL
Form
Local Storage
```

موثوقة تلقائيًا.

---

## SEC-RULE-002 — Server Is Authoritative

التحقق النهائي من:

* الهوية.
* الملكية.
* الصلاحية.
* Business Rules.
* State.
* المبالغ.
* المراجع.

يتم في:

```text
Server / Trusted Layer
```

---

## SEC-RULE-003 — Defense in Depth

لا تعتمد الحماية على آلية واحدة.

مثال:

```text
Authentication
+
Application Authorization
+
RLS
+
Database Constraints
```

---

## SEC-RULE-004 — Least Privilege

كل مستخدم أو Service أو Secret يحصل فقط على أقل صلاحية يحتاجها.

---

## SEC-RULE-005 — Financial History Is Protected

لا يسمح بمسح التاريخ المالي أو تعديله بطريقة غير موثقة.

---

## SEC-RULE-006 — Secure by Default

عند الشك:

```text
Deny
```

بدل:

```text
Allow
```

---

# 4. Threat Model

يجب حماية النظام من سيناريوهات مثل:

```text
سرقة الجلسة
تخمين المعرفات
IDOR
تزوير Request
Double Submission
Replay
SQL Injection
XSS
CSRF
Secret Leakage
Privilege Escalation
RLS Bypass
Account Takeover
Unauthorized Data Export
Malicious AI Output
Logging Sensitive Data
Database Misconfiguration
Backup Exposure
```

---

# 5. أصول النظام الحساسة

الأصول الأعلى حساسية:

```text
Authentication Session
Financial Transactions
Account Balances
Financial Plans
Cycle Snapshots
Emergency Data
Goal Data
Service Role Keys
Database Credentials
AI API Keys
Backup Data
```

---

# 6. Authentication

يجب استخدام مصادقة حقيقية.

المقترح:

```text
Supabase Auth
```

أو مقدم مصادقة موثوق مكافئ.

---

# 7. Authentication V1

الإصدار الأول يمكن أن يبدأ بـ:

```text
Email Authentication
```

مع تصميم يسمح مستقبلًا بـ:

```text
Passkeys
MFA
```

دون إعادة بناء نظام الهوية.

---

# 8. Password Handling

إذا كانت كلمات المرور مستخدمة:

لا يتم:

```text
تخزين كلمة المرور
تشفيرها يدويًا
Hash يدوي
```

داخل التطبيق.

إدارة Credentials تتم عبر مقدم المصادقة المعتمد.

---

# 9. Session Security

الجلسة يجب أن:

* تكون مرتبطة بالمستخدم المصادق.
* تنتهي عند انتهاء صلاحيتها.
* لا تحتوي بيانات مالية كاملة.
* لا تحتوي Service Role.
* لا تحتوي أسرار Server.

---

# 10. Session Expiration

عند انتهاء الجلسة:

```text
Request
↓
UNAUTHENTICATED
```

ولا يحاول التطبيق تنفيذ العملية المالية بشكل جزئي.

---

# 11. UI عند انتهاء الجلسة

يعرض:

```text
انتهت جلستك.

سجل الدخول مرة أخرى للوصول إلى بياناتك المالية.
```

ولا يترك معلومات مالية حساسة مكشوفة بلا حاجة.

---

# 12. Re-authentication

يمكن مستقبلًا طلب إعادة مصادقة للإجراءات فائقة الحساسية.

مثل:

```text
Export All Financial Data
Delete Account
Security Settings
```

ولا يلزم ذلك لكل مصروف اعتيادي.

---

# 13. Authorization

V1 يحتوي دورًا واحدًا:

```text
OWNER
```

لكن هذا لا يعني إلغاء Authorization.

كل Resource يجب أن يثبت أنه تابع للمستخدم الحالي.

---

# 14. Client user_id Is Untrusted

ممنوع اعتماد:

```text
request.user_id
```

كمصدر للهوية.

الصحيح:

```text
Authenticated Session
↓
Current User ID
```

---

# 15. Object Ownership

عند التعامل مع:

```text
account_id
cycle_id
goal_id
transaction_id
obligation_id
recommendation_id
```

يجب التحقق:

```text
resource.user_id
=
authenticated_user.id
```

---

# 16. IDOR Protection

لا يكفي أن يكون UUID صعب التخمين.

إذا حاول المستخدم الوصول إلى Resource لا يملكه:

يجب رفض الطلب.

---

# 17. Cross-User Read

السيناريو:

```text
User A
requests
User B Account ID
```

النتيجة:

```text
DENIED
```

---

# 18. Cross-User Write

أخطر من القراءة.

أي محاولة استخدام:

```text
account_id
goal_id
cycle_id
```

لشخص آخر داخل عملية مالية:

يجب أن تفشل قبل أي أثر مالي.

---

# 19. Row-Level Security

إذا تم استخدام Supabase:

```text
RLS
```

إلزامي على الجداول المالية.

---

# 20. RLS قاعدة عامة

لجداول الملكية المباشرة:

```text
auth.uid() = user_id
```

مفهوميًا.

---

# 21. RLS لا يحل محل Application Authorization

حتى مع RLS:

يجب على التطبيق التحقق من الملكية والحالة.

RLS:

```text
Last Database Defense
```

وليس:

```text
Only Defense
```

---

# 22. Tables Requiring Strict RLS

على الأقل:

```text
accounts
financial_cycles
expected_incomes
financial_plans
transactions
obligation_templates
obligation_occurrences
saving_allocations
emergency_funds
emergency_allocations
financial_goals
goal_allocations
recommendations
cycle_snapshots
cycle_reviews
state_transition_logs
```

والجداول التابعة تطبق ملكية Parent المناسبة.

---

# 23. Direct Client Writes

ممنوع السماح للFrontend بكتابة العمليات المالية الحساسة مباشرة إلى:

```text
transactions
```

بطريقة تتجاوز Application Layer.

---

# 24. Sensitive Write Path

الصحيح:

```text
Client Intent
↓
Authenticated Server Operation
↓
Validation
↓
Authorization
↓
Business Rules
↓
State Rules
↓
Atomic Database Transaction
```

---

# 25. Read Access

يمكن السماح لبعض القراءات المباشرة المقيدة بـRLS إذا ثبت أنها آمنة.

لكن Read Models المالية المعقدة يفضل أن تمر عبر Application Query موحد.

---

# 26. Service Role

`service_role`:

```text
SERVER ONLY
```

ممنوع أن يصل إلى:

* JavaScript Browser Bundle.
* Mobile Client.
* Public Environment Variable.
* Logs.
* Error Messages.

---

# 27. Environment Variables

تقسم إلى:

```text
Public Variables
Private Server Variables
```

---

# 28. Public Variables

فقط القيم المصممة للنشر إلى Client.

---

# 29. Private Variables

مثل:

```text
Database Admin Credentials
Service Role Key
AI API Key
Monitoring DSN private values
Webhook secrets
```

تظل Server-side.

---

# 30. Secret Management

لا تخزن الأسرار داخل:

```text
Git
Source Files
Markdown Docs
Client Code
Screenshots
Logs
```

---

# 31. .env

ملفات البيئة المحلية الحساسة:

```text
.env.local
```

يجب أن تكون ضمن:

```text
.gitignore
```

---

# 32. Secret Rotation

يجب أن يمكن تغيير أي Secret بدون إعادة بناء النظام معماريًا.

---

# 33. Secret Exposure Incident

إذا تسرب Secret:

الإجراء ليس فقط حذفه من Git.

بل:

```text
Revoke
↓
Rotate
↓
Audit Usage
↓
Check Logs
↓
Replace
```

---

# 34. HTTPS

Production يجب أن يستخدم:

```text
HTTPS ONLY
```

---

# 35. HTTP

أي HTTP غير مشفر يجب تحويله إلى HTTPS أو رفضه حسب بيئة النشر.

---

# 36. Security Headers

Production يجب أن يدعم Headers مناسبة مثل:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Strict-Transport-Security
```

حسب بيئة الاستضافة.

---

# 37. X-Frame Protection

يجب منع Clickjacking عبر:

```text
frame-ancestors
```

داخل CSP أو الآلية المناسبة.

---

# 38. Content Security Policy

يجب إنشاء CSP لا تسمح بمصادر Scripts عشوائية.

ويجب تجنب:

```text
unsafe-eval
```

و:

```text
unsafe-inline
```

قدر الإمكان.

---

# 39. XSS Protection

كل نص يدخل من المستخدم يعتبر:

```text
UNTRUSTED
```

مثل:

* وصف المصروف.
* سبب تعديل الخطة.
* سبب سحب الطوارئ.
* اسم الهدف.
* اسم الحساب.

---

# 40. React Rendering

يستخدم Escaping الطبيعي.

ويمنع استخدام:

```text
dangerouslySetInnerHTML
```

إلا لحاجة موثقة ومع Sanitization قوي.

---

# 41. AI Output Is Untrusted

مخرجات الذكاء الاصطناعي يجب التعامل معها أيضًا كبيانات غير موثوقة.

---

# 42. AI HTML

لا يعرض HTML مولد من AI مباشرة.

الأفضل:

```text
Plain Text
```

أو Markdown مقيد ومطهر إذا تم اعتماده لاحقًا.

---

# 43. SQL Injection

جميع Queries يجب أن تستخدم:

```text
Parameterized Queries
ORM Safe Parameters
Database Functions with parameters
```

ولا تستخدم String Concatenation لإنشاء SQL من إدخال المستخدم.

---

# 44. Dynamic Sorting

حتى:

```text
sort
order_by
```

يجب أن تستخدم Allowlist.

ولا تمرر Column Name اعتباطيًا إلى SQL.

---

# 45. Input Validation

كل API Write يمتلك Schema Validation.

---

# 46. Validation Boundary

Frontend:

```text
UX Validation
```

Server:

```text
Authoritative Validation
```

Database:

```text
Integrity Validation
```

---

# 47. Financial Amount Validation

كل مبلغ حساس:

```text
> 0
```

عندما تفرض Business Rule ذلك.

---

# 48. Maximum Amount

يجب تحديد حد تقني مناسب يمنع:

* Overflow.
* Abuse.
* Values خارج NUMERIC(18,2).

ولا يعني الحد التقني قاعدة مالية للمستخدم.

---

# 49. String Limits

يجب وضع Maximum Length للحقول النصية.

مثل:

```text
name
description
reason
```

حتى لا يسمح Payload غير محدود.

---

# 50. JSON Validation

حقول:

```text
reason_data
snapshot_data
```

يجب التحقق من شكلها المتوقع حيثما أمكن.

---

# 51. State Tampering

ممنوع Endpoint مثل:

```text
updateStatus(entity, "PAID")
```

من Client.

---

# 52. Command-Based State Changes

الصحيح:

```text
PayObligation
ApprovePlan
PauseGoal
CloseCycle
```

والخادم يحدد الحالة.

---

# 53. State Transition Validation

كل انتقال يمر عبر:

```text
StateTransitionService
```

---

# 54. Closed Cycle Protection

إذا كانت الدورة:

```text
CLOSED
```

يجب رفض الكتابات الاعتيادية إليها.

---

# 55. CLOSING Protection

أثناء:

```text
CLOSING
```

يجب منع العمليات المالية العادية الجديدة.

---

# 56. Plan Version Security

الخطة المعتمدة لا تعدل مباشرة.

أي تعديل:

```text
New Version
```

مع Reason وAudit.

---

# 57. Financial Transaction Immutability

بعد:

```text
POSTED
```

لا يتم تعديل العملية بطريقة تغير أثرها المالي بصمت.

---

# 58. Reversal

التصحيح يكون:

```text
Reversal
```

موثقًا.

---

# 59. DELETE Protection

لا يسمح Delete الاعتيادي لـ:

```text
POSTED Transactions
Cycle Snapshots
State Transition Logs
Approved Historical Plan Versions
```

---

# 60. Snapshot Protection

`CycleSnapshot`:

```text
Immutable
```

بعد الإغلاق في المسار الاعتيادي.

---

# 61. Database Constraints

الحماية ليست في Application فقط.

يجب وجود:

```text
CHECK
UNIQUE
FOREIGN KEY
NOT NULL
PARTIAL UNIQUE INDEX
```

حيثما يلزم.

---

# 62. Idempotency

كل Financial Write حساس يدعم:

```text
idempotency_key
```

---

# 63. Replay Protection

إذا أعيد نفس الطلب بنفس المفتاح:

```text
Same Result
```

وليس عملية جديدة.

---

# 64. Idempotency Ownership

المفتاح يكون مقيدًا بـ:

```text
user_id
+
idempotency_key
```

---

# 65. Concurrent Replay

إذا وصل Request نفسه في الوقت ذاته مرتين:

يجب أن تنفذ عملية واحدة فقط.

---

# 66. Atomicity

العمليات المالية المركبة:

```text
COMMIT
or
ROLLBACK
```

ولا توجد Partial Success مالية.

---

# 67. Row Locks

عمليات السباق الحرجة يمكن أن تستخدم:

```text
SELECT ... FOR UPDATE
```

مثل:

* دفع التزام.
* إغلاق دورة.
* اعتماد Revision.
* Goal completion.
* Idempotency lock.

---

# 68. Optimistic Concurrency

Plan Revision يستخدم:

```text
expected_version_number
```

---

# 69. Conflict

إذا تغيرت النسخة:

```text
CONFLICT
```

ولا يكتب العميل فوق التغيير الجديد.

---

# 70. CSRF

إذا كانت المصادقة تعتمد Cookies:

يجب تطبيق حماية CSRF المناسبة للFramework.

مثل:

* SameSite Cookies.
* CSRF Token عند الحاجة.
* Origin validation.
* Server Action protections.

حسب نموذج الجلسة المستخدم.

---

# 71. SameSite Cookies

Cookies الحساسة يجب أن تستخدم إعدادات آمنة مناسبة مثل:

```text
HttpOnly
Secure
SameSite
```

حسب أسلوب المصادقة.

---

# 72. Local Storage

لا يخزن فيه:

```text
Service Role
Database Secret
Financial Dataset كامل
Sensitive Tokens
```

---

# 73. Financial Form Drafts

إذا تم حفظ Draft محليًا مستقبلًا، يجب تقييم حساسيته بشكل مستقل.

ولا يطبق ذلك تلقائيًا.

---

# 74. Logging

يجب فصل:

```text
Business Audit
```

عن:

```text
Technical Logging
```

---

# 75. Technical Logs

يجوز أن تحتوي:

```text
request_id
error_code
endpoint
duration
technical context
```

لكن ليس بيانات مالية كاملة بلا ضرورة.

---

# 76. Log Redaction

يجب إخفاء:

```text
Authorization
Cookie
Access Token
Refresh Token
API Key
Password
Service Role
```

دائمًا.

---

# 77. Financial Log Redaction

يفضل عدم تسجيل:

* الراتب الكامل.
* أرصدة الحسابات.
* تفاصيل الأهداف.
* أوصاف خاصة.

إلا عند حاجة تشخيصية مبررة وبأقل قدر.

---

# 78. Error Responses

ممنوع إعادة:

```text
SQL Error
Database Host
Stack Trace
Secret
Table Internal Detail
```

إلى Client.

---

# 79. Error IDs

يرسل للمستخدم:

```text
request_id
```

لتتبع المشكلة بدون كشف التفاصيل التقنية.

---

# 80. Monitoring

Monitoring يجب أن يلتقط:

* Server errors.
* Client errors.
* Background job failures.
* Performance degradation.
* Authentication anomalies عند الإمكان.

---

# 81. Monitoring Privacy

يجب ضبط Monitoring بحيث لا يلتقط:

```text
Sensitive Form Values
Auth Tokens
Financial Screenshots
```

دون حاجة.

---

# 82. Session Replay

إذا استخدمت خدمة تدعم Session Replay:

يفضل تعطيله للبيانات المالية أو استخدام Masking صارم.

---

# 83. AI Security Boundary

الذكاء الاصطناعي لا يحصل على:

```text
Database Credentials
Service Role
Raw Database Access
```

---

# 84. AI Input Minimization

يرسل فقط الحد الأدنى المطلوب.

مثال:

```text
Category: Restaurants
Budget: 500
Spent: 470
Elapsed: 45%
```

بدل كامل التاريخ المالي.

---

# 85. AI Data Access

AI لا ينفذ Queries مالية مباشرة.

الصحيح:

```text
Trusted Financial Engine
↓
Structured Facts
↓
AI
```

---

# 86. Prompt Injection

أي نص مصدره المستخدم أو بيانات خارجية لا يعتبر تعليمات موثوقة للـAI.

---

# 87. AI Tool Authority

إذا تمت إضافة Tools للمستشار مستقبلًا:

لا يمنح Tool قادر على تعديل الأموال مباشرة دون:

```text
User Confirmation
+
Server Validation
```

---

# 88. AI Recommendation Boundary

AI يمكنه:

* الشرح.
* إعادة الصياغة.
* تقديم خيارات.

ولا يمكنه تحديد رسميًا:

```text
balance
safe_to_spend
transaction status
goal balance
```

---

# 89. AI Failure

فشل AI:

```text
Must Not Fail Financial Operation
```

---

# 90. AI Output Storage

إذا حفظ النص المولد:

يجب ربطه بـ:

```text
reason_code
reason_data
```

حتى يبقى السبب الحقيقي قابلًا للمراجعة.

---

# 91. File Upload Security

Uploads ليست ضمن V1 الأساسي حاليًا.

إذا أضيفت مستقبلًا:

يجب تحديد:

* Allowed file types.
* Maximum size.
* Malware scanning عند الحاجة.
* Private storage.
* Signed access.
* Ownership validation.

---

# 92. Receipt Images

إذا أضيفت لاحقًا:

تكون:

```text
PRIVATE BUCKET
```

وليست Public URL دائم.

---

# 93. Storage Paths

لا يستخدم اسم المستخدم أو البريد كمسار أمني وحيد.

يستخدم معرف داخلي ثابت.

---

# 94. Export Security

تصدير كامل البيانات المالية يعتبر إجراء حساسًا.

يجب:

* Authentication.
* Owner validation.
* Audit.
* Short-lived export.
* No public link.

---

# 95. Backup Security

Backup يحتوي بيانات حساسة مثل Production.

لذلك يجب حمايته بنفس المستوى تقريبًا.

---

# 96. Backup Access

لا يعطى لكل مطور تلقائيًا.

---

# 97. Backup Encryption

يعتمد على مزود قاعدة البيانات والبنية المختارة.

يجب التأكد من حماية البيانات:

```text
At Rest
+
In Transit
```

---

# 98. Restore

عمليات الاستعادة تنفذ فقط في بيئة موثوقة بواسطة صلاحيات إدارية.

---

# 99. Development Data

ممنوع استخدام بيانات Production الحقيقية كSeed للتطوير.

---

# 100. Test Data

يجب استخدام:

```text
Synthetic Financial Data
```

في الاختبارات.

---

# 101. Staging

لا يجب أن يحصل Staging تلقائيًا على نسخة كاملة من بيانات Production.

---

# 102. Environment Isolation

يجب فصل:

```text
Development
Staging
Production
```

على مستوى:

* Database.
* Secrets.
* Environment Variables.
* Auth configuration.
* Monitoring.
* Deployment.

---

# 103. Production Access

الوصول الإداري لـProduction يكون محدودًا.

---

# 104. Manual Production SQL

يجب تجنبه قدر الإمكان.

أي تعديل Schema:

```text
Migration
```

---

# 105. Migration Security

Migration يجب مراجعتها قبل Production خصوصًا إذا كانت:

* تغير RLS.
* تغير Ownership.
* تضيف Function بـSecurity Definer.
* تغير Historical Tables.
* تغير financial constraints.

---

# 106. SECURITY DEFINER

PostgreSQL Functions التي تستخدم:

```text
SECURITY DEFINER
```

تعتبر عالية الحساسية.

يجب:

* استخدامها فقط عند ضرورة.
* تثبيت `search_path`.
* تحديد الصلاحيات بدقة.
* عدم فتحها للعامة بلا حاجة.
* مراجعة كل Input.

---

# 107. Database Functions

أي Function مالية حساسة يجب أن:

* تتحقق من المستخدم.
* تتحقق من الملكية.
* تتحقق من الحالة.
* تكون Atomic.
* لا تعتمد على Client-supplied user_id.

---

# 108. Database Roles

يجب فصل:

```text
anon
authenticated
service
administrative
```

حسب مزود البنية.

---

# 109. Anonymous Access

لا يسمح لـ:

```text
anon
```

بقراءة بيانات مالية خاصة.

---

# 110. Financial Tables

القاعدة:

```text
No anonymous financial access
```

---

# 111. Rate Limiting

يجب تطبيق Rate Limiting معقول على:

* Login attempts.
* Password reset.
* AI requests.
* Sensitive commands.
* Export endpoints.
* Expensive queries.

---

# 112. Rate Limiting للعمليات المالية

لا يستخدم كبديل عن Idempotency.

كلاهما مطلوب لأغراض مختلفة.

---

# 113. Brute Force Protection

المصادقة يجب أن تعتمد آليات مقدم Auth لمواجهة محاولات الدخول المتكررة.

---

# 114. Account Enumeration

رسائل Login / Reset يجب ألا تكشف أكثر من اللازم ما إذا كان الحساب موجودًا إذا كان ذلك يخلق مخاطرة.

---

# 115. Email Security

إذا استخدم Magic Link أو Reset:

يجب أن:

* يكون الرابط قصير العمر.
* يستخدم مرة واحدة حيثما يدعم المزود.
* يعيد إلى Domain موثوق.

---

# 116. Redirect Security

أي:

```text
return_to
redirect
callback
```

يجب التحقق منه عبر Allowlist.

حتى لا ينشأ:

```text
Open Redirect
```

---

# 117. CORS

لا يستخدم:

```text
Access-Control-Allow-Origin: *
```

على Endpoints حساسة بلا مبرر.

---

# 118. Allowed Origins

Production يعتمد Allowlist للنطاقات الرسمية.

---

# 119. Request Size

يجب تحديد Maximum Payload.

لحماية:

* Server.
* JSON Parser.
* Logs.
* Memory.

---

# 120. Pagination Limits

`page_size` يجب أن يملك Maximum.

ولا يسمح للعميل بطلب:

```text
1,000,000 rows
```

---

# 121. Search Security

Search inputs:

* Parameterized.
* Length limited.
* No dynamic raw SQL.

---

# 122. Sorting Security

Sort fields من Allowlist ثابتة.

---

# 123. Financial Calculation Security

كل القيم الأساسية تأتي من:

```text
Financial Engine
```

---

# 124. Client Calculations

Client يمكنه حساب قيمة للعرض المؤقت فقط.

لكن القيمة الرسمية تأتي من Server.

---

# 125. Cache Security

أي Cache لبيانات مالية:

* Scoped للمستخدم.
* لا يتشارك بين مستخدمين.
* لا يصبح Source of Truth.
* يتم إبطاله عند العملية المؤثرة.

---

# 126. CDN

لا يتم Cache لصفحات مالية خاصة على CDN بشكل Public.

---

# 127. Browser Cache

الصفحات الحساسة يجب تقييم Cache Headers الخاصة بها لتقليل حفظ البيانات غير المرغوب.

---

# 128. Recommendation Privacy

`reason_data` قد يحتوي أرقامًا مالية.

لذلك يعامل كبيانات مالية خاصة.

---

# 129. Snapshot Privacy

Snapshots حساسة جدًا لأنها تلخص الوضع المالي الكامل.

---

# 130. Audit Log Privacy

Audit لا يعني Public.

هو أيضًا محمي بـOwner/Admin rules.

---

# 131. State Logs

`state_transition_logs` لا يسمح للمستخدم بتعديلها مباشرة.

---

# 132. Idempotency Records

لا تعرض للواجهة الاعتيادية.

---

# 133. Request Hashes

لا يجب أن تحتوي Secret خام.

---

# 134. Error Telemetry

عند تسجيل Payload للفشل:

يجب استخدام Sanitized Metadata وليس Request Body كامل.

---

# 135. Security Testing

يجب اختبار:

```text
Authentication
Authorization
RLS
IDOR
CSRF
XSS
SQL Injection
Replay
Idempotency
Concurrency
Secret Exposure
State Bypass
Historical Integrity
```

---

# 136. Security Test — IDOR

تغيير:

```text
transaction_id
```

إلى معرّف مستخدم آخر:

```text
DENIED
```

---

# 137. Security Test — RLS

حتى إذا bypass التطبيق عن طريق Client مباشر:

لا يستطيع المستخدم قراءة Row لا يملكه.

---

# 138. Security Test — user_id Tampering

Client يرسل:

```text
user_id = victim
```

يجب تجاهله أو رفضه.

---

# 139. Security Test — State Tampering

Client يرسل محاولة:

```text
status = PAID
```

بدون `PayObligation`.

يجب ألا توجد API تسمح بذلك.

---

# 140. Security Test — Duplicate Transaction

Replay لنفس الطلب:

```text
One Financial Effect
```

---

# 141. Security Test — Race

طلبان متزامنان لدفع نفس الالتزام:

```text
One Successful Payment
```

---

# 142. Security Test — Closed Cycle

محاولة تسجيل Expense في:

```text
CLOSED
```

يجب أن ترفض.

---

# 143. Security Test — Direct Delete

محاولة حذف:

```text
POSTED transaction
```

يجب ألا تكون متاحة عبر API الاعتيادي.

---

# 144. Security Test — AI Manipulation

مخرجات AI تقترح مبلغًا أو إجراءً.

لا يتم أي Write إلا بعد:

```text
Explicit Application Command
```

---

# 145. Dependency Security

يجب تشغيل:

```text
Dependency Audit
```

ضمن CI أو بشكل دوري.

---

# 146. Dependency Policy

لا تضاف مكتبة لمجرد تنفيذ وظيفة صغيرة إذا كان البديل المدمج كافيًا.

تقليل Dependencies يقلل Attack Surface.

---

# 147. Lockfile

يجب حفظ:

```text
package-lock
pnpm-lock
yarn.lock
```

بحسب مدير الحزم.

---

# 148. Automated Dependency Updates

يمكن استخدام أدوات تحديث آمنة، لكن كل Update يمر بالاختبارات.

---

# 149. Static Analysis

Quality Gate يجب أن يشمل:

```text
Lint
Type Check
```

ويمكن إضافة Security Static Analysis عند الحاجة.

---

# 150. Secret Scanning

يفضل وجود Secret Scanning في Git repository.

---

# 151. Branch Protection

`main` يجب ألا يسمح بتغييرات Production غير مراجعة عند استقرار المشروع.

---

# 152. CI Secrets

CI يحصل فقط على الأسرار اللازمة للمرحلة.

---

# 153. Pull Request from Untrusted Source

لا يتم توفير Production Secrets تلقائيًا لتشغيل كود غير موثوق.

---

# 154. Deployment Security

Production deploy فقط من Pipeline معتمد أو إجراء واضح.

---

# 155. Preview Deployments

يجب ألا تتصل بProduction Database افتراضيًا.

---

# 156. Observability Security Events

يجب أن نستطيع ملاحظة أحداث مهمة مثل:

```text
Repeated login failures
Repeated authorization failures
Unexpected RLS errors
Excessive financial command failures
Repeated duplicate requests
```

دون تحويل النظام إلى منصة مراقبة معقدة في V1.

---

# 157. Incident Severity

## SEV-0

تسريب أو تعديل مالي واسع أو اختراق Production.

---

## SEV-1

تعرض حساب المستخدم أو بيانات مالية حساسة للخطر.

---

## SEV-2

خلل أمني محدود بلا دليل على استغلال.

---

## SEV-3

تحسين أمني منخفض الخطورة.

---

# 158. Incident Response

عند حادث أمني:

```text
Detect
↓
Contain
↓
Revoke / Rotate
↓
Preserve Evidence
↓
Assess Data Impact
↓
Fix Root Cause
↓
Test
↓
Recover
↓
Document
```

---

# 159. لا تنظيف قبل حفظ الأدلة

عند حادث حقيقي:

لا يتم حذف Logs أو إعادة ضبط كل شيء قبل حفظ المعلومات اللازمة لفهم السبب.

---

# 160. Compromised Session

الإجراء:

```text
Revoke Session
↓
Review activity
↓
Reset credentials عند الحاجة
```

---

# 161. Compromised API Key

```text
Revoke
↓
Rotate
↓
Audit
```

فورًا.

---

# 162. Database Credential Exposure

تعامل كحادث عالي الخطورة.

---

# 163. Security Change Log

التغييرات الأمنية الجوهرية يجب توثيقها داخل Changelog لاحقًا.

---

# 164. Security Review Before Production

يجب إجراء Review خاص لـ:

```text
Authentication
Authorization
RLS
Database Functions
Secrets
CORS
CSP
Cookies
API Writes
Idempotency
Historical Protection
AI Boundary
Backups
```

---

# 165. Production Security Gate

لا يسمح بالإطلاق إذا كان يوجد:

```text
Broken RLS
Cross-user read
Cross-user write
Exposed service role
Missing authentication on financial endpoint
Broken idempotency
Writable closed history
Plaintext secret in repository
```

---

# 166. Security Definition of Done — Feature

أي Feature مالية لا تعتبر مكتملة حتى:

```text
Authentication
✓

Ownership
✓

Input Validation
✓

State Validation
✓

Idempotency
✓

Atomicity
✓

RLS / DB Protection
✓

Sensitive Logging Review
✓

Security Tests
✓
```

---

# 167. Security Definition of Done — System

النظام أمنيًا جاهز عندما:

```text
No anonymous financial access
✓

No cross-user access
✓

No client service role
✓

All critical writes server validated
✓

RLS enabled
✓

Secrets isolated
✓

HTTPS
✓

Security headers
✓

Idempotency verified
✓

Historical records protected
✓

Backups protected
✓

Security tests passing
✓

Incident procedure documented
✓
```

---

# 168. ما لم يتم اعتماده بعد

هذه الوثيقة لا تقرر بشكل نهائي:

```text
MFA mandatory or optional
Passkey provider
Exact session duration
Exact rate limits
Exact CSP allowlist
Exact backup retention period
Exact monitoring vendor
```

هذه قرارات Deployment/Operations تعتمد على منصة الاستضافة النهائية.

---

# 169. قاعدة الحوكمة

أي Endpoint أو Feature جديد يجب أن يسأل:

```text
من يستطيع استدعاءه؟
كيف نعرف هوية المستخدم؟
كيف نتحقق من ملكية Resource؟
هل Client يستطيع تزوير ID؟
هل يحتاج Idempotency؟
هل العملية Atomic؟
هل يمكن Replay؟
ما الذي يدخل Logs؟
ما الأسرار المستخدمة؟
ما RLS المطلوبة؟
هل العملية تغير التاريخ المالي؟
كيف نختبرها أمنيًا؟
```

ولا يعتبر Feature جاهزًا إذا لم توجد إجابات واضحة.

---

# 170. النتيجة النهائية

حدود الثقة في النظام يجب أن تكون:

```text
Untrusted Client
↓
Authentication
↓
Authorization
↓
Input Validation
↓
Business Rules
↓
State Machine
↓
Atomic Server Operation
↓
RLS
↓
Database Constraints
↓
Protected Financial History
```

والذكاء الاصطناعي يبقى:

```text
Advisor
```

خارج حدود السلطة المالية المباشرة.

الأمن الصحيح هنا لا يعتمد على إخفاء الأزرار أو صعوبة تخمين UUID، بل على أن كل طبقة تمنع الخطأ أو العبث حتى لو فشلت الطبقة التي قبلها.
