import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, ActivityIndicator, ScrollView, Pressable, TextInput, Modal } from "react-native";
import { AdminDashboard } from "../components/AdminDashboard";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SellerDashboard } from "../components/SellerDashboard";
import { useAuth } from "../context/AuthContext";
import { updateProfileAvatar, updateProfile } from "../services/profile";
import { pickImageFromLibrary, uploadPublicImage } from "../services/storage";
import { getUserOrders, updateOrderStatus, type Order, type MarketListing } from "../services/listings";
import { getUserFavorites } from "../services/favorites";
import { createReview, getReviewForOrder } from "../services/reviews";
import { colors } from "../theme/colors";
import { formatCurrency } from "../utils/currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export function ProfileScreen({
  onOpenListingDetail,
}: {
  onOpenListingDetail?: (listingId: string) => void;
}) {
  const { profile, refreshProfile, signOut, user } = useAuth();
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const sellerStatus = profile?.seller_status ?? "not_applied";
  const canSeeSellerDashboard = sellerStatus === "verified";
  const canSeeAdminDashboard = profile?.is_admin === true;

  // Orders states
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Favorites states
  const [savedListings, setSavedListings] = useState<MarketListing[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Edit Profile states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [revieweeId, setRevieweeId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedOrdersMap, setReviewedOrdersMap] = useState<Record<string, boolean>>({});

  async function handleUpdateAvatar() {
    if (!user) return;

    setAvatarError(null);
    setIsUploadingAvatar(true);

    try {
      const pickedPhoto = await pickImageFromLibrary();
      if (!pickedPhoto) return;
      const uploadedPhoto = await uploadPublicImage("avatars", user.id, "profile", pickedPhoto);
      await updateProfileAvatar(user.id, uploadedPhoto.publicUrl);
      await refreshProfile();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update avatar.";
      setAvatarError(message);
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function loadOrders() {
    if (!user) return;
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      const data = await getUserOrders(user.id);
      setOrders(data);
    } catch (orderErr) {
      const message = orderErr instanceof Error ? orderErr.message : "Unable to load orders.";
      setOrdersError(message);
    } finally {
      setIsLoadingOrders(false);
    }
  }

  async function handleUpdateOrderStatus(orderId: string, newStatus: Order["status"]) {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (updateErr) {
      const message = updateErr instanceof Error ? updateErr.message : "Unable to update status.";
      setOrdersError(message);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function loadSavedListings() {
    if (!user) return;
    setIsLoadingSaved(true);
    try {
      const data = await getUserFavorites(user.id);
      setSavedListings(data);
    } catch (err) {
      console.error("Failed to load saved listings", err);
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
    } catch (err) {
      console.error(err);
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
      setReviewedOrdersMap(prev => ({ ...prev, [reviewOrderId]: true }));
      setShowReviewModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  }

  async function checkReviewedOrders(ordersList: Order[]) {
    if (!user) return;
    const reviewedMap: Record<string, boolean> = {};
    for (const order of ordersList) {
      if (order.status === "completed" && order.buyerId === user.id) {
        try {
          const rev = await getReviewForOrder(order.id, user.id);
          if (rev) {
            reviewedMap[order.id] = true;
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
    setReviewedOrdersMap(reviewedMap);
  }

  useEffect(() => {
    loadOrders().then(() => {
      if (user) {
        getUserOrders(user.id).then((ordList) => checkReviewedOrders(ordList));
      }
    });
    loadSavedListings();
  }, [user?.id]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.scrollView}>
        <Text style={styles.title}>Profile</Text>
        
        <Card tint="sage">
          {profile?.avatar_url && <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />}
          <Text style={styles.cardTitle}>{profile?.display_name ?? "GrowMate User"}</Text>
          <Text style={styles.body}>{user?.email}</Text>
          {profile?.username && <Text style={styles.meta}>@{profile.username}</Text>}
          {profile?.bio && <Text style={styles.bioText}>{profile.bio}</Text>}
          {profile?.location && <Text style={styles.meta}>📍 {profile.location}</Text>}
          <Text style={styles.status}>Buyer account</Text>
          <View style={styles.buttonRow}>
            <View style={styles.flexButton}>
              <Button disabled={isUploadingAvatar} variant="secondary" onPress={handleUpdateAvatar}>
                {isUploadingAvatar ? "Uploading..." : "Photo"}
              </Button>
            </View>
            <View style={styles.flexButton}>
              <Button variant="secondary" onPress={handleOpenEditModal}>
                Edit Profile
              </Button>
            </View>
          </View>
          {avatarError && <Text style={styles.error}>{avatarError}</Text>}
        </Card>

        {/* Saved Listings Section */}
        <Card tint="sage">
          <View style={styles.headerRow}>
            <Text style={styles.cardTitle}>Saved Listings</Text>
            <Button variant="secondary" onPress={loadSavedListings}>
              Refresh
            </Button>
          </View>
          {isLoadingSaved ? (
            <ActivityIndicator color={colors.green} style={styles.loader} />
          ) : savedListings.length === 0 ? (
            <Text style={styles.body}>No saved listings yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.savedScroll}>
              {savedListings.map((listing) => (
                <Pressable
                  key={listing.id}
                  onPress={() => onOpenListingDetail && onOpenListingDetail(listing.id)}
                  style={styles.savedItem}
                >
                  {listing.photoUrl ? (
                    <Image source={{ uri: listing.photoUrl }} style={styles.savedImage} />
                  ) : (
                    <View style={styles.savedImageFallback}>
                      <MaterialCommunityIcons name="image-outline" size={24} color={colors.greenMuted} />
                    </View>
                  )}
                  <Text style={styles.savedName} numberOfLines={1}>{listing.name}</Text>
                  <Text style={styles.savedPrice}>{formatCurrency(listing.price)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Card>

        {/* My Orders Section */}
        <Card>
          <View style={styles.headerRow}>
            <Text style={styles.cardTitle}>My Orders</Text>
            <Button variant="secondary" onPress={loadOrders}>
              Refresh
            </Button>
          </View>

          {ordersError && <Text style={styles.error}>{ordersError}</Text>}

          {isLoadingOrders ? (
            <ActivityIndicator color={colors.green} style={styles.loader} />
          ) : orders.length === 0 ? (
            <Text style={styles.body}>No transaction history yet.</Text>
          ) : (
            orders.map((order) => {
              const isBuyer = order.buyerId === user?.id;
              const roleLabel = isBuyer ? "Purchase" : "Sale";
              const partyLabel = isBuyer ? `Seller: ${order.sellerName}` : `Buyer: ${order.buyerName}`;
              const hasReviewed = reviewedOrdersMap[order.id] ?? false;
              
              return (
                <View key={order.id} style={styles.orderItem}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderRole}>{roleLabel}</Text>
                    <Text style={[
                      styles.orderStatus,
                      order.status === "completed" && styles.statusCompleted,
                      order.status === "cancelled" && styles.statusCancelled,
                      order.status === "paid" && styles.statusPaid,
                      order.status === "refunded" && styles.statusRefunded,
                      order.status === "disputed" && styles.statusDisputed,
                    ]}>
                      {order.status}
                    </Text>
                  </View>
                  <Text style={styles.orderTitle}>{order.listingName}</Text>
                  <Text style={styles.orderMeta}>{partyLabel}</Text>
                  <Text style={styles.orderMeta}>Total: {formatCurrency(order.subtotal)} ({order.quantity} unit)</Text>
                  
                  {order.status === "pending" && (
                    <View style={styles.actionRow}>
                      {isBuyer ? (
                        <View style={styles.flexButton}>
                          <Button disabled={updatingOrderId === order.id} onPress={() => handleUpdateOrderStatus(order.id, "paid")}>
                            Pay Now
                          </Button>
                        </View>
                      ) : null}
                      <View style={styles.flexButton}>
                        <Button disabled={updatingOrderId === order.id} variant="secondary" onPress={() => handleUpdateOrderStatus(order.id, "cancelled")}>
                          Cancel Order
                        </Button>
                      </View>
                    </View>
                  )}

                  {order.status === "paid" && (
                    <View style={styles.actionRow}>
                      {!isBuyer && (
                        <View style={styles.flexButton}>
                          <Button disabled={updatingOrderId === order.id} onPress={() => handleUpdateOrderStatus(order.id, "completed")}>
                            Complete Sale
                          </Button>
                        </View>
                      )}
                      {isBuyer ? (
                        <View style={styles.flexButton}>
                          <Button disabled={updatingOrderId === order.id} variant="secondary" onPress={() => handleUpdateOrderStatus(order.id, "disputed")}>
                            Dispute Order
                          </Button>
                        </View>
                      ) : (
                        <View style={styles.flexButton}>
                          <Button disabled={updatingOrderId === order.id} variant="secondary" onPress={() => handleUpdateOrderStatus(order.id, "refunded")}>
                            Refund & Cancel
                          </Button>
                        </View>
                      )}
                    </View>
                  )}

                  {order.status === "completed" && (
                    <View style={styles.actionRow}>
                      {isBuyer && !hasReviewed && (
                        <View style={styles.flexButton}>
                          <Button onPress={() => handleOpenReviewModal(order.id, order.sellerId)}>
                            Leave Review
                          </Button>
                        </View>
                      )}
                      {isBuyer && (
                        <View style={styles.flexButton}>
                          <Button disabled={updatingOrderId === order.id} variant="secondary" onPress={() => handleUpdateOrderStatus(order.id, "disputed")}>
                            Dispute Order
                          </Button>
                        </View>
                      )}
                    </View>
                  )}

                  {order.status === "disputed" && (
                    <View style={styles.actionRow}>
                      {!isBuyer ? (
                        <>
                          <View style={styles.flexButton}>
                            <Button disabled={updatingOrderId === order.id} onPress={() => handleUpdateOrderStatus(order.id, "refunded")}>
                              Issue Refund
                            </Button>
                          </View>
                          <View style={styles.flexButton}>
                            <Button disabled={updatingOrderId === order.id} variant="secondary" onPress={() => handleUpdateOrderStatus(order.id, "completed")}>
                              Resolve Completed
                            </Button>
                          </View>
                        </>
                      ) : (
                        <Text style={{ color: "#9f2d20", fontSize: 12, fontWeight: "800", marginTop: 4 }}>
                          Under dispute. Support team is reviewing.
                        </Text>
                      )}
                      {canSeeAdminDashboard && (
                        <>
                          <View style={styles.flexButton}>
                            <Button disabled={updatingOrderId === order.id} onPress={() => handleUpdateOrderStatus(order.id, "completed")}>
                              Admin: Complete
                            </Button>
                          </View>
                          <View style={styles.flexButton}>
                            <Button disabled={updatingOrderId === order.id} variant="secondary" onPress={() => handleUpdateOrderStatus(order.id, "refunded")}>
                              Admin: Refund
                            </Button>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </Card>

        <Card>
          <Text style={styles.emptyTitle}>Seller access</Text>
          <Text style={styles.body}>
            {canSeeSellerDashboard
              ? "Your seller dashboard is unlocked."
              : "Seller dashboard appears only after seller verification. This keeps GrowMate buyer-first and safer."}
          </Text>
          <Text style={styles.status}>Status: {sellerStatus.replace("_", " ")}</Text>
        </Card>

        {canSeeAdminDashboard && <AdminDashboard />}
        {canSeeSellerDashboard && <SellerDashboard />}

        <View style={styles.buttonGap}>
          <Button variant="secondary" onPress={signOut}>
            Sign out
          </Button>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <Text style={styles.modalLabel}>Display Name</Text>
            <TextInput
              style={styles.modalInputSingle}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Display Name"
              placeholderTextColor="#8a9583"
            />

            <Text style={styles.modalLabel}>Username</Text>
            <TextInput
              style={styles.modalInputSingle}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="Username"
              placeholderTextColor="#8a9583"
            />

            <Text style={styles.modalLabel}>Location</Text>
            <TextInput
              style={styles.modalInputSingle}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="Location"
              placeholderTextColor="#8a9583"
            />

            <Text style={styles.modalLabel}>Bio</Text>
            <TextInput
              style={styles.modalInputMultiline}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell other plant lovers about yourself..."
              placeholderTextColor="#8a9583"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <View style={styles.flexButton}>
                <Button disabled={isSavingProfile || !editDisplayName.trim()} onPress={handleSaveProfile}>
                  {isSavingProfile ? "Saving..." : "Save"}
                </Button>
              </View>
              <View style={styles.flexButton}>
                <Button variant="secondary" onPress={() => setShowEditModal(false)}>
                  Cancel
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Seller</Text>
            
            <Text style={styles.modalLabel}>Select Rating:</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setReviewRating(star)} style={styles.starPress}>
                  <MaterialCommunityIcons
                    name={reviewRating >= star ? "star" : "star-outline"}
                    size={32}
                    color="#d4a373"
                  />
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.modalInputMultiline}
              placeholder="Write a comment about your experience..."
              placeholderTextColor="#8a9583"
              multiline
              numberOfLines={4}
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={styles.modalActions}>
              <View style={styles.flexButton}>
                <Button disabled={isSubmittingReview} onPress={handleSubmitReview}>
                  {isSubmittingReview ? "Submitting..." : "Submit"}
                </Button>
              </View>
              <View style={styles.flexButton}>
                <Button variant="secondary" onPress={() => setShowReviewModal(false)}>
                  Cancel
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  title: {
    color: colors.green,
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 10,
  },
  cardTitle: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "900",
  },
  avatar: {
    backgroundColor: colors.white,
    borderRadius: 34,
    height: 68,
    marginBottom: 14,
    width: 68,
  },
  body: {
    marginTop: 8,
    color: colors.greenMuted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
  },
  emptyTitle: {
    color: colors.green,
    fontSize: 17,
    fontWeight: "900",
  },
  status: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderRadius: 999,
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: "capitalize",
  },
  error: {
    color: "#9f2d20",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 12,
  },
  buttonGap: {
    marginTop: 16,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  loader: {
    marginVertical: 14,
  },
  orderItem: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  orderHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderRole: {
    backgroundColor: colors.sage,
    borderRadius: 8,
    color: colors.green,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  orderStatus: {
    color: "#8a5a00",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusCompleted: {
    color: colors.green,
  },
  statusCancelled: {
    color: "#9f2d20",
  },
  statusPaid: {
    color: "#1e3a8a",
  },
  statusRefunded: {
    color: "#6b7280",
  },
  statusDisputed: {
    color: "#b91c1c",
  },
  orderTitle: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
  },
  orderMeta: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  flexButton: {
    flex: 1,
  },
  meta: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  bioText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  savedScroll: {
    marginTop: 10,
    flexDirection: "row",
  },
  savedItem: {
    width: 90,
    marginRight: 12,
  },
  savedImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: colors.sage,
  },
  savedImageFallback: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  savedName: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 6,
  },
  savedPrice: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cream,
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.green,
    marginBottom: 16,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.greenMuted,
    marginTop: 10,
    marginBottom: 6,
  },
  modalInputSingle: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalInputMultiline: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    padding: 12,
    height: 100,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  ratingStars: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginVertical: 12,
  },
  starPress: {
    padding: 4,
  },
});
