# UX Writing System — UX-P27

PHASE: UX-P27
STATUS: APPROVED
DECISION: DEC-UI-030
PRODUCT: المستشار المالي الشخصي
LANGUAGE: Arabic-first / RTL

## Writing principle
The product speaks like a calm personal financial advisor: direct, precise, actionable and non-judgmental. Copy must help the account owner understand what happened, why it matters and what to do next without exposing implementation terminology.

## Voice
- **Calm:** describe risk accurately without alarmist language.
- **Precise:** name the financial object/action explicitly.
- **Actionable:** when action is possible, state the next useful action.
- **Personal but professional:** use clear second-person Arabic where useful without over-familiarity.
- **Non-judgmental:** never shame spending, debt, missed goals or financial mistakes.
- **Arabic-first:** natural Arabic wording is authoritative; English technical labels are not user-facing defaults.

## Button-label rules
- Use a verb + object when ambiguity is possible: `حفظ التعديلات`, `إضافة مصروف`, `عرض التفاصيل`.
- Use a short verb when the object is already unambiguous: `حفظ`, `متابعة`, `إلغاء`, `إعادة المحاولة`.
- Destructive actions name the consequence: `حذف البند` rather than generic `موافق`.
- Do not use `OK`, `Yes/No`, `Submit`, `Confirm` as untranslated generic UI labels.
- One surface has one clear primary action.

## Form labels
- Labels describe the requested data, not instructions: `المبلغ`, `تاريخ العملية`, `الحساب`, `الجهة`.
- Required/optional meaning is explicit and consistent; optional fields use `اختياري` when it reduces uncertainty.
- Placeholder text is example/supporting content and never replaces the label.
- Currency/unit belongs with the field context, not embedded ambiguously in the entered value.

## Help text
- Explain format, consequence or reason only when it prevents an error or improves a decision.
- Keep to one concise sentence by default.
- Avoid repeating the label.
- Never expose infrastructure names, schema language, API terminology or validation codes.

## Error-copy contract
Structure: **what failed → useful reason if known → recovery action**.

Approved patterns:
- `تعذر تسجيل الدخول. تحقق من بيانات الدخول وحاول مرة أخرى.`
- `تعذر حفظ التعديلات. لم نفقد البيانات المدخلة؛ حاول مرة أخرى.`
- `أدخل مبلغًا صحيحًا أكبر من صفر.`
- `تعذر تحميل البيانات. تحقق من الاتصال ثم أعد المحاولة.`

Prohibited user-facing patterns:
- `AUTH_LOGIN_FAILED`
- `AUTH_ROUTE_UNREACHABLE`
- `Neon HTTP`
- raw stack traces, database/schema names, HTTP status codes without a user reason.

## Success-copy contract
- Confirm the completed outcome, not the implementation: `تم حفظ التعديلات.`
- If there is a useful next action, offer it separately: `عرض التفاصيل`.
- Do not over-celebrate routine financial operations.

## Empty / No-results copy
These are distinct:
- `EMPTY`: explain that no data exists yet and offer a meaningful first action.
  - Example: `لا توجد أهداف مالية بعد. أضف هدفك الأول لبدء المتابعة.`
- `NO_RESULTS`: preserve the dataset context and suggest query recovery.
  - Example: `لا توجد نتائج مطابقة. جرّب تعديل البحث أو إزالة بعض الفلاتر.`

## Confirmation copy
Structure: **specific action + consequence + safe alternatives**.
- Title example: `حذف بند الخطة؟`
- Body: `سيُزال هذا البند من الخطة. يمكنك التراجع بعد الحذف خلال فترة الإتاحة.`
- Actions: `حذف البند` / `إلغاء`.
- Never use vague `هل أنت متأكد؟` without naming the action/consequence.

## Navigation labels
The four approved IA meanings remain authoritative and concise:
1. `الرئيسية`
2. `إدارة المال`
3. `التخطيط`
4. `التحليل`

Supporting labels use the shortest unambiguous Arabic term: `التنبيهات`, `التقارير`, `الإعدادات`, `المزيد`.
Desktop and Mobile may compose navigation differently but must preserve the same semantic label for the same destination.

## Arabic consistency
- Modern Standard Arabic is the UI baseline; avoid mixing dialect and formal Arabic within the same surface.
- Use Arabic punctuation and natural RTL sentence order.
- Numerals/financial values follow the P09 bidi/tabular-number contract.
- Do not transliterate technical terms when a clear Arabic term exists.
- Product terminology is singular and stable across pages, notifications, forms and reports.

## Terminology dictionary
| Concept | Approved Arabic | Avoid / notes |
|---|---|---|
| Dashboard / home | الرئيسية | لوحة التحكم when it implies administration |
| Transaction | عملية مالية | use `عملية` when context is obvious |
| Expense | مصروف | avoid alternating with `نفقة` unless domain requirement changes |
| Income | دخل | — |
| Transfer | تحويل | — |
| Refund | استرداد | — |
| Budget | ميزانية | — |
| Debt | دين / ديون | `التزامات` only when broader than debt |
| Obligation | التزام مالي | — |
| Goal | هدف مالي | — |
| Savings | مدخرات | — |
| Financial plan | الخطة المالية | — |
| Risk | مخاطر مالية | severity described in supporting copy |
| Alert | تنبيه | `تحذير` reserved for warning-level meaning |
| Report | تقرير | — |
| Search | بحث | — |
| Filter | تصفية / فلاتر | UI label defaults to `تصفية`; conversational help may say `الفلاتر` only if already established |
| Save | حفظ | use `حفظ التعديلات` when needed |
| Cancel | إلغاء | — |
| Delete | حذف | name object in destructive confirmations |
| Retry | إعادة المحاولة | — |
| Undo | تراجع | — |
| Loading | جارٍ التحميل… | avoid technical process names |
| Success | تم بنجاح / تم <الفعل> | prefer outcome-specific wording |
| Error | تعذر <الفعل> | never raw technical codes |
| Offline | لا يوجد اتصال بالإنترنت | future-state; do not claim offline sync is implemented |

## Financial-risk writing
- State observed condition, likely impact and next action separately.
- Avoid deterministic predictions unless the model/data supports them.
- Prefer: `قد يؤثر هذا الارتفاع على قدرتك على تغطية الالتزامات القادمة.`
- Avoid: `ستقع في أزمة مالية.`
- Recommendations must distinguish observation from suggestion.

## Accessibility writing
- Link/button text must make sense out of context when practical.
- Errors identify the field/problem and recovery.
- Icon-only controls have accessible names consistent with visible terminology.
- Status meaning is textual and not dependent on color.

## Change control
Any new user-facing financial term or systemic action label must map to this dictionary or be added through a governed design-system change. Local synonyms are not allowed when they alter meaning or reduce cross-system consistency.
