begin;
create table public.obligation_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  default_amount numeric(18,2) not null,
  recurrence text not null,
  priority integer,
  expected_account_id uuid references public.accounts(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obligation_templates_name_chk check(length(trim(name))>0),
  constraint obligation_templates_amount_chk check(default_amount>0),
  constraint obligation_templates_recurrence_chk check(recurrence in ('ONCE','MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL')),
  constraint obligation_templates_priority_chk check(priority is null or priority >= 1),
  constraint obligation_templates_owner_uq unique(user_id,id)
);

create table public.obligation_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  template_id uuid not null references public.obligation_templates(id) on delete restrict,
  cycle_id uuid references public.financial_cycles(id) on delete restrict,
  due_date date not null,
  amount numeric(18,2) not null,
  status text not null default 'UPCOMING',
  is_reserved boolean not null default false,
  paid_transaction_id uuid,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint obligation_occurrences_amount_chk check(amount>0),
  constraint obligation_occurrences_status_chk check(status in ('UPCOMING','DUE','OVERDUE','PAID','CANCELLED')),
  constraint obligation_occurrences_paid_chk check(status <> 'PAID' or (paid_transaction_id is not null and paid_at is not null)),
  constraint obligation_occurrences_cancelled_chk check(status <> 'CANCELLED' or cancelled_at is not null),
  constraint obligation_occurrences_owner_uq unique(user_id,id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid references public.financial_cycles(id) on delete restrict,
  account_id uuid references public.accounts(id) on delete restrict,
  transaction_type text not null,
  status text not null default 'PENDING',
  amount numeric(18,2) not null,
  transaction_date date not null,
  description text,
  category_id uuid references public.budget_categories(id) on delete restrict,
  planning_status text,
  expense_nature text,
  transaction_direction text,
  related_transaction_id uuid references public.transactions(id) on delete restrict,
  obligation_occurrence_id uuid references public.obligation_occurrences(id) on delete restrict,
  goal_id uuid,
  emergency_fund_id uuid,
  idempotency_key text,
  posted_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_amount_chk check(amount>0),
  constraint transactions_type_chk check(transaction_type in ('INCOME','EXPENSE','TRANSFER','REFUND','SAVING_TRANSFER','EMERGENCY_CONTRIBUTION','EMERGENCY_WITHDRAWAL','GOAL_CONTRIBUTION','OBLIGATION_PAYMENT')),
  constraint transactions_status_chk check(status in ('PENDING','POSTED','REVERSED','FAILED')),
  constraint transactions_planning_chk check(planning_status is null or planning_status in ('PLANNED','UNPLANNED')),
  constraint transactions_nature_chk check(expense_nature is null or expense_nature in ('NECESSARY','IMPORTANT','OPTIONAL','ENTERTAINMENT','UNPLANNED')),
  constraint transactions_direction_chk check(transaction_direction is null or transaction_direction in ('IN','OUT')),
  constraint transactions_expense_fields_chk check(transaction_type <> 'EXPENSE' or (account_id is not null and category_id is not null and planning_status is not null and expense_nature is not null)),
  constraint transactions_income_account_chk check(transaction_type <> 'INCOME' or account_id is not null),
  constraint transactions_posted_at_chk check(status <> 'POSTED' or posted_at is not null),
  constraint transactions_reversed_at_chk check(status <> 'REVERSED' or reversed_at is not null),
  constraint transactions_self_ref_chk check(related_transaction_id is null or related_transaction_id <> id),
  constraint transactions_owner_uq unique(user_id,id)
);
create unique index transactions_idempotency_uq on public.transactions(user_id,idempotency_key) where idempotency_key is not null;
alter table public.obligation_occurrences add constraint obligation_occurrences_paid_transaction_fk foreign key(paid_transaction_id) references public.transactions(id) on delete restrict;
create unique index obligation_occurrences_paid_transaction_uq on public.obligation_occurrences(paid_transaction_id) where paid_transaction_id is not null;

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cycle_id uuid references public.financial_cycles(id) on delete restrict,
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(18,2) not null,
  transaction_date date not null,
  description text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  constraint transfers_accounts_chk check(from_account_id <> to_account_id),
  constraint transfers_amount_chk check(amount>0),
  constraint transfers_idempotency_uq unique(user_id,idempotency_key),
  constraint transfers_owner_uq unique(user_id,id)
);

create trigger obligation_templates_updated_at before update on public.obligation_templates for each row execute function public.set_updated_at();
create trigger obligation_occurrences_updated_at before update on public.obligation_occurrences for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();
commit;
