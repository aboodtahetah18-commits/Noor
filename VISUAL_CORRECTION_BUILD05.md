# Mustaqbali Visual Correction — Build 05

## Fixed from live mobile screenshots
- Simplified login screen and removed nonessential marketing/security chips and owner-access helper copy.
- Added official logo above the product name.
- Product tagline is directly below “مستقبلي”.
- Added transparent white logo asset for dark surfaces.
- Colored logo remains on light surfaces.
- Rebuilt `/more` without distorted horizontal tabs.
- Rebuilt `/cycles/new` into a compact, aligned responsive form.
- Restored brand contrast in dark mode:
  - white text on dark active/navigation surfaces
  - teal accent remains visible
  - light form fields remain readable on the dark login panel
- Mobile top bar and bottom nav now have explicit light and dark treatments.

No financial business logic, database schema, route semantics, or financial algorithms were changed.

## Static checks
- PASS — white logo exists
- PASS — login has white logo
- PASS — login old copy removed
- PASS — login feature chips removed
- PASS — login owner intro removed
- PASS — more tabs removed
- PASS — cycle organized form exists
- PASS — accessibility aria current retained
