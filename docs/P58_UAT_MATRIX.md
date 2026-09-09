# P58 — Full UAT Matrix

This matrix defines the complete V1 user-acceptance journey. It is intentionally ordered so a release cannot claim UAT coverage by checking isolated pages only.

| Step | User outcome | Primary surface | Acceptance focus |
| --- | --- | --- | --- |
| 1 | Initial setup | `/onboarding` | owner session, setup progression |
| 2 | Establish accounts | `/accounts` | account identity + opening-balance model |
| 3 | Record/confirm income | `/income` | expected vs actual income |
| 4 | Build/approve plan | `/budget` | plan versions + allocations |
| 5 | Record expense | `/expenses` | budget impact + Safe To Spend recalculation |
| 6 | Pay obligation | `/obligations` | atomic payment + lifecycle |
| 7 | Transfer saving | `/savings` | planned vs transferred |
| 8 | Manage emergency fund | `/emergency` | contribution/withdrawal integrity |
| 9 | Fund goals | `/goals` | contribution + progress + feasibility |
| 10 | Review advisor | `/advisor` | deterministic reason + explanation |
| 11 | Close cycle | `/cycles` | CLOSING, snapshot, audit |
| 12 | Review history | `/reports` | closed-cycle historical truth |
| 13 | Start next cycle | `/dashboard` | next action and rollover readiness |

## Release rule
P58 UAT is not considered live-complete until the deployed Netlify build passes and an authenticated operator executes the above flow against a non-production/disposable dataset or an explicitly approved production test dataset. Structural contracts in the repository prove wiring and regression protection; they do not pretend to replace a real authenticated browser session.
