import { supabase } from "./supabase";
import { createPrivateImageSignedUrl } from "./storage";

type ProfileRow = {
  id: string;
  display_name: string;
  location: string | null;
};

type SellerApplicationRow = {
  id: string;
  user_id: string;
  shop_name: string | null;
  reason: string | null;
  proof_photo_url: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  selfie_with_id_url: string | null;
  selfie_with_plant_url: string | null;
  status: string;
  created_at: string;
};

type ListingReviewRow = {
  id: string;
  seller_id: string;
  name: string;
  local_name: string | null;
  category: string;
  price: number | string;
  quantity: number;
  unit: string;
  location: string;
  description: string | null;
  ai_confidence: number | string | null;
  created_at: string;
};

export type PendingSellerApplication = {
  id: string;
  userId: string;
  applicantName: string;
  applicantLocation: string | null;
  shopName: string | null;
  reason: string | null;
  proofPhotoUrl: string | null;
  idFrontUrl: string | null;
  idBackUrl: string | null;
  selfieWithIdUrl: string | null;
  selfieWithPlantUrl: string | null;
  status: string;
  createdAt: string;
};

export type PendingListingReview = {
  id: string;
  sellerId: string;
  sellerName: string;
  name: string;
  localName: string | null;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  location: string;
  description: string | null;
  aiConfidence: number | null;
  createdAt: string;
};

async function getProfilesByIds(ids: string[]) {
  if (!supabase || ids.length === 0) return new Map<string, ProfileRow>();

  const { data, error } = await supabase.from("profiles").select("id, display_name, location").in("id", ids);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile as ProfileRow]));
}

export async function getPendingSellerApplications(): Promise<PendingSellerApplication[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("seller_applications")
    .select("id, user_id, shop_name, reason, proof_photo_url, id_front_url, id_back_url, selfie_with_id_url, selfie_with_plant_url, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const applications = (data ?? []) as SellerApplicationRow[];
  const profiles = await getProfilesByIds(applications.map((application) => application.user_id));

  return Promise.all(applications.map(async (application) => {
    const profile = profiles.get(application.user_id);

    return {
      id: application.id,
      userId: application.user_id,
      applicantName: profile?.display_name ?? "GrowMate user",
      applicantLocation: profile?.location ?? null,
      shopName: application.shop_name,
      reason: application.reason,
      proofPhotoUrl: await createPrivateImageSignedUrl("verification-docs", application.proof_photo_url),
      idFrontUrl: await createPrivateImageSignedUrl("verification-docs", application.id_front_url),
      idBackUrl: await createPrivateImageSignedUrl("verification-docs", application.id_back_url),
      selfieWithIdUrl: await createPrivateImageSignedUrl("verification-docs", application.selfie_with_id_url),
      selfieWithPlantUrl: await createPrivateImageSignedUrl("verification-docs", application.selfie_with_plant_url),
      status: application.status,
      createdAt: application.created_at,
    };
  }));
}

export async function getPendingListingReviews(): Promise<PendingListingReview[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("listings")
    .select("id, seller_id, name, local_name, category, price, quantity, unit, location, description, ai_confidence, created_at")
    .eq("status", "review")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const listings = (data ?? []) as ListingReviewRow[];
  const profiles = await getProfilesByIds(listings.map((listing) => listing.seller_id));

  return listings.map((listing) => {
    const profile = profiles.get(listing.seller_id);

    return {
      id: listing.id,
      sellerId: listing.seller_id,
      sellerName: profile?.display_name ?? "Verified seller",
      name: listing.name,
      localName: listing.local_name,
      category: listing.category,
      price: Number(listing.price),
      quantity: listing.quantity,
      unit: listing.unit,
      location: listing.location,
      description: listing.description,
      aiConfidence: listing.ai_confidence === null ? null : Number(listing.ai_confidence),
      createdAt: listing.created_at,
    };
  });
}

export async function approveSellerApplication(application: PendingSellerApplication, adminId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  void adminId;
  const { error } = await supabase.rpc("admin_approve_seller_application", {
    p_application_id: application.id,
  });
  if (error) throw error;
}

export async function rejectSellerApplication(application: PendingSellerApplication, adminId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  void adminId;
  const { error } = await supabase.rpc("admin_reject_seller_application", {
    p_application_id: application.id,
  });
  if (error) throw error;
}

export async function approveListingReview(listingId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("admin_set_listing_review_status", {
    p_listing_id: listingId,
    p_status: "active",
    p_review_note: "Approved for marketplace.",
  });
  if (error) throw error;
}

export async function rejectListingReview(listingId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("admin_set_listing_review_status", {
    p_listing_id: listingId,
    p_status: "rejected",
    p_review_note: "Listing rejected by admin.",
  });
  if (error) throw error;
}
