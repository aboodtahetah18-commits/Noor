begin;

create or replace function public.apply_authorization_provisioning_with_sod(
  p_request_id uuid,
  p_actor_user_id uuid
)
returns text
language plpgsql
security invoker
as $$
declare
  r public.authorization_provisioning_requests%rowtype;
begin
  select * into r
  from public.authorization_provisioning_requests
  where id=p_request_id
  for update;

  if not found then raise exception 'PROVISIONING_REQUEST_NOT_FOUND'; end if;
  if r.status <> 'APPROVED' then raise exception 'PROVISIONING_REQUEST_NOT_APPROVED'; end if;
  if r.approved_by is null then raise exception 'PROVISIONING_APPROVAL_REQUIRED'; end if;
  if p_actor_user_id = r.requested_by then raise exception 'PROVISIONING_APPLIER_MUST_DIFFER_FROM_REQUESTER'; end if;
  if p_actor_user_id = r.approved_by then raise exception 'PROVISIONING_APPLIER_MUST_DIFFER_FROM_APPROVER'; end if;

  return public.apply_authorization_provisioning(p_request_id,p_actor_user_id);
end;
$$;

comment on function public.apply_authorization_provisioning_with_sod(uuid,uuid) is
  'Atomic provisioning apply enforcing Requester != Approver != Applier.';

commit;
