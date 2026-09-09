begin;
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid references public.financial_cycles(id) on delete restrict,
  recommendation_type text not null,
  status text not null default 'NEW',
  priority integer not null,
  title text not null,
  message text not null,
  reason_code text not null,
  reason_data jsonb not null default '{}'::jsonb,
  related_category_id uuid references public.budget_categories(id) on delete restrict,
  related_goal_id uuid references public.financial_goals(id) on delete restrict,
  related_obligation_occurrence_id uuid references public.obligation_occurrences(id) on delete restrict,
  deduplication_key text,
  created_at timestamptz not null default now(),
  viewed_at timestamptz,
  accepted_at timestamptz,
  dismissed_at timestamptz,
  expired_at timestamptz,
  resolved_at timestamptz,
  constraint recommendations_type_chk check(recommendation_type in ('WARNING','OPPORTUNITY','CORRECTION','GOAL','POSITIVE')),
  constraint recommendations_status_chk check(status in ('NEW','VIEWED','ACCEPTED','DISMISSED','EXPIRED','RESOLVED')),
  constraint recommendations_priority_chk check(priority>=1),
  constraint recommendations_title_chk check(length(trim(title))>0),
  constraint recommendations_reason_chk check(length(trim(reason_code))>0)
);
create unique index recommendations_dedupe_open_uq on public.recommendations(user_id,cycle_id,deduplication_key)
where deduplication_key is not null and status in ('NEW','VIEWED','ACCEPTED');

create table public.cycle_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid not null unique references public.financial_cycles(id) on delete restrict,
  closed_at timestamptz not null,
  expected_income numeric(18,2) not null default 0,
  actual_income numeric(18,2) not null default 0,
  planned_expense numeric(18,2) not null default 0,
  actual_expense numeric(18,2) not null default 0,
  planned_saving numeric(18,2) not null default 0,
  actual_saving numeric(18,2) not null default 0,
  emergency_contribution numeric(18,2) not null default 0,
  goal_contributions numeric(18,2) not null default 0,
  safe_to_spend_final numeric(18,2) not null default 0,
  projected_end_balance_final numeric(18,2),
  actual_end_balance numeric(18,2),
  surplus_amount numeric(18,2) not null default 0,
  deficit_amount numeric(18,2) not null default 0,
  financial_health_score numeric(5,2),
  snapshot_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint cycle_snapshots_nonnegative_chk check(expected_income>=0 and actual_income>=0 and planned_expense>=0 and actual_expense>=0 and planned_saving>=0 and actual_saving>=0 and emergency_contribution>=0 and goal_contributions>=0 and safe_to_spend_final>=0 and surplus_amount>=0 and deficit_amount>=0),
  constraint cycle_snapshots_health_chk check(financial_health_score is null or (financial_health_score>=0 and financial_health_score<=100))
);

create table public.cycle_category_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  snapshot_id uuid not null references public.cycle_snapshots(id) on delete restrict,
  category_id uuid not null references public.budget_categories(id) on delete restrict,
  planned_amount numeric(18,2) not null default 0,
  actual_amount numeric(18,2) not null default 0,
  variance_amount numeric(18,2) not null default 0,
  utilization_percent numeric(8,2),
  final_status text,
  created_at timestamptz not null default now(),
  constraint cycle_category_snapshots_uq unique(snapshot_id,category_id),
  constraint cycle_category_snapshots_status_chk check(final_status is null or final_status in ('NORMAL','AT_RISK','OVER_BUDGET'))
);

create table public.cycle_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid not null unique references public.financial_cycles(id) on delete restrict,
  snapshot_id uuid not null unique references public.cycle_snapshots(id) on delete restrict,
  status text not null default 'GENERATING',
  summary text,
  advisor_summary text,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  archived_at timestamptz,
  failed_at timestamptz,
  constraint cycle_reviews_status_chk check(status in ('GENERATING','READY','ARCHIVED','FAILED'))
);

create table public.state_transition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  from_state text,
  to_state text not null,
  event text not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint state_transition_logs_entity_chk check(length(trim(entity_type))>0),
  constraint state_transition_logs_state_chk check(length(trim(to_state))>0),
  constraint state_transition_logs_event_chk check(length(trim(event))>0)
);

create table public.idempotency_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  idempotency_key text not null,
  operation_type text not null,
  request_hash text,
  resource_type text,
  resource_id uuid,
  response_payload jsonb,
  status text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  constraint idempotency_records_key_chk check(length(trim(idempotency_key))>0),
  constraint idempotency_records_operation_chk check(length(trim(operation_type))>0),
  constraint idempotency_records_status_chk check(status in ('PROCESSING','COMPLETED','FAILED')),
  constraint idempotency_records_uq unique(user_id,idempotency_key)
);
commit;
