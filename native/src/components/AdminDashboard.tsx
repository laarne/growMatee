import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, Image, Pressable } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { useAuth } from "../context/AuthContext";
import {
  approveListingReview,
  approveSellerApplication,
  getPendingListingReviews,
  getPendingSellerApplications,
  rejectListingReview,
  rejectSellerApplication,
  type PendingListingReview,
  type PendingSellerApplication,
} from "../services/admin";
import { getReportsForAdmin, updateReportStatus, type Report } from "../services/reports";
import { colors, radius, shadow } from "../theme/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ImageZoomModal } from "./ImageZoomModal";

type ActionKind = "seller" | "listing";
type TabType = "sellers" | "listings" | "reports";

export function AdminDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<PendingSellerApplication[]>([]);
  const [listings, setListings] = useState<PendingListingReview[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("sellers");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  async function loadReviews() {
    setIsLoading(true);
    setError(null);

    try {
      const [nextApplications, nextListings, nextReports] = await Promise.all([
        getPendingSellerApplications(),
        getPendingListingReviews(),
        getReportsForAdmin(),
      ]);
      setApplications(nextApplications);
      setListings(nextListings);
      setReports(nextReports.filter((r) => r.status === "open"));
    } catch (loadError) {
      const nextMessage = loadError instanceof Error ? loadError.message : "Unable to load admin reviews.";
      setError(nextMessage);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function runAction(id: string, label: string, action: () => Promise<void>) {
    setActionId(id);
    setMessage(null);
    setError(null);

    try {
      await action();
      setMessage(label);
      await loadReviews();
    } catch (actionError) {
      const nextMessage = actionError instanceof Error ? actionError.message : "Admin action failed.";
      setError(nextMessage);
    } finally {
      setActionId(null);
    }
  }

  async function handleResolveReport(reportId: string, resolution: "resolved" | "dismissed") {
    setActionId(reportId);
    setMessage(null);
    setError(null);
    try {
      await updateReportStatus(reportId, resolution);
      setMessage(`Report ${resolution}.`);
      await loadReviews();
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : "Failed to update report status.";
      setError(nextMessage);
    } finally {
      setActionId(null);
    }
  }

  function renderActionButtons(kind: ActionKind, id: string, approve: () => Promise<void>, reject: () => Promise<void>) {
    return (
      <View style={styles.buttonRow}>
        <View style={styles.flexButton}>
          <Button
            disabled={actionId === id}
            icon="check"
            onPress={() => runAction(id, `${kind === "seller" ? "Seller" : "Listing"} approved.`, approve)}
          >
            Approve
          </Button>
        </View>
        <View style={styles.flexButton}>
          <Button
            disabled={actionId === id}
            variant="danger"
            icon="close"
            onPress={() => runAction(id, `${kind === "seller" ? "Seller" : "Listing"} rejected.`, reject)}
          >
            Reject
          </Button>
        </View>
      </View>
    );
  }

  return (
    <Card tint="flat" noPadding>
      {/* Header Panel */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTitleGroup}>
            <MaterialCommunityIcons name="shield-check" size={24} color={colors.green} />
            <Text style={styles.title}>Admin Control Center</Text>
          </View>
          <Pressable
            onPress={loadReviews}
            disabled={isLoading}
            style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={colors.greenMid} />
            <Text style={styles.refreshBtnText}>Sync</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitleText}>Manage seller applications, listings queue, and user reports.</Text>
      </View>

      {/* Summary Interactive Widgets (Tab Navigation) */}
      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab("sellers")}
          style={[styles.tabCard, activeTab === "sellers" && styles.tabCardActive]}
        >
          <View style={styles.tabCardTop}>
            <MaterialCommunityIcons
              name="account-multiple-outline"
              size={18}
              color={activeTab === "sellers" ? colors.green : colors.greenMuted}
            />
            <View style={[styles.badge, activeTab === "sellers" ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, activeTab === "sellers" ? styles.badgeTextActive : styles.badgeTextInactive]}>
                {applications.length}
              </Text>
            </View>
          </View>
          <Text style={[styles.tabLabel, activeTab === "sellers" && styles.tabLabelActive]}>Sellers</Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("listings")}
          style={[styles.tabCard, activeTab === "listings" && styles.tabCardActive]}
        >
          <View style={styles.tabCardTop}>
            <MaterialCommunityIcons
              name="storefront-outline"
              size={18}
              color={activeTab === "listings" ? colors.green : colors.greenMuted}
            />
            <View style={[styles.badge, activeTab === "listings" ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, activeTab === "listings" ? styles.badgeTextActive : styles.badgeTextInactive]}>
                {listings.length}
              </Text>
            </View>
          </View>
          <Text style={[styles.tabLabel, activeTab === "listings" && styles.tabLabelActive]}>Listings</Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("reports")}
          style={[styles.tabCard, activeTab === "reports" && styles.tabCardActive]}
        >
          <View style={styles.tabCardTop}>
            <MaterialCommunityIcons
              name="alert-octagon-outline"
              size={18}
              color={activeTab === "reports" ? colors.green : colors.greenMuted}
            />
            <View style={[styles.badge, activeTab === "reports" ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, activeTab === "reports" ? styles.badgeTextActive : styles.badgeTextInactive]}>
                {reports.length}
              </Text>
            </View>
          </View>
          <Text style={[styles.tabLabel, activeTab === "reports" && styles.tabLabelActive]}>Reports</Text>
        </Pressable>
      </View>

      {/* Alerts & Loaders */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.green} size="small" />
          <Text style={styles.loadingText}>Syncing records...</Text>
        </View>
      )}

      {message && (
        <View style={styles.successAlert}>
          <MaterialCommunityIcons name="check-circle" size={16} color={colors.successText} />
          <Text style={styles.successAlertText}>{message}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorAlert}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={colors.errorText} />
          <Text style={styles.errorAlertText}>{error}</Text>
        </View>
      )}

      {/* Active Tab View */}
      <View style={styles.listContainer}>
        {/* SELLERS TAB */}
        {activeTab === "sellers" && (
          <>
            {!isLoading && applications.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIconContainer}>
                  <MaterialCommunityIcons name="badge-account-outline" size={32} color={colors.greenMuted} />
                </View>
                <Text style={styles.emptyStateTitle}>All Clean</Text>
                <Text style={styles.emptyStateDescription}>No pending seller verification requests.</Text>
              </View>
            ) : (
              applications.map((application) => (
                <View key={application.id} style={styles.reviewCard}>
                  {/* Shop Details */}
                  <View style={styles.cardHeader}>
                    <View style={styles.shopIconContainer}>
                      <MaterialCommunityIcons name="store" size={20} color={colors.green} />
                    </View>
                    <View style={styles.shopInfo}>
                      <Text style={styles.shopNameText}>{application.shopName ?? "Unnamed Shop"}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.applicantText}>{application.applicantName}</Text>
                        {application.applicantLocation && (
                          <View style={styles.locationTag}>
                            <MaterialCommunityIcons name="map-marker" size={10} color={colors.greenMuted} />
                            <Text style={styles.locationText}>{application.applicantLocation}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Submission Reason */}
                  {application.reason && (
                    <View style={styles.reasonContainer}>
                      <Text style={styles.reasonLabel}>Shop Bio & Purpose</Text>
                      <Text style={styles.reasonText}>"{application.reason}"</Text>
                    </View>
                  )}

                  {/* Verification Document Image Grid */}
                  <Text style={styles.sectionLabel}>Verification Credentials</Text>
                  <View style={styles.proofGrid}>
                    {[
                      ["ID Front", application.idFrontUrl || application.proofPhotoUrl],
                      ["ID Back", application.idBackUrl],
                      ["Selfie with ID", application.selfieWithIdUrl],
                      ["Selfie with Plant", application.selfieWithPlantUrl],
                    ].map(([label, url]) => {
                      const hasImage = !!url;
                      return (
                        <View key={label} style={styles.proofBox}>
                          <Text style={styles.proofBoxLabel}>{label}</Text>
                          {hasImage ? (
                            <Pressable
                              onPress={() => setSelectedImage(url)}
                              style={({ pressed }) => [styles.thumbnailPressable, pressed && styles.thumbnailPressed]}
                            >
                              <Image source={{ uri: url }} style={styles.thumbnailImage} />
                              <View style={styles.zoomOverlay}>
                                <MaterialCommunityIcons name="magnify-plus" size={16} color={colors.white} />
                              </View>
                            </Pressable>
                          ) : (
                            <View style={styles.missingBox}>
                              <MaterialCommunityIcons name="image-off-outline" size={18} color="#9a3412" />
                              <Text style={styles.missingText}>Missing</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Action Buttons */}
                  {user &&
                    renderActionButtons(
                      "seller",
                      application.id,
                      () => approveSellerApplication(application, user.id),
                      () => rejectSellerApplication(application, user.id),
                    )}
                </View>
              ))
            )}
          </>
        )}

        {/* LISTINGS TAB */}
        {activeTab === "listings" && (
          <>
            {!isLoading && listings.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIconContainer}>
                  <MaterialCommunityIcons name="storefront-outline" size={32} color={colors.greenMuted} />
                </View>
                <Text style={styles.emptyStateTitle}>Queue Empty</Text>
                <Text style={styles.emptyStateDescription}>No products are currently waiting for admin listing review.</Text>
              </View>
            ) : (
              listings.map((listing) => (
                <View key={listing.id} style={styles.reviewCard}>
                  {/* Header info */}
                  <View style={styles.cardHeader}>
                    <View style={styles.shopIconContainer}>
                      <MaterialCommunityIcons name="sprout" size={20} color={colors.green} />
                    </View>
                    <View style={styles.shopInfo}>
                      <View style={styles.titlePriceRow}>
                        <Text style={styles.shopNameText}>{listing.name}</Text>
                        <View style={styles.pricePill}>
                          <Text style={styles.pricePillText}>PHP {listing.price.toLocaleString("en-PH")}</Text>
                        </View>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.applicantText}>Seller: {listing.sellerName}</Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Text style={styles.applicantText}>
                          {listing.quantity} {listing.unit}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Tags Group */}
                  <View style={styles.listingTagsRow}>
                    <View style={styles.tagChip}>
                      <MaterialCommunityIcons name="tag-outline" size={11} color={colors.greenMid} />
                      <Text style={styles.tagChipText}>{listing.category}</Text>
                    </View>
                    <View style={styles.tagChip}>
                      <MaterialCommunityIcons name="map-marker-outline" size={11} color={colors.greenMid} />
                      <Text style={styles.tagChipText}>{listing.location}</Text>
                    </View>
                  </View>

                  {/* Product Details */}
                  {listing.description && (
                    <View style={styles.reasonContainer}>
                      <Text style={styles.reasonLabel}>Item Description</Text>
                      <Text style={styles.reasonText}>{listing.description}</Text>
                    </View>
                  )}

                  {/* AI Confidence Banner if available */}
                  {listing.aiConfidence !== null && (
                    <View
                      style={[
                        styles.aiBanner,
                        listing.aiConfidence >= 0.8 ? styles.aiBannerSuccess : styles.aiBannerWarning,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={listing.aiConfidence >= 0.8 ? "robot-happy-outline" : "robot-confused-outline"}
                        size={15}
                        color={listing.aiConfidence >= 0.8 ? colors.successText : colors.warningText}
                      />
                      <Text
                        style={[
                          styles.aiBannerText,
                          listing.aiConfidence >= 0.8 ? styles.aiBannerTextSuccess : styles.aiBannerTextWarning,
                        ]}
                      >
                        GrowMate AI Confidence: {(listing.aiConfidence * 100).toFixed(0)}% accuracy check
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  {renderActionButtons(
                    "listing",
                    listing.id,
                    () => approveListingReview(listing.id),
                    () => rejectListingReview(listing.id),
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <>
            {!isLoading && reports.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIconContainer}>
                  <MaterialCommunityIcons name="flag-checkered" size={32} color={colors.greenMuted} />
                </View>
                <Text style={styles.emptyStateTitle}>Safe & Sound</Text>
                <Text style={styles.emptyStateDescription}>No open flags or reported items in the community.</Text>
              </View>
            ) : (
              reports.map((report) => (
                <View key={report.id} style={styles.reviewCard}>
                  {/* Reported Target Info */}
                  <View style={styles.cardHeader}>
                    <View style={styles.reportIconContainer}>
                      <MaterialCommunityIcons name="alert-octagon" size={20} color={colors.errorText} />
                    </View>
                    <View style={styles.shopInfo}>
                      <Text style={styles.reportTargetText}>{report.reportedTargetName}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.reporterText}>Reporter: {report.reporterName}</Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Text style={styles.reportReasonTag}>Reason: {report.reason}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Details Description */}
                  {report.details && (
                    <View style={styles.reasonContainer}>
                      <Text style={styles.reasonLabel}>Report Details</Text>
                      <Text style={styles.reasonText}>{report.details}</Text>
                    </View>
                  )}

                  {/* Resolution Buttons */}
                  <View style={styles.buttonRow}>
                    <View style={styles.flexButton}>
                      <Button
                        disabled={actionId === report.id}
                        icon="check"
                        onPress={() => handleResolveReport(report.id, "resolved")}
                      >
                        Resolve
                      </Button>
                    </View>
                    <View style={styles.flexButton}>
                      <Button
                        disabled={actionId === report.id}
                        variant="secondary"
                        icon="close"
                        onPress={() => handleResolveReport(report.id, "dismissed")}
                      >
                        Dismiss
                      </Button>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </View>

      {/* Photo Viewer Modal */}
      {selectedImage && <ImageZoomModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "900",
  },
  subtitleText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  refreshBtnPressed: {
    opacity: 0.8,
  },
  refreshBtnText: {
    color: colors.greenMid,
    fontSize: 12,
    fontWeight: "800",
  },

  // Tabs style
  tabContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tabCard: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  tabCardActive: {
    backgroundColor: colors.white,
    borderColor: colors.green,
    borderWidth: 1.5,
    ...shadow.sm,
  },
  tabCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 20,
  },
  badgeActive: {
    backgroundColor: colors.green,
  },
  badgeInactive: {
    backgroundColor: colors.lineMid,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  badgeTextActive: {
    color: colors.white,
  },
  badgeTextInactive: {
    color: colors.green,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.greenMuted,
  },
  tabLabelActive: {
    color: colors.green,
    fontWeight: "900",
  },

  // Loader & Alert Styles
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.greenMid,
  },
  successAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.success,
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 12,
  },
  successAlertText: {
    color: colors.successText,
    fontSize: 13,
    fontWeight: "700",
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.error,
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 12,
  },
  errorAlertText: {
    color: colors.errorText,
    fontSize: 13,
    fontWeight: "700",
  },

  listContainer: {
    marginTop: 4,
  },

  // Review card
  reviewCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  shopIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  reportIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  shopInfo: {
    flex: 1,
  },
  shopNameText: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.green,
  },
  titlePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricePill: {
    backgroundColor: colors.surface1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.lineMid,
  },
  pricePillText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  applicantText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.greenMuted,
  },
  metaDot: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.greenMuted,
  },
  locationTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surface1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  locationText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.greenMuted,
  },

  reasonContainer: {
    backgroundColor: colors.surface1,
    padding: 10,
    borderRadius: radius.sm,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.greenMid,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.greenMuted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.green,
    lineHeight: 18,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.greenMuted,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 6,
  },

  // Proof Grid
  proofGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  proofBox: {
    width: "48%", // 2 columns layout
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 8,
    minHeight: 110,
    justifyContent: "space-between",
  },
  proofBoxLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.greenMuted,
    marginBottom: 6,
  },
  thumbnailPressable: {
    borderRadius: radius.xs,
    overflow: "hidden",
    height: 70,
    width: "100%",
    backgroundColor: colors.line,
    borderWidth: 1,
    borderColor: colors.lineMid,
  },
  thumbnailPressed: {
    opacity: 0.9,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  zoomOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 4,
    borderRadius: 999,
  },
  missingBox: {
    height: 70,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  missingText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#9a3412",
  },

  // Listing category/location tags
  listingTagsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.greenMid,
  },

  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: radius.sm,
    marginTop: 10,
    borderWidth: 1,
  },
  aiBannerSuccess: {
    backgroundColor: colors.success,
    borderColor: "#bbf7d0",
  },
  aiBannerWarning: {
    backgroundColor: colors.warning,
    borderColor: "#fed7aa",
  },
  aiBannerText: {
    fontSize: 11,
    fontWeight: "800",
  },
  aiBannerTextSuccess: {
    color: colors.successText,
  },
  aiBannerTextWarning: {
    color: colors.warningText,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  flexButton: {
    flex: 1,
  },

  // Reports specific elements
  reportTargetText: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.errorText,
  },
  reporterText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.greenMuted,
  },
  reportReasonTag: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.errorText,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },

  // Empty state styling
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyStateIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.green,
    marginBottom: 4,
  },
  emptyStateDescription: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.greenMuted,
    textAlign: "center",
  },
});
