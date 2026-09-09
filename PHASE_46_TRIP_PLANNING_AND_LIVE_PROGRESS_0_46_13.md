# P46.12 + P46.13 — Trip planning and live progress

- A future trip can use benchmark-eligible closed trips from the same city as an explicit starting reference.
- Historical averages never mutate a trip plan until the user presses the explicit action to use them as a starting plan.
- Category plans are stored per trip and remain separate from financial transactions.
- During a trip, actual linked expenses are compared deterministically with the user-approved planned amount; no arbitrary risk threshold is introduced.
- If actual exceeds planned, the UI asks for an explanatory reason and stores it with the trip/category context.
- Historical reference amount and benchmark trip count are retained for explainability.
- Starting and closing a trip are explicit user actions.
