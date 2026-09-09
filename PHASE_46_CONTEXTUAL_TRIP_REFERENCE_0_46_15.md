# P46.14 + P46.15 — Contextual Trip Reference

## P46.14 — Trip context classification
- Trip context is explicitly selected by the user; the system does not infer it from duration, merchant names, or spend.
- Supported contexts: standard, occasion, work, family, long stay, medical, custom.
- Closed trips keep their saved context as historical truth.
- Context can be changed only before closing the trip.

## P46.15 — Context-aware historical reference
- The next-trip reference first uses CLOSED + benchmark-eligible trips matching **destination city + trip context**.
- For custom contexts, the custom context name must also match.
- If no matching contextual history exists, the planner falls back to the city-wide reference and tells the user explicitly.
- No amount is applied silently: the user must still press “use historical reference as starting point”.
- Category remains the “what”; goal/trip/context remain the “why / which event”.
- No arbitrary threshold or automatic budget uplift was introduced.

## Database
- Migration 055 adds `trip_context_code`, `trip_context_name`, and `historical_reference_scope`.
