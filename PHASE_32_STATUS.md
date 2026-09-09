# Phase 32 — Mobile Hardening Status

Status: IMPLEMENTED
Version: 0.32.0

## Reference viewports
- 390 × 844
- 360 × 800

## Implemented
- Dedicated mobile bottom navigation for protected application routes.
- No desktop sidebar introduced on mobile.
- Safe-area-aware fixed navigation and protected content bottom spacing.
- Shared minimum touch targets of at least 44px; primary mobile controls are 48px.
- Mobile input font-size 16px to avoid browser zoom and improve keyboard interaction.
- Forms collapse to one column on mobile.
- Page/header action groups become full-width mobile controls where appropriate.
- Transactions table converted to labeled card rows on mobile; no horizontal table scroll.
- Reports/history tables converted to labeled card rows on mobile; no horizontal table scroll.
- Report category variance table converted to mobile cards.
- Dashboard grids collapse progressively for 390px and 360px widths.
- Sticky advisor decision controls are lifted above bottom navigation.
- Onboarding progress remains visible without covering form content.
- Safe-area and scroll padding reduce keyboard/bottom-navigation overlap.
- Long Arabic/financial text receives wrapping/min-width protections to avoid clipped cards.

## Mobile navigation
- الرئيسية → /dashboard
- العمليات → /transactions
- إضافة → /expenses
- المستشار → /advisor
- الإعدادات → /settings

## Explicitly not part of Phase 32
- Desktop hardening (Phase 33)
- Tablet-specific layout decisions (Phase 34)
- Full RTL audit (Phase 35)
- Full accessibility audit (Phase 36)

## Verification
Static contract tests were added at:
`tests/integration/mobile-hardening-contract.test.ts`

Full browser/device screenshots are not claimed because the local artifact environment does not contain installed app dependencies or a running authenticated Neon-backed application.
