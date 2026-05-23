import { supabase } from "./supabase";

type ListingPhotoRow = {
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
};

type SellerRow = {
  display_name: string;
  location: string | null;
};

type ListingRow = {
  id: string;
  seller_id: string;
  name: string;
  local_name: string | null;
  scientific_name: string | null;
  category: string;
  price: number | string;
  quantity: number;
  unit: string;
  location: string;
  delivery_option: string;
  description: string | null;
  listing_photos?: ListingPhotoRow[];
  seller?: SellerRow | SellerRow[] | null;
  published_at?: string | null;
};

export type MarketListing = {
  id: string;
  sellerId: string;
  name: string;
  localName: string | null;
  scientificName: string | null;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  location: string;
  deliveryOption: string;
  description: string | null;
  sellerName: string;
  photoUrl: string | null;
  publishedAt?: string | null;
};

export type SellerListing = {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  location: string;
  status: string;
  createdAt: string;
};

export type ListingInput = {
  sellerId: string;
  name: string;
  localName?: string;
  scientificName?: string;
  category: string;
  price: number;
  quantity: number;
  unit: "Pot" | "Cutting" | "Seedling" | "Node" | "Pack";
  location: string;
  deliveryOption: string;
  description?: string;
  photoPath?: string | null;
  aiProvider?: string | null;
  aiConfidence?: number | null;
  aiResult?: Record<string, unknown> | null;
};

function getPhotoUrl(storagePath?: string | null) {
  if (!supabase || !storagePath) return null;
  return supabase.storage.from("listing-photos").getPublicUrl(storagePath).data.publicUrl;
}

function getSeller(seller?: SellerRow | SellerRow[] | null) {
  if (Array.isArray(seller)) {
    return seller[0] ?? null;
  }

  return seller ?? null;
}

export async function getActiveListings(searchTerm = "", limit = 10, lastPublishedAt?: string): Promise<MarketListing[]> {
  if (!supabase) return [];

  let query = supabase
    .from("listings")
    .select(
      `
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
      published_at,
      listing_photos(storage_path, alt_text, sort_order),
      seller:profiles!listings_seller_id_fkey(display_name, location)
    `,
    )
    .eq("status", "active");

  const trimmedSearch = searchTerm.trim();
  if (trimmedSearch) {
    query = query.or(`name.ilike.%${trimmedSearch}%,local_name.ilike.%${trimmedSearch}%,category.ilike.%${trimmedSearch}%`);
  }

  if (lastPublishedAt) {
    query = query.lt("published_at", lastPublishedAt);
  }

  query = query
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as ListingRow[]).map((listing) => {
    const sortedPhotos = [...(listing.listing_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const seller = getSeller(listing.seller);

    return {
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
      publishedAt: listing.published_at ?? null,
    };
  });
}

export async function createPendingOrder(listing: MarketListing, buyerId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const subtotal = listing.price;
  const platformFee = Math.round(subtotal * 0.1 * 100) / 100;

  const { error } = await supabase.from("orders").insert({
    listing_id: listing.id,
    buyer_id: buyerId,
    seller_id: listing.sellerId,
    quantity: 1,
    subtotal,
    platform_fee: platformFee,
    status: "pending",
    meetup_or_delivery: listing.deliveryOption,
  });

  if (error) {
    throw error;
  }
}

export async function getSellerListings(sellerId: string): Promise<SellerListing[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("listings")
    .select("id, name, category, price, quantity, unit, location, status, created_at")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((listing) => ({
    id: listing.id,
    name: listing.name,
    category: listing.category,
    price: Number(listing.price),
    quantity: listing.quantity,
    unit: listing.unit,
    location: listing.location,
    status: listing.status,
    createdAt: listing.created_at,
  }));
}

export async function createListingForReview(input: ListingInput) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("listings")
    .insert({
      seller_id: input.sellerId,
      name: input.name,
      local_name: input.localName || null,
      scientific_name: input.scientificName || null,
      category: input.category,
      price: input.price,
      quantity: input.quantity,
      unit: input.unit,
      location: input.location,
      delivery_option: input.deliveryOption,
      description: input.description || null,
      ai_provider: input.aiProvider || null,
      ai_confidence: input.aiConfidence ?? null,
      ai_result: input.aiResult ?? {},
      status: "review",
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  if (input.photoPath) {
    const { error: photoError } = await supabase.from("listing_photos").insert({
      listing_id: data.id,
      seller_id: input.sellerId,
      storage_path: input.photoPath,
      alt_text: input.name,
      sort_order: 0,
    });

    if (photoError) {
      throw photoError;
    }
  }
}

export type Order = {
  id: string;
  listingId: string;
  listingName: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
  subtotal: number;
  platformFee: number;
  status: "pending" | "paid" | "completed" | "cancelled" | "refunded" | "disputed";
  meetupOrDelivery: string | null;
  createdAt: string;
};

type ProfileJoinRow = {
  display_name: string;
};

type ListingJoinRow = {
  name: string;
};

type OrderQueryRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  quantity: number;
  subtotal: number | string;
  platform_fee: number | string;
  status: Order["status"];
  meetup_or_delivery: string | null;
  created_at: string;
  listings: ListingJoinRow | ListingJoinRow[] | null;
  buyer: ProfileJoinRow | ProfileJoinRow[] | null;
  seller: ProfileJoinRow | ProfileJoinRow[] | null;
};

export async function getUserOrders(userId: string): Promise<Order[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      quantity,
      subtotal,
      platform_fee,
      status,
      meetup_or_delivery,
      created_at,
      listings!orders_listing_id_fkey(name),
      buyer:profiles!orders_buyer_id_fkey(display_name),
      seller:profiles!orders_seller_id_fkey(display_name)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rawRows = (data ?? []) as unknown as OrderQueryRow[];

  return rawRows.map((row) => {
    const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings;
    const buyer = Array.isArray(row.buyer) ? row.buyer[0] : row.buyer;
    const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;

    return {
      id: row.id,
      listingId: row.listing_id,
      listingName: listing?.name ?? "Unknown Plant",
      buyerId: row.buyer_id,
      buyerName: buyer?.display_name ?? "GrowMate Buyer",
      sellerId: row.seller_id,
      sellerName: seller?.display_name ?? "GrowMate Seller",
      quantity: row.quantity,
      subtotal: Number(row.subtotal),
      platformFee: Number(row.platform_fee),
      status: row.status,
      meetupOrDelivery: row.meetup_or_delivery,
      createdAt: row.created_at,
    };
  });
}

export async function updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}

export async function updateListing(listingId: string, input: Partial<ListingInput>) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const updates: any = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.localName !== undefined) updates.local_name = input.localName || null;
  if (input.scientificName !== undefined) updates.scientific_name = input.scientificName || null;
  if (input.category !== undefined) updates.category = input.category;
  if (input.price !== undefined) updates.price = input.price;
  if (input.quantity !== undefined) updates.quantity = input.quantity;
  if (input.unit !== undefined) updates.unit = input.unit;
  if (input.location !== undefined) updates.location = input.location;
  if (input.deliveryOption !== undefined) updates.delivery_option = input.deliveryOption;
  if (input.description !== undefined) updates.description = input.description || null;

  const { error } = await supabase
    .from("listings")
    .update(updates)
    .eq("id", listingId);

  if (error) {
    throw error;
  }

  if (input.photoPath) {
    const { error: deletePhotosError } = await supabase
      .from("listing_photos")
      .delete()
      .eq("listing_id", listingId);

    if (deletePhotosError) throw deletePhotosError;

    const { error: photoError } = await supabase.from("listing_photos").insert({
      listing_id: listingId,
      seller_id: input.sellerId,
      storage_path: input.photoPath,
      alt_text: input.name,
      sort_order: 0,
    });

    if (photoError) {
      throw photoError;
    }
  }
}

export async function deleteListing(listingId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("listings")
    .update({ status: "archived" })
    .eq("id", listingId);

  if (error) {
    throw error;
  }
}

export type ListingDetail = {
  id: string;
  sellerId: string;
  name: string;
  localName: string | null;
  scientificName: string | null;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  location: string;
  deliveryOption: string;
  description: string | null;
  photoUrls: string[];
  sellerName: string;
};

export async function getListingDetail(listingId: string): Promise<ListingDetail | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("listings")
    .select(`
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
      listing_photos(storage_path, alt_text, sort_order),
      seller:profiles!listings_seller_id_fkey(display_name, location)
    `)
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  const listing = data as unknown as ListingRow;
  const sortedPhotos = [...(listing.listing_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const seller = getSeller(listing.seller);

  const photoUrls = sortedPhotos.map(photo => getPhotoUrl(photo.storage_path)).filter(Boolean) as string[];

  return {
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
    photoUrls,
    sellerName: seller?.display_name ?? "Verified seller",
  };
}

