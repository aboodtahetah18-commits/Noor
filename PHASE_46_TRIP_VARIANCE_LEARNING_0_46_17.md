# P46.16 + P46.17 — Trip variance learning

## Scope
- Learn only from benchmark-eligible **CLOSED** trips.
- Match history by destination city + user-selected trip context.
- Learn category-level planned vs actual variance and user-recorded reasons.
- Reasons are structured, user-selected context; they are never inferred from merchant names or amounts.
- Show factual recurrence counts and average variances without introducing a new financial threshold.
- Historical learning is advisory only; it never changes the next trip plan automatically.

## Structured reasons
- MORE_PEOPLE — زيادة عدد الأشخاص
- LONGER_STAY — زيادة مدة الرحلة
- EXTRA_OCCASION_ACTIVITY — مناسبة أو نشاط إضافي
- PRICE_CHANGE — تغير الأسعار
- ROUTE_TRANSPORT_CHANGE — تغير المسار أو التنقل
- UNPLANNED_PURCHASE — شراء غير مخطط
- UPGRADE_CHOICE — اختيار مستوى أعلى
- OTHER — سبب آخر

## Next-trip behavior
For a new trip with the same city + context, the planning screen shows:
- comparable trip count,
- average planned amount,
- average actual amount,
- count of trips above plan,
- average positive variance when one occurred,
- user-recorded recurring reasons.

No plan amount is changed without explicit user action.
