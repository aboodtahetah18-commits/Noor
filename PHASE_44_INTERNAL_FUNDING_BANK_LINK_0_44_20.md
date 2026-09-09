# P44.20 — Internal Funding Bank-Link

- Adds dedicated internal funding cases for trips/goals/urgent needs.
- Emergency funding is priority before investment via source priority.
- Growth contribution is capped at 10% and calculated only on amounts actually used.
- Bank statement/message rows can be explicitly linked to an active funding case during user review.
- The authoritative POSTED transaction is created first; funding allocation is written afterward, preventing duplicate financial effects.
- A single expense may split across multiple funding sources when the higher-priority source is insufficient.
- Each allocation retains its budget category so future recovery can be attributed to the categories that actually consumed the funding.
- Read paths remain read-only; allocation is a command invoked only after approval.
