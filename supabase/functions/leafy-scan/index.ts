import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type ScanRequest = {
  imageBase64?: string;
  mimeType?: string;
  organ?: string;
};

type PlantNetResult = {
  score?: number;
  species?: {
    scientificNameWithoutAuthor?: string;
    scientificNameAuthorship?: string;
    commonNames?: string[];
    family?: { scientificNameWithoutAuthor?: string };
    genus?: { scientificNameWithoutAuthor?: string };
  };
};

type PlantNetResponse = {
  query?: {
    remainingIdentificationRequests?: number;
  };
  results?: PlantNetResult[];
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

type PerenualSpeciesListResponse = {
  data?: PerenualSpecies[];
};

type PerenualDetailsResponse = PerenualSpecies & {
  type?: string | null;
  cycle?: string | null;
  watering?: string | null;
  sunlight?: string[] | string | null;
  propagation?: string[] | string | null;
  attracts?: string[] | string | null;
  indoor?: boolean | null;
  poisonous_to_humans?: boolean | number | null;
  poisonous_to_pets?: boolean | number | null;
  description?: string | null;
};

type PerenualCareGuideResponse = {
  data?: {
    section?: {
      type?: string | null;
      description?: string | null;
    }[];
  }[];
};

type CareProfile = {
  provider: "Perenual" | "GrowMate";
  perenualId: number | null;
  scientificName: string;
  commonName: string | null;
  summary: string | null;
  watering: string | null;
  sunlight: string | null;
  soil: string | null;
  pruning: string | null;
  propagation: string | null;
  cycle: string | null;
  growthHabit: string | null;
  toxicity: string | null;
  imageUrl: string | null;
  source: "cache" | "perenual" | "fallback";
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedOrgans = new Set(["leaf", "flower", "fruit", "bark", "habit", "other"]);
const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const maxImageBase64Length = 8_000_000;
const scanLimit = 5;
const scanWindowMs = 60 * 60 * 1000;
const careLookupPromises = new Map<string, Promise<CareProfile>>();

const reviewTerms = [
  "waling-waling",
  "vanda sanderiana",
  "paphiopedilum",
  "cycas wadei",
  "nepenthes",
  "rafflesia",
  "dendrobium schuetzei",
  "phalaenopsis micholitzii",
  "palawan cherry",
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

function base64ToBlob(base64: string, mimeType: string) {
  const cleanBase64 = base64.includes(",") ? base64.split(",").pop() ?? "" : base64;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
    throw new Error("Image data is not valid base64.");
  }

  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeScientificName(value: string) {
  return normalizeText(value).replace(/[^a-z0-9\s-]/g, "");
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

function hasUsableCare(profile: CareProfile | null) {
  if (!profile) return false;
  return Boolean(
    profile.summary ||
      profile.watering ||
      profile.sunlight ||
      profile.soil ||
      profile.pruning ||
      profile.propagation ||
      profile.cycle ||
      profile.growthHabit ||
      profile.toxicity,
  );
}

function inferCategory(name: string, commonNames: string[]) {
  const combined = normalizeText([name, ...commonNames].join(" "));

  if (/(basil|rosemary|mint|oregano|thyme|parsley|cilantro|herb)/.test(combined)) return "Herbs";
  if (/(cassava|kamoteng kahoy|sweet potato|kamote|taro|gabi|yam|ube|potato|radish|labanos|carrot|beetroot|beet|turnip|ginger|luya|turmeric|luyang dilaw|arrowroot)/.test(combined)) return "Root Crops";
  if (/(pechay|bok choy|eggplant|talong|onion|sibuyas|tomato|chili|sili|lettuce|okra|ampalaya|bitter melon|squash|kalabasa|cucumber|pipino|sitaw|long bean|beans|malunggay|moringa|vegetable|veggie)/.test(combined)) return "Vegetables";
  if (/(calamansi|citrus|mango|guava|papaya|banana|coconut|buko|avocado|atis|sugar apple|lanzones|rambutan|fruit)/.test(combined)) return "Fruit Trees";
  if (/(lagundi|sambong|yerba buena|insulin plant|serpentina|oregano|medicinal)/.test(combined)) return "Medicinal";
  if (/(cactus|succulent|echeveria|aloe|haworthia)/.test(combined)) return "Succulents";
  if (/(orchid|hoya|bougainvillea|flower)/.test(combined)) return "Flowering";
  if (/(rose|gumamela|hibiscus|santan|coleus|croton|ornamental)/.test(combined)) return "Ornamental";
  if (/(tree|palm|bamboo|ficus|narra|acacia)/.test(combined)) return "Outdoor";
  if (/(monstera|philodendron|pothos|calathea|alocasia|anthurium|fern|snake plant|sansevieria)/.test(combined)) return "Indoor";

  return "Indoor";
}

function getSaleDecision(name: string, commonNames: string[], confidence: number) {
  const combined = normalizeText([name, ...commonNames].join(" "));
  const matchedTerm = reviewTerms.find((term) => combined.includes(term));

  if (matchedTerm && confidence >= 70) {
    return {
      saleStatus: "review_required" as const,
      reviewReason: `Possible protected or restricted species match: ${matchedTerm}. Admin review is required before selling.`,
    };
  }

  if (confidence < 35) {
    return {
      saleStatus: "review_required" as const,
      reviewReason: "Plant identity confidence is low. Add clearer photos for admin review.",
    };
  }

  return {
    saleStatus: "safe_to_sell" as const,
    reviewReason: "No protected-species flag detected. Still confirm local rules before selling.",
  };
}

function fallbackCareProfile(scientificName: string, commonNames: string[], category: string): CareProfile {
  const normalizedCategory = normalizeText(category);
  const isSucculent = normalizedCategory.includes("succulent");
  const isHerb = normalizedCategory.includes("herb");
  const isFlowering = normalizedCategory.includes("flower");

  return {
    provider: "GrowMate",
    perenualId: null,
    scientificName,
    commonName: commonNames[0] ?? null,
    summary: "Basic care guidance based on the identified plant category.",
    watering: isSucculent ? "Water only when the soil is fully dry." : "Water when the top layer of soil feels dry.",
    sunlight: isHerb || isFlowering ? "Bright light is best; protect from harsh midday heat." : "Bright indirect light is usually safest.",
    soil: isSucculent ? "Use a fast-draining cactus or succulent mix." : "Use a loose, well-draining potting mix.",
    pruning: "Remove yellowing, damaged, or dead leaves to keep the plant healthy.",
    propagation: isSucculent ? "Many succulents propagate from leaves, offsets, or cuttings." : "Propagation depends on the species; stem cuttings are common for many houseplants.",
    cycle: null,
    growthHabit: category,
    toxicity: "Toxicity data is not available from the fallback guide.",
    imageUrl: null,
    source: "fallback",
  };
}

function pickSpeciesMatch(results: PerenualSpecies[], scientificName: string, commonNames: string[]) {
  const normalizedScientific = normalizeScientificName(scientificName);
  const normalizedCommonNames = commonNames.map(normalizeText);

  return results.find((species) => {
    const speciesScientific = toText(species.scientific_name);
    return speciesScientific ? normalizeScientificName(speciesScientific).includes(normalizedScientific) : false;
  }) ?? results.find((species) => {
    const commonName = normalizeText(species.common_name ?? "");
    return commonName && normalizedCommonNames.some((name) => commonName.includes(name) || name.includes(commonName));
  }) ?? results[0] ?? null;
}

function isQuotaStatus(status: number) {
  return status === 402 || status === 403 || status === 429;
}

function profileFromPerenualSpecies(
  species: PerenualSpecies | PerenualDetailsResponse,
  scientificName: string,
  commonNames: string[],
  category: string,
): CareProfile {
  const toxicityParts = [
    "poisonous_to_humans" in species && species.poisonous_to_humans ? "Can be toxic to humans." : null,
    "poisonous_to_pets" in species && species.poisonous_to_pets ? "Can be toxic to pets." : null,
  ].filter(Boolean);

  return {
    provider: "Perenual",
    perenualId: species.id ?? null,
    scientificName,
    commonName: species.common_name ?? commonNames[0] ?? null,
    summary: "description" in species ? cleanCareText(species.description) : null,
    watering: cleanCareText(species.watering),
    sunlight: cleanCareText(toText(species.sunlight)),
    soil: null,
    pruning: null,
    propagation: "propagation" in species ? cleanCareText(toText(species.propagation)) : null,
    cycle: cleanCareText(species.cycle),
    growthHabit: cleanCareText(species.type) ?? category,
    toxicity: toxicityParts.length > 0 ? toxicityParts.join(" ") : null,
    imageUrl: species.default_image?.regular_url ?? species.default_image?.medium_url ?? species.default_image?.thumbnail ?? null,
    source: "perenual",
  };
}

async function fetchPerenualCareProfile(scientificName: string, commonNames: string[], category: string, apiKey: string): Promise<CareProfile | null> {
  const searchUrl = new URL("https://perenual.com/api/species-list");
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("q", scientificName);

  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    if (isQuotaStatus(searchResponse.status)) {
      console.warn(`Perenual quota/pricing response on species search: ${searchResponse.status}`);
    }
    return null;
  }

  const searchData = (await searchResponse.json()) as PerenualSpeciesListResponse;
  const species = pickSpeciesMatch(searchData.data ?? [], scientificName, commonNames);
  if (!species?.id) return null;

  const listProfile = profileFromPerenualSpecies(species, scientificName, commonNames, category);
  if (hasUsableCare(listProfile)) {
    return listProfile;
  }

  const detailsUrl = new URL(`https://perenual.com/api/species/details/${species.id}`);
  detailsUrl.searchParams.set("key", apiKey);

  const detailsResponse = await fetch(detailsUrl);
  if (!detailsResponse.ok) {
    if (isQuotaStatus(detailsResponse.status)) {
      console.warn(`Perenual quota/pricing response on details: ${detailsResponse.status}`);
    }
    return null;
  }

  return profileFromPerenualSpecies(await detailsResponse.json() as PerenualDetailsResponse, scientificName, commonNames, category);
}

async function loadCachedCareProfile(client: ReturnType<typeof createClient>, normalizedScientificName: string): Promise<CareProfile | null> {
  const { data: careCache, error: careCacheError } = await client
    .from("plant_care_cache")
    .select("provider, perenual_id, scientific_name, common_name, description, watering, sunlight, soil, fertilizer, pruning, humidity, care_level, image_url")
    .eq("normalized_scientific_name", normalizedScientificName)
    .maybeSingle();

  if (!careCacheError && careCache) {
    console.log(`Plant care source: Supabase cache (${normalizedScientificName})`);
    return {
      provider: careCache.provider === "Perenual" ? "Perenual" : "GrowMate",
      perenualId: careCache.perenual_id,
      scientificName: careCache.scientific_name,
      commonName: careCache.common_name,
      summary: careCache.description,
      watering: careCache.watering,
      sunlight: careCache.sunlight,
      soil: careCache.soil,
      pruning: careCache.pruning,
      propagation: null,
      cycle: null,
      growthHabit: careCache.care_level,
      toxicity: null,
      imageUrl: careCache.image_url,
      source: "cache",
    };
  }

  const { data: legacyProfile, error: legacyError } = await client
    .from("plant_care_profiles")
    .select("provider, scientific_name, common_name, summary, watering, sunlight, soil, pruning, propagation, cycle, growth_habit, toxicity, image_url")
    .eq("normalized_scientific_name", normalizedScientificName)
    .maybeSingle();

  if (legacyError || !legacyProfile) return null;

  console.log(`Plant care source: legacy Supabase cache (${normalizedScientificName})`);

  return {
    provider: legacyProfile.provider === "Perenual" ? "Perenual" : "GrowMate",
    perenualId: null,
    scientificName: legacyProfile.scientific_name,
    commonName: legacyProfile.common_name,
    summary: legacyProfile.summary,
    watering: legacyProfile.watering,
    sunlight: legacyProfile.sunlight,
    soil: legacyProfile.soil,
    pruning: legacyProfile.pruning,
    propagation: legacyProfile.propagation,
    cycle: legacyProfile.cycle,
    growthHabit: legacyProfile.growth_habit,
    toxicity: legacyProfile.toxicity,
    imageUrl: legacyProfile.image_url,
    source: "cache",
  };
}

async function saveCareProfile(client: ReturnType<typeof createClient> | null, normalizedScientificName: string, profile: CareProfile) {
  if (!client || profile.source === "cache") return;

  await client.from("plant_care_cache").upsert(
    {
      normalized_scientific_name: normalizedScientificName,
      normalized_common_name: profile.commonName ? normalizeText(profile.commonName) : null,
      provider: profile.provider,
      perenual_id: profile.perenualId,
      scientific_name: profile.scientificName,
      common_name: profile.commonName,
      description: profile.summary,
      watering: profile.watering,
      sunlight: profile.sunlight,
      soil: profile.soil,
      pruning: profile.pruning,
      care_level: profile.growthHabit,
      image_url: profile.imageUrl,
      raw_perenual_json: {
        source: profile.source,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "normalized_scientific_name" },
  );

  await client.from("plant_care_profiles").upsert(
    {
      normalized_scientific_name: normalizedScientificName,
      provider: profile.provider,
      scientific_name: profile.scientificName,
      common_name: profile.commonName,
      summary: profile.summary,
      watering: profile.watering,
      sunlight: profile.sunlight,
      soil: profile.soil,
      pruning: profile.pruning,
      propagation: profile.propagation,
      cycle: profile.cycle,
      growth_habit: profile.growthHabit,
      toxicity: profile.toxicity,
      image_url: profile.imageUrl,
      raw_source: {
        source: profile.source,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "normalized_scientific_name" },
  );
}

async function getCareProfileWithCache(
  userClient: ReturnType<typeof createClient>,
  adminClient: ReturnType<typeof createClient> | null,
  scientificName: string,
  commonNames: string[],
  category: string,
  perenualApiKey: string | undefined,
  allowPerenualLookup: boolean,
) {
  const normalizedScientificName = normalizeScientificName(scientificName);
  const cached = await loadCachedCareProfile(userClient, normalizedScientificName);
  if (cached) return cached;

  const existingPromise = careLookupPromises.get(normalizedScientificName);
  if (existingPromise) {
    console.log(`Plant care source: in-flight dedupe (${normalizedScientificName})`);
    return existingPromise;
  }

  const lookupPromise = (async () => {
    let profile: CareProfile | null = null;

    if (perenualApiKey && allowPerenualLookup) {
      try {
        const perenualProfile = await fetchPerenualCareProfile(scientificName, commonNames, category, perenualApiKey);
        profile = hasUsableCare(perenualProfile) ? perenualProfile : null;
        if (profile) {
          console.log(`Plant care source: Perenual API (${normalizedScientificName})`);
        }
      } catch (careError) {
        console.warn("Perenual care lookup failed:", careError);
      }
    }

    if (!profile) {
      profile = fallbackCareProfile(scientificName, commonNames, category);
      console.log(`Plant care source: local fallback (${normalizedScientificName})`);
    }

    await saveCareProfile(adminClient, normalizedScientificName, profile);
    return profile;
  })();

  careLookupPromises.set(normalizedScientificName, lookupPromise);

  try {
    return await lookupPromise;
  } finally {
    careLookupPromises.delete(normalizedScientificName);
  }
}

async function getCurrentUserIsAdmin(client: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Unable to check admin status for Perenual lookup:", error.message);
    return false;
  }

  return data?.is_admin === true;
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = getBearerToken(request);

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Supabase function environment is not configured." }, 500);
  }

  if (!authorization) {
    return jsonResponse({ error: "Sign in before scanning plants." }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
  const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
        },
      })
    : null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Sign in before scanning plants." }, 401);
  }

  const currentUserIsAdmin = await getCurrentUserIsAdmin(supabase, user.id);

  const apiKey = Deno.env.get("PLANTNET_API_KEY");
  const perenualApiKey = Deno.env.get("PERENUAL_API_KEY");

  if (!apiKey) {
    return jsonResponse({ error: "PlantNet secret is not configured." }, 500);
  }

  let payload: ScanRequest;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON." }, 400);
  }

  if (!payload.imageBase64) {
    return jsonResponse({ error: "imageBase64 is required." }, 400);
  }

  if (payload.imageBase64.length > maxImageBase64Length) {
    return jsonResponse({ error: "Image is too large. Choose a smaller photo." }, 413);
  }

  const mimeType = (payload.mimeType ?? "image/jpeg").toLowerCase();
  if (!allowedMimeTypes.has(mimeType)) {
    return jsonResponse({ error: "Unsupported image type. Use JPG, PNG, or WEBP." }, 415);
  }

  const windowStart = new Date(Date.now() - scanWindowMs).toISOString();
  const { count, error: countError } = await supabase
    .from("leafy_scan_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("scanned_at", windowStart);

  if (countError) {
    return jsonResponse({ error: "Unable to check scan limit." }, 500);
  }

  if ((count ?? 0) >= scanLimit) {
    return jsonResponse(
      {
        error: `Leafy scan limit reached. Try again later.`,
        limit: scanLimit,
        windowMinutes: Math.round(scanWindowMs / 60000),
      },
      429,
    );
  }

  const { error: insertError } = await supabase.from("leafy_scan_events").insert({
    user_id: user.id,
  });

  if (insertError) {
    return jsonResponse({ error: "Unable to record scan attempt." }, 500);
  }

  const organ = allowedOrgans.has(payload.organ ?? "") ? payload.organ! : "leaf";
  const formData = new FormData();

  // User-provided image bytes and organ labels are forwarded only as data fields,
  // never as privileged instructions or prompt/system text.
  try {
    formData.append("images", base64ToBlob(payload.imageBase64, mimeType), `scan.${mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg"}`);
  } catch {
    return jsonResponse({ error: "Image data is not valid base64." }, 400);
  }
  formData.append("organs", organ);

  const endpoint = new URL("https://my-api.plantnet.org/v2/identify/all");
  endpoint.searchParams.set("api-key", apiKey);
  endpoint.searchParams.set("lang", "en");
  endpoint.searchParams.set("detailed", "true");
  endpoint.searchParams.set("include-related-images", "false");
  endpoint.searchParams.set("nb-results", "5");

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const details = await response.text();
    return jsonResponse(
      {
        error: "PlantNet scan failed.",
        status: response.status,
        details: details.slice(0, 240),
      },
      response.status,
    );
  }

  const data = (await response.json()) as PlantNetResponse;
  const best = data.results?.[0];

  if (!best?.species) {
    return jsonResponse({ error: "No plant match found. Try a clearer plant photo." }, 422);
  }

  const scientificName = best.species.scientificNameWithoutAuthor ?? "Unknown plant";
  const commonNames = best.species.commonNames ?? [];
  const confidence = Math.round((best.score ?? 0) * 1000) / 10;
  const category = inferCategory(scientificName, commonNames);
  const decision = getSaleDecision(scientificName, commonNames, confidence);
  const careProfile = await getCareProfileWithCache(supabase, supabaseAdmin, scientificName, commonNames, category, perenualApiKey ?? undefined, currentUserIsAdmin);

  const alternativeMatches = (data.results ?? []).slice(1, 5).map((match) => {
    const matchScientificName = match.species?.scientificNameWithoutAuthor ?? null;
    const matchCommonNames = match.species?.commonNames ?? [];

    return {
      name: matchCommonNames[0] ?? matchScientificName ?? "Unknown plant",
      scientificName: matchScientificName,
      commonNames: matchCommonNames,
      confidence: Math.round((match.score ?? 0) * 1000) / 10,
      family: match.species?.family?.scientificNameWithoutAuthor ?? null,
      genus: match.species?.genus?.scientificNameWithoutAuthor ?? null,
    };
  });

  return jsonResponse({
    provider: "PlantNet",
    bestMatch: commonNames[0] ?? scientificName,
    scientificName,
    commonNames,
    family: best.species.family?.scientificNameWithoutAuthor ?? null,
    genus: best.species.genus?.scientificNameWithoutAuthor ?? null,
    confidence,
    category,
    careProfile,
    saleStatus: decision.saleStatus,
    reviewReason: decision.reviewReason,
    alternativeMatches,
    remainingRequests: data.query?.remainingIdentificationRequests,
    scanLimit: {
      used: (count ?? 0) + 1,
      limit: scanLimit,
      windowMinutes: Math.round(scanWindowMs / 60000),
    },
  });
});
