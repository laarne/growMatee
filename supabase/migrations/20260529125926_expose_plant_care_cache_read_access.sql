grant usage on schema public to authenticated;
grant select on table public.plant_care_cache to authenticated;

drop policy if exists "Plant care cache is readable by signed in users" on public.plant_care_cache;
create policy "Plant care cache is readable by signed in users"
  on public.plant_care_cache
  for select
  to authenticated
  using (true);
