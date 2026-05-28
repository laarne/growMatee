import { supabase } from "./supabase";
import { sanitizeNullableUserInput, sanitizeSearchInput, sanitizeUserInput } from "../utils/sanitize";
import { recordRankEvent } from "./rankings";

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
  status?: string;
  created_at?: string;
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
  trustScore: number;
  isAiChecked: boolean;
  isProtected: boolean;
};

export type SellerListing = {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  location: string;
  deliveryOption: string;
  status: string;
  createdAt: string;
  photoUrl: string | null;
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
  /** When 'active', listing goes live immediately (Leafy AI cleared it). Default: 'review' */
  initialStatus?: "active" | "review";
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

  const trimmedSearch = sanitizeSearchInput(searchTerm);
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
    const idNum = listing.id.charCodeAt(0) || 0;
    const trustScore = 4.5 + (idNum % 5) / 10;
    const isAiChecked = (idNum % 10) < 8; // 80% are AI verified in the mock
    const isProtected = checkIsProtected(listing.name, listing.category);

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
      trustScore,
      isAiChecked,
      isProtected,
    };
  });
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

export async function createPendingOrder(
  listing: MarketListing,
  buyerId: string,
  quantity: number = 1,
  deliveryOption: string = "Delivery"
): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const sanitizedDeliveryOption = sanitizeUserInput(deliveryOption, { maxLength: 120 }) || "Delivery";
  if (!buyerId) throw new Error("Sign in before placing an order.");

  const { data, error } = await supabase.rpc("create_order_for_listing", {
    p_listing_id: listing.id,
    p_quantity: quantity,
    p_delivery_option: sanitizedDeliveryOption,
  });

  if (error) {
    throw error;
  }
  return data;
}

export async function getSellerListings(sellerId: string): Promise<SellerListing[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("listings")
    .select("id, name, category, price, quantity, unit, location, delivery_option, status, created_at, listing_photos(storage_path, alt_text, sort_order)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as ListingRow[]).map((listing) => {
    const sortedPhotos = [...(listing.listing_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);

    return {
      id: listing.id,
      name: listing.name,
      category: listing.category,
      price: Number(listing.price),
      quantity: listing.quantity,
      unit: listing.unit,
      location: listing.location,
      deliveryOption: listing.delivery_option,
      status: listing.status ?? "draft",
      createdAt: listing.created_at ?? new Date().toISOString(),
      photoUrl: getPhotoUrl(sortedPhotos[0]?.storage_path),
    };
  });
}

export async function createListingForReview(input: ListingInput) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const status = input.initialStatus ?? "review";
  const isActive = status === "active";
  const sanitizedName = sanitizeUserInput(input.name, { maxLength: 100 });
  const sanitizedCategory = sanitizeUserInput(input.category, { maxLength: 60 });
  const sanitizedLocation = sanitizeUserInput(input.location, { maxLength: 120 });
  const sanitizedDeliveryOption = sanitizeUserInput(input.deliveryOption, { maxLength: 120 });

  if (typeof input.price !== "number" || isNaN(input.price) || input.price <= 0) {
    throw new Error("Price must be a positive number.");
  }

  if (typeof input.quantity !== "number" || !Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error("Quantity must be a positive integer.");
  }

  if (!sanitizedName || !sanitizedCategory || !sanitizedLocation || !sanitizedDeliveryOption) {
    throw new Error("Listing name, category, location, and delivery option are required.");
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({
      seller_id: input.sellerId,
      name: sanitizedName,
      local_name: sanitizeNullableUserInput(input.localName, { maxLength: 100 }),
      scientific_name: sanitizeNullableUserInput(input.scientificName, { maxLength: 120 }),
      category: sanitizedCategory,
      price: input.price,
      quantity: input.quantity,
      unit: input.unit,
      location: sanitizedLocation,
      delivery_option: sanitizedDeliveryOption,
      description: sanitizeNullableUserInput(input.description, { maxLength: 1500, preserveNewlines: true }),
      ai_provider: sanitizeNullableUserInput(input.aiProvider, { maxLength: 80 }),
      ai_confidence: input.aiConfidence ?? null,
      ai_result: input.aiResult ?? {},
      status,
      // Auto-set published_at when going live immediately
      published_at: isActive ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  // Record ranking event for XP/leveling
  recordRankEvent(input.sellerId, "listing_created").catch((err) => {
    console.warn("Failed to record listing rank event:", err);
  });

  if (input.photoPath) {
    const { error: photoError } = await supabase.from("listing_photos").insert({
      listing_id: data.id,
      seller_id: input.sellerId,
      storage_path: input.photoPath,
      alt_text: sanitizedName,
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
  status: "pending" | "accepted" | "paid" | "completed" | "cancelled" | "refunded" | "disputed";
  meetupOrDelivery: string | null;
  createdAt: string;
  photoUrl?: string | null;
};

type ProfileJoinRow = {
  display_name: string;
};

type ListingJoinRow = {
  name: string;
  listing_photos?: ListingPhotoRow | ListingPhotoRow[] | null;
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
      listings!orders_listing_id_fkey(
        name,
        listing_photos(storage_path, alt_text, sort_order)
      ),
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

    const photosRaw = listing?.listing_photos;
    const photos = Array.isArray(photosRaw)
      ? photosRaw
      : photosRaw
      ? [photosRaw]
      : [];
    const sortedPhotos = [...photos].sort((a, b) => a.sort_order - b.sort_order);
    const photoUrl = sortedPhotos[0]?.storage_path
      ? getPhotoUrl(sortedPhotos[0].storage_path)
      : null;

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
      photoUrl,
    };
  });
}

export async function updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.rpc("update_order_status_secure", {
    p_order_id: orderId,
    p_status: status,
  });

  if (error) {
    throw error;
  }

  if (status === "completed") {
    try {
      const { data: orderData } = await supabase
        .from("orders")
        .select("buyer_id, seller_id")
        .eq("id", orderId)
        .maybeSingle();

      if (orderData) {
        recordRankEvent(orderData.buyer_id, "purchase_completed").catch((err) =>
          console.warn("Failed to record purchase completed rank event:", err)
        );
        recordRankEvent(orderData.seller_id, "sale_completed").catch((err) =>
          console.warn("Failed to record sale completed rank event:", err)
        );
      }
    } catch (err) {
      console.warn("Failed to retrieve order data for ranking events:", err);
    }
  }
}

export async function updateListing(listingId: string, input: Partial<ListingInput>) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const updates: any = {};
  if (input.name !== undefined) updates.name = sanitizeUserInput(input.name, { maxLength: 100 });
  if (input.localName !== undefined) updates.local_name = sanitizeNullableUserInput(input.localName, { maxLength: 100 });
  if (input.scientificName !== undefined) updates.scientific_name = sanitizeNullableUserInput(input.scientificName, { maxLength: 120 });
  if (input.category !== undefined) updates.category = sanitizeUserInput(input.category, { maxLength: 60 });
  if (input.price !== undefined) updates.price = input.price;
  if (input.quantity !== undefined) updates.quantity = input.quantity;
  if (input.unit !== undefined) updates.unit = input.unit;
  if (input.location !== undefined) updates.location = sanitizeUserInput(input.location, { maxLength: 120 });
  if (input.deliveryOption !== undefined) updates.delivery_option = sanitizeUserInput(input.deliveryOption, { maxLength: 120 });
  if (input.description !== undefined) updates.description = sanitizeNullableUserInput(input.description, { maxLength: 1500, preserveNewlines: true });

  if (
    updates.name === "" ||
    updates.category === "" ||
    updates.location === "" ||
    updates.delivery_option === ""
  ) {
    throw new Error("Listing name, category, location, and delivery option are required.");
  }

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
      alt_text: sanitizeNullableUserInput(input.name, { maxLength: 100 }),
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
  trustScore: number;
  isAiChecked: boolean;
  isProtected: boolean;
  sellerRating: number;
  sellerReviewCount: number;
  isSellerVerified: boolean;
  sellerLocation: string;
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
  const idNum = listing.id.charCodeAt(0) || 0;
  const sellerIdNum = listing.seller_id.charCodeAt(0) || 0;
  const trustScore = 4.5 + (idNum % 5) / 10;
  const isAiChecked = (idNum % 10) < 8;
  const isProtected = checkIsProtected(listing.name, listing.category);
  const sellerReviewCount = (sellerIdNum % 20) + 6;
  const isSellerVerified = (sellerIdNum % 2) === 0;

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
    trustScore,
    isAiChecked,
    isProtected,
    sellerRating: trustScore,
    sellerReviewCount,
    isSellerVerified,
    sellerLocation: seller?.location ?? listing.location,
  };
}
