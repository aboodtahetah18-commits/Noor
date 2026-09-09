# Phase 24 — AI Explanation Layer

Status: **IMPLEMENTED IN SOURCE / AI OPTIONAL / DATABASE MAIN NOT APPLIED**

## Implemented
- AI explanation runs only after the deterministic Recommendation Rule Engine.
- Input is minimized Structured Facts: reason_code, allowlisted reason_data, language, tone.
- No raw database access, credentials, financial engine authority, status mutation, or money write is granted to AI.
- OpenAI Responses API integration is optional and uses native fetch; no new SDK dependency was added.
- Default model is configurable with `OPENAI_MODEL`; source default is `gpt-5.6-luna`.
- Output is plain text only and React escapes it normally; HTML-like output is rejected.
- Numeric grounding guard rejects generated explanations containing numbers absent from the structured facts.
- Timeout/provider/invalid-output/not-configured all fall back to the deterministic rule-based explanation.
- Recommendation details show whether the explanation is AI-generated or fallback.
- AI output is not persisted in Phase 24, avoiding stale generated text and additional audit schema until storage requirements are finalized.

## Financial invariants
- AI does not calculate Safe To Spend, balance, expected deficit, goal balance, or budget remaining.
- AI failure never fails a financial operation or the recommendation itself.
- Accepting a recommendation still does not execute a financial action.
- AI cannot query Neon directly.

## Environment
Optional:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

If absent, `advisorExplanationStatus = unavailable` and deterministic fallback remains usable.

## Known unresolved business rules remain unchanged
- ISSUE-0002 Required Financial Buffer.
- ISSUE-0004 Forecast formula.
- ISSUE-0005 multi-goal constrained allocation.
- ISSUE-0006 emergency coverage derivation.
