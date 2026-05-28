-- Pre-deploy hardening for Leafy usage, listing auto-publish, and message timestamps.

create table if not exists public.leafy_chat_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  messaged_at timestamptz not null default now()
);

create index if not exists leafy_chat_events_user_messaged_at_idx
on public.leafy_chat_events (user_id, messaged_at desc);

alter table public.leafy_chat_events enable row level security;

drop policy if exists "users read own leafy chat events" on public.leafy_chat_events;
create policy "users read own leafy chat events"
on public.leafy_chat_events for select
using ((select auth.uid()) = user_id);

drop policy if exists "users create own leafy chat events" on public.leafy_chat_events;
create policy "users create own leafy chat events"
on public.leafy_chat_events for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "verified sellers create listings" on public.listings;
create policy "verified sellers create listings"
on public.listings for insert
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
    )
  )
);

create or replace function public.send_message_secure(
  p_conversation_id uuid,
  p_body text,
  p_image_url text default null
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  body text,
  image_url text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_body text := left(nullif(trim(coalesce(p_body, '')), ''), 2000);
  v_image_url text := left(nullif(trim(coalesce(p_image_url, '')), ''), 2000);
begin
  if v_user_id is null then
    raise exception 'Sign in before sending a message';
  end if;

  if v_body is null then
    raise exception 'Message cannot be empty';
  end if;

  if not public.current_user_is_conversation_member(p_conversation_id) then
    raise exception 'You are not part of this conversation';
  end if;

  return query
  insert into public.messages (conversation_id, sender_id, body, image_url)
  values (p_conversation_id, v_user_id, v_body, v_image_url)
  returning messages.id, messages.conversation_id, messages.sender_id, messages.body, messages.image_url, messages.created_at;

  update public.conversations
  set updated_at = now()
  where conversations.id = p_conversation_id;
end;
$$;

revoke execute on function public.send_message_secure(uuid, text, text) from public;
grant execute on function public.send_message_secure(uuid, text, text) to authenticated;
