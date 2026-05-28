-- SECURITY DEFINER RPCs are intentionally callable by signed-in app users only.
-- Revoke the default PUBLIC execute grant so anonymous users cannot call them
-- through the REST RPC endpoint.

revoke execute on function public.create_order_for_listing(uuid, integer, text) from public;
revoke execute on function public.update_order_status_secure(uuid, public.order_status) from public;
revoke execute on function public.get_or_create_market_conversation(uuid) from public;
revoke execute on function public.get_or_create_direct_conversation(uuid) from public;
revoke execute on function public.current_user_is_conversation_member(uuid) from public;
revoke execute on function public.mark_conversation_read(uuid) from public;
revoke execute on function public.send_message_secure(uuid, text, text) from public;

grant execute on function public.create_order_for_listing(uuid, integer, text) to authenticated;
grant execute on function public.update_order_status_secure(uuid, public.order_status) to authenticated;
grant execute on function public.get_or_create_market_conversation(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.current_user_is_conversation_member(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.send_message_secure(uuid, text, text) to authenticated;
