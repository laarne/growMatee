-- Harden regulated plant matching and enforce review status server-side.

alter table public.regulated_plant_rules
add column if not exists normalized_binomial text;

create or replace function public.regulated_rule_binomial(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null then null
    when array_length(regexp_split_to_array(trim(value), '\s+'), 1) >= 2 then
      (regexp_split_to_array(trim(value), '\s+'))[1] || ' ' || (regexp_split_to_array(trim(value), '\s+'))[2]
    else null
  end;
$$;

update public.regulated_plant_rules
set normalized_binomial = public.regulated_rule_binomial(normalized_taxon_name)
where normalized_binomial is null;

create index if not exists regulated_plant_rules_normalized_binomial_idx
on public.regulated_plant_rules (normalized_binomial)
where active and normalized_binomial is not null;

update public.regulated_plant_rules
set status = 'needs_review',
    notes = left(notes || ' OCR/extraction artifact requires admin verification.', 500)
where source_document = 'DAO-2026-20'
  and active
  and (
    taxon_name ~ '[/?"]'
    or normalized_taxon_name ~ '\m(sp|spp|species)\M'
  );

create or replace function public.enforce_listing_regulation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_status text := coalesce(new.ai_result->>'saleStatus', '');
  v_regulation_status text := coalesce(new.ai_result->>'regulationStatus', '');
  v_is_admin boolean := public.is_admin(auth.uid());
begin
  if v_sale_status = 'blocked' or v_regulation_status = 'illegal' then
    new.status := 'blocked';
    new.published_at := null;
    new.review_note := coalesce(new.review_note, 'Blocked by GrowMate regulated plant check.');
  elsif not v_is_admin and (v_sale_status = 'review_required' or v_regulation_status in ('needs_permit', 'needs_review')) then
    new.status := 'review';
    new.published_at := null;
    new.review_note := coalesce(new.review_note, 'Pending admin review for regulated plant compliance.');
  elsif not v_is_admin and new.status = 'active' and (v_sale_status <> 'safe_to_sell' or coalesce(new.ai_confidence, 0) < 35) then
    new.status := 'review';
    new.published_at := null;
    new.review_note := coalesce(new.review_note, 'Pending admin review before publication.');
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_listing_regulation_status on public.listings;
create trigger enforce_listing_regulation_status
before insert or update of status, ai_result, ai_confidence on public.listings
for each row execute function public.enforce_listing_regulation_status();
