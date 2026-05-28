revoke all on public.friend_requests from anon;
revoke all on public.friend_requests from authenticated;

grant select, insert, update on public.friend_requests to authenticated;
