import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View, Pressable, Platform, ScrollView, type TextInputProps, type StyleProp, type TextStyle } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { useAuth } from "../context/AuthContext";
import {
  createListingForReview,
  deleteListing,
  getSellerListings,
  getUserOrders,
  submitListingPermitDocument,
  updateListing,
  updateOrderStatus,
  type ListingInput,
  type Order,
  type SellerListing,
} from "../services/listings";
import { scanPlantWithLeafy, type LeafyScanResult } from "../services/leafyScan";
import {
  pickImageFromLibrary,
  pickPermitDocument,
  uploadPrivateDocument,
  uploadPublicImage,
  type PickedDocument,
  type PickedImage,
} from "../services/storage";
import { colors } from "../theme/colors";
import { getSellerStats, type SellerStats } from "../services/profile";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatCurrency } from "../utils/currency";
import { getSellerRegulationCategory } from "../utils/regulation";
import { SkeletonBlock, SkeletonCard, SkeletonLine } from "./Skeleton";

const units: ListingInput["unit"][] = ["Pot", "Cutting", "Seedling", "Node", "Pack"];
const DELIVERY_ONLY = "Delivery";
const listingStatusFilters = ["all", "active", "review", "needs_more_documents", "archived"] as const;
type ListingStatusFilter = (typeof listingStatusFilters)[number];
type SellerTab = "dashboard" | "new" | "inventory" | "orders";
type SellerDashboardMode = "hub" | "create";

function getOrderStatusMeta(order: Order) {
  const createdTime = new Date(order.createdAt).getTime();
  const isReadyStale = order.status === "paid" && Number.isFinite(createdTime) && Date.now() - createdTime > 24 * 60 * 60 * 1000;

  switch (order.status) {
    case "pending":
      return { label: "Awaiting Payment", color: "#78350f", bg: "#fde68a", icon: "clock-alert-outline" as const, urgent: false };
    case "accepted":
      return { label: "Accepted", color: "#064e3b", bg: "#a7f3d0", icon: "check-circle-outline" as const, urgent: false };
    case "paid":
      return { label: "Ready", color: "#075985", bg: "#bae6fd", icon: "package-variant" as const, urgent: isReadyStale };
    case "completed":
      return { label: "Completed", color: "#052e16", bg: "#bbf7d0", icon: "check-all" as const, urgent: false };
    case "cancelled":
      return { label: "Cancelled", color: "#b91c1c", bg: "#fee2e2", icon: "close-circle-outline" as const, urgent: false };
    case "refunded":
      return { label: "Refunded", color: "#6b21a8", bg: "#f3e8ff", icon: "cash-refund" as const, urgent: false };
    case "disputed":
      return { label: "Disputed", color: "#be123c", bg: "#ffe4e6", icon: "alert-circle-outline" as const, urgent: true };
    default:
      return { label: order.status, color: colors.greenMuted, bg: colors.surface1, icon: "information-outline" as const, urgent: false };
  }
}

export function SellerDashboard({
  mode = "hub",
  onCloseCreateListing,
  onOpenCreateListing,
}: {
  mode?: SellerDashboardMode;
  onCloseCreateListing?: () => void;
  onOpenCreateListing?: () => void;
} = {}) {
  const { profile, user } = useAuth();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [salesOrders, setSalesOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [localName, setLocalName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitIndex, setUnitIndex] = useState(0);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [permitDocument, setPermitDocument] = useState<PickedDocument | null>(null);
  const [scanResult, setScanResult] = useState<LeafyScanResult | null>(null);
  const [location, setLocation] = useState("");
  const [deliveryOption] = useState(DELIVERY_ONLY);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [listingSearch, setListingSearch] = useState("");
  const [listingStatusFilter, setListingStatusFilter] = useState<ListingStatusFilter>("all");
  const [updatingListingId, setUpdatingListingId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showAllListings, setShowAllListings] = useState(false);
  const [activeTab, setActiveTab] = useState<SellerTab>(mode === "create" ? "new" : "dashboard");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showScanDetails, setShowScanDetails] = useState(false);
  const sellerRegulation = getSellerRegulationCategory(scanResult?.regulationStatus ?? (scanResult?.saleStatus === "safe_to_sell" ? "safe_to_sell" : null));
  const hasSuccessfulScan = Boolean(scanResult);
  const canPublishImmediately = hasSuccessfulScan && sellerRegulation.shouldPublish;
  const requiresPermit = scanResult?.regulationStatus === "needs_permit";
  const allowsSupportDocument = scanResult?.regulationStatus === "needs_permit" || scanResult?.regulationStatus === "needs_review";
  const isIllegalListing = sellerRegulation.category === "blocked" || scanResult?.saleStatus === "blocked";

  const filteredListings = useMemo(() => {
    const searchTerm = listingSearch.trim().toLowerCase();

    return listings.filter((listing) => {
      const matchesStatus = listingStatusFilter === "all" || listing.status === listingStatusFilter;
      const matchesSearch =
        !searchTerm ||
        listing.name.toLowerCase().includes(searchTerm) ||
        listing.category.toLowerCase().includes(searchTerm) ||
        listing.location.toLowerCase().includes(searchTerm);

      return matchesStatus && matchesSearch;
    });
  }, [listingSearch, listingStatusFilter, listings]);

  const displayedListings = useMemo(() => {
    return showAllListings ? filteredListings : filteredListings.slice(0, 3);
  }, [showAllListings, filteredListings]);

  useEffect(() => {
    if (profile?.location) {
      setLocation(profile.location);
    }
  }, [profile?.location]);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSellerListings(user.id);
      setListings(data);
      const statsData = await getSellerStats(user.id);
      setStats(statsData);
      
      const allOrders = await getUserOrders(user.id);
      const incoming = allOrders.filter((o) => o.sellerId === user.id);
      setSalesOrders(incoming);
    } catch (loadError) {
      const nextMessage = loadError instanceof Error ? loadError.message : "Unable to load dashboard data.";
      setError(nextMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboardData().catch(() => {});
  }, [loadDashboardData]);

  /** Run the Leafy AI scan and populate form fields automatically */
  async function runLeafyScan(pickedPhoto: PickedImage) {
    setIsScanning(true);
    setMessage(null);
    setError(null);

    try {
      const result = await scanPlantWithLeafy(pickedPhoto);
      const nextSellerRegulation = getSellerRegulationCategory(result.regulationStatus ?? (result.saleStatus === "safe_to_sell" ? "safe_to_sell" : null));
      setScanResult(result);
      setShowScanDetails(false);
      // Auto-fill fields — only overwrite if the field is currently empty
      setName((current) => current.trim() || result.bestMatch);
      setScientificName((current) => current.trim() || result.scientificName || "");
      setCategory((current) => current.trim() || result.category);
      // Build a helpful auto-description
      const confidence = `Leafy AI identified this as ${result.bestMatch} (${result.confidence}% confidence).`;
      setDescription((current) => current.trim() || `${confidence} ${nextSellerRegulation.message}`);
      setMessage(
        nextSellerRegulation.category === "safe"
          ? "Leafy scan complete. Fields filled automatically."
          : nextSellerRegulation.category === "requires_review"
          ? "Leafy scan complete. This listing requires admin review."
          : "Leafy scan complete. This plant cannot be listed."
      );
    } catch (scanError) {
      const nextMessage = scanError instanceof Error ? scanError.message : "Leafy scan failed.";
      setError(nextMessage);
    } finally {
      setIsScanning(false);
    }
  }

  async function handlePickPhoto() {
    setError(null);
    try {
      const pickedPhoto = await pickImageFromLibrary();
      if (pickedPhoto) {
        // Reset previous scan state when a new photo is chosen
        setScanResult(null);
        setShowScanDetails(false);
        setPermitDocument(null);
        setMessage(null);
        setPhoto(pickedPhoto);
        // 🔑 Automatically scan after upload
        await runLeafyScan(pickedPhoto);
      }
    } catch (photoError) {
      const nextMessage = photoError instanceof Error ? photoError.message : "Unable to choose listing photo.";
      setError(nextMessage);
    }
  }

  /** Manual re-scan trigger (still shown so user can rescan if needed) */
  async function handleScanPhoto() {
    if (!photo) {
      setError("Add a listing photo before scanning.");
      return;
    }
    await runLeafyScan(photo);
  }

  async function handlePickPermitDocument() {
    setError(null);

    try {
      const pickedDocument = await pickPermitDocument();
      if (pickedDocument) {
        setPermitDocument(pickedDocument);
        setMessage("Supporting document attached. Submit the listing for admin review when ready.");
      }
    } catch (documentError) {
      const nextMessage = documentError instanceof Error ? documentError.message : "Unable to choose permit document.";
      setError(nextMessage);
    }
  }

  async function handleCreateListing() {
    if (!user) return;

    const parsedPrice = Number(price);
    const parsedQuantity = Number(quantity);

    if (!photo) {
      setError("At least 1 photo is required to publish a plant listing.");
      return;
    }

    if (!name.trim() || !category.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Add a plant name, category, valid price, and valid quantity.");
      return;
    }

    if (isIllegalListing) {
      setError(sellerRegulation.message);
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const uploadedPhoto = photo ? await uploadPublicImage("listing-photos", user.id, "listings", photo) : null;
      const uploadedPermit = permitDocument
        ? await uploadPrivateDocument("regulated-plant-permits", user.id, "permits", permitDocument)
        : null;

      await createListingForReview({
        sellerId: user.id,
        name: name.trim(),
        localName: localName.trim(),
        scientificName: scientificName.trim(),
        category: category.trim(),
        price: parsedPrice,
        quantity: parsedQuantity,
        unit: units[unitIndex],
        location: location.trim() || profile?.location || "Butuan City",
        deliveryOption: DELIVERY_ONLY,
        description: description.trim(),
        photoPath: uploadedPhoto?.path,
        aiProvider: scanResult?.provider ?? null,
        aiConfidence: scanResult?.confidence ?? null,
        aiResult: scanResult ?? null,
        permitDocumentPath: uploadedPermit?.path,
        initialStatus: canPublishImmediately ? "active" : "review",
      });

      setMessage(
        canPublishImmediately
          ? "Listing is live in the marketplace."
          : sellerRegulation.category === "requires_review"
          ? "Listing submitted for admin review."
          : "Listing submitted for admin review before going live.",
      );
      setName("");
      setLocalName("");
      setScientificName("");
      setCategory("");
      setPrice("");
      setQuantity("1");
      setUnitIndex(0);
      setDescription("");
      setPhoto(null);
      setPermitDocument(null);
      setScanResult(null);
      setShowScanDetails(false);
      await loadDashboardData();
      if (mode === "create") {
        onCloseCreateListing?.();
      } else {
        setActiveTab("inventory");
      }
    } catch (saveError) {
      const nextMessage = saveError instanceof Error ? saveError.message : "Unable to create listing.";
      setError(nextMessage);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteListing(listingId: string) {
    try {
      await deleteListing(listingId);
      setMessage("Listing archived.");
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive listing.");
    }
  }

  async function handleAdjustListingStock(listing: SellerListing, delta: number) {
    const nextQuantity = Math.max(1, listing.quantity + delta);
    setUpdatingListingId(listing.id);
    setError(null);
    setMessage(null);
    try {
      await updateListing(listing.id, { quantity: nextQuantity });
      setListings((current) =>
        current.map((item) => (item.id === listing.id ? { ...item, quantity: nextQuantity } : item)),
      );
      setMessage(`${listing.name} stock updated to ${nextQuantity}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update listing stock.");
    } finally {
      setUpdatingListingId(null);
    }
  }

  async function handleUploadPermitForExistingListing(listing: SellerListing) {
    if (!user) return;

    setUpdatingListingId(listing.id);
    setError(null);
    setMessage(null);

    try {
      const pickedDocument = await pickPermitDocument();
      if (!pickedDocument) {
        return;
      }

      const uploadedPermit = await uploadPrivateDocument("regulated-plant-permits", user.id, "permits", pickedDocument);
      await submitListingPermitDocument(listing.id, user.id, uploadedPermit.path);
      setMessage(`${listing.name} permit document submitted for review.`);
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit permit document.");
    } finally {
      setUpdatingListingId(null);
    }
  }

  function getListingStatusStyle(status: string) {
    switch (status) {
      case "active":
        return { bg: "#dcfce7", text: "#166534", icon: "store-check-outline" as const, label: "Live" };
      case "review":
        return { bg: "#fff7ed", text: "#9a3412", icon: "clipboard-search-outline" as const, label: "Review" };
      case "needs_more_documents":
        return { bg: "#fef3c7", text: "#92400e", icon: "file-alert-outline" as const, label: "More docs" };
      case "archived":
        return { bg: "#f3f4f6", text: "#4b5563", icon: "archive-outline" as const, label: "Archived" };
      default:
        return { bg: "#eef2ff", text: "#3730a3", icon: "pencil-outline" as const, label: status };
    }
  }

  async function handleUpdateSalesOrderStatus(orderId: string, nextStatus: Order["status"]) {
    const previousOrders = salesOrders;
    setUpdatingOrderId(orderId);
    setError(null);
    setMessage(null);
    setSalesOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order)),
    );
    try {
      await updateOrderStatus(orderId, nextStatus);
      const updatedOrder = previousOrders.find((order) => order.id === orderId);
      setMessage(updatedOrder ? `Order status updated to ${getOrderStatusMeta({ ...updatedOrder, status: nextStatus }).label}.` : "Order status updated.");
    } catch (err) {
      setSalesOrders(previousOrders);
      setError(err instanceof Error ? err.message : "Failed to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <View style={styles.dashboardContainer}>
      {mode === "hub" && (
      <Card>
        <Text style={styles.title}>Seller Management Hub</Text>
        <Text style={styles.body}>Track performance, create listings, manage inventory, and process buyer orders.</Text>

        {stats && activeTab === "dashboard" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsCarousel}
          >
            <View style={styles.statsCardCol}>
              <View style={styles.statsIconWrap}>
                <MaterialCommunityIcons name="currency-php" size={18} color={colors.green} />
              </View>
              <Text style={styles.statsVal} numberOfLines={1}>
                ₱{stats.totalRevenue.toLocaleString("en-PH")}
              </Text>
              <Text style={styles.statsLabel}>Total Revenue</Text>
            </View>

            <View style={styles.statsCardCol}>
              <View style={styles.statsIconWrap}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#f59e0b" />
              </View>
              <Text style={styles.statsVal} numberOfLines={1}>{stats.pendingOrdersCount}</Text>
              <Text style={styles.statsLabel}>Pending Orders</Text>
            </View>

            <View style={styles.statsCardCol}>
              <View style={styles.statsIconWrap}>
                <MaterialCommunityIcons name="check-all" size={18} color={colors.green} />
              </View>
              <Text style={styles.statsVal} numberOfLines={1}>{stats.soldListingsCount}</Text>
              <Text style={styles.statsLabel}>Completed Sales</Text>
            </View>

            <View style={styles.statsCardCol}>
              <View style={styles.statsIconWrap}>
                <MaterialCommunityIcons name="star" size={18} color="#eab308" />
              </View>
              <Text style={styles.statsVal} numberOfLines={1}>
                {stats.ratingsAverage} <Text style={{ fontSize: 9, color: colors.greenMuted }}>★</Text>
              </Text>
              <Text style={styles.statsLabel}>{stats.ratingsCount} review{stats.ratingsCount !== 1 ? "s" : ""}</Text>
            </View>
          </ScrollView>
        )}
      </Card>
      )}

      {mode === "hub" && activeTab === "dashboard" && (
        <View style={styles.subTabViewContainer}>
          <Card>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.subtitle}>Seller workspace</Text>
                <Text style={styles.sectionHint}>Jump into the next marketplace task</Text>
              </View>
              <View style={styles.sectionIconBadge}>
                <MaterialCommunityIcons name="chart-line" size={18} color={colors.green} />
              </View>
            </View>
            <View style={styles.sellerActionGrid}>
              <Pressable style={styles.sellerActionCard} onPress={() => setActiveTab("dashboard")}>
                <MaterialCommunityIcons name="view-dashboard-outline" size={22} color={colors.green} />
                <Text style={styles.sellerActionTitle}>Dashboard</Text>
                <Text style={styles.sellerActionHint}>Stats and signals</Text>
              </Pressable>
              <Pressable style={[styles.sellerActionCard, styles.sellerActionCardPrimary]} onPress={() => onOpenCreateListing?.() ?? setActiveTab("new")}>
                <MaterialCommunityIcons name="tag-plus-outline" size={22} color={colors.white} />
                <Text style={styles.sellerActionTitlePrimary}>Create Listing</Text>
                <Text style={styles.sellerActionHintPrimary}>Add a plant</Text>
              </Pressable>
              <Pressable style={styles.sellerActionCard} onPress={() => setActiveTab("inventory")}>
                <MaterialCommunityIcons name="package-variant-closed" size={22} color={colors.green} />
                <Text style={styles.sellerActionTitle}>Inventory</Text>
                <Text style={styles.sellerActionHint}>Live and review</Text>
              </Pressable>
              <Pressable style={styles.sellerActionCard} onPress={() => setActiveTab("orders")}>
                <MaterialCommunityIcons name="cash-register" size={22} color={colors.green} />
                <Text style={styles.sellerActionTitle}>Orders</Text>
                <Text style={styles.sellerActionHint}>Incoming sales</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      )}

      {/* activeTab === "new" */}
      {(mode === "create" || activeTab === "new") && (
        <View style={styles.subTabViewContainer}>
          <Card>
          {mode === "create" && (
            <Pressable onPress={onCloseCreateListing} style={styles.createScreenBack}>
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.green} />
              <Text style={styles.createScreenBackText}>Seller Hub</Text>
            </Pressable>
          )}
          <Text style={styles.subtitle}>Create New Listing</Text>
          <View style={styles.form}>
            {/* Photo preview with scanning overlay */}
            <Pressable onPress={handlePickPhoto} style={styles.photoContainer}>
              {photo ? (
                <>
                  <Image source={{ uri: photo.uri }} style={styles.preview} />
                  {isScanning && (
                    <View style={styles.scanOverlay}>
                      <View style={styles.scanOverlayInner}>
                        <ActivityIndicator color={colors.white} size="large" />
                        <Text style={styles.scanOverlayText}>Leafy AI is identifying your plant...</Text>
                      </View>
                    </View>
                  )}
                  {scanResult && !isScanning && (
                    <View style={styles.scanBadgeOverlay}>
                      <MaterialCommunityIcons color={colors.white} name="leaf" size={12} />
                      <Text style={styles.scanBadgeOverlayText}>Leafy identified (Tap to change)</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons color={colors.greenMuted} name="image-plus" size={40} />
                  <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
                  <Text style={styles.photoPlaceholderSub}>Leafy AI will scan it automatically</Text>
                </View>
              )}
            </Pressable>

            {photo && (
              <View style={styles.photoActionRow}>
                <View style={styles.photoActionBtn}>
                  <Button
                    disabled={isScanning}
                    variant="secondary"
                    onPress={handleScanPhoto}
                  >
                    {isScanning ? "Scanning..." : "Re-scan with Leafy AI"}
                  </Button>
                </View>
              </View>
            )}

            {/* Leafy scan result card */}
            {scanResult && !isScanning && (
              <View style={styles.scanCard}>
                <Pressable style={styles.scanHeader} onPress={() => setShowScanDetails((current) => !current)}>
                  <View style={styles.scanHeaderLeft}>
                    <MaterialCommunityIcons color={colors.green} name="leaf-circle" size={18} />
                    <View style={styles.scanSummaryWrap}>
                      <Text style={styles.scanEyebrow}>Leafy AI Identified</Text>
                      <Text style={styles.scanSummary} numberOfLines={1}>
                        {scanResult.bestMatch} ({scanResult.confidence}% confidence)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.scanHeaderRight}>
                    <Text style={[styles.scanStatusBadge, sellerRegulation.category !== "safe" && styles.scanStatusWarning]}>
                      {sellerRegulation.label}
                    </Text>
                    <MaterialCommunityIcons
                      name={showScanDetails ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.greenMuted}
                    />
                  </View>
                </Pressable>
                {showScanDetails && (
                  <View style={styles.scanDetails}>
                    <Text style={styles.scanTitle}>{scanResult.bestMatch}</Text>
                    <Text style={styles.scanMeta}>
                      {scanResult.scientificName ?? "Scientific name unavailable"} - {scanResult.confidence}% match
                    </Text>
                    {scanResult.family && (
                      <Text style={styles.scanMeta}>Family: {scanResult.family}</Text>
                    )}
                    <Text style={styles.scanBody}>{sellerRegulation.message}</Text>
                  </View>
                )}
              </View>
            )}

            {isIllegalListing && (
              <View style={styles.illegalCard}>
                <View style={styles.permitCardHeader}>
                  <MaterialCommunityIcons name="alert-octagon-outline" size={18} color="#991b1b" />
                  <Text style={styles.illegalTitle}>{sellerRegulation.label}</Text>
                </View>
                <Text style={styles.illegalText}>{sellerRegulation.message}</Text>
              </View>
            )}

            {allowsSupportDocument && !isIllegalListing && (
              <View style={styles.permitCard}>
                <View style={styles.permitCardHeader}>
                  <MaterialCommunityIcons name="file-certificate-outline" size={18} color={colors.green} />
                  <Text style={styles.permitTitle}>Requires Review</Text>
                </View>
                <Text style={styles.permitText}>{sellerRegulation.message}</Text>
                <Text style={styles.permitText}>
                  {requiresPermit
                    ? "Permit or supporting document recommended/required."
                    : "Supporting document is optional but may help admin verify your listing."}
                </Text>
                {permitDocument && (
                  <View style={styles.permitFileRow}>
                    <MaterialCommunityIcons name="file-document-outline" size={16} color={colors.green} />
                    <Text style={styles.permitFileName} numberOfLines={1}>{permitDocument.fileName}</Text>
                  </View>
                )}
                <View style={styles.photoActionRow}>
                  <View style={styles.photoActionBtn}>
                    <Button icon={permitDocument ? "file-replace-outline" : "upload"} variant="secondary" onPress={handlePickPermitDocument}>
                      {permitDocument ? "Replace document" : "Upload document"}
                    </Button>
                  </View>
                </View>
              </View>
            )}

            {/* Form fields — auto-filled by Leafy AI */}
            <View style={styles.fieldGroup}>
              {isScanning ? (
                <View style={styles.fieldSkeleton}>
                  <ActivityIndicator color={colors.greenMuted} size="small" />
                  <Text style={styles.fieldSkeletonText}>Filling plant details...</Text>
                </View>
              ) : null}
              <FloatingField label="Plant name" onChangeText={setName} value={name} />
              <FloatingField label="Local name, optional" onChangeText={setLocalName} value={localName} />
              <FloatingField label="Scientific name, optional" onChangeText={setScientificName} value={scientificName} />
              <FloatingField label="Category" onChangeText={setCategory} value={category} />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formColLarge}>
                <FloatingField
                  label="Price (PHP)"
                  keyboardType="numeric"
                  onChangeText={setPrice}
                  value={price}
                />
              </View>
              <View style={styles.formColSmall}>
                <FloatingField
                  label="Stock Qty"
                  keyboardType="number-pad"
                  onChangeText={setQuantity}
                  value={quantity}
                />
              </View>
            </View>

            <View style={styles.unitRow}>
              {units.map((unit, index) => (
                <Button key={unit} variant={index === unitIndex ? "primary" : "secondary"} onPress={() => setUnitIndex(index)}>
                  {unit}
                </Button>
              ))}
            </View>

            {/* Interactive Location Dropdown */}
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.formLabel}>Location</Text>
            </View>
            <Pressable onPress={() => setShowLocationDropdown(!showLocationDropdown)} style={styles.dropdownSelector}>
              <View style={styles.dropdownLeft}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.green} />
                <Text style={styles.dropdownText}>{location || "Select Location"}</Text>
              </View>
              <MaterialCommunityIcons name={showLocationDropdown ? "chevron-up" : "chevron-down"} size={18} color={colors.greenMuted} />
            </Pressable>
            {showLocationDropdown && (
              <View style={styles.dropdownOptionsContainer}>
                {["Butuan City", "Cabadbaran City", "Surigao City", "Bayugan City", "San Francisco"].map((loc) => (
                  <Pressable
                    key={loc}
                    onPress={() => {
                      setLocation(loc);
                      setShowLocationDropdown(false);
                    }}
                    style={[styles.dropdownOption, location === loc && styles.dropdownOptionActive]}
                  >
                    <Text style={[styles.dropdownOptionText, location === loc && styles.dropdownOptionTextActive]}>
                      {loc}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Premium fulfillment static card */}
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.formLabel}>Fulfillment Method</Text>
            </View>
            <View style={styles.deliverySelectorStatic}>
              <View style={[styles.dropdownLeft, { flex: 1 }]}>
                <MaterialCommunityIcons name="truck-delivery-outline" size={18} color={colors.green} />
                <Text style={styles.deliverySelectorText}>Delivery Only (GrowMate Safety Escrowed)</Text>
              </View>
              <View style={styles.deliveryBadgeStatic}>
                <Text style={styles.deliveryBadgeStaticText}>ACTIVE</Text>
              </View>
            </View>

            <FloatingField
              label="Description"
              multiline
              onChangeText={setDescription}
              inputStyle={styles.textarea}
              value={description}
            />

            {message && (
              <View style={styles.messageCard}>
                <Text style={styles.success}>{message}</Text>
              </View>
            )}
            {error && (
              <View style={styles.errorCard}>
                <Text style={styles.error}>{error}</Text>
              </View>
            )}

            <Button disabled={isSaving || isScanning || isIllegalListing} onPress={handleCreateListing}>
              {isSaving ? "Submitting..." : "Submit for review"}
            </Button>
          </View>
        </Card>
        </View>
      )}

      {/* activeTab === "inventory" */}
      {mode === "hub" && activeTab === "inventory" && (
        <View style={styles.subTabViewContainer}>
          <Card>
            <Pressable onPress={() => setActiveTab("dashboard")} style={styles.createScreenBack}>
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.green} />
              <Text style={styles.createScreenBackText}>Seller Hub</Text>
            </Pressable>
            <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.subtitle}>My listings</Text>
              <Text style={styles.sectionHint}>{filteredListings.length} of {listings.length} shown</Text>
            </View>
            <View style={styles.sectionIconBadge}>
              <MaterialCommunityIcons name="storefront-outline" size={18} color={colors.green} />
            </View>
          </View>
          <View style={styles.listingTools}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={17} color={colors.greenMuted} />
              <TextInput
                onChangeText={setListingSearch}
                placeholder="Search listings"
                placeholderTextColor="#8a9583"
                style={styles.searchInput}
                value={listingSearch}
              />
            </View>
            <View style={styles.statusFilterRow}>
              {listingStatusFilters.map((filter) => (
                <Pressable
                  key={filter}
                  onPress={() => setListingStatusFilter(filter)}
                  style={[styles.statusFilterChip, listingStatusFilter === filter && styles.statusFilterChipActive]}
                >
                  <Text style={[styles.statusFilterText, listingStatusFilter === filter && styles.statusFilterTextActive]}>
                    {filter === "all" ? "All" : filter === "needs_more_documents" ? "More Docs" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {isLoading && <SellerListingSkeleton />}
          {!isLoading && listings.length === 0 && <Text style={styles.body}>No seller listings yet.</Text>}
          {!isLoading && listings.length > 0 && filteredListings.length === 0 && <Text style={styles.body}>No listings match that filter.</Text>}
          {!isLoading &&
            displayedListings.map((listing) => {
              const statusStyle = getListingStatusStyle(listing.status);
              const stockLevel = listing.quantity <= 2 ? "Low" : "In stock";
              const isUpdatingThisListing = updatingListingId === listing.id;

              return (
                <View key={listing.id} style={styles.listingItem}>
                  <View style={styles.listingVisualRow}>
                    <View style={styles.listingImageWrap}>
                      {listing.photoUrl ? (
                        <Image source={{ uri: listing.photoUrl }} style={styles.listingThumb} />
                      ) : (
                        <View style={styles.listingThumbFallback}>
                          <MaterialCommunityIcons name="flower-outline" size={30} color={colors.greenMuted} />
                        </View>
                      )}
                      <View style={styles.deliveryBadge}>
                        <MaterialCommunityIcons name="truck-delivery-outline" size={12} color={colors.white} />
                        <Text style={styles.deliveryBadgeText}>Delivery</Text>
                      </View>
                    </View>

                    <View style={styles.listingContent}>
                      <View style={styles.listingHeader}>
                        <View style={styles.flexItem}>
                          <Text style={styles.listingName} numberOfLines={2}>{listing.name}</Text>
                          <Text style={styles.listingCategory} numberOfLines={1}>{listing.category}</Text>
                        </View>
                        <View style={[styles.listingStatusBadge, { backgroundColor: statusStyle.bg }]}>
                          <MaterialCommunityIcons name={statusStyle.icon} size={12} color={statusStyle.text} />
                          <Text style={[styles.listingStatusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                        </View>
                      </View>

                      <View style={styles.listingMetricGrid}>
                        <View style={styles.listingMetric}>
                          <MaterialCommunityIcons name="currency-php" size={14} color={colors.green} />
                          <Text style={styles.listingMetricValue}>{listing.price.toLocaleString("en-PH")}</Text>
                        </View>
                        <View style={styles.listingMetric}>
                          <MaterialCommunityIcons name="package-variant-closed" size={14} color={colors.green} />
                          <Text style={styles.listingMetricValue}>{listing.quantity} {listing.unit}</Text>
                        </View>
                        <View style={styles.listingMetric}>
                          <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.green} />
                          <Text style={styles.listingMetricValue} numberOfLines={1}>{listing.location}</Text>
                        </View>
                      </View>

                      <View style={styles.stockRow}>
                        <View style={[styles.stockPill, listing.quantity <= 2 && styles.stockPillLow]}>
                          <Text style={[styles.stockText, listing.quantity <= 2 && styles.stockTextLow]}>{stockLevel}</Text>
                        </View>
                        <View style={styles.stockStepper}>
                          <Pressable
                            disabled={isUpdatingThisListing || listing.quantity <= 1}
                            onPress={() => handleAdjustListingStock(listing, -1)}
                            style={[styles.stockBtn, (isUpdatingThisListing || listing.quantity <= 1) && styles.stockBtnDisabled]}
                          >
                            <MaterialCommunityIcons name="minus" size={16} color={colors.green} />
                          </Pressable>
                          <Pressable
                            disabled={isUpdatingThisListing}
                            onPress={() => handleAdjustListingStock(listing, 1)}
                            style={[styles.stockBtn, isUpdatingThisListing && styles.stockBtnDisabled]}
                          >
                            <MaterialCommunityIcons name="plus" size={16} color={colors.green} />
                          </Pressable>
                          {listing.status !== "archived" && (
                            <Pressable onPress={() => handleDeleteListing(listing.id)} style={styles.archiveBtn}>
                              <MaterialCommunityIcons name="archive-outline" size={17} color="#d14b4b" />
                            </Pressable>
                          )}
                        </View>
                      </View>
                      {listing.status === "needs_more_documents" && (
                        <View style={styles.moreDocsRow}>
                          <Button
                            disabled={isUpdatingThisListing}
                            icon="file-upload-outline"
                            size="sm"
                            variant="secondary"
                            onPress={() => handleUploadPermitForExistingListing(listing)}
                          >
                            Upload documents
                          </Button>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}

          {!isLoading && filteredListings.length > 3 && (
            <Pressable
              onPress={() => setShowAllListings(!showAllListings)}
              style={styles.showAllBtn}
            >
              <Text style={styles.showAllBtnText}>
                {showAllListings ? "Show Less" : `Show All (${filteredListings.length})`}
              </Text>
              <MaterialCommunityIcons
                name={showAllListings ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.green}
              />
            </Pressable>
          )}
        </Card>
        </View>
      )}

      {/* activeTab === "orders" */}
      {mode === "hub" && activeTab === "orders" && (
        <View style={styles.subTabViewContainer}>
          <Card>
            <Pressable onPress={() => setActiveTab("dashboard")} style={styles.createScreenBack}>
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.green} />
              <Text style={styles.createScreenBackText}>Seller Hub</Text>
            </Pressable>
            <Text style={styles.subtitle}>Incoming Sales Orders</Text>
          {isLoading && <SellerListingSkeleton />}
          {!isLoading && salesOrders.length === 0 && <Text style={styles.body}>No incoming orders yet.</Text>}
          {!isLoading &&
            salesOrders.map((order) => {
              const isPending = order.status === "pending";
              const isAccepted = order.status === "accepted";
              const isPaid = order.status === "paid";
              const isUpdatingOrder = updatingOrderId === order.id;
              const isOrderExpanded = expandedOrderId === order.id;
              const statusMeta = getOrderStatusMeta(order);
              const safetyFee = order.platformFee || Math.round(order.subtotal * 0.1 * 100) / 100;
              const sellerPayout = Math.max(order.subtotal - safetyFee, 0);

              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderListingName} numberOfLines={1}>{order.listingName}</Text>
                    <View style={[styles.orderStatusBadge, { backgroundColor: statusMeta.bg }]}>
                      {statusMeta.urgent && <View style={styles.orderUrgencyDot} />}
                      <MaterialCommunityIcons name={statusMeta.icon} size={12} color={statusMeta.color} />
                      <Text style={[styles.orderStatusText, { color: statusMeta.color }]}>
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>
                  {statusMeta.urgent && (
                    <View style={styles.orderUrgencyRow}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#dc2626" />
                      <Text style={styles.orderUrgencyText}>Pending action</Text>
                    </View>
                  )}
                  <Text style={styles.orderBuyerName}>Buyer: {order.buyerName}</Text>
                  <Text style={styles.orderInfo}>
                    Qty: {order.quantity} · Total: {formatCurrency(order.subtotal)}
                  </Text>
                  <Text style={styles.orderInfo}>Method: {order.meetupOrDelivery || "Delivery"}</Text>
                  <Pressable
                    onPress={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                    style={styles.payoutSummaryRow}
                  >
                    <View>
                      <Text style={styles.payoutSummaryLabel}>Estimated Seller Payout</Text>
                      <Text style={styles.payoutSummaryValue}>{formatCurrency(sellerPayout)}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={isOrderExpanded ? "chevron-up" : "information-outline"}
                      size={18}
                      color={colors.green}
                    />
                  </Pressable>
                  {isOrderExpanded && (
                    <View style={styles.payoutBox}>
                      <View style={styles.payoutRow}>
                        <Text style={styles.payoutLabel}>Item Price</Text>
                        <Text style={styles.payoutValue}>{formatCurrency(order.subtotal)}</Text>
                      </View>
                      <View style={styles.payoutRow}>
                        <Text style={styles.payoutLabel}>GrowMate Safety Fee (10%)</Text>
                        <Text style={styles.payoutFee}>-{formatCurrency(safetyFee)}</Text>
                      </View>
                    </View>
                  )}

                  {/* Order actions */}
                  {(isPending || isPaid) && (
                    <View style={styles.orderActionsRow}>
                      {isPending && (
                        <>
                          <Pressable
                            onPress={() => handleUpdateSalesOrderStatus(order.id, "accepted")}
                            disabled={isUpdatingOrder}
                            style={[styles.orderBtnAccept, isUpdatingOrder && styles.orderBtnDisabled]}
                          >
                            <Text style={styles.orderBtnAcceptText}>{isUpdatingOrder ? "Updating..." : "Accept Order"}</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleUpdateSalesOrderStatus(order.id, "cancelled")}
                            disabled={isUpdatingOrder}
                            style={[styles.orderBtnCancel, isUpdatingOrder && styles.orderBtnDisabled]}
                          >
                            <Text style={styles.orderBtnCancelText}>Reject</Text>
                          </Pressable>
                        </>
                      )}
                      {isPaid && (
                        <Pressable
                          onPress={() => handleUpdateSalesOrderStatus(order.id, "completed")}
                          disabled={isUpdatingOrder}
                          style={[styles.orderBtnComplete, isUpdatingOrder && styles.orderBtnDisabled]}
                        >
                          <Text style={styles.orderBtnCompleteText}>{isUpdatingOrder ? "Updating..." : "Mark Completed"}</Text>
                        </Pressable>
                      )}
                    </View>
                  )}

                  {isAccepted && (
                    <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#7c3aed" />
                      <Text style={{ fontSize: 12, color: "#7c3aed", fontWeight: "700" }}>
                        Awaiting buyer payment...
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
        </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.green,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.green,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  body: {
    color: colors.greenMuted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 8,
  },
  form: {
    gap: 10,
    marginTop: 16,
  },
  // ── Photo area ──────────────────────────────────────────
  photoContainer: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.sage,
  },
  preview: {
    height: 200,
    width: "100%",
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    height: 160,
    gap: 8,
    backgroundColor: colors.sage,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.sageStrong,
    borderStyle: "dashed",
  },
  photoPlaceholderText: {
    color: colors.green,
    fontSize: 15,
    fontWeight: "900",
  },
  photoPlaceholderSub: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(29,63,37,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanOverlayInner: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  scanOverlayText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  scanBadgeOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scanBadgeOverlayText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "900",
  },
  photoActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoActionBtn: {
    flex: 1,
  },
  // ── Scan result card ─────────────────────────────────────
  scanCard: {
    backgroundColor: "#f0f9eb",
    borderColor: "#cce8bd",
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  scanHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scanHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  scanHeaderRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  scanSummaryWrap: {
    flex: 1,
    minWidth: 0,
  },
  scanEyebrow: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  scanStatusBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    color: colors.green,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scanStatusWarning: {
    backgroundColor: "#fff2cc",
    color: "#8a5a00",
  },
  scanSummary: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  scanDetails: {
    borderTopColor: "#cce8bd",
    borderTopWidth: 1,
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
  },
  scanTitle: {
    color: colors.green,
    fontSize: 17,
    fontWeight: "900",
  },
  scanMeta: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  scanBody: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  permitCard: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  permitCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  permitTitle: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "900",
  },
  permitText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  permitFileRow: {
    alignItems: "center",
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  permitFileName: {
    color: colors.green,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  illegalCard: {
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  illegalTitle: {
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "900",
  },
  illegalText: {
    color: "#7f1d1d",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
  },
  // ── Form fields ──────────────────────────────────────────
  fieldGroup: {
    gap: 10,
  },
  fieldSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.sage,
    borderRadius: 14,
  },
  fieldSkeletonText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowInput: {
    flex: 1,
  },
  qtyInput: {
    width: 72,
  },
  unitRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  textarea: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  // ── Messages ─────────────────────────────────────────────
  messageCard: {
    backgroundColor: "#f0f9eb",
    borderColor: "#cce8bd",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorCard: {
    backgroundColor: "#fff1f0",
    borderColor: "#f5c6c2",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  success: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
  },
  error: {
    color: "#9f2d20",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
  },
  divider: {
    backgroundColor: colors.line,
    height: 1,
    marginVertical: 18,
  },
  loader: {
    marginVertical: 10,
  },
  sellerSkeletonList: {
    gap: 10,
  },
  // ── Listing list ─────────────────────────────────────────
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionHint: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: -4,
  },
  sectionIconBadge: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  listingTools: {
    gap: 8,
    marginBottom: 12,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: colors.green,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 10,
  },
  statusFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  statusFilterChip: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusFilterChipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  statusFilterText: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "900",
  },
  statusFilterTextActive: {
    color: colors.white,
  },
  listingItem: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  listingVisualRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  listingImageWrap: {
    backgroundColor: colors.sage,
    flexShrink: 0,
    height: 154,
    position: "relative",
    width: 118,
  },
  listingThumb: {
    height: 154,
    width: "100%",
  },
  listingThumbFallback: {
    alignItems: "center",
    height: 154,
    justifyContent: "center",
    width: "100%",
  },
  deliveryBadge: {
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: 999,
    bottom: 8,
    flexDirection: "row",
    gap: 4,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: "absolute",
  },
  deliveryBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "900",
  },
  listingContent: {
    flex: 1,
    gap: 10,
    minHeight: 154,
    padding: 12,
  },
  listingName: {
    color: colors.green,
    fontSize: 15,
    fontWeight: "900",
  },
  listingCategory: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
    textTransform: "capitalize",
  },
  listingHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  listingStatusBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  listingStatusText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  listingMetricGrid: {
    gap: 6,
  },
  listingMetric: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  listingMetricValue: {
    color: colors.greenMuted,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  stockRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  moreDocsRow: {
    marginTop: 10,
  },
  stockPill: {
    backgroundColor: "#ecfdf5",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  stockPillLow: {
    backgroundColor: "#fff7ed",
  },
  stockText: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "900",
  },
  stockTextLow: {
    color: "#9a3412",
  },
  stockStepper: {
    flexDirection: "row",
    gap: 8,
  },
  stockBtn: {
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  stockBtnDisabled: {
    opacity: 0.45,
  },
  archiveBtn: {
    alignItems: "center",
    backgroundColor: "#fff1f0",
    borderColor: "#f5c6c2",
    borderRadius: 10,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  flexItem: {
    flex: 1,
  },
  deletePress: {
    padding: 6,
  },

  // ── Stats dashboard UI ──────────────────────────────────
  statsCarousel: {
    gap: 8,
    marginTop: 14,
    marginBottom: 6,
    paddingRight: 4,
  },
  statsCardCol: {
    width: 126,
    backgroundColor: colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  statsIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  statsVal: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.green,
    textAlign: "center",
  },
  statsLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.greenMuted,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  dashboardActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  sellerActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sellerActionCard: {
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 98,
    padding: 12,
    width: "48%",
  },
  sellerActionCardPrimary: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  sellerActionTitle: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
  },
  sellerActionTitlePrimary: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
  },
  sellerActionHint: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  sellerActionHintPrimary: {
    color: "#dcfce7",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  createScreenBack: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 4,
  },
  createScreenBackText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  formColLarge: {
    flex: 2,
  },
  formColSmall: {
    flex: 1,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.greenMid,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  // Order Card Styles inside Seller Dashboard
  orderCard: {
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.white,
    marginTop: 8,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderListingName: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "900",
    flex: 1,
  },
  orderStatusBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderUrgencyDot: {
    backgroundColor: "#dc2626",
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  orderUrgencyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginBottom: 5,
    marginTop: -2,
  },
  orderUrgencyText: {
    color: "#dc2626",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  orderStatusText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  orderBuyerName: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  orderInfo: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  payoutBox: {
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginTop: 8,
  },
  payoutSummaryRow: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderColor: "#bbf7d0",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  payoutSummaryLabel: {
    color: colors.greenMuted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  payoutSummaryValue: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  payoutLabel: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  payoutValue: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "800",
  },
  payoutFee: {
    color: "#b45309",
    fontSize: 11,
    fontWeight: "800",
  },
  orderActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  orderBtnAccept: {
    flex: 1.5,
    backgroundColor: colors.green,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBtnAcceptText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  orderBtnCancel: {
    flex: 1,
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBtnCancelText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  orderBtnComplete: {
    flex: 1,
    backgroundColor: colors.green,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBtnCompleteText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  orderBtnDisabled: {
    opacity: 0.55,
  },
  showAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  showAllBtnText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  dashboardContainer: {
    paddingBottom: 40,
  },
  subTabViewContainer: {
    paddingBottom: 32,
  },
  dropdownSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dropdownText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  dropdownOptionsContainer: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    marginBottom: 10,
    gap: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dropdownOptionActive: {
    backgroundColor: "#dcfce7",
  },
  dropdownOptionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownOptionTextActive: {
    color: colors.green,
    fontWeight: "800",
  },
  deliverySelectorStatic: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  deliverySelectorText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
    paddingRight: 64,
  },
  deliveryBadgeStatic: {
    backgroundColor: colors.green,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deliveryBadgeStaticText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "900",
  },
  fieldLabelContainer: {
    alignSelf: "flex-start",
    marginBottom: 4,
    paddingLeft: 4,
  },
  floatingField: {
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  floatingFieldFocused: {
    borderColor: colors.green,
    backgroundColor: colors.white,
  },
  floatingLabelActive: {
    color: colors.greenMid,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.2,
    marginBottom: 1,
    textTransform: "uppercase",
  },
  floatingInput: {
    color: "#0c2b1d",
    fontSize: 14,
    fontWeight: "700",
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  floatingInputWithLabel: {
    paddingTop: 1,
  },
});

type FloatingFieldProps = TextInputProps & {
  label: string;
  inputStyle?: StyleProp<TextStyle>;
};

function FloatingField({ label, inputStyle, value, onFocus, onBlur, ...props }: FloatingFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = String(value ?? "").length > 0;

  return (
    <View style={[styles.floatingField, isFocused && styles.floatingFieldFocused]}>
      {(isFocused || hasValue) && (
        <Text style={styles.floatingLabelActive} numberOfLines={1}>
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        placeholder={isFocused || hasValue ? "" : label}
        placeholderTextColor="#8a9583"
        style={[styles.floatingInput, (isFocused || hasValue) && styles.floatingInputWithLabel, inputStyle]}
        value={value}
      />
    </View>
  );
}

function SellerListingSkeleton() {
  return (
    <View style={styles.sellerSkeletonList}>
      {[0, 1].map((item) => (
        <SkeletonCard key={item}>
          <View style={styles.listingVisualRow}>
            <SkeletonBlock height={154} width={118} borderRadius={14} />
            <View style={styles.listingContent}>
              <SkeletonLine width="76%" height={15} />
              <SkeletonLine width="42%" height={11} />
              <SkeletonLine width="58%" height={11} />
              <SkeletonLine width="68%" height={11} />
              <View style={styles.stockRow}>
                <SkeletonBlock height={26} width={72} borderRadius={999} />
                <SkeletonBlock height={30} width={104} borderRadius={10} />
              </View>
            </View>
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}
