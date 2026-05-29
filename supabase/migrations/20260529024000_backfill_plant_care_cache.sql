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
