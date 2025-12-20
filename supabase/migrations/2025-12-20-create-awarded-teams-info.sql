-- Create the new awarded_teams_info table
create table public.awarded_teams_info (
  id uuid default gen_random_uuid() primary key,
  project_code text not null unique,
  project_title text not null,
  proposal_link text,
  round_name text,
  awarded_amount numeric,
  total_milestones integer,
  has_service boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.awarded_teams_info enable row level security;

-- Create policies
-- Allow everyone to read (public access for the portal)
create policy "Allow public read access"
  on public.awarded_teams_info
  for select
  to public
  using (true);

-- Allow authenticated users (admins) to insert/update/delete
-- Adjust this policy based on your specific auth roles if needed
create policy "Allow authenticated insert"
  on public.awarded_teams_info
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update"
  on public.awarded_teams_info
  for update
  to authenticated
  using (true);

create policy "Allow authenticated delete"
  on public.awarded_teams_info
  for delete
  to authenticated
  using (true);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at
  before update on public.awarded_teams_info
  for each row
  execute procedure public.handle_updated_at();
