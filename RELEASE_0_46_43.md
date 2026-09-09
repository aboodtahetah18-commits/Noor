# Release 0.46.43

Implements P46.42 + P46.43.

- Uses decision-learning observations to order future-pressure scenarios conservatively.
- Preserves direct financial relief ahead of timing-only deferral.
- Adds explainable, non-causal ranking evidence to each scenario.
- Keeps one-observation history from becoming a learned preference.
- Adds deterministic unit coverage for ranking guardrails.
- No database migration required; migration count remains 64.
