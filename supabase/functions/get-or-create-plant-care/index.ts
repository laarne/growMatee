import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type LookupRequest = {
  query?: string;
  perenualId?: number;
};

type PerenualSpecies = {
  id?: number;
  common_name?: string | null;
  scientific_name?: string[] | string | null;
  type?: string | null;
  watering?: string | null;
  sunlight?: string[] | string | null;
  default_image?: {
    regular_url?: string | null;
    medium_url?: string | null;
    thumbnail?: string | null;
  } | null;
};

type PerenualListResponse = {
  data?: PerenualSpecies[];
};

type PlantCareProfile = {
  commonName: string | null;
  scientificName: string;
  perenualId: number | null;
  sunlight: string | null;
  watering: string | null;
  soil: string | null;
  fertilizer: string | null;
  pruning: string | null;
  humidity: string | null;
  careLevel: string | null;
  description: string | null;
  imageUrl: string | null;
  rawPerenualJson: Record<string, unknown> | null;
  source: "supabase-cache" | "perenual-fetched-and-cached" | "quota-reached-fallback" | "missing-plant-request-saved";
  message?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const minSearchLength = 3;
const perUserDailyLimit = 5;
const globalDailyLimit = 80;
const inFlightLookups = new Map<string, Promise<PlantCareProfile>>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ").trim();
}

function toText(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value ?? null;
}

function isPremiumPlaceholder(value: string | null | undefined) {
  return Boolean(value && /upgrade\s+plans|premium\/supreme|subscription-api-pricing|out.?of.?credits|quota|perenual\.com\/subscription/i.test(value));
}

function cleanCareText(value: string | null | undefined) {
  if (!value || isPremiumPlaceholder(value)) return null;
  return value.trim();
}

function fallbackCareProfile(query: string, source: PlantCareProfile["source"], message: string): PlantCareProfile {
  return {
    commonName: query,
    scientificName: query,
    perenualId: null,
    sunlight: "Bright indirect light is usually safest until a full care guide is available.",
    watering: "Water when the top layer of soil feels dry, then adjust after observing the plant.",
    soil: "Use a loose, well-draining potting mix.",
    fertilizer: null,
    pruning: "Remove yellowing, damaged, or dead leaves.",
    humidity: null,
    careLevel: "Basic GrowMate fallback guide",
    description: message,
    imageUrl: null,
    rawPerenualJson: null,
    source,
    message,
  };
}

function profileFromPerenual(plant: PerenualSpecies, query: string): PlantCareProfile {
  const scientificName = toText(plant.scientific_name) ?? query;
  return {
    commonName: plant.common_name ?? query,
    scientificName,
    perenualId: plant.id ?? null,
    sunlight: cleanCareText(toText(plant.sunlight)),
    watering: cleanCareText(plant.watering),
    soil: "Use a well-draining potting mix and adjust soil texture to the plant's moisture needs.",
    fertilizer: null,
    pruning: null,
    humidity: null,
    careLevel: cleanCareText(plant.type),
    description: `Care guide for ${plant.common_name ?? scientificName}.`,
    imageUrl: plant.default_image?.regular_url ?? plant.default_image?.medium_url ?? plant.default_image?.thumbnail ?? null,
    rawPerenualJson: plant as Record<string, unknown>,
    source: "perenual-fetched-and-cached",
  };
}

function hasUsableCare(profile: PlantCareProfile | null) {
  if (!profile) return false;
  return Boolean(profile.watering || profile.sunlight || profile.careLevel || profile.imageUrl);
}

function mapCacheRow(row: Record<string, unknown>): PlantCareProfile {
  return {
    commonName: row.common_name as string | null,
    scientificName: row.scientific_name as string,
    perenualId: row.perenual_id as number | null,
    sunlight: row.sunlight as string | null,
    watering: row.watering as string | null,
    soil: row.soil as string | null,
    fertilizer: row.fertilizer as string | null,
    pruning: row.pruning as string | null,
    humidity: row.humidity as string | null,
    careLevel: row.care_level as string | null,
    description: row.description as string | null,
    imageUrl: row.image_url as string | null,
    rawPerenualJson: row.raw_perenual_json as Record<string, unknown> | null,
    source: "supabase-cache",
  };
}

async function loadCache(client: ReturnType<typeof createClient>, normalizedQuery: string, perenualId?: number) {
  const query = client.from("plant_care_cache").select("*").limit(1);
  const { data, error } = perenualId
    ? await query.eq("perenual_id", perenualId).maybeSingle()
    : await query.or(`normalized_scientific_name.eq.${normalizedQuery},normalized_common_name.eq.${normalizedQuery}`).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  console.log(`Plant care source: Supabase cache (${normalizedQuery})`);
  return mapCacheRow(data);
}

async function logUsage(
  client: ReturnType<typeof createClient>,
  userId: string,
  normalizedQuery: string,
  source: PlantCareProfile["source"],
  status: string,
  statusCode?: number,
  details?: Record<string, unknown>,
) {
  const { error } = await client.from("api_usage_logs").insert({
    user_id: userId,
    provider: "perenual",
    endpoint: "get-or-create-plant-care",
    normalized_query: normalizedQuery,
    source,
    status,
    status_code: statusCode ?? null,
    details: details ?? {},
  });

  if (error) console.warn("API usage log failed:", error.message);
}

async function countDailyUsage(client: ReturnType<typeof createClient>, userId: string) {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const baseQuery = client
    .from("api_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("provider", "perenual")
    .eq("endpoint", "get-or-create-plant-care")
    .eq("status", "fetched")
    .gte("created_at", dayStart.toISOString());

  const [{ count: userCount, error: userError }, { count: globalCount, error: globalError }] = await Promise.all([
    baseQuery.eq("user_id", userId),
    client
      .from("api_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("provider", "perenual")
      .eq("endpoint", "get-or-create-plant-care")
      .eq("status", "fetched")
      .gte("created_at", dayStart.toISOString()),
  ]);

  if (userError) throw userError;
  if (globalError) throw globalError;

  return {
    userCount: userCount ?? 0,
    globalCount: globalCount ?? 0,
  };
}

async function saveMissingPlantRequest(
  client: ReturnType<typeof createClient>,
  userId: string,
  normalizedQuery: string,
  originalQuery: string,
  reason: string,
  source: PlantCareProfile["source"],
) {
  const { error } = await client.from("missing_plant_requests").insert({
    user_id: userId,
    normalized_query: normalizedQuery,
    original_query: originalQuery,
    reason,
    source,
  });

  if (error) console.warn("Missing plant request save failed:", error.message);
  console.log(`Plant care source: Missing plant request saved (${normalizedQuery})`);
}

async function saveCache(client: ReturnType<typeof createClient>, profile: PlantCareProfile) {
  const normalizedScientificName = normalizeText(profile.scientificName);
  if (normalizedScientificName.length < minSearchLength) return;

  const { error } = await client.from("plant_care_cache").upsert(
    {
      normalized_scientific_name: normalizedScientificName,
      normalized_common_name: profile.commonName ? normalizeText(profile.commonName) : null,
      provider: "Perenual",
      common_name: profile.commonName,
      scientific_name: profile.scientificName,
      perenual_id: profile.perenualId,
      sunlight: profile.sunlight,
      watering: profile.watering,
      soil: profile.soil,
      fertilizer: profile.fertilizer,
      pruning: profile.pruning,
      humidity: profile.humidity,
      care_level: profile.careLevel,
      description: profile.description,
      image_url: profile.imageUrl,
      raw_perenual_json: profile.rawPerenualJson ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "normalized_scientific_name" },
  );

  if (error) throw error;
}

async function fetchPerenualOnce(query: string, apiKey: string) {
  const searchUrl = new URL("https://perenual.com/api/species-list");
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("q", query);

  const response = await fetch(searchUrl);
  if ([402, 403, 429].includes(response.status)) {
    return { profile: null, quotaStatus: response.status };
  }
  if (!response.ok) return { profile: null, quotaStatus: response.status };

  const listData = await response.json() as PerenualListResponse;
  const first = listData.data?.[0];
  if (!first?.id) return { profile: null, quotaStatus: null };

  const profile = profileFromPerenual(first, query);
  return { profile: hasUsableCare(profile) ? profile : null, quotaStatus: null };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const authHeader = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const perenualApiKey = Deno.env.get("PERENUAL_API_KEY");

  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Sign in before requesting plant care." }, 401);
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return jsonResponse({ error: "Supabase function environment is not configured." }, 500);

  const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return jsonResponse({ error: "Sign in before requesting plant care." }, 401);

  let payload: LookupRequest;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON." }, 400);
  }

  const originalQuery = payload.perenualId ? String(payload.perenualId) : payload.query ?? "";
  const normalizedQuery = payload.perenualId ? String(payload.perenualId) : normalizeText(originalQuery);
  if (!payload.perenualId && normalizedQuery.length < minSearchLength) return jsonResponse({ error: "Search at least 3 characters." }, 400);

  const cached = await loadCache(userClient, normalizedQuery, payload.perenualId);
  if (cached) {
    await logUsage(adminClient, user.id, normalizedQuery, "supabase-cache", "cache_hit");
    return jsonResponse(cached);
  }

  const existingPromise = inFlightLookups.get(normalizedQuery);
  if (existingPromise) {
    console.log(`Plant care source: in-progress dedupe (${normalizedQuery})`);
    return jsonResponse(await existingPromise);
  }

  const lookupPromise = (async () => {
    const doubleCheckedCache = await loadCache(adminClient, normalizedQuery, payload.perenualId);
    if (doubleCheckedCache) {
      await logUsage(adminClient, user.id, normalizedQuery, "supabase-cache", "cache_hit_after_double_check");
      return doubleCheckedCache;
    }

    const dailyUsage = await countDailyUsage(adminClient, user.id);
    if (dailyUsage.userCount >= perUserDailyLimit || dailyUsage.globalCount >= globalDailyLimit || !perenualApiKey) {
      const message = "Care guide request saved. GrowMate will use basic care tips for now and reuse the full guide once available.";
      const fallback = fallbackCareProfile(normalizedQuery, "quota-reached-fallback", message);
      await saveMissingPlantRequest(adminClient, user.id, normalizedQuery, originalQuery, "daily_limit_or_missing_key", fallback.source);
      await logUsage(adminClient, user.id, normalizedQuery, fallback.source, "blocked_by_limit", undefined, dailyUsage);
      console.log(`Plant care source: Quota reached fallback (${normalizedQuery})`);
      return fallback;
    }

    const { profile, quotaStatus } = await fetchPerenualOnce(normalizedQuery, perenualApiKey);
    if (quotaStatus && [402, 403, 429].includes(quotaStatus)) {
      const message = "Perenual credits are paused for now. GrowMate saved this request and is showing basic care tips.";
      const fallback = fallbackCareProfile(normalizedQuery, "quota-reached-fallback", message);
      await saveMissingPlantRequest(adminClient, user.id, normalizedQuery, originalQuery, `perenual_status_${quotaStatus}`, fallback.source);
      await logUsage(adminClient, user.id, normalizedQuery, fallback.source, "quota_or_pricing", quotaStatus);
      console.log(`Plant care source: Quota reached fallback (${normalizedQuery})`);
      return fallback;
    }

    if (!profile) {
      const message = "GrowMate could not find a full care guide yet. The request was saved for review.";
      const fallback = fallbackCareProfile(normalizedQuery, "missing-plant-request-saved", message);
      await saveMissingPlantRequest(adminClient, user.id, normalizedQuery, originalQuery, "not_found", fallback.source);
      await logUsage(adminClient, user.id, normalizedQuery, fallback.source, "not_found", quotaStatus ?? undefined);
      return fallback;
    }

    await saveCache(adminClient, profile);
    const saved = await loadCache(adminClient, normalizeText(profile.scientificName), profile.perenualId) ?? profile;
    await logUsage(adminClient, user.id, normalizedQuery, "perenual-fetched-and-cached", "fetched", undefined, { perenualId: profile.perenualId });
    console.log(`Plant care source: Perenual fetched and cached (${normalizedQuery})`);
    return { ...saved, source: "perenual-fetched-and-cached" as const };
  })();

  inFlightLookups.set(normalizedQuery, lookupPromise);

  try {
    return jsonResponse(await lookupPromise);
  } finally {
    inFlightLookups.delete(normalizedQuery);
  }
});
