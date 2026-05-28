import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
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
import { supabase } from "../services/supabase";
import { colors } from "../theme/colors";
import { formatCurrency } from "../utils/currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SellerGardenModal } from "../components/SellerGardenModal";
import { ImageZoomModal } from "../components/ImageZoomModal";

type ListingDetailScreenProps = {
  listingId: string;
  onClose: () => void;
  onOpenChat?: (convoId: string, title: string) => void;
};

type DeliveryOption = "Delivery";

const DELIVERY_OPTS: DeliveryOption[] = ["Delivery"];

export function ListingDetailScreen({ listingId, onClose, onOpenChat }: ListingDetailScreenProps) {
  const { user } = useAuth();
  const [currentListingId, setCurrentListingId] = useState(listingId);
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
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryOption>("Delivery");
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

  // Seller profile sheet states (Item 18)
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [selectedSellerName, setSelectedSellerName] = useState<string>("");
  const [showSellerGarden, setShowSellerGarden] = useState(false);

  // Zoom modal state (Item 13)
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const detail = await getListingDetail(currentListingId);
      if (!detail) { setError("Listing not found."); return; }
      setListing(detail);
      const sellerProfile = await getSellerProfile(detail.sellerId);
      setSeller(sellerProfile);
      if (user) {
        const saved = await isFavorited(currentListingId, user.id);
        setIsSaved(saved);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listing details");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [currentListingId, user?.id]);

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
    setDeliveryMethod("Delivery");
    setBuyerNote("");
    setOrderId(null);
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
        trustScore: (listing as any).trustScore || 4.8,
        isAiChecked: (listing as any).isAiChecked || false,
        isProtected: (listing as any).isProtected || false,
      };
      const newId = await createPendingOrder(marketListing as any, user.id, checkoutQty, deliveryMethod);
      setOrderId(newId);
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

  function handleViewSellerGarden(sellerId: string, sellerName: string) {
    setSelectedSellerId(sellerId);
    setSelectedSellerName(sellerName);
    setShowSellerGarden(true);
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
  const total = subtotal;
  const maxQty = listing.quantity;

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* ── Top header bar ── */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.green} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{listing.name}</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={handleToggleSave} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={isSaved ? "Remove from favorites" : "Save listing"}>
            <MaterialCommunityIcons
              name={isSaved ? "heart" : "heart-outline"}
              size={22}
              color={isSaved ? "#d14b4b" : colors.green}
            />
          </Pressable>
          <Pressable onPress={() => setShowReportModal(true)} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Report listing">
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
              <Pressable
                key={idx}
                onPress={() => setZoomImageUrl(url)}
                style={styles.photoPressable}
                accessibilityRole="button"
                accessibilityLabel="Open image preview"
              >
                <Image source={{ uri: url }} style={styles.photo} resizeMode="cover" />
              </Pressable>
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

          {/* AI Checked and Protection Check Banners */}
          {listing.isAiChecked && (
            <View style={styles.aiVerificationBanner}>
              <MaterialCommunityIcons name="check-decagram" size={20} color={colors.green} />
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>Leafy AI Verified</Text>
                <Text style={styles.bannerDescription}>
                  GrowMate AI cleared. Match confidence: 96%. Healthy specimen.
                </Text>
              </View>
            </View>
          )}

          {listing.isProtected && (
            <View style={styles.protectionBanner}>
              <MaterialCommunityIcons name="shield-alert" size={20} color="#b91c1c" />
              <View style={styles.bannerTextContainer}>
                <Text style={[styles.bannerTitle, { color: "#b91c1c" }]}>Protected Species Alert</Text>
                <Text style={[styles.bannerDescription, { color: "#7f1d1d" }]}>
                  This is a rare/protected species. Buyers must validate compliance/permits before checkout.
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          {listing.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descText}>{listing.description}</Text>
            </View>
          )}

          {/* Seller card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller Trust Information</Text>
            <View style={styles.sellerTrustCard}>
              <View style={styles.sellerHeaderTop}>
                <View style={styles.sellerAvatarFallback}>
                  <Text style={styles.sellerAvatarText}>
                    {listing.sellerName.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.sellerHeaderText}>
                  <View style={styles.sellerNameRow}>
                    <Text style={styles.sellerProfileName}>{seller?.shopName ?? listing.sellerName}</Text>
                    {listing.isSellerVerified && (
                      <MaterialCommunityIcons name="check-decagram" size={16} color={colors.green} />
                    )}
                  </View>
                  <Text style={styles.sellerLocationText}>📍 {listing.sellerLocation} · Verified Seller</Text>
                </View>
              </View>
              
              <View style={styles.sellerStatsRow}>
                <View style={styles.sellerStatCol}>
                  <Text style={styles.sellerStatVal}>⭐ {listing.sellerRating.toFixed(1)}</Text>
                  <Text style={styles.sellerStatLbl}>Rating</Text>
                </View>
                <View style={styles.sellerStatCol}>
                  <Text style={styles.sellerStatVal}>{listing.sellerReviewCount}</Text>
                  <Text style={styles.sellerStatLbl}>Reviews</Text>
                </View>
                <View style={styles.sellerStatCol}>
                  <Text style={styles.sellerStatVal}>120+</Text>
                  <Text style={styles.sellerStatLbl}>Sales</Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  if (listing.sellerId !== user?.id) {
                    handleViewSellerGarden(listing.sellerId, seller?.shopName ?? listing.sellerName);
                  }
                }}
                style={styles.visitGardenButton}
                accessibilityRole="button"
                accessibilityLabel="Visit seller garden"
              >
                <MaterialCommunityIcons name="flower-tulip" size={16} color={colors.green} />
                <Text style={styles.visitGardenButtonText}>Visit Seller's Garden</Text>
              </Pressable>
            </View>
          </View>

          {/* Report Listing Link inside ScrollView */}
          <Pressable onPress={() => setShowReportModal(true)} style={styles.inlineReportLink}>
            <MaterialCommunityIcons name="flag-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.inlineReportLinkText}>Report this listing / Safety concerns</Text>
          </Pressable>

          {/* Status message (errors, etc.) */}
          {statusMessage && (
            <View style={styles.statusCard}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Fixed footer: structured horizontally ── */}
      <View style={styles.footer}>
        <View style={styles.horizontalFooter}>
          <View style={styles.footerPriceBlock}>
            <Text style={styles.footerPriceLabel}>Price</Text>
            <Text style={styles.footerPrice}>{formatCurrency(listing.price)}</Text>
          </View>
          <View style={styles.footerButtonsBlock}>
            {onOpenChat && listing.sellerId !== user?.id && (
              <Pressable
                onPress={handleMessageSeller}
                disabled={isMessaging}
                style={({ pressed }) => [styles.footerChatBtn, pressed && styles.chatBtnPressed]}
              >
                <MaterialCommunityIcons color={colors.green} name="forum-outline" size={20} />
              </Pressable>
            )}
            <Pressable
              onPress={openCheckout}
              style={({ pressed }) => [styles.footerCartBtn, pressed && styles.orderBtnPressed]}
            >
              <MaterialCommunityIcons color={colors.green} name="cart-plus" size={18} />
              <Text style={styles.footerCartBtnText}>Add to Cart</Text>
            </Pressable>
            <Pressable
              onPress={openCheckout}
              style={({ pressed }) => [styles.footerSendRequestBtn, pressed && styles.orderBtnPressed]}
            >
              <Text style={styles.footerSendRequestBtnText}>Buy Now</Text>
            </Pressable>
          </View>
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
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}>
          <View style={styles.sheet}>
            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            {orderSuccess ? (
              /* ── Success state ── */
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.successWrap}>
                <View style={styles.successIcon}>
                  <MaterialCommunityIcons color={colors.green} name="check-circle" size={64} />
                </View>
                <Text style={styles.successTitle}>Order Placed! 🌿</Text>
                <Text style={styles.successSub}>
                  Your order has been sent to the seller.
                  They will confirm your {deliveryMethod.toLowerCase()} details via chat.
                </Text>
                <View style={styles.successInfoCard}>
                  <Text style={styles.receiptHeader}>RECEIPT &amp; ORDER SUMMARY</Text>

                  {orderId && (
                    <View style={styles.successRow}>
                      <Text style={styles.successLabel}>Order ID</Text>
                      <Text style={[styles.successValue, styles.receiptIdText]}>{orderId.slice(0, 8).toUpperCase()}... ({orderId.slice(-4)})</Text>
                    </View>
                  )}

                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Seller</Text>
                    <Text style={styles.successValue}>{listing.sellerName || "Verified Seller"}</Text>
                  </View>

                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Item</Text>
                    <Text style={styles.successValue}>{listing.name}</Text>
                  </View>

                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Qty</Text>
                    <Text style={styles.successValue}>{checkoutQty} {listing.unit}</Text>
                  </View>

                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Delivery Method</Text>
                    <Text style={styles.successValue}>{deliveryMethod}</Text>
                  </View>

                  {buyerNote.trim() !== "" && (
                    <View style={styles.successRowCol}>
                      <Text style={styles.successLabel}>Note to Seller</Text>
                      <Text style={styles.successNoteValue}>"{buyerNote}"</Text>
                    </View>
                  )}

                  <View style={styles.receiptLineDivider} />

                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Item Price</Text>
                    <Text style={styles.successValue}>{formatCurrency(subtotal)}</Text>
                  </View>

                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Delivery / Meetup Fee</Text>
                    <Text style={styles.successValue}>To be confirmed</Text>
                  </View>

                  <View style={[styles.successRow, styles.successTotal]}>
                    <Text style={styles.successTotalLabel}>Total</Text>
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
              </ScrollView>
            ) : (
              /* ── Checkout form ── */
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetScrollContent}>
                {/* Header */}
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Cart</Text>
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
                          name="truck-outline"
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
                <View style={styles.summaryBlock}>
                  <Text style={styles.fieldLabel}>Order Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Item Price
                    </Text>
                    <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery / Meetup Fee</Text>
                    <Text style={styles.summaryValue}>To be confirmed</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                    <Text style={styles.summaryTotalLabel}>Total</Text>
                    <Text style={styles.summaryTotalValue}>{formatCurrency(total)}</Text>
                  </View>

                  <View style={styles.warningContainer}>
                    <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.greenMid} />
                    <View style={styles.warningCopy}>
                      <Text style={styles.warningTitle}>Safety Reminder</Text>
                      <Text style={styles.warningText}>
                        For your protection, keep payments and order updates inside GrowMate. Transactions outside the app may not be covered.
                      </Text>
                    </View>
                  </View>
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
                        <Text style={styles.confirmBtnText}>Send Order Request · {formatCurrency(total)}</Text>
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
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          REPORT MODAL
      ══════════════════════════════════════════════ */}
      <Modal visible={showReportModal} animationType="fade" transparent>
        <View style={styles.reportOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}>
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
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          SELLER PUBLIC GARDEN MODAL (Item 18) — Refactored to Full Profile Sheet
          ══════════════════════════════════════════════════ */}
      <SellerGardenModal
        visible={showSellerGarden}
        onClose={() => setShowSellerGarden(false)}
        sellerId={selectedSellerId}
        sellerName={selectedSellerName}
        onOpenChat={onOpenChat || (() => {})}
        onOpenListingDetail={(id) => {
          setCurrentListingId(id);
        }}
      />

      {/* ══════════════════════════════════════════════════
          IMAGE ZOOM MODAL (Item 13)
      ══════════════════════════════════════════════════ */}
      {zoomImageUrl && (
        <ImageZoomModal
          imageUrl={zoomImageUrl}
          onClose={() => setZoomImageUrl(null)}
        />
      )}
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
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 17,
    fontWeight: "900",
    color: colors.green,
  },
  headerRight: { flexDirection: "row", gap: 4 },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Scroll content ───────────────────────────────────────────
  scroll: { paddingBottom: 130 },
  photoScroll: { height: 260, backgroundColor: colors.sage },
  photo: { width: SCREEN_W, height: 260, transform: [{ scale: 1.18 }] },
  photoPressable: { width: SCREEN_W, height: 260, overflow: "hidden" },
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
  sheetScrollContent: {
    paddingBottom: 14,
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
  receiptHeader: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.green,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
    textAlign: "center",
  },
  receiptIdText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  successRowCol: {
    flexDirection: "column",
    gap: 4,
    marginTop: 2,
  },
  successNoteValue: {
    color: colors.greenMuted,
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "700",
    paddingLeft: 8,
  },
  receiptLineDivider: {
    height: 1,
    borderColor: colors.line,
    borderWidth: 0.5,
    borderStyle: "dashed",
    marginVertical: 6,
  },
  successActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 10 },
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
  sellerPressable: { width: "100%" },

  // Modal styles for seller garden profile
  modalContainer: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingTop: Platform.OS === "ios" ? 54 : 20,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
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
  modalScroll: {
    padding: 20,
    paddingBottom: 100,
  },
  modalLoading: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyTitle: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  plantCard: {
    backgroundColor: colors.surface0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
    overflow: "hidden",
  },
  plantImage: {
    width: "100%",
    height: 180,
    backgroundColor: colors.sage,
  },
  plantInfo: {
    padding: 16,
  },
  modalPlantName: {
    color: colors.green,
    fontSize: 17,
    fontWeight: "900",
  },
  modalPlantCategory: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  modalScientificName: {
    color: colors.greenMuted,
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "700",
    marginTop: 2,
  },
  careNotesText: {
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    fontSize: 13,
    color: colors.greenMuted,
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 18,
  },
  modalFooter: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.cream,
    paddingTop: 10,
  },
  // Banners
  aiVerificationBanner: {
    flexDirection: "row",
    backgroundColor: colors.sage,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    alignItems: "center",
    marginTop: 16,
  },
  protectionBanner: {
    flexDirection: "row",
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    alignItems: "center",
    marginTop: 12,
  },
  bannerTextContainer: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.green,
  },
  bannerDescription: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.greenMuted,
    lineHeight: 15,
  },
  // Trust card styles
  sellerTrustCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sellerHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sellerAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    justifyContent: "center",
    alignItems: "center",
  },
  sellerAvatarText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 15,
  },
  sellerHeaderText: {
    flex: 1,
    justifyContent: "center",
  },
  sellerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sellerProfileName: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  sellerLocationText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "700",
  },
  sellerStatsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
    marginBottom: 16,
  },
  sellerStatCol: {
    flex: 1,
    alignItems: "center",
  },
  sellerStatVal: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  sellerStatLbl: {
    fontSize: 10,
    color: colors.textTertiary,
    textTransform: "uppercase",
    marginTop: 2,
  },
  visitGardenButton: {
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  visitGardenButtonText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  inlineReportLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 8,
    marginTop: 24,
  },
  inlineReportLinkText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  // Horizontal sticky footer
  horizontalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerPriceBlock: {
    flex: 1,
    justifyContent: "center",
  },
  footerButtonsBlock: {
    flex: 2.2,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  footerChatBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.sage,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  footerCartBtn: {
    flex: 1,
    backgroundColor: colors.sage,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerCartBtnText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  footerSendRequestBtn: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerSendRequestBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  // Warning Container
  warningContainer: {
    backgroundColor: colors.surface1,
    borderColor: colors.lineMid,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginTop: 10,
  },
  warningCopy: {
    flex: 1,
    gap: 2,
  },
  warningTitle: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  warningText: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  // Profiles Tab Switcher in Modal
  sellerTabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 16,
    marginTop: 12,
  },
  sellerTabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  sellerTabBtnActive: {
    borderBottomColor: colors.green,
  },
  sellerTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  sellerTabTextActive: {
    color: colors.green,
    fontWeight: "900",
  },
  plantNameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  aiVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.sage,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiVerifiedBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.green,
  },
  sellerShopCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  shopThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.sage,
  },
  shopThumbFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.sage,
    justifyContent: "center",
    alignItems: "center",
  },
  shopCardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  shopCardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  shopCardPrice: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.green,
    marginTop: 2,
  },
  shopCardLocation: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  sellerModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.cream,
    flexDirection: "row",
    gap: 12,
  },
  floatingMsgBtn: {
    flex: 1.5,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  floatingMsgBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  closeProfileBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  closeProfileBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
});
