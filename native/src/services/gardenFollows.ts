import { supabase } from "./supabase";

export type GardenPreviewPlant = {
  id: string;
  name: string;
  category: string | null;
  condition: string | null;
  label: string;
  photoUrl: string | null;
  sourceListingId: string | null;
};

export type FollowedGarden = {
  id: string;
  name: string;
  bio: string | null;
  coverPhotoUrl: string | null;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  location: string | null;
  isVerifiedSeller: boolean;
  trustScore: number | null;
  completedSales: number;
  plantCount: number;
  activeListingsCount: number;
  firstListingId: string | null;
  firstListingName: string | null;
  previewPlants: GardenPreviewPlant[];
  previewPhotoUrls: string[];
};

function getGardenPhotoUrl(storagePath?: string | null) {
  if (!supabase || !storagePath) return null;
  return supabase.storage.from("garden-photos").getPublicUrl(storagePath).data.publicUrl;
}

type BaseGarden = Omit<
  FollowedGarden,
  "plantCount" | "activeListingsCount" | "firstListingId" | "firstListingName" | "previewPlants" | "previewPhotoUrls"
>;

function getPersonalizedGardenName(rawName: string | null | undefined, userName: string | null | undefined) {
  const name = rawName?.trim();
  const owner = userName?.trim() || "GrowMate";
  const genericNames = ["my plant collection", "plant collection", "my garden", "garden"];

  if (name && !genericNames.includes(name.toLowerCase())) {
    return name;
  }

  const firstName = owner.split(/\s+/)[0] || owner;
  return `${firstName}${firstName.toLowerCase().endsWith("s") ? "'" : "'s"} Plant Collection`;
}

function getPreviewLabel(plant: {
  category?: string | null;
  condition?: string | null;
  source_listing_id?: string | null;
}) {
  const category = plant.category?.toLowerCase() ?? "";
  const condition = plant.condition?.toLowerCase() ?? "";

  if (plant.source_listing_id) return "For Sale";
  if (category.includes("rare")) return "Rare";
  if (condition.includes("healthy") || condition.includes("thriving")) return "Healthy";
  return "AI Checked";
}

async function enrichGarden(garden: BaseGarden): Promise<FollowedGarden> {
  if (!supabase || !garden.id) {
    return {
      ...garden,
      plantCount: 0,
      activeListingsCount: 0,
      firstListingId: null,
      firstListingName: null,
      previewPlants: [],
      previewPhotoUrls: [],
    };
  }

  const [plantsResult, listingsResult, previewResult] = await Promise.all([
    supabase.from("garden_plants").select("id", { count: "exact", head: true }).eq("garden_id", garden.id),
    supabase
      .from("listings")
      .select("id, name", { count: "exact" })
      .eq("seller_id", garden.userId)
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .limit(1),
    supabase
      .from("garden_plants")
      .select("id, name, category, condition, source_listing_id, garden_plant_photos(storage_path, sort_order)")
      .eq("garden_id", garden.id)
      .limit(6),
  ]);

  if (plantsResult.error) throw plantsResult.error;
  if (listingsResult.error) throw listingsResult.error;
  if (previewResult.error) throw previewResult.error;

  const previewPlants = ((previewResult.data ?? []) as any[])
    .map((plant): GardenPreviewPlant => {
      const sortedPhotos = [...(plant.garden_plant_photos ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );

      return {
        id: plant.id,
        name: plant.name ?? "Plant",
        category: plant.category ?? null,
        condition: plant.condition ?? null,
        sourceListingId: plant.source_listing_id ?? null,
        label: getPreviewLabel(plant),
        photoUrl: getGardenPhotoUrl(sortedPhotos[0]?.storage_path),
      };
    })
    .slice(0, 6);

  const previewPhotoUrls = previewPlants.map((plant) => plant.photoUrl).filter(Boolean).slice(0, 3) as string[];

  const firstListing = listingsResult.data?.[0] ?? null;

  return {
    ...garden,
    plantCount: plantsResult.count ?? 0,
    activeListingsCount: listingsResult.count ?? 0,
    firstListingId: firstListing?.id ?? null,
    firstListingName: firstListing?.name ?? null,
    previewPlants,
    previewPhotoUrls,
  };
}

function getSellerProfileJoin(owner: any) {
  if (!owner?.seller_profiles) return null;
  return Array.isArray(owner.seller_profiles) ? owner.seller_profiles[0] : owner.seller_profiles;
}

export async function isFollowingGarden(gardenId: string, followerId: string): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("garden_follows")
    .select("garden_id")
    .eq("garden_id", gardenId)
    .eq("follower_id", followerId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export async function toggleFollowGarden(gardenId: string, followerId: string): Promise<boolean> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("garden_follows")
    .select("garden_id")
    .eq("garden_id", gardenId)
    .eq("follower_id", followerId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    const { error: deleteError } = await supabase
      .from("garden_follows")
      .delete()
      .eq("garden_id", gardenId)
      .eq("follower_id", followerId);
    if (deleteError) throw deleteError;
    return false; // Unfollowed
  } else {
    const { error: insertError } = await supabase
      .from("garden_follows")
      .insert({ garden_id: gardenId, follower_id: followerId });
    if (insertError) throw insertError;
    return true; // Followed
  }
}

export async function getGardenFollowerCount(gardenId: string): Promise<number> {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("garden_follows")
    .select("*", { count: "exact", head: true })
    .eq("garden_id", gardenId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getFollowedGardens(followerId: string): Promise<FollowedGarden[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("garden_follows")
    .select(`
      garden:gardens (
        id,
        name,
        bio,
        cover_photo_url,
        user_id,
        owner:profiles!gardens_user_id_fkey(
          display_name,
          avatar_url,
          location,
          seller_status,
          seller_profiles(trust_score, completed_sales)
        )
      )
    `)
    .eq("follower_id", followerId);

  if (error) {
    throw error;
  }

  const gardens = (data ?? []).map((row: any): BaseGarden => {
    const garden = row.garden;
    const owner = Array.isArray(garden?.owner) ? garden.owner[0] : garden?.owner;
    const sellerProfile = getSellerProfileJoin(owner);

    const userName = owner?.display_name ?? "GrowMate Gardener";
    return {
      id: garden?.id ?? "",
      name: getPersonalizedGardenName(garden?.name, userName),
      bio: garden?.bio ?? null,
      coverPhotoUrl: garden?.cover_photo_url ?? null,
      userId: garden?.user_id ?? "",
      userName,
      avatarUrl: owner?.avatar_url ?? null,
      location: owner?.location ?? null,
      isVerifiedSeller: owner?.seller_status === "verified",
      trustScore: sellerProfile?.trust_score === undefined ? null : Number(sellerProfile.trust_score),
      completedSales: sellerProfile?.completed_sales ?? 0,
    };
  });

  return Promise.all(gardens.map(enrichGarden));
}

export async function getDiscoverableGardens(currentUserId: string): Promise<FollowedGarden[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("gardens")
    .select(`
      id,
      name,
      bio,
      cover_photo_url,
      user_id,
      owner:profiles!gardens_user_id_fkey(
        display_name,
        avatar_url,
        location,
        seller_status,
        seller_profiles(trust_score, completed_sales)
      )
    `)
    .eq("is_public", true)
    .neq("user_id", currentUserId)
    .limit(20);

  if (error) throw error;

  const gardens = (data ?? []).map((garden: any): BaseGarden => {
    const owner = Array.isArray(garden.owner) ? garden.owner[0] : garden.owner;
    const sellerProfile = getSellerProfileJoin(owner);
    const userName = owner?.display_name ?? "GrowMate Gardener";
    return {
      id: garden.id,
      name: getPersonalizedGardenName(garden.name, userName),
      bio: garden.bio,
      coverPhotoUrl: garden.cover_photo_url,
      userId: garden.user_id,
      userName,
      avatarUrl: owner?.avatar_url ?? null,
      location: owner?.location ?? null,
      isVerifiedSeller: owner?.seller_status === "verified",
      trustScore: sellerProfile?.trust_score === undefined ? null : Number(sellerProfile.trust_score),
      completedSales: sellerProfile?.completed_sales ?? 0,
    };
  });

  return Promise.all(gardens.map(enrichGarden));
}
