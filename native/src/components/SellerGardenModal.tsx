import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import { getOrCreateMyGarden, getGardenPlants, type GardenPlant } from "../services/gardens";
import { getActiveListings, type MarketListing } from "../services/listings";
import { getOrCreateDirectConversation } from "../services/messages";
import { getFriendStatus, sendFriendRequest, type FriendStatus } from "../services/friends";
import { colors } from "../theme/colors";
import { EmptyState } from "./EmptyState";
import { isFollowingGarden, toggleFollowGarden } from "../services/gardenFollows";

type ParsedCareNote = {
  emoji: string;
  label: string;
  value: string;
};

function parseCareNotes(notes?: string): ParsedCareNote[] {
  if (!notes) return [];
  const sentences = notes
    .split(/[.\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    if (lower.includes("water") || lower.includes("watering") || lower.includes("wet")) {
      return { emoji: "💧", label: "Water", value: sentence };
    }
    if (lower.includes("light") || lower.includes("sun") || lower.includes("shade") || lower.includes("indirect") || lower.includes("direct")) {
      return { emoji: "☀️", label: "Light", value: sentence };
    }
    if (lower.includes("listed") || lower.includes("php") || lower.includes("price") || lower.includes("sell") || lower.includes("cutting") || lower.includes("cost") || lower.includes("buy")) {
      return { emoji: "💰", label: "Market", value: sentence };
    }
    if (lower.includes("wipe") || lower.includes("clean") || lower.includes("dust") || lower.includes("monthly") || lower.includes("mist") || lower.includes("fertiliz") || lower.includes("feed")) {
      return { emoji: "🌱", label: "Care", value: sentence };
    }
    return { emoji: "📋", label: "General", value: sentence };
  });
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_GAP = 12;

const CATEGORIES = ["All", "For Sale", "Indoor", "Succulent", "Herbs", "Flowering", "Rare"];

const DEFAULT_COVERS = [
  "https://images.unsplash.com/photo-1545241047-6083a3684587?q=80&w=600&auto=format&fit=crop", // Beautiful plant shelf
  "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=600&auto=format&fit=crop", // Indoor plant collection shelf
  "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop", // Veggie garden landscape greenhouse
  "https://images.unsplash.com/photo-1592150621744-aca64f48394a?q=80&w=600&auto=format&fit=crop", // Monstera/aroid indoor shelf
  "https://images.unsplash.com/photo-1530968033775-2c9273f0865e?q=80&w=600&auto=format&fit=crop", // Patio garden setup
  "https://images.unsplash.com/photo-1558905619-8714cdb4b2db?q=80&w=600&auto=format&fit=crop", // Conservatory lush indoor garden
  "https://images.unsplash.com/photo-1512428813824-f7258347e62a?q=80&w=600&auto=format&fit=crop"  // Sunny shelf with pots
];

type SellerGardenModalProps = {
  visible: boolean;
  onClose: () => void;
  sellerId: string | null;
  sellerName: string;
  onOpenChat: (convoId: string, title: string) => void;
  onOpenListingDetail?: (listingId: string) => void;
};

export function SellerGardenModal({
  visible,
  onClose,
  sellerId,
  sellerName,
  onOpenChat,
  onOpenListingDetail,
}: SellerGardenModalProps) {
  const [plants, setPlants] = useState<GardenPlant[]>([]);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [garden, setGarden] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coverIndex, setCoverIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState("All");
  const [detailPlant, setDetailPlant] = useState<GardenPlant | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [isSendingFriendRequest, setIsSendingFriendRequest] = useState(false);

  const coverScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && sellerId) {
      loadSellerGardenData();
    }
  }, [visible, sellerId]);

  async function loadSellerGardenData() {
    if (!supabase || !sellerId) return;
    setIsLoading(true);
    setCoverIndex(0);
    setActiveCategory("All");
    try {
      const g = await getOrCreateMyGarden(sellerId);
      setGarden(g);

      const pList = await getGardenPlants(g.id);
      setPlants(pList);

      // Fetch profiles + seller info
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, cover_url, location, bio, seller_status")
        .eq("id", sellerId)
        .maybeSingle();

      const { data: sellerInfo } = await supabase
        .from("seller_profiles")
        .select("shop_name, seller_bio, trust_score, completed_sales")
        .eq("user_id", sellerId)
        .maybeSingle();

      setProfile({
        ...prof,
        ...sellerInfo,
      });

      // Fetch active listings for stats
      const activeList = await getActiveListings("", 100);
      const sellerList = activeList.filter((l) => l.sellerId === sellerId);
      setListings(sellerList);

      // Check following status from Supabase
      const { data: userSession } = await supabase.auth.getSession();
      const currentUserId = userSession?.session?.user?.id;
      if (currentUserId && currentUserId !== sellerId) {
        const following = await isFollowingGarden(g.id, currentUserId);
        setIsFollowing(following);
        const nextFriendStatus = await getFriendStatus(currentUserId, sellerId);
        setFriendStatus(nextFriendStatus);
      } else {
        setFriendStatus("none");
      }
    } catch (err) {
      console.error("Failed to load seller public garden data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Stable random default cover selector based on seller ID
  function getSellerDefaultCover(uid?: string) {
    if (!uid) return DEFAULT_COVERS[0];
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % DEFAULT_COVERS.length;
    return DEFAULT_COVERS[idx];
  }

  // Primary cover: use the garden's dedicated cover photo (the full garden landscape the owner set),
  // then fall back to profile cover_url, then a stable random default.
  const primaryCover = garden?.coverPhotoUrl || profile?.cover_url || getSellerDefaultCover(sellerId || undefined);
  // Additional slides: individual plant photos
  const plantPhotos = plants.filter((p) => p.photoUrl).map((p) => p.photoUrl!);
  // Always show the garden cover first, then plant photos as extra slides
  const coverImages = [primaryCover, ...plantPhotos];

  function handleCoverScroll(e: any) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setCoverIndex(idx);
  }

  function scrollCover(dir: 1 | -1) {
    const next = Math.max(0, Math.min(coverImages.length - 1, coverIndex + dir));
    coverScrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
    setCoverIndex(next);
  }

  // Filter plants by category
  const filtered = plants.filter((plant) => {
    if (activeCategory === "All") return true;
    if (activeCategory === "For Sale") {
      // Check if this plant is listed as one of the active listings
      return listings.some((l) => l.name.toLowerCase() === plant.name.toLowerCase());
    }
    return (plant.category ?? "").toLowerCase() === activeCategory.toLowerCase();
  });

  async function handleMessageSeller() {
    if (!supabase || !sellerId) return;
    try {
      const { data: userSession } = await supabase.auth.getSession();
      const currentUserId = userSession?.session?.user?.id;
      if (!currentUserId) return;
      if (currentUserId === sellerId) return;

      const conversationId = await getOrCreateDirectConversation(sellerId);

      onClose();
      onOpenChat(conversationId, sellerName);
    } catch (err) {
      console.error("Failed to message seller:", err);
    }
  }

  function handleViewListings() {
    // Tapping view listings filters the plants directly to "For Sale" category chip
    setActiveCategory("For Sale");
  }

  async function handleToggleFollow() {
    if (!supabase || !garden || !sellerId) return;
    try {
      const { data: userSession } = await supabase.auth.getSession();
      const currentUserId = userSession?.session?.user?.id;
      if (!currentUserId) return;

      const followingNow = await toggleFollowGarden(garden.id, currentUserId);
      setIsFollowing(followingNow);
    } catch (err) {
      console.error("Failed to toggle follow garden:", err);
    }
  }

  async function handleAddFriend() {
    if (!supabase || !sellerId || isSendingFriendRequest) return;
    setIsSendingFriendRequest(true);
    try {
      const { data: userSession } = await supabase.auth.getSession();
      const currentUserId = userSession?.session?.user?.id;
      if (!currentUserId || currentUserId === sellerId) return;

      const nextStatus = await sendFriendRequest(currentUserId, sellerId);
      setFriendStatus(nextStatus);
      if (nextStatus === "request_sent") {
        Alert.alert("Friend Request Sent", `Friend request sent to ${sellerName}!`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send friend request.";
      Alert.alert("Add Friend Failed", message);
    } finally {
      setIsSendingFriendRequest(false);
    }
  }

  function getFriendButtonCopy() {
    if (isSendingFriendRequest) return "Sending...";
    if (friendStatus === "request_sent") return "Request Sent";
    if (friendStatus === "request_received") return "Respond";
    if (friendStatus === "friends") return "Friends";
    return "Add Friend";
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.green} size="large" />
            <Text style={styles.loadingText}>Loading public garden...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* ══ Cover Carousel ══════════════════════════════ */}
            <View style={styles.coverWrap}>
              <ScrollView
                ref={coverScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleCoverScroll}
                scrollEventThrottle={16}
              >
                {coverImages.map((uri, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.coverSlide,
                      Platform.OS === "web" && uri
                        ? ({
                            backgroundImage: `url('${uri}')`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          } as any)
                        : {},
                    ]}
                  >
                    {Platform.OS !== "web" && uri && (
                      <ImageBackground
                        source={{ uri }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.coverOverlay} />
                  </View>
                ))}
              </ScrollView>

              {/* Back / Close button overlaid on top-left */}
              <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
                <MaterialCommunityIcons name="chevron-left" size={24} color={colors.white} />
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>

              {/* Carousel Pagination Dots */}
              {coverImages.length > 1 && (
                <View style={styles.dotsContainer}>
                  {coverImages.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.dot,
                        idx === coverIndex ? styles.dotActive : styles.dotInactive
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Scrim gradient overlay for text protection */}
              <View style={styles.scrimOverlay} />

              {/* Title overlay */}
              <View style={styles.coverTitle}>
                <View style={styles.sellerHeaderRow}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.sellerAvatar} />
                  ) : (
                    <View style={styles.sellerAvatarFallback}>
                      <Text style={styles.sellerAvatarInitial}>
                        {sellerName[0]?.toUpperCase() ?? "G"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.sellerNameCol}>
                    <Text style={styles.coverTitleText}>{garden?.name || `${sellerName}'s Indoor Jungle`}</Text>
                    <Text style={styles.coverSubText}>
                      {plants.length} plants · {listings.length} active listings · {profile?.location || "Butuan City"}
                    </Text>
                    <View style={styles.coverMetaRow}>
                      <View style={styles.publicPill}>
                        <MaterialCommunityIcons name="earth" size={12} color={colors.white} />
                        <Text style={styles.publicPillText}>Public garden</Text>
                      </View>
                      {profile?.seller_status === "verified" && (
                        <View style={styles.verifiedPill}>
                          <MaterialCommunityIcons name="check-decagram" size={12} color={colors.white} />
                          <Text style={styles.publicPillText}>Verified Seller</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ══ Stats row ═══════════════════════════════════ */}
            <View style={styles.statsCard}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{profile?.trust_score ? `⭐ ${profile.trust_score}` : "⭐ 4.8"}</Text>
                <Text style={styles.statLabel}>Trust Score</Text>
              </View>
              <View style={[styles.statCell, styles.statCellBorder]}>
                <Text style={styles.statValue}>{profile?.completed_sales ?? 14}</Text>
                <Text style={styles.statLabel}>Sales completed</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{listings.length}</Text>
                <Text style={styles.statLabel}>Active listings</Text>
              </View>
            </View>

            {/* ══ Action row ═══════════════════════════════════ */}
            <View style={styles.actionBtnRow}>
              {profile?.seller_status === "verified" ? (
                <>
                  <Pressable onPress={handleMessageSeller} style={[styles.actionBtn, styles.actionBtnOutline]}>
                    <MaterialCommunityIcons name="chat-outline" size={18} color={colors.green} />
                    <Text style={styles.actionBtnOutlineText}>Message Seller</Text>
                  </Pressable>
                  <Pressable onPress={handleViewListings} style={[styles.actionBtn, styles.actionBtnPrimary]}>
                    <MaterialCommunityIcons name="storefront" size={18} color={colors.white} />
                    <Text style={styles.actionBtnPrimaryText}>View Listings</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={handleAddFriend}
                    style={[
                      styles.actionBtn,
                      friendStatus === "none" ? styles.actionBtnOutline : styles.actionBtnDisabled
                    ]}
                    disabled={friendStatus !== "none" || isSendingFriendRequest}
                  >
                    <MaterialCommunityIcons
                      name={friendStatus === "friends" ? "account-check-outline" : friendStatus === "none" ? "account-plus-outline" : "account-clock-outline"}
                      size={18}
                      color={friendStatus === "none" ? colors.green : colors.greenMuted}
                    />
                    <Text style={friendStatus === "none" ? styles.actionBtnOutlineText : styles.actionBtnDisabledText}>
                      {getFriendButtonCopy()}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleToggleFollow}
                    style={[
                      styles.actionBtn,
                      isFollowing ? styles.actionBtnOutline : styles.actionBtnPrimary
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isFollowing ? "bookmark" : "bookmark-outline"}
                      size={18}
                      color={isFollowing ? colors.green : colors.white}
                    />
                    <Text style={isFollowing ? styles.actionBtnOutlineText : styles.actionBtnPrimaryText}>
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* ══ Plant Collection section ═════════════════════ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plant collection</Text>

              {/* Category chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={[styles.chip, activeCategory === cat && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Empty state */}
              {filtered.length === 0 && (
                <EmptyState
                  icon="flower-outline"
                  title={`No ${activeCategory.toLowerCase()} plants`}
                  description={`This garden doesn't have any plants under the ${activeCategory} category yet.`}
                  buttonLabel="View all plants"
                  onButtonPress={() => setActiveCategory("All")}
                />
              )}

              {/* Plant grid */}
              {filtered.length > 0 && (
                <View style={styles.grid}>
                  {filtered.map((plant) => {
                    const isListed = listings.some(
                      (l) => l.name.toLowerCase() === plant.name.toLowerCase()
                    );
                    return (
                      <Pressable
                        key={plant.id}
                        style={styles.plantCard}
                        onPress={() => setDetailPlant(plant)}
                      >
                        {plant.photoUrl ? (
                          <Image source={{ uri: plant.photoUrl }} style={styles.plantPhoto} />
                        ) : (
                          <View style={[styles.plantPhoto, styles.plantPhotoFallback]}>
                            <MaterialCommunityIcons name="flower-outline" size={36} color={colors.greenMuted} />
                          </View>
                        )}

                        {/* Listed / For Sale Overlay */}
                        {isListed && (
                          <View style={styles.forSaleBadge}>
                            <Text style={styles.forSaleBadgeText}>For Sale</Text>
                          </View>
                        )}

                        <View style={styles.plantCardInfo}>
                          <Text style={styles.plantCardName} numberOfLines={1}>{plant.name}</Text>
                          {plant.category ? (
                            <Text style={styles.plantCardCat} numberOfLines={1}>{plant.category}</Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                  {/* Spacer for odd count */}
                  {filtered.length % 2 !== 0 && <View style={styles.gridSpacer} />}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* ══ Detail Modal ════════════════════════════════ */}
      <Modal
        visible={!!detailPlant}
        animationType="fade"
        transparent
        onRequestClose={() => setDetailPlant(null)}
      >
        <View style={styles.detailModalOverlay}>
          <Pressable style={styles.detailModalBackdrop} onPress={() => setDetailPlant(null)} />
          <View style={styles.detailModalContent}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{detailPlant?.name}</Text>
                {detailPlant?.category ? (
                  <Text style={styles.detailSubtext}>{detailPlant.category}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => setDetailPlant(null)} style={styles.detailCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
              {detailPlant?.photoUrl ? (
                <Image source={{ uri: detailPlant.photoUrl }} style={styles.detailPhoto} />
              ) : (
                <View style={styles.detailPhotoFallback}>
                  <MaterialCommunityIcons name="flower" size={48} color={colors.greenMuted} />
                </View>
              )}

              <View style={styles.detailChipRow}>
                {detailPlant?.scientificName ? (
                  <View style={styles.detailChip}>
                    <MaterialCommunityIcons name="microscope" size={13} color={colors.green} />
                    <Text style={styles.detailChipText}>Scientific: {detailPlant.scientificName}</Text>
                  </View>
                ) : null}
                {detailPlant?.condition ? (
                  <View style={[styles.detailChip, { backgroundColor: "#dcfce7" }]}>
                    <MaterialCommunityIcons name="heart-pulse" size={13} color="#16a34a" />
                    <Text style={[styles.detailChipText, { color: "#16a34a" }]}>{detailPlant.condition}</Text>
                  </View>
                ) : null}
              </View>

              {detailPlant?.careNotes ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Care & Observation Notes</Text>
                  <View style={styles.careNotesBox}>
                    {parseCareNotes(detailPlant.careNotes).map((item, idx) => (
                      <View key={idx} style={styles.careNoteRow}>
                        <Text style={styles.careNoteEmoji}>{item.emoji}</Text>
                        <View style={styles.careNoteContent}>
                          <Text style={styles.careNoteLabel}>{item.label}</Text>
                          <Text style={styles.careNoteValue}>{item.value}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Care & Observation Notes</Text>
                  <View style={styles.careNotesBox}>
                    <Text style={styles.careNotesText}>No specific care guidelines recorded yet.</Text>
                  </View>
                </View>
              )}

              {onOpenListingDetail && detailPlant && (() => {
                const matchingListing = listings.find(
                  (l) => l.name.toLowerCase() === detailPlant.name.toLowerCase()
                );
                if (matchingListing) {
                  return (
                    <Pressable
                      style={styles.detailViewListingBtn}
                      onPress={() => {
                        setDetailPlant(null);
                        onClose();
                        onOpenListingDetail(matchingListing.id);
                      }}
                    >
                      <MaterialCommunityIcons name="storefront" size={16} color={colors.white} />
                      <Text style={styles.detailViewListingText}>View Listing for Sale</Text>
                    </Pressable>
                  );
                }
                return null;
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: colors.green,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  scroll: {
    paddingBottom: 40,
  },
  coverWrap: {
    height: 250,
    width: "100%",
    position: "relative",
    backgroundColor: colors.greenDark,
  },
  coverSlide: {
    width: SCREEN_W,
    height: 250,
    position: "relative",
    backgroundColor: colors.greenDark,
  },
  coverImg: {
    width: SCREEN_W,
    height: 250,
    resizeMode: "cover",
  },
  coverFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.greenDark,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    zIndex: 10,
  },
  backBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 2,
  },
  paginationBadge: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  paginationText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "800",
  },
  coverArrow: {
    position: "absolute",
    top: "45%",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  coverArrowLeft: {
    left: 12,
  },
  coverArrowRight: {
    right: 12,
  },
  coverTitle: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
  },
  sellerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.sage,
  },
  sellerAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerAvatarInitial: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  sellerNameCol: {
    flex: 1,
    gap: 2,
  },
  coverTitleText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coverSubText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  coverMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  publicPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  publicPillText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "800",
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: -16,
    flexDirection: "row",
    paddingVertical: 14,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    zIndex: 2,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
  },
  statCellBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.green,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.greenMuted,
    marginTop: 2,
    textTransform: "uppercase",
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 12,
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: colors.green,
    backgroundColor: colors.white,
  },
  actionBtnOutlineText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  actionBtnDisabled: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface1,
  },
  actionBtnDisabledText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "900",
  },
  actionBtnPrimary: {
    backgroundColor: colors.green,
  },
  actionBtnPrimaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  chipText: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  chipTextActive: {
    color: colors.white,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    justifyContent: "space-between",
    marginTop: 16,
  },
  plantCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    width: "48%",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
      },
    }),
  },
  plantPhoto: {
    width: "100%",
    height: 108,
    resizeMode: "cover",
    ...(Platform.OS === "web" ? { objectFit: "cover" as any } : {}),
  },
  plantPhotoFallback: {
    width: "100%",
    height: 108,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  gridSpacer: {
    width: "48%",
  },
  forSaleBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.green,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    zIndex: 3,
  },
  forSaleBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "900",
  },
  plantCardInfo: {
    padding: 10,
  },
  plantCardName: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  plantCardCat: {
    fontSize: 10,
    color: colors.greenMuted,
    fontWeight: "700",
    marginTop: 2,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  detailModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailModalContent: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 10,
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.green,
  },
  detailCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  detailScroll: {
    gap: 16,
  },
  detailPhoto: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    resizeMode: "cover",
  },
  detailPhotoFallback: {
    width: "100%",
    height: 180,
    backgroundColor: colors.sage,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  detailSection: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.greenMuted,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  detailValueItalic: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    fontStyle: "italic",
  },
  careNotesBox: {
    backgroundColor: "transparent",
    padding: 0,
  },
  careNotesText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  detailSubtext: {
    fontSize: 12,
    color: colors.greenMuted,
    fontWeight: "800",
    marginTop: 2,
  },
  detailChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.cream,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.line,
  },
  detailChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.green,
  },
  careNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  careNoteEmoji: {
    fontSize: 16,
    marginRight: 10,
  },
  careNoteContent: {
    flex: 1,
  },
  careNoteLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.greenMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  careNoteValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 1,
  },
  scrimOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
    zIndex: 9,
    elevation: 9,
    ...Platform.select({
      web: {
        backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
      },
      default: {
        backgroundColor: "rgba(0,0,0,0.5)",
      }
    })
  },
  dotsContainer: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    zIndex: 10,
    elevation: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 14,
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    width: 6,
  },
  detailViewListingBtn: {
    backgroundColor: colors.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 12,
    marginTop: 16,
  },
  detailViewListingText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },
});
