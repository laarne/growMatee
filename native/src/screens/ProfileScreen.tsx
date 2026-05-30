import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
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
import { pickImageFromLibrary, uploadPrivateImage, uploadPublicImage, type PickedImage } from "../services/storage";
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

function getFriendPlantCount(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 12) + 3; // 3 to 14 plants
}

function isFriendOnline(userId: string): boolean {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 2 === 0; // 50% online
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

type BadgeType = {
  id: string;
  title: string;
  icon: string;
  desc: string;
  unlocked: boolean;
  color: string;
  progressText?: string;
  progressVal?: number;
};

const BADGE_THEMES: Record<string, { bg: string, gradient: string, iconColor: string, iconBg: string }> = {
  garden_started: {
    bg: "#f0fdf4",
    gradient: "linear-gradient(135deg, #dcfce7 0%, #ffffff 100%)",
    iconColor: "#16a34a",
    iconBg: "rgba(22, 163, 74, 0.12)",
  },
  baby_garden: {
    bg: "#fefce8",
    gradient: "linear-gradient(135deg, #fef9c3 0%, #ffffff 100%)",
    iconColor: "#ca8a04",
    iconBg: "rgba(202, 138, 4, 0.12)",
  },
  plant_collector: {
    bg: "#ecfeff",
    gradient: "linear-gradient(135deg, #cffafe 0%, #ffffff 100%)",
    iconColor: "#0891b2",
    iconBg: "rgba(8, 145, 178, 0.12)",
  },
  garden_photo: {
    bg: "#fff7ed",
    gradient: "linear-gradient(135deg, #ffedd5 0%, #ffffff 100%)",
    iconColor: "#ea580c",
    iconBg: "rgba(234, 88, 12, 0.12)",
  },
  first_haul: {
    bg: "#f0fdfa",
    gradient: "linear-gradient(135deg, #ccfbf1 0%, #ffffff 100%)",
    iconColor: "#0d9488",
    iconBg: "rgba(13, 148, 136, 0.12)",
  },
};

function BadgeCardItem({ badge }: { badge: BadgeType }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1.05,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const theme = BADGE_THEMES[badge.id] || BADGE_THEMES.garden_started;

  const glowStyle = Platform.select({
    ios: {
      shadowColor: badge.unlocked ? theme.iconColor : "rgba(0,0,0,0)",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glow.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4],
      }),
      shadowRadius: glow.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 8],
      }),
    },
    web: {
      shadowColor: badge.unlocked ? theme.iconColor : "rgba(0,0,0,0)",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glow.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4],
      }),
      shadowRadius: glow.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 8],
      }),
    },
    android: {
      // Static elevation prevents native cast exception crash on Android when animating
      elevation: badge.unlocked ? 3 : 0,
    },
  });

  const cardStyle = badge.unlocked
    ? [
        styles.badgeCardUnlocked,
        Platform.OS === "web" && theme.gradient
          ? ({
              backgroundImage: theme.gradient,
            } as any)
          : { backgroundColor: theme.bg },
      ]
    : styles.badgeCardLocked;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ overflow: "visible" }}
    >
      <Animated.View
        style={[
          styles.badgeCard,
          cardStyle,
          { transform: [{ scale }, { translateY: badge.unlocked ? -4 : 0 }] },
          glowStyle,
          Platform.OS === "web" ? ({ transition: "transform 0.15s ease" } as any) : {},
        ]}
      >
        <View
          style={[
            styles.badgeIconWrap,
            badge.unlocked
              ? [styles.badgeIconWrapUnlocked, { backgroundColor: theme.iconBg }]
              : styles.badgeIconWrapLocked,
          ]}
        >
          <MaterialCommunityIcons
            name={badge.icon as any}
            size={20}
            color={badge.unlocked ? theme.iconColor : "#94a3b8"}
          />
        </View>
        <Text style={[styles.badgeTitle, !badge.unlocked && styles.badgeTitleLocked]} numberOfLines={1}>
          {badge.title}
        </Text>
        <Text style={[styles.badgeDesc, !badge.unlocked && styles.badgeDescLocked]} numberOfLines={3}>
          {badge.desc}
        </Text>
        {!badge.unlocked && badge.progressVal !== undefined && (
          <View style={styles.badgeProgressContainer}>
            <View style={styles.badgeProgressBar}>
              <View style={[styles.badgeProgressFill, { width: `${badge.progressVal * 100}%` }]} />
            </View>
            <Text style={styles.badgeProgressHint} numberOfLines={1}>
              {badge.progressText}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function ProfileScreen({
  onOpenChat,
  onOpenListingDetail,
}: {
  onOpenChat?: (conversationId: string, title: string) => void;
  onOpenListingDetail?: (listingId: string) => void;
}) {
  const { profile, refreshProfile, signOut, user } = useAuth();
  const { setActiveTab, setGardenActiveSubTab } = useNavigationContext();

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
  const [sellerAppStep, setSellerAppStep] = useState(1);
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
  const [showFriendsManager, setShowFriendsManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Animation Values
  const fadeMetrics = useRef(new Animated.Value(0)).current;
  const slideMetrics = useRef(new Animated.Value(15)).current;

  const fadeFriends = useRef(new Animated.Value(0)).current;
  const slideFriends = useRef(new Animated.Value(15)).current;

  const fadeAchievements = useRef(new Animated.Value(0)).current;
  const slideAchievements = useRef(new Animated.Value(15)).current;

  const xpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeMetrics.setValue(0);
    slideMetrics.setValue(15);
    fadeFriends.setValue(0);
    slideFriends.setValue(15);
    fadeAchievements.setValue(0);
    slideAchievements.setValue(15);

    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeMetrics, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideMetrics, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeFriends, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideFriends, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAchievements, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAchievements, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);



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
        uploadPrivateImage("verification-docs", user.id, "verification/id-front", idFrontPhoto),
        uploadPrivateImage("verification-docs", user.id, "verification/id-back", idBackPhoto),
        uploadPrivateImage("verification-docs", user.id, "verification/selfie-id", selfieWithIdPhoto),
        uploadPrivateImage("verification-docs", user.id, "verification/selfie-plant", selfieWithPlantPhoto),
      ]);

      await createSellerApplication(user.id, appShopName.trim(), appReason.trim(), {
        idFrontUrl: idFrontUpload.path,
        idBackUrl: idBackUpload.path,
        selfieWithIdUrl: selfieWithIdUpload.path,
        selfieWithPlantUrl: selfieWithPlantUpload.path,
      });
      setSellerAppMessage("Seller application sent for admin review.");
      setShowSellerAppModal(false);
      setSellerAppStep(1);
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

  function closeSellerApplicationModal() {
    if (isApplyingSeller) return;
    setShowSellerAppModal(false);
    setSellerAppStep(1);
    setSellerAppError(null);
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

  useEffect(() => {
    xpAnim.setValue(0);
    Animated.timing(xpAnim, {
      toValue: xpPct,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [xpPct]);

  // Badges list config (using MaterialCommunityIcons instead of emojis)
  const badges: BadgeType[] = [
    { id: "garden_started", title: "Sprout Stage", icon: "sprout-outline", desc: "Added your very first plant.", unlocked: totalPlants >= 1, color: "#EF9F27", progressText: `Progress: ${totalPlants >= 1 ? 1 : 0} of 1`, progressVal: totalPlants >= 1 ? 1 : 0 },
    { id: "baby_garden", title: "Little Oasis", icon: "pot-mix-outline", desc: "Grew your garden to 3 plants.", unlocked: totalPlants >= 3, color: "#EF9F27", progressText: `Progress: ${Math.min(3, totalPlants)} of 3`, progressVal: Math.min(3, totalPlants) / 3 },
    { id: "plant_collector", title: "Green Collector", icon: "leaf-maple", desc: "Completed 3 orders.", unlocked: completedPurchases >= 3, color: "#EF9F27", progressText: `Progress: ${Math.min(3, completedPurchases)} of 3`, progressVal: Math.min(3, completedPurchases) / 3 },
    { id: "garden_photo", title: "Paparazzi", icon: "camera-outline", desc: "Captured your green best friend.", unlocked: gardenPlants.some((p) => p.photoUrl), color: "#EF9F27", progressText: `Progress: ${gardenPlants.some((p) => p.photoUrl) ? 1 : 0} of 1`, progressVal: gardenPlants.some((p) => p.photoUrl) ? 1 : 0 },
    { id: "first_haul", title: "Plant Parent", icon: "cart-outline", desc: "Welcomed your first leaf home.", unlocked: completedPurchases >= 1, color: "#EF9F27", progressText: `Progress: ${completedPurchases >= 1 ? 1 : 0} of 1`, progressVal: completedPurchases >= 1 ? 1 : 0 },
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
  const filteredFriends = currentFriendItems.filter((friend) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      friend.displayName.toLowerCase().includes(q) ||
      (friend.location || "").toLowerCase().includes(q)
    );
  });

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
            {/* Subtle dark gradient scrim overlay */}
            <View style={styles.coverScrim} />

            {/* Identity overlay on cover photo (scrim protected) */}
            <View style={styles.coverIdentityWrap}>
              <Text style={styles.coverDisplayName} numberOfLines={1}>{displayName}</Text>
              <View style={[styles.coverLevelBadge, levelTitle.includes("Guardian") && styles.levelBadgeGold]}>
                <Text style={[styles.coverLevelText, levelTitle.includes("Guardian") && styles.levelTextGold]}>{levelTitle}</Text>
              </View>
            </View>

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
          {/* Handle + location */}
          <Text style={styles.handleText}>
            {username}{location ? ` · ${location}` : ""}
          </Text>

          {/* XP progress bar */}
          <View style={[styles.xpMiniRow, { marginBottom: 12 }]}>
            <View style={styles.xpTrack}>
              <Animated.View
                style={[
                  styles.xpFill,
                  {
                    width: xpAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.xpLabel}>Lvl {level} · {Math.round(xpPct * 100)}% XP</Text>
          </View>

          {/* Bio */}
          {bio ? <Text style={styles.bioText}>{bio}</Text> : null}

          {/* Stats row with dividers removed, using whitespace instead */}
          <Animated.View style={[styles.statsRow, { opacity: fadeMetrics, transform: [{ translateY: slideMetrics }] }]}>
            {[
              { label: "Plants", value: plantsCount, icon: "sprout" as const },
              { label: "Posts",  value: postsCount, icon: "newspaper-variant-outline" as const },
              { label: "Score",  value: score >= 1000 ? `${(score / 1000).toFixed(1)}k` : score, icon: "star" as const },
              { label: "Followers", value: followers, icon: "account-multiple-outline" as const },
            ].map(({ label, value, icon }) => {
              const isScore = label === "Score";
              return (
                <View key={label} style={[styles.statCell, isScore && styles.statCellScore]}>
                  <MaterialCommunityIcons
                    name={icon}
                    size={isScore ? 18 : 16}
                    color={isScore ? "#d97706" : colors.greenMid}
                    style={{ marginBottom: 4 }}
                  />
                  <Text style={[styles.statValue, isScore && styles.statValueScore]}>{value}</Text>
                  <Text style={[styles.statLabel, isScore && styles.statLabelScore]}>{label}</Text>
                </View>
              );
            })}
          </Animated.View>

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

          <Animated.View style={[styles.friendsCard, { opacity: fadeFriends, transform: [{ translateY: slideFriends }] }]}>
            <View style={styles.friendsHeader}>
              <View>
                <Text style={styles.friendsTitle}>Friends</Text>
                <Text style={styles.friendsSubtitle}>
                  {friendSections.friends.length} connected gardener{friendSections.friends.length === 1 ? "" : "s"}
                </Text>
              </View>
              {friendSections.friends.length > 0 && (
                <Pressable
                  onPress={() => {
                    setShowFriendsManager(true);
                    setActiveFriendTab("friends");
                  }}
                  style={({ pressed }) => [styles.viewAllBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.viewAllBtnText}>View All</Text>
                </Pressable>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.facepileContainer}
            >
              <Pressable
                onPress={() => {
                  setGardenActiveSubTab("discover");
                  setActiveTab("Garden");
                }}
                style={styles.facepileItem}
              >
                <View style={styles.facepileAddIconWrap}>
                  <MaterialCommunityIcons name="plus" size={20} color="#9FE1CB" />
                </View>
                <Text style={styles.facepileLabel} numberOfLines={1}>Add</Text>
              </Pressable>

              {friendSections.friends.length === 0 ? (
                <View style={styles.facepilePlaceholder}>
                  <Text style={styles.facepilePlaceholderText}>
                    Find your local plant buddies
                  </Text>
                </View>
              ) : (
                friendSections.friends.slice(0, 4).map((friend) => (
                  <Pressable
                    key={friend.requestId}
                    onPress={() => handleMessageFriend(friend)}
                    style={styles.facepileItem}
                  >
                    <View style={styles.avatarWrapper}>
                      {friend.avatarUrl ? (
                        <Image source={{ uri: friend.avatarUrl }} style={styles.friendAvatar} />
                      ) : (
                        <View style={[styles.friendAvatar, styles.friendAvatarFallback]}>
                          <Text style={styles.friendAvatarText}>{friend.displayName[0]?.toUpperCase() ?? "G"}</Text>
                        </View>
                      )}
                      <View style={[styles.statusDot, isFriendOnline(friend.userId) ? styles.statusDotOnline : styles.statusDotOffline]} />
                    </View>
                    <Text style={styles.facepileLabel} numberOfLines={1}>
                      {friend.displayName.split(" ")[0]}
                    </Text>
                  </Pressable>
                ))
              )}

              {friendSections.friends.length > 4 && (
                <Pressable
                  onPress={() => {
                    setShowFriendsManager(true);
                    setActiveFriendTab("friends");
                  }}
                  style={styles.facepileItem}
                >
                  <View style={styles.facepileMoreIconWrap}>
                    <Text style={styles.facepileMoreText}>+{friendSections.friends.length - 4}</Text>
                  </View>
                  <Text style={styles.facepileLabel} numberOfLines={1}>See all</Text>
                </Pressable>
              )}
            </ScrollView>
          </Animated.View>
        </View>

        {/* ══ Badges & Achievements ══════════════════════════ */}
        <Animated.View style={[styles.badgesSection, { opacity: fadeAchievements, transform: [{ translateY: slideAchievements }] }]}>
          <View style={styles.badgesSectionHeader}>
            <Text style={styles.badgesSectionTitle}>Badges & Achievements</Text>
            <View style={styles.badgesProgressPill}>
              <Text style={styles.badgesProgressPillText}>
                {badges.filter((b) => b.unlocked).length} of {badges.length} earned
              </Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
            {badges.map((badge) => (
              <BadgeCardItem key={badge.id} badge={badge} />
            ))}
          </ScrollView>
        </Animated.View>

        {/* ══ Collection Trackers ══════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collection Trackers</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trackersScroll}
          >
            {collections.map((col) => (
              <View key={col.name} style={styles.trackerCardHorizontal}>
                <View style={styles.trackerHeader}>
                  <MaterialCommunityIcons
                    name={col.icon as any}
                    size={20}
                    color={col.count > 0 ? colors.green : colors.greenMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trackerTitle} numberOfLines={1}>{col.name}</Text>
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
          </ScrollView>
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
      <Modal visible={showSellerAppModal} animationType="slide" transparent onRequestClose={closeSellerApplicationModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          style={styles.modalKeyboardAvoider}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={closeSellerApplicationModal} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Sign up as seller</Text>
                  <Text style={styles.sellerStepText}>Step {sellerAppStep} of 3</Text>
                </View>
                <Pressable onPress={closeSellerApplicationModal} disabled={isApplyingSeller} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.greenMuted} />
                </Pressable>
              </View>
              <View style={styles.stepTrack}>
                {[1, 2, 3].map((step) => (
                  <View key={step} style={[styles.stepDot, sellerAppStep >= step && styles.stepDotActive]} />
                ))}
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.sellerAppScroll}
              >
                <Text style={styles.sellerAppHelp}>
                  We verify sellers before listings go live. Complete one short step at a time.
                </Text>

                {sellerAppStep === 1 && (
                  <>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Shop name</Text>
                      <View style={styles.inputIconWrap}>
                        <MaterialCommunityIcons name="storefront-outline" size={18} color={colors.greenMuted} />
                        <TextInput
                          style={styles.fieldInputWithIcon}
                          value={appShopName}
                          onChangeText={setAppShopName}
                          placeholder="e.g. Laarne's Plant Corner"
                          placeholderTextColor={colors.textTertiary}
                        />
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Why do you want to sell?</Text>
                      <View style={[styles.inputIconWrap, styles.inputIconWrapMulti]}>
                        <MaterialCommunityIcons name="sprout-outline" size={18} color={colors.greenMuted} style={{ marginTop: 2 }} />
                        <TextInput
                          style={[styles.fieldInputWithIcon, styles.fieldInputMulti]}
                          value={appReason}
                          onChangeText={setAppReason}
                          placeholder="Tell us about your plants and selling experience..."
                          placeholderTextColor={colors.textTertiary}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                        />
                      </View>
                    </View>
                  </>
                )}

                {sellerAppStep === 2 && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>ID upload</Text>
                    <Text style={styles.sellerAppHelp}>Use clear, readable photos of your ID. This is only for admin verification.</Text>
                    <View style={styles.verificationGrid}>
                      <Pressable onPress={() => handlePickSellerPhoto(setIdFrontPhoto)} disabled={isApplyingSeller} style={styles.verificationTile}>
                        {idFrontPhoto ? <Image source={{ uri: idFrontPhoto.uri }} style={styles.verificationThumb} /> : <MaterialCommunityIcons name="card-account-details-outline" size={24} color={colors.greenMuted} />}
                        <Text style={styles.verificationTileText}>Valid ID front</Text>
                      </Pressable>
                      <Pressable onPress={() => handlePickSellerPhoto(setIdBackPhoto)} disabled={isApplyingSeller} style={styles.verificationTile}>
                        {idBackPhoto ? <Image source={{ uri: idBackPhoto.uri }} style={styles.verificationThumb} /> : <MaterialCommunityIcons name="card-account-details-star-outline" size={24} color={colors.greenMuted} />}
                        <Text style={styles.verificationTileText}>Valid ID back</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {sellerAppStep === 3 && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Trust photos</Text>
                    <Text style={styles.sellerAppHelp}>These help confirm you are a real local seller with plant inventory.</Text>
                    <View style={styles.verificationGrid}>
                      <Pressable onPress={() => handlePickSellerPhoto(setSelfieWithIdPhoto)} disabled={isApplyingSeller} style={styles.verificationTile}>
                        {selfieWithIdPhoto ? <Image source={{ uri: selfieWithIdPhoto.uri }} style={styles.verificationThumb} /> : <MaterialCommunityIcons name="account-badge-outline" size={24} color={colors.greenMuted} />}
                        <Text style={styles.verificationTileText}>Selfie with ID</Text>
                      </Pressable>
                      <Pressable onPress={() => handlePickSellerPhoto(setSelfieWithPlantPhoto)} disabled={isApplyingSeller} style={styles.verificationTile}>
                        {selfieWithPlantPhoto ? <Image source={{ uri: selfieWithPlantPhoto.uri }} style={styles.verificationThumb} /> : <MaterialCommunityIcons name="flower-outline" size={24} color={colors.greenMuted} />}
                        <Text style={styles.verificationTileText}>Selfie with plant</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {sellerAppError && <Text style={styles.errorText}>{sellerAppError}</Text>}

                <View style={styles.modalBtns}>
                  {sellerAppStep > 1 ? (
                    <Pressable
                      onPress={() => setSellerAppStep((step) => Math.max(1, step - 1))}
                      disabled={isApplyingSeller}
                      style={[styles.secondaryBtn, { flex: 1 }]}
                    >
                      <Text style={styles.secondaryBtnText}>Back</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={closeSellerApplicationModal} disabled={isApplyingSeller} style={[styles.secondaryBtn, { flex: 1 }]}>
                      <Text style={styles.secondaryBtnText}>Cancel</Text>
                    </Pressable>
                  )}

                  {sellerAppStep < 3 ? (
                    <Pressable
                      onPress={() => setSellerAppStep((step) => Math.min(3, step + 1))}
                      disabled={(sellerAppStep === 1 && !appShopName.trim()) || (sellerAppStep === 2 && (!idFrontPhoto || !idBackPhoto))}
                      style={[
                        styles.primaryBtn,
                        styles.sellerPrimaryBtn,
                        { flex: 1 },
                        ((sellerAppStep === 1 && !appShopName.trim()) || (sellerAppStep === 2 && (!idFrontPhoto || !idBackPhoto))) && styles.sellerPrimaryBtnDisabled,
                      ]}
                    >
                      <Text style={styles.primaryBtnText}>Continue</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handleApplyAsSellerSubmit}
                      disabled={isApplyingSeller || !appShopName.trim() || !idFrontPhoto || !idBackPhoto || !selfieWithIdPhoto || !selfieWithPlantPhoto}
                      style={[
                        styles.primaryBtn,
                        styles.sellerPrimaryBtn,
                        { flex: 1 },
                        (isApplyingSeller || !appShopName.trim() || !idFrontPhoto || !idBackPhoto || !selfieWithIdPhoto || !selfieWithPlantPhoto) && styles.sellerPrimaryBtnDisabled,
                      ]}
                    >
                      <Text style={styles.primaryBtnText}>{isApplyingSeller ? "Submitting..." : "Submit"}</Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
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

      {/* ══════════════════════════════════════════════════
          GARDENER NETWORK / FRIENDS MANAGER MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={showFriendsManager}
        animationType="slide"
        onRequestClose={() => {
          setShowFriendsManager(false);
          setSearchQuery("");
        }}
      >
        <Screen showHeader={false} noPadding={true}>
          {/* Modal Header */}
          <View style={styles.networkModalHeader}>
            <Pressable
              onPress={() => {
                setShowFriendsManager(false);
                setSearchQuery("");
              }}
              style={styles.modalCloseBtn}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.modalHeaderTitle}>Gardener Network</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search gardener or location..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
                </Pressable>
              ) : null}
            </View>

            {/* Tab switcher */}
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

            {/* Friends list */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
            >
              {filteredFriends.length === 0 ? (
                <View style={styles.friendEmpty}>
                  <MaterialCommunityIcons name="magnify-close" size={32} color={colors.greenMuted} />
                  <Text style={styles.friendEmptyText}>
                    {searchQuery ? "No gardeners match your search." : "No entries found."}
                  </Text>
                </View>
              ) : (
                filteredFriends.map((friend) => (
                  <View key={friend.requestId} style={styles.friendRow}>
                    <View style={styles.avatarWrapper}>
                      {friend.avatarUrl ? (
                        <Image source={{ uri: friend.avatarUrl }} style={styles.friendAvatar} />
                      ) : (
                        <View style={[styles.friendAvatar, styles.friendAvatarFallback]}>
                          <Text style={styles.friendAvatarText}>{friend.displayName[0]?.toUpperCase() ?? "G"}</Text>
                        </View>
                      )}
                      <View style={[styles.statusDot, isFriendOnline(friend.userId) ? styles.statusDotOnline : styles.statusDotOffline]} />
                    </View>

                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName} numberOfLines={1}>{friend.displayName}</Text>
                      <View style={styles.friendContextPill}>
                        <MaterialCommunityIcons name="sprout" size={11} color="#085041" style={{ marginRight: 2 }} />
                        <Text style={styles.friendContextPillText}>
                          {getFriendPlantCount(friend.userId)} plants · {friend.location || "Butuan City"}
                        </Text>
                      </View>
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
                        onPress={() => {
                          setShowFriendsManager(false);
                          handleMessageFriend(friend);
                        }}
                        style={({ pressed }) => [
                          styles.friendMessageBtn,
                          pressed && { opacity: 0.82 },
                          (!onOpenChat || messagingFriendId === friend.userId) && { opacity: 0.6 },
                        ]}
                      >
                        {messagingFriendId === friend.userId ? (
                          <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginRight: 2 }} />
                        ) : (
                          <MaterialCommunityIcons name="message-outline" size={13} color={colors.textSecondary} />
                        )}
                        <Text style={styles.friendMessageBtnText}>Message</Text>
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </Screen>
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
  coverScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "100%",
    backgroundColor: "rgba(10, 30, 10, 0.4)",
    ...Platform.select({
      web: {
        backgroundImage: "linear-gradient(to top, rgba(10, 30, 10, 0.85) 0%, rgba(10, 30, 10, 0.35) 50%, rgba(10, 30, 10, 0.1) 100%)",
      } as any,
    }),
  },
  coverIdentityWrap: {
    position: "absolute",
    bottom: 12,
    left: 114,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coverDisplayName: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.white,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  coverLevelBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  coverLevelText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        backdropFilter: "blur(6px)",
      } as any,
    }),
  },
  coverSaveBtn: {
    position: "absolute",
    right: 54, // Positioned to the left of the camera button
    top: 12,   // Moved to the top to avoid overlap with name/badge overlay
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
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#1a3d1a",
    padding: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
      },
    }),
    zIndex: 10,
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
  userIdentityGroup: {
    gap: 4,
    marginBottom: 6,
  },
  xpMiniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
  levelBadgeGold: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
  },
  levelText: { fontSize: 12, fontWeight: "800", color: colors.greenMid },
  levelTextGold: {
    color: "#b45309",
    fontWeight: "900",
  },

  handleText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600", marginBottom: 12 },

  xpRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  xpTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    backgroundColor: colors.leaf,
    borderRadius: radius.full,
    ...Platform.select({
      web: {
        backgroundImage: "linear-gradient(to right, #84cc16, #1a3a22)",
      } as any,
    }),
  },
  xpLabel: { fontSize: 12, fontWeight: "800", color: colors.greenMid },

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
  statCellBorder: { borderRightWidth: 0 },
  statValue: { fontSize: 18, fontWeight: "900", color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "600", marginTop: 2 },
  statCellScore: {
    backgroundColor: "#fef3c7",
    borderRadius: radius.md,
    margin: 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#f59e0b",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  statValueScore: {
    color: "#b45309",
    fontWeight: "900",
  },
  statLabelScore: {
    color: "#b45309",
    fontWeight: "700",
  },

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
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 0,
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
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  friendTab: {
    alignItems: "center",
    borderRadius: radius.full,
    flex: 1,
    paddingVertical: 8,
    backgroundColor: colors.surface1,
  },
  friendTabActive: {
    backgroundColor: "#1a3d1a",
  },
  friendTabText: { color: colors.textSecondary, fontSize: 12, fontWeight: "400" },
  friendTabTextActive: { color: "#9FE1CB", fontWeight: "500" },
  friendEmpty: { alignItems: "center", gap: 8, paddingVertical: 18 },
  friendEmptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
    textAlign: "center",
  },
  friendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.line,
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
  friendMeta: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 2 },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  friendMessageBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  friendContextPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E1F5EE",
    borderRadius: radius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  friendContextPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#085041",
  },
  addFriendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1a3d1a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrapper: {
    position: "relative",
    width: 38,
    height: 38,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.white,
    position: "absolute",
    bottom: -1,
    right: -1,
  },
  statusDotOnline: {
    backgroundColor: "#1D9E75",
  },
  statusDotOffline: {
    backgroundColor: "#B4B2A9",
  },
  friendPendingText: { color: colors.greenMuted, fontSize: 12, fontWeight: "900" },

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
    backgroundColor: "#e8f7f0", // distinct mint green background tint
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(26, 77, 46, 0.18)", // custom dark green border outline
    padding: 16,
    marginTop: 10,
    ...shadow.md, // premium drop shadow/elevation
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
  modalKeyboardAvoider: { flex: 1 },
  modalSheet: {
    backgroundColor: colors.surface0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingBottom: 56,
    marginBottom: -24,
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
  sellerStepText: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
  },
  stepTrack: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  stepDot: {
    backgroundColor: colors.line,
    borderRadius: 999,
    flex: 1,
    height: 5,
  },
  stepDotActive: {
    backgroundColor: colors.green,
  },

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
  inputIconWrap: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
  },
  inputIconWrapMulti: {
    alignItems: "flex-start",
    paddingTop: 12,
  },
  fieldInputWithIcon: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    minHeight: 46,
    paddingVertical: 10,
  },
  fieldInputMulti: { minHeight: 80 },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  sellerPrimaryBtn: {
    backgroundColor: colors.green,
  },
  sellerPrimaryBtnDisabled: {
    backgroundColor: colors.green,
    opacity: 0.48,
  },
  sellerAppHelp: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 14,
  },
  sellerAppScroll: {
    paddingBottom: 28,
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
  badgesSection: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: colors.surface1, // soft sage/mint background
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    ...shadow.sm,
  },
  badgesSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgesSectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.textPrimary, // forest green title text
  },
  badgesProgressPill: {
    backgroundColor: colors.surface2, // soft sage tint pill
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgesProgressPillText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "800",
  },
  badgesScroll: { marginTop: 10, paddingBottom: 6 },
  badgeCard: {
    width: 92,
    borderRadius: radius.md,
    padding: 8,
    marginRight: 8,
    alignItems: "center",
  },
  badgeCardUnlocked: {
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: "#0c2b1d",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0px 3px 8px rgba(12, 43, 29, 0.03), 0px 12px 24px rgba(12, 43, 29, 0.1)",
      } as any,
    }),
  },
  badgeCardLocked: {
    opacity: 0.55,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  badgeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    position: "relative",
  },
  badgeIconWrapUnlocked: {
    borderTopLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
  },
  badgeIconWrapLocked: {
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.04)", // grayscale background tint for locked
  },
  badgeIcon: { fontSize: 20 },
  badgeTitle: { fontSize: 9.5, fontWeight: "800", color: colors.textPrimary, textAlign: "center", marginBottom: 2 },
  badgeTitleLocked: { color: colors.textSecondary },
  badgeDesc: { fontSize: 8, color: colors.textSecondary, textAlign: "center", fontWeight: "600", lineHeight: 10 },
  badgeDescLocked: { color: colors.textTertiary },
  badgeProgressContainer: {
    width: "100%",
    marginTop: 6,
    alignItems: "center",
  },
  badgeProgressBar: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(26, 58, 34, 0.08)",
    borderRadius: 1.5,
    overflow: "hidden",
    marginBottom: 2,
  },
  badgeProgressFill: {
    height: "100%",
    backgroundColor: "#EF9F27", // gold progress fill color
    borderRadius: 1.5,
  },
  badgeProgressHint: {
    fontSize: 8,
    color: colors.textSecondary,
    fontWeight: "700",
  },

  // ── Trackers ──────────────────────────────────────────
  trackersGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  trackersScroll: { marginTop: 10, paddingBottom: 6 },
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
  trackerCardHorizontal: {
    width: 170,
    backgroundColor: colors.surface0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginRight: 10,
    ...shadow.sm,
  },
  trackerHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  trackerIcon: { fontSize: 22 },
  trackerTitle: { fontSize: 13, fontWeight: "800", color: colors.textPrimary },
  trackerRank: { fontSize: 12, fontWeight: "800", color: colors.greenMid, marginTop: 1 },
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
  trackerProgressText: { fontSize: 11, fontWeight: "800", color: colors.textSecondary, width: 36, textAlign: "right" },

  // ── Friends Facepile & Manager Modal ───────────────────
  viewAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.line,
  },
  viewAllBtnText: {
    color: colors.greenMid,
    fontSize: 11,
    fontWeight: "800",
  },
  facepileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 2,
  },
  facepileItem: {
    alignItems: "center",
    width: 56,
    gap: 6,
  },
  facepileAddIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a3d1a",
    alignItems: "center",
    justifyContent: "center",
  },
  facepileMoreIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  facepileMoreText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  facepileLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2,
    width: 56,
  },
  facepilePlaceholder: {
    justifyContent: "center",
    marginLeft: 4,
  },
  facepilePlaceholderText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
    fontStyle: "italic",
  },
  networkModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "600",
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
    }),
  },
});
