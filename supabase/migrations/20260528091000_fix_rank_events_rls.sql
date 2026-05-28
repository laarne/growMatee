-- Fix RLS policy on rank_events table to allow authenticated users to insert their own rank events.
drop policy if exists "users can insert own rank events" on public.rank_events;
create policy "users can insert own rank events"
on public.rank_events for insert
with check (auth.uid() = user_id);
