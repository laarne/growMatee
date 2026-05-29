create table if not exists public.missing_plant_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  normalized_query text not null,
  original_query text,
  reason text not null,
  source text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint missing_plant_requests_normalized_query_not_blank check (length(trim(normalized_query)) >= 3),
  constraint missing_plant_requests_status_known check (status in ('open', 'resolved', 'ignored'))
);

create table if not exists public.api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null,
  endpoint text not null,
  normalized_query text,
  source text,
  status text not null,
  status_code integer,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.missing_plant_requests enable row level security;
alter table public.api_usage_logs enable row level security;

create index if not exists missing_plant_requests_normalized_query_idx
  on public.missing_plant_requests (normalized_query);

create index if not exists missing_plant_requests_created_at_idx
  on public.missing_plant_requests (created_at);

create index if not exists api_usage_logs_perenual_daily_idx
  on public.api_usage_logs (provider, endpoint, status, created_at);

create index if not exists api_usage_logs_user_daily_idx
  on public.api_usage_logs (user_id, provider, endpoint, status, created_at);

drop policy if exists "admins read missing plant requests" on public.missing_plant_requests;
create policy "admins read missing plant requests"
  on public.missing_plant_requests
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins read api usage logs" on public.api_usage_logs;
create policy "admins read api usage logs"
  on public.api_usage_logs
  for select
  to authenticated
  using (public.is_admin());
