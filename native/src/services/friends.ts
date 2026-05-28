import { supabase } from "./supabase";

export type FriendStatus = "none" | "request_sent" | "request_received" | "friends";

type FriendRequestRow = {
  id?: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
};

type FriendProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
};

type FriendRequestJoinRow = FriendRequestRow & {
  id: string;
  created_at: string;
  requester: FriendProfileRow | FriendProfileRow[] | null;
  recipient: FriendProfileRow | FriendProfileRow[] | null;
};

export type FriendListItem = {
  requestId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  location: string | null;
  status: FriendStatus;
  createdAt: string;
};

export type FriendSections = {
  friends: FriendListItem[];
  received: FriendListItem[];
  sent: FriendListItem[];
};

function getProfile(profile: FriendProfileRow | FriendProfileRow[] | null) {
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile ?? null;
}

export async function getFriendStatus(currentUserId: string, otherUserId: string): Promise<FriendStatus> {
  if (!supabase || currentUserId === otherUserId) return "none";

  const { data, error } = await supabase
    .from("friend_requests")
    .select("requester_id, recipient_id, status")
    .or(`and(requester_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (error || !data) return "none";

  const request = data as FriendRequestRow;
  if (request.status === "accepted") return "friends";
  return request.requester_id === currentUserId ? "request_sent" : "request_received";
}

export async function sendFriendRequest(currentUserId: string, recipientId: string): Promise<FriendStatus> {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (currentUserId === recipientId) return "none";

  const existingStatus = await getFriendStatus(currentUserId, recipientId);
  if (existingStatus !== "none") return existingStatus;

  const { error } = await supabase
    .from("friend_requests")
    .insert({
      requester_id: currentUserId,
      recipient_id: recipientId,
      status: "pending",
    });

  if (error) throw error;
  return "request_sent";
}

export async function getFriendSections(currentUserId: string): Promise<FriendSections> {
  if (!supabase) return { friends: [], received: [], sent: [] };

  const { data, error } = await supabase
    .from("friend_requests")
    .select(`
      id,
      requester_id,
      recipient_id,
      status,
      created_at,
      requester:profiles!friend_requests_requester_id_fkey(id, display_name, avatar_url, location),
      recipient:profiles!friend_requests_recipient_id_fkey(id, display_name, avatar_url, location)
    `)
    .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[friends] getFriendSections failed:", error.message);
    return { friends: [], received: [], sent: [] };
  }

  const sections: FriendSections = { friends: [], received: [], sent: [] };

  ((data ?? []) as unknown as FriendRequestJoinRow[]).forEach((request) => {
    const isRequester = request.requester_id === currentUserId;
    const otherProfile = getProfile(isRequester ? request.recipient : request.requester);
    const item: FriendListItem = {
      requestId: request.id,
      userId: isRequester ? request.recipient_id : request.requester_id,
      displayName: otherProfile?.display_name?.trim() || "GrowMate Gardener",
      avatarUrl: otherProfile?.avatar_url ?? null,
      location: otherProfile?.location ?? null,
      status: request.status === "accepted" ? "friends" : isRequester ? "request_sent" : "request_received",
      createdAt: request.created_at,
    };

    if (item.status === "friends") sections.friends.push(item);
    else if (item.status === "request_received") sections.received.push(item);
    else sections.sent.push(item);
  });

  return sections;
}

export async function updateFriendRequestStatus(requestId: string, status: "accepted" | "declined" | "cancelled") {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("friend_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) throw error;
}
