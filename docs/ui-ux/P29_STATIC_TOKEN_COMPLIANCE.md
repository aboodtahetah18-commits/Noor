# P29 Static Token Compliance — UXP29-20260905-03

Status: **PASS**

## Authority
- `docs/ui-ux/DESIGN_TOKENS.md`
- UX-P07 → UX-P28 governance package
- `docs/ui-ux/IMPLEMENTATION_HANDOFF_FOR_P29.md`

## Baseline
The only implementation baseline for this candidate is `PFA_v1.5.0_P76_P77_P78_COMBINED_FINAL_CLOSURE_FULL_2.zip`. The approved token-compliance mapping from UXP29-20260905-02 was ported as a governed UX implementation delta only.

## Audit scope
`src/app`, `src/components`, and `src/features` UI source (`.css`, `.tsx`, `.jsx`, `.ts`).

## Result
- UI files statically audited: **336**
- Raw Hex/RGB/HSL colors outside the governed token registry: **0**
- Unapproved gradients: **0**
- Raw radius values: **0**
- Raw spacing values in governed spacing properties: **0**
- Raw box-shadow values: **0**
- Raw border width/style values in governed border shorthands: **0**
- Non-`--ux-*` visual CSS variable references: **0**
- Unapproved backdrop blur/glass effects: **0**
- CSS parse errors in `globals.css`: **0**
- CSS parse errors in `uiux-governance.css`: **0**

## Semantic migration
Legacy visual values were mapped by role, not by blind hue replacement:
- text → `--ux-text-primary` / `--ux-text-secondary` / `--ux-text-inverse`
- surfaces → `--ux-surface-canvas` / `--ux-surface-default` / `--ux-surface-inverse`
- primary/focus → `--ux-action-primary` / `--ux-focus-ring` / governed alpha tokens
- borders → `--ux-border-default` / `--ux-border-strong`
- success/warning/error → `--ux-state-success` / `--ux-state-warning` / `--ux-state-error`
- accent → `--ux-accent-supporting`
- overlays/shadows → governed Financial Ink alpha/shadow tokens

All runtime visual aliases are governed `--ux-*` tokens.

## Regression guard
`scripts/verify-ui-token-compliance.mjs` is wired into `scripts/production-quality-gate.mjs` and fails on raw/unapproved visual values.
