import { supabase } from "./supabase";
import { MarketListing } from "./listings";

export async function toggleFavorite(listingId: string, userId: string): Promise<boolean> {
  if (!supabase) throw new Error("Supabase is not configured.");

  // Check if favorite exists
  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("listing_id", listingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    // Delete favorite
    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("listing_id", listingId)
      .eq("user_id", userId);
    if (deleteError) throw deleteError;
    return false; // Not favorited anymore
  } else {
    // Insert favorite
    const { error: insertError } = await supabase
      .from("favorites")
      .insert({ listing_id: listingId, user_id: userId });
    if (insertError) throw insertError;
    return true; // Favorited now
  }
}

export async function isFavorited(listingId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("listing_id", listingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export async function getUserFavoriteIds(userId: string): Promise<string[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.listing_id);
}

function checkIsProtected(name: string, category: string): boolean {
  const normalized = (name + " " + category).toLowerCase();
  return normalized.includes("protected") || 
         normalized.includes("rare") || 
         normalized.includes("pitcher") || 
         normalized.includes("venus") || 
         normalized.includes("nepenthes") ||
         normalized.includes("rafflesia");
}

export async function getUserFavorites(userId: string): Promise<MarketListing[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select(`
      listing:listings (
        id,
        seller_id,
        name,
        local_name,
        scientific_name,
        category,
        price,
        quantity,
        unit,
        location,
        delivery_option,
        description,
        listing_photos (storage_path, alt_text, sort_order),
        seller:profiles!listings_seller_id_fkey (display_name, location)
      )
    `)
    .eq("user_id", userId);

  if (error) throw error;

  const getPhotoUrl = (storagePath?: string | null) => {
    if (!supabase || !storagePath) return null;
    return supabase.storage.from("listing-photos").getPublicUrl(storagePath).data.publicUrl;
  };

  const getSeller = (seller?: any) => {
    if (Array.isArray(seller)) {
      return seller[0] ?? null;
    }
    return seller ?? null;
  };

  const listings: MarketListing[] = [];

  for (const item of (data ?? [])) {
    if (!item.listing) continue;
    const listing: any = item.listing;
    const sortedPhotos = [...(listing.listing_photos ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
    const seller = getSeller(listing.seller);

    const idNum = listing.id.charCodeAt(0) || 0;
    const trustScore = 4.5 + (idNum % 5) / 10;
    const isAiChecked = (idNum % 10) < 8;
    const isProtected = checkIsProtected(listing.name, listing.category);

    listings.push({
      id: listing.id,
      sellerId: listing.seller_id,
      name: listing.name,
      localName: listing.local_name,
      scientificName: listing.scientific_name,
      category: listing.category,
      price: Number(listing.price),
      quantity: listing.quantity,
      unit: listing.unit,
      location: listing.location,
      deliveryOption: listing.delivery_option,
      description: listing.description,
      sellerName: seller?.display_name ?? "Verified seller",
      photoUrl: getPhotoUrl(sortedPhotos[0]?.storage_path),
      trustScore,
      isAiChecked,
      isProtected,
    });
  }

  return listings;
}
