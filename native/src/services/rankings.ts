import { supabase } from "./supabase";

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  location: string | null;
  avatarUrl: string | null;
  points: number;
};

export const RANK_EVENT_POINTS: Record<string, number> = {
  garden_plant_added: 3,
  listing_created: 10,
  listing_published: 10,
  post_created: 5,
  feed_post_created: 5,
  purchase_completed: 25,
  sale_completed: 25,
  review_created: 15,
  review_received: 15,
  leafy_scan_safe: 3,
};

export const XP_LEVELS = [
  { level: 10, title: "👑 GrowMate Guardian", minPoints: 320, nextPoints: 500 },
  { level: 9, title: "🏆 GrowMate Veteran", minPoints: 250, nextPoints: 320 },
  { level: 8, title: "🌟 Community Grower", minPoints: 190, nextPoints: 250 },
  { level: 7, title: "🌳 Garden Builder", minPoints: 140, nextPoints: 190 },
  { level: 6, title: "⭐ Trusted Buyer", minPoints: 100, nextPoints: 140 },
  { level: 5, title: "🛒 Smart Buyer", minPoints: 70, nextPoints: 100 },
  { level: 4, title: "🏡 Garden Friend", minPoints: 45, nextPoints: 70 },
  { level: 3, title: "🪴 Plant Explorer", minPoints: 25, nextPoints: 45 },
  { level: 2, title: "🌿 Sprout", minPoints: 10, nextPoints: 25 },
  { level: 1, title: "🌱 Seedling", minPoints: 0, nextPoints: 10 },
];

type RankEventRow = {
  user_id: string;
  source: string;
  points: number;
  profiles: {
    display_name: string;
    location: string | null;
    avatar_url: string | null;
  } | null | {
    display_name: string;
    location: string | null;
    avatar_url: string | null;
  }[];
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  location: string | null;
  avatar_url: string | null;
};

type UserIdRow = {
  user_id: string;
};

type SellerIdRow = {
  seller_id: string;
};

type SellerProfileRow = {
  user_id: string;
  completed_sales: number | null;
};

function getProfile(profile: RankEventRow["profiles"]) {
  if (Array.isArray(profile)) {
    return profile[0] ?? null;
  }

  return profile ?? null;
}

export function getRankEventPoints(source: string, storedPoints: number) {
  return RANK_EVENT_POINTS[source] ?? Math.max(0, storedPoints);
}

export function getXpLevel(points: number) {
  const clampedPoints = Math.max(0, points);
  const level = XP_LEVELS.find((entry) => clampedPoints >= entry.minPoints) ?? XP_LEVELS[XP_LEVELS.length - 1];
  const span = Math.max(1, level.nextPoints - level.minPoints);
  const progress = Math.min(1, Math.max(0, (clampedPoints - level.minPoints) / span));

  return {
    ...level,
    progress,
  };
}

function aggregateEvents(events: RankEventRow[]) {
  const userMap = new Map<string, LeaderboardEntry>();

  for (const event of events) {
    const profile = getProfile(event.profiles);
    const points = getRankEventPoints(event.source, event.points);
    const existing = userMap.get(event.user_id);

    if (existing) {
      existing.points += points;
    } else {
      userMap.set(event.user_id, {
        userId: event.user_id,
        displayName: profile?.display_name?.trim() || `GrowMate User ${event.user_id.slice(0, 6)}`,
        location: profile?.location ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        points,
      });
    }
  }

  return Array.from(userMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.displayName.localeCompare(b.displayName);
  });
}

function addPoints(pointsMap: Map<string, number>, userId: string | null | undefined, points: number) {
  if (!userId || points <= 0) return;
  pointsMap.set(userId, (pointsMap.get(userId) || 0) + points);
}

async function getRankEventPointsByUser(userId?: string) {
  if (!supabase) return new Map<string, number>();

  let query = supabase
    .from("rank_events")
    .select("user_id, source, points");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const pointsMap = new Map<string, number>();
  ((data ?? []) as { user_id: string; source: string; points: number }[]).forEach((event) => {
    addPoints(pointsMap, event.user_id, getRankEventPoints(event.source, event.points));
  });

  return pointsMap;
}

async function getDerivedPointsByUser(userId?: string) {
  if (!supabase) return new Map<string, number>();

  const pointsMap = new Map<string, number>();

  let gardenPlantsQuery = supabase.from("garden_plants").select("user_id");
  let listingsQuery = supabase.from("listings").select("seller_id").eq("status", "active");
  let feedPostsQuery = supabase.from("feed_posts").select("user_id").eq("is_public", true);
  let sellerProfilesQuery = supabase.from("seller_profiles").select("user_id, completed_sales");

  if (userId) {
    gardenPlantsQuery = gardenPlantsQuery.eq("user_id", userId);
    listingsQuery = listingsQuery.eq("seller_id", userId);
    feedPostsQuery = feedPostsQuery.eq("user_id", userId);
    sellerProfilesQuery = sellerProfilesQuery.eq("user_id", userId);
  }

  const [
    { data: gardenPlants, error: gardenPlantsError },
    { data: listings, error: listingsError },
    { data: feedPosts, error: feedPostsError },
    { data: sellerProfiles, error: sellerProfilesError },
  ] = await Promise.all([
    gardenPlantsQuery,
    listingsQuery,
    feedPostsQuery,
    sellerProfilesQuery,
  ]);

  if (gardenPlantsError) throw gardenPlantsError;
  if (listingsError) throw listingsError;
  if (feedPostsError) throw feedPostsError;
  if (sellerProfilesError) throw sellerProfilesError;

  ((gardenPlants ?? []) as UserIdRow[]).forEach((row) => {
    addPoints(pointsMap, row.user_id, RANK_EVENT_POINTS.garden_plant_added);
  });

  ((listings ?? []) as SellerIdRow[]).forEach((row) => {
    addPoints(pointsMap, row.seller_id, RANK_EVENT_POINTS.listing_created);
  });

  ((feedPosts ?? []) as UserIdRow[]).forEach((row) => {
    addPoints(pointsMap, row.user_id, RANK_EVENT_POINTS.post_created);
  });

  ((sellerProfiles ?? []) as SellerProfileRow[]).forEach((row) => {
    addPoints(pointsMap, row.user_id, (row.completed_sales ?? 0) * RANK_EVENT_POINTS.sale_completed);
  });

  return pointsMap;
}

function getBestPointsForUser(userId: string, rankPoints: Map<string, number>, derivedPoints: Map<string, number>) {
  return Math.max(rankPoints.get(userId) || 0, derivedPoints.get(userId) || 0);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!supabase) return [];

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, location, avatar_url");

  if (profilesError) {
    throw profilesError;
  }

  const [rankPoints, derivedPoints] = await Promise.all([
    getRankEventPointsByUser(),
    getDerivedPointsByUser(),
  ]);

  const entries: LeaderboardEntry[] = ((profilesData ?? []) as ProfileRow[]).map((profile) => {
    const points = getBestPointsForUser(profile.id, rankPoints, derivedPoints);
    return {
      userId: profile.id,
      displayName: profile.display_name?.trim() || `GrowMate User`,
      location: profile.location ?? null,
      avatarUrl: profile.avatar_url ?? null,
      points,
    };
  });

  return entries
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.displayName.localeCompare(b.displayName);
    })
    .slice(0, 10);
}

export async function getUserXp(userId: string): Promise<number> {
  if (!supabase) return 0;

  const [rankPoints, derivedPoints] = await Promise.all([
    getRankEventPointsByUser(userId),
    getDerivedPointsByUser(userId),
  ]);

  return getBestPointsForUser(userId, rankPoints, derivedPoints);
}

export async function recordRankEvent(userId: string, source: string, customPoints?: number): Promise<void> {
  if (!supabase) return;
  try {
    const points = customPoints ?? getRankEventPoints(source, 0);
    const { error } = await supabase
      .from("rank_events")
      .insert({
        user_id: userId,
        source,
        points,
      });
    if (error) {
      console.warn(`Failed to record rank event ${source}:`, error.message);
    }
  } catch (err) {
    console.warn(`Exception recording rank event ${source}:`, err);
  }
}
