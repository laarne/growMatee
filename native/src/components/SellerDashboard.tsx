import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View, Pressable, Platform } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { useAuth } from "../context/AuthContext";
import { createListingForReview, getSellerListings, deleteListing, updateListing, getUserOrders, updateOrderStatus, type ListingInput, type SellerListing, type Order } from "../services/listings";
import { scanPlantWithLeafy, type LeafyScanResult } from "../services/leafyScan";
import { pickImageFromLibrary, uploadPublicImage, type PickedImage } from "../services/storage";
import { colors } from "../theme/colors";
import { getSellerStats, type SellerStats } from "../services/profile";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatCurrency } from "../utils/currency";
import { SkeletonBlock, SkeletonCard, SkeletonLine } from "./Skeleton";

const units: ListingInput["unit"][] = ["Pot", "Cutting", "Seedling", "Node", "Pack"];
const DELIVERY_ONLY = "Delivery";
const listingStatusFilters = ["all", "active", "review", "archived"] as const;
type ListingStatusFilter = (typeof listingStatusFilters)[number];

export function SellerDashboard() {
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
  const [scanResult, setScanResult] = useState<LeafyScanResult | null>(null);
  const [location, setLocation] = useState("");
  const [deliveryOption] = useState(DELIVERY_ONLY);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [listingSearch, setListingSearch] = useState("");
  const [listingStatusFilter, setListingStatusFilter] = useState<ListingStatusFilter>("all");
  const [updatingListingId, setUpdatingListingId] = useState<string | null>(null);
  const [showAllListings, setShowAllListings] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "stock" | "orders">("new");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

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
      setScanResult(result);
      // Auto-fill fields — only overwrite if the field is currently empty
      setName((current) => current.trim() || result.bestMatch);
      setScientificName((current) => current.trim() || result.scientificName || "");
      setCategory((current) => current.trim() || result.category);
      // Build a helpful auto-description
      const confidence = `Leafy AI identified this as ${result.bestMatch} (${result.confidence}% confidence).`;
      setDescription((current) => current.trim() || `${confidence} ${result.reviewReason}`);
      setMessage(
        result.saleStatus === "safe_to_sell"
          ? "✅ Leafy scan complete — fields filled automatically."
          : "⚠️ Leafy scan complete — admin review will be required."
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

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const uploadedPhoto = photo ? await uploadPublicImage("listing-photos", user.id, "listings", photo) : null;

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
        initialStatus: "review",
      });

      setMessage("Listing submitted for admin review before going live.");
      setName("");
      setLocalName("");
      setScientificName("");
      setCategory("");
      setPrice("");
      setQuantity("1");
      setUnitIndex(0);
      setDescription("");
      setPhoto(null);
      setScanResult(null);
      await loadDashboardData();
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

  function getListingStatusStyle(status: string) {
    switch (status) {
      case "active":
        return { bg: "#dcfce7", text: "#166534", icon: "store-check-outline" as const, label: "Live" };
      case "review":
        return { bg: "#fff7ed", text: "#9a3412", icon: "clipboard-search-outline" as const, label: "Review" };
      case "archived":
        return { bg: "#f3f4f6", text: "#4b5563", icon: "archive-outline" as const, label: "Archived" };
      default:
        return { bg: "#eef2ff", text: "#3730a3", icon: "pencil-outline" as const, label: status };
    }
  }

  async function handleUpdateSalesOrderStatus(orderId: string, nextStatus: Order["status"]) {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await updateOrderStatus(orderId, nextStatus);
      setMessage(`Order status updated to: ${nextStatus}`);
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order status.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.dashboardContainer}>
      <Card>
        <Text style={styles.title}>Seller Management Hub</Text>
        <Text style={styles.body}>Track your metrics, manage inventory stock, and process incoming buyer orders.</Text>

        {stats && (
          <View style={styles.statsGrid}>
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
          </View>
        )}

        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => setActiveTab("new")}
            style={[styles.tabButton, activeTab === "new" && styles.tabButtonActive]}
          >
            <MaterialCommunityIcons
              name="tag-plus-outline"
              size={15}
              color={activeTab === "new" ? colors.white : colors.green}
            />
            <Text style={[styles.tabButtonText, activeTab === "new" && styles.tabButtonTextActive]}>
              New Listing
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("stock")}
            style={[styles.tabButton, activeTab === "stock" && styles.tabButtonActive]}
          >
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={15}
              color={activeTab === "stock" ? colors.white : colors.green}
            />
            <Text style={[styles.tabButtonText, activeTab === "stock" && styles.tabButtonTextActive]}>
              My Stock ({listings.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("orders")}
            style={[styles.tabButton, activeTab === "orders" && styles.tabButtonActive]}
          >
            <MaterialCommunityIcons
              name="cash-register"
              size={15}
              color={activeTab === "orders" ? colors.white : colors.green}
            />
            <Text style={[styles.tabButtonText, activeTab === "orders" && styles.tabButtonTextActive]}>
              Orders ({salesOrders.length})
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* activeTab === "new" */}
      {activeTab === "new" && (
        <View style={styles.subTabViewContainer}>
          <Card>
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
                <View style={styles.scanHeader}>
                  <View style={styles.scanHeaderLeft}>
                    <MaterialCommunityIcons color={colors.green} name="leaf-circle" size={18} />
                    <Text style={styles.scanEyebrow}>Leafy AI Result</Text>
                  </View>
                  <Text style={[styles.scanStatusBadge, scanResult.saleStatus !== "safe_to_sell" && styles.scanStatusWarning]}>
                    {scanResult.saleStatus === "safe_to_sell" ? "Safe to sell" : "Needs review"}
                  </Text>
                </View>
                <Text style={styles.scanTitle}>{scanResult.bestMatch}</Text>
                <Text style={styles.scanMeta}>
                  {scanResult.scientificName ?? "Scientific name unavailable"} · {scanResult.confidence}% match
                </Text>
                {scanResult.family && (
                  <Text style={styles.scanMeta}>Family: {scanResult.family}</Text>
                )}
                <Text style={styles.scanBody}>{scanResult.reviewReason}</Text>
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
              <TextInput
                onChangeText={setName}
                placeholder="Plant name"
                placeholderTextColor="#8a9583"
                style={styles.input}
                value={name}
              />
              <TextInput
                onChangeText={setLocalName}
                placeholder="Local name, optional"
                placeholderTextColor="#8a9583"
                style={styles.input}
                value={localName}
              />
              <TextInput
                onChangeText={setScientificName}
                placeholder="Scientific name, optional"
                placeholderTextColor="#8a9583"
                style={styles.input}
                value={scientificName}
              />
              <TextInput
                onChangeText={setCategory}
                placeholder="Category (e.g. Root Crops, Vegetables)"
                placeholderTextColor="#8a9583"
                style={styles.input}
                value={category}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formColLarge}>
                <Text style={styles.formLabel}>Price (PHP)</Text>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={setPrice}
                  placeholder="Price (PHP)"
                  placeholderTextColor="#8a9583"
                  style={styles.input}
                  value={price}
                />
              </View>
              <View style={styles.formColSmall}>
                <Text style={styles.formLabel}>Stock Qty</Text>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setQuantity}
                  placeholder="Qty"
                  placeholderTextColor="#8a9583"
                  style={styles.input}
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

            <TextInput
              multiline
              onChangeText={setDescription}
              placeholder="Description"
              placeholderTextColor="#8a9583"
              style={[styles.input, styles.textarea]}
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

            <Button disabled={isSaving || isScanning} onPress={handleCreateListing}>
              {isSaving ? "Submitting..." : "Submit for review"}
            </Button>
          </View>
        </Card>
        </View>
      )}

      {/* activeTab === "stock" */}
      {activeTab === "stock" && (
        <View style={styles.subTabViewContainer}>
          <Card>
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
                    {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
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
      {activeTab === "orders" && (
        <View style={styles.subTabViewContainer}>
          <Card>
            <Text style={styles.subtitle}>Incoming Sales Orders</Text>
          {isLoading && <SellerListingSkeleton />}
          {!isLoading && salesOrders.length === 0 && <Text style={styles.body}>No incoming orders yet.</Text>}
          {!isLoading &&
            salesOrders.map((order) => {
              const isPending = order.status === "pending";
              const isAccepted = order.status === "accepted";
              const isPaid = order.status === "paid";
              const statusCol =
                order.status === "pending"
                  ? "#b45309"
                  : order.status === "accepted"
                  ? "#7c3aed"
                  : order.status === "paid"
                  ? "#0369a1"
                  : order.status === "completed"
                  ? colors.green
                  : "#dc2626";

              const statusText = 
                order.status === "paid"
                  ? "Ready"
                  : order.status.charAt(0).toUpperCase() + order.status.slice(1);
              const safetyFee = order.platformFee || Math.round(order.subtotal * 0.1 * 100) / 100;
              const sellerPayout = Math.max(order.subtotal - safetyFee, 0);

              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderListingName} numberOfLines={1}>{order.listingName}</Text>
                    <View style={[styles.orderStatusBadge, { backgroundColor: `${statusCol}18` }]}>
                      <Text style={[styles.orderStatusText, { color: statusCol }]}>
                        {statusText}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.orderBuyerName}>Buyer: {order.buyerName}</Text>
                  <Text style={styles.orderInfo}>
                    Qty: {order.quantity} · Total: {formatCurrency(order.subtotal)}
                  </Text>
                  <Text style={styles.orderInfo}>Method: {order.meetupOrDelivery || "Delivery"}</Text>
                  <View style={styles.payoutBox}>
                    <View style={styles.payoutRow}>
                      <Text style={styles.payoutLabel}>Item Price</Text>
                      <Text style={styles.payoutValue}>{formatCurrency(order.subtotal)}</Text>
                    </View>
                    <View style={styles.payoutRow}>
                      <Text style={styles.payoutLabel}>GrowMate Safety Fee (10%)</Text>
                      <Text style={styles.payoutFee}>-{formatCurrency(safetyFee)}</Text>
                    </View>
                    <View style={[styles.payoutRow, styles.payoutTotalRow]}>
                      <Text style={styles.payoutTotalLabel}>Estimated Seller Payout</Text>
                      <Text style={styles.payoutTotalValue}>{formatCurrency(sellerPayout)}</Text>
                    </View>
                  </View>

                  {/* Order actions */}
                  {(isPending || isPaid) && (
                    <View style={styles.orderActionsRow}>
                      {isPending && (
                        <>
                          <Pressable
                            onPress={() => handleUpdateSalesOrderStatus(order.id, "accepted")}
                            style={styles.orderBtnAccept}
                          >
                            <Text style={styles.orderBtnAcceptText}>Accept Order</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleUpdateSalesOrderStatus(order.id, "cancelled")}
                            style={styles.orderBtnCancel}
                          >
                            <Text style={styles.orderBtnCancelText}>Reject</Text>
                          </Pressable>
                        </>
                      )}
                      {isPaid && (
                        <Pressable
                          onPress={() => handleUpdateSalesOrderStatus(order.id, "completed")}
                          style={styles.orderBtnComplete}
                        >
                          <Text style={styles.orderBtnCompleteText}>Mark Completed</Text>
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
    gap: 6,
  },
  stockBtn: {
    alignItems: "center",
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
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
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    marginBottom: 6,
  },
  statsCardCol: {
    flex: 1,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
  payoutTotalRow: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  payoutTotalLabel: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "900",
    flex: 1,
  },
  payoutTotalValue: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface1,
    borderRadius: 14,
    padding: 4,
    marginTop: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.green,
  },
  tabButtonText: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "900",
  },
  tabButtonTextActive: {
    color: colors.white,
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
});

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
