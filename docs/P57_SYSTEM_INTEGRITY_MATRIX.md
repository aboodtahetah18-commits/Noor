# P57 — System Integrity & Full Verification Matrix

## Scope
P57 verifies the system as one financial product rather than as isolated pages. It does not change approved financial formulas from P56.

## Part 1 — Core integrity

| Layer | Verification |
|---|---|
| Financial engine | Deterministic money, Safe To Spend, forecast, budget risk, goals, emergency, health score |
| Critical writes | Atomic database transactions for multi-record operations |
| Idempotency | Expense, income, transfer, refund, obligations, savings, emergency and goal writes |
| Ownership | Authenticated `userId` scopes financial repositories and protected writes |
| State machines | Declared allowed transitions, forbidden terminal-state transitions, audit logs |
| Database | Migration inventory, constraints and production migration contract |
| Security | Mutation trust boundary, secret leakage scan, XSS guard, security headers |

## Part 2 — Product-level verification

| Layer | Verification |
|---|---|
| Regression | P56/P55/P54/... contracts retained |
| Navigation | Internal route integrity and protected shell |
| Responsive | Mobile, tablet and desktop hardening contracts |
| Accessibility | Arabic RTL, skip link, focus, reduced motion, touch targets and dialog semantics |
| User journey | Onboarding, accounts, income, plan, expense, obligations, saving, emergency, goals, advisor, reports and closing remain reachable/tested |
| Production | Lint zero-warning, strict typecheck, Vitest, Next production build remain final Netlify authority |

## Acceptance
P57 is accepted only when its verifier and all prior structural gates pass locally, and Netlify subsequently passes lint, typecheck, tests and production build.
