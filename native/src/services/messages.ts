import { supabase } from "./supabase";
import { sanitizeUserInput } from "../utils/sanitize";

export type Conversation = {
  id: string;
  type: "friend" | "market" | "garden" | "leafy" | "support";
  listingId: string | null;
  gardenId: string | null;
  title: string | null;
  updatedAt: string;
  otherMember: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type MemberRow = {
  user_id: string;
  profiles: ProfileRow | null;
};

type ConversationJoinRow = {
  id: string;
  type: Conversation["type"];
  listing_id: string | null;
  garden_id: string | null;
  title: string | null;
  updated_at: string;
  conversation_members: MemberRow[];
};

type MemberQueryRow = {
  conversation_id: string;
  conversations: ConversationJoinRow | null;
};

export async function getConversations(userId: string): Promise<Conversation[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("conversation_members")
    .select(`
      conversation_id,
      conversations (
        id,
        type,
        listing_id,
        garden_id,
        title,
        updated_at,
        conversation_members (
          user_id,
          profiles (
            id,
            display_name,
            avatar_url
          )
        )
      )
    `)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const rawRows = (data ?? []) as unknown as MemberQueryRow[];
  const conversations: Conversation[] = [];

  for (const row of rawRows) {
    if (!row.conversations) continue;
    const convo = row.conversations;

    // Find the other member of the conversation
    const otherMemberRow = convo.conversation_members.find((m) => m.user_id !== userId);
    const otherProfile = otherMemberRow?.profiles;

    conversations.push({
      id: convo.id,
      type: convo.type,
      listingId: convo.listing_id,
      gardenId: convo.garden_id,
      title: convo.title,
      updatedAt: convo.updated_at,
      otherMember: otherProfile
        ? {
            id: otherProfile.id,
            displayName: otherProfile.display_name,
            avatarUrl: otherProfile.avatar_url,
          }
        : null,
    });
  }

  // Sort by updatedAt descending
  return conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, image_url, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((msg) => ({
    id: msg.id,
    conversationId: msg.conversation_id,
    senderId: msg.sender_id,
    body: msg.body,
    imageUrl: msg.image_url,
    createdAt: msg.created_at,
  }));
}

export async function sendMessage(conversationId: string, senderId: string, body: string, imageUrl?: string | null): Promise<Message> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const sanitizedBody = sanitizeUserInput(body, { maxLength: 2000, preserveNewlines: true });
  if (!sanitizedBody) throw new Error("Message cannot be empty.");

  const { data, error } = await supabase
    .rpc("send_message_secure", {
      p_conversation_id: conversationId,
      p_body: sanitizedBody,
      p_image_url: imageUrl || null,
    })
    .select("id, conversation_id, sender_id, body, image_url, created_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id ?? senderId,
    body: data.body,
    imageUrl: data.image_url,
    createdAt: data.created_at,
  };
}

export async function getOrCreateMarketConversation(listingId: string, buyerId: string, sellerId: string, listingName: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (!buyerId || !sellerId || !listingId || !listingName.trim()) throw new Error("Conversation details are incomplete.");

  const { data, error } = await supabase.rpc("get_or_create_market_conversation", {
    p_listing_id: listingId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrCreateDirectConversation(otherUserId: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    p_other_user_id: otherUserId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function markConversationAsRead(conversationId: string, userId: string): Promise<void> {
  if (!supabase) return;
  if (!userId) throw new Error("Sign in before updating a conversation.");

  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  if (error) {
    throw error;
  }
}

export async function getUnreadMessagesCount(userId: string): Promise<number> {
  if (!supabase) return 0;
  if (!userId) return 0;

  const { data, error } = await supabase.rpc("get_unread_messages_count");
  if (error) throw error;
  return Number(data ?? 0);
}
