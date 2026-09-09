# P46.40 + P46.41 — Decision Effectiveness Learning

- Creates immutable learning observations only from COMPLETED + EVALUATED pressure-decision packages.
- Learning is deterministic and explainable; AI does not calculate the financial result.
- Because packages are composite, attribution is explicitly `CO_OCCURRENCE`. The system never claims one action caused the package outcome.
- Aggregates how each scenario kind appeared inside packages classified RESOLVED, REDUCED, SHIFTED, WORSENED, or MIXED.
- Stores expected item effect, observed package relief, shifted trip pressure, cycle window, and context snapshot.
- The learning view explains whether evidence is still insufficient, mostly time-shifting, associated with improvement, or associated with worse outcomes.
- This phase does NOT automatically reorder recommendations or execute decisions. It creates evidence for the next recommendation-learning stage.

Migration: 064.
