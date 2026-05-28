create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_no_self check (requester_id <> recipient_id)
);

create unique index if not exists friend_requests_unique_pair_idx
on public.friend_requests (
  least(requester_id, recipient_id),
  greatest(requester_id, recipient_id)
)
where status in ('pending', 'accepted');

create index if not exists friend_requests_recipient_status_idx
on public.friend_requests(recipient_id, status, created_at desc);

create trigger friend_requests_set_updated_at
before update on public.friend_requests
for each row execute function public.set_updated_at();

alter table public.friend_requests enable row level security;

create policy "friend request participants can read"
on public.friend_requests for select
using (auth.uid() in (requester_id, recipient_id) or public.is_admin());

create policy "users can send friend requests"
on public.friend_requests for insert
with check (auth.uid() = requester_id and requester_id <> recipient_id);

create policy "participants can update friend requests"
on public.friend_requests for update
using (auth.uid() in (requester_id, recipient_id) or public.is_admin())
with check (auth.uid() in (requester_id, recipient_id) or public.is_admin());

grant select, insert, update on public.friend_requests to authenticated;
