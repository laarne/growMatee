import { supabase } from "./supabase";

export type PlantCareCacheSource =
  | "supabase-cache"
  | "perenual-api"
  | "perenual-fetched-and-cached"
  | "quota-reached-fallback"
  | "missing-plant-request-saved"
  | "local-fallback";

export type PlantCareProfile = {
  id?: string;
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
  rawPerenualJson?: Record<string, unknown> | null;
  source: PlantCareCacheSource;
};

type PlantCareCacheRow = {
  id: string;
  common_name: string | null;
  scientific_name: string;
  perenual_id: number | null;
  sunlight: string | null;
  watering: string | null;
  soil: string | null;
  fertilizer: string | null;
  pruning: string | null;
  humidity: string | null;
  care_level: string | null;
  description: string | null;
  image_url: string | null;
  raw_perenual_json: Record<string, unknown> | null;
};

const MIN_SEARCH_LENGTH = 3;
const inFlightPlantCareRequests = new Map<string, Promise<PlantCareProfile | null>>();

export function normalizePlantCareQuery(queryOrPlantId: string | number) {
  return String(queryOrPlantId).toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ").trim();
}

function mapPlantCareRow(row: PlantCareCacheRow): PlantCareProfile {
  return {
    id: row.id,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    perenualId: row.perenual_id,
    sunlight: row.sunlight,
    watering: row.watering,
    soil: row.soil,
    fertilizer: row.fertilizer,
    pruning: row.pruning,
    humidity: row.humidity,
    careLevel: row.care_level,
    description: row.description,
    imageUrl: row.image_url,
    rawPerenualJson: row.raw_perenual_json,
    source: "supabase-cache",
  };
}

export async function getPlantCareFromSupabase(queryOrPlantId: string | number): Promise<PlantCareProfile | null> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const normalized = normalizePlantCareQuery(queryOrPlantId);
  if (typeof queryOrPlantId !== "number" && normalized.length < MIN_SEARCH_LENGTH) return null;

  const query = supabase
    .from("plant_care_cache")
    .select("id, common_name, scientific_name, perenual_id, sunlight, watering, soil, fertilizer, pruning, humidity, care_level, description, image_url, raw_perenual_json")
    .limit(1);

  const { data, error } = typeof queryOrPlantId === "number"
    ? await query.eq("perenual_id", queryOrPlantId).maybeSingle()
    : await query.or(`normalized_scientific_name.eq.${normalized},normalized_common_name.eq.${normalized}`).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  console.log(`[plant-care] source=supabase-cache query="${normalized}"`);
  return mapPlantCareRow(data as PlantCareCacheRow);
}

export async function getOrCreatePlantCareFromBackend(queryOrPlantId: string | number): Promise<PlantCareProfile | null> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const normalized = normalizePlantCareQuery(queryOrPlantId);
  if (typeof queryOrPlantId !== "number" && normalized.length < MIN_SEARCH_LENGTH) return null;

  const { data, error } = await supabase.functions.invoke<PlantCareProfile>("get-or-create-plant-care", {
    body: typeof queryOrPlantId === "number"
      ? { perenualId: queryOrPlantId }
      : { query: normalized },
  });

  if (error) {
    throw new Error(error.message || "Unable to fetch plant care.");
  }

  if (data?.source) {
    console.log(`[plant-care] source=${data.source} query="${normalized}"`);
  }

  return data ?? null;
}

export const fetchFromPerenual = getOrCreatePlantCareFromBackend;

export async function savePlantCareToSupabase(data: PlantCareProfile): Promise<void> {
  const lookupKey = data.perenualId ?? data.scientificName;
  await getOrCreatePlantCareFromBackend(lookupKey);
}

export async function getPlantCare(queryOrPlantId: string | number): Promise<PlantCareProfile | null> {
  const normalized = normalizePlantCareQuery(queryOrPlantId);
  if (typeof queryOrPlantId !== "number" && normalized.length < MIN_SEARCH_LENGTH) return null;

  const existingRequest = inFlightPlantCareRequests.get(normalized);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const cached = await getPlantCareFromSupabase(queryOrPlantId);
    if (cached) return cached;

    return getOrCreatePlantCareFromBackend(queryOrPlantId);
  })();

  inFlightPlantCareRequests.set(normalized, request);

  try {
    return await request;
  } finally {
    inFlightPlantCareRequests.delete(normalized);
  }
}

export function createPlantCareDebouncer(delayMs = 650) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (query: string, callback: (query: string) => void) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      const normalized = normalizePlantCareQuery(query);
      if (normalized.length >= MIN_SEARCH_LENGTH) callback(normalized);
    }, delayMs);
  };
}

export async function searchPlantCare(query: string): Promise<PlantCareProfile | null> {
  const normalized = normalizePlantCareQuery(query);
  if (normalized.length < MIN_SEARCH_LENGTH) return null;

  return getPlantCareFromSupabase(normalized);
}
