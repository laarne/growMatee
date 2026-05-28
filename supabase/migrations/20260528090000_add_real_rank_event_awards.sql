-- Award ranking XP from real user actions instead of seeded/mock data.

create or replace function public.award_rank_event(
  p_user_id uuid,
  p_source text,
  p_points integer,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_source is null or p_points <= 0 then
    return;
  end if;

  insert into public.rank_events (user_id, source, points, metadata)
  select p_user_id, p_source, p_points, coalesce(p_metadata, '{}'::jsonb)
  where not exists (
    select 1
    from public.rank_events
    where user_id = p_user_id
      and source = p_source
      and metadata = coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.award_rank_event(uuid, text, integer, jsonb) from anon, authenticated;

create or replace function public.award_garden_plant_rank_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_rank_event(
    new.user_id,
    'garden_plant_added',
    3,
    jsonb_build_object('garden_plant_id', new.id, 'plant', new.name)
  );
  return new;
end;
$$;

create or replace function public.award_listing_rank_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_rank_event(
    new.seller_id,
    'listing_created',
    10,
    jsonb_build_object('listing_id', new.id, 'listing', new.name)
  );
  return new;
end;
$$;

create or replace function public.award_feed_post_rank_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_rank_event(
    new.user_id,
    'post_created',
    5,
    jsonb_build_object('post_id', new.id, 'type', new.type)
  );
  return new;
end;
$$;

create or replace function public.award_order_rank_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    perform public.award_rank_event(
      new.buyer_id,
      'purchase_completed',
      25,
      jsonb_build_object('order_id', new.id, 'listing_id', new.listing_id)
    );

    perform public.award_rank_event(
      new.seller_id,
      'sale_completed',
      25,
      jsonb_build_object('order_id', new.id, 'listing_id', new.listing_id)
    );
  end if;

  return new;
end;
$$;

create or replace function public.award_review_rank_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_rank_event(
    new.reviewer_id,
    'review_created',
    15,
    jsonb_build_object('review_id', new.id, 'order_id', new.order_id)
  );

  perform public.award_rank_event(
    new.reviewee_id,
    'review_received',
    15,
    jsonb_build_object('review_id', new.id, 'order_id', new.order_id)
  );

  return new;
end;
$$;

revoke execute on function public.award_garden_plant_rank_event() from anon, authenticated;
revoke execute on function public.award_listing_rank_event() from anon, authenticated;
revoke execute on function public.award_feed_post_rank_event() from anon, authenticated;
revoke execute on function public.award_order_rank_events() from anon, authenticated;
revoke execute on function public.award_review_rank_events() from anon, authenticated;

drop trigger if exists garden_plants_award_rank_event on public.garden_plants;
create trigger garden_plants_award_rank_event
after insert on public.garden_plants
for each row execute function public.award_garden_plant_rank_event();

drop trigger if exists listings_award_rank_event on public.listings;
create trigger listings_award_rank_event
after insert on public.listings
for each row execute function public.award_listing_rank_event();

drop trigger if exists feed_posts_award_rank_event on public.feed_posts;
create trigger feed_posts_award_rank_event
after insert on public.feed_posts
for each row execute function public.award_feed_post_rank_event();

drop trigger if exists orders_award_rank_events on public.orders;
create trigger orders_award_rank_events
after insert or update of status on public.orders
for each row execute function public.award_order_rank_events();

drop trigger if exists reviews_award_rank_events on public.reviews;
create trigger reviews_award_rank_events
after insert on public.reviews
for each row execute function public.award_review_rank_events();

select public.award_rank_event(
  user_id,
  'garden_plant_added',
  3,
  jsonb_build_object('garden_plant_id', id, 'plant', name)
)
from public.garden_plants;

select public.award_rank_event(
  seller_id,
  'listing_created',
  10,
  jsonb_build_object('listing_id', id, 'listing', name)
)
from public.listings;

select public.award_rank_event(
  user_id,
  'post_created',
  5,
  jsonb_build_object('post_id', id, 'type', type)
)
from public.feed_posts;

select public.award_rank_event(
  buyer_id,
  'purchase_completed',
  25,
  jsonb_build_object('order_id', id, 'listing_id', listing_id)
)
from public.orders
where status = 'completed';

select public.award_rank_event(
  seller_id,
  'sale_completed',
  25,
  jsonb_build_object('order_id', id, 'listing_id', listing_id)
)
from public.orders
where status = 'completed';

select public.award_rank_event(
  reviewer_id,
  'review_created',
  15,
  jsonb_build_object('review_id', id, 'order_id', order_id)
)
from public.reviews;

select public.award_rank_event(
  reviewee_id,
  'review_received',
  15,
  jsonb_build_object('review_id', id, 'order_id', order_id)
)
from public.reviews;
