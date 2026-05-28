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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Sign in before scanning plants." }, 401);
  }

  const apiKey = Deno.env.get("PLANTNET_API_KEY");

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
  const decision = getSaleDecision(scientificName, commonNames, confidence);
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
    category: inferCategory(scientificName, commonNames),
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
