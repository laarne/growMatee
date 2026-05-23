import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { useAuth } from "../context/AuthContext";
import { createListingForReview, getSellerListings, deleteListing, type ListingInput, type SellerListing } from "../services/listings";
import { scanPlantWithLeafy, type LeafyScanResult } from "../services/leafyScan";
import { pickImageFromLibrary, uploadPublicImage, type PickedImage } from "../services/storage";
import { colors } from "../theme/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const units: ListingInput["unit"][] = ["Pot", "Cutting", "Seedling", "Node", "Pack"];

export function SellerDashboard() {
  const { profile, user } = useAuth();
  const [listings, setListings] = useState<SellerListing[]>([]);
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
  const [deliveryOption, setDeliveryOption] = useState("Pickup / Meetup / Delivery");

  useEffect(() => {
    if (profile?.location) {
      setLocation(profile.location);
    }
  }, [profile?.location]);

  async function loadListings() {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSellerListings(user.id);
      setListings(data);
    } catch (loadError) {
      const nextMessage = loadError instanceof Error ? loadError.message : "Unable to load seller listings.";
      setError(nextMessage);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadListings();
  }, [user?.id]);

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

    if (!name.trim() || !category.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Add a plant name, category, valid price, and valid quantity.");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    // Leafy AI cleared it — go live immediately, no admin queue needed
    const safeToSell = scanResult?.saleStatus === "safe_to_sell";
    const initialStatus: "active" | "review" = safeToSell ? "active" : "review";

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
        deliveryOption: deliveryOption.trim() || "Pickup / Meetup / Delivery",
        description: description.trim(),
        photoPath: uploadedPhoto?.path,
        aiProvider: scanResult?.provider ?? null,
        aiConfidence: scanResult?.confidence ?? null,
        aiResult: scanResult ?? null,
        initialStatus,
      });

      setMessage(
        safeToSell
          ? "✅ Listing is now live on the Marketplace!"
          : "📋 Listing submitted for admin review before going live."
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
      setScanResult(null);
      await loadListings();
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
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive listing.");
    }
  }

  return (
    <Card>
      <Text style={styles.title}>Seller Dashboard</Text>
      <Text style={styles.body}>Create listings for review. Public Market visibility starts only after admin approval.</Text>

      <View style={styles.form}>
        {/* Photo preview with scanning overlay */}
        <View style={styles.photoContainer}>
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
                  <Text style={styles.scanBadgeOverlayText}>Leafy identified</Text>
                </View>
              )}
            </>
          ) : (
            <Pressable onPress={handlePickPhoto} style={styles.photoPlaceholder}>
              <MaterialCommunityIcons color={colors.greenMuted} name="image-plus" size={40} />
              <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
              <Text style={styles.photoPlaceholderSub}>Leafy AI will scan it automatically</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.photoActionRow}>
          <View style={styles.photoActionBtn}>
            <Button variant="secondary" onPress={handlePickPhoto}>
              {photo ? "Change photo" : "Add listing photo"}
            </Button>
          </View>
          {photo && (
            <View style={styles.photoActionBtn}>
              <Button
                disabled={isScanning}
                variant="secondary"
                onPress={handleScanPhoto}
              >
                {isScanning ? "Scanning..." : "Re-scan"}
              </Button>
            </View>
          )}
        </View>

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
            placeholder="Category (e.g. Aroid, Succulent)"
            placeholderTextColor="#8a9583"
            style={styles.input}
            value={category}
          />
        </View>

        <View style={styles.row}>
          <TextInput
            keyboardType="numeric"
            onChangeText={setPrice}
            placeholder="Price (PHP)"
            placeholderTextColor="#8a9583"
            style={[styles.input, styles.rowInput]}
            value={price}
          />
          <TextInput
            keyboardType="number-pad"
            onChangeText={setQuantity}
            placeholder="Qty"
            placeholderTextColor="#8a9583"
            style={[styles.input, styles.qtyInput]}
            value={quantity}
          />
        </View>

        <View style={styles.unitRow}>
          {units.map((unit, index) => (
            <Button key={unit} variant={index === unitIndex ? "primary" : "secondary"} onPress={() => setUnitIndex(index)}>
              {unit}
            </Button>
          ))}
        </View>

        <TextInput
          onChangeText={setLocation}
          placeholder="Location (e.g. Butuan City)"
          placeholderTextColor="#8a9583"
          style={styles.input}
          value={location}
        />
        <TextInput
          onChangeText={setDeliveryOption}
          placeholder="Delivery Options (e.g. Meetup / Delivery)"
          placeholderTextColor="#8a9583"
          style={styles.input}
          value={deliveryOption}
        />
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
          {isSaving
            ? "Publishing..."
            : scanResult?.saleStatus === "safe_to_sell"
            ? "Publish to Marketplace"
            : "Submit for review"}
        </Button>
      </View>

      <View style={styles.divider} />
      <Text style={styles.subtitle}>My listings</Text>
      {isLoading && <ActivityIndicator color={colors.green} style={styles.loader} />}
      {!isLoading && listings.length === 0 && <Text style={styles.body}>No seller listings yet.</Text>}
      {!isLoading &&
        listings.map((listing) => (
          <View key={listing.id} style={styles.listingItem}>
            <View style={styles.listingHeader}>
              <View style={styles.flexItem}>
                <Text style={styles.listingName}>{listing.name}</Text>
                <Text style={styles.listingMeta}>
                  PHP {listing.price.toLocaleString("en-PH")} · {listing.quantity} {listing.unit} · {listing.status}
                </Text>
              </View>
              {listing.status !== "archived" && (
                <Pressable onPress={() => handleDeleteListing(listing.id)} style={styles.deletePress}>
                  <MaterialCommunityIcons name="archive-outline" size={20} color="#d14b4b" />
                </Pressable>
              )}
            </View>
          </View>
        ))}
    </Card>
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
  // ── Listing list ─────────────────────────────────────────
  listingItem: {
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  listingName: {
    color: colors.green,
    fontSize: 15,
    fontWeight: "900",
  },
  listingMeta: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "capitalize",
  },
  listingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flexItem: {
    flex: 1,
  },
  deletePress: {
    padding: 6,
  },
});
