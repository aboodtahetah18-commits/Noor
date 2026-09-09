begin;

alter table public.goal_event_category_plans
  add column if not exists variance_reason_code text;

alter table public.goal_event_category_plans drop constraint if exists goal_event_category_plans_variance_reason_code_chk;
alter table public.goal_event_category_plans add constraint goal_event_category_plans_variance_reason_code_chk
  check (
    variance_reason_code is null or variance_reason_code in (
      'MORE_PEOPLE',
      'LONGER_STAY',
      'EXTRA_OCCASION_ACTIVITY',
      'PRICE_CHANGE',
      'ROUTE_TRANSPORT_CHANGE',
      'UNPLANNED_PURCHASE',
      'UPGRADE_CHOICE',
      'OTHER'
    )
  );

create index if not exists goal_event_category_plans_variance_learning_idx
  on public.goal_event_category_plans(user_id,category_id,variance_reason_code,variance_reviewed_at)
  where variance_reason_code is not null;

commit;
