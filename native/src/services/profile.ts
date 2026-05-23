import { supabase } from "./supabase";

export type SellerStatus = "not_applied" | "pending" | "verified" | "rejected" | "suspended";

export type Profile = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  bio: string | null;
  seller_status: SellerStatus;
  is_admin: boolean;
};

export async function getCurrentProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfileAvatar(userId: string, avatarUrl: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
  if (error) throw error;
}

export async function updateProfileCover(userId: string, coverUrl: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("profiles").update({ cover_url: coverUrl }).eq("id", userId);
  if (error) throw error;
}

export async function updateProfile(
  userId: string,
  updates: { display_name: string; username?: string | null; bio?: string | null; location?: string | null }
) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: updates.display_name,
      username: updates.username === "" ? null : updates.username,
      bio: updates.bio === "" ? null : updates.bio,
      location: updates.location === "" ? null : updates.location,
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

export type SellerProfile = {
  userId: string;
  shopName: string;
  sellerBio: string | null;
  trustScore: number;
  completedSales: number;
  displayName: string;
  avatarUrl: string | null;
  location: string | null;
  createdAt: string;
};

export async function getSellerProfile(sellerId: string): Promise<SellerProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("seller_profiles")
    .select(`
      user_id,
      shop_name,
      seller_bio,
      trust_score,
      completed_sales,
      created_at,
      profile:profiles!seller_profiles_user_id_fkey(display_name, avatar_url, location)
    `)
    .eq("user_id", sellerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  const profile = Array.isArray(data.profile) ? data.profile[0] : data.profile;

  return {
    userId: data.user_id,
    shopName: data.shop_name,
    sellerBio: data.seller_bio,
    trustScore: Number(data.trust_score),
    completedSales: data.completed_sales,
    displayName: profile?.display_name ?? "Verified Seller",
    avatarUrl: profile?.avatar_url ?? null,
    location: profile?.location ?? null,
    createdAt: data.created_at,
  };
}
