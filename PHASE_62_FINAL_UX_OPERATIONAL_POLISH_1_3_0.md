# P62 — Final UX & Operational Polish — 1.3.0

P62 is the final in-code UX and operational polish pass before live production validation.

## UX closure
- Centralized Arabic labels for cycle, obligation, and budget states that are surfaced in high-traffic command views.
- Removed remaining visible technical English labels from obligation timeline and cycle-report expense classification.
- Made the transactions empty state neutral to the ingestion source.

## Operational state closure
- Added a protected `not-found.tsx` recovery surface matching protected loading/error behavior.
- Protected error recovery now uses Next.js navigation rather than a raw anchor reload.
- Preserved skip-to-content, focus-visible, reduced-motion, forced-colors, and mobile touch-target contracts.

## Safety
- No financial formulas changed.
- No database migration added.
- Migration inventory remains 65.
