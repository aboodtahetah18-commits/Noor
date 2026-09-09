## P76–P78 — Focused Flow Rollout, Cross-Device Cleanup, Final Closure
- Rolled focused single-task flow into remaining medium pages.
- Reduced secondary clutter and verbose helper copy.
- Added responsive focused-flow cleanup.
- Prepared combined final closure candidate.

## P75 — Deep Page Simplification (1.5.0)
- Converted dense financial pages into sequential, focused work areas.
- Reduced always-visible secondary panels across bank statements, cycle review, optimizer, internal funding, goals, and future pressure.
- Removed explanatory copy from shared workflow/next-step UI while preserving operational labels.

## P74.1 — إزالة نظام الشروحات المساعدة بالكامل

### Changed
- إزالة جميع أزرار/أيقونات الشرح من واجهات المنصة.
- إزالة جميع محتويات HelpDisclosure من الصفحات.
- حذف مكوّن الشروحات وأنماطه البصرية.
- لا تغيير على الحسابات المالية أو البيانات أو المصادقة أو المسارات.

## P74 — Focused Page Architecture & Sequential Journeys — 2026-09-05

### Changed
- Reworked operational information architecture around one-page/one-job focus.
- Removed or demoted unrelated KPI grids from bank operations, statements, accounts, ledger, obligations, savings, emergency, income, goals, advisor, and alerts.
- Added sequential next-step navigation across the core financial journey.
- Split bank statement reconciliation from merchant intelligence and bank-message intake.


## P73 — Transactions & Daily Entry Experience Finalization
- Unified expense, income, transfer, and refund entry around a money-first responsive form hierarchy.
- Simplified mobile quick-add copy and preserved the established daily operation routes.
- Added operational-date defaults to income and transfer entry.
- No financial/domain/database/auth behavior changed.


## P72 — Dashboard & Daily Financial Command Center Finalization

### Changed
- Reordered the dashboard around Safe To Spend, urgent action, advisor context, upcoming obligations, budget, and forecast.
- Added an overdue-obligation critical strip only when an overdue item exists.
- Simplified dashboard actions and corrected the bank-message/manual-expense action semantics.
- Prioritized Advisor → Obligations → Budget → Forecast on mobile.

### Compatibility
- No financial formulas, database schema, auth, routes, or recommendation ranking changed.
- Updated the legacy P47.2 verifier to accept later semantic versions while retaining its structural assertions.

## P70 — Responsive & Visual Consolidation
- Added shared UI visual tokens and normalized protected-app control/card/header sizing.
- Consolidated core application viewport behavior around mobile <=700px, tablet 701–999px, desktop >=1000px.
- Kept compact-device exceptions while reducing feature-level breakpoint drift.
# Changelog

## 1.5.0 — P64 Final 100% Scope Closure
- Added current-state release and known-issue documents.
- Added fail-closed final release seal for P63 live acceptance evidence.
- Added P64 regression and first-position quality gate.
- Preserved 65 migrations and existing financial behavior.


## [0.6.0] — 2026-09-02

### Added
- Phase 6 Accounts Vertical Slice: create/list/details/deactivate account.
- Atomic opening-balance setup and server-side ownership-scoped repository.
- Responsive Accounts UI for Desktop and Mobile.
- Accounts validation and vertical-slice contract tests.

### Changed
- Account balances are exposed only as derived values from the opening-balance setup event plus approved POSTED ledger entries.

### Security
- Account read/write paths require authenticated user ownership in the repository layer.


## [0.5.0] — 2026-09-02

### Added
- Phase 5 deterministic Financial Engine Core.
- Exact bigint-based money calculations in halalas.
- Account balance, category actual/remaining/utilization, Safe To Spend, Daily Safe, deterministic deficit, goal progress, emergency progress, and saving rate calculations.
- Financial calculation regression tests including STS-001, STS-002, and STS-003.

### Known Issues
- ISSUE-0001 through ISSUE-0006 remain unresolved and no dependent formula was invented.

## [0.8.0] — 2026-09-02
### Added
- Phase 8 Expected Income vertical slice.
- Create/list/update expected income with primary source support.
- Cycle-level expected income UI.
- Tests preserving ExpectedIncome vs POSTED INCOME separation.

## [0.10.0] — 2026-09-02
### Added
- Phase 10 Financial Plan vertical slice.
- PLAN_DRAFT creation with PlanVersion v1 and budget allocations.
- Plan approval, revision via immutable new PlanVersion, and revision approval.
- Financial-plan state transition audit trail.
- Budget plan UI for draft, active and revised states.
### Changed
- Planning source remains the approved current PlanVersion; pending revision is not official until approval.

## [0.11.0] — 2026-09-02

### Added
- Phase 11 Income Vertical Slice.
- Actual `INCOME` transaction flow with `PENDING → POSTED` atomic execution.
- Expected-income linkage and Expected vs Actual variance reporting.
- Explicit income source/kind/partial metadata persistence required by API-C-010.
- Income entry and financial-impact result screens.

### Changed
- Below-expected income now requests plan review without silently mutating an approved plan.
- Above-expected income remains surplus and is not automatically assigned to flexible spending.

### Database
- Added migration `20260902_010_income_expected_link.sql`.

### Known Issues
- Neon main migration remains unapplied pending a functioning safe branch workflow.

## [0.12.0] — 2026-09-02
### Added
- Phase 12 Expense Vertical Slice.
- Atomic/idempotent expense posting.
- Deterministic category budget impact after posting.
- Expense UI and recent expenses list.
### Changed
- Synchronized Drizzle transaction schema with existing expense columns.
### Known Issues
- Safe To Spend remains blocked in production by ISSUE-0002; no buffer value is invented.
- AT_RISK threshold remains pending ISSUE-0003.

## [0.14.0] — 2026-09-02

### Added
- Phase 14 transaction reversal for POSTED INCOME and EXPENSE transactions.
- Mandatory reversal reason, reversal timestamp, audit trail, financial-impact readback, and reversal UI.

### Changed
- Generic reversal is blocked for specialized transaction types until linked domain reversal handlers exist.
- Idempotency handling for reversal now preserves the original result for safe retries.

### Database
- Added migration `20260902_012_transaction_reversal.sql` for reversal reason integrity and supporting lookup index.

### Known Issues
- Safe To Spend remains blocked by ISSUE-0002 pending the Required Financial Buffer rule.

## [0.15.0] — 2026-09-02
### Added
- Phase 15 Transfer Between Accounts using Transfer Header + OUT/IN ledger entries atomically.
- Transfer id linkage on ledger entries and one logical transfer presentation in history.
### Financial Integrity
- A transfer is neither income nor expense and always has zero net effect on total user liquidity.

## [0.16.0] — 2026-09-02

### Added
- Phase 16 Refund vertical slice.
- Linked REFUND transactions with aggregate over-refund protection.
- Net category actual calculation after refunds.

### Database
- Added 20260902_014_refund_integrity.sql.

## 0.24.0 — Phase 24 AI Explanation Layer
- Added optional AI explanation layer after deterministic recommendation rules.
- Added structured-facts minimization and output grounding guard.
- Added OpenAI Responses API provider through native fetch with timeout/fallback.
- Recommendation details now display AI explanation when available and deterministic fallback otherwise.
- No AI financial calculation, database access, state mutation, or financial write authority.


## 0.35.0 — Phase 35 RTL Audit
- Hardened Arabic RTL layout semantics.
- Added bidi isolation for money, numeric, date and time values.
- Converted shared table alignment to logical start/end semantics.
- Hardened RTL pagination and directional icon utilities.
- Preserved P32/P33/P34 responsive behavior.

## 0.37.0 — Phase 37 Security Hardening
- Added mutation origin/CSRF defense-in-depth.
- Added security headers and private cache policy.
- Added sanitized technical logging and reduced health endpoint disclosure.
- Added PostgreSQL owner-isolation RLS migration and PUBLIC privilege revocation.
- Added technical payload limits and security verification contracts.
- Recorded production gates for least-privilege Neon runtime role and dependency lockfile.

## [0.44.26] — 2026-09-03
### Added
- Contextual historical learning based exclusively on CLOSED-cycle snapshots.
- 3-cycle and 6-cycle category averages, displayed only when sufficient history exists.
- Category variance context: temporary, recurring/seasonal, or permanent.
- Named season memory for Ramadan, Eid, summer holiday, back-to-school, travel season, winter/summer, and custom seasons.
- “ماذا تعلّم النظام عني؟” report page.
- Forecast accuracy history with SAR difference and percentage when actual balance is non-zero.

### Changed
- ±10% is the explicit category variance trigger for explanation/review.
- Historical references are no longer rounded to a “clean” budget number.
- Permanent user-confirmed changes may carry exact actual evidence forward; temporary changes do not.
- Recurring/seasonal changes require applicability to the upcoming cycle before any amount change.
- Cash forecast variable-spend category lookup no longer depends on an unnecessary allocation ownership join condition.

### Financial Integrity
- Learning/report queries are read-only; contextual learning is persisted only through an explicit command.
- No automatic next-plan mutation is performed by historical learning.
- CLOSED-cycle snapshots remain the immutable historical basis.

## [0.48.10] — 2026-09-04

### Added
- Added a runtime-guarded npm lockfile generation command (`npm run dependencies:lock`).

### Changed
- Aligned README installation and verification instructions with npm 11.19.0 / Node 24.20.x.

### Fixed
- Removed stale pnpm operational guidance that conflicted with P48 dependency governance.

### Database
- No migration added. Total remains 64.

## [0.49.8] — 2026-09-04

### Changed
- إكمال التحول إلى Modal-First للمصروفات والدخل والتحويلات والاستردادات والادخار والطوارئ.
- تحويل تفاصيل الدخل والحركات المالية إلى نوافذ مستقلة من صفحات القوائم.
- تنظيم الإجراءات في صف واحد قابل للتمرير عند ضيق الشاشة.

### Testing
- إضافة P49.8 quality gate ومنع رجوع المسارات الرئيسية إلى صفحات إدخال منفصلة.

## [0.49.10] — 2026-09-04
- Completed P49.10 Final UX Consistency Sweep.
- Unified modal accessibility, focus return, backdrop/Escape close, title icons, sticky headers and action areas.
- Added keyboard/ARIA hardening for internal tab navigation.
- Added consistent focus-visible and reduced-motion behavior.
- Made older P49 version checks forward-compatible.
- No database migration; total remains 64.

## [0.56.0] — 2026-09-04

### Added
- Finalized P56 V1 financial policy decisions for health score, required buffer, budget risk, forecast, multiple-goal prioritization, and emergency coverage.
- Added explainable Financial Health engine with equal averaging across available dimensions.
- Added deterministic current-cycle ForecastEngine and linear budget-pace risk resolver.
- Added suggestion-only goal ranking and informational emergency coverage engine.

### Changed
- Required Financial Buffer is now formally an explicit owner-selected policy; no 1,000 SAR / 10% UI default is treated as an approved rule.
- Dashboard forecast blocking now reports `BUFFER_POLICY_REQUIRED` when that is the real missing prerequisite.
- Recommendation rules can now use finalized P56 forecast facts for deficit and zero-Safe-To-Spend recommendations.

### Financial Integrity
- Closed snapshots are not silently recalculated.
- No automatic cross-goal financial write was introduced.
- No hidden historical weighting was introduced in Forecast V1.

### Database
- No migration added. Migration inventory remains 64.

## [1.0.0] — 2026-09-04

### Added
- Final V1 production audit and P59 quality gate.
- Integration regression contract for goal-contribution account-ledger semantics.

### Changed
- Goal contributions now explicitly debit the selected source account (`transaction_direction = OUT`) while increasing the goal protected balance.
- Current README and regression documentation synchronized with the P56 financial-decision closure.
- Deprecated pending-forecast compatibility runtime removed.

### Database
- Added migration `20260904_065_goal_contribution_account_ledger.sql`.
- Backfills historical `GOAL_CONTRIBUTION` direction as `OUT`.
- Adds goal contributions to authoritative account outflows.
- Migration inventory is now 65.

### Fixed
- Closed implementation issue ISSUE-0019; no specialized protected-fund ledger mapping remains unresolved for V1 runtime flows.

## 1.4.0 — P63 Live Production Validation
- Added live deployed-origin validation for health, readiness, owner authentication health, critical unauthenticated route guards, and security headers.
- Added non-destructive hostile-Origin checks for authentication mutation boundaries.
- Added JSON/report artifact support for production acceptance evidence.
- No financial logic or schema changes; migration inventory remains 65.

## 2026-09-08 — Governance-aligned technical repair

### Fixed
- Replaced active phase/marker-only quality-gate wiring with functional database-provider, runtime-surface, security-boundary, and regression-contract verification.
- Repaired broken active npm regression wiring and verified that active package scripts reference existing script files.
- Removed explicit `any`, `as any`, `@ts-ignore`, and `@ts-nocheck` escapes from `src`, `tests`, and `scripts`; raw Neon results are typed at query/repository boundaries instead of being cast in consumers.
- Repaired concrete strict-TypeScript defects found by static diagnostics, including unsafe FormData narrowing, discriminated-result handling, raw SQL row access, date construction from unknown DB values, and a missing `return` in the goal-event overview query.
- Replaced authoritative JavaScript floating-point amount arithmetic in affected financial-pressure, salary allocation, surplus routing, internal funding/recovery, bank-statement approval/reconciliation, goal-trip planning, and related financial decision flows with `Money`/minor-unit arithmetic and canonical decimal strings.
- Removed financial epsilon comparisons (`0.004`/`0.005`) and `parseFloat` usage from the runtime source tree.
- Added server-side enum/query parsing for obligation recurrence, expense metadata, and transaction filters instead of unsafe casts.

### Governance
- Current database provider remains Neon PostgreSQL through `DATABASE_URL`; no Supabase runtime dependency or environment reference was introduced.
- Historical Pxx/phase artifacts remain documentary history only and are not active package quality-gate authority.

### Verification
- Passed UI token compliance, dependency policy (lockfile warning remains), database-provider policy, route integrity, runtime-surface, security-boundary, regression-contract, mobile-overflow contract, environment-example verification, and JavaScript syntax checks for all `scripts/*.mjs`.
- Full dependency-backed TypeScript, ESLint, Vitest, Next.js production build, Netlify execution, and live Neon/browser verification remain NOT VERIFIED because the supplied project has no `package-lock.json`/`node_modules`, registry access failed, and the available runtime is Node 22/npm 10 while the project contract requires Node 24.20.x/npm 11.x.

## 2026-09-08 — AUTH-ENV-001
- Removed obsolete `BETTER_AUTH_SECRET` requirement from active runtime environment validation and Netlify deployment preflight.
- Reason: the current authentication implementation does not consume an application auth secret; keeping it mandatory caused a false production deployment failure.
- Preserved server-side session, cookie, password-hashing, origin, and Neon security contracts.

## 2026-09-08 — Urgent Netlify recurrence type repair
- Fixed obligation recurrence narrowing in both the standard obligation creation action and onboarding obligation action.
- Invalid recurrence form values are now rejected before invoking the obligation command.
- Prevents `undefined` from being passed where `ObligationRecurrence` is required under TypeScript strict mode.
- No type suppression or unsafe cast was introduced.

## 2026-09-08 — Netlify goals cycle ReactNode type repair
- Fixed the goals readiness query boundary so active-cycle SQL rows are normalized into an explicit `GoalCycleReadinessCycle` contract.
- `startDate`, `endDate`, and `id` are now application strings and `nextIncomeDate` is `string | null` before reaching React.
- Removes the `unknown` -> `ReactNode` TypeScript failure reported by Netlify at `src/app/(protected)/goals/page.tsx` without `any`, `@ts-ignore`, or a JSX cast.

## 2026-09-08 — Netlify budget optimizer ReactNode type repair
- Root cause: `getSalaryAllocationOptimizer()` returned the active cycle as the raw Neon `SqlRow` (`Record<string, unknown>`). Consumers therefore received `cycle.name` as `unknown`, causing TS2322 when rendered in `/budget/optimizer` and `/budget/optimizer/review`.
- Added the explicit `SalaryOptimizerCycle` contract and normalized `id`, `name`, `startDate`, and `nextIncomeDate` at the query boundary.
- No `any`, `as any`, `@ts-ignore`, or UI-side cast was introduced.

## 2026-09-08 — CHG-QG-0001 cycle-closing regression contract repair
- Removed the obsolete `P56_FINANCIAL_FINALIZATION` source-marker assertion from the two active cycle-closing regression contracts.
- The tests now verify the functional requirement directly: the rollover service invokes `calculateFinancialHealth`, persists `financial_health_score`, and records the immutable snapshot source as `FINALIZED_FINANCIAL_SNAPSHOT`.
- No production cycle-closing logic was weakened or changed; this aligns the tests with OVR-007, QG-020, and approved decision `CHG-QG-0001`.
