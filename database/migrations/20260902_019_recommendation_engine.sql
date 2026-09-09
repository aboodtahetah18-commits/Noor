begin;
create index if not exists recommendations_cycle_status_priority_idx on public.recommendations(user_id,cycle_id,status,priority,created_at desc);
create index if not exists recommendations_reason_idx on public.recommendations(user_id,cycle_id,reason_code,status);
commit;
