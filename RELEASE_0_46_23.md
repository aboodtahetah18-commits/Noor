# Release 0.46.23

P46.22 + P46.23

- Trip funding-gap resolution ordered as flexible budget relief -> emergency -> investment.
- Flexible relief is stored as a pending plan revision proposal, never a silent budget mutation.
- Internal funding cases are linked to the exact trip and enforce one active case per trip.
- Recovery policy stores an explicit cycle count and repays proportionally to actual use.
- 10% growth applies to actual used funding only; unused approved funding has no growth charge.
- Existing budget revision workflow can preload the flexible relief proposal for review and approval.

Database migrations: 58.
