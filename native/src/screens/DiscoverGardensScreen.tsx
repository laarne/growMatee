import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { SellerGardenModal } from "../components/SellerGardenModal";
import {
  getDiscoverableGardens,
  getFollowedGardens,
  isFollowingGarden,
  toggleFollowGarden,
  type FollowedGarden,
} from "../services/gardenFollows";
import { getOrCreateMarketConversation } from "../services/messages";
import { colors } from "../theme/colors";

type Tab = "discover" | "following";
type DiscoverFilter = "all" | "verified" | "hasListings" | "nearMe" | "indoor" | "beginner" | "topRated";
type GardenDetailTab = "plants" | "sale" | "reviews" | "tips";

type DiscoverGardensScreenProps = {
  currentGardenId?: string | null;
  onOpenChat?: (conversationId: string, title: string) => void;
  onOpenListingDetail?: (listingId: string) => void;
};

const FILTERS: { id: DiscoverFilter; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: "all", label: "All", icon: "sprout-outline" },
  { id: "verified", label: "Verified", icon: "check-decagram-outline" },
  { id: "hasListings", label: "Has Listings", icon: "storefront-outline" },
  { id: "nearMe", label: "Near Me", icon: "map-marker-radius-outline" },
  { id: "indoor", label: "Indoor", icon: "home-outline" },
  { id: "beginner", label: "Beginner Friendly", icon: "seed-outline" },
  { id: "topRated", label: "Top Rated", icon: "star-outline" },
];

const DETAIL_TABS: { id: GardenDetailTab; label: string }[] = [
  { id: "plants", label: "Plants" },
  { id: "sale", label: "For Sale" },
  { id: "reviews", label: "Reviews" },
  { id: "tips", label: "Care Tips" },
];

function gardenMatchesFilter(garden: FollowedGarden, filter: DiscoverFilter, viewerLocation?: string | null) {
  const searchText = [
    garden.name,
    garden.bio,
    garden.location,
    ...garden.previewPlants.flatMap((plant) => [plant.name, plant.category, plant.condition]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (filter === "verified") return garden.isVerifiedSeller;
  if (filter === "hasListings") return garden.activeListingsCount > 0;
  if (filter === "nearMe") {
    const locationTerms = viewerLocation
      ?.toLowerCase()
      .split(/[,\s]+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2);
    if (!locationTerms?.length) return true;
    return locationTerms.some((term) => searchText.includes(term));
  }
  if (filter === "indoor") return searchText.includes("indoor");
  if (filter === "beginner") return searchText.includes("beginner") || searchText.includes("pothos") || searchText.includes("snake");
  if (filter === "topRated") return (garden.trustScore ?? 0) >= 4.5;
  return true;
}

function getGardenReason(garden: FollowedGarden) {
  if (garden.completedSales > 0) {
    return `Good for trusted buyers - ${garden.completedSales} completed sales`;
  }

  if (garden.activeListingsCount > 0) {
    return `Best for shopping - ${garden.activeListingsCount} active listings`;
  }

  if (garden.plantCount > 0) {
    return `Known for plant care - ${garden.plantCount} collection plants`;
  }

  return "Good for discovering a new local grower";
}

const DEFAULT_COVERS = [
  "https://images.unsplash.com/photo-1545241047-6083a3684587?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1592150621744-aca64f48394a?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1530968033775-2c9273f0865e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1558905619-8714cdb4b2db?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512428813824-f7258347e62a?q=80&w=600&auto=format&fit=crop"
];

function getStableDefaultCover(uid?: string) {
  if (!uid) return DEFAULT_COVERS[0];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % DEFAULT_COVERS.length;
  return DEFAULT_COVERS[idx];
}

export function DiscoverGardensScreen({ currentGardenId, onOpenChat, onOpenListingDetail }: DiscoverGardensScreenProps) {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [activeFilter, setActiveFilter] = useState<DiscoverFilter>("all");
  const [gardens, setGardens] = useState<FollowedGarden[]>([]);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGarden, setSelectedGarden] = useState<FollowedGarden | null>(null);

  const displayedGardens = useMemo(
    () =>
      gardens.filter(
        (garden) =>
          garden.id !== currentGardenId &&
          garden.userId !== user?.id &&
          gardenMatchesFilter(garden, activeFilter, profile?.location)
      ),
    [activeFilter, currentGardenId, gardens, profile?.location, user?.id]
  );

  async function loadData() {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = activeTab === "discover" ? await getDiscoverableGardens(user.id) : await getFollowedGardens(user.id);
      setGardens(data);

      const states: Record<string, boolean> = {};

      for (const garden of data) {
        states[garden.id] = await isFollowingGarden(garden.id, user.id);
      }

      setFollowingStates(states);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gardens");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab, user?.id]);

  async function handleToggleFollow(gardenId: string) {
    if (!user) return;

    try {
      const isFollowingNow = await toggleFollowGarden(gardenId, user.id);
      setFollowingStates((prev) => ({ ...prev, [gardenId]: isFollowingNow }));

      if (activeTab === "following" && !isFollowingNow) {
        setGardens((prev) => prev.filter((garden) => garden.id !== gardenId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function handleMessageSeller(garden: FollowedGarden) {
    if (!user || !onOpenChat) return;
    if (!garden.firstListingId || !garden.firstListingName) {
      setError("This garden has no active listing to message about yet.");
      return;
    }

    try {
      const convoId = await getOrCreateMarketConversation(garden.firstListingId, user.id, garden.userId, garden.firstListingName);
      onOpenChat(convoId, `Inquiry: ${garden.firstListingName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start conversation.");
    }
  }

  function handleViewListings(garden: FollowedGarden) {
    if (garden.firstListingId && onOpenListingDetail) {
      onOpenListingDetail(garden.firstListingId);
      return;
    }

    setError("This garden has no active listings yet.");
  }

  function handleViewGarden(garden: FollowedGarden) {
    setSelectedGarden(garden);
  }

  function renderGardenCover(garden: FollowedGarden) {
    const coverUri = garden.coverPhotoUrl || getStableDefaultCover(garden.userId);
    return (
      <View style={styles.gardenCoverWrap}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.gardenCoverImg} />
        ) : (
          <View style={styles.gardenCoverFallback}>
            <MaterialCommunityIcons name="flower" size={40} color="rgba(255,255,255,0.2)" />
          </View>
        )}
        <View style={styles.gardenCoverOverlay} />
      </View>
    );
  }



  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.tabContainer}>
          <View style={styles.flexTab}>
            <Button variant={activeTab === "discover" ? "primary" : "secondary"} onPress={() => setActiveTab("discover")}>
              Discover
            </Button>
          </View>
          <View style={styles.flexTab}>
            <Button variant={activeTab === "following" ? "primary" : "secondary"} onPress={() => setActiveTab("following")}>
              Saved Gardens
            </Button>
          </View>
        </View>

        <View style={styles.introBlock}>
          <Text style={styles.screenTitle}>Discover Gardens</Text>
          <Text style={styles.screenSubtitle}>Find trusted plant sellers and collections near you.</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                onPress={() => setActiveFilter(filter.id)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <MaterialCommunityIcons name={filter.icon} size={14} color={isActive ? colors.white : colors.green} />
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={styles.loadingText}>Loading gardens...</Text>
        </View>
      )}

      {error && (
        <Card tint="warning">
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      )}

      {!isLoading && !error && gardens.length === 0 && (
        <Card>
          {activeTab === "discover" ? (
            <EmptyState
              icon="sprout-outline"
              title="No discoverable gardens"
              description="Be the first to go public. Toggle your garden to discoverable in your settings."
            />
          ) : (
            <EmptyState
              icon="bookmark-outline"
              title="No saved gardens yet"
              description="Explore discoverable gardens and save the sellers you want to revisit."
              buttonLabel="Browse Gardens"
              onButtonPress={() => setActiveTab("discover")}
            />
          )}
        </Card>
      )}

      {!isLoading && !error && gardens.length > 0 && displayedGardens.length === 0 && (
        <Card>
          <EmptyState
            icon="filter-outline"
            title="No matches for this filter"
            description="Try another filter to discover more seller gardens."
          />
        </Card>
      )}

      {!isLoading &&
        !error &&
        displayedGardens.map((garden) => {
          const isFollowing = followingStates[garden.id] ?? false;

          return (
            <Card key={garden.id} tint="sage">
              {renderGardenCover(garden)}

              <View style={styles.gardenHeader}>
                <View style={styles.ownerInfo}>
                  {garden.avatarUrl ? (
                    <Image source={{ uri: garden.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <MaterialCommunityIcons name="account" size={25} color={colors.greenMuted} />
                    </View>
                  )}
                  <View style={styles.ownerTextBlock}>
                    <Text style={styles.gardenName}>{garden.name}</Text>
                    <Text style={styles.ownerName}>
                      by {garden.userName}{garden.location ? ` - ${garden.location}` : ""}
                    </Text>
                  </View>
                </View>
                <View style={styles.trustBadge}>
                  <MaterialCommunityIcons
                    name={garden.isVerifiedSeller ? "check-decagram" : "earth"}
                    size={13}
                    color={colors.green}
                  />
                  <Text style={styles.trustBadgeText}>{garden.isVerifiedSeller ? "Verified" : "Public"}</Text>
                </View>
              </View>

              {garden.bio && <Text style={styles.bioText}>{garden.bio}</Text>}

              <View style={styles.reasonBox}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={15} color={colors.green} />
                <Text style={styles.reasonText}>{getGardenReason(garden)}</Text>
              </View>

              <View style={styles.signalRow}>
                <View style={styles.marketSignal}>
                  <Text style={styles.marketSignalText}>
                    {garden.plantCount} {garden.plantCount === 1 ? "plant" : "plants"}
                  </Text>
                </View>
                <View style={styles.marketSignal}>
                  <Text style={styles.marketSignalText}>
                    {garden.activeListingsCount} {garden.activeListingsCount === 1 ? "listing" : "listings"}
                  </Text>
                </View>
                <View style={styles.iconSignal}>
                  <MaterialCommunityIcons name="star" size={12} color="#d39b21" style={{ marginTop: -1 }} />
                  <Text style={styles.iconSignalText}>{garden.trustScore?.toFixed(1) ?? "New"}</Text>
                </View>
                <View style={styles.marketSignal}>
                  <Text style={styles.marketSignalText}>{garden.completedSales} sales</Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <View style={styles.flexButton}>
                  <Button variant="primary" onPress={() => handleViewGarden(garden)}>
                    View Garden
                  </Button>
                </View>
                <View style={styles.flexButton}>
                  <Button variant="secondary" onPress={() => handleViewListings(garden)}>
                    View Listings
                  </Button>
                </View>
              </View>

              {garden.userId !== user?.id && (
                <View style={styles.smallActionRow}>
                  {onOpenChat && garden.firstListingId && (
                    <Pressable onPress={() => handleMessageSeller(garden)} style={styles.smallAction}>
                      <MaterialCommunityIcons name="forum-outline" size={14} color={colors.green} />
                      <Text style={styles.smallActionText}>Message Seller</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => handleToggleFollow(garden.id)} style={styles.smallAction}>
                    <MaterialCommunityIcons name={isFollowing ? "bookmark" : "bookmark-outline"} size={14} color={colors.green} />
                    <Text style={styles.smallActionText}>{isFollowing ? "Saved" : "Save Garden"}</Text>
                  </Pressable>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>

      <SellerGardenModal
        visible={selectedGarden !== null}
        onClose={() => setSelectedGarden(null)}
        sellerId={selectedGarden ? selectedGarden.userId : null}
        sellerName={selectedGarden ? selectedGarden.name : ""}
        onOpenChat={onOpenChat || (() => {})}
        onOpenListingDetail={onOpenListingDetail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 10,
    paddingHorizontal: 14,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  tabContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  flexTab: {
    flex: 1,
  },
  flexButton: {
    flex: 1,
  },
  introBlock: {
    marginBottom: 10,
  },
  screenTitle: {
    color: colors.green,
    fontSize: 20,
    fontWeight: "900",
  },
  screenSubtitle: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  filterChipText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  filterChipTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  loadingText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  emptyTitle: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
  },
  errorTitle: {
    color: "#9f2d20",
    fontSize: 16,
    fontWeight: "900",
  },
  errorText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  previewCarousel: {
    gap: 8,
  },
  previewTile: {
    width: 116,
  },
  previewPhoto: {
    backgroundColor: colors.sage,
    borderRadius: 14,
    height: 82,
    width: "100%",
  },
  previewFallback: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    height: 82,
    justifyContent: "center",
    width: "100%",
  },
  previewOverlay: {
    backgroundColor: "rgba(20, 64, 36, 0.88)",
    borderRadius: 999,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: "absolute",
    top: 6,
  },
  previewLabel: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "900",
  },
  previewName: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 5,
  },
  gardenHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  ownerInfo: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  ownerTextBlock: {
    flex: 1,
  },
  avatar: {
    backgroundColor: colors.sage,
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "#e9edf0",
    borderRadius: 20,
    borderColor: "#d5dbe0",
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  gardenName: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
  },
  ownerName: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  trustBadge: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  trustBadgeText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "900",
  },
  bioText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
  },
  reasonBox: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
    padding: 10,
  },
  reasonText: {
    color: colors.green,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
  signalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  detailSignalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  marketSignal: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  marketSignalText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "900",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  iconSignal: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  iconSignalText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "900",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  smallActionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginTop: 10,
  },
  smallAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    paddingVertical: 4,
  },
  smallActionText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  modalContainer: {
    backgroundColor: colors.cream,
    flex: 1,
    paddingTop: 46,
  },
  modalHeader: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 5,
    marginBottom: 10,
    paddingVertical: 4,
  },
  backText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  modalTitle: {
    color: colors.green,
    fontSize: 22,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: colors.greenMuted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  scoreCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  scoreHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scoreTitle: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  scoreValue: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
  },
  scoreTrack: {
    backgroundColor: colors.sage,
    borderRadius: 999,
    height: 8,
    marginTop: 8,
    overflow: "hidden",
  },
  scoreFill: {
    backgroundColor: colors.green,
    borderRadius: 999,
    height: "100%",
  },
  scoreCaption: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 7,
  },
  stickyActions: {
    backgroundColor: colors.cream,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingHorizontal: 20,
  },
  detailTabs: {
    backgroundColor: colors.cream,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  detailTab: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  detailTabActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  detailTabText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "900",
  },
  detailTabTextActive: {
    color: colors.white,
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 42,
  },
  modalLoading: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  plantGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  plantTile: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    width: "48%",
  },
  plantRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  plantPhotoFrame: {
    backgroundColor: colors.sage,
    borderColor: colors.line,
    borderRadius: 13,
    borderWidth: 1,
    height: 116,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  plantHeroPhoto: {
    height: "100%",
    width: "100%",
  },
  plantHeroFallback: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  plantListedBadge: {
    backgroundColor: "rgba(20, 64, 36, 0.9)",
    borderRadius: 999,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: "absolute",
    top: 10,
  },
  plantListedBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "900",
  },
  plantInfoBlock: {
    marginTop: 10,
  },
  plantTitleRow: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 8,
  },
  plantTitleText: {
    flex: 1,
  },
  plantThumb: {
    backgroundColor: colors.sage,
    borderRadius: 14,
    height: 58,
    width: 58,
  },
  plantThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  plantRowBody: {
    flex: 1,
  },
  plantName: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "900",
  },
  plantCategory: {
    color: colors.greenMuted,
    fontSize: 10,
    fontWeight: "900",
    marginTop: -3,
  },
  scientificName: {
    color: colors.greenMuted,
    fontSize: 10,
    fontStyle: "italic",
    fontWeight: "700",
    marginTop: 2,
  },
  careNotesText: {
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.greenMuted,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  plantActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 10,
  },
  plantAction: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  inlinePlantAction: {
    alignSelf: "flex-start",
    marginTop: 10,
  },
  plantActionText: {
    color: colors.green,
    fontSize: 9,
    fontWeight: "900",
  },
  sectionTitle: {
    color: colors.green,
    fontSize: 17,
    fontWeight: "900",
  },
  reviewStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  reviewStat: {
    alignItems: "center",
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  reviewStatValue: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
  },
  reviewStatLabel: {
    color: colors.greenMuted,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
  },
  reviewQuote: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 12,
  },
  gardenCoverWrap: {
    height: 140,
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.greenDark,
    marginBottom: 12,
  },
  gardenCoverImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gardenCoverFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.greenDark,
  },
  gardenCoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
});
