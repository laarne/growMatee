create table if not exists public.plant_care_cache (
  id uuid primary key default gen_random_uuid(),
  normalized_scientific_name text not null unique,
  normalized_common_name text,
  provider text not null default 'Perenual',
  common_name text,
  scientific_name text not null,
  perenual_id integer,
  sunlight text,
  watering text,
  soil text,
  fertilizer text,
  pruning text,
  humidity text,
  care_level text,
  description text,
  image_url text,
  raw_perenual_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plant_care_cache_normalized_name_not_blank check (length(trim(normalized_scientific_name)) > 0),
  constraint plant_care_cache_provider_known check (provider in ('Perenual', 'GrowMate'))
);

alter table public.plant_care_cache enable row level security;

drop policy if exists "Plant care cache is readable by signed in users" on public.plant_care_cache;
create policy "Plant care cache is readable by signed in users"
  on public.plant_care_cache
  for select
  to authenticated
  using (true);

drop trigger if exists plant_care_cache_set_updated_at on public.plant_care_cache;
create trigger plant_care_cache_set_updated_at
  before update on public.plant_care_cache
  for each row
  execute function public.set_updated_at();

create index if not exists plant_care_cache_common_name_idx
  on public.plant_care_cache (normalized_common_name);

create index if not exists plant_care_cache_perenual_id_idx
  on public.plant_care_cache (perenual_id);

insert into public.plant_care_cache (
  normalized_scientific_name,
  normalized_common_name,
  provider,
  common_name,
  scientific_name,
  sunlight,
  watering,
  soil,
  pruning,
  care_level,
  description,
  image_url,
  raw_perenual_json,
  created_at,
  updated_at
)
select
  normalized_scientific_name,
  lower(regexp_replace(coalesce(common_name, ''), '[^a-z0-9\s-]', '', 'g')),
  provider,
  common_name,
  scientific_name,
  sunlight,
  watering,
  soil,
  pruning,
  growth_habit,
  summary,
  image_url,
  raw_source,
  created_at,
  updated_at
from public.plant_care_profiles
on conflict (normalized_scientific_name) do nothing;
