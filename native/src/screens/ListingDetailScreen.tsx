import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../context/AuthContext";
import {
  getListingDetail,
  createPendingOrder,
  type ListingDetail,
} from "../services/listings";
import { getSellerProfile, type SellerProfile } from "../services/profile";
import { isFavorited, toggleFavorite } from "../services/favorites";
import { createReport } from "../services/reports";
import { getOrCreateMarketConversation } from "../services/messages";
import { colors } from "../theme/colors";
import { formatCurrency } from "../utils/currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type ListingDetailScreenProps = {
  listingId: string;
  onClose: () => void;
  onOpenChat?: (convoId: string, title: string) => void;
};

type DeliveryOption = "Pickup" | "Meetup" | "Delivery";

const DELIVERY_OPTS: DeliveryOption[] = ["Pickup", "Meetup", "Delivery"];
const PLATFORM_FEE_RATE = 0.1; // 10%

export function ListingDetailScreen({ listingId, onClose, onOpenChat }: ListingDetailScreenProps) {
  const { user } = useAuth();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMessaging, setIsMessaging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Checkout modal state
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryOption>("Pickup");
  const [buyerNote, setBuyerNote] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const reportReasons = ["Spam", "Scam / Fraud", "Inappropriate Content", "Offensive Language", "Other"];

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const detail = await getListingDetail(listingId);
      if (!detail) { setError("Listing not found."); return; }
      setListing(detail);
      const sellerProfile = await getSellerProfile(detail.sellerId);
      setSeller(sellerProfile);
      if (user) {
        const saved = await isFavorited(listingId, user.id);
        setIsSaved(saved);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listing details");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [listingId, user?.id]);

  async function handleToggleSave() {
    if (!user || !listing) return;
    try {
      const saved = await toggleFavorite(listing.id, user.id);
      setIsSaved(saved);
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  }

  function openCheckout() {
    if (!listing) return;
    setCheckoutQty(1);
    setDeliveryMethod("Pickup");
    setBuyerNote("");
    setOrderSuccess(false);
    setShowCheckout(true);
  }

  async function handleConfirmOrder() {
    if (!user || !listing) return;
    setIsOrdering(true);
    try {
      const marketListing = {
        id: listing.id,
        sellerId: listing.sellerId,
        name: listing.name,
        localName: listing.localName,
        scientificName: listing.scientificName,
        category: listing.category,
        price: listing.price,
        quantity: listing.quantity,
        unit: listing.unit,
        location: listing.location,
        deliveryOption: deliveryMethod,
        description: listing.description,
        sellerName: listing.sellerName,
        photoUrl: listing.photoUrls[0] || null,
      };
      await createPendingOrder(marketListing, user.id);
      setOrderSuccess(true);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to place order.");
      setShowCheckout(false);
    } finally {
      setIsOrdering(false);
    }
  }

  async function handleMessageSeller() {
    if (!user || !listing || !onOpenChat) return;
    if (listing.sellerId === user.id) {
      setStatusMessage("You cannot message yourself.");
      return;
    }
    setIsMessaging(true);
    setStatusMessage(null);
    try {
      const convoId = await getOrCreateMarketConversation(listing.id, user.id, listing.sellerId, listing.name);
      onOpenChat(convoId, `Inquiry: ${listing.name}`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to start conversation.");
    } finally {
      setIsMessaging(false);
    }
  }

  async function handleSubmitReport() {
    if (!user || !listing) return;
    setIsReporting(true);
    try {
      await createReport({ reporterId: user.id, listingId: listing.id, reason: reportReason, details: reportDetails });
      setShowReportModal(false);
      setReportDetails("");
      setStatusMessage("Listing reported. Thank you.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsReporting(false);
    }
  }

  // ─── Loading / Error ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} size="large" />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons color={colors.line} name="alert-circle-outline" size={56} />
        <Text style={styles.errorTitle}>Not Found</Text>
        <Text style={styles.errorText}>{error ?? "Listing not found"}</Text>
        <Button onPress={onClose}>Go Back</Button>
      </View>
    );
  }

  // Checkout calculations
  const subtotal = listing.price * checkoutQty;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  const total = subtotal + platformFee;
  const maxQty = listing.quantity;

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* ── Top header bar ── */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.green} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{listing.name}</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={handleToggleSave} style={styles.iconBtn} hitSlop={8}>
            <MaterialCommunityIcons
              name={isSaved ? "heart" : "heart-outline"}
              size={22}
              color={isSaved ? "#d14b4b" : colors.green}
            />
          </Pressable>
          <Pressable onPress={() => setShowReportModal(true)} style={styles.iconBtn} hitSlop={8}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.green} />
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.photoScroll}
        >
          {listing.photoUrls.length > 0 ? (
            listing.photoUrls.map((url, idx) => (
              <Image key={idx} source={{ uri: url }} style={styles.photo} resizeMode="cover" />
            ))
          ) : (
            <View style={styles.photoFallback}>
              <MaterialCommunityIcons color={colors.greenMuted} name="flower-outline" size={56} />
              <Text style={styles.photoFallbackText}>No photo available</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.content}>
          {/* Category pill */}
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{listing.category}</Text>
          </View>

          {/* Name + scientific */}
          <Text style={styles.plantName}>{listing.name}</Text>
          {listing.scientificName && (
            <Text style={styles.scientificName}>{listing.scientificName}</Text>
          )}
          {listing.localName && (
            <Text style={styles.localName}>Local Name: {listing.localName}</Text>
          )}

          {/* Price */}
          <Text style={styles.price}>{formatCurrency(listing.price)}</Text>

          {/* Details card */}
          <Card tint="sage">
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Stock</Text>
              <Text style={styles.detailValue}>{listing.quantity} {listing.unit}</Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowBorder]}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{listing.location}</Text>
            </View>
            <View style={[styles.detailRow, styles.detailRowBorder]}>
              <Text style={styles.detailLabel}>Delivery</Text>
              <Text style={styles.detailValue}>{listing.deliveryOption}</Text>
            </View>
          </Card>

          {/* Description */}
          {listing.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descText}>{listing.description}</Text>
            </View>
          )}

          {/* Seller card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Seller</Text>
            <Card>
              <View style={styles.sellerRow}>
                <View style={styles.sellerAvatar}>
                  <MaterialCommunityIcons color={colors.green} name="account" size={24} />
                </View>
                <View style={styles.sellerInfo}>
                  <Text style={styles.sellerShop}>{seller?.shopName ?? listing.sellerName}</Text>
                  <Text style={styles.sellerHandle}>{listing.sellerName}</Text>
                </View>
                <View style={styles.sellerBadges}>
                  <View style={styles.badge}>
                    <MaterialCommunityIcons color="#d4a373" name="star" size={13} />
                    <Text style={styles.badgeText}>{seller?.trustScore?.toFixed(1) ?? "0.0"}</Text>
                  </View>
                  <View style={styles.badge}>
                    <MaterialCommunityIcons color={colors.green} name="cart-outline" size={13} />
                    <Text style={styles.badgeText}>{seller?.completedSales ?? 0}</Text>
                  </View>
                </View>
              </View>
              {seller?.sellerBio && (
                <Text style={styles.sellerBio}>{seller.sellerBio}</Text>
              )}
            </Card>
          </View>

          {/* Status message (errors, etc.) */}
          {statusMessage && (
            <View style={styles.statusCard}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Fixed footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerPriceRow}>
          <Text style={styles.footerPriceLabel}>Price</Text>
          <Text style={styles.footerPrice}>{formatCurrency(listing.price)}</Text>
        </View>
        <View style={styles.footerBtnRow}>
          <View style={styles.flexBtn}>
            <Pressable
              onPress={openCheckout}
              style={({ pressed }) => [styles.orderBtn, pressed && styles.orderBtnPressed]}
            >
              <MaterialCommunityIcons color={colors.white} name="cart-plus" size={18} />
              <Text style={styles.orderBtnText}>Order Now</Text>
            </Pressable>
          </View>
          {onOpenChat && listing.sellerId !== user?.id && (
            <Pressable
              onPress={handleMessageSeller}
              style={({ pressed }) => [styles.chatBtn, pressed && styles.chatBtnPressed]}
              hitSlop={4}
            >
              <MaterialCommunityIcons color={colors.green} name="forum-outline" size={20} />
            </Pressable>
          )}
        </View>
      </View>

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
            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            {orderSuccess ? (
              /* ── Success state ── */
              <View style={styles.successWrap}>
                <View style={styles.successIcon}>
                  <MaterialCommunityIcons color={colors.green} name="check-circle" size={64} />
                </View>
                <Text style={styles.successTitle}>Order Placed! 🌿</Text>
                <Text style={styles.successSub}>
                  Your order for <Text style={styles.successBold}>{listing.name}</Text> has been sent to the seller.
                  They will confirm your {deliveryMethod.toLowerCase()} details via chat.
                </Text>
                <View style={styles.successInfoCard}>
                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Item</Text>
                    <Text style={styles.successValue}>{listing.name}</Text>
                  </View>
                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Qty</Text>
                    <Text style={styles.successValue}>{checkoutQty} {listing.unit}</Text>
                  </View>
                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Method</Text>
                    <Text style={styles.successValue}>{deliveryMethod}</Text>
                  </View>
                  <View style={[styles.successRow, styles.successTotal]}>
                    <Text style={styles.successTotalLabel}>Total Paid</Text>
                    <Text style={styles.successTotalValue}>{formatCurrency(total)}</Text>
                  </View>
                </View>
                <View style={styles.successActions}>
                  {onOpenChat && listing.sellerId !== user?.id && (
                    <Pressable
                      style={styles.chatSellerBtn}
                      onPress={() => {
                        setShowCheckout(false);
                        handleMessageSeller();
                      }}
                    >
                      <MaterialCommunityIcons color={colors.white} name="forum" size={16} />
                      <Text style={styles.chatSellerBtnText}>Chat Seller</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.doneBtn}
                    onPress={() => { setShowCheckout(false); onClose(); }}
                  >
                    <Text style={styles.doneBtnText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
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
                  {listing.photoUrls[0] ? (
                    <Image source={{ uri: listing.photoUrls[0] }} style={styles.itemThumb} />
                  ) : (
                    <View style={[styles.itemThumb, styles.itemThumbFallback]}>
                      <MaterialCommunityIcons color={colors.greenMuted} name="flower-outline" size={24} />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{listing.name}</Text>
                    {listing.scientificName && (
                      <Text style={styles.itemSci}>{listing.scientificName}</Text>
                    )}
                    <Text style={styles.itemPrice}>{formatCurrency(listing.price)} / {listing.unit}</Text>
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
                      onPress={() => setCheckoutQty((q) => Math.min(maxQty, q + 1))}
                      style={[styles.stepBtn, checkoutQty >= maxQty && styles.stepBtnDisabled]}
                      disabled={checkoutQty >= maxQty}
                    >
                      <MaterialCommunityIcons
                        color={checkoutQty >= maxQty ? colors.line : colors.green}
                        name="plus"
                        size={20}
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.stockNote}>{maxQty} {listing.unit}(s) available</Text>
                </View>

                <View style={styles.divider} />

                {/* Delivery method */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>How will you receive it?</Text>
                  <View style={styles.deliveryRow}>
                    {DELIVERY_OPTS.map((opt) => (
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
                      {listing.name} × {checkoutQty}
                    </Text>
                    <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Platform fee (10%)</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(platformFee)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                    <Text style={styles.summaryTotalLabel}>Total</Text>
                    <Text style={styles.summaryTotalValue}>{formatCurrency(total)}</Text>
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
                        <Text style={styles.confirmBtnText}>Proceed to Checkout · {formatCurrency(total)}</Text>
                      </>
                    )}
                  </Pressable>
                  <Text style={styles.termsNote}>
                    By confirming, you agree to GrowMate's buyer protection terms.
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          REPORT MODAL
      ══════════════════════════════════════════════ */}
      <Modal visible={showReportModal} animationType="fade" transparent>
        <View style={styles.reportOverlay}>
          <View style={styles.reportSheet}>
            <Text style={styles.reportTitle}>Report Listing</Text>
            <Text style={styles.reportSubtitle}>Select reason:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reasonsScroll}>
              {reportReasons.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  style={[styles.reasonChip, reportReason === reason && styles.reasonChipActive]}
                >
                  <Text style={[styles.reasonChipText, reportReason === reason && styles.reasonChipTextActive]}>
                    {reason}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              style={styles.reportInput}
              placeholder="Details..."
              placeholderTextColor="#8a9583"
              multiline
              numberOfLines={4}
              value={reportDetails}
              onChangeText={setReportDetails}
            />
            <View style={styles.reportActions}>
              <View style={styles.flexBtn}>
                <Button disabled={isReporting} onPress={handleSubmitReport}>
                  {isReporting ? "Reporting..." : "Submit"}
                </Button>
              </View>
              <View style={styles.flexBtn}>
                <Button variant="secondary" onPress={() => setShowReportModal(false)}>Cancel</Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingTop: Platform.OS === "ios" ? 50 : 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.cream,
    gap: 12,
  },
  loadingText: { color: colors.green, fontSize: 14, fontWeight: "700" },
  errorTitle: { color: "#9f2d20", fontSize: 20, fontWeight: "900" },
  errorText: { color: colors.greenMuted, fontSize: 14, fontWeight: "700", textAlign: "center" },

  // ── Header ──────────────────────────────────────────────────
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.cream,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 17,
    fontWeight: "900",
    color: colors.green,
  },
  headerRight: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 6 },

  // ── Scroll content ───────────────────────────────────────────
  scroll: { paddingBottom: 130 },
  photoScroll: { height: 260, backgroundColor: colors.sage },
  photo: { width: SCREEN_W, height: 260 },
  photoFallback: {
    width: SCREEN_W,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sage,
    gap: 8,
  },
  photoFallbackText: { color: colors.greenMuted, fontSize: 13, fontWeight: "800" },

  content: { padding: 20, gap: 0 },
  categoryPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.sage,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  categoryPillText: { color: colors.green, fontSize: 12, fontWeight: "900" },
  plantName: { fontSize: 26, fontWeight: "900", color: colors.green, lineHeight: 30 },
  scientificName: { fontSize: 14, fontStyle: "italic", color: colors.greenMuted, fontWeight: "700", marginTop: 4 },
  localName: { fontSize: 13, color: colors.greenMuted, fontWeight: "700", marginTop: 2 },
  price: { fontSize: 26, fontWeight: "900", color: colors.green, marginTop: 12, marginBottom: 16 },

  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  detailLabel: { color: colors.greenMuted, fontWeight: "700", fontSize: 13 },
  detailValue: { color: colors.green, fontWeight: "900", fontSize: 13 },

  section: { marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: colors.green, marginBottom: 8 },
  descText: { fontSize: 14, lineHeight: 22, color: colors.greenMuted, fontWeight: "700" },

  sellerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerInfo: { flex: 1 },
  sellerShop: { fontSize: 15, fontWeight: "900", color: colors.green },
  sellerHandle: { fontSize: 12, fontWeight: "700", color: colors.greenMuted, marginTop: 2 },
  sellerBadges: { flexDirection: "row", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.sage,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "900", color: colors.green },
  sellerBio: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.greenMuted,
    fontWeight: "700",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },

  statusCard: {
    backgroundColor: colors.sage,
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  statusText: { color: colors.green, fontSize: 13, fontWeight: "800", textAlign: "center" },

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  footerPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  footerPriceLabel: { color: colors.greenMuted, fontSize: 13, fontWeight: "700" },
  footerPrice: { color: colors.green, fontSize: 20, fontWeight: "900" },
  footerBtnRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  flexBtn: { flex: 1 },
  orderBtn: {
    backgroundColor: colors.green,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  orderBtnPressed: { opacity: 0.85 },
  orderBtnText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  chatBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sage,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBtnPressed: { opacity: 0.75 },

  // ══ CHECKOUT SHEET ══════════════════════════════════════════
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

  // Item row
  itemRow: { flexDirection: "row", gap: 14, paddingVertical: 10 },
  itemThumb: { width: 72, height: 72, borderRadius: 16, backgroundColor: colors.sage },
  itemThumbFallback: { alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1, justifyContent: "center", gap: 3 },
  itemName: { fontSize: 16, fontWeight: "900", color: colors.green },
  itemSci: { fontSize: 12, fontStyle: "italic", color: colors.greenMuted, fontWeight: "700" },
  itemPrice: { fontSize: 14, fontWeight: "900", color: colors.green, marginTop: 4 },

  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },

  // Field blocks
  fieldBlock: { paddingVertical: 14, gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: "900", color: colors.greenMuted, textTransform: "uppercase", letterSpacing: 0.6 },

  // Qty stepper
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

  // Delivery chips
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

  // Note input
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

  // Summary
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

  // Confirm button
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

  // ── Success state ──────────────────────────────────────────────
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

  // ── Report modal ─────────────────────────────────────────────
  reportOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  reportSheet: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  reportTitle: { fontSize: 20, fontWeight: "900", color: colors.green, marginBottom: 4, textAlign: "center" },
  reportSubtitle: { fontSize: 13, fontWeight: "800", color: colors.greenMuted, marginBottom: 10 },
  reasonsScroll: { marginBottom: 14 },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.sage,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  reasonChipActive: { backgroundColor: colors.green },
  reasonChipText: { fontSize: 12, fontWeight: "800", color: colors.green },
  reasonChipTextActive: { color: colors.white },
  reportInput: {
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    padding: 12,
    height: 90,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  reportActions: { flexDirection: "row", gap: 10 },
});
