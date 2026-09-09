begin;

alter table public.internal_funding_cases
  add column if not exists target_category_id uuid references public.budget_categories(id) on delete set null,
  add column if not exists max_monthly_repayment numeric(18,2);

alter table public.internal_funding_cases drop constraint if exists internal_funding_cases_type_chk;
alter table public.internal_funding_cases add constraint internal_funding_cases_type_chk
  check (case_type in ('TRIP','GOAL','URGENT','CATEGORY','OTHER'));

alter table public.internal_funding_cases drop constraint if exists internal_funding_cases_max_monthly_repayment_chk;
alter table public.internal_funding_cases add constraint internal_funding_cases_max_monthly_repayment_chk
  check (max_monthly_repayment is null or max_monthly_repayment > 0);

create index if not exists internal_funding_cases_target_category_idx
  on public.internal_funding_cases(user_id,target_category_id,status)
  where target_category_id is not null;

commit;
