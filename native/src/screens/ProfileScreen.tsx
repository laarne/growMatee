import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AdminDashboard } from "../components/AdminDashboard";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { SellerDashboard } from "../components/SellerDashboard";
import { useAuth } from "../context/AuthContext";
import { useNavigationContext } from "../context/NavigationContext";
import { updateProfileAvatar, updateProfile, updateProfileCover } from "../services/profile";
import { pickImageFromLibrary, uploadPublicImage, type PickedImage } from "../services/storage";
import { getUserOrders, updateOrderStatus, type Order, type MarketListing } from "../services/listings";
import { getUserFavorites } from "../services/favorites";
import { createSellerApplication } from "../services/sellerApplications";
import { createReview, getReviewForOrder } from "../services/reviews";
import { getOrCreateMyGarden, getGardenPlants, type GardenPlant } from "../services/gardens";
import { getUserXp, getXpLevel } from "../services/rankings";
import { getFriendSections, updateFriendRequestStatus, type FriendListItem, type FriendSections } from "../services/friends";
import { getOrCreateDirectConversation } from "../services/messages";
import { colors, radius, shadow, fontSize } from "../theme/colors";
import { formatCurrency } from "../utils/currency";

const COVER_HEIGHT = 160;
const AVATAR_SIZE = 80;
const AVATAR_BORDER = 3;
const SCREEN_W = Dimensions.get("window").width;

const DEFAULT_COVERS = [
  "https://images.unsplash.com/photo-1545241047-6083a3684587?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1592150621744-aca64f48394a?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1530968033775-2c9273f0865e?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1558905619-8714cdb4b2db?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512428813824-f7258347e62a?q=80&w=800&auto=format&fit=crop",
];

function getDefaultCover(uid?: string | null): string {
  if (!uid) return DEFAULT_COVERS[0];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_COVERS[Math.abs(hash) % DEFAULT_COVERS.length];
}

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
  onOpenChat,
  onOpenListingDetail,
}: {
  onOpenChat?: (conversationId: string, title: string) => void;
  onOpenListingDetail?: (listingId: string) => void;
}) {
  const { profile, refreshProfile, signOut, user } = useAuth();
  const { setActiveTab } = useNavigationContext();

  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [localCoverUri, setLocalCoverUri] = useState<string | null>(null);
  const [pendingCoverPhoto, setPendingCoverPhoto] = useState<PickedImage | null>(null);
  const [isLoadingProfile] = useState(false); // true on first mount until profile arrives
  const sellerStatus = profile?.seller_status ?? "not_applied";
  const canSeeSellerDashboard = sellerStatus === "verified";
  const canSeeAdminDashboard = profile?.is_admin === true;
  const [showSellerAppModal, setShowSellerAppModal] = useState(false);
  const [isApplyingSeller, setIsApplyingSeller] = useState(false);
  const [sellerAppMessage, setSellerAppMessage] = useState<string | null>(null);
  const [sellerAppError, setSellerAppError] = useState<string | null>(null);
  const [appShopName, setAppShopName] = useState("");
  const [appReason, setAppReason] = useState("");
  const [idFrontPhoto, setIdFrontPhoto] = useState<PickedImage | null>(null);
  const [idBackPhoto, setIdBackPhoto] = useState<PickedImage | null>(null);
  const [selfieWithIdPhoto, setSelfieWithIdPhoto] = useState<PickedImage | null>(null);
  const [selfieWithPlantPhoto, setSelfieWithPlantPhoto] = useState<PickedImage | null>(null);

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
  const [rankXp, setRankXp] = useState(0);
  const [friendSections, setFriendSections] = useState<FriendSections>({ friends: [], received: [], sent: [] });
  const [activeFriendTab, setActiveFriendTab] = useState<"friends" | "received" | "sent">("friends");
  const [updatingFriendRequestId, setUpdatingFriendRequestId] = useState<string | null>(null);
  const [messagingFriendId, setMessagingFriendId] = useState<string | null>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

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
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      setLocalCoverUri(picked.uri);
      setPendingCoverPhoto(picked);
    } catch (e) {
      console.error("Cover selection failed:", e);
    }
  }

  async function handleSaveCover() {
    if (!user || !pendingCoverPhoto) return;
    setIsUploadingCover(true);
    try {
      const uploaded = await uploadPublicImage("avatars", user.id, "cover", pendingCoverPhoto);
      await updateProfileCover(user.id, uploaded.publicUrl);
      setLocalCoverUri(uploaded.publicUrl);
      setPendingCoverPhoto(null);
      await refreshProfile();
    } catch (e) {
      console.error("Cover upload failed:", e);
    } finally {
      setIsUploadingCover(false);
    }
  }

  async function handlePickSellerPhoto(setPhoto: (photo: PickedImage) => void) {
    setSellerAppError(null);
    try {
      const picked = await pickImageFromLibrary();
      if (picked) setPhoto(picked);
    } catch (e) {
      setSellerAppError(e instanceof Error ? e.message : "Unable to choose photo.");
    }
  }

  async function handleApplyAsSellerSubmit() {
    if (!user) return;
    setIsApplyingSeller(true);
    setSellerAppMessage(null);
    setSellerAppError(null);
    try {
      if (!idFrontPhoto || !idBackPhoto || !selfieWithIdPhoto || !selfieWithPlantPhoto) {
        throw new Error("Upload valid ID front, valid ID back, selfie with ID, and selfie with a plant.");
      }

      const [idFrontUpload, idBackUpload, selfieWithIdUpload, selfieWithPlantUpload] = await Promise.all([
        uploadPublicImage("verification-docs" as any, user.id, "verification/id-front", idFrontPhoto),
        uploadPublicImage("verification-docs" as any, user.id, "verification/id-back", idBackPhoto),
        uploadPublicImage("verification-docs" as any, user.id, "verification/selfie-id", selfieWithIdPhoto),
        uploadPublicImage("verification-docs" as any, user.id, "verification/selfie-plant", selfieWithPlantPhoto),
      ]);

      await createSellerApplication(user.id, appShopName.trim(), appReason.trim(), {
        idFrontUrl: idFrontUpload.publicUrl,
        idBackUrl: idBackUpload.publicUrl,
        selfieWithIdUrl: selfieWithIdUpload.publicUrl,
        selfieWithPlantUrl: selfieWithPlantUpload.publicUrl,
      });
      setSellerAppMessage("Seller application sent for admin review.");
      setShowSellerAppModal(false);
      setAppShopName("");
      setAppReason("");
      setIdFrontPhoto(null);
      setIdBackPhoto(null);
      setSelfieWithIdPhoto(null);
      setSelfieWithPlantPhoto(null);
      await refreshProfile();
    } catch (e) {
      setSellerAppError(e instanceof Error ? e.message : "Unable to send seller application.");
    } finally {
      setIsApplyingSeller(false);
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

  async function handleGetGPSLocation() {
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Permission to access location was denied. Please enter it manually.");
        setIsDetectingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      const addressResponse = await Location.reverseGeocodeAsync(coords);
      if (addressResponse && addressResponse.length > 0) {
        const address = addressResponse[0];
        // Build address string: e.g. "Butuan City, Caraga"
        const city = address.city || address.district || address.subregion || "";
        const region = address.region || address.country || "";

        let formattedLocation = "";
        if (city && region) {
          formattedLocation = `${city}, ${region}`;
        } else if (city) {
          formattedLocation = city;
        } else if (region) {
          formattedLocation = region;
        } else {
          formattedLocation = "Unknown Location";
        }
        setEditLocation(formattedLocation);
      } else {
        Alert.alert("Location Error", "Could not resolve your location name. Please enter it manually.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Location Error", "Failed to detect location. Please make sure GPS is enabled and try again.");
    } finally {
      setIsDetectingLocation(false);
    }
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

  useEffect(() => {
    async function loadRankXp() {
      if (!user) {
        setRankXp(0);
        return;
      }
      try {
        setRankXp(await getUserXp(user.id));
      } catch (e) {
        console.error("Failed to load rank XP", e);
        setRankXp(0);
      }
    }
    loadRankXp();
  }, [user?.id]);

  async function loadFriends() {
    if (!user) {
      setFriendSections({ friends: [], received: [], sent: [] });
      return;
    }

    setFriendSections(await getFriendSections(user.id));
  }

  useEffect(() => {
    loadFriends().catch((e) => console.warn("Failed to load friends", e));
  }, [user?.id]);

  async function handleFriendRequestUpdate(request: FriendListItem, status: "accepted" | "declined" | "cancelled") {
    setUpdatingFriendRequestId(request.requestId);
    try {
      await updateFriendRequestStatus(request.requestId, status);
      await loadFriends();
    } catch (e) {
      console.warn("Failed to update friend request", e);
    } finally {
      setUpdatingFriendRequestId(null);
    }
  }

  async function handleMessageFriend(friend: FriendListItem) {
    if (!onOpenChat) return;

    setMessagingFriendId(friend.userId);
    try {
      const conversationId = await getOrCreateDirectConversation(friend.userId);
      onOpenChat(conversationId, friend.displayName);
    } catch (e) {
      console.warn("Failed to open friend conversation", e);
      Alert.alert("Message unavailable", "We couldn't open this chat yet. Please try again.");
    } finally {
      setMessagingFriendId(null);
    }
  }

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

  const score = rankXp;
  calculatedXp = score;

  const xpLevelInfo = getXpLevel(calculatedXp);
  const level = xpLevelInfo.level;
  const levelTitle = xpLevelInfo.title;
  const xpPct = xpLevelInfo.progress;

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
  const friendTabs: { key: "friends" | "received" | "sent"; label: string; count: number }[] = [
    { key: "friends", label: "Friends", count: friendSections.friends.length },
    { key: "received", label: "Requests", count: friendSections.received.length },
    { key: "sent", label: "Sent", count: friendSections.sent.length },
  ];
  const currentFriendItems = friendSections[activeFriendTab];

  const statusColor: Record<string, string> = {
    pending: "#d97706",
    paid: "#2563eb",
    completed: "#16a34a",
    cancelled: "#6b7280",
    refunded: "#6b7280",
    disputed: "#b91c1c",
  };

  // Use uploaded cover, then profile cover_url, then a stable default garden landscape
  const coverUri = localCoverUri ?? profile?.cover_url ?? getDefaultCover(user?.id);

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
          {/* Cover photo — uses CSS backgroundImage on web for reliable rendering */}
          <View
            style={[
              styles.cover,
              Platform.OS === "web" && coverUri
                ? ({
                    backgroundImage: `url('${coverUri}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  } as any)
                : {},
            ]}
          >
            {/* Native: render Image inside; web: handled by CSS above */}
            {Platform.OS !== "web" && coverUri && (
              <ImageBackground
                source={{ uri: coverUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            )}
            {/* Uploading overlay */}
            {isUploadingCover && (
              <View style={styles.coverUploadingOverlay}>
                <ActivityIndicator color={colors.white} size="small" />
                <Text style={styles.coverUploadingText}>Saving...</Text>
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

          {pendingCoverPhoto && (
            <Pressable
              onPress={handleSaveCover}
              disabled={isUploadingCover}
              style={({ pressed }) => [
                styles.coverSaveBtn,
                (pressed || isUploadingCover) && styles.coverSaveBtnPressed,
              ]}
            >
              {isUploadingCover ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save" size={14} color={colors.white} />
                  <Text style={styles.coverSaveText}>Save Cover</Text>
                </>
              )}
            </Pressable>
          )}

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
            <Text style={styles.xpLabel}>Lvl {level} · {Math.round(xpPct * 100)}% XP</Text>
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

          <View style={styles.friendsCard}>
            <View style={styles.friendsHeader}>
              <View>
                <Text style={styles.friendsTitle}>Friends</Text>
                <Text style={styles.friendsSubtitle}>
                  {friendSections.friends.length} connected gardener{friendSections.friends.length === 1 ? "" : "s"}
                </Text>
              </View>
              <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.greenMid} />
            </View>

            <View style={styles.friendTabs}>
              {friendTabs.map((tab) => {
                const isActive = activeFriendTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveFriendTab(tab.key)}
                    style={[styles.friendTab, isActive && styles.friendTabActive]}
                  >
                    <Text style={[styles.friendTabText, isActive && styles.friendTabTextActive]}>
                      {tab.label} {tab.count > 0 ? tab.count : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {currentFriendItems.length === 0 ? (
              <View style={styles.friendEmpty}>
                <MaterialCommunityIcons name="account-heart-outline" size={24} color={colors.greenMuted} />
                <Text style={styles.friendEmptyText}>
                  {activeFriendTab === "friends"
                    ? "Friends you accept will appear here."
                    : activeFriendTab === "received"
                    ? "Incoming friend requests will appear here."
                    : "Sent friend requests will appear here."}
                </Text>
              </View>
            ) : (
              currentFriendItems.slice(0, 4).map((friend) => (
                <View key={friend.requestId} style={styles.friendRow}>
                  {friend.avatarUrl ? (
                    <Image source={{ uri: friend.avatarUrl }} style={styles.friendAvatar} />
                  ) : (
                    <View style={styles.friendAvatarFallback}>
                      <Text style={styles.friendAvatarText}>{friend.displayName[0]?.toUpperCase() ?? "G"}</Text>
                    </View>
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName} numberOfLines={1}>{friend.displayName}</Text>
                    <Text style={styles.friendMeta} numberOfLines={1}>
                      {friend.location ?? (friend.status === "friends" ? "Friend" : "GrowMate gardener")}
                    </Text>
                  </View>

                  {activeFriendTab === "received" ? (
                    <View style={styles.friendActions}>
                      <Pressable
                        disabled={updatingFriendRequestId === friend.requestId}
                        onPress={() => handleFriendRequestUpdate(friend, "accepted")}
                        style={styles.friendAcceptBtn}
                      >
                        <MaterialCommunityIcons name="check" size={15} color={colors.white} />
                      </Pressable>
                      <Pressable
                        disabled={updatingFriendRequestId === friend.requestId}
                        onPress={() => handleFriendRequestUpdate(friend, "declined")}
                        style={styles.friendDeclineBtn}
                      >
                        <MaterialCommunityIcons name="close" size={15} color={colors.greenMuted} />
                      </Pressable>
                    </View>
                  ) : activeFriendTab === "sent" ? (
                    <Text style={styles.friendPendingText}>Pending</Text>
                  ) : (
                    <Pressable
                      accessibilityLabel={`Message ${friend.displayName}`}
                      disabled={!onOpenChat || messagingFriendId === friend.userId}
                      onPress={() => handleMessageFriend(friend)}
                      style={({ pressed }) => [
                        styles.friendMessageBtn,
                        pressed && { opacity: 0.82 },
                        (!onOpenChat || messagingFriendId === friend.userId) && { opacity: 0.6 },
                      ]}
                    >
                      {messagingFriendId === friend.userId ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <MaterialCommunityIcons name="message-text-outline" size={15} color={colors.white} />
                      )}
                    </Pressable>
                  )}
                </View>
              ))
            )}
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
        {!canSeeSellerDashboard && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller Account</Text>
            <Pressable
              onPress={() => sellerStatus === "not_applied" && setShowSellerAppModal(true)}
              disabled={sellerStatus !== "not_applied"}
              style={({ pressed }) => [styles.sellerSignupCard, pressed && styles.sellerSignupCardPressed]}
            >
              <MaterialCommunityIcons
                name={sellerStatus === "pending" ? "clock-outline" : "store-plus-outline"}
                size={22}
                color={colors.greenMid}
              />
              <View style={styles.sellerSignupCopy}>
                <Text style={styles.sellerSignupTitle}>
                  {sellerStatus === "pending" ? "Seller application pending" : "Sign up as seller"}
                </Text>
                <Text style={styles.sellerSignupText}>
                  {sellerStatus === "pending"
                    ? "Your verification is waiting for admin review."
                    : "Verify your account to list plants in the marketplace."}
                </Text>
              </View>
              {sellerStatus === "not_applied" && (
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.greenMuted} />
              )}
            </Pressable>
            {sellerAppMessage && <Text style={styles.successText}>{sellerAppMessage}</Text>}
            {sellerAppError && <Text style={styles.errorText}>{sellerAppError}</Text>}
          </View>
        )}

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
              const safetyFee = order.platformFee || Math.round(order.subtotal * 0.1 * 100) / 100;
              const sellerPayout = Math.max(order.subtotal - safetyFee, 0);

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

                  {!isBuyer && (
                    <View style={styles.payoutBox}>
                      <View style={styles.payoutRow}>
                        <Text style={styles.payoutLabel}>Item Price</Text>
                        <Text style={styles.payoutValue}>{formatCurrency(order.subtotal)}</Text>
                      </View>
                      <View style={styles.payoutRow}>
                        <Text style={styles.payoutLabel}>GrowMate Safety Fee (10%)</Text>
                        <Text style={styles.payoutFee}>-{formatCurrency(safetyFee)}</Text>
                      </View>
                      <View style={[styles.payoutRow, styles.payoutTotalRow]}>
                        <Text style={styles.payoutTotalLabel}>Estimated Seller Payout</Text>
                        <Text style={styles.payoutTotalValue}>{formatCurrency(sellerPayout)}</Text>
                      </View>
                    </View>
                  )}

                  {/* Order actions */}
                  {order.status === "pending" && (
                    <View style={styles.orderActions}>
                      <Pressable
                        onPress={() => handleUpdateOrderStatus(order.id, "cancelled")}
                        style={styles.orderBtnSecondary}
                      >
                        <Text style={styles.orderBtnSecondaryText}>Cancel</Text>
                      </Pressable>
                    </View>
                  )}
                  {order.status === "accepted" && isBuyer && (
                    <View style={styles.orderActions}>
                      <Pressable
                        onPress={() => handleUpdateOrderStatus(order.id, "paid")}
                        style={styles.orderBtnPrimary}
                      >
                        <Text style={styles.orderBtnPrimaryText}>Pay Now</Text>
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
                <Text style={styles.fieldLabel}>Location</Text>
                <View style={styles.locationInputContainer}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1 }]}
                    value={editLocation}
                    onChangeText={setEditLocation}
                    placeholder="City, Country"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Pressable
                    onPress={handleGetGPSLocation}
                    style={({ pressed }) => [styles.gpsBtn, pressed && { opacity: 0.7 }]}
                    disabled={isDetectingLocation}
                  >
                    {isDetectingLocation ? (
                      <ActivityIndicator color={colors.green} size="small" />
                    ) : (
                      <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.green} />
                    )}
                  </Pressable>
                </View>
              </View>
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
      <Modal visible={showSellerAppModal} animationType="slide" transparent onRequestClose={() => setShowSellerAppModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !isApplyingSeller && setShowSellerAppModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sign up as seller</Text>
              <Pressable onPress={() => setShowSellerAppModal(false)} disabled={isApplyingSeller} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.greenMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sellerAppHelp}>
                Submit your shop details and verification photos. Admin approval is required before listings go live.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Shop name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={appShopName}
                  onChangeText={setAppShopName}
                  placeholder="e.g. Laarne's Plant Corner"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Why do you want to sell?</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputMulti]}
                  value={appReason}
                  onChangeText={setAppReason}
                  placeholder="Tell us about your plants and selling experience..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Verification photos</Text>
                <View style={styles.verificationGrid}>
                  <Pressable onPress={() => handlePickSellerPhoto(setIdFrontPhoto)} disabled={isApplyingSeller} style={styles.verificationTile}>
                    {idFrontPhoto ? <Image source={{ uri: idFrontPhoto.uri }} style={styles.verificationThumb} /> : <MaterialCommunityIcons name="camera-plus-outline" size={24} color={colors.greenMuted} />}
                    <Text style={styles.verificationTileText}>Valid ID front</Text>
                  </Pressable>
                  <Pressable onPress={() => handlePickSellerPhoto(setIdBackPhoto)} disabled={isApplyingSeller} style={styles.verificationTile}>
                    {idBackPhoto ? <Image source={{ uri: idBackPhoto.uri }} style={styles.verificationThumb} /> : <MaterialCommunityIcons name="camera-plus-outline" size={24} color={colors.greenMuted} />}
                    <Text style={styles.verificationTileText}>Valid ID back</Text>
                  </Pressable>
                  <Pressable onPress={() => handlePickSellerPhoto(setSelfieWithIdPhoto)} disabled={isApplyingSeller} style={styles.verificationTile}>
                    {selfieWithIdPhoto ? <Image source={{ uri: selfieWithIdPhoto.uri }} style={styles.verificationThumb} /> : <MaterialCommunityIcons name="camera-plus-outline" size={24} color={colors.greenMuted} />}
                    <Text style={styles.verificationTileText}>Selfie with ID</Text>
                  </Pressable>
                  <Pressable onPress={() => handlePickSellerPhoto(setSelfieWithPlantPhoto)} disabled={isApplyingSeller} style={styles.verificationTile}>
                    {selfieWithPlantPhoto ? <Image source={{ uri: selfieWithPlantPhoto.uri }} style={styles.verificationThumb} /> : <MaterialCommunityIcons name="camera-plus-outline" size={24} color={colors.greenMuted} />}
                    <Text style={styles.verificationTileText}>Selfie with plant</Text>
                  </Pressable>
                </View>
              </View>

              {sellerAppError && <Text style={styles.errorText}>{sellerAppError}</Text>}

              <View style={styles.modalBtns}>
                <Pressable
                  onPress={handleApplyAsSellerSubmit}
                  disabled={isApplyingSeller || !appShopName.trim()}
                  style={[styles.primaryBtn, { flex: 1 }, (isApplyingSeller || !appShopName.trim()) && { opacity: 0.4 }]}
                >
                  <Text style={styles.primaryBtnText}>{isApplyingSeller ? "Submitting..." : "Submit"}</Text>
                </Pressable>
                <Pressable onPress={() => setShowSellerAppModal(false)} disabled={isApplyingSeller} style={[styles.secondaryBtn, { flex: 1 }]}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: COVER_HEIGHT,
    resizeMode: "cover",
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
  coverSaveBtn: {
    position: "absolute",
    right: 14,
    bottom: 12,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    ...shadow.sm,
  },
  coverSaveBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  coverSaveText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
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
  friendsCard: {
    backgroundColor: colors.surface0,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
    ...shadow.sm,
  },
  friendsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  friendsTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "900" },
  friendsSubtitle: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 2 },
  friendTabs: {
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    flexDirection: "row",
    gap: 4,
    marginBottom: 12,
    padding: 4,
  },
  friendTab: {
    alignItems: "center",
    borderRadius: radius.full,
    flex: 1,
    paddingVertical: 8,
  },
  friendTabActive: {
    backgroundColor: colors.white,
    ...shadow.sm,
  },
  friendTabText: { color: colors.textSecondary, fontSize: 11, fontWeight: "900" },
  friendTabTextActive: { color: colors.green },
  friendEmpty: { alignItems: "center", gap: 8, paddingVertical: 18 },
  friendEmptyText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    textAlign: "center",
  },
  friendRow: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  friendAvatar: { backgroundColor: colors.surface1, borderRadius: 19, height: 38, width: 38 },
  friendAvatarFallback: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  friendAvatarText: { color: colors.green, fontSize: 14, fontWeight: "900" },
  friendInfo: { flex: 1 },
  friendName: { color: colors.textPrimary, fontSize: 13, fontWeight: "900" },
  friendMeta: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", marginTop: 2 },
  friendActions: { flexDirection: "row", gap: 6 },
  friendAcceptBtn: {
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: radius.full,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  friendDeclineBtn: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderColor: colors.lineMid,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  friendMessageBtn: {
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: radius.full,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  friendPendingText: { color: colors.greenMuted, fontSize: 11, fontWeight: "900" },

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
  sellerSignupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginTop: 10,
    ...shadow.sm,
  },
  sellerSignupCardPressed: { opacity: 0.75 },
  sellerSignupCopy: { flex: 1, gap: 2 },
  sellerSignupTitle: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
  sellerSignupText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, lineHeight: 16 },
  successText: { color: colors.greenMid, fontSize: 13, fontWeight: "700", marginTop: 8 },

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
  payoutBox: {
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    gap: 6,
    marginTop: 10,
  },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  payoutLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", flex: 1 },
  payoutValue: { color: colors.textPrimary, fontSize: 12, fontWeight: "800" },
  payoutFee: { color: "#b45309", fontSize: 12, fontWeight: "800" },
  payoutTotalRow: { borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 6 },
  payoutTotalLabel: { color: colors.green, fontSize: 12, fontWeight: "900", flex: 1 },
  payoutTotalValue: { color: colors.green, fontSize: 13, fontWeight: "900" },
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
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gpsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
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
  sellerAppHelp: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 14,
  },
  verificationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  verificationTile: {
    width: "48%",
    minHeight: 104,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 8,
    overflow: "hidden",
  },
  verificationThumb: {
    width: "100%",
    height: 62,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  verificationTileText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

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
