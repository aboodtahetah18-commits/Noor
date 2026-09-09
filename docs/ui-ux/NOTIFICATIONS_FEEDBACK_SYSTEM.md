# Notifications & Feedback System — UX-P23

PHASE: UX-P23
STATUS: APPROVED
DECISION: DEC-UI-026
TARGETS: DV-DESKTOP + DV-MOBILE
DIRECTION: RTL-first

## Purpose
Authoritative feedback contract for success, error, warning, info, toast, inline feedback, confirmation and undo behavior. It consumes the identity, components, forms, tables and navigation systems and resolves fragmented feedback/destructive-action patterns found in UX-P02.

## Global principles
1. Feedback explains what happened, what it means, and what the user can do next when action is required.
2. No raw backend codes, schema terms, provider names or infrastructure language reach end users.
3. Severity is communicated with text/icon/structure in addition to color.
4. Feedback stays near the action/context when possible; global surfaces are reserved for cross-page or asynchronous outcomes.
5. Duplicate notifications for the same event are prohibited.

## UX-P23-S01 — Success messages
- Success confirms the completed result using a specific verb/outcome.
- Routine low-risk saves use concise inline/toast feedback; major financial outcomes may use persistent confirmation content.
- Success never clears context before the result is authoritative.
- Example pattern: `تم حفظ العملية.` / `تم تحديث الهدف بنجاح.`

## UX-P23-S02 — Error messages
- Error states say what failed + recovery path.
- Field errors remain inline; page/action failures may use Alert or persistent feedback.
- Recoverable errors expose Retry where meaningful and preserve user-entered data.
- Technical codes such as `AUTH_LOGIN_FAILED`, provider/database names and HTTP/infrastructure language are prohibited from user-facing copy.

## UX-P23-S03 — Warning messages
- Warning is used for a meaningful risk before consequence, not as decoration.
- Financial-risk warnings include the affected context, why it matters and the recommended next action when known.
- Warning does not block action unless the consequence is destructive/irreversible or violates a business rule.

## UX-P23-S04 — Info messages
- Info communicates neutral context, changed conditions or guidance.
- Info must be concise and non-alarmist.
- Long explanations belong in contextual help/details, not persistent banners.

## UX-P23-S05 — Toasts
Use Toast for brief cross-surface confirmation that does not require immediate decision.
- Auto-dismiss only for low-risk success/info and with sufficient reading time.
- Error/warning requiring action does not disappear before recovery is possible.
- Maximum simultaneous stack is bounded; newer messages must not create an unreadable queue.
- Toast never contains critical form validation that belongs next to a field.

## UX-P23-S06 — Inline feedback
- Inline feedback is preferred for forms, upload, filters, save state and local data operations.
- Pending, success and error states occupy stable contextual positions where possible to avoid layout confusion.
- `role="status"`/`aria-live` for non-urgent status and `role="alert"` for urgent errors are used as appropriate; P26 certifies implementation.

## UX-P23-S07 — Confirmation dialogs
Confirmation is required before destructive actions when Undo is unavailable or consequences are meaningful.
Contract:
- Name the affected object/action.
- Explain consequence in one concise sentence.
- Destructive action uses explicit verb such as `حذف البند` rather than `تأكيد`.
- Safe/cancel action remains clearly available and receives default focus when risk is high.
- Re-authentication is not invented unless security requirements later demand it.

For ManualPlanBuilder deletion, the system must use either this confirmation contract or the Undo contract below; silent immediate destructive removal is prohibited.

## UX-P23-S08 — Undo behaviour
Undo is preferred for fast, reversible destructive actions when the system can guarantee restoration.
- After action, show outcome + `تراجع` for a governed window.
- Undo restores the exact prior record/state where technically valid.
- If restoration cannot be guaranteed, use confirmation before the action instead.
- Bulk or high-consequence financial deletions should prefer confirmation over a short-lived Undo alone.

## Notification entry point / unread state
- The global Alerts entry point may expose an unread indicator/count only when backed by a real unread model.
- If unread semantics are not implemented, do not fake a badge/dot.
- When implemented, unread state must be programmatically and visually perceivable and must not rely on color alone.

## Recovery hierarchy
`Inline correction → Retry → contextual parent destination → support/reference path when available`.
A generic Dashboard fallback is not the default recovery for unrelated failures.

## Phase boundaries
P24 owns exhaustive state matrices; P26 certifies accessibility; P27 finalizes message tone/terminology; P28 verifies consistency across implementation.
