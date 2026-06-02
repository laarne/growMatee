-- Add private DENR/CITES permit uploads for regulated plant listing reviews.

alter table public.listings
add column if not exists permit_document_url text,
add column if not exists permit_document_path text,
add column if not exists permit_uploaded_at timestamptz,
add column if not exists permit_review_status text not null default 'not_required',
add column if not exists permit_review_notes text;

alter table public.listings
drop constraint if exists listings_permit_review_status_check;

alter table public.listings
add constraint listings_permit_review_status_check
check (
  permit_review_status in (
    'not_required',
    'required',
    'submitted',
    'approved',
    'rejected',
    'needs_more_documents'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'regulated-plant-permits',
  'regulated-plant-permits',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "regulated permit docs owner/admin readable" on storage.objects;
create policy "regulated permit docs owner/admin readable"
on storage.objects for select
to authenticated
using (
  bucket_id = 'regulated-plant-permits'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or public.is_admin())
);

drop policy if exists "sellers upload own regulated permit docs" on storage.objects;
create policy "sellers upload own regulated permit docs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'regulated-plant-permits'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and public.is_verified_seller()
);

drop policy if exists "sellers replace own regulated permit docs" on storage.objects;
create policy "sellers replace own regulated permit docs"
on storage.objects for update
to authenticated
using (
  bucket_id = 'regulated-plant-permits'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'regulated-plant-permits'
  and (select auth.uid())::text = (storage.foldername(name))[1]
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
  v_has_permit boolean := nullif(trim(coalesce(new.permit_document_path, '')), '') is not null;
begin
  if not v_is_admin and tg_op = 'UPDATE' then
    new.ai_result := old.ai_result;
    new.ai_provider := old.ai_provider;
    new.ai_confidence := old.ai_confidence;
    new.review_note := old.review_note;
    new.permit_review_notes := old.permit_review_notes;

    if old.permit_review_status in ('approved', 'rejected') then
      new.permit_review_status := old.permit_review_status;
    end if;
  end if;

  if v_sale_status = 'blocked' or v_regulation_status = 'illegal' then
    new.status := 'blocked';
    new.published_at := null;
    new.permit_review_status := 'not_required';
    new.review_note := coalesce(new.review_note, 'Blocked by GrowMate regulated plant check.');
  elsif not v_is_admin and (v_sale_status = 'review_required' or v_regulation_status in ('needs_permit', 'needs_review')) then
    new.status := case
      when new.status = 'needs_more_documents' then 'needs_more_documents'::public.listing_status
      else 'review'::public.listing_status
    end;
    new.published_at := null;

    if v_regulation_status = 'needs_permit' then
      new.permit_review_status := case when v_has_permit then 'submitted' else 'required' end;
    elsif v_has_permit then
      new.permit_review_status := 'submitted';
    else
      new.permit_review_status := 'not_required';
    end if;

    new.review_note := coalesce(new.review_note, 'Pending admin review for regulated plant compliance.');
  elsif not v_is_admin and new.status = 'active' and (v_sale_status <> 'safe_to_sell' or coalesce(new.ai_confidence, 0) < 35) then
    new.status := 'review';
    new.published_at := null;
    new.permit_review_status := case when v_has_permit then 'submitted' else 'not_required' end;
    new.review_note := coalesce(new.review_note, 'Pending admin review before publication.');
  elsif not v_is_admin and new.permit_review_status not in ('approved', 'rejected') then
    new.permit_review_status := case when v_has_permit then 'submitted' else 'not_required' end;
  end if;

  return new;
end;
$$;

create or replace function public.admin_set_listing_review_status(
  p_listing_id uuid,
  p_status public.listing_status,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings%rowtype;
  v_permit_required boolean;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('active', 'rejected', 'blocked', 'needs_more_documents') then
    raise exception 'Unsupported listing review status';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  v_permit_required := coalesce(v_listing.ai_result->>'regulationStatus', '') = 'needs_permit'
    or v_listing.permit_review_status in ('required', 'submitted', 'needs_more_documents');

  if p_status = 'active' and coalesce(v_listing.ai_result->>'regulationStatus', '') = 'illegal' then
    raise exception 'Illegal listing cannot be approved';
  end if;

  if p_status = 'active' and v_permit_required and nullif(trim(coalesce(v_listing.permit_document_path, '')), '') is null then
    raise exception 'Permit document is required before approval';
  end if;

  update public.listings
  set status = p_status,
      published_at = case when p_status = 'active' then now() else null end,
      review_note = coalesce(p_review_note, case
        when p_status = 'active' then 'Approved for marketplace.'
        when p_status = 'needs_more_documents' then 'More permit documents requested by admin.'
        when p_status = 'blocked' then 'Listing blocked by admin.'
        else 'Listing rejected by admin.'
      end),
      permit_review_status = case
        when p_status = 'active' and v_permit_required then 'approved'
        when p_status = 'rejected' then 'rejected'
        when p_status = 'blocked' then 'rejected'
        when p_status = 'needs_more_documents' then 'needs_more_documents'
        else permit_review_status
      end,
      permit_review_notes = case
        when p_status in ('rejected', 'blocked', 'needs_more_documents') then p_review_note
        else permit_review_notes
      end
  where id = p_listing_id;
end;
$$;

revoke execute on function public.admin_set_listing_review_status(uuid, public.listing_status, text) from public, anon;
grant execute on function public.admin_set_listing_review_status(uuid, public.listing_status, text) to authenticated;
