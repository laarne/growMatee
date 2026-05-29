-- Keep internal trigger/helper SECURITY DEFINER functions away from REST RPC callers.
revoke execute on function public.award_rank_event(uuid, text, integer, jsonb) from public, anon, authenticated;
revoke execute on function public.award_garden_plant_rank_event() from public, anon, authenticated;
revoke execute on function public.award_listing_rank_event() from public, anon, authenticated;
revoke execute on function public.award_feed_post_rank_event() from public, anon, authenticated;
revoke execute on function public.award_order_rank_events() from public, anon, authenticated;
revoke execute on function public.award_review_rank_events() from public, anon, authenticated;

revoke execute on function public.has_accepted_friendship(uuid, uuid) from public, anon, authenticated;
