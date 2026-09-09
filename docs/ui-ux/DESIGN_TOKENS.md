# Design Tokens — UX-P08

PHASE: UX-P08
STATUS: APPROVED — REVALIDATED UNDER CR-001
DECISION: DEC-UI-011

## Governance
This file is the authoritative primitive/semantic token registry approved in UX-P08. After this approval, future UI work must not introduce arbitrary visual values for the token families governed here. Component-specific mapping remains deferred to its registered phase.

### Naming model
- Primitive tokens: `--ux-<family>-<scale/name>`
- Semantic aliases: `--ux-<role>-<name>`
- No component-specific token names are approved in P08.
- No hue outside the CR-001 revalidated standalone palette is introduced.

## 1. Color tokens
### Brand primitives
| Token | Value | Use boundary |
|---|---:|---|
| `--ux-color-ink` | `#0B1220` | Primary text/structure/high-emphasis surface |
| `--ux-color-primary` | `#2563EB` | Primary action/focus/selection |
| `--ux-color-cyan` | `#06B6D4` | Supporting accent/data highlight; not small text on white |
| `--ux-color-canvas` | `#F8FAFC` | Application canvas |
| `--ux-color-white` | `#FFFFFF` | Content surface/inverse text |
| `--ux-color-slate` | `#475569` | Secondary text/metadata |
| `--ux-color-success` | `#15803D` | Success semantic cue |
| `--ux-color-warning` | `#B45309` | Warning/risk semantic cue |
| `--ux-color-error` | `#B42318` | Error/destructive semantic cue |
| `--ux-color-transparent` | `transparent` | Transparency only |

### Approved alpha derivations
| Token | Value |
|---|---|
| `--ux-ink-a04` | `rgb(11 18 32 / 0.04)` |
| `--ux-ink-a08` | `rgb(11 18 32 / 0.08)` |
| `--ux-ink-a12` | `rgb(11 18 32 / 0.12)` |
| `--ux-ink-a20` | `rgb(11 18 32 / 0.20)` |
| `--ux-ink-a32` | `rgb(11 18 32 / 0.32)` |
| `--ux-primary-a12` | `rgb(37 99 235 / 0.12)` |
| `--ux-primary-a20` | `rgb(37 99 235 / 0.20)` |
| `--ux-cyan-a16` | `rgb(6 182 212 / 0.16)` |

### Semantic color aliases
| Token | Maps to |
|---|---|
| `--ux-surface-canvas` | `--ux-color-canvas` |
| `--ux-surface-default` | `--ux-color-white` |
| `--ux-surface-inverse` | `--ux-color-ink` |
| `--ux-text-primary` | `--ux-color-ink` |
| `--ux-text-secondary` | `--ux-color-slate` |
| `--ux-text-inverse` | `--ux-color-white` |
| `--ux-action-primary` | `--ux-color-primary` |
| `--ux-accent-supporting` | `--ux-color-cyan` |
| `--ux-border-default` | `--ux-ink-a12` |
| `--ux-border-strong` | `--ux-ink-a20` |
| `--ux-focus-ring` | `--ux-color-primary` |
| `--ux-state-info` | `--ux-color-primary` + text/icon cue |
| `--ux-state-success` | `--ux-color-success` + text/icon cue |
| `--ux-state-warning` | `--ux-color-warning` + text/icon cue |
| `--ux-state-error` | `--ux-color-error` + text/icon cue |
| `--ux-state-disabled` | ink/slate alpha + disabled semantics |

State meaning must never depend on color alone.

## 2. Typography tokens
P08 tokenises the approved family and token namespaces only. Exact size/weight/line-height role scale is intentionally deferred to UX-P09.

| Token | Value / status |
|---|---|
| `--ux-font-family-base` | `"IBM Plex Sans Arabic", sans-serif` |
| `--ux-font-family-arabic` | alias of `--ux-font-family-base` |
| `--ux-type-display` | VALUE DEFERRED TO UX-P09 |
| `--ux-type-heading` | VALUE DEFERRED TO UX-P09 |
| `--ux-type-body` | VALUE DEFERRED TO UX-P09 |
| `--ux-type-label` | VALUE DEFERRED TO UX-P09 |
| `--ux-type-caption` | VALUE DEFERRED TO UX-P09 |
| `--ux-type-number` | VALUE DEFERRED TO UX-P09 |

No alternate font token is approved.

## 3. Spacing tokens
A 4px primitive rhythm is approved. P11 will define layout/grid rules and semantic composition patterns using this scale.

| Token | Value |
|---|---:|
| `--ux-space-0` | `0` |
| `--ux-space-1` | `4px` |
| `--ux-space-2` | `8px` |
| `--ux-space-3` | `12px` |
| `--ux-space-4` | `16px` |
| `--ux-space-5` | `20px` |
| `--ux-space-6` | `24px` |
| `--ux-space-8` | `32px` |
| `--ux-space-10` | `40px` |
| `--ux-space-12` | `48px` |
| `--ux-space-16` | `64px` |
| `--ux-space-20` | `80px` |
| `--ux-space-24` | `96px` |

Arbitrary spacing values are prohibited after P08 unless introduced by a governed change.

## 4. Radius tokens
| Token | Value | Intended primitive role |
|---|---:|---|
| `--ux-radius-0` | `0` | Square |
| `--ux-radius-1` | `4px` | Minimal |
| `--ux-radius-2` | `8px` | Standard small |
| `--ux-radius-3` | `12px` | Standard medium |
| `--ux-radius-4` | `16px` | Large surface |
| `--ux-radius-6` | `24px` | Extra-large surface |
| `--ux-radius-full` | `9999px` | Circular/pill only |

Component mapping is deferred to UX-P12.

## 5. Border tokens
| Token | Value |
|---|---|
| `--ux-border-width-0` | `0` |
| `--ux-border-width-1` | `1px` |
| `--ux-border-width-2` | `2px` |
| `--ux-border-style-default` | `solid` |
| `--ux-border-color-default` | `--ux-ink-a12` |
| `--ux-border-color-strong` | `--ux-ink-a20` |
| `--ux-border-color-focus` | `--ux-color-primary` |

No arbitrary border color or width is approved.

## 6. Shadow tokens
Shadows are intentionally restrained and use Financial Ink alpha only.

| Token | Value |
|---|---|
| `--ux-shadow-none` | `none` |
| `--ux-shadow-xs` | `0 1px 2px rgb(11 18 32 / 0.08)` |
| `--ux-shadow-sm` | `0 4px 12px rgb(11 18 32 / 0.08)` |
| `--ux-shadow-md` | `0 12px 28px rgb(11 18 32 / 0.12)` |
| `--ux-shadow-lg` | `0 20px 48px rgb(11 18 32 / 0.16)` |

Decorative or colored shadows are not approved.

## 7. Size tokens
These are primitive dimensions only; P12/P20 will map them to components and controls.

| Token | Value |
|---|---:|
| `--ux-size-4` | `16px` |
| `--ux-size-5` | `20px` |
| `--ux-size-6` | `24px` |
| `--ux-size-8` | `32px` |
| `--ux-size-9` | `36px` |
| `--ux-size-10` | `40px` |
| `--ux-size-11` | `44px` |
| `--ux-size-12` | `48px` |
| `--ux-size-14` | `56px` |
| `--ux-size-16` | `64px` |

`44px` is reserved as the minimum accessible interactive-target primitive where applicable; exact component mapping is deferred.

## 8. Motion tokens
P08 approves motion primitives only. Motion purpose, transitions and reduced-motion behavior are defined in UX-P25.

| Token | Value |
|---|---|
| `--ux-motion-duration-0` | `0ms` |
| `--ux-motion-duration-fast` | `120ms` |
| `--ux-motion-duration-base` | `200ms` |
| `--ux-motion-duration-slow` | `320ms` |
| `--ux-motion-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--ux-motion-ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` |
| `--ux-motion-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` |

No decorative animation token is approved.

## 9. Z-index tokens
| Token | Value | Layer |
|---|---:|---|
| `--ux-z-base` | `0` | Normal content |
| `--ux-z-sticky` | `100` | Sticky local UI |
| `--ux-z-navigation` | `200` | Persistent navigation shell |
| `--ux-z-dropdown` | `400` | Menus/listboxes/popovers |
| `--ux-z-overlay` | `600` | Overlay/backdrop |
| `--ux-z-modal` | `700` | Modal/dialog/sheet |
| `--ux-z-toast` | `800` | Temporary feedback |
| `--ux-z-critical` | `900` | Exceptional top-layer system notice only |

No raw z-index values may be introduced after approval.

## 10. Breakpoint tokens
These tokens are implementation boundaries, not separate device products. Official target devices remain Desktop and Mobile. The medium range exists only to support safe responsive interpolation and does not reinstate Tablet as a target experience.

| Token | Value | Meaning |
|---|---:|---|
| `--ux-bp-compact` | `0px` | Base/mobile-first |
| `--ux-bp-medium` | `768px` | Transitional responsive range |
| `--ux-bp-desktop` | `1024px` | Desktop layout boundary |
| `--ux-bp-wide` | `1440px` | Wide desktop optimization boundary |

Exact responsive behavior at each range is deferred to UX-P19.

## Implementation reference
```css
:root {
  --ux-color-ink: #0B1220;
  --ux-color-primary: #2563EB;
  --ux-color-cyan: #06B6D4;
  --ux-color-white: #ffffff;

  --ux-space-1: 4px;
  --ux-space-2: 8px;
  --ux-space-3: 12px;
  --ux-space-4: 16px;
  --ux-space-6: 24px;
  --ux-space-8: 32px;

  --ux-radius-1: 4px;
  --ux-radius-2: 8px;
  --ux-radius-3: 12px;
  --ux-radius-4: 16px;

  --ux-border-width-1: 1px;
  --ux-shadow-sm: 0 4px 12px rgb(11 18 32 / 0.08);
  --ux-motion-duration-base: 200ms;
  --ux-z-modal: 700;
}
```

## Phase boundaries
- UX-P09 owns final typography scale/roles.
- UX-P10 owns iconography tokens/registry where required.
- UX-P11 owns grid and spacing application rules.
- UX-P12 owns component token mappings.
- UX-P19 owns responsive behavior.
- UX-P24 owns state-system treatment.
- UX-P25 owns motion/interaction behavior.
- UX-P26 certifies accessibility.
