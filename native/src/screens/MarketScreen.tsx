import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { createPendingOrder, getActiveListings, type MarketListing } from "../services/listings";
import { createSellerApplication } from "../services/sellerApplications";
import { pickImageFromLibrary, uploadPublicImage, type PickedImage } from "../services/storage";
import { getOrCreateMarketConversation } from "../services/messages";
import { getUserFavorites, toggleFavorite } from "../services/favorites";
import { colors } from "../theme/colors";
import { formatCurrency } from "../utils/currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export function MarketScreen({
  onOpenChat,
  onOpenListingDetail,
}: {
  onOpenChat?: (convoId: string, title: string) => void;
  onOpenListingDetail?: (listingId: string) => void;
}) {
  const { profile, user } = useAuth();
  const [isApplying, setIsApplying] = useState(false);
  const [sellerMessage, setSellerMessage] = useState<string | null>(null);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [listingError, setListingError] = useState<string | null>(null);
  const [buyingListingId, setBuyingListingId] = useState<string | null>(null);
  const [messagingListingId, setMessagingListingId] = useState<string | null>(null);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const sellerStatus = profile?.seller_status ?? "not_applied";
  const isVerifiedSeller = sellerStatus === "verified";

  const [favoriteListings, setFavoriteListings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user && listings.length > 0) {
      const fetchFavorites = async () => {
        try {
          const favs = await getUserFavorites(user.id);
          const favMap: Record<string, boolean> = {};
          favs.forEach((f) => {
            favMap[f.id] = true;
          });
          setFavoriteListings(favMap);
        } catch (err) {
          console.error("Failed to load favorites map", err);
        }
      };
      fetchFavorites();
    }
  }, [user?.id, listings]);

  async function handleToggleFavorite(listingId: string) {
    if (!user) return;
    try {
      const favorited = await toggleFavorite(listingId, user.id);
      setFavoriteListings((prev) => ({ ...prev, [listingId]: favorited }));
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  }

  // Seller Application states
  const [showAppModal, setShowAppModal] = useState(false);
  const [appShopName, setAppShopName] = useState("");
  const [appReason, setAppReason] = useState("");
  const [appPhoto, setAppPhoto] = useState<PickedImage | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const visibleListings = useMemo(() => listings, [listings]);

  async function loadListings(nextSearch = search, isLoadMore = false) {
    if (!isLoadMore) {
      setIsLoadingListings(true);
      setListingError(null);
    }

    try {
      const lastItem = isLoadMore && listings.length > 0 ? listings[listings.length - 1] : undefined;
      const data = await getActiveListings(nextSearch, 10, lastItem?.publishedAt || undefined);
      
      if (isLoadMore) {
        setListings((prev) => [...prev, ...data]);
      } else {
        setListings(data);
      }
      setHasMore(data.length === 10);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load listings.";
      setListingError(message);
    } finally {
      setIsLoadingListings(false);
    }
  }

  useEffect(() => {
    loadListings("");
  }, []);

  async function handlePickAppPhoto() {
    setSellerError(null);
    try {
      const picked = await pickImageFromLibrary();
      if (picked) {
        setAppPhoto(picked);
      }
    } catch (photoError) {
      const message = photoError instanceof Error ? photoError.message : "Unable to choose photo.";
      setSellerError(message);
    }
  }

  async function handleApplyAsSellerSubmit() {
    if (!user) return;

    setIsApplying(true);
    setSellerMessage(null);
    setSellerError(null);

    try {
      let uploadedPhotoUrl: string | null = null;
      if (appPhoto) {
        // Upload to verification-docs bucket
        const uploaded = await uploadPublicImage("verification-docs" as any, user.id, "verification", appPhoto);
        uploadedPhotoUrl = uploaded.publicUrl;
      }
      await createSellerApplication(user.id, appShopName.trim(), appReason.trim(), uploadedPhotoUrl);
      setSellerMessage("Seller application sent for admin review.");
      setShowAppModal(false);
      setAppShopName("");
      setAppReason("");
      setAppPhoto(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send seller application.";
      setSellerError(message);
    } finally {
      setIsApplying(false);
    }
  }

  async function handleBuy(listing: MarketListing) {
    if (!user) return;

    setBuyingListingId(listing.id);
    setOrderMessage(null);

    try {
      await createPendingOrder(listing, user.id);
      setOrderMessage(`Pending order created for ${listing.name}. The seller can confirm meetup or delivery next.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start order.";
      setOrderMessage(message);
    } finally {
      setBuyingListingId(null);
    }
  }

  async function handleMessageSeller(listing: MarketListing) {
    if (!user || !onOpenChat) return;

    if (listing.sellerId === user.id) {
      setOrderMessage("You cannot message yourself about your own listing.");
      return;
    }

    setMessagingListingId(listing.id);
    setOrderMessage(null);

    try {
      const convoId = await getOrCreateMarketConversation(listing.id, user.id, listing.sellerId, listing.name);
      onOpenChat(convoId, `Inquiry: ${listing.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start conversation.";
      setOrderMessage(message);
    } finally {
      setMessagingListingId(null);
    }
  }

  return (
    <Screen>
      <Text style={styles.eyebrow}>Marketplace</Text>
      <Text style={styles.title}>Buy trusted plants nearby</Text>
      <TextInput
        onChangeText={setSearch}
        onSubmitEditing={() => loadListings(search)}
        placeholder="Search plants, herbs, pots, supplies..."
        placeholderTextColor="#8a9583"
        returnKeyType="search"
        style={styles.search}
        value={search}
      />

      <Card tint="sage">
        <Text style={styles.cardTitle}>Buyer-first marketplace</Text>
        <Text style={styles.body}>
          Everyone can browse and buy. Selling is unlocked only after seller verification, so GrowMate can protect buyers and reduce risky listings.
        </Text>
      </Card>

      {!showAppModal ? (
        <Card>
          <Text style={styles.cardTitle}>Want to sell plants?</Text>
          <Text style={styles.body}>
            {isVerifiedSeller
              ? "Your seller dashboard is unlocked. Listing tools will appear here next."
              : "Apply for seller verification first. Verified sellers get a seller dashboard and Leafy AI listing checks."}
          </Text>
          <Text style={styles.status}>Seller status: {sellerStatus.replace("_", " ")}</Text>
          <View style={styles.buttonGap}>
            <Button disabled={isVerifiedSeller || isApplying} onPress={() => setShowAppModal(true)}>
              {isApplying ? "Sending..." : isVerifiedSeller ? "Seller dashboard unlocked" : "Apply as seller"}
            </Button>
          </View>
          {sellerMessage && <Text style={styles.success}>{sellerMessage}</Text>}
          {sellerError && <Text style={styles.error}>{sellerError}</Text>}
        </Card>
      ) : (
        <Card tint="sage">
          <Text style={styles.cardTitle}>Apply for Seller Verification</Text>
          <Text style={styles.body}>Enter details and submit for admin review.</Text>
          
          <View style={styles.form}>
            {appPhoto && <Image source={{ uri: appPhoto.uri }} style={styles.preview} />}
            <Button variant="secondary" onPress={handlePickAppPhoto}>
              {appPhoto ? "Change proof document" : "Add proof (ID, Permit, or Greenhouse photo)"}
            </Button>
            
            <TextInput
              onChangeText={setAppShopName}
              placeholder="Shop Name"
              placeholderTextColor="#8a9583"
              style={styles.input}
              value={appShopName}
            />
            
            <TextInput
              onChangeText={setAppReason}
              placeholder="Why do you want to sell on GrowMate?"
              placeholderTextColor="#8a9583"
              style={styles.input}
              value={appReason}
            />

            <View style={styles.buttonRow}>
              <View style={styles.flexButton}>
                <Button disabled={isApplying || !appShopName.trim() || !appReason.trim()} onPress={handleApplyAsSellerSubmit}>
                  {isApplying ? "Submitting..." : "Submit"}
                </Button>
              </View>
              <View style={styles.flexButton}>
                <Button variant="secondary" onPress={() => setShowAppModal(false)}>
                  Cancel
                </Button>
              </View>
            </View>
          </View>
        </Card>
      )}

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Listings</Text>
        <Button variant="secondary" onPress={() => loadListings(search)}>
          Refresh
        </Button>
      </View>

      {isLoadingListings && (
        <Card>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.body}>Loading active listings...</Text>
        </Card>
      )}

      {!isLoadingListings && listingError && (
        <Card tint="warning">
          <Text style={styles.emptyTitle}>Listings failed to load</Text>
          <Text style={styles.body}>{listingError}</Text>
        </Card>
      )}

      {!isLoadingListings && !listingError && visibleListings.length === 0 && (
        <Card>
          <Text style={styles.emptyTitle}>No live listings yet</Text>
          <Text style={styles.body}>Approved listings from verified sellers will appear here.</Text>
        </Card>
      )}

      {!isLoadingListings &&
        !listingError &&
        visibleListings.map((listing) => (
          <Card key={listing.id}>
            <Pressable onPress={() => onOpenListingDetail && onOpenListingDetail(listing.id)}>
              <View style={styles.listingRow}>
                {listing.photoUrl ? (
                  <Image source={{ uri: listing.photoUrl }} style={styles.listingImage} />
                ) : (
                  <View style={styles.photoFallback}>
                    <Text style={styles.photoFallbackText}>Plant</Text>
                  </View>
                )}
                <View style={styles.listingContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.listingTitle} numberOfLines={1}>
                      {listing.name}
                    </Text>
                    <Pressable
                      onPress={() => handleToggleFavorite(listing.id)}
                      style={styles.favoritePress}
                    >
                      <MaterialCommunityIcons
                        name={favoriteListings[listing.id] ? "heart" : "heart-outline"}
                        size={20}
                        color={favoriteListings[listing.id] ? "#d14b4b" : colors.green}
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.categoryBadge}>{listing.category}</Text>
                  {listing.localName && (
                    <Text style={styles.localName} numberOfLines={1}>
                      Also known as {listing.localName}
                    </Text>
                  )}
                  <Text style={styles.price}>{formatCurrency(listing.price)}</Text>
                  <Text style={styles.meta}>
                    {listing.location} - {listing.quantity} {listing.unit}
                  </Text>
                  <Text style={styles.meta}>{listing.sellerName}</Text>
                </View>
              </View>
            </Pressable>
            <View style={styles.buttonRow}>
              <View style={styles.flexButton}>
                <Button disabled={buyingListingId === listing.id} onPress={() => handleBuy(listing)}>
                  {buyingListingId === listing.id ? "Starting order..." : "Start order"}
                </Button>
              </View>
              {onOpenChat && listing.sellerId !== user?.id && (
                <View style={styles.flexButton}>
                  <Button disabled={messagingListingId === listing.id} variant="secondary" onPress={() => handleMessageSeller(listing)}>
                    {messagingListingId === listing.id ? "Opening..." : "Chat Seller"}
                  </Button>
                </View>
              )}
            </View>
          </Card>
        ))}

      {!isLoadingListings && !listingError && hasMore && visibleListings.length > 0 && (
        <View style={styles.loadMoreContainer}>
          <Button variant="secondary" onPress={() => loadListings(search, true)}>
            Load More Listings
          </Button>
        </View>
      )}

      {orderMessage && <Text style={styles.orderMessage}>{orderMessage}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 4,
    color: colors.green,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },
  search: {
    marginVertical: 18,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cardTitle: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "900",
  },
  body: {
    marginTop: 8,
    color: colors.greenMuted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
  },
  status: {
    alignSelf: "flex-start",
    backgroundColor: colors.sage,
    borderRadius: 999,
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: "capitalize",
  },
  success: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 12,
  },
  error: {
    color: "#9f2d20",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 12,
  },
  sectionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  section: {
    color: colors.green,
    fontSize: 22,
    fontWeight: "900",
  },
  emptyTitle: {
    color: colors.green,
    fontSize: 17,
    fontWeight: "900",
  },
  listingRow: {
    flexDirection: "row",
    gap: 14,
  },
  listingImage: {
    backgroundColor: colors.sage,
    borderRadius: 20,
    height: 112,
    width: 112,
  },
  photoFallback: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: 20,
    height: 112,
    justifyContent: "center",
    width: 112,
  },
  photoFallbackText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  listingContent: {
    flex: 1,
  },
  category: {
    alignSelf: "flex-start",
    backgroundColor: colors.sage,
    borderRadius: 999,
    color: colors.green,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  listingTitle: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
    flex: 1,
    marginRight: 6,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  favoritePress: {
    padding: 4,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.sage,
    borderRadius: 999,
    color: colors.green,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  localName: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  price: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
  },
  meta: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  orderMessage: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  buttonGap: {
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  flexButton: {
    flex: 1,
  },
  form: {
    gap: 10,
    marginTop: 16,
  },
  preview: {
    backgroundColor: colors.sage,
    borderRadius: 20,
    height: 180,
    width: "100%",
  },
  input: {
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  loadMoreContainer: {
    marginVertical: 16,
    alignItems: "center",
  },
});
