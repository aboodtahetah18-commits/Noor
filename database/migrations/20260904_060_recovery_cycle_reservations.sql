begin;

alter table public.internal_funding_recovery_schedule
  add column if not exists due_cycle_id uuid references public.financial_cycles(id) on delete restrict,
  add column if not exists due_assigned_at timestamptz;

create index if not exists internal_funding_recovery_schedule_due_cycle_idx
  on public.internal_funding_recovery_schedule(user_id,due_cycle_id,status,source_id,installment_number);

commit;
