import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type SeedRequest = {
  plants?: string[];
  limit?: number;
  dryRun?: boolean;
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

type PerenualDetails = PerenualSpecies & {
  description?: string | null;
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
  source: "perenual-api";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const defaultSeedPlants = [
  "snake plant",
  "golden pothos",
  "monstera deliciosa",
  "peace lily",
  "zz plant",
  "spider plant",
  "aloe vera",
  "rubber plant",
  "jade plant",
  "philodendron",
  "boston fern",
  "chinese evergreen",
  "dracaena",
  "fiddle leaf fig",
  "calathea",
  "orchid",
  "basil",
  "mint",
  "rosemary",
  "tomato",
  "chili pepper",
  "eggplant",
  "lettuce",
  "cucumber",
  "okra",
  "pechay",
  "malunggay",
  "bougainvillea",
  "hibiscus",
  "rose",
  "sunflower",
  "marigold",
  "lavender",
  "cactus",
  "echeveria",
  "anthurium",
  "dieffenbachia",
  "syngonium",
  "schefflera",
  "bird of paradise",
  "areca palm",
  "parlor palm",
  "money tree",
  "fittonia",
  "coleus",
  "begonia",
  "pilea peperomioides",
  "string of pearls",
  "hoya",
  "english ivy",
];

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
  return Boolean(profile.description || profile.watering || profile.sunlight || profile.careLevel);
}

function profileFromPerenual(plant: PerenualSpecies | PerenualDetails, query: string): PlantCareProfile {
  const scientificName = toText(plant.scientific_name) ?? query;
  return {
    commonName: plant.common_name ?? query,
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

async function assertAdmin(userClient: ReturnType<typeof createClient>) {
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return false;

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return !profileError && profile?.is_admin === true;
}

async function loadCache(client: ReturnType<typeof createClient>, normalizedQuery: string) {
  const { data, error } = await client
    .from("plant_care_cache")
    .select("id")
    .or(`normalized_scientific_name.eq.${normalizedQuery},normalized_common_name.eq.${normalizedQuery}`)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function saveCache(client: ReturnType<typeof createClient>, profile: PlantCareProfile) {
  const normalizedScientificName = normalizeText(profile.scientificName);
  if (normalizedScientificName.length < 2) return;

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

async function perenualJson(url: URL) {
  const response = await fetch(url);
  if ([402, 403, 429].includes(response.status)) {
    throw new Error(`Perenual quota/pricing response: ${response.status}`);
  }
  if (!response.ok) return null;
  return response.json();
}

async function fetchPerenual(query: string, apiKey: string) {
  const searchUrl = new URL("https://perenual.com/api/species-list");
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("q", query);

  const listData = await perenualJson(searchUrl) as { data?: PerenualSpecies[] } | null;
  const first = listData?.data?.[0];
  if (!first?.id) return null;

  const listProfile = profileFromPerenual(first, query);
  if (hasUsableCare(listProfile)) return listProfile;

  const detailsUrl = new URL(`https://perenual.com/api/species/details/${first.id}`);
  detailsUrl.searchParams.set("key", apiKey);
  const details = await perenualJson(detailsUrl) as PerenualDetails | null;
  if (!details) return listProfile;

  const detailsProfile = profileFromPerenual(details, query);
  return hasUsableCare(detailsProfile) ? detailsProfile : listProfile;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const authHeader = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const perenualApiKey = Deno.env.get("PERENUAL_API_KEY");

  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Admin sign-in is required." }, 401);
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !perenualApiKey) {
    return jsonResponse({ error: "Seed function environment is not configured." }, 500);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  if (!await assertAdmin(userClient)) return jsonResponse({ error: "Admin access is required." }, 403);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const payload = await request.json().catch(() => ({})) as SeedRequest;
  const requestedPlants = Array.isArray(payload.plants) && payload.plants.length > 0 ? payload.plants : defaultSeedPlants;
  const uniquePlants = [...new Set(requestedPlants.map(normalizeText).filter((plant) => plant.length >= 2))];
  const limit = Math.min(Math.max(payload.limit ?? 50, 1), 100);
  const plants = uniquePlants.slice(0, limit);

  const results = [];
  for (const plant of plants) {
    const cached = await loadCache(adminClient, plant);
    if (cached) {
      results.push({ plant, status: "cached" });
      continue;
    }

    if (payload.dryRun) {
      results.push({ plant, status: "missing" });
      continue;
    }

    try {
      const profile = await fetchPerenual(plant, perenualApiKey);
      if (!profile || !hasUsableCare(profile)) {
        results.push({ plant, status: "not_found" });
        continue;
      }

      await saveCache(adminClient, profile);
      results.push({ plant, status: "seeded", scientificName: profile.scientificName, perenualId: profile.perenualId });
      console.log(`Plant care seed: Perenual API -> Supabase cache (${plant})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Perenual error";
      results.push({ plant, status: "stopped", error: message });
      if (/quota|pricing/i.test(message)) break;
    }
  }

  return jsonResponse({
    requested: plants.length,
    cached: results.filter((result) => result.status === "cached").length,
    seeded: results.filter((result) => result.status === "seeded").length,
    skipped: results.filter((result) => result.status === "missing" || result.status === "not_found").length,
    results,
  });
});
