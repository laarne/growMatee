import { supabase } from "./supabase";
import type { PickedImage } from "./storage";

export type PlantCareProfile = {
  provider: "Perenual" | "GrowMate";
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

export type LeafyScanResult = {
  provider: string;
  bestMatch: string;
  scientificName: string | null;
  commonNames: string[];
  family: string | null;
  genus: string | null;
  confidence: number;
  category: string;
  careProfile?: PlantCareProfile | null;
  saleStatus: "safe_to_sell" | "review_required" | "blocked";
  reviewReason: string;
  alternativeMatches?: {
    name: string;
    scientificName: string | null;
    commonNames: string[];
    confidence: number;
    family: string | null;
    genus: string | null;
  }[];
  remainingRequests?: number;
  scanLimit?: {
    used: number;
    limit: number;
    windowMinutes: number;
  };
};

async function getFunctionErrorMessage(error: unknown) {
  const context = typeof error === "object" && error !== null && "context" in error ? (error as { context?: unknown }).context : null;

  if (context instanceof Response) {
    try {
      const body = (await context.json()) as { error?: unknown };
      if (typeof body.error === "string") return body.error;
    } catch {
      // Fall back to the SDK error message below.
    }
  }

  return error instanceof Error ? error.message : "Leafy scan failed.";
}

export async function scanPlantWithLeafy(image: PickedImage): Promise<LeafyScanResult> {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (!image.base64) throw new Error("Choose an image again so Leafy can scan it.");

  const { data, error } = await supabase.functions.invoke<LeafyScanResult>("leafy-scan", {
    body: {
      imageBase64: image.base64,
      mimeType: image.mimeType ?? "image/jpeg",
      organ: "auto",
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  if (!data) {
    throw new Error("Leafy scan did not return a result.");
  }

  return data;
}
