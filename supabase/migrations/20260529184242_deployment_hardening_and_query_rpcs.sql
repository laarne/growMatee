-- Deployment hardening and query consolidation.

-- 1) Do not let mobile clients auto-publish listings by spoofing Leafy AI fields.
drop policy if exists "verified sellers create listings" on public.listings;
create policy "verified sellers create listings"
on public.listings for insert
with check (
  (select auth.uid()) = seller_id
  and public.is_verified_seller()
  and status in ('draft', 'review')
);

-- 2) Rank events are awarded by database triggers/functions only.
drop policy if exists "users can insert own rank events" on public.rank_events;
revoke insert on public.rank_events from authenticated;
revoke insert on public.rank_events from anon;

-- 3) Direct friend chats require an accepted friendship.
create or replace function public.has_accepted_friendship(
  p_user_id uuid,
  p_other_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.requester_id = p_user_id and fr.recipient_id = p_other_user_id)
        or
        (fr.requester_id = p_other_user_id and fr.recipient_id = p_user_id)
      )
  );
$$;

revoke execute on function public.has_accepted_friendship(uuid, uuid) from public;
grant execute on function public.has_accepted_friendship(uuid, uuid) to authenticated;

create or replace function public.get_or_create_direct_conversation(
  p_other_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in before starting a conversation';
  end if;

  if p_other_user_id is null then
    raise exception 'Conversation member is required';
  end if;

  if p_other_user_id = v_user_id then
    raise exception 'You cannot message yourself';
  end if;

  if not public.has_accepted_friendship(v_user_id, p_other_user_id) then
    raise exception 'You can only message accepted friends directly';
  end if;

  select c.id
  into v_conversation_id
  from public.conversations c
  where c.type = 'friend'
    and c.listing_id is null
    and c.garden_id is null
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id = v_user_id
    )
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id = p_other_user_id
    )
  order by c.created_at asc
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (type)
  values ('friend')
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_conversation_id, v_user_id),
    (v_conversation_id, p_other_user_id);

  return v_conversation_id;
end;
$$;

revoke execute on function public.get_or_create_direct_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- 4) Transactional admin actions. These avoid partially approved sellers/listings.
create or replace function public.admin_approve_seller_application(
  p_application_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_application public.seller_applications%rowtype;
  v_applicant_name text;
  v_shop_name text;
begin
  if not public.is_admin(v_admin_id) then
    raise exception 'Admin access required';
  end if;

  select * into v_application
  from public.seller_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Seller application not found';
  end if;

  select display_name into v_applicant_name
  from public.profiles
  where id = v_application.user_id;

  v_shop_name := coalesce(nullif(trim(v_application.shop_name), ''), coalesce(v_applicant_name, 'GrowMate Seller') || '''s Plant Shop');

  update public.profiles
  set seller_status = 'verified'
  where id = v_application.user_id;

  insert into public.seller_profiles (user_id, shop_name, seller_bio)
  values (v_application.user_id, v_shop_name, v_application.reason)
  on conflict (user_id) do update
  set shop_name = excluded.shop_name,
      seller_bio = excluded.seller_bio,
      updated_at = now();

  update public.seller_applications
  set status = 'verified',
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      review_note = 'Approved for seller access.'
  where id = p_application_id;
end;
$$;

create or replace function public.admin_reject_seller_application(
  p_application_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_user_id uuid;
begin
  if not public.is_admin(v_admin_id) then
    raise exception 'Admin access required';
  end if;

  select user_id into v_user_id
  from public.seller_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Seller application not found';
  end if;

  update public.profiles
  set seller_status = 'rejected'
  where id = v_user_id;

  update public.seller_applications
  set status = 'rejected',
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      review_note = 'Seller application rejected by admin.'
  where id = p_application_id;
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
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('active', 'rejected') then
    raise exception 'Unsupported listing review status';
  end if;

  update public.listings
  set status = p_status,
      published_at = case when p_status = 'active' then now() else published_at end,
      review_note = coalesce(p_review_note, case when p_status = 'active' then 'Approved for marketplace.' else 'Listing rejected by admin.' end)
  where id = p_listing_id;

  if not found then
    raise exception 'Listing not found';
  end if;
end;
$$;

create or replace function public.admin_update_report_status(
  p_report_id uuid,
  p_status public.report_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  update public.reports
  set status = p_status
  where id = p_report_id;

  if not found then
    raise exception 'Report not found';
  end if;
end;
$$;

revoke execute on function public.admin_approve_seller_application(uuid) from public, anon;
revoke execute on function public.admin_reject_seller_application(uuid) from public, anon;
revoke execute on function public.admin_set_listing_review_status(uuid, public.listing_status, text) from public, anon;
revoke execute on function public.admin_update_report_status(uuid, public.report_status) from public, anon;
grant execute on function public.admin_approve_seller_application(uuid) to authenticated;
grant execute on function public.admin_reject_seller_application(uuid) to authenticated;
grant execute on function public.admin_set_listing_review_status(uuid, public.listing_status, text) to authenticated;
grant execute on function public.admin_update_report_status(uuid, public.report_status) to authenticated;

-- 5) Query consolidation helpers.
create or replace function public.get_unread_messages_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(unread_count), 0)::integer
  from (
    select count(m.id) as unread_count
    from public.conversation_members cm
    join public.messages m on m.conversation_id = cm.conversation_id
    where cm.user_id = auth.uid()
      and m.sender_id is distinct from auth.uid()
      and (cm.last_read_at is null or m.created_at > cm.last_read_at)
    group by cm.conversation_id
  ) counts;
$$;

create or replace function public.get_leaderboard_secure(p_limit integer default 10)
returns table (
  user_id uuid,
  display_name text,
  location text,
  avatar_url text,
  points integer
)
language sql
stable
security definer
set search_path = public
as $$
  with event_points as (
    select rank_events.user_id, sum(rank_events.points)::integer as points
    from public.rank_events
    group by rank_events.user_id
  )
  select
    p.id,
    coalesce(nullif(trim(p.display_name), ''), 'GrowMate User') as display_name,
    p.location,
    p.avatar_url,
    coalesce(ep.points, 0) as points
  from public.profiles p
  left join event_points ep on ep.user_id = p.id
  order by coalesce(ep.points, 0) desc, p.display_name asc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

revoke execute on function public.get_unread_messages_count() from public, anon;
revoke execute on function public.get_leaderboard_secure(integer) from public, anon;
grant execute on function public.get_unread_messages_count() to authenticated;
grant execute on function public.get_leaderboard_secure(integer) to authenticated;

-- Helpful indexes for the consolidated queries.
create index if not exists messages_unread_count_idx
on public.messages (conversation_id, created_at, sender_id);

create index if not exists friend_requests_pair_status_idx
on public.friend_requests (requester_id, recipient_id, status);
