import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AdminDashboard } from "../components/AdminDashboard";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { SellerDashboard } from "../components/SellerDashboard";
import { useAuth } from "../context/AuthContext";
import { useNavigationContext } from "../context/NavigationContext";
import { updateProfileAvatar, updateProfile, updateProfileCover } from "../services/profile";
import { pickImageFromLibrary, uploadPublicImage } from "../services/storage";
import { getUserOrders, updateOrderStatus, type Order, type MarketListing } from "../services/listings";
import { getUserFavorites } from "../services/favorites";
import { createReview, getReviewForOrder } from "../services/reviews";
import { getOrCreateMyGarden, getGardenPlants, type GardenPlant } from "../services/gardens";
import { colors, radius, shadow, fontSize } from "../theme/colors";
import { formatCurrency } from "../utils/currency";

const COVER_HEIGHT = 160;
const AVATAR_SIZE = 80;
const AVATAR_BORDER = 3;

// ── Skeleton block helper ─────────────────────────────
function Skeleton({ w, h, radius: r = 8, style }: { w: number | string; h: number; radius?: number; style?: any }) {
  return (
    <View
      style={[
        { width: w as any, height: h, borderRadius: r, backgroundColor: colors.surface2, opacity: 0.7 },
        style,
      ]}
    />
  );
}

function ProfileSkeleton() {
  return (
    <>
      {/* Cover skeleton */}
      <View style={{ height: COVER_HEIGHT, backgroundColor: colors.surface2 }} />
      <View style={{ paddingHorizontal: 20, paddingTop: AVATAR_SIZE / 2 + 10 }}>
        {/* Name + level */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Skeleton w="55%" h={24} radius={6} />
          <Skeleton w={72} h={24} radius={12} />
        </View>
        {/* Handle */}
        <Skeleton w="40%" h={14} radius={6} style={{ marginBottom: 12 }} />
        {/* XP bar */}
        <Skeleton w="100%" h={6} radius={6} style={{ marginBottom: 16 }} />
        {/* Bio */}
        <Skeleton w="80%" h={14} radius={6} style={{ marginBottom: 6 }} />
        <Skeleton w="60%" h={14} radius={6} style={{ marginBottom: 20 }} />
        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} w="22%" h={52} radius={12} />
          ))}
        </View>
        {/* Buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
          <Skeleton w="50%" h={46} radius={999} />
          <Skeleton w="45%" h={46} radius={999} />
        </View>
      </View>
    </>
  );
}

// XP config (mock — tie into real points if available)
const LEVEL_XP_MAX = 1000;

export function ProfileScreen({
  onOpenListingDetail,
}: {
  onOpenListingDetail?: (listingId: string) => void;
}) {
  const { profile, refreshProfile, signOut, user } = useAuth();
  const { setActiveTab } = useNavigationContext();

  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [localCoverUri, setLocalCoverUri] = useState<string | null>(null);
  const [isLoadingProfile] = useState(false); // true on first mount until profile arrives
  const sellerStatus = profile?.seller_status ?? "not_applied";
  const canSeeSellerDashboard = sellerStatus === "verified";
  const canSeeAdminDashboard = profile?.is_admin === true;

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Saved listings
  const [savedListings, setSavedListings] = useState<MarketListing[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Garden Plants (for Badges and trackers)
  const [gardenPlants, setGardenPlants] = useState<GardenPlant[]>([]);
  const [isLoadingGarden, setIsLoadingGarden] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [revieweeId, setRevieweeId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedOrdersMap, setReviewedOrdersMap] = useState<Record<string, boolean>>({});

  // ── Handlers ─────────────────────────────────────────

  async function handleUpdateAvatar() {
    if (!user) return;
    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      const uploaded = await uploadPublicImage("avatars", user.id, "profile", picked);
      await updateProfileAvatar(user.id, uploaded.publicUrl);
      await refreshProfile();
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Unable to update avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleUpdateCover() {
    if (!user) return;
    setIsUploadingCover(true);
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      // Show immediately in local state for instant feedback
      setLocalCoverUri(picked.uri);
      const uploaded = await uploadPublicImage("avatars", user.id, "cover", picked);
      await updateProfileCover(user.id, uploaded.publicUrl);
      await refreshProfile();
    } catch (e) {
      console.error("Cover upload failed:", e);
    } finally {
      setIsUploadingCover(false);
    }
  }

  async function loadOrders() {
    if (!user) return;
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      const data = await getUserOrders(user.id);
      setOrders(data);
    } catch (e) {
      setOrdersError(e instanceof Error ? e.message : "Unable to load orders.");
    } finally {
      setIsLoadingOrders(false);
    }
  }

  async function handleUpdateOrderStatus(orderId: string, newStatus: Order["status"]) {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (e) {
      setOrdersError(e instanceof Error ? e.message : "Unable to update status.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function loadSavedListings() {
    if (!user) return;
    setIsLoadingSaved(true);
    try {
      setSavedListings(await getUserFavorites(user.id));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSaved(false);
    }
  }

  function handleOpenEditModal() {
    setEditDisplayName(profile?.display_name ?? "");
    setEditUsername(profile?.username ?? "");
    setEditBio(profile?.bio ?? "");
    setEditLocation(profile?.location ?? "");
    setShowEditModal(true);
  }

  async function handleSaveProfile() {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateProfile(user.id, {
        display_name: editDisplayName.trim(),
        username: editUsername.trim() || null,
        bio: editBio.trim() || null,
        location: editLocation.trim() || null,
      });
      await refreshProfile();
      setShowEditModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleOpenReviewModal(orderId: string, sellerId: string) {
    setReviewOrderId(orderId);
    setRevieweeId(sellerId);
    setReviewRating(5);
    setReviewComment("");
    setShowReviewModal(true);
  }

  async function handleSubmitReview() {
    if (!user || !reviewOrderId || !revieweeId) return;
    setIsSubmittingReview(true);
    try {
      await createReview(reviewOrderId, user.id, revieweeId, reviewRating, reviewComment.trim() || null);
      setReviewedOrdersMap((prev) => ({ ...prev, [reviewOrderId]: true }));
      setShowReviewModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingReview(false);
    }
  }

  async function checkReviewedOrders(ordersList: Order[]) {
    if (!user) return;
    const map: Record<string, boolean> = {};
    for (const order of ordersList) {
      if (order.status === "completed" && order.buyerId === user.id) {
        try {
          const rev = await getReviewForOrder(order.id, user.id);
          if (rev) map[order.id] = true;
        } catch (_) {}
      }
    }
    setReviewedOrdersMap(map);
  }

  async function loadGardenData() {
    if (!user) return;
    setIsLoadingGarden(true);
    try {
      const g = await getOrCreateMyGarden(user.id);
      const p = await getGardenPlants(g.id);
      setGardenPlants(p);
    } catch (e) {
      console.error("Failed to load garden for badges", e);
    } finally {
      setIsLoadingGarden(false);
    }
  }

  useEffect(() => {
    loadOrders().then(() => {
      if (user) getUserOrders(user.id).then(checkReviewedOrders);
    });
    loadSavedListings();
    loadGardenData();
  }, [user?.id]);

  // ── Computed ─────────────────────────────────────────
  const displayName = profile?.display_name ?? "GrowMate User";
  const username = profile?.username ? `@${profile.username}` : user?.email?.split("@")[0] ?? "";
  const location = profile?.location ?? "";
  const bio = profile?.bio ?? "";
  const plantsCount = gardenPlants.length;
  const postsCount = 0;
  const followers = 0;

  // Dynamic Badge Calculations
  const herbsCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    return cat === "herbs" || cat === "herb";
  }).length;

  const indoorCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    return cat === "indoor" || cat === "indoor plant" || cat === "indoor plants" || cat === "aroid";
  }).length;

  const outdoorCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    return cat === "outdoor" || cat === "outdoor plant" || cat === "outdoor plants";
  }).length;

  const succulentsCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    return cat === "succulent" || cat === "succulents" || cat === "desert" || cat === "cactus";
  }).length;

  const vegetablesCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    return cat === "vegetables" || cat === "vegetable" || cat === "veggie" || cat === "crops";
  }).length;

  const floweringCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    return cat === "flowering" || cat === "flowering plants" || cat === "flower" || cat === "blooming";
  }).length;

  const totalPlants = gardenPlants.length;
  const completedPurchases = orders.filter((o) => o.status === "completed" && o.buyerId === user?.id).length;

  // Calculate local score based on actions
  let calculatedXp = 0;
  calculatedXp += 20; // assuming logins active
  if (profile?.display_name) calculatedXp += 20;
  if (profile?.location) calculatedXp += 5;
  if (profile?.bio) calculatedXp += 5;
  if (profile?.username) calculatedXp += 5;
  calculatedXp += totalPlants * 5;
  if (totalPlants >= 1) calculatedXp += 10;
  if (totalPlants >= 3) calculatedXp += 10;
  if (totalPlants >= 5) calculatedXp += 20;
  if (totalPlants >= 10) calculatedXp += 35;
  const categoryCounts = [indoorCount, succulentsCount, herbsCount, floweringCount, vegetablesCount, outdoorCount];
  categoryCounts.forEach((cnt) => {
    if (cnt >= 10) calculatedXp += 50;
    else if (cnt >= 5) calculatedXp += 25;
    else if (cnt >= 3) calculatedXp += 15;
    else if (cnt >= 1) calculatedXp += 5;
  });
  calculatedXp += completedPurchases * 25;
  if (completedPurchases >= 1) calculatedXp += 30;
  if (completedPurchases >= 3) calculatedXp += 25;
  if (completedPurchases >= 5) calculatedXp += 40;
  const completedReviews = Object.keys(reviewedOrdersMap).length;
  calculatedXp += completedReviews * 15;

  const score = calculatedXp;

  // Levels threshold calculations
  let level = 1;
  let levelTitle = "🌱 Seedling";
  let nextLevelXp = 50;
  let currentLevelXp = 0;

  if (calculatedXp >= 6350) {
    level = 10;
    levelTitle = "👑 GrowMate Guardian";
    nextLevelXp = 10000;
    currentLevelXp = 6350;
  } else if (calculatedXp >= 4350) {
    level = 9;
    levelTitle = "🏆 GrowMate Veteran";
    nextLevelXp = 6350;
    currentLevelXp = 4350;
  } else if (calculatedXp >= 2850) {
    level = 8;
    levelTitle = "🌟 Community Grower";
    nextLevelXp = 4350;
    currentLevelXp = 2850;
  } else if (calculatedXp >= 1850) {
    level = 7;
    levelTitle = "🌳 Garden Builder";
    nextLevelXp = 2850;
    currentLevelXp = 1850;
  } else if (calculatedXp >= 1150) {
    level = 6;
    levelTitle = "⭐ Trusted Buyer";
    nextLevelXp = 1850;
    currentLevelXp = 1150;
  } else if (calculatedXp >= 650) {
    level = 5;
    levelTitle = "🛒 Smart Buyer";
    nextLevelXp = 1150;
    currentLevelXp = 650;
  } else if (calculatedXp >= 350) {
    level = 4;
    levelTitle = "🏡 Garden Friend";
    nextLevelXp = 650;
    currentLevelXp = 350;
  } else if (calculatedXp >= 150) {
    level = 3;
    levelTitle = "🪴 Plant Explorer";
    nextLevelXp = 350;
    currentLevelXp = 150;
  } else if (calculatedXp >= 50) {
    level = 2;
    levelTitle = "🌿 Sprout";
    nextLevelXp = 150;
    currentLevelXp = 50;
  }

  const xpProgress = calculatedXp - currentLevelXp;
  const xpNeededForNext = nextLevelXp - currentLevelXp;
  const xpPct = Math.min(1, Math.max(0, xpProgress / xpNeededForNext));

  // Badges list config (using MaterialCommunityIcons instead of emojis)
  const badges = [
    { id: "garden_started", title: "Garden Started", icon: "sprout-outline", desc: "Added first plant to My Garden", unlocked: totalPlants >= 1 },
    { id: "baby_garden", title: "Baby Garden", icon: "pot-mix-outline", desc: "Added 3 plants to My Garden", unlocked: totalPlants >= 3 },
    { id: "plant_collector", title: "Plant Collector", icon: "leaf-maple", desc: "Completed 3 completed purchases", unlocked: completedPurchases >= 3 },
    { id: "garden_photo", title: "Garden Photo", icon: "camera-outline", desc: "Uploaded a plant photo", unlocked: gardenPlants.some((p) => p.photoUrl) },
    { id: "first_haul", title: "First Haul", icon: "cart-outline", desc: "Completed first purchase ever", unlocked: completedPurchases >= 1 },
  ];

  // Category collection trackers
  function getCategoryTier(count: number) {
    if (count >= 10) return { title: "Master", nextLimit: 10, currentLimit: 10, pct: 1 };
    if (count >= 5) return { title: "Enthusiast", nextLimit: 10, currentLimit: 5, pct: (count - 5) / 5 };
    if (count >= 3) return { title: "Grower", nextLimit: 5, currentLimit: 3, pct: (count - 3) / 2 };
    if (count >= 1) return { title: "Curious", nextLimit: 3, currentLimit: 1, pct: (count - 1) / 2 };
    return { title: "None", nextLimit: 1, currentLimit: 0, pct: count / 1 };
  }

  const collections = [
    { name: "Indoor Plants", count: indoorCount, icon: "pot-mix", details: getCategoryTier(indoorCount) },
    { name: "Succulents", count: succulentsCount, icon: "cactus", details: getCategoryTier(succulentsCount) },
    { name: "Herbs", count: herbsCount, icon: "leaf", details: getCategoryTier(herbsCount) },
    { name: "Flowering", count: floweringCount, icon: "flower", details: getCategoryTier(floweringCount) },
    { name: "Vegetables", count: vegetablesCount, icon: "carrot", details: getCategoryTier(vegetablesCount) },
    { name: "Outdoor Plants", count: outdoorCount, icon: "tree", details: getCategoryTier(outdoorCount) },
  ];

  const activeListings = orders.filter((o) => o.status !== "cancelled" && o.status !== "completed").length;

  const statusColor: Record<string, string> = {
    pending: "#d97706",
    paid: "#2563eb",
    completed: "#16a34a",
    cancelled: "#6b7280",
    refunded: "#6b7280",
    disputed: "#b91c1c",
  };

  const coverUri = localCoverUri ?? profile?.cover_url ?? null;

  // ─────────────────────────────────────────────────────
  return (
    <Screen showHeader={false} scroll={false} noPadding={true}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Skeleton while profile loads ── */}
        {(!profile && isLoadingProfile) && <ProfileSkeleton />}
        {(profile || !isLoadingProfile) && (
          <>
        {/* ══ Cover + Avatar ══════════════════════════════ */}
        <View style={styles.coverWrap}>
          {/* Cover photo */}
          <View style={styles.cover}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <MaterialCommunityIcons
                name="flower"
                size={40}
                color="rgba(255,255,255,0.15)"
                style={styles.coverDecor}
              />
            )}
            {/* Uploading overlay */}
            {isUploadingCover && (
              <View style={styles.coverUploadingOverlay}>
                <ActivityIndicator color={colors.white} size="small" />
                <Text style={styles.coverUploadingText}>Uploading...</Text>
              </View>
            )}
          </View>

          {/* Camera button on cover */}
          <Pressable
            onPress={handleUpdateCover}
            disabled={isUploadingCover}
            style={[styles.coverCameraBtn, isUploadingCover && { opacity: 0.5 }]}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="camera-outline" size={16} color={colors.white} />
          </Pressable>

          {/* Avatar */}
          <Pressable onPress={handleUpdateAvatar} style={styles.avatarWrap}>
            {isUploadingAvatar ? (
              <View style={styles.avatarInner}>
                <ActivityIndicator color={colors.green} />
              </View>
            ) : profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarInner} />
            ) : (
              <View style={[styles.avatarInner, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {displayName[0]?.toUpperCase() ?? "G"}
                </Text>
              </View>
            )}
            <View style={styles.avatarCameraChip}>
              <MaterialCommunityIcons name="camera" size={11} color={colors.white} />
            </View>
          </Pressable>
        </View>

        {/* ══ User info block ══════════════════════════════ */}
        <View style={styles.infoBlock}>
          {/* Name + level */}
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{displayName}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{levelTitle}</Text>
            </View>
          </View>

          {/* Handle + location */}
          <Text style={styles.handleText}>
            {username}{location ? ` · ${location}` : ""}
          </Text>

          {/* XP bar */}
          <View style={styles.xpRow}>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.round(xpPct * 100)}%` as any }]} />
            </View>
            <Text style={styles.xpLabel}>{Math.round(xpPct * 100)}% XP</Text>
          </View>

          {/* Bio */}
          {bio ? <Text style={styles.bioText}>{bio}</Text> : null}

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: "Plants", value: plantsCount },
              { label: "Posts",  value: postsCount },
              { label: "Score",  value: score >= 1000 ? `${(score / 1000).toFixed(1)}k` : score },
              { label: "Followers", value: followers },
            ].map(({ label, value }, i) => (
              <View key={label} style={[styles.statCell, i < 3 && styles.statCellBorder]}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionBtns}>
            <Pressable
              onPress={() => setActiveTab("Garden")}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.primaryBtnText}>View my garden</Text>
            </Pressable>
            <Pressable
              onPress={handleOpenEditModal}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.secondaryBtnText}>Edit profile</Text>
            </Pressable>
          </View>
        </View>

        {/* ══ Badges & Achievements ══════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges & Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
            {badges.map((badge) => (
              <View key={badge.id} style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}>
                <View style={[styles.badgeIconWrap, !badge.unlocked && styles.badgeIconWrapLocked]}>
                  <MaterialCommunityIcons
                    name={badge.icon as any}
                    size={24}
                    color={badge.unlocked ? colors.green : colors.greenMuted}
                  />
                  {!badge.unlocked && (
                    <View style={styles.lockOverlay}>
                      <MaterialCommunityIcons name="lock" size={12} color={colors.textTertiary} />
                    </View>
                  )}
                </View>
                <Text style={styles.badgeTitle} numberOfLines={1}>{badge.title}</Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>{badge.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ══ Collection Trackers ══════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collection Trackers</Text>
          <View style={styles.trackersGrid}>
            {collections.map((col) => (
              <View key={col.name} style={styles.trackerCard}>
                <View style={styles.trackerHeader}>
                  <MaterialCommunityIcons
                    name={col.icon as any}
                    size={22}
                    color={col.count > 0 ? colors.green : colors.greenMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trackerTitle}>{col.name}</Text>
                    <Text style={styles.trackerRank}>
                      {col.details.title !== "None" ? col.details.title : "Not Started"}
                    </Text>
                  </View>
                  <Text style={styles.trackerCount}>{col.count}</Text>
                </View>
                <View style={styles.trackerProgressWrap}>
                  <View style={styles.trackerTrack}>
                    <View style={[styles.trackerFill, { width: `${Math.round(col.details.pct * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.trackerProgressText}>
                    {col.count >= 10 ? "MAX" : `${col.count}/${col.details.nextLimit}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ══ My Market Listings ══════════════════════════ */}
        {canSeeSellerDashboard && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Market Listings</Text>
              <View style={styles.sectionHeaderRight}>
                <MaterialCommunityIcons name="information-outline" size={16} color={colors.greenMuted} />
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>{activeListings} active</Text>
                </View>
              </View>
            </View>
            <SellerDashboard />
          </View>
        )}

        {/* ══ My Orders ═══════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Orders</Text>
            <Pressable onPress={loadOrders} hitSlop={8}>
              <MaterialCommunityIcons name="refresh" size={18} color={colors.greenMuted} />
            </Pressable>
          </View>

          {ordersError && (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.errorText} />
              <Text style={styles.errorText}>{ordersError}</Text>
            </View>
          )}

          {isLoadingOrders ? (
            <ActivityIndicator color={colors.green} style={{ marginVertical: 16 }} />
          ) : orders.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="receipt-text-outline" size={36} color={colors.line} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            orders.map((order) => {
              const isBuyer = order.buyerId === user?.id;
              const hasReviewed = reviewedOrdersMap[order.id] ?? false;
              const statusCol = statusColor[order.status] ?? colors.greenMuted;

              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderTop}>
                    <View style={styles.orderRoleBadge}>
                      <Text style={styles.orderRoleText}>{isBuyer ? "Purchase" : "Sale"}</Text>
                    </View>
                    <View style={[styles.orderStatusBadge, { backgroundColor: `${statusCol}18` }]}>
                      <Text style={[styles.orderStatusText, { color: statusCol }]}>{order.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.orderTitle}>{order.listingName}</Text>
                  <Text style={styles.orderMeta}>
                    {isBuyer ? `From: ${order.sellerName}` : `To: ${order.buyerName}`}
                  </Text>
                  <Text style={styles.orderMeta}>{formatCurrency(order.subtotal)} · {order.quantity} unit</Text>

                  {/* Order actions */}
                  {order.status === "pending" && (
                    <View style={styles.orderActions}>
                      {isBuyer && (
                        <Pressable
                          onPress={() => handleUpdateOrderStatus(order.id, "paid")}
                          style={styles.orderBtnPrimary}
                        >
                          <Text style={styles.orderBtnPrimaryText}>Pay Now</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => handleUpdateOrderStatus(order.id, "cancelled")}
                        style={styles.orderBtnSecondary}
                      >
                        <Text style={styles.orderBtnSecondaryText}>Cancel</Text>
                      </Pressable>
                    </View>
                  )}
                  {order.status === "paid" && !isBuyer && (
                    <View style={styles.orderActions}>
                      <Pressable
                        onPress={() => handleUpdateOrderStatus(order.id, "completed")}
                        style={styles.orderBtnPrimary}
                      >
                        <Text style={styles.orderBtnPrimaryText}>Complete Sale</Text>
                      </Pressable>
                    </View>
                  )}
                  {order.status === "completed" && isBuyer && !hasReviewed && (
                    <View style={styles.orderActions}>
                      <Pressable
                        onPress={() => handleOpenReviewModal(order.id, order.sellerId)}
                        style={styles.orderBtnPrimary}
                      >
                        <Text style={styles.orderBtnPrimaryText}>Leave Review</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ══ Saved Listings ══════════════════════════════ */}
        {savedListings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Listings</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {savedListings.map((listing) => (
                <Pressable
                  key={listing.id}
                  onPress={() => onOpenListingDetail?.(listing.id)}
                  style={styles.savedCard}
                >
                  {listing.photoUrl ? (
                    <Image source={{ uri: listing.photoUrl }} style={styles.savedImg} />
                  ) : (
                    <View style={[styles.savedImg, styles.savedImgFallback]}>
                      <MaterialCommunityIcons name="flower-outline" size={22} color={colors.greenMuted} />
                    </View>
                  )}
                  <Text style={styles.savedName} numberOfLines={2}>{listing.name}</Text>
                  <Text style={styles.savedPrice}>{formatCurrency(listing.price)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ══ Admin dashboard ═════════════════════════════ */}
        {canSeeAdminDashboard && (
          <View style={styles.section}>
            <AdminDashboard />
          </View>
        )}

        {/* ══ Sign out ════════════════════════════════════ */}
        <View style={styles.section}>
          <Pressable onPress={signOut} style={styles.signOutBtn}>
            <MaterialCommunityIcons name="logout" size={16} color="#dc2626" />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
        </> 
        )}
      </ScrollView>

      {/* ══════════════════════════════════════════════════
          EDIT PROFILE MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowEditModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setShowEditModal(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.greenMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: "Display Name", value: editDisplayName, setter: setEditDisplayName, placeholder: "Your name" },
                { label: "Username",     value: editUsername,    setter: setEditUsername,    placeholder: "@username" },
                { label: "Location",     value: editLocation,    setter: setEditLocation,    placeholder: "City, Country" },
              ].map(({ label, value, setter, placeholder }) => (
                <View key={label} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={value}
                    onChangeText={setter}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              ))}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputMulti]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell plant lovers about yourself..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.modalBtns}>
                <Pressable
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile || !editDisplayName.trim()}
                  style={[styles.primaryBtn, { flex: 1 }, (isSavingProfile || !editDisplayName.trim()) && { opacity: 0.4 }]}
                >
                  <Text style={styles.primaryBtnText}>{isSavingProfile ? "Saving..." : "Save changes"}</Text>
                </Pressable>
                <Pressable onPress={() => setShowEditModal(false)} style={[styles.secondaryBtn, { flex: 1 }]}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          REVIEW MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={showReviewModal} animationType="fade" transparent onRequestClose={() => setShowReviewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewCard}>
            <Text style={styles.modalTitle}>Rate Seller</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setReviewRating(star)} hitSlop={6}>
                  <MaterialCommunityIcons
                    name={reviewRating >= star ? "star" : "star-outline"}
                    size={34}
                    color="#f59e0b"
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti, { marginBottom: 14 }]}
              placeholder="Share your experience..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              value={reviewComment}
              onChangeText={setReviewComment}
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <Pressable
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
                style={[styles.primaryBtn, { flex: 1 }, isSubmittingReview && { opacity: 0.4 }]}
              >
                <Text style={styles.primaryBtnText}>{isSubmittingReview ? "Submitting..." : "Submit"}</Text>
              </Pressable>
              <Pressable onPress={() => setShowReviewModal(false)} style={[styles.secondaryBtn, { flex: 1 }]}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 100 },

  // ── Cover + Avatar ────────────────────────────────────
  coverWrap: { position: "relative", marginBottom: AVATAR_SIZE / 2 + 8 },
  cover: {
    height: COVER_HEIGHT,
    backgroundColor: colors.greenMid,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  coverImage: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    width: "100%",
    height: "100%",
  },
  coverDecor: { opacity: 0.4 },
  coverUploadingOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  coverUploadingText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  coverCameraBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    position: "absolute",
    bottom: -AVATAR_SIZE / 2,
    left: 20,
    width: AVATAR_SIZE + AVATAR_BORDER * 2,
    height: AVATAR_SIZE + AVATAR_BORDER * 2,
    borderRadius: (AVATAR_SIZE + AVATAR_BORDER * 2) / 2,
    backgroundColor: colors.cream,
    padding: AVATAR_BORDER,
    ...shadow.md,
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.surface2,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 30, fontWeight: "800", color: colors.green },
  avatarCameraChip: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.cream,
  },

  // ── Info block ────────────────────────────────────────
  infoBlock: { paddingHorizontal: 20, paddingTop: AVATAR_SIZE / 2 + 10 },

  nameRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  displayName: { fontSize: 24, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5, flex: 1 },
  levelBadge: {
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.lineMid,
  },
  levelText: { fontSize: 12, fontWeight: "800", color: colors.greenMid },

  handleText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600", marginBottom: 10 },

  xpRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  xpTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  xpFill: { height: "100%", backgroundColor: colors.leaf, borderRadius: radius.full },
  xpLabel: { fontSize: 11, fontWeight: "800", color: colors.greenMid },

  bioText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, fontWeight: "500", marginBottom: 16 },

  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
    overflow: "hidden",
    ...shadow.sm,
  },
  statCell: { flex: 1, alignItems: "center", paddingVertical: 12 },
  statCellBorder: { borderRightWidth: 1, borderRightColor: colors.line },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600", marginTop: 2 },

  // Buttons
  actionBtns: { flexDirection: "row", gap: 10, marginBottom: 8 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: colors.lineMid,
  },
  secondaryBtnText: { color: colors.greenMid, fontSize: 14, fontWeight: "700" },

  // ── Sections ──────────────────────────────────────────
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  sectionHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  activePill: {
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.lineMid,
  },
  activePillText: { fontSize: 12, fontWeight: "700", color: colors.greenMid },

  // ── Orders ────────────────────────────────────────────
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  errorText: { color: colors.errorText, fontSize: 13, fontWeight: "600" },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 24 },
  emptyText: { fontSize: 14, color: colors.textTertiary, fontWeight: "600" },

  orderCard: {
    backgroundColor: colors.surface0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
    ...shadow.sm,
  },
  orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  orderRoleBadge: {
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  orderRoleText: { fontSize: 11, fontWeight: "800", color: colors.greenMid },
  orderStatusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  orderStatusText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  orderTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  orderMeta: { fontSize: 12, color: colors.textSecondary, fontWeight: "600", marginTop: 2 },
  orderActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  orderBtnPrimary: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: radius.full,
    alignItems: "center",
    paddingVertical: 9,
  },
  orderBtnPrimaryText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  orderBtnSecondary: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    alignItems: "center",
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: colors.lineMid,
  },
  orderBtnSecondaryText: { color: colors.greenMid, fontSize: 13, fontWeight: "700" },

  // ── Saved listings ────────────────────────────────────
  savedCard: { width: 100, marginRight: 12 },
  savedImg: { width: 100, height: 100, borderRadius: radius.md, backgroundColor: colors.surface1 },
  savedImgFallback: { alignItems: "center", justifyContent: "center" },
  savedName: { fontSize: 12, fontWeight: "700", color: colors.textPrimary, marginTop: 6 },
  savedPrice: { fontSize: 11, fontWeight: "700", color: colors.greenMid, marginTop: 2 },

  // ── Sign out ──────────────────────────────────────────
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: radius.full,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: "#fca5a5",
  },
  signOutText: { color: "#dc2626", fontSize: 14, fontWeight: "700" },

  // ── Modals ────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },

  reviewCard: {
    backgroundColor: colors.surface0,
    borderRadius: radius.xl,
    padding: 24,
    margin: 24,
    ...shadow.md,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginVertical: 16,
  },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInputMulti: { minHeight: 80 },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 4 },

  // ── Badges & Achievements ─────────────────────────────
  badgesScroll: { marginTop: 10, paddingBottom: 6 },
  badgeCard: {
    width: 104,
    backgroundColor: colors.surface0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    marginRight: 10,
    alignItems: "center",
    ...shadow.sm,
  },
  badgeCardLocked: { opacity: 0.55 },
  badgeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sage || "#e8f0e6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    position: "relative",
  },
  badgeIconWrapLocked: { backgroundColor: colors.surface1 },
  badgeIcon: { fontSize: 24 },
  lockOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  badgeTitle: { fontSize: 12, fontWeight: "800", color: colors.textPrimary, textAlign: "center", marginBottom: 2 },
  badgeDesc: { fontSize: 10, color: colors.textSecondary, textAlign: "center", fontWeight: "600", lineHeight: 12 },

  // ── Trackers ──────────────────────────────────────────
  trackersGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  trackerCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.surface0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    ...shadow.sm,
  },
  trackerHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  trackerIcon: { fontSize: 22 },
  trackerTitle: { fontSize: 13, fontWeight: "800", color: colors.textPrimary },
  trackerRank: { fontSize: 10, fontWeight: "800", color: colors.greenMid, marginTop: 1 },
  trackerCount: { fontSize: 18, fontWeight: "900", color: colors.textPrimary },
  trackerProgressWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  trackerTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  trackerFill: { height: "100%", backgroundColor: colors.leaf, borderRadius: radius.full },
  trackerProgressText: { fontSize: 9, fontWeight: "800", color: colors.textSecondary, width: 22, textAlign: "right" },
});
