-- The anon role had explicit EXECUTE grants on app RPC functions.
-- Keep these endpoints available only after Supabase Auth signs a user in.

revoke execute on function public.create_order_for_listing(uuid, integer, text) from anon;
revoke execute on function public.update_order_status_secure(uuid, public.order_status) from anon;
revoke execute on function public.get_or_create_market_conversation(uuid) from anon;
revoke execute on function public.get_or_create_direct_conversation(uuid) from anon;
revoke execute on function public.current_user_is_conversation_member(uuid) from anon;
revoke execute on function public.mark_conversation_read(uuid) from anon;
revoke execute on function public.send_message_secure(uuid, text, text) from anon;
