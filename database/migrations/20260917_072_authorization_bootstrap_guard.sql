begin;

create table if not exists public.authorization_bootstrap_events (
  id uuid primary key,
  singleton_key text not null unique,
  bootstrap_user_id uuid not null references public.profiles(id) on delete restrict,
  role_assignment_id uuid not null,
  administer_grant_id uuid not null,
  token_fingerprint text not null,
  operator_reason text not null,
  created_at timestamptz not null default now(),
  constraint authorization_bootstrap_singleton_chk check (singleton_key = 'INITIAL_ADMINISTER_V1'),
  constraint authorization_bootstrap_reason_chk check (length(trim(operator_reason)) >= 20),
  constraint authorization_bootstrap_fingerprint_chk check (length(trim(token_fingerprint)) >= 16)
);

-- Bootstrap is deliberately not exposed as a database function. It is executed only
-- by the operator CLI in one transaction. The singleton row makes successful bootstrap irreversible.

commit;
