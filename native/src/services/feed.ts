import { supabase } from "./supabase";
import { sanitizeUserInput } from "../utils/sanitize";
import { recordRankEvent } from "./rankings";

type AuthorRow = {
  display_name: string;
  location: string | null;
  avatar_url: string | null;
};

type ReactionRow = {
  user_id: string;
};

type CommentRow = {
  id: string;
};

type FeedPostRow = {
  id: string;
  user_id: string;
  type: "update" | "question" | "harvest" | "tip";
  title: string | null;
  body: string;
  image_url: string | null;
  created_at: string;
  garden_plant_id?: string | null;
  garden_plants?: { name: string } | { name: string }[] | null;
  author?: AuthorRow | AuthorRow[] | null;
  post_reactions?: ReactionRow[];
  post_comments?: CommentRow[];
};

export type FeedPost = {
  id: string;
  userId: string;
  type: FeedPostRow["type"];
  title: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  authorName: string;
  authorLocation: string | null;
  authorAvatarUrl: string | null;
  reactionsCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  gardenPlantId: string | null;
  gardenPlantName: string | null;
};

export type PostComment = {
  id: string;
  postId: string;
  userId: string;
  parentId?: string | null;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

type JoinCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string | null;
  body: string;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  } | null;
};

function getAuthor(author?: AuthorRow | AuthorRow[] | null) {
  if (Array.isArray(author)) {
    return author[0] ?? null;
  }

  return author ?? null;
}

export async function getFeedPosts(currentUserId?: string, limit = 10, lastCreatedAt?: string): Promise<FeedPost[]> {
  if (!supabase) return [];

  let query = supabase
    .from("feed_posts")
    .select(
      `
      id,
      user_id,
      type,
      title,
      body,
      image_url,
      created_at,
      garden_plant_id,
      garden_plants(name),
      author:profiles!feed_posts_user_id_fkey(display_name, location, avatar_url),
      post_reactions(user_id),
      post_comments(id)
    `,
    )
    .eq("is_public", true);

  if (lastCreatedAt) {
    query = query.lt("created_at", lastCreatedAt);
  }

  query = query
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as FeedPostRow[]).map((post) => {
    const author = getAuthor(post.author);
    const reactions = post.post_reactions ?? [];
    const comments = post.post_comments ?? [];

    const isLikedByMe = currentUserId
      ? reactions.some((r) => r.user_id === currentUserId)
      : false;

    const gardenPlant = post.garden_plants
      ? (Array.isArray(post.garden_plants) ? post.garden_plants[0] : post.garden_plants)
      : null;

    return {
      id: post.id,
      userId: post.user_id,
      type: post.type,
      title: post.title,
      body: post.body,
      imageUrl: post.image_url,
      createdAt: post.created_at,
      authorName: author?.display_name ?? "GrowMate user",
      authorLocation: author?.location ?? null,
      authorAvatarUrl: author?.avatar_url ?? null,
      reactionsCount: reactions.length,
      commentsCount: comments.length,
      isLikedByMe,
      gardenPlantId: post.garden_plant_id ?? null,
      gardenPlantName: gardenPlant?.name ?? null,
    };
  });
}

export async function createFeedPost(
  userId: string,
  body: string,
  type: FeedPost["type"] = "update",
  imageUrl?: string | null,
  gardenPlantId?: string | null
) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const sanitizedBody = sanitizeUserInput(body, { maxLength: 2000, preserveNewlines: true });
  if (!sanitizedBody) throw new Error("Post cannot be empty.");

  const { error } = await supabase.from("feed_posts").insert({
    user_id: userId,
    body: sanitizedBody,
    type,
    image_url: imageUrl || null,
    garden_plant_id: gardenPlantId || null,
    is_public: true,
  });

  if (error) {
    throw error;
  }

  // Record ranking event for XP/leveling
  recordRankEvent(userId, "feed_post_created").catch((err) => {
    console.warn("Failed to record feed post rank event:", err);
  });
}

export async function togglePostReaction(postId: string, userId: string): Promise<boolean> {
  if (!supabase) throw new Error("Supabase is not configured.");

  // Check if reaction exists
  const { data: existing, error: checkError } = await supabase
    .from("post_reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existing) {
    // Delete reaction
    const { error: deleteError } = await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);

    if (deleteError) throw deleteError;
    return false; // Not liked anymore
  } else {
    // Insert reaction
    const { error: insertError } = await supabase
      .from("post_reactions")
      .insert({
        post_id: postId,
        user_id: userId,
        reaction: "like",
      });

    if (insertError) throw insertError;
    return true; // Liked now
  }
}

export async function getPostComments(postId: string): Promise<PostComment[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("post_comments")
    .select(`
      id,
      post_id,
      user_id,
      parent_id,
      body,
      created_at,
      profiles:user_id (
        display_name,
        avatar_url
      )
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const commentRows = (data ?? []) as unknown as JoinCommentRow[];

  return commentRows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    parentId: row.parent_id ?? null,
    body: row.body,
    createdAt: row.created_at,
    authorName: row.profiles?.display_name ?? "GrowMate User",
    authorAvatarUrl: row.profiles?.avatar_url ?? null,
  }));
}

export async function addPostComment(
  postId: string,
  userId: string,
  body: string,
  parentId: string | null = null
): Promise<PostComment> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const sanitizedBody = sanitizeUserInput(body, { maxLength: 500 });
  if (!sanitizedBody) throw new Error("Comment cannot be empty.");

  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      user_id: userId,
      body: sanitizedBody,
      parent_id: parentId,
    })
    .select(`
      id,
      post_id,
      user_id,
      parent_id,
      body,
      created_at,
      profiles:user_id (
        display_name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    throw error;
  }

  const row = data as unknown as JoinCommentRow;

  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    parentId: row.parent_id ?? null,
    body: row.body,
    createdAt: row.created_at,
    authorName: row.profiles?.display_name ?? "GrowMate User",
    authorAvatarUrl: row.profiles?.avatar_url ?? null,
  };
}

export async function deletePost(postId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("feed_posts")
    .delete()
    .eq("id", postId);

  if (error) {
    throw error;
  }
}
