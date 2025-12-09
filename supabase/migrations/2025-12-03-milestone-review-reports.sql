create extension if not exists pgcrypto;

create table if not exists public.milestone_review_reports (
  id uuid primary key default gen_random_uuid(),
  reviewer_id text,
  reviewer_username text,
  reviewer_handle text,
  proposal_id text,
  proposal_title text,
  milestone_title text,
  milestone_number text,
  milestone_budget text,
  date text,
  verdict text,
  document_id text not null,
  document_url text not null,
  folder_id text not null,
  report_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_mrr_document_id_unique
  on public.milestone_review_reports (document_id);

create index if not exists idx_mrr_created_at
  on public.milestone_review_reports (created_at);

create index if not exists idx_mrr_reviewer
  on public.milestone_review_reports (reviewer_id, reviewer_handle);

create index if not exists idx_mrr_proposal_milestone
  on public.milestone_review_reports (proposal_id, milestone_number);

alter table public.milestone_review_reports enable row level security;

create policy mrr_select_authenticated
  on public.milestone_review_reports
  for select
  to authenticated
  using (true);
