# Forms & Inputs System — UX-P20

PHASE: UX-P20
STATUS: APPROVED
DECISION: DEC-UI-023
TARGETS: DV-DESKTOP + DV-MOBILE
DIRECTION: RTL-first

## Purpose
This document is the authoritative form/input behavior contract for the personal financial advisor. It consumes the approved identity/tokens/typography/iconography/component/layout/responsive systems and resolves form-specific audit gaps without redefining component architecture, notification architecture, state certification or accessibility certification that belong to later phases.

## Core principles
1. Ask only for information required to complete the user's current financial task.
2. Preserve a stable label above/with every control; placeholder is never the only label.
3. Validate at the earliest useful moment without interrupting normal typing.
4. Never hide an invalid required field in a previous step.
5. Every save/submit action returns visible deterministic feedback.
6. Financially destructive or irreversible outcomes must not be caused by ambiguous controls.
7. Mobile forms are one-column by default; Desktop uses multiple columns only for strongly related fields.
8. RTL controls use logical start/end while numbers, amounts, IBAN-like identifiers and codes preserve readable bidi isolation where necessary.

## UX-P20-S01 — Form hierarchy
Canonical hierarchy:
`Form title → purpose/context → section/group → field label → control → help/constraint → validation/error → action area → feedback/next state`.

Rules:
- One Primary Action per form state.
- Secondary action must not compete visually with Primary.
- Destructive action is separated spatially and semantically.
- Related fields may be grouped under a section heading; unrelated concepts must not share a row merely to save space.
- Long financial forms use sections or steps based on task meaning, not arbitrary field count.
- Desktop form container follows P11 `720px` Form width unless the task needs governed wider structure.
- Mobile primary form flow is one column.

## UX-P20-S02 — Required fields
Required rules:
- Required fields are determined by task completion and data integrity, not implementation convenience.
- A visible form-level statement explains the convention once, e.g. `الحقول المطلوبة مميزة بعلامة *` when `*` is used.
- Each required control exposes programmatic required state (`required`/`aria-required` as appropriate).
- Required status remains visible before validation; errors appear only after meaningful interaction or submit attempt.
- Multi-step flow cannot advance while the current step contains an invalid required field.
- Server-required fields must match client-required presentation; mismatch is prohibited.

Financial examples normally required when applicable:
- transaction type/context,
- amount,
- date/effective date,
- account/source/destination when the transaction semantics require it,
- goal/debt identity where creation would otherwise be ambiguous.

## UX-P20-S03 — Optional fields
Optional rules:
- Optional fields never appear visually equivalent to mandatory decision inputs when they can be deferred.
- Use explicit `اختياري` only when ambiguity is likely; do not label every optional field redundantly.
- Low-frequency optional fields move behind progressive disclosure when they increase cognitive load.
- Optional data must never block Save/Submit.
- If an optional value meaningfully changes downstream analysis, explain the benefit near the field without coercive wording.

## UX-P20-S04 — Validation
Validation layers:
1. **Constraint validation**: required, type, length, format, numeric range.
2. **Business validation**: financially valid relationships, e.g. transfer source ≠ destination where applicable.
3. **Server validation**: authoritative account/data rules.
4. **Cross-field validation**: confirmation values, related amounts/dates, dependent selections.

Timing:
- Do not show errors on untouched empty fields during normal first focus.
- Validate on blur for stable constraints when useful.
- Validate immediately after a submit/next attempt.
- Revalidate corrected fields as soon as the error can confidently clear.
- Expensive/server checks may use explicit pending state.

Numeric/financial inputs:
- Accept locale-appropriate numerals where technically supported.
- Normalize internally without changing displayed meaning.
- Reject invalid/negative values when the financial concept cannot be negative.
- Preserve decimal precision appropriate to currency/task.
- Never silently coerce an invalid amount into a different valid amount.

## UX-P20-S05 — Error messages
Error message contract:
- State **what is wrong + how to fix it**.
- Use Arabic user language; no raw backend codes, stack terms or infrastructure names.
- Keep field errors adjacent to the field and associate programmatically (`aria-describedby`/equivalent).
- Form-level summary is required when multiple errors after submit could be outside the viewport/previous step.
- Error summary links/focuses the relevant field where implementation supports it.
- Do not erase user-entered values after a validation error.

Approved pattern examples:
- `أدخل مبلغًا أكبر من صفر.`
- `اختر الحساب الذي سيخرج منه المبلغ.`
- `كلمتا المرور غير متطابقتين.`
- `تعذر الحفظ الآن. تحقق من الاتصال ثم حاول مرة أخرى.`

Prohibited:
- `AUTH_LOGIN_FAILED`, `500`, `Neon HTTP`, schema/database terminology shown to end users.

## UX-P20-S06 — Help text
Help text is used only when it reduces likely error or explains financial consequence.

Rules:
- Short, local, action-oriented.
- Appears before error when it describes a persistent constraint.
- Error text replaces/augments help without causing layout ambiguity.
- Do not duplicate the label in help text.
- Technical implementation detail is prohibited.
- Examples may be used for formats, not as placeholder-only instructions.
- Sensitive fields explain why information is needed when trust would otherwise be unclear.

## UX-P20-S07 — Progressive disclosure
Use progressive disclosure when fields are:
- optional and low-frequency,
- conditional on a prior choice,
- advanced detail not needed to complete the common task,
- materially distracting from the primary financial decision.

Rules:
- Hidden fields must not contain unresolved required errors.
- If changing a parent choice clears dependent values, inform the user when data would be lost.
- Disclosure control states whether additional details exist and preserves entered values when collapsed unless explicitly reset.
- Critical financial implications must never be hidden under `مزيد` merely to simplify appearance.

## UX-P20-S08 — Multi-step forms
A multi-step form is allowed when the task has genuine stages, not just because it contains many fields.

Contract:
- Show current step and total/meaningful progress where >2 steps.
- Step title communicates purpose, not only `الخطوة 2`.
- `التالي` validates the current step before navigation.
- Back navigation preserves all entered values.
- If a later choice invalidates earlier data, expose and resolve the conflict explicitly.
- Final step includes a review when the financial action has meaningful consequence.
- Primary action changes from `التالي` to an explicit final verb such as `حفظ`/`إنشاء`/`تأكيد التحويل`.
- Mobile uses full-page vertical steps for complex flows; Bottom Sheet is not used for long multi-step financial forms.

This explicitly resolves the hidden-step validation defect identified in `AUD-P02-001 / BK-001`.

## UX-P20-S09 — Upload experience
Current upload scope is account/profile media unless a later product requirement adds financial documents.

Contract:
- Trigger has explicit label; drag/drop may supplement but never replace file selection.
- Show accepted file types and maximum size before selection when enforced.
- Preview filename/image where useful.
- Validate type/size before upload where possible; server remains authoritative.
- Upload exposes `idle → selected → uploading → success/error` feedback.
- Retry is available after recoverable failure without forcing re-selection when technically safe.
- Remove/replace action is explicit.
- Mobile may invoke camera/photo chooser only as an OS capability, not as a required path.
- Never expose local filesystem paths.

## UX-P20-S10 — Save / Submit behaviour
Canonical state model:
`READY → SUBMITTING → SUCCESS | ERROR` with `DISABLED` only when action is impossible or duplicate submission must be prevented.

Rules:
- Primary button uses a specific verb, not generic `إرسال` where a clearer financial verb exists.
- Disable duplicate submission while pending; keep readable progress text such as `جاري الحفظ…`.
- Do not clear the form until authoritative success is known.
- Success communicates the resulting state and next action; navigation must not make success ambiguous.
- Recoverable errors preserve entered data and expose Retry/Submit again.
- Autosave, if introduced later, must expose `جاري الحفظ / تم الحفظ / تعذر الحفظ` and cannot masquerade as final submission.
- Forms with meaningful unsaved changes warn before destructive close/back/navigation unless the data is safely persisted as draft.
- Cancel/back never silently commits data.
- Destructive submit actions require the safety pattern owned by P23/P24.

### Save feedback baseline
- Pending: visible status + disabled duplicate submit.
- Success: clear confirmation, no raw technical data.
- Error: user-actionable message + preserved values.
- Unsaved: identifiable before leaving when loss is meaningful.

This resolves the silent-save/pending-feedback form portions of `AUD-P02-001`, `AUD-P02-002`, and the form-layout portion of `AUD-P02-010`.

## Input-specific interaction notes
### Select / Combobox
- Keyboard contract: Tab enters/leaves, Arrow keys traverse options, Enter selects, Escape closes without unwanted value change.
- Active option is programmatically exposed.
- No-results state is explicit; creating a new option must be an explicit supported mode, not an accidental fallback.
- This resolves the form-side interaction requirement from `AUD-P02-004 / BK-004`; final accessibility certification remains P26.

### Password
- Requirements are visible before submit when policy exists.
- Show/hide control has accessible name and does not move focus unexpectedly.
- Confirmation errors identify the mismatch rather than generic failure.

### Date
- User can type/select according to supported locale behavior.
- Financial meaning of date (transaction date, due date, target date) must be in the label, not inferred from a generic date control.

## Responsive contract
- Desktop: related field pairs may share a row within the governed Form container.
- Medium: columns reduce before labels/controls compress.
- Mobile: one-column default; no two-column financial forms as target pattern.
- Action rows wrap/stack; horizontal scrolling actions are prohibited.
- Keyboard and touch behavior remain functionally equivalent.

## Accessibility baseline for later certification
- Visible label + programmatic name.
- Required/invalid state exposed programmatically.
- Help/error associations explicit.
- Focus is visible and returns to the relevant field after validation when appropriate.
- Touch target >=44px for interactive controls.
- No meaning conveyed by color alone.
- Detailed audit/certification remains UX-P26.

## Phase boundaries
- P21 owns table/data interaction details.
- P22 owns final navigation patterns.
- P23 owns cross-system notification/feedback behavior.
- P24 owns exhaustive state system.
- P26 owns accessibility certification.
- P27 owns final UX writing system.
