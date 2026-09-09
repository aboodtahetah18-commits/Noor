BEGIN;

-- Dashboard / reports: cycle-scoped posted movements are the dominant aggregate path.
CREATE INDEX IF NOT EXISTS transactions_cycle_posted_type_category_idx
  ON public.transactions(user_id, cycle_id, transaction_type, category_id, transaction_date DESC)
  INCLUDE (amount, planning_status, related_transaction_id)
  WHERE status = 'POSTED';

CREATE INDEX IF NOT EXISTS expected_incomes_cycle_idx
  ON public.expected_incomes(user_id, cycle_id, expected_date)
  INCLUDE (expected_amount, income_kind, is_primary);

CREATE INDEX IF NOT EXISTS budget_allocations_version_user_idx
  ON public.budget_allocations(plan_version_id, user_id, category_id)
  INCLUDE (planned_amount, allocation_type);

-- Obligations: dashboard and list screens repeatedly order open items by state and due date.
CREATE INDEX IF NOT EXISTS obligation_occurrences_open_due_idx
  ON public.obligation_occurrences(user_id, status, due_date, created_at)
  INCLUDE (amount, template_id, cycle_id, is_reserved)
  WHERE status IN ('OVERDUE','DUE','UPCOMING');

-- Closed reports / historical analysis read immutable snapshot children by snapshot id.
CREATE INDEX IF NOT EXISTS cycle_category_snapshots_snapshot_idx
  ON public.cycle_category_snapshots(user_id, snapshot_id, category_id)
  INCLUDE (planned_amount, actual_amount, variance_amount, utilization_percent, final_status);

-- Advisor feed: optimize the common open-feed path without changing historical retention.
CREATE INDEX IF NOT EXISTS recommendations_open_feed_idx
  ON public.recommendations(user_id, status, priority, created_at DESC)
  INCLUDE (cycle_id, recommendation_type, reason_code, deduplication_key)
  WHERE status IN ('NEW','VIEWED','ACCEPTED');

COMMIT;
