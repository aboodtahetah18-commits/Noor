begin;

create table if not exists public.bank_statement_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  file_name text not null,
  file_type text not null,
  status text not null default 'REVIEW',
  period_start date,
  period_end date,
  opening_balance numeric(18,2),
  closing_balance numeric(18,2),
  row_count integer not null default 0,
  auto_classified_count integer not null default 0,
  review_count integer not null default 0,
  duplicate_candidate_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint bank_statement_imports_status_chk check(status in ('PARSING','REVIEW','READY','APPROVED','FAILED')),
  constraint bank_statement_imports_file_type_chk check(file_type in ('CSV','XLSX','PDF'))
);

create table if not exists public.bank_statement_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  import_id uuid not null references public.bank_statement_imports(id) on delete cascade,
  row_number integer not null,
  transaction_date date,
  description text not null,
  amount numeric(18,2) not null,
  direction text not null,
  detected_kind text not null,
  normalized_merchant text,
  confidence numeric(5,2) not null default 0,
  review_status text not null default 'NEEDS_REVIEW',
  duplicate_candidate boolean not null default false,
  category_id uuid references public.budget_categories(id) on delete restrict,
  matched_transaction_id uuid references public.transactions(id) on delete restrict,
  raw_payload text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_statement_rows_direction_chk check(direction in ('DEBIT','CREDIT')),
  constraint bank_statement_rows_kind_chk check(detected_kind in ('EXPENSE','INCOME','TRANSFER','REFUND','FEE','UNKNOWN')),
  constraint bank_statement_rows_review_chk check(review_status in ('AUTO','NEEDS_REVIEW','CONFIRMED','IGNORED')),
  constraint bank_statement_rows_amount_chk check(amount >= 0),
  constraint bank_statement_rows_row_uq unique(import_id,row_number)
);

create table if not exists public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  normalized_merchant text not null,
  display_name text not null,
  detected_kind text not null default 'EXPENSE',
  category_id uuid references public.budget_categories(id) on delete restrict,
  confidence numeric(5,2) not null default 100,
  confirmation_count integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_rules_kind_chk check(detected_kind in ('EXPENSE','INCOME','TRANSFER','REFUND','FEE','UNKNOWN')),
  constraint merchant_rules_owner_merchant_uq unique(user_id,normalized_merchant)
);

create index if not exists bank_statement_imports_user_created_idx on public.bank_statement_imports(user_id,created_at desc);
create index if not exists bank_statement_imports_account_idx on public.bank_statement_imports(user_id,account_id,period_end desc);
create index if not exists bank_statement_rows_import_idx on public.bank_statement_rows(import_id,row_number);
create index if not exists bank_statement_rows_review_idx on public.bank_statement_rows(user_id,review_status,transaction_date desc);
create index if not exists bank_statement_rows_merchant_idx on public.bank_statement_rows(user_id,normalized_merchant);
create index if not exists merchant_rules_lookup_idx on public.merchant_rules(user_id,is_active,normalized_merchant);

drop trigger if exists bank_statement_imports_updated_at on public.bank_statement_imports;
create trigger bank_statement_imports_updated_at before update on public.bank_statement_imports for each row execute function public.set_updated_at();
drop trigger if exists bank_statement_rows_updated_at on public.bank_statement_rows;
create trigger bank_statement_rows_updated_at before update on public.bank_statement_rows for each row execute function public.set_updated_at();
drop trigger if exists merchant_rules_updated_at on public.merchant_rules;
create trigger merchant_rules_updated_at before update on public.merchant_rules for each row execute function public.set_updated_at();

commit;
