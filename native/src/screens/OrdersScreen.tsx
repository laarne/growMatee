import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useNavigationContext } from "../context/NavigationContext";
import { getUserOrders, updateOrderStatus, type Order } from "../services/listings";
import { createReview, getReviewForOrder } from "../services/reviews";
import { getOrCreateMarketConversation } from "../services/messages";
import { colors } from "../theme/colors";
import { readFastCache, writeFastCache } from "../utils/fastCache";
import { formatCurrency } from "../utils/currency";
import { SkeletonBlock, SkeletonCard, SkeletonLine } from "../components/Skeleton";

const ORDERS_CACHE_MAX_AGE_MS = 1000 * 60 * 10;

function OrdersSkeleton() {
  return (
    <View style={styles.listContent}>
      {[0, 1].map((item) => (
        <SkeletonCard key={item}>
          <View style={styles.skeletonOrderHeader}>
            <SkeletonBlock height={50} width={50} borderRadius={10} />
            <View style={styles.skeletonFlex}>
              <SkeletonLine width="76%" height={15} />
              <SkeletonLine width="48%" height={11} />
            </View>
          </View>
          <SkeletonBlock height={34} borderRadius={999} />
          <SkeletonBlock height={68} borderRadius={12} />
          <View style={styles.skeletonFooterRow}>
            <SkeletonLine width="38%" height={11} />
            <SkeletonLine width="46%" height={36} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}

export function OrdersScreen({
  onOpenChat,
  onOpenListingDetail,
}: {
  onOpenChat: (convoId: string, title: string) => void;
  onOpenListingDetail?: (listingId: string) => void;
}) {
  const { user } = useAuth();
  const { setActiveTab } = useNavigationContext();
  const [activeSegment, setActiveSegment] = useState<"active" | "history">("active");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewedOrders, setReviewedOrders] = useState<Record<string, boolean>>({});

  // Review Modal State
  const [reviewModalTarget, setReviewModalTarget] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateThenRefresh() {
      if (!user) return;
      const cached = await readFastCache<Order[]>(`orders:${user.id}:buyer:v1`, ORDERS_CACHE_MAX_AGE_MS);
      if (cached && isMounted) {
        setOrders(cached);
        setLoading(false);
      }

      if (isMounted) {
        loadOrders({ silent: !!cached });
      }
    }

    hydrateThenRefresh();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  async function loadOrders(options: { silent?: boolean } = {}) {
    if (!user) return;
    setLoading(options.silent ? false : orders.length === 0);
    try {
      const allOrders = await getUserOrders(user.id);
      // Filter out only where user is the buyer to keep it buyer-focused
      const buyerOrders = allOrders.filter((o) => o.buyerId === user.id);
      setOrders(buyerOrders);
      writeFastCache<Order[]>(`orders:${user.id}:buyer:v1`, buyerOrders).catch(() => {});

      // Check reviews for completed orders
      const completed = buyerOrders.filter((o) => o.status === "completed");
      const reviewEntries = await Promise.all(completed.map(async (order) => {
        const review = await getReviewForOrder(order.id, user.id);
        return [order.id, !!review] as const;
      }));
      const reviewChecks = Object.fromEntries(reviewEntries);
      setReviewedOrders(reviewChecks);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }

  async function handlePayNow(orderId: string) {
    try {
      await updateOrderStatus(orderId, "paid");
      Alert.alert("Payment Successful", "Your order has been paid. The seller is preparing your plant.");
      loadOrders();
    } catch (err) {
      Alert.alert("Error", "Failed to update order payment status.");
    }
  }

  async function handleCancelOrder(orderId: string) {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await updateOrderStatus(orderId, "cancelled");
              Alert.alert("Order Cancelled", "The order request has been cancelled.");
              loadOrders();
            } catch (err) {
              Alert.alert("Error", "Failed to cancel order.");
            }
          },
        },
      ]
    );
  }

  async function handleConfirmReceipt(orderId: string) {
    Alert.alert(
      "Confirm Order Receipt",
      "Has your plant been delivered or picked up successfully?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Received",
          onPress: async () => {
            try {
              await updateOrderStatus(orderId, "completed");
              Alert.alert("Order Completed", "Thank you for shopping on GrowMate!");
              loadOrders();
            } catch (err) {
              Alert.alert("Error", "Failed to mark order completed.");
            }
          },
        },
      ]
    );
  }

  function openReviewModal(order: Order) {
    setReviewModalTarget(order);
    setReviewRating(5);
    setReviewComment("");
  }

  async function handleMessageSeller(order: Order) {
    if (!user || !onOpenChat) return;
    try {
      const convoId = await getOrCreateMarketConversation(
        order.listingId,
        user.id,
        order.sellerId,
        order.listingName
      );
      onOpenChat(convoId, `Inquiry: ${order.listingName}`);
    } catch (err) {
      Alert.alert("Error", "Unable to start conversation.");
    }
  }

  async function handleSubmitReview() {
    if (!reviewModalTarget || !user) return;
    setSubmittingReview(true);
    try {
      await createReview(
        reviewModalTarget.id,
        user.id,
        reviewModalTarget.sellerId,
        reviewRating,
        reviewComment.trim() || null
      );
      setReviewedOrders((prev) => ({ ...prev, [reviewModalTarget.id]: true }));
      setReviewModalTarget(null);
      Alert.alert("Review Submitted", "Thank you for sharing your feedback!");
    } catch (err) {
      Alert.alert("Error", "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  // Filter orders based on segment
  // Active: pending, accepted, paid
  // History: completed, cancelled, refunded, disputed
  const activeStatuses = ["pending", "accepted", "paid"];
  const historyStatuses = ["completed", "cancelled", "refunded", "disputed"];

  const filteredOrders = orders.filter((order) => {
    if (activeSegment === "active") {
      return activeStatuses.includes(order.status);
    } else {
      return historyStatuses.includes(order.status);
    }
  });

  function getStatusStyle(status: string) {
    switch (status) {
      case "pending":
        return { bg: "#fef3c7", text: "#b45309", label: "Pending Accept" };
      case "accepted":
        return { bg: "#f5f3ff", text: "#7c3aed", label: "Accepted" };
      case "paid":
        return { bg: "#e0f2fe", text: "#0369a1", label: "Ready for Delivery" };
      case "completed":
        return { bg: "#dcfce7", text: "#15803d", label: "Completed" };
      case "cancelled":
        return { bg: "#fee2e2", text: "#b91c1c", label: "Cancelled" };
      default:
        return { bg: "#f3f4f6", text: "#4b5563", label: status.toUpperCase() };
    }
  }

  function renderPipeline(status: string) {
    if (status === "cancelled" || status === "refunded" || status === "disputed") {
      return null;
    }

    const steps = ["Pending", "Accepted", "Ready", "Done"];
    let currentStepIndex = 0;
    if (status === "pending") currentStepIndex = 0;
    else if (status === "accepted") currentStepIndex = 1;
    else if (status === "paid") currentStepIndex = 2;
    else if (status === "completed") currentStepIndex = 3;

    return (
      <View style={styles.pipelineContainer}>
        <View style={styles.pipelineLineBackground} />
        <View 
          style={[
            styles.pipelineLineActive, 
            { width: `${(currentStepIndex / 3) * 78}%` }
          ]} 
        />
        {steps.map((step, index) => {
          const isActive = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          return (
            <View key={step} style={styles.pipelineStep}>
              <View 
                style={[
                  styles.pipelineDot, 
                  isActive && styles.pipelineDotActive,
                  isCurrent && styles.pipelineDotCurrent
                ]}
              >
                {isActive ? (
                  <MaterialCommunityIcons name="check" size={10} color={colors.white} />
                ) : (
                  <View style={styles.pipelineDotInner} />
                )}
              </View>
              <Text 
                style={[
                  styles.pipelineLabel, 
                  isActive && styles.pipelineLabelActive,
                  isCurrent && styles.pipelineLabelCurrent
                ]}
              >
                {step}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusInfo = getStatusStyle(item.status);
    const hasBeenReviewed = reviewedOrders[item.id];
    const hasTimeline = ["pending", "accepted", "paid", "completed"].includes(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeftRow}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnailFallback}>
                <MaterialCommunityIcons name="flower-outline" size={24} color={colors.greenMuted} />
              </View>
            )}
            <View style={styles.headerInfoCol}>
              <Text style={styles.plantName} numberOfLines={1}>
                {item.listingName}
              </Text>
              <Text style={styles.sellerName}>Seller: {item.sellerName}</Text>
            </View>
          </View>
          {!hasTimeline && (
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusText, { color: statusInfo.text }]}>
                {statusInfo.label}
              </Text>
            </View>
          )}
        </View>

        {renderPipeline(item.status)}

        <View style={styles.detailsRow}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{item.quantity}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Total Amount</Text>
            <Text style={styles.detailValue}>{formatCurrency(item.subtotal)}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Delivery Method</Text>
            <Text style={styles.detailValue}>{item.meetupOrDelivery || "Delivery"}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            Ordered: {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </Text>

          <View style={styles.actionButtons}>
            {activeStatuses.includes(item.status) && (
              <Pressable
                onPress={() => handleMessageSeller(item)}
                style={[styles.btn, styles.btnOutline, styles.btnMessage]}
              >
                <MaterialCommunityIcons name="chat-processing-outline" size={14} color={colors.green} />
                <Text style={[styles.btnOutlineText, { color: colors.green }]}>Message</Text>
              </Pressable>
            )}

            {item.status === "pending" && (
              <Pressable
                onPress={() => handleCancelOrder(item.id)}
                style={[styles.btn, styles.btnOutline]}
              >
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </Pressable>
            )}

            {item.status === "accepted" && (
              <>
                <Pressable
                  onPress={() => handleCancelOrder(item.id)}
                  style={[styles.btn, styles.btnOutline]}
                >
                  <Text style={styles.btnOutlineText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => handlePayNow(item.id)}
                  style={[styles.btn, styles.btnPrimary]}
                >
                  <Text style={styles.btnPrimaryText}>Pay Now</Text>
                </Pressable>
              </>
            )}

            {item.status === "paid" && (
              <Pressable
                onPress={() => handleConfirmReceipt(item.id)}
                style={[styles.btn, styles.btnPrimary]}
              >
                <Text style={styles.btnPrimaryText}>Confirm Received</Text>
              </Pressable>
            )}

            {item.status === "completed" && !hasBeenReviewed && (
              <Pressable
                onPress={() => openReviewModal(item)}
                style={[styles.btn, styles.btnPrimary]}
              >
                <Text style={styles.btnPrimaryText}>Leave Review</Text>
              </Pressable>
            )}

            {item.status === "completed" && hasBeenReviewed && (
              <View style={styles.completedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={16} color={colors.green} />
                <Text style={styles.completedBadgeText}>Reviewed</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>Track your purchases & order history</Text>
      </View>

      {/* Segment Control */}
      <View style={styles.segmentContainer}>
        <Pressable
          onPress={() => setActiveSegment("active")}
          style={[styles.segmentBtn, activeSegment === "active" && styles.segmentBtnActive]}
          accessibilityRole="button"
          accessibilityLabel="Show active orders"
        >
          <Text style={[styles.segmentText, activeSegment === "active" && styles.segmentTextActive]}>
            Active
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveSegment("history")}
          style={[styles.segmentBtn, activeSegment === "history" && styles.segmentBtnActive]}
          accessibilityRole="button"
          accessibilityLabel="Show order history"
        >
          <Text style={[styles.segmentText, activeSegment === "history" && styles.segmentTextActive]}>
            History
          </Text>
        </Pressable>
      </View>

      {loading && orders.length === 0 ? (
        <OrdersSkeleton />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.green]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="receipt" size={64} color={colors.greenMuted} />
              <Text style={styles.emptyTitle}>
                {activeSegment === "active" ? "No active orders" : "No purchase history"}
              </Text>
              <Text style={styles.emptyText}>
                {activeSegment === "active"
                  ? "Looking for plants? Send an order request from the marketplace."
                  : "All completed or cancelled orders will appear here."}
              </Text>
              <Pressable onPress={() => setActiveTab("Market")} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Explore Market</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Review Modal */}
      <Modal visible={!!reviewModalTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review Seller</Text>
            <Text style={styles.modalSubtitle}>
              Rate your purchase of {reviewModalTarget?.listingName}
            </Text>

            {/* Stars */}
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setReviewRating(star)} accessibilityRole="button" accessibilityLabel={`Rate ${star} stars`}>
                  <MaterialCommunityIcons
                    name={star <= reviewRating ? "star" : "star-outline"}
                    size={36}
                    color={star <= reviewRating ? "#f59e0b" : colors.textTertiary}
                  />
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Write a comment about your experience with this seller (optional)..."
              multiline
              numberOfLines={4}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholderTextColor={colors.textTertiary}
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setReviewModalTarget(null)}
                style={[styles.modalBtn, styles.modalBtnCancel]}
                accessibilityRole="button"
                accessibilityLabel="Cancel review"
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitReview}
                disabled={submittingReview}
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                accessibilityRole="button"
                accessibilityLabel="Submit review"
              >
                {submittingReview ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>Submit Review</Text>
                )}
              </Pressable>
            </View>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.green,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  segmentBtnActive: {
    borderBottomColor: colors.green,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.green,
    fontWeight: "900",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  plantName: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  sellerName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  detailsRow: {
    flexDirection: "row",
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detailCol: {
    flex: 1,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardFooter: {
    alignItems: "stretch",
    gap: 10,
  },
  dateText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  btn: {
    minHeight: 40,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 1,
  },
  btnPrimary: {
    backgroundColor: colors.green,
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  btnOutlineText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.green,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: colors.green,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  skeletonOrderHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  skeletonFlex: {
    flex: 1,
    gap: 8,
  },
  skeletonFooterRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  starRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  reviewInput: {
    width: "100%",
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.textPrimary,
    textAlignVertical: "top",
    marginBottom: 24,
    height: 80,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: colors.cream,
  },
  modalBtnCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  modalBtnSubmit: {
    backgroundColor: colors.green,
  },
  modalBtnSubmitText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  headerLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerInfoCol: {
    flex: 1,
    justifyContent: "center",
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.sage,
  },
  thumbnailFallback: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  pipelineContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    marginVertical: 14,
    paddingHorizontal: 10,
  },
  pipelineLineBackground: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: colors.line,
    zIndex: 1,
  },
  pipelineLineActive: {
    position: "absolute",
    left: 20,
    height: 2,
    backgroundColor: colors.green,
    zIndex: 2,
  },
  pipelineStep: {
    alignItems: "center",
    zIndex: 3,
    width: 60,
  },
  pipelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  pipelineDotActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  pipelineDotCurrent: {
    backgroundColor: colors.green,
    borderColor: colors.green,
    transform: [{ scale: 1.1 }],
  },
  pipelineDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  pipelineLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textTertiary,
    marginTop: 4,
    textAlign: "center",
  },
  pipelineLabelActive: {
    color: colors.green,
    fontWeight: "700",
  },
  pipelineLabelCurrent: {
    fontWeight: "900",
    color: colors.textPrimary,
  },
  btnMessage: {
    borderColor: colors.greenMuted,
    flexDirection: "row",
    gap: 4,
  },
});
