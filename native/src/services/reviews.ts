import { supabase } from "./supabase";
import { sanitizeNullableUserInput } from "../utils/sanitize";
import { recordRankEvent } from "./rankings";

export type Review = {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName?: string;
  reviewerAvatar?: string | null;
};

export async function createReview(
  orderId: string,
  reviewerId: string,
  revieweeId: string,
  rating: number,
  comment: string | null
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("reviews").insert({
    order_id: orderId,
    reviewer_id: reviewerId,
    reviewee_id: revieweeId,
    rating,
    comment: sanitizeNullableUserInput(comment, { maxLength: 1000, preserveNewlines: true }),
  });

  if (error) {
    throw error;
  }

  // Record ranking events for XP/leveling
  recordRankEvent(reviewerId, "review_created").catch((err) =>
    console.warn("Failed to record review created rank event:", err)
  );
  recordRankEvent(revieweeId, "review_received").catch((err) =>
    console.warn("Failed to record review received rank event:", err)
  );
}

export async function getReviewsForUser(userId: string): Promise<Review[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(`
      id,
      order_id,
      reviewer_id,
      reviewee_id,
      rating,
      comment,
      created_at,
      reviewer:profiles!reviews_reviewer_id_fkey(display_name, avatar_url)
    `)
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => {
    const reviewer = Array.isArray(row.reviewer) ? row.reviewer[0] : row.reviewer;
    return {
      id: row.id,
      orderId: row.order_id,
      reviewerId: row.reviewer_id,
      revieweeId: row.reviewee_id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      reviewerName: reviewer?.display_name ?? "GrowMate User",
      reviewerAvatar: reviewer?.avatar_url,
    };
  });
}

export async function getReviewForOrder(orderId: string, reviewerId: string): Promise<Review | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("order_id", orderId)
    .eq("reviewer_id", reviewerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
