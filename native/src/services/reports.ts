import { supabase } from "./supabase";
import { sanitizeNullableUserInput, sanitizeUserInput } from "../utils/sanitize";

export type ReportInput = {
  reporterId: string;
  listingId?: string;
  postId?: string;
  reportedUserId?: string;
  reason: string;
  details?: string;
};

export type Report = {
  id: string;
  reporterId: string;
  listingId: string | null;
  postId: string | null;
  reportedUserId: string | null;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
  reporterName?: string;
  reportedTargetName?: string;
};

export async function createReport(input: ReportInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const reason = sanitizeUserInput(input.reason, { maxLength: 80 });
  if (!reason) throw new Error("Report reason is required.");

  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    listing_id: input.listingId || null,
    post_id: input.postId || null,
    reported_user_id: input.reportedUserId || null,
    reason,
    details: sanitizeNullableUserInput(input.details, { maxLength: 1000, preserveNewlines: true }),
    status: "open",
  });

  if (error) {
    throw error;
  }
}

export async function getReportsForAdmin(): Promise<Report[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reports")
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(display_name),
      reported_user:profiles!reports_reported_user_id_fkey(display_name),
      listing:listings(name),
      post:feed_posts(title, body)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => {
    const reporter = Array.isArray(row.reporter) ? row.reporter[0] : row.reporter;
    const reportedUser = Array.isArray(row.reported_user) ? row.reported_user[0] : row.reported_user;
    const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
    const post = Array.isArray(row.post) ? row.post[0] : row.post;

    let targetName = "";
    if (listing) targetName = `Listing: ${listing.name}`;
    else if (reportedUser) targetName = `User: ${reportedUser.display_name}`;
    else if (post) targetName = `Post: ${post.title || post.body.substring(0, 20)}`;

    return {
      id: row.id,
      reporterId: row.reporter_id,
      listingId: row.listing_id,
      postId: row.post_id,
      reportedUserId: row.reported_user_id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.created_at,
      reporterName: reporter?.display_name ?? "GrowMate User",
      reportedTargetName: targetName || "Unknown content",
    };
  });
}

export async function updateReportStatus(reportId: string, status: Report["status"]): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.rpc("admin_update_report_status", {
    p_report_id: reportId,
    p_status: status,
  });

  if (error) {
    throw error;
  }
}
