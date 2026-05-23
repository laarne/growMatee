import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, View, Pressable, Platform } from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { createPendingOrder, getActiveListings, type MarketListing } from "../services/listings";
import { createSellerApplication } from "../services/sellerApplications";
import { pickImageFromLibrary, uploadPublicImage, type PickedImage } from "../services/storage";
import { getOrCreateMarketConversation } from "../services/messages";
import { getUserFavorites, toggleFavorite } from "../services/favorites";
import { colors, radius, shadow } from "../theme/colors";
import { formatCurrency } from "../utils/currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const CATEGORIES = ["All", "Indoor", "Outdoor", "Rare", "Flowering", "Medicinal", "Succulents", "Herbs"];
const SORT_OPTIONS = ["Nearest", "Newest", "Price: Low", "Price: High"];

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
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortIndex, setSortIndex] = useState(0);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showAppModal, setShowAppModal] = useState(false);
  const [appShopName, setAppShopName] = useState("");
  const [appReason, setAppReason] = useState("");
  const [appPhoto, setAppPhoto] = useState<PickedImage | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Checkout sheet modal state
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutListing, setCheckoutListing] = useState<MarketListing | null>(null);
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<"Pickup" | "Meetup" | "Delivery">("Pickup");
  const [buyerNote, setBuyerNote] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    if (user && listings.length > 0) {
      const fetchFavorites = async () => {
        try {
          const favs = await getUserFavorites(user.id);
          const favMap: Record<string, boolean> = {};
          favs.forEach((f) => { favMap[f.id] = true; });
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

  useEffect(() => { loadListings(""); }, []);

  async function handlePickAppPhoto() {
    setSellerError(null);
    try {
      const picked = await pickImageFromLibrary();
      if (picked) setAppPhoto(picked);
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

  function handleOrderPress(listing: MarketListing) {
    if (listing.sellerId === user?.id) {
      setOrderMessage("This is your own listing. You cannot order from yourself.");
      return;
    }
    setCheckoutListing(listing);
    setCheckoutQty(1);
    setDeliveryMethod("Pickup");
    setBuyerNote("");
    setOrderSuccess(false);
    setShowCheckout(true);
  }

  async function handleConfirmOrder() {
    if (!user || !checkoutListing) return;
    setIsOrdering(true);
    try {
      const marketListing = {
        ...checkoutListing,
        deliveryOption: deliveryMethod,
      };
      await createPendingOrder(marketListing, user.id);
      setOrderSuccess(true);
    } catch (error) {
      setOrderMessage(error instanceof Error ? error.message : "Unable to place order.");
      setShowCheckout(false);
    } finally {
      setIsOrdering(false);
    }
  }

  const checkoutSubtotal = (checkoutListing?.price ?? 0) * checkoutQty;
  const checkoutPlatformFee = Math.round(checkoutSubtotal * 0.1 * 100) / 100;
  const checkoutTotal = checkoutSubtotal + checkoutPlatformFee;
  const checkoutMaxQty = checkoutListing?.quantity ?? 1;

  const filteredListings = useMemo(() => {
    if (activeCategory === "All") return listings;
    return listings.filter((l) =>
      l.category?.toLowerCase().includes(activeCategory.toLowerCase())
    );
  }, [listings, activeCategory]);

  return (
    <Screen sectionLabel="Marketplace" title="Market">
      {/* ── Search bar ── */}
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons color="#8a9583" name="magnify" size={20} style={styles.searchIcon} />
        <TextInput
          onChangeText={setSearch}
          onSubmitEditing={() => loadListings(search)}
          placeholder="Search plants, seeds, pots, supplies..."
          placeholderTextColor="#8a9583"
          returnKeyType="search"
          style={styles.searchInput}
          value={search}
        />
      </View>

      {/* ── Category chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat === activeCategory;
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Sort row ── */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by</Text>
        <Pressable onPress={() => setShowSortMenu((v) => !v)} style={styles.sortPill}>
          <Text style={styles.sortPillText}>{SORT_OPTIONS[sortIndex]}</Text>
          <MaterialCommunityIcons
            color={colors.green}
            name={showSortMenu ? "chevron-up" : "chevron-down"}
            size={16}
          />
        </Pressable>
      </View>
      {showSortMenu && (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map((opt, idx) => (
            <Pressable
              key={opt}
              onPress={() => { setSortIndex(idx); setShowSortMenu(false); }}
              style={[styles.sortMenuItem, idx === sortIndex && styles.sortMenuItemActive]}
            >
              <Text style={[styles.sortMenuItemText, idx === sortIndex && styles.sortMenuItemTextActive]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Seller section ── */}
      {!showAppModal ? (
        isVerifiedSeller ? (
          <View style={styles.sellerBanner}>
            <MaterialCommunityIcons color={colors.green} name="storefront-check-outline" size={18} />
            <Text style={styles.sellerBannerText}>Seller dashboard active</Text>
            <Text style={styles.sellerBannerStatus}>{sellerStatus.replace("_", " ")}</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowAppModal(true)}
            style={({ pressed }) => [styles.applyBanner, pressed && styles.applyBannerPressed]}
          >
            <MaterialCommunityIcons color={colors.green} name="plus-circle-outline" size={18} />
            <Text style={styles.applyBannerText}>
              {sellerStatus === "not_applied"
                ? "Sell your plants — Apply as seller"
                : `Application status: ${sellerStatus.replace("_", " ")}`}
            </Text>
            <MaterialCommunityIcons color={colors.greenMuted} name="chevron-right" size={16} />
          </Pressable>
        )
      ) : (
        <View style={styles.applyForm}>
          <Text style={styles.applyFormTitle}>Apply for Seller Verification</Text>
          <Text style={styles.applyFormSub}>Submit for admin review to start selling.</Text>
          <View style={styles.formGap}>
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
                <Button variant="secondary" onPress={() => setShowAppModal(false)}>Cancel</Button>
              </View>
            </View>
          </View>
          {sellerMessage && <Text style={styles.success}>{sellerMessage}</Text>}
          {sellerError && <Text style={styles.error}>{sellerError}</Text>}
        </View>
      )}

      {/* ── Listings header ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Listings</Text>
        <Pressable onPress={() => loadListings(search)} style={styles.refreshBtn}>
          <MaterialCommunityIcons color={colors.greenMuted} name="refresh" size={18} />
        </Pressable>
      </View>

      {/* ── States ── */}
      {isLoadingListings && (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.stateText}>Loading listings...</Text>
        </View>
      )}
      {!isLoadingListings && listingError && (
        <View style={styles.errorCard}>
          <Text style={styles.emptyTitle}>Listings failed to load</Text>
          <Text style={styles.stateText}>{listingError}</Text>
        </View>
      )}
      {!isLoadingListings && !listingError && filteredListings.length === 0 && (
        <View style={styles.centerState}>
          <MaterialCommunityIcons color={colors.line} name="sprout-outline" size={48} />
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.stateText}>Approved listings from verified sellers appear here.</Text>
        </View>
      )}

      {/* ── Listing grid (2 per row) ── */}
      {!isLoadingListings && !listingError && filteredListings.length > 0 && (
        <View style={styles.grid}>
          {filteredListings.map((listing) => (
            <Pressable
              key={listing.id}
              onPress={() => onOpenListingDetail && onOpenListingDetail(listing.id)}
              style={({ pressed }) => [styles.listingCard, pressed && styles.listingCardPressed]}
            >
              {/* Photo */}
              {listing.photoUrl ? (
                <Image source={{ uri: listing.photoUrl }} style={styles.listingImage} />
              ) : (
                <View style={styles.photoFallback}>
                  <MaterialCommunityIcons color={colors.greenMuted} name="flower-outline" size={32} />
                </View>
              )}

              {/* Favorite heart — absolute top-right */}
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); handleToggleFavorite(listing.id); }}
                style={styles.heartOverlay}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name={favoriteListings[listing.id] ? "heart" : "heart-outline"}
                  size={16}
                  color={favoriteListings[listing.id] ? "#d14b4b" : colors.white}
                />
              </Pressable>

              {/* Card body */}
              <View style={styles.listingBody}>
                {/* Category pill */}
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText} numberOfLines={1}>{listing.category}</Text>
                </View>

                <Text style={styles.listingTitle} numberOfLines={2}>{listing.name}</Text>
                <Text style={styles.price}>{formatCurrency(listing.price)}</Text>

                <View style={styles.sellerRow}>
                  <MaterialCommunityIcons color={colors.greenMuted} name="account-outline" size={10} />
                  <Text style={styles.metaSmall} numberOfLines={1}>
                    {listing.sellerId === user?.id ? "You" : listing.sellerName} · {listing.location}
                  </Text>
                </View>

                {/* Actions row: Talk to Seller + Order */}
                <View style={styles.cardActionsRow}>
                  {onOpenChat && (
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); handleMessageSeller(listing); }}
                      style={({ pressed }) => [styles.gridChatBtn, pressed && styles.actionBtnPressed]}
                      hitSlop={6}
                    >
                      <MaterialCommunityIcons name="forum-outline" size={14} color={colors.greenMid || colors.green} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={(e) => { e.stopPropagation?.(); handleOrderPress(listing); }}
                    style={({ pressed }) => [styles.gridOrderBtn, pressed && styles.actionBtnPressed]}
                  >
                    <Text style={styles.gridOrderBtnText}>Order</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
          {/* Spacer so last row aligns left when odd count */}
          {filteredListings.length % 2 !== 0 && <View style={styles.gridSpacer} />}
        </View>
      )}

      {!isLoadingListings && !listingError && hasMore && filteredListings.length > 0 && (
        <View style={styles.loadMoreWrap}>
          <Button variant="secondary" onPress={() => loadListings(search, true)}>
            Load more
          </Button>
        </View>
      )}

      {orderMessage && (
        <View style={styles.orderMsgCard}>
          <Text style={styles.orderMsgText}>{orderMessage}</Text>
        </View>
      )}

      {/* ══════════════════════════════════════════════
          CHECKOUT BOTTOM SHEET MODAL
      ══════════════════════════════════════════════ */}
      <Modal
        visible={showCheckout}
        animationType="slide"
        transparent
        onRequestClose={() => !isOrdering && setShowCheckout(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetDismiss} onPress={() => !isOrdering && setShowCheckout(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {orderSuccess && checkoutListing ? (
              /* ── Success state ── */
              <View style={styles.successWrap}>
                <View style={styles.successIcon}>
                  <MaterialCommunityIcons color={colors.green} name="check-circle" size={64} />
                </View>
                <Text style={styles.successTitle}>Order Placed! 🌿</Text>
                <Text style={styles.successSub}>
                  Your order for <Text style={styles.successBold}>{checkoutListing.name}</Text> has been sent to the seller.
                  They will confirm your {deliveryMethod.toLowerCase()} details via chat.
                </Text>
                <View style={styles.successInfoCard}>
                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Item</Text>
                    <Text style={styles.successValue}>{checkoutListing.name}</Text>
                  </View>
                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Qty</Text>
                    <Text style={styles.successValue}>{checkoutQty} {checkoutListing.unit}</Text>
                  </View>
                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Method</Text>
                    <Text style={styles.successValue}>{deliveryMethod}</Text>
                  </View>
                  <View style={[styles.successRow, styles.successTotal]}>
                    <Text style={styles.successTotalLabel}>Total Paid</Text>
                    <Text style={styles.successTotalValue}>{formatCurrency(checkoutTotal)}</Text>
                  </View>
                </View>
                <View style={styles.successActions}>
                  {onOpenChat && checkoutListing.sellerId !== user?.id && (
                    <Pressable
                      style={styles.chatSellerBtn}
                      onPress={() => {
                        setShowCheckout(false);
                        handleMessageSeller(checkoutListing);
                      }}
                    >
                      <MaterialCommunityIcons color={colors.white} name="forum" size={16} />
                      <Text style={styles.chatSellerBtnText}>Chat Seller</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.doneBtn}
                    onPress={() => setShowCheckout(false)}
                  >
                    <Text style={styles.doneBtnText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            ) : checkoutListing ? (
              /* ── Checkout form ── */
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Checkout</Text>
                  <Pressable onPress={() => setShowCheckout(false)} hitSlop={8}>
                    <MaterialCommunityIcons color={colors.greenMuted} name="close" size={22} />
                  </Pressable>
                </View>

                {/* Item summary */}
                <View style={styles.itemRow}>
                  {checkoutListing.photoUrl ? (
                    <Image source={{ uri: checkoutListing.photoUrl }} style={styles.itemThumb} />
                  ) : (
                    <View style={[styles.itemThumb, styles.itemThumbFallback]}>
                      <MaterialCommunityIcons color={colors.greenMuted} name="flower-outline" size={24} />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{checkoutListing.name}</Text>
                    {checkoutListing.scientificName && (
                      <Text style={styles.itemSci}>{checkoutListing.scientificName}</Text>
                    )}
                    <Text style={styles.itemPrice}>{formatCurrency(checkoutListing.price)} / {checkoutListing.unit}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Quantity stepper */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Quantity</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => setCheckoutQty((q) => Math.max(1, q - 1))}
                      style={[styles.stepBtn, checkoutQty <= 1 && styles.stepBtnDisabled]}
                      disabled={checkoutQty <= 1}
                    >
                      <MaterialCommunityIcons
                        color={checkoutQty <= 1 ? colors.line : colors.green}
                        name="minus"
                        size={20}
                      />
                    </Pressable>
                    <Text style={styles.stepValue}>{checkoutQty}</Text>
                    <Pressable
                      onPress={() => setCheckoutQty((q) => Math.min(checkoutMaxQty, q + 1))}
                      style={[styles.stepBtn, checkoutQty >= checkoutMaxQty && styles.stepBtnDisabled]}
                      disabled={checkoutQty >= checkoutMaxQty}
                    >
                      <MaterialCommunityIcons
                        color={checkoutQty >= checkoutMaxQty ? colors.line : colors.green}
                        name="plus"
                        size={20}
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.stockNote}>{checkoutMaxQty} {checkoutListing.unit}(s) available</Text>
                </View>

                <View style={styles.divider} />

                {/* Delivery method */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>How will you receive it?</Text>
                  <View style={styles.deliveryRow}>
                    {(["Pickup", "Meetup", "Delivery"] as const).map((opt) => (
                      <Pressable
                        key={opt}
                        onPress={() => setDeliveryMethod(opt)}
                        style={[styles.deliveryChip, deliveryMethod === opt && styles.deliveryChipActive]}
                      >
                        <MaterialCommunityIcons
                          color={deliveryMethod === opt ? colors.white : colors.greenMuted}
                          name={opt === "Pickup" ? "home-outline" : opt === "Meetup" ? "map-marker-outline" : "truck-outline"}
                          size={16}
                        />
                        <Text style={[styles.deliveryChipText, deliveryMethod === opt && styles.deliveryChipTextActive]}>
                          {opt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Buyer note */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Note to seller (optional)</Text>
                  <TextInput
                    placeholder="e.g. Preferred meet time, address details..."
                    placeholderTextColor="#8a9583"
                    style={styles.noteInput}
                    value={buyerNote}
                    onChangeText={setBuyerNote}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.divider} />

                {/* Order summary */}
                <View style={styles.summaryBlock}>
                  <Text style={styles.fieldLabel}>Order Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      {checkoutListing.name} × {checkoutQty}
                    </Text>
                    <Text style={styles.summaryValue}>{formatCurrency(checkoutSubtotal)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Platform fee (10%)</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(checkoutPlatformFee)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                    <Text style={styles.summaryTotalLabel}>Total</Text>
                    <Text style={styles.summaryTotalValue}>{formatCurrency(checkoutTotal)}</Text>
                  </View>
                  <Text style={styles.payNote}>
                    💡 Payment is settled directly with the seller after they confirm your order.
                  </Text>
                </View>

                {/* Confirm button */}
                <View style={styles.confirmWrap}>
                  <Pressable
                    onPress={handleConfirmOrder}
                    disabled={isOrdering}
                    style={({ pressed }) => [
                      styles.confirmBtn,
                      (pressed || isOrdering) && styles.confirmBtnPressed,
                    ]}
                  >
                    {isOrdering ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <MaterialCommunityIcons color={colors.white} name="check" size={20} />
                        <Text style={styles.confirmBtnText}>Proceed to Checkout · {formatCurrency(checkoutTotal)}</Text>
                      </>
                    )}
                  </Pressable>
                  <Text style={styles.termsNote}>
                    By confirming, you agree to GrowMate's buyer protection terms.
                  </Text>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── Search ───────────────────────────────────────────────
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 28,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 10,
  },
  // ── Category chips ───────────────────────────────────────
  chipsScroll: { marginBottom: 10 },
  chipsRow: { gap: 8, paddingVertical: 2, paddingRight: 4 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.greenMuted, fontSize: 13, fontWeight: "800" },
  chipTextActive: { color: colors.white },
  // ── Sort ─────────────────────────────────────────────────
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sortLabel: { color: colors.greenMuted, fontSize: 13, fontWeight: "800" },
  sortPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  sortPillText: { color: colors.green, fontSize: 13, fontWeight: "900" },
  sortMenu: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sortMenuItem: { paddingHorizontal: 18, paddingVertical: 13 },
  sortMenuItemActive: { backgroundColor: colors.sage },
  sortMenuItemText: { color: colors.greenMuted, fontSize: 14, fontWeight: "700" },
  sortMenuItemTextActive: { color: colors.green, fontWeight: "900" },
  // ── Seller banners ───────────────────────────────────────
  sellerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.sage,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 8,
  },
  sellerBannerText: { flex: 1, color: colors.green, fontSize: 13, fontWeight: "900" },
  sellerBannerStatus: { color: colors.greenMuted, fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  applyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.sage,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 8,
  },
  applyBannerPressed: { opacity: 0.75 },
  applyBannerText: { flex: 1, color: colors.green, fontSize: 13, fontWeight: "800" },
  applyForm: {
    backgroundColor: colors.sage,
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    gap: 4,
  },
  applyFormTitle: { color: colors.green, fontSize: 16, fontWeight: "900" },
  applyFormSub: { color: colors.greenMuted, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  formGap: { gap: 10 },
  preview: { backgroundColor: colors.sageStrong, borderRadius: 16, height: 160, width: "100%" },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonRow: { flexDirection: "row", gap: 10 },
  flexButton: { flex: 1 },
  success: { color: colors.green, fontSize: 13, fontWeight: "800", marginTop: 8 },
  error: { color: "#9f2d20", fontSize: 13, fontWeight: "800", marginTop: 8 },
  // ── Listings header ──────────────────────────────────────
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 10,
  },
  section: { color: colors.green, fontSize: 20, fontWeight: "900" },
  refreshBtn: { padding: 6 },
  // ── States ───────────────────────────────────────────────
  centerState: { alignItems: "center", paddingVertical: 32, gap: 10 },
  stateText: { color: colors.greenMuted, fontSize: 13, fontWeight: "700", textAlign: "center" },
  emptyTitle: { color: colors.green, fontSize: 16, fontWeight: "900", textAlign: "center" },
  errorCard: {
    backgroundColor: "#fff1f0",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f5c6c2",
    padding: 16,
    gap: 6,
    marginBottom: 12,
  },
  // ── Grid layout ───────────────────────────────────────────
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  gridSpacer: {
    flex: 1,
  },
  // ── Listing card (grid cell) ──────────────────────────────
  listingCard: {
    flex: 1,
    minWidth: "47%",
    maxWidth: "49%",
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    shadowColor: "#315d37",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  listingCardPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  listingImage: { width: "100%", aspectRatio: 1, backgroundColor: colors.sage },
  photoFallback: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  heartOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  listingBody: { padding: 10, gap: 3 },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.sage,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  categoryChipText: { color: colors.green, fontSize: 10, fontWeight: "900" },
  heartBtn: { padding: 4 },
  listingTitle: { color: colors.green, fontSize: 13, fontWeight: "900", lineHeight: 18 },
  localName: { color: colors.greenMuted, fontSize: 11, fontWeight: "700" },
  price: { color: colors.green, fontSize: 15, fontWeight: "900", marginTop: 2 },
  meta: { color: colors.greenMuted, fontSize: 11, fontWeight: "800" },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 1 },
  metaSmall: { color: colors.greenMuted, fontSize: 10, fontWeight: "700", flex: 1 },
  gridOrderBtn: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  gridOrderBtnText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 999,
    paddingVertical: 10,
  },
  actionBtnPrimary: { backgroundColor: colors.green },
  actionBtnSecondary: { backgroundColor: colors.sage, borderWidth: 1, borderColor: colors.line },
  actionBtnPressed: { opacity: 0.8 },
  actionBtnTextPrimary: { color: colors.white, fontSize: 13, fontWeight: "900" },
  actionBtnTextSecondary: { color: colors.green, fontSize: 13, fontWeight: "900" },
  // ── Load more / order msg ────────────────────────────────
  loadMoreWrap: { marginVertical: 12 },
  orderMsgCard: { backgroundColor: colors.sage, borderRadius: 14, padding: 14, marginBottom: 8 },
  orderMsgText: { color: colors.green, fontSize: 13, fontWeight: "800", textAlign: "center" },

  // ── Checkout / sheet styles ──────────────────────────────
  cardActionsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    alignItems: "center",
  },
  gridChatBtn: {
    width: 36,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheetDismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "92%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: colors.green },
  itemRow: { flexDirection: "row", gap: 14, paddingVertical: 10 },
  itemThumb: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.sage },
  itemThumbFallback: { alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1, justifyContent: "center", gap: 3 },
  itemName: { fontSize: 16, fontWeight: "900", color: colors.green },
  itemSci: { fontSize: 12, fontStyle: "italic", color: colors.greenMuted, fontWeight: "700" },
  itemPrice: { fontSize: 14, fontWeight: "900", color: colors.green, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
  fieldBlock: { paddingVertical: 14, gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: "900", color: colors.greenMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  stepBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  stepBtnDisabled: { backgroundColor: colors.cream },
  stepValue: {
    width: 48,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    color: colors.green,
  },
  stockNote: { fontSize: 12, color: colors.greenMuted, fontWeight: "700" },
  deliveryRow: { flexDirection: "row", gap: 8 },
  deliveryChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  deliveryChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  deliveryChipText: { fontSize: 13, fontWeight: "900", color: colors.greenMuted },
  deliveryChipTextActive: { color: colors.white },
  noteInput: {
    backgroundColor: colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    padding: 12,
    minHeight: 80,
  },
  summaryBlock: { paddingVertical: 14, gap: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: colors.greenMuted, fontSize: 14, fontWeight: "700" },
  summaryValue: { color: colors.green, fontSize: 14, fontWeight: "800" },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    marginTop: 4,
  },
  summaryTotalLabel: { color: colors.green, fontSize: 16, fontWeight: "900" },
  summaryTotalValue: { color: colors.green, fontSize: 18, fontWeight: "900" },
  payNote: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 6,
  },
  confirmWrap: { paddingVertical: 16, gap: 10 },
  confirmBtn: {
    backgroundColor: colors.green,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  confirmBtnPressed: { opacity: 0.85 },
  confirmBtnText: { color: colors.white, fontSize: 16, fontWeight: "900" },
  termsNote: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
  },
  successWrap: { paddingVertical: 24, alignItems: "center", gap: 14 },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 24, fontWeight: "900", color: colors.green },
  successSub: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.greenMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  successBold: { fontWeight: "900", color: colors.green },
  successInfoCard: {
    width: "100%",
    backgroundColor: colors.cream,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 8,
  },
  successRow: { flexDirection: "row", justifyContent: "space-between" },
  successLabel: { color: colors.greenMuted, fontSize: 13, fontWeight: "700" },
  successValue: { color: colors.green, fontSize: 13, fontWeight: "900" },
  successTotal: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, marginTop: 4 },
  successTotalLabel: { color: colors.green, fontSize: 15, fontWeight: "900" },
  successTotalValue: { color: colors.green, fontSize: 17, fontWeight: "900" },
  successActions: { flexDirection: "row", gap: 10, width: "100%" },
  chatSellerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingVertical: 13,
  },
  chatSellerBtnText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  doneBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sage,
    borderRadius: 999,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.line,
  },
  doneBtnText: { color: colors.green, fontSize: 14, fontWeight: "900" },
});
