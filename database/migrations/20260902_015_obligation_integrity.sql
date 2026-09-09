begin;

create unique index if not exists obligation_occurrences_template_due_uq
  on public.obligation_occurrences(user_id,template_id,due_date);

create index if not exists obligation_templates_user_active_idx
  on public.obligation_templates(user_id,is_active,name);

create index if not exists obligation_occurrences_reserved_due_idx
  on public.obligation_occurrences(user_id,is_reserved,due_date)
  where status in ('UPCOMING','DUE','OVERDUE');

create index if not exists transactions_obligation_occurrence_idx
  on public.transactions(user_id,obligation_occurrence_id)
  where obligation_occurrence_id is not null;

commit;
