import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { EmptyState } from "../components/EmptyState";
import {
  createGardenPlant,
  updateGardenPlant,
  getGardenPlants,
  getOrCreateMyGarden,
  updateGarden,
  type Garden,
  type GardenPlant,
} from "../services/gardens";
import { scanPlantWithLeafy, type LeafyScanResult } from "../services/leafyScan";
import { pickImageFromLibrary, takePhotoWithCamera, uploadPublicImage, type PickedImage } from "../services/storage";
import { colors, radius, shadow, fontSize } from "../theme/colors";
import { DiscoverGardensScreen } from "./DiscoverGardensScreen";
import { RankingsScreen } from "./RankingsScreen";
import { supabase } from "../services/supabase";
import { readFastCache, writeFastCache } from "../utils/fastCache";
import { useNavigationContext } from "../context/NavigationContext";

type ParsedCareNote = {
  emoji: string;
  label: string;
  value: string;
};

function cleanValue(sentence: string, label: string): string {
  let clean = sentence.trim();
  // Strip bullet points
  clean = clean.replace(/^\s*[•\-\*]+\s*/, "");

  // Strip "<Label>:" prefix (e.g. "Water: ")
  const labelEscaped = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const prefixRegex = new RegExp(`^\\s*(?:${labelEscaped}|general|ai\\s*scan|ai\\s*diagnostics|observation|care\\s*log)\\s*:\\s*`, 'i');

  let prev;
  do {
    prev = clean;
    clean = clean.replace(prefixRegex, "");
  } while (clean !== prev);

  // Strip repeating label word itself if it starts with it (e.g. "Water when..." -> "when...")
  const repeatRegex = new RegExp(`^\\s*${labelEscaped}\\b\\s*`, 'i');
  clean = clean.replace(repeatRegex, "");

  // Clean up any remaining leading punctuation/spaces
  clean = clean.replace(/^\s*[:;,-]+\s*/, "");

  // Capitalize first letter
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean;
}

function parseCareNotes(notes?: string): ParsedCareNote[] {
  if (!notes) return [];
  const sentences = notes
    .split(/(?:\.(?=\s|$)|;|\n)+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const rawItems = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();

    // AI Diagnostics Check
    if (
      lower.includes("match:") ||
      lower.includes("confidence") ||
      lower.includes("leafy ai") ||
      lower.includes("identified") ||
      lower.includes("scan") ||
      lower.includes("safety") ||
      lower.includes("safe to sell")
    ) {
      return { emoji: "🧠", label: "AI Diagnostics", value: sentence, type: "ai" as const };
    }

    if (lower.includes("water") || lower.includes("watering") || lower.includes("wet")) {
      return { emoji: "💧", label: "Water", value: sentence, type: "water" as const };
    }
    if (lower.includes("light") || lower.includes("sun") || lower.includes("shade") || lower.includes("indirect") || lower.includes("direct")) {
      return { emoji: "☀️", label: "Light", value: sentence, type: "light" as const };
    }
    if (lower.includes("listed") || lower.includes("php") || lower.includes("price") || lower.includes("sell") || lower.includes("cutting") || lower.includes("cost") || lower.includes("buy")) {
      return { emoji: "💰", label: "Market", value: sentence, type: "market" as const };
    }
    if (lower.includes("wipe") || lower.includes("clean") || lower.includes("dust") || lower.includes("monthly") || lower.includes("mist") || lower.includes("fertiliz") || lower.includes("feed")) {
      return { emoji: "🌱", label: "Care", value: sentence, type: "care" as const };
    }
    return { emoji: "📋", label: "General", value: sentence, type: "general" as const };
  });

  const finalItems: ParsedCareNote[] = [];
  const aiSentences: string[] = [];

  for (const item of rawItems) {
    if (item.type === "ai") {
      aiSentences.push(item.value);
    }
  }

  if (aiSentences.length > 0) {
    const cleanedAiSentences = aiSentences.map(s => cleanValue(s, "AI Diagnostics"));
    const joinedValue = cleanedAiSentences.join(". ");
    finalItems.push({
      emoji: "🧠",
      label: "AI Diagnostics",
      value: joinedValue
    });
  }

  for (const item of rawItems) {
    if (item.type !== "ai") {
      finalItems.push({
        emoji: item.emoji,
        label: item.label,
        value: cleanValue(item.value, item.label)
      });
    }
  }

  return finalItems;
}

const { width: SCREEN_W } = Dimensions.get("window");
const COVER_HEIGHT = 220;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_W - 32 - CARD_GAP) / 2;

const CATEGORIES = ["All", "Indoor", "Outdoor", "Vegetables", "Root Crops", "Fruit Trees", "Rare", "Flowering", "Medicinal", "Succulents", "Herbs", "Ornamental"];
const CONDITIONS = ["Healthy", "Thriving", "Needs Water", "Needs Care", "Blooming", "Growing"];
const GARDEN_CACHE_MAX_AGE_MS = 1000 * 60 * 20;

type GardenCachePayload = {
  garden: Garden;
  plants: GardenPlant[];
};

type GardenScreenProps = {
  onOpenChat?: (conversationId: string, title: string) => void;
  onOpenListingDetail?: (listingId: string) => void;
};

export function GardenScreen({ onOpenChat, onOpenListingDetail }: GardenScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { gardenActiveSubTab: activeTab, setGardenActiveSubTab: setActiveTab } = useNavigationContext();
  const [garden, setGarden] = useState<Garden | null>(null);
  const [plants, setPlants] = useState<GardenPlant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [coverIndex, setCoverIndex] = useState(0);
  const coverScrollRef = useRef<ScrollView>(null);

  // Add plant modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [plantName, setPlantName] = useState("");
  const [category, setCategory] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [condition, setCondition] = useState("Healthy");
  const [careNotes, setCareNotes] = useState("");
  const [plantPhoto, setPlantPhoto] = useState<PickedImage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<LeafyScanResult | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Identify / Leafy Scan Modal State
  const [showIdentifySourcePicker, setShowIdentifySourcePicker] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerPhoto, setScannerPhoto] = useState<PickedImage | null>(null);
  const [isScanningScanner, setIsScanningScanner] = useState(false);
  const [scannerResult, setScannerResult] = useState<LeafyScanResult | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Plant options sheet
  const [plantOptionsTarget, setPlantOptionsTarget] = useState<GardenPlant | null>(null);
  const [showPlantOptions, setShowPlantOptions] = useState(false);
  const [isDeletingPlant, setIsDeletingPlant] = useState(false);

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);

  // Plant detail modal
  const [detailModalPlant, setDetailModalPlant] = useState<GardenPlant | null>(null);

  // Edit garden modal state
  const [showEditGardenModal, setShowEditGardenModal] = useState(false);
  const [editGardenName, setEditGardenName] = useState("");
  const [editGardenBio, setEditGardenBio] = useState("");
  const [editGardenIsPublic, setEditGardenIsPublic] = useState(true);
  const [isSavingGarden, setIsSavingGarden] = useState(false);
  const [isUploadingGardenCover, setIsUploadingGardenCover] = useState(false);

  // Pull-to-refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadGarden(options: { silent?: boolean } = {}) {
    if (!user) return;
    setIsLoading(options.silent ? false : !garden && plants.length === 0);
    setError(null);
    try {
      const g = await getOrCreateMyGarden(user.id);
      const p = await getGardenPlants(g.id);
      setGarden(g);
      setPlants(p);
      writeFastCache<GardenCachePayload>(`garden:${user.id}:v1`, { garden: g, plants: p }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load garden.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateThenRefresh() {
      if (!user) return;
      const cached = await readFastCache<GardenCachePayload>(`garden:${user.id}:v1`, GARDEN_CACHE_MAX_AGE_MS);
      if (cached && isMounted) {
        setGarden(cached.garden);
        setPlants(cached.plants);
        setIsLoading(false);
      }

      if (isMounted) {
        loadGarden({ silent: !!cached }).catch(() => {});
      }
    }

    hydrateThenRefresh();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  function resetForm() {
    setPlantName(""); setCategory(""); setScientificName("");
    setCondition("Healthy"); setCareNotes(""); setPlantPhoto(null);
    setScanResult(null); setScanMessage(null);
    setIsEditMode(false); setEditingPlantId(null);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadGarden();
    setIsRefreshing(false);
  }

  async function handlePickPlantPhoto() {
    try {
      const photo = await pickImageFromLibrary();
      if (photo) { setPlantPhoto(photo); setScanResult(null); setScanMessage(null); }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to pick photo."); }
  }

  async function handleScanPhoto() {
    if (!plantPhoto) return;
    setIsScanning(true); setScanMessage(null); setError(null);
    try {
      const result = await scanPlantWithLeafy(plantPhoto);
      setScanResult(result);
      setPlantName(result.bestMatch);
      setScientificName(result.scientificName || "");
      setCategory(result.category);
      setCondition("Healthy");
      setCareNotes(buildCareNotesFromScan(result));
      setScanMessage("Plant identified!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Leafy AI scan failed.");
    } finally { setIsScanning(false); }
  }

  async function handleIdentifyPlant(source: "camera" | "library") {
    setError(null);
    setShowIdentifySourcePicker(false);
    try {
      const photo = source === "camera" ? await takePhotoWithCamera() : await pickImageFromLibrary();
      if (!photo) return;

      setScannerPhoto(photo);
      setScannerResult(null);
      setScannerError(null);
      setShowScannerModal(true);
      setIsScanningScanner(true);

      const result = await scanPlantWithLeafy(photo);
      setScannerResult(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Leafy AI scan failed.";
      setScannerError(message);
      setShowScannerModal(true);
    } finally {
      setIsScanningScanner(false);
    }
  }

  async function handleSavePlant() {
    if (!user || !plantName.trim()) return;
    setIsSaving(true); setError(null);
    try {
      const uploaded = plantPhoto
        ? await uploadPublicImage("garden-photos", user.id, "plants", plantPhoto)
        : null;

      if (isEditMode && editingPlantId) {
        await updateGardenPlant(editingPlantId, user.id, {
          name: plantName.trim(),
          scientificName: scientificName.trim() || null,
          category: category.trim() || null,
          condition: condition.trim() || null,
          careNotes: careNotes.trim() || null,
          photoPath: uploaded?.path ?? null,
        });
      } else {
        if (!garden) return;
        await createGardenPlant(
          user.id, garden.id, plantName.trim(), uploaded?.path,
          category.trim(), scientificName.trim(), condition.trim(), careNotes.trim()
        );
      }
      resetForm();
      setShowAddModal(false);
      await loadGarden();
    } catch (e) {
      setError(e instanceof Error ? e.message : isEditMode ? "Unable to update plant." : "Unable to add plant.");
    } finally { setIsSaving(false); }
  }

  async function handleDeletePlant(plantId: string) {
    if (!supabase) return;
    setIsDeletingPlant(true);
    try {
      await supabase.from("garden_plants").delete().eq("id", plantId);
      setShowPlantOptions(false);
      setPlantOptionsTarget(null);
      await loadGarden();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete plant.");
    } finally {
      setIsDeletingPlant(false);
    }
  }

  function handleOpenEditGarden() {
    if (!garden) return;
    setEditGardenName(garden.name ?? "My Plant Collection");
    setEditGardenBio(garden.bio ?? "");
    setEditGardenIsPublic(garden.isPublic ?? true);
    setShowEditGardenModal(true);
  }

  async function handleSaveGarden() {
    if (!user || !garden) return;
    setIsSavingGarden(true);
    try {
      await updateGarden(garden.id, user.id, {
        name: editGardenName.trim(),
        bio: editGardenBio.trim() || null,
        isPublic: editGardenIsPublic,
      });
      await loadGarden();
      setShowEditGardenModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save garden settings.");
    } finally {
      setIsSavingGarden(false);
    }
  }

  async function handleUpdateGardenCover() {
    if (!user || !garden) return;
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      setIsUploadingGardenCover(true);
      const uploaded = await uploadPublicImage("garden-photos", user.id, "covers", picked);
      await updateGarden(garden.id, user.id, {
        coverPhotoUrl: uploaded.publicUrl,
      });
      await loadGarden();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update cover photo.");
    } finally {
      setIsUploadingGardenCover(false);
    }
  }

  // Cover carousel images — use plant photos if available, else default covers
  const DEFAULT_COVERS = [
    "https://images.unsplash.com/photo-1545241047-6083a3684587?q=80&w=600&auto=format&fit=crop", // Beautiful plant shelf
    "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=600&auto=format&fit=crop", // Indoor plant collection shelf
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop", // Veggie garden landscape greenhouse
    "https://images.unsplash.com/photo-1592150621744-aca64f48394a?q=80&w=600&auto=format&fit=crop", // Monstera/aroid indoor shelf
    "https://images.unsplash.com/photo-1530968033775-2c9273f0865e?q=80&w=600&auto=format&fit=crop", // Patio garden setup
    "https://images.unsplash.com/photo-1558905619-8714cdb4b2db?q=80&w=600&auto=format&fit=crop", // Conservatory lush indoor garden
    "https://images.unsplash.com/photo-1512428813824-f7258347e62a?q=80&w=600&auto=format&fit=crop"  // Sunny shelf with pots
  ];

  function getDefaultCover(uid?: string) {
    if (!uid) return DEFAULT_COVERS[0];
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % DEFAULT_COVERS.length;
    return DEFAULT_COVERS[idx];
  }

  const DEFAULT_COVER = getDefaultCover(user?.id);
  // Primary cover: use the garden's dedicated landscape cover photo, then plant photos as extra slides
  const primaryCover = garden?.coverPhotoUrl || DEFAULT_COVER;
  const plantPhotos = plants.filter((p) => p.photoUrl).map((p) => p.photoUrl!);
  const coverImages = [primaryCover, ...plantPhotos];

  function handleCoverScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setCoverIndex(idx);
  }

  function scrollCover(dir: 1 | -1) {
    const next = Math.max(0, Math.min(coverImages.length - 1, coverIndex + dir));
    coverScrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
    setCoverIndex(next);
  }

  // Filter plants by category
  const filtered = activeCategory === "All"
    ? plants
    : plants.filter((p) => (p.category ?? "").toLowerCase() === activeCategory.toLowerCase());

  const activeListingsCount = plants.length;
  const gardenScoreLabel = "9.1k";
  const communityRankLabel = "Rank #2";
  const statsRow = [
    { label: "Garden score", value: gardenScoreLabel },
    { label: "Active listings", value: activeListingsCount.toString() },
    { label: "Updates", value: plants.length.toString() },
  ];

  function formatList(values?: string[]) {
    return values && values.length > 0 ? values.join(", ") : "Not available";
  }

  function getSaleStatusLabel(status?: LeafyScanResult["saleStatus"]) {
    if (status === "safe_to_sell") return "Safe to sell";
    if (status === "review_required") return "Review required";
    if (status === "blocked") return "Blocked";
    return "Not available";
  }

  function buildCareNotesFromScan(result: LeafyScanResult) {
    const care = result.careProfile;
    const details = [
      care?.watering ? `Water: ${care.watering}` : null,
      care?.sunlight ? `Light: ${care.sunlight}` : null,
      care?.soil ? `Soil: ${care.soil}` : null,
      care?.toxicity ? `Toxicity: ${care.toxicity}` : null,
    ].filter(Boolean);

    return [
      `Match: ${result.bestMatch} (${result.confidence}% confidence)`,
      ...details.map((detail) => `• ${detail}`),
    ].join("\n");
  }

  // ─────────────────────────────────────────────────────
  return (
    <Screen showHeader={false} scroll={false} noPadding={true}>
      {/* ── Tab switcher (top) ── */}
      <View style={[styles.topTabs, { paddingTop: Math.max(22, 12 + insets.top) }]}>
        {(["discover", "my_garden", "ranking"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.topTab, activeTab === tab && styles.topTabActive]}
          >
            <Text style={[styles.topTabText, activeTab === tab && styles.topTabTextActive]}>
              {tab === "my_garden" ? "My Garden" : tab === "ranking" ? "Ranking" : "Discover"}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "discover" ? (
        <DiscoverGardensScreen
          currentGardenId={garden?.id}
          onOpenChat={onOpenChat}
          onOpenListingDetail={onOpenListingDetail}
        />
      ) : activeTab === "ranking" ? (
        <RankingsScreen embedded onOpenChat={onOpenChat} onOpenListingDetail={onOpenListingDetail} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.green}
              colors={[colors.green]}
            />
          }
        >
          {/* ══ Cover Carousel ══════════════════════════════ */}
          <View style={styles.coverWrap}>
            <ScrollView
              ref={coverScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleCoverScroll}
              scrollEventThrottle={16}
            >
              {coverImages.map((uri, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.coverSlide,
                    Platform.OS === "web" && uri
                      ? ({
                          backgroundImage: `url('${uri}')`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        } as any)
                      : {},
                  ]}
                >
                  {Platform.OS !== "web" && uri && (
                    <ImageBackground
                      source={{ uri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.coverOverlay} />
                </View>
              ))}
            </ScrollView>

            {/* Carousel Pagination Dots */}
            {coverImages.length > 1 && (
              <View style={styles.dotsContainer}>
                {coverImages.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === coverIndex ? styles.dotActive : styles.dotInactive
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Camera button */}
            <Pressable
              onPress={handleUpdateGardenCover}
              disabled={isUploadingGardenCover}
              style={[styles.coverCameraBtn, isUploadingGardenCover && { opacity: 0.5 }]}
            >
              {isUploadingGardenCover ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <MaterialCommunityIcons name="camera-outline" size={17} color={colors.white} />
              )}
            </Pressable>

            {/* Scrim gradient overlay for text protection */}
            <View style={styles.scrimOverlay} />

            {/* Title overlay */}
            <View style={styles.coverTitle}>
              <Text style={styles.coverTitleText}>{garden?.name ?? "My Plant Collection"}</Text>
              <Text style={styles.coverSubText}>
                {communityRankLabel} Gardener - {gardenScoreLabel} Score
              </Text>
              <View style={styles.coverMetaRow}>
                <View style={styles.publicPill}>
                  <MaterialCommunityIcons
                    name={garden?.isPublic ? "earth" : "lock-outline"}
                    size={12}
                    color={colors.white}
                  />
                  <Text style={styles.publicPillText}>{garden?.isPublic ? "Public garden" : "Private garden"}</Text>
                </View>
                <Pressable onPress={handleOpenEditGarden} style={styles.editGardenPill}>
                  <MaterialCommunityIcons name="pencil-outline" size={12} color={colors.white} />
                  <Text style={styles.editGardenPillText}>Edit garden</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* ══ Stats row ═══════════════════════════════════ */}
          <View style={styles.statsCard}>
            {statsRow.map(({ label, value }, i) => (
              <View key={label} style={[styles.statCell, i < 2 && styles.statCellBorder]}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* ══ Plant Collection section ═════════════════════ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plant collection</Text>

            {/* Category chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              style={styles.chipScroll}
            >
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[styles.chip, activeCategory === cat && styles.chipActive]}
                >
                  <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Add plant + Identify plant buttons row */}
            {plants.length > 0 && (
              <View style={styles.actionBtnRow}>
                <Pressable
                  onPress={() => { resetForm(); setShowAddModal(true); }}
                  style={({ pressed }) => [styles.actionHalfBtn, pressed && { opacity: 0.8 }]}
                >
                  <MaterialCommunityIcons name="plus" size={18} color={colors.greenMid} />
                  <Text style={styles.addBtnText}>Add plant</Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowIdentifySourcePicker(true)}
                  style={({ pressed }) => [styles.actionHalfBtn, pressed && { opacity: 0.8 }]}
                >
                  <MaterialCommunityIcons name="leaf-circle-outline" size={18} color={colors.greenMid} />
                  <Text style={styles.addBtnText}>Identify plant</Text>
                </Pressable>
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.errorText} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Loading */}
            {isLoading && (
              <View style={styles.center}>
                <ActivityIndicator color={colors.green} size="large" />
              </View>
            )}

            {/* Empty */}
            {!isLoading && plants.length === 0 && (
              <View style={styles.emptyGardenPanel}>
                <View style={styles.emptyGardenIcon}>
                  <MaterialCommunityIcons name="flower-outline" size={34} color={colors.green} />
                </View>
                <Text style={styles.emptyGardenTitle}>Start your garden</Text>
                <Text style={styles.emptyGardenText}>
                  Add plants to build trust, track care, and show buyers what you grow.
                </Text>
                <Pressable
                  onPress={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                  style={styles.emptyPrimaryBtn}
                >
                  <MaterialCommunityIcons name="plus" size={18} color={colors.white} />
                  <Text style={styles.emptyPrimaryText}>Add first plant</Text>
                </Pressable>
                <Pressable onPress={() => setShowIdentifySourcePicker(true)} style={styles.emptySecondaryBtn}>
                  <MaterialCommunityIcons name="leaf-circle-outline" size={18} color={colors.green} />
                  <Text style={styles.emptySecondaryText}>Identify with Leafy AI</Text>
                </Pressable>
              </View>
            )}

            {!isLoading && plants.length > 0 && filtered.length === 0 && (
              <EmptyState
                icon="flower-outline"
                title={`No ${activeCategory.toLowerCase()} plants`}
                description={`You haven't added any plants under the ${activeCategory} category yet.`}
                buttonLabel="Add a plant"
                onButtonPress={() => {
                  resetForm();
                  setCategory(activeCategory === "All" ? "" : activeCategory);
                  setShowAddModal(true);
                }}
              />
            )}

            {/* Plant grid */}
            {!isLoading && filtered.length > 0 && (
              <View style={styles.grid}>
                {filtered.map((plant) => (
                  <Pressable
                    key={plant.id}
                    style={styles.plantCard}
                    onPress={() => setDetailModalPlant(plant)}
                  >
                    {plant.photoUrl ? (
                      <Image source={{ uri: plant.photoUrl }} style={styles.plantPhoto} resizeMode="cover" />
                    ) : (
                      <View style={[styles.plantPhoto, styles.plantPhotoFallback]}>
                        <MaterialCommunityIcons name="flower-outline" size={36} color={colors.greenMuted} />
                      </View>
                    )}
                    <View style={styles.plantCardInfo}>
                      <View style={styles.plantCardRow}>
                        <Text style={styles.plantCardName} numberOfLines={1}>{plant.name}</Text>
                        <Pressable
                          onPress={(e) => { e.stopPropagation?.(); setPlantOptionsTarget(plant); setShowPlantOptions(true); }}
                          hitSlop={6}
                          style={styles.plantCardMenuBtn}
                        >
                          <MaterialCommunityIcons name="dots-vertical" size={16} color={colors.textTertiary} />
                        </Pressable>
                      </View>
                      {plant.category ? (
                        <Text style={styles.plantCardCat} numberOfLines={1}>{plant.category}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
                {/* Spacer for odd count */}
                {filtered.length % 2 !== 0 && <View style={{ width: CARD_WIDTH }} />}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════
          PLANT OPTIONS BOTTOM SHEET
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={showPlantOptions}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPlantOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowPlantOptions(false)} />
          <View style={styles.optionsSheet}>
            <View style={styles.optionsHandle} />
            {plantOptionsTarget && (
              <Text style={styles.optionsPlantName} numberOfLines={1}>
                {plantOptionsTarget.name}
              </Text>
            )}
            <Pressable
              onPress={() => {
                setShowPlantOptions(false);
                if (plantOptionsTarget) {
                  setIsEditMode(true);
                  setEditingPlantId(plantOptionsTarget.id);
                  setPlantName(plantOptionsTarget.name);
                  setScientificName(plantOptionsTarget.scientificName ?? "");
                  setCategory(plantOptionsTarget.category ?? "");
                  setCondition(plantOptionsTarget.condition ?? "Healthy");
                  setCareNotes(plantOptionsTarget.careNotes ?? "");
                  setPlantPhoto(null);
                  setScanResult(null);
                  setScanMessage(null);
                  setShowAddModal(true);
                }
              }}
              style={styles.optionBtn}
            >
              <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.optionBtnText}>Edit Plant</Text>
            </Pressable>
            <Pressable
              onPress={() => plantOptionsTarget && handleDeletePlant(plantOptionsTarget.id)}
              style={styles.optionBtn}
              disabled={isDeletingPlant}
            >
              {isDeletingPlant ? (
                <ActivityIndicator size={16} color="#ef4444" />
              ) : (
                <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
              )}
              <Text style={styles.optionBtnTextDanger}>Delete Plant</Text>
            </Pressable>
            <Pressable onPress={() => setShowPlantOptions(false)} style={[styles.optionBtn, styles.optionCancelBtn]}>
              <Text style={styles.optionCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          ADD PLANT MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => !isSaving && setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          style={styles.modalKeyboardAvoider}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => !isSaving && setShowAddModal(false)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditMode ? "Edit Plant" : "Add a Plant"}</Text>
                <Pressable onPress={() => { if (!isSaving) { setShowAddModal(false); resetForm(); } }} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.greenMuted} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
              {/* Photo + Leafy AI */}
              <View style={styles.photoRow}>
                <Pressable onPress={handlePickPlantPhoto} style={styles.photoBox}>
                  {plantPhoto ? (
                    <Image source={{ uri: plantPhoto.uri }} style={styles.photoPreview} />
                  ) : (
                    <View style={styles.photoEmpty}>
                      <MaterialCommunityIcons name="camera-plus-outline" size={30} color={colors.greenMuted} />
                      <Text style={styles.photoEmptyText}>Add photo</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleScanPhoto}
                  disabled={!plantPhoto || isScanning}
                  style={[styles.scanBtn, (!plantPhoto || isScanning) && { opacity: 0.4 }]}
                >
                  {isScanning ? (
                    <ActivityIndicator color={colors.white} size={14} />
                  ) : (
                    <MaterialCommunityIcons name="leaf-circle-outline" size={16} color={colors.white} />
                  )}
                  <Text style={styles.scanBtnText}>
                    {isScanning ? "Scanning..." : "Scan with Leafy AI"}
                  </Text>
                </Pressable>
              </View>

              {scanResult && (
                <View style={styles.scanResult}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#16a34a" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scanName}>{scanResult.bestMatch}</Text>
                    {scanResult.scientificName && (
                      <Text style={styles.scanSci}>{scanResult.scientificName}</Text>
                    )}
                  </View>
                  <View style={styles.confBadge}>
                    <Text style={styles.confText}>{scanResult.confidence}%</Text>
                  </View>
                </View>
              )}

              {/* Fields */}
              <View style={styles.fields}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Plant Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Monstera"
                    placeholderTextColor={colors.textTertiary}
                    value={plantName}
                    onChangeText={setPlantName}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Scientific Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Monstera deliciosa"
                    placeholderTextColor={colors.textTertiary}
                    value={scientificName}
                    onChangeText={setScientificName}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Root Crops, Vegetables, Fruit Trees"
                    placeholderTextColor={colors.textTertiary}
                    value={category}
                    onChangeText={setCategory}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Condition</Text>
                  <View style={styles.condScrollWrap}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.condChipRow}
                    >
                      {CONDITIONS.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => setCondition(c)}
                          style={[styles.condChip, condition === c && styles.condChipActive]}
                        >
                          <Text style={[styles.condChipText, condition === c && styles.condChipTextActive]}>
                            {c}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <View pointerEvents="none" style={styles.condScrollFade} />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Care Notes</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 72 }]}
                    placeholder="Watering schedule, light needs..."
                    placeholderTextColor={colors.textTertiary}
                    value={careNotes}
                    onChangeText={setCareNotes}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <Pressable
                onPress={handleSavePlant}
                disabled={isSaving || !plantName.trim()}
                style={[styles.saveBtn, (isSaving || !plantName.trim()) && { opacity: 0.4 }]}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.white} size={16} />
                ) : (
                  <>
                    <MaterialCommunityIcons name={isEditMode ? "content-save-outline" : "flower-outline"} size={17} color={colors.white} />
                    <Text style={styles.saveBtnText}>{isEditMode ? "Save Changes" : "Add to Garden"}</Text>
                  </>
                )}
              </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════
          IDENTIFY PLANT (LEAFY AI) MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={showIdentifySourcePicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowIdentifySourcePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowIdentifySourcePicker(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Identify Plant</Text>
              <Pressable onPress={() => setShowIdentifySourcePicker(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.greenMuted} />
              </Pressable>
            </View>

            <View style={styles.identifyChoiceGrid}>
              <Pressable
                onPress={() => handleIdentifyPlant("camera")}
                style={({ pressed }) => [styles.identifyChoiceCard, pressed && styles.identifyChoiceCardPressed]}
              >
                <View style={styles.identifyChoiceIcon}>
                  <MaterialCommunityIcons name="camera-outline" size={24} color={colors.green} />
                </View>
                <View style={styles.identifyChoiceCopy}>
                  <Text style={styles.identifyChoiceTitle}>Use camera</Text>
                  <Text style={styles.identifyChoiceText}>Take a fresh photo for Leafy AI.</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.greenMuted} />
              </Pressable>

              <Pressable
                onPress={() => handleIdentifyPlant("library")}
                style={({ pressed }) => [styles.identifyChoiceCard, pressed && styles.identifyChoiceCardPressed]}
              >
                <View style={styles.identifyChoiceIcon}>
                  <MaterialCommunityIcons name="image-plus-outline" size={24} color={colors.green} />
                </View>
                <View style={styles.identifyChoiceCopy}>
                  <Text style={styles.identifyChoiceTitle}>Upload photo</Text>
                  <Text style={styles.identifyChoiceText}>Choose an existing plant photo.</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.greenMuted} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showScannerModal}
        animationType="slide"
        transparent
        onRequestClose={() => !isScanningScanner && setShowScannerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !isScanningScanner && setShowScannerModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leafy AI Plant ID</Text>
              <Pressable onPress={() => !isScanningScanner && setShowScannerModal(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.greenMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scannerScrollContent}>
              {scannerPhoto && (
                <View style={styles.scannerPhotoContainer}>
                  <Image source={{ uri: scannerPhoto.uri }} style={styles.scannerPhotoPreview} />
                  {isScanningScanner && (
                    <View style={styles.scannerAnimationOverlay}>
                      <ActivityIndicator color={colors.white} size="large" />
                      <Text style={styles.scannerScanningText}>Scanning with Leafy AI...</Text>
                    </View>
                  )}
                </View>
              )}

              {scannerError && (
                <View style={styles.scannerErrorCard}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.errorText} />
                  <Text style={styles.scannerErrorText}>{scannerError}</Text>
                </View>
              )}

              {scannerResult && (
                <View style={styles.scannerResultCard}>
                  <View style={styles.scannerResultHeader}>
                    <View style={styles.scannerMatchIcon}>
                      <MaterialCommunityIcons name="leaf-circle-outline" size={22} color={colors.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scannerResultTitle}>{scannerResult.bestMatch}</Text>
                      {scannerResult.scientificName ? (
                        <Text style={styles.scannerResultSubtitle}>{scannerResult.scientificName}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.scannerMetricRow}>
                    <View style={styles.scannerConfidenceGauge}>
                      <Text style={styles.scannerGaugeValue}>{scannerResult.confidence}%</Text>
                      <Text style={styles.scannerGaugeLabel}>Match</Text>
                    </View>
                    <View style={styles.scannerStatusBadge}>
                      <MaterialCommunityIcons
                        name={scannerResult.saleStatus === "safe_to_sell" ? "shield-check-outline" : "shield-alert-outline"}
                        size={16}
                        color={scannerResult.saleStatus === "safe_to_sell" ? "#16a34a" : "#ca8a04"}
                      />
                      <Text
                        style={[
                          styles.scannerStatusText,
                          scannerResult.saleStatus !== "safe_to_sell" && { color: "#92400e" },
                        ]}
                      >
                        {getSaleStatusLabel(scannerResult.saleStatus)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scannerResultBody}>
                    {scannerResult.category && (
                      <View style={styles.scannerResultRow}>
                        <Text style={styles.scannerResultLabel}>Category</Text>
                        <Text style={styles.scannerResultVal}>{scannerResult.category}</Text>
                      </View>
                    )}

                    <View style={styles.scannerResultRow}>
                      <Text style={styles.scannerResultLabel}>Common Names</Text>
                      <Text style={styles.scannerResultVal}>{formatList(scannerResult.commonNames)}</Text>
                    </View>

                    <View style={styles.scannerResultRow}>
                      <Text style={styles.scannerResultLabel}>Family</Text>
                      <Text style={styles.scannerResultVal}>{scannerResult.family ?? "Not available"}</Text>
                    </View>

                    <View style={styles.scannerResultRow}>
                      <Text style={styles.scannerResultLabel}>Genus</Text>
                      <Text style={styles.scannerResultVal}>{scannerResult.genus ?? "Not available"}</Text>
                    </View>

                    <View style={styles.scannerResultRow}>
                      <Text style={styles.scannerResultLabel}>Source</Text>
                      <Text style={styles.scannerResultVal}>{scannerResult.provider}</Text>
                    </View>

                    <View style={styles.scannerResultNote}>
                      <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.green} />
                      <Text style={styles.scannerResultNoteText}>{scannerResult.reviewReason}</Text>
                    </View>

                    {scannerResult.careProfile && (
                      <View style={styles.careGuideCard}>
                        <View style={styles.careGuideHeader}>
                          <MaterialCommunityIcons name="sprout-outline" size={18} color={colors.green} />
                          <Text style={styles.careGuideTitle}>
                            Care guide from {scannerResult.careProfile.provider}
                          </Text>
                        </View>
                        {scannerResult.careProfile.summary && (
                          <Text style={styles.careGuideSummary}>{scannerResult.careProfile.summary}</Text>
                        )}
                        {[
                          ["Water", scannerResult.careProfile.watering],
                          ["Light", scannerResult.careProfile.sunlight],
                          ["Soil", scannerResult.careProfile.soil],
                          ["Growth", scannerResult.careProfile.growthHabit],
                          ["Propagation", scannerResult.careProfile.propagation],
                          ["Toxicity", scannerResult.careProfile.toxicity],
                        ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
                          <View key={label} style={styles.careGuideRow}>
                            <Text style={styles.careGuideLabel}>{label}</Text>
                            <Text style={styles.careGuideValue}>{value}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {typeof scannerResult.remainingRequests === "number" && (
                      <View style={styles.scannerResultRow}>
                        <Text style={styles.scannerResultLabel}>PlantNet Requests Left</Text>
                        <Text style={styles.scannerResultVal}>{scannerResult.remainingRequests}</Text>
                      </View>
                    )}

                    {scannerResult.alternativeMatches && scannerResult.alternativeMatches.length > 0 && (
                      <View style={styles.alternativeBlock}>
                        <Text style={styles.alternativeTitle}>Other possible matches</Text>
                        {scannerResult.alternativeMatches.map((match, index) => (
                          <View key={`${match.name}-${index}`} style={styles.alternativeItem}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.alternativeName}>{match.name}</Text>
                              {match.scientificName && (
                                <Text style={styles.alternativeSci}>{match.scientificName}</Text>
                              )}
                              <Text style={styles.alternativeMeta}>
                                {[match.family, match.genus].filter(Boolean).join(" / ") || "Taxonomy not available"}
                              </Text>
                            </View>
                            <Text style={styles.alternativeConfidence}>{match.confidence}%</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {scannerResult.scanLimit && (
                      <View style={styles.scanUsageCard}>
                        <View style={styles.scanUsageHeader}>
                          <Text style={styles.scanUsageLabel}>Scan usage</Text>
                          <Text style={styles.scanUsageText}>
                            {scannerResult.scanLimit.used}/{scannerResult.scanLimit.limit}
                          </Text>
                        </View>
                        <View style={styles.scanUsageTrack}>
                          <View
                            style={[
                              styles.scanUsageFill,
                              {
                                width: `${Math.min(
                                  100,
                                  (scannerResult.scanLimit.used / scannerResult.scanLimit.limit) * 100
                                )}%` as any,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.scannerActions}>
                {scannerResult && (
                  <Pressable
                    onPress={() => {
                      setPlantName(scannerResult.bestMatch);
                      setScientificName(scannerResult.scientificName || "");
                      setCategory(scannerResult.category || "");
                      setCondition("Healthy");
                      setCareNotes(buildCareNotesFromScan(scannerResult));
                      setPlantPhoto(scannerPhoto);
                      setShowScannerModal(false);
                      setShowAddModal(true);
                    }}
                    style={styles.scannerAddBtn}
                  >
                    <MaterialCommunityIcons name="flower-outline" size={18} color={colors.white} />
                    <Text style={styles.scannerAddBtnText}>Add to Garden</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => setShowIdentifySourcePicker(true)}
                  disabled={isScanningScanner}
                  style={styles.scannerRetryBtn}
                >
                  <MaterialCommunityIcons name="camera-outline" size={18} color={colors.green} />
                  <Text style={styles.scannerRetryBtnText}>Choose another photo</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          PLANT DETAIL MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={detailModalPlant !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setDetailModalPlant(null)}
      >
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailHeaderTitle} numberOfLines={1}>
              {detailModalPlant?.name}
            </Text>
            <Pressable onPress={() => setDetailModalPlant(null)} hitSlop={10} style={styles.detailCloseBtn}>
              <MaterialCommunityIcons name="close" size={22} color={colors.white} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
            {detailModalPlant?.photoUrl ? (
              <Image source={{ uri: detailModalPlant.photoUrl }} style={styles.detailPhoto} />
            ) : (
              <View style={styles.detailPhotoFallback}>
                <MaterialCommunityIcons name="flower" size={64} color="rgba(255,255,255,0.3)" />
              </View>
            )}

            <View style={styles.detailBody}>
              <Text style={styles.detailName}>{detailModalPlant?.name}</Text>
              {detailModalPlant?.category ? (
                <Text style={styles.detailSubtext}>{detailModalPlant.category}</Text>
              ) : null}

              <View style={styles.detailChipRow}>
                {detailModalPlant?.scientificName ? (
                  <View style={styles.detailChip}>
                    <MaterialCommunityIcons name="microscope" size={13} color={colors.green} />
                    <Text style={styles.detailChipText}>Scientific: {detailModalPlant.scientificName}</Text>
                  </View>
                ) : null}
                {detailModalPlant?.condition ? (
                  <View style={[styles.detailChip, { backgroundColor: "#dcfce7" }]}>
                    <MaterialCommunityIcons name="heart-pulse" size={13} color="#16a34a" />
                    <Text style={[styles.detailChipText, { color: "#16a34a" }]}>{detailModalPlant.condition}</Text>
                  </View>
                ) : null}
              </View>

              {detailModalPlant?.careNotes ? (
                <View style={styles.detailNotesBox}>
                  <Text style={styles.detailNotesLabel}>Care Notes</Text>
                  {parseCareNotes(detailModalPlant.careNotes).map((item, idx) => (
                    <View key={idx} style={styles.careNoteRow}>
                      <Text style={styles.careNoteEmoji}>{item.emoji}</Text>
                      <View style={styles.careNoteContent}>
                        <Text style={styles.careNoteLabel}>{item.label}</Text>
                        <Text style={styles.careNoteValue}>{item.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  setDetailModalPlant(null);
                  if (detailModalPlant) {
                    setIsEditMode(true);
                    setEditingPlantId(detailModalPlant.id);
                    setPlantName(detailModalPlant.name);
                    setScientificName(detailModalPlant.scientificName ?? "");
                    setCategory(detailModalPlant.category ?? "");
                    setCondition(detailModalPlant.condition ?? "Healthy");
                    setCareNotes(detailModalPlant.careNotes ?? "");
                    setPlantPhoto(null);
                    setScanResult(null);
                    setScanMessage(null);
                    setShowAddModal(true);
                  }
                }}
                style={styles.detailEditBtn}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.white} />
                <Text style={styles.detailEditBtnText}>Edit Plant</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ══ Edit Garden Modal ════════════════════════════ */}
      <Modal visible={showEditGardenModal} animationType="slide" transparent onRequestClose={() => setShowEditGardenModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          style={styles.modalKeyboardAvoider}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowEditGardenModal(false)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Garden</Text>
                <Pressable onPress={() => setShowEditGardenModal(false)} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.greenMuted} />
                </Pressable>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Garden Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={editGardenName}
                    onChangeText={setEditGardenName}
                    placeholder="e.g. My Plant Collection"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Garden Bio / Description</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 80 }]}
                    value={editGardenBio}
                    onChangeText={setEditGardenBio}
                    placeholder="Tell visitors about your garden collection..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Privacy Settings</Text>
                  <Pressable
                    onPress={() => setEditGardenIsPublic((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.privacyToggleBtn,
                      editGardenIsPublic ? styles.privacyBtnActive : styles.privacyBtnPrivate,
                      pressed && { opacity: 0.85 }
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={editGardenIsPublic ? "earth" : "lock-outline"}
                      size={18}
                      color={editGardenIsPublic ? colors.white : colors.green}
                    />
                    <Text style={editGardenIsPublic ? styles.privacyBtnActiveText : styles.privacyBtnPrivateText}>
                      {editGardenIsPublic ? "Public Garden (Anyone can view)" : "Private Garden (Only you can view)"}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleSaveGarden}
                  disabled={isSavingGarden || !editGardenName.trim()}
                  style={[styles.saveBtn, (isSavingGarden || !editGardenName.trim()) && { opacity: 0.4 }]}
                >
                  <Text style={styles.saveBtnText}>{isSavingGarden ? "Saving..." : "Save changes"}</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>

  );
}

const styles = StyleSheet.create({
  // ── Top tabs ──────────────────────────────────────────
  topTabs: {
    flexDirection: "row",
    backgroundColor: colors.cream,
    paddingHorizontal: 20,
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  topTab: {
    paddingBottom: 10,
    flexShrink: 1,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  topTabActive: { borderBottomColor: colors.green },
  topTabText: { fontSize: 14, fontWeight: "700", color: colors.textTertiary },
  topTabTextActive: { color: colors.green, fontWeight: "800" },

  scroll: { paddingBottom: 100 },

  // ── Cover carousel ────────────────────────────────────
  coverWrap: { height: COVER_HEIGHT, position: "relative", backgroundColor: colors.greenDark },
  coverSlide: { width: SCREEN_W, height: COVER_HEIGHT, backgroundColor: colors.greenDark },
  coverImg: { width: SCREEN_W, height: COVER_HEIGHT, resizeMode: "cover" },
  coverFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  paginationBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
    elevation: 10,
  },
  paginationText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  coverCameraBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 10,
  },
  coverArrow: {
    position: "absolute",
    top: "50%",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -16,
    zIndex: 10,
    elevation: 10,
  },
  coverArrowLeft: { left: 10 },
  coverArrowRight: { right: 10 },
  coverTitle: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 60,
    zIndex: 10,
    elevation: 10,
  },
  coverTitleText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coverSubText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  coverMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  publicPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  publicPillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  editGardenPill: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: radius.full,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editGardenPillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  scrimOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
    zIndex: 9,
    elevation: 9,
    ...Platform.select({
      web: {
        backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
      },
      default: {
        backgroundColor: "rgba(0,0,0,0.5)",
      }
    })
  },
  dotsContainer: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    zIndex: 10,
    elevation: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 14,
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    width: 6,
  },

  // ── Stats card ────────────────────────────────────────
  statsCard: {
    flexDirection: "row",
    backgroundColor: colors.surface0,
    marginHorizontal: 16,
    marginTop: -1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow.sm,
  },
  statCell: { flex: 1, alignItems: "center", paddingVertical: 14 },
  statCellBorder: { borderRightWidth: 1, borderRightColor: colors.line },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600", marginTop: 2 },

  // ── Section ───────────────────────────────────────────
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginBottom: 14 },

  // Category chips
  chipScroll: { marginHorizontal: -16 },
  chipRow: { gap: 8, paddingBottom: 14, paddingHorizontal: 16, paddingRight: 40 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface1,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  chipTextActive: { color: colors.white },

  // Add plant button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.lineMid,
    borderStyle: "dashed",
    paddingVertical: 13,
    marginBottom: 16,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: colors.greenMid },

  // Error / loading / empty
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  errorText: { color: colors.errorText, fontSize: 13, fontWeight: "600", flex: 1 },
  center: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  emptyGardenPanel: {
    alignItems: "center",
    backgroundColor: colors.surface0,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 18,
    ...shadow.sm,
  },
  emptyGardenIcon: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  emptyGardenTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
  },
  emptyGardenText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  emptyPrimaryBtn: {
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: radius.full,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 20,
    width: "100%",
  },
  emptyPrimaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  emptySecondaryBtn: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderColor: colors.lineMid,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 20,
    width: "100%",
  },
  emptySecondaryText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "900",
  },

  // Plant grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  plantCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface0,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
  },
  plantPhoto: {
    width: "100%",
    aspectRatio: 0.9,
    backgroundColor: colors.surface1,
    resizeMode: "cover",
    ...(Platform.OS === "web" ? { objectFit: "cover" as any } : {}),
  },
  plantPhotoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  plantCardInfo: { padding: 10 },
  plantCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  plantCardCat: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "600",
    marginTop: 2,
  },

  // ── Modal ─────────────────────────────────────────────
  modalKeyboardAvoider: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surface0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingBottom: 56,
    marginBottom: -24,
    maxHeight: "92%",
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalHandle: {
    width: 36, height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  identifyChoiceGrid: {
    gap: 12,
    paddingBottom: 12,
  },
  identifyChoiceCard: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  identifyChoiceCardPressed: {
    opacity: 0.75,
  },
  identifyChoiceIcon: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: radius.full,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  identifyChoiceCopy: {
    flex: 1,
  },
  identifyChoiceTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  identifyChoiceText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  // Photo section
  photoRow: { flexDirection: "row", gap: 10, alignItems: "stretch", marginBottom: 14 },
  photoBox: {
    width: 100, height: 100,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface1,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: "dashed",
  },
  photoPreview: { width: "100%", height: "100%" },
  photoEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  photoEmptyText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textAlign: "center" },

  scanBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.greenMid,
    borderRadius: radius.md,
    padding: 12,
  },
  scanBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },

  scanResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  scanName: { fontSize: 14, fontWeight: "700", color: "#15803d" },
  scanSci: { fontSize: 12, fontStyle: "italic", color: "#166534" },
  confBadge: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  confText: { fontSize: 12, fontWeight: "800", color: colors.white },

  // Fields
  fields: { gap: 14, marginBottom: 16 },
  field: { gap: 5 },
  fieldLabel: {
    fontSize: 12, fontWeight: "700", color: colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    color: colors.textPrimary,
    fontSize: 14, fontWeight: "600",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  condChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface1,
    borderWidth: 1.5, borderColor: colors.line,
  },
  condChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  condChipText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  condChipTextActive: { color: colors.white },
  condScrollWrap: {
    position: "relative",
  },
  condChipRow: {
    gap: 8,
    paddingRight: 32,
  },
  condScrollFade: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: 32,
    ...Platform.select({
      web: {
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0), ${colors.surface0} 72%)`,
      } as any,
      default: {
        backgroundColor: "rgba(255,255,255,0.72)",
      },
    }),
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: radius.full,
    paddingVertical: 14,
    marginBottom: 8,
  },
  saveBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },

  // ── Action Row layout split ──
  actionBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionHalfBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.lineMid,
    borderStyle: "dashed",
    paddingVertical: 13,
  },

  // ── Scanner overlay and modalities ──
  scannerPhotoContainer: {
    width: "100%",
    height: 240,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
    backgroundColor: colors.surface1,
  },
  scannerPhotoPreview: {
    width: "100%",
    height: "100%",
  },
  scannerAnimationOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  scannerScanningText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  scannerErrorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.error,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  scannerErrorText: {
    color: colors.errorText,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  scannerResultCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 16,
  },
  scannerScrollContent: {
    paddingBottom: 20,
  },
  scannerResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  scannerMatchIcon: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  scannerResultTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.green,
  },
  scannerResultSubtitle: {
    color: colors.greenMuted,
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "700",
    marginTop: 2,
  },
  scannerMetricRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  scannerConfidenceGauge: {
    alignItems: "center",
    backgroundColor: "#dcfce7",
    borderColor: "#bbf7d0",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    minWidth: 76,
    paddingHorizontal: 10,
  },
  scannerGaugeValue: {
    color: "#166534",
    fontSize: 16,
    fontWeight: "900",
  },
  scannerGaugeLabel: {
    color: "#15803d",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 1,
    textTransform: "uppercase",
  },
  scannerStatusBadge: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 12,
  },
  scannerStatusText: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "900",
  },
  scannerResultBody: {
    gap: 8,
  },
  scannerResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  scannerResultLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    flex: 0.9,
  },
  scannerResultVal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1.2,
    textAlign: "right",
  },
  scannerResultValBold: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.green,
    flex: 1.2,
    textAlign: "right",
  },
  scannerResultNote: {
    alignItems: "flex-start",
    backgroundColor: colors.surface0,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  scannerResultNoteText: {
    color: colors.green,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  careGuideCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
    padding: 12,
  },
  careGuideHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  careGuideTitle: {
    color: colors.green,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  careGuideSummary: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  careGuideRow: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 3,
    paddingTop: 8,
  },
  careGuideLabel: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  careGuideValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  scannerConfBadge: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  scannerConfText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.white,
  },
  scanUsageCard: {
    backgroundColor: colors.surface0,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 4,
    padding: 10,
  },
  scanUsageHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  scanUsageLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  scanUsageText: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  scanUsageTrack: {
    backgroundColor: colors.sage,
    borderRadius: 999,
    height: 5,
    overflow: "hidden",
  },
  scanUsageFill: {
    backgroundColor: colors.green,
    borderRadius: 999,
    height: "100%",
  },
  alternativeBlock: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 8,
    marginTop: 4,
    paddingTop: 12,
  },
  alternativeTitle: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  alternativeItem: {
    alignItems: "center",
    backgroundColor: colors.surface0,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10,
  },
  alternativeName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  alternativeSci: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: "italic",
    fontWeight: "700",
    marginTop: 2,
  },
  alternativeMeta: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  alternativeConfidence: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  scannerActions: {
    gap: 10,
    marginBottom: 16,
  },
  scannerAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: radius.full,
    paddingVertical: 14,
  },
  scannerAddBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  scannerRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.lineMid,
    paddingVertical: 14,
  },
  scannerRetryBtnText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "800",
  },

  // Plant card 3-dots
  plantCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plantCardMenuBtn: { padding: 2 },

  // Plant options bottom sheet
  optionsSheet: {
    backgroundColor: colors.surface0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    width: "100%",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionsHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  optionsPlantName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: "center",
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  optionBtnTextDanger: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ef4444",
  },
  optionCancelBtn: {
    justifyContent: "center",
    backgroundColor: colors.surface1,
    borderColor: "transparent",
    marginTop: 4,
  },
  optionCancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textSecondary,
    textAlign: "center",
  },

  // ── Plant Detail Modal ────────────────────────────────
  detailContainer: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  detailHeader: {
    backgroundColor: colors.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  detailHeaderTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
    flex: 1,
    marginRight: 12,
  },
  detailCloseBtn: {
    padding: 4,
  },
  detailScroll: {
    paddingBottom: 64,
  },
  detailPhoto: {
    width: "100%",
    height: 280,
    backgroundColor: colors.surface1,
  },
  detailPhotoFallback: {
    width: "100%",
    height: 200,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  detailBody: {
    padding: 20,
    gap: 12,
  },
  detailName: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.green,
  },
  detailSci: {
    fontSize: 14,
    fontStyle: "italic",
    color: colors.greenMuted,
    fontWeight: "600",
  },
  detailChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  detailChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.green,
  },
  detailSubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 4,
  },
  detailNotesBox: {
    backgroundColor: "transparent",
    padding: 0,
    marginTop: 8,
  },
  detailNotesLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  careNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
  },
  careNoteEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  careNoteContent: {
    flex: 1,
  },
  careNoteLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.greenMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  careNoteValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 2,
  },
  detailEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: radius.full,
    paddingVertical: 14,
    marginTop: 8,
  },
  detailEditBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  privacyToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginTop: 6,
    marginBottom: 16,
  },
  privacyBtnActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  privacyBtnPrivate: {
    backgroundColor: colors.surface1,
    borderColor: colors.line,
  },
  privacyBtnActiveText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  privacyBtnPrivateText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "700",
  },
});
