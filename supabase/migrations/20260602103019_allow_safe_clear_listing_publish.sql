-- Allow clear Leafy AI listings to publish immediately while regulated/low-confidence
-- listings still stay in review or blocked by the database trigger.

drop policy if exists "verified sellers create listings" on public.listings;
create policy "verified sellers create listings"
on public.listings for insert
to authenticated
with check (
  (select auth.uid()) = seller_id
  and public.is_verified_seller()
  and (
    status in ('draft', 'review')
    or (
      status = 'active'
      and coalesce(ai_provider, '') <> ''
      and coalesce(ai_confidence, 0) >= 35
      and ai_result->>'saleStatus' = 'safe_to_sell'
      and coalesce(ai_result->>'regulationStatus', '') = ''
      and permit_review_status = 'not_required'
    )
  )
);

drop policy if exists "sellers update own listings" on public.listings;
create policy "sellers update own listings"
on public.listings for update
to authenticated
using ((select auth.uid()) = seller_id or public.is_admin())
with check (
  public.is_admin()
  or (
    (select auth.uid()) = seller_id
    and status in ('draft', 'review', 'needs_more_documents', 'archived')
    and permit_review_status in ('not_required', 'required', 'submitted', 'needs_more_documents')
  )
);
