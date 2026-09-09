# Mustaqbali Interaction Capabilities Contract — 2026-09-09

Every resource exposes only the actions that are valid for its financial semantics.

- Add: shown at collection/page level when creation is permitted.
- Edit: shown when the record is mutable.
- View details: always available for non-trivial financial resources.
- Delete: hard deletion is forbidden for auditable financial history. Accounts use deactivation; posted transactions use reversal; immutable history remains visible.
- Print: detail dialogs and detail pages expose the shared print action.
- Mobile swipe/scroll actions: action rails are horizontally scrollable/touch-friendly and keep cards uncluttered.
- Destructive actions are visually separated and require their existing confirmation/contract flow.
- Buttons must not be rendered merely for symmetry: a capability is shown only when the domain allows it.
