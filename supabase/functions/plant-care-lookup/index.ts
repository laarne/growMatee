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
  cycle?: string | null;
  watering?: string | null;
  sunlight?: string[] | string | null;
  default_image?: {
    regular_url?: string | null;
    medium_url?: string | null;
    thumbnail?: string | null;
  } | null;
};

type PerenualDetails = PerenualSpecies & {
  description?: string | null;
  propagation?: string[] | string | null;
  poisonous_to_humans?: boolean | number | null;
  poisonous_to_pets?: boolean | number | null;
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
  source: "supabase-cache" | "perenual-api" | "local-fallback";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const minSearchLength = 2;
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
  return Boolean(value && /upgrade\s+plans|premium\/supreme|subscription-api-pricing|perenual\.com\/subscription/i.test(value));
}

function cleanCareText(value: string | null | undefined) {
  if (!value || isPremiumPlaceholder(value)) return null;
  return value.trim();
}

function hasUsableCare(profile: PlantCareProfile | null) {
  if (!profile) return false;
  return Boolean(profile.description || profile.watering || profile.sunlight || profile.soil || profile.pruning || profile.careLevel);
}

function fallbackCareProfile(query: string): PlantCareProfile {
  return {
    commonName: query,
    scientificName: query,
    perenualId: null,
    sunlight: "Bright indirect light is usually safest.",
    watering: "Water when the top layer of soil feels dry.",
    soil: "Use a loose, well-draining potting mix.",
    fertilizer: null,
    pruning: "Remove yellowing, damaged, or dead leaves.",
    humidity: null,
    careLevel: "Basic category guide",
    description: "Basic GrowMate fallback care guidance.",
    imageUrl: null,
    rawPerenualJson: null,
    source: "local-fallback",
  };
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

function profileFromPerenual(plant: PerenualSpecies | PerenualDetails, query: string): PlantCareProfile {
  const scientificName = toText(plant.scientific_name) ?? query;
  return {
    commonName: plant.common_name ?? null,
    scientificName,
    perenualId: plant.id ?? null,
    sunlight: cleanCareText(toText(plant.sunlight)),
    watering: cleanCareText(plant.watering),
    soil: null,
    fertilizer: null,
    pruning: null,
    humidity: null,
    careLevel: cleanCareText(plant.type),
    description: "description" in plant ? cleanCareText(plant.description) : null,
    imageUrl: plant.default_image?.regular_url ?? plant.default_image?.medium_url ?? plant.default_image?.thumbnail ?? null,
    rawPerenualJson: plant as Record<string, unknown>,
    source: "perenual-api",
  };
}

async function loadCache(client: ReturnType<typeof createClient>, normalizedQuery: string, perenualId?: number) {
  const query = client
    .from("plant_care_cache")
    .select("*")
    .limit(1);

  const { data, error } = perenualId
    ? await query.eq("perenual_id", perenualId).maybeSingle()
    : await query.or(`normalized_scientific_name.eq.${normalizedQuery},normalized_common_name.eq.${normalizedQuery}`).maybeSingle();

  if (error || !data) return null;
  console.log(`Plant care source: Supabase cache (${normalizedQuery})`);
  return mapCacheRow(data);
}

async function saveCache(client: ReturnType<typeof createClient>, profile: PlantCareProfile) {
  const normalizedScientificName = normalizeText(profile.scientificName);
  if (normalizedScientificName.length < minSearchLength) return;

  const { error } = await client.from("plant_care_cache").upsert(
    {
      normalized_scientific_name: normalizedScientificName,
      normalized_common_name: profile.commonName ? normalizeText(profile.commonName) : null,
      provider: profile.source === "perenual-api" ? "Perenual" : "GrowMate",
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

  if (error) console.warn("Plant care cache save failed:", error.message);
}

async function fetchPerenual(query: string, perenualId: number | undefined, apiKey: string) {
  if (perenualId) {
    const detailsUrl = new URL(`https://perenual.com/api/species/details/${perenualId}`);
    detailsUrl.searchParams.set("key", apiKey);
    const detailsResponse = await fetch(detailsUrl);
    if (!detailsResponse.ok) return null;
    return profileFromPerenual(await detailsResponse.json() as PerenualDetails, query);
  }

  const searchUrl = new URL("https://perenual.com/api/species-list");
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("q", query);
  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    if ([402, 403, 429].includes(searchResponse.status)) {
      console.warn(`Perenual quota/pricing response: ${searchResponse.status}`);
    }
    return null;
  }

  const listData = await searchResponse.json() as PerenualListResponse;
  const first = listData.data?.[0];
  if (!first?.id) return null;

  const listProfile = profileFromPerenual(first, query);
  if (hasUsableCare(listProfile)) return listProfile;

  return fetchPerenual(query, first.id, apiKey);
}

async function getCurrentUserIsAdmin(client: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Unable to check admin status for plant care lookup:", error.message);
    return false;
  }

  return data?.is_admin === true;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  return jsonResponse({ error: "This endpoint is retired. Use get-or-create-plant-care." }, 410);

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
  const currentUserIsAdmin = await getCurrentUserIsAdmin(userClient, user.id);

  let payload: LookupRequest;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON." }, 400);
  }

  const normalizedQuery = payload.perenualId ? String(payload.perenualId) : normalizeText(payload.query ?? "");
  if (normalizedQuery.length < minSearchLength) return jsonResponse({ error: "Search at least 2 characters." }, 400);

  const cached = await loadCache(userClient, normalizedQuery, payload.perenualId);
  if (cached) return jsonResponse(cached);

  const existingPromise = inFlightLookups.get(normalizedQuery);
  if (existingPromise) {
    console.log(`Plant care source: in-flight dedupe (${normalizedQuery})`);
    return jsonResponse(await existingPromise);
  }

  const lookupPromise = (async () => {
    let profile: PlantCareProfile | null = null;
    if (perenualApiKey && currentUserIsAdmin) {
      profile = await fetchPerenual(normalizedQuery, payload.perenualId, perenualApiKey);
      if (profile && hasUsableCare(profile)) {
        console.log(`Plant care source: Perenual API (${normalizedQuery})`);
      } else {
        profile = null;
      }
    }

    if (!profile) {
      profile = fallbackCareProfile(normalizedQuery);
      console.log(`Plant care source: local fallback (${normalizedQuery})`);
    }

    if (profile.source === "perenual-api") {
      await saveCache(adminClient, profile);
    }
    return profile;
  })();

  inFlightLookups.set(normalizedQuery, lookupPromise);

  try {
    return jsonResponse(await lookupPromise);
  } finally {
    inFlightLookups.delete(normalizedQuery);
  }
});
