create table if not exists public.plant_care_profiles (
  id uuid primary key default gen_random_uuid(),
  normalized_scientific_name text not null unique,
  provider text not null default 'Perenual',
  scientific_name text not null,
  common_name text,
  summary text,
  watering text,
  sunlight text,
  soil text,
  pruning text,
  propagation text,
  cycle text,
  growth_habit text,
  toxicity text,
  image_url text,
  raw_source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plant_care_profiles_normalized_name_not_blank check (length(trim(normalized_scientific_name)) > 0),
  constraint plant_care_profiles_provider_known check (provider in ('Perenual', 'GrowMate'))
);

alter table public.plant_care_profiles enable row level security;

drop policy if exists "Plant care profiles are readable by signed in users" on public.plant_care_profiles;
create policy "Plant care profiles are readable by signed in users"
  on public.plant_care_profiles
  for select
  to authenticated
  using (true);

drop trigger if exists plant_care_profiles_set_updated_at on public.plant_care_profiles;
create trigger plant_care_profiles_set_updated_at
  before update on public.plant_care_profiles
  for each row
  execute function public.set_updated_at();

create index if not exists plant_care_profiles_normalized_scientific_name_idx
  on public.plant_care_profiles (normalized_scientific_name);
