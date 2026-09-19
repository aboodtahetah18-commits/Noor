begin;

create table if not exists public.conversation_attachment_blobs (
  attachment_id uuid primary key references public.conversation_attachments(id) on delete cascade,
  content bytea not null,
  byte_size integer not null check (byte_size > 0),
  sha256 text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_attachment_blobs_sha256
  on public.conversation_attachment_blobs(sha256);

commit;
