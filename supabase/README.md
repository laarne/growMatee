# GrowMate Supabase Database

Run the migration in:

Supabase Dashboard -> SQL Editor -> New query

Paste and run:

`supabase/migrations/20260522000000_initial_growmate_schema.sql`

## What This Creates

### Auth-linked users

- `profiles`: public profile, Google avatar, location, admin flag, seller status
- automatic profile creation when a new Google Auth user signs up

### Seller verification

- `seller_applications`: buyer submits seller application
- `seller_profiles`: created after seller approval
- only verified sellers can create marketplace listings

### Marketplace

- `listings`: verified seller plant listings
- `listing_photos`: photos for each listing
- `orders`: buyer/seller purchase records
- `favorites`: saved listings
- `reviews`: completed-order ratings

### Garden community

- `gardens`: public/private user garden profile
- `garden_plants`: plants inside a user garden
- `garden_plant_photos`: plant progress photos
- `garden_follows`: follow/visit gardens

### Feed

- `feed_posts`: updates, questions, harvests, and tips
- `post_reactions`: likes
- `post_comments`: comments

### Messages

- `conversations`: friend, market, garden, Leafy, and support conversations
- `conversation_members`: users inside a conversation
- `messages`: chat messages

### Safety and rankings

- `reports`: listing/post/user reports
- `rank_events`: point events for rankings

### Storage buckets

- `avatars`
- `listing-photos`
- `garden-photos`
- `feed-photos`
- `verification-docs`

## Storage Path Rule

Upload files under a folder named with the user id:

```text
listing-photos/{user_id}/file-name.jpg
garden-photos/{user_id}/file-name.jpg
avatars/{user_id}/avatar.jpg
```

The RLS policies expect the first folder segment to be the logged-in user id.

## Important Production Rule

Keep secret API keys such as `PLANTNET_API_KEY` outside the mobile app. Put them in Netlify Functions, Supabase Edge Functions, or another backend-only environment.

## Leafy Generative Chat

`supabase/functions/leafy-chat` calls the Gemini API from a Supabase Edge Function, so the Gemini key stays off the mobile client.

Required secret:

```text
GEMINI_API_KEY=...
```

Leafy plant scanning uses PlantNet for image identification and Perenual for cached care data.

Required scan secrets:

```text
PLANTNET_API_KEY=...
PERENUAL_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` is used only inside Edge Functions to cache Perenual care profiles in `plant_care_cache`. Do not put it in the Expo app.

## Perenual Quota Strategy

GrowMate should use one Perenual account and keep Perenual calls backend-only.

Flow:

```text
User searches or scans a plant
-> Supabase checks plant_care_cache first
-> Perenual is called only when the cache is missing
-> The normalized result is saved to plant_care_cache
-> Future users reuse Supabase data
```

`get-or-create-plant-care` is the user-facing Edge Function for cache-first plant care lookups with per-user and global Perenual safety limits.
It checks `plant_care_cache` again on the backend, calls Perenual at most once for a missing plant, saves the normalized result, and records fallback requests in `missing_plant_requests`.
`api_usage_logs` tracks cache hits, fetched plants, limit blocks, and quota/pricing fallbacks.
`plant-care-lookup` is retired and returns HTTP 410. Use `get-or-create-plant-care`.
`plant-care-seed` is admin-only and can preload up to 100 common plants per run into `plant_care_cache`.

Example admin seed request body:

```json
{
  "limit": 50
}
```

Optional dry run:

```json
{
  "limit": 50,
  "dryRun": true
}
```

Optional model override:

```text
GEMINI_MODEL=gemini-2.5-flash-lite
```

Deploy the function from the Supabase dashboard or CLI, then set the secrets in:

```text
Supabase Dashboard -> Edge Functions -> Secrets
```
