-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Chat sessions table
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  assignment_id text not null,
  team_id text not null,
  reviewer_id text not null,
  status text not null check (status in ('active','paused','ended')),
  created_at timestamptz not null default now(),
  last_activity timestamptz not null default now(),
  created_by text,
  ended_at timestamptz,
  ended_by text,
  share_token text unique,
  share_expires_at timestamptz
);

-- Optional FK to assignments if table exists
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'team_reviewer_assignment'
  ) then
    -- Use quoted identifiers because existing columns use spaces
    execute 'alter table public.chat_sessions
             add constraint fk_chat_assignment
             foreign key (assignment_id)
             references public."team_reviewer_assignment"("ID")
             on delete restrict';
  end if;
end $$;

create index if not exists idx_chat_sessions_session_id on public.chat_sessions (session_id);
create index if not exists idx_chat_sessions_assignment_id on public.chat_sessions (assignment_id);
create index if not exists idx_chat_sessions_status on public.chat_sessions (status);
create index if not exists idx_chat_sessions_last_activity on public.chat_sessions (last_activity desc);

-- Chat messages table
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  assignment_id text,
  sender_id text not null,
  sender_type text not null check (sender_type in ('team','reviewer','admin')),
  sender_name text,
  sender_role text,
  message text,
  message_type text default 'text',
  file_url text,
  file_name text,
  file_type text,
  file_size bigint,
  timestamp timestamptz not null default now(),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.chat_messages
  add constraint fk_messages_session
  foreign key (session_id)
  references public.chat_sessions(session_id)
  on delete cascade;

create index if not exists idx_chat_messages_session on public.chat_messages (session_id);
create index if not exists idx_chat_messages_timestamp on public.chat_messages (timestamp);