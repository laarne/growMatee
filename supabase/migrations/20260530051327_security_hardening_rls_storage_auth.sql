-- Close remaining client-side authorization gaps found in the deployment audit.

-- Friend request status transitions must be performed through a checked RPC.
drop policy if exists "participants can update friend requests" on public.friend_requests;
revoke update on public.friend_requests from authenticated;

create or replace function public.respond_to_friend_request(
  p_request_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.friend_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in before updating a friend request';
  end if;

  if p_status not in ('accepted', 'declined', 'cancelled') then
    raise exception 'Unsupported friend request status';
  end if;

  select *
  into v_request
  from public.friend_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Friend request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending friend requests can be changed';
  end if;

  if p_status in ('accepted', 'declined') and v_request.recipient_id <> v_user_id then
    raise exception 'Only the recipient can accept or decline a friend request';
  end if;

  if p_status = 'cancelled' and v_request.requester_id <> v_user_id then
    raise exception 'Only the requester can cancel a friend request';
  end if;

  update public.friend_requests
  set status = p_status,
      updated_at = now()
  where id = p_request_id;
end;
$$;

revoke execute on function public.respond_to_friend_request(uuid, text) from public, anon;
grant execute on function public.respond_to_friend_request(uuid, text) to authenticated;

-- Reviews must target the actual order counterparty.
drop policy if exists "order participants create reviews" on public.reviews;
create policy "order participants create counterparty reviews"
on public.reviews for insert
with check (
  auth.uid() = reviewer_id
  and exists (
    select 1
    from public.orders
    where orders.id = reviews.order_id
      and orders.status = 'completed'
      and (
        (auth.uid() = orders.buyer_id and reviews.reviewee_id = orders.seller_id)
        or
        (auth.uid() = orders.seller_id and reviews.reviewee_id = orders.buyer_id)
      )
  )
);

-- Listing photos must belong to a listing owned by the current seller.
drop policy if exists "sellers manage own listing photos" on public.listing_photos;
create policy "sellers insert own listing photos"
on public.listing_photos for insert
with check (
  exists (
    select 1
    from public.listings
    where listings.id = listing_photos.listing_id
      and listings.seller_id = auth.uid()
      and listing_photos.seller_id = listings.seller_id
  )
  or public.is_admin()
);

create policy "sellers update own listing photos"
on public.listing_photos for update
using (
  exists (
    select 1
    from public.listings
    where listings.id = listing_photos.listing_id
      and listings.seller_id = auth.uid()
      and listing_photos.seller_id = listings.seller_id
  )
  or public.is_admin()
)
with check (
  exists (
    select 1
    from public.listings
    where listings.id = listing_photos.listing_id
      and listings.seller_id = auth.uid()
      and listing_photos.seller_id = listings.seller_id
  )
  or public.is_admin()
);

create policy "sellers delete own listing photos"
on public.listing_photos for delete
using (
  exists (
    select 1
    from public.listings
    where listings.id = listing_photos.listing_id
      and listings.seller_id = auth.uid()
      and listing_photos.seller_id = listings.seller_id
  )
  or public.is_admin()
);

-- Garden children must point to gardens/plants owned by the authenticated user.
drop policy if exists "users manage own garden plants" on public.garden_plants;
create policy "users insert own garden plants"
on public.garden_plants for insert
with check (
  exists (
    select 1
    from public.gardens
    where gardens.id = garden_plants.garden_id
      and gardens.user_id = auth.uid()
      and garden_plants.user_id = gardens.user_id
  )
  or public.is_admin()
);

create policy "users update own garden plants"
on public.garden_plants for update
using (auth.uid() = user_id or public.is_admin())
with check (
  exists (
    select 1
    from public.gardens
    where gardens.id = garden_plants.garden_id
      and gardens.user_id = auth.uid()
      and garden_plants.user_id = gardens.user_id
  )
  or public.is_admin()
);

create policy "users delete own garden plants"
on public.garden_plants for delete
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "users manage own garden plant photos" on public.garden_plant_photos;
create policy "users insert own garden plant photos"
on public.garden_plant_photos for insert
with check (
  exists (
    select 1
    from public.garden_plants
    where garden_plants.id = garden_plant_photos.garden_plant_id
      and garden_plants.user_id = auth.uid()
      and garden_plant_photos.user_id = garden_plants.user_id
  )
  or public.is_admin()
);

create policy "users update own garden plant photos"
on public.garden_plant_photos for update
using (auth.uid() = user_id or public.is_admin())
with check (
  exists (
    select 1
    from public.garden_plants
    where garden_plants.id = garden_plant_photos.garden_plant_id
      and garden_plants.user_id = auth.uid()
      and garden_plant_photos.user_id = garden_plants.user_id
  )
  or public.is_admin()
);

create policy "users delete own garden plant photos"
on public.garden_plant_photos for delete
using (auth.uid() = user_id or public.is_admin());

-- Feed posts cannot link themselves to another user's private garden plant.
drop policy if exists "users manage own feed posts" on public.feed_posts;
create policy "users insert own feed posts"
on public.feed_posts for insert
with check (
  auth.uid() = user_id
  and (
    garden_plant_id is null
    or exists (
      select 1
      from public.garden_plants
      where garden_plants.id = feed_posts.garden_plant_id
        and garden_plants.user_id = auth.uid()
    )
  )
);

create policy "users update own feed posts"
on public.feed_posts for update
using (auth.uid() = user_id or public.is_admin())
with check (
  public.is_admin()
  or (
    auth.uid() = user_id
    and (
      garden_plant_id is null
      or exists (
        select 1
        from public.garden_plants
        where garden_plants.id = feed_posts.garden_plant_id
          and garden_plants.user_id = auth.uid()
      )
    )
  )
);

create policy "users delete own feed posts"
on public.feed_posts for delete
using (auth.uid() = user_id or public.is_admin());

-- Users can submit applications/reports, but cannot set workflow fields.
drop policy if exists "users can create own seller application" on public.seller_applications;
create policy "users can create own pending seller application"
on public.seller_applications for insert
with check (
  auth.uid() = user_id
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and review_note is null
);

drop policy if exists "users create reports" on public.reports;
create policy "users create open reports"
on public.reports for insert
with check (
  auth.uid() = reporter_id
  and status = 'open'
  and (listing_id is not null or post_id is not null or reported_user_id is not null)
);

-- Enforce upload limits server-side at the Storage bucket layer.
update storage.buckets
set
  file_size_limit = 6291456,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('avatars', 'listing-photos', 'garden-photos', 'feed-photos', 'verification-docs');
