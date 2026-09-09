# Build 18 — Shell and Runtime Resilience

## Fixed from the latest screenshots
- Desktop topbar now places the sidebar menu + single configured brand logo on the right, search in the center, and profile/notification/settings/theme actions on the left.
- Removed native hover titles from topbar controls to prevent the floating "تصغير" tooltip from appearing in the interface.
- Next-step CTA is no longer a blank dark square: it now renders a visible "التالي" label with a Lucide chevron and governed contrast in both themes.
- Goals and Alerts routes no longer collapse into the global protected error page when an optional/read-side source fails. They degrade to a page-level warning and keep the route usable.
- Preserved Build 17 shell, light/dark themes, right sidebar, card hierarchy, on-demand filters, and configurable logos.

## Verification
- P47 closure: PASS — 63 protected pages
- Route integrity: PASS — 67 pages / 123 links
- UI token compliance: PASS — 342 UI files
- P49.11 visible UI system: PASS
- No gradients: PASS

Fingerprint: BUILD18-SHELL-RUNTIME-RESILIENCE-FINGERPRINT
