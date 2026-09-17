begin;

create table if not exists public.conversation_threads (
  id uuid primary key,
  user_id uuid not null references auth.user(id) on delete cascade,
  room_key text not null,
  title text not null,
  subtitle text,
  room_kind text not null,
  status text not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, room_key)
);

create index if not exists idx_conversation_threads_user_updated on public.conversation_threads(user_id, updated_at desc);

create table if not exists public.conversation_participants (
  id uuid primary key,
  thread_id uuid not null references public.conversation_threads(id) on delete cascade,
  participant_key text not null,
  display_name text not null,
  participant_type text not null,
  role_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(thread_id, participant_key)
);

create table if not exists public.conversation_messages (
  id uuid primary key,
  thread_id uuid not null references public.conversation_threads(id) on delete cascade,
  user_id uuid not null references auth.user(id) on delete cascade,
  sender_type text not null check (sender_type in ('user','agent','system')),
  sender_key text,
  sender_name text not null,
  message_kind text not null default 'message' check (message_kind in ('message','risk','decision','recommendation','followup','request')),
  body text not null,
  structured_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_messages_thread_created on public.conversation_messages(thread_id, created_at asc);
create index if not exists idx_conversation_messages_user_created on public.conversation_messages(user_id, created_at desc);

create table if not exists public.conversation_attachments (
  id uuid primary key,
  thread_id uuid not null references public.conversation_threads(id) on delete cascade,
  message_id uuid references public.conversation_messages(id) on delete set null,
  user_id uuid not null references auth.user(id) on delete cascade,
  file_name text not null,
  content_type text,
  storage_key text not null,
  verification_status text not null default 'PENDING_REVIEW',
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_links (
  id uuid primary key,
  thread_id uuid not null references public.conversation_threads(id) on delete cascade,
  message_id uuid references public.conversation_messages(id) on delete set null,
  link_type text not null check (link_type in ('decision','recommendation','followup','case','transaction','goal','obligation')),
  entity_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_links_thread on public.conversation_links(thread_id, link_type);

commit;
