begin;

alter table public.internal_funding_restructuring_events
  drop constraint if exists internal_funding_restructuring_events_type_chk;

alter table public.internal_funding_restructuring_events
  add constraint internal_funding_restructuring_events_type_chk
    check (event_type in (
      'REQUESTED','APPROVED','EVIDENCE_SUBMITTED','EVIDENCE_REJECTED','APPLIED','REJECTED','CANCELLED'
    ));

commit;
