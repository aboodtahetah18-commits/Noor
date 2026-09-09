# P47.1 + P47.2 — App Shell & Financial Command Center

## P47.1 — App Shell
- Desktop navigation rebuilt from a crowded top navigation into a fixed RTL financial sidebar.
- Sidebar is grouped into: today, money management, analysis/decision.
- Primary bank-message capture is promoted as the highest-frequency action.
- Mobile gains a compact top bar while retaining the five-item bottom navigation.
- Tablet retains its dedicated horizontal navigation so Desktop dimensions are not reused on tablet/mobile.
- Existing routes and financial logic remain unchanged.

## P47.2 — Dashboard
Dashboard rebuilt as a financial command center with this hierarchy:
1. Current cycle and context.
2. Safe To Spend hero.
3. Current liquidity as secondary context, explicitly not equal to Safe To Spend.
4. Next required action.
5. Core KPIs.
6. Budget progress + advisor.
7. Obligations + forecast.
8. Savings / emergency / goals.
9. Quick access to advanced P46 modules.

## Financial integrity
- No financial formula changed.
- Blocked Safe To Spend / forecast values remain blocked when their governing rules are unresolved.
- No synthetic data or visual-only financial values were introduced.
