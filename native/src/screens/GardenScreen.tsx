import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import {
  createGardenPlant,
  getGardenPlants,
  getOrCreateMyGarden,
  type Garden,
  type GardenPlant,
} from "../services/gardens";
import { scanPlantWithLeafy, type LeafyScanResult } from "../services/leafyScan";
import { pickImageFromLibrary, takePhotoWithCamera, uploadPublicImage, type PickedImage } from "../services/storage";
import { colors, radius, shadow, fontSize } from "../theme/colors";
import { DiscoverGardensScreen } from "./DiscoverGardensScreen";
import { supabase } from "../services/supabase";

const { width: SCREEN_W } = Dimensions.get("window");
const COVER_HEIGHT = 220;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_W - 32 - CARD_GAP) / 2;

const CATEGORIES = ["All", "Indoor", "Outdoor", "Rare", "Flowering", "Succulents", "Herbs"];
const CONDITIONS = ["Healthy", "Thriving", "Needs Water", "Needs Care", "Blooming", "Growing"];

export function GardenScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"my_garden" | "discover">("my_garden");
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
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerPhoto, setScannerPhoto] = useState<PickedImage | null>(null);
  const [isScanningScanner, setIsScanningScanner] = useState(false);
  const [scannerResult, setScannerResult] = useState<LeafyScanResult | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Plant options sheet
  const [plantOptionsTarget, setPlantOptionsTarget] = useState<GardenPlant | null>(null);
  const [showPlantOptions, setShowPlantOptions] = useState(false);
  const [isDeletingPlant, setIsDeletingPlant] = useState(false);

  async function loadGarden() {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const g = await getOrCreateMyGarden(user.id);
      const p = await getGardenPlants(g.id);
      setGarden(g);
      setPlants(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load garden.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadGarden(); }, [user?.id]);

  function resetForm() {
    setPlantName(""); setCategory(""); setScientificName("");
    setCondition("Healthy"); setCareNotes(""); setPlantPhoto(null);
    setScanResult(null); setScanMessage(null);
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
      setCareNotes(`Leafy AI: ${result.bestMatch} (${result.confidence}% confidence).`);
      setScanMessage("Plant identified!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Leafy AI scan failed.");
    } finally { setIsScanning(false); }
  }

  async function handleIdentifyPlant() {
    setError(null);
    try {
      const photo = await takePhotoWithCamera();
      if (!photo) return;

      setScannerPhoto(photo);
      setScannerResult(null);
      setScannerError(null);
      setShowScannerModal(true);
      setIsScanningScanner(true);

      const result = await scanPlantWithLeafy(photo);
      setScannerResult(result);
    } catch (e) {
      setScannerError(e instanceof Error ? e.message : "Leafy AI scan failed.");
    } finally {
      setIsScanningScanner(false);
    }
  }

  async function handleAddPlant() {
    if (!user || !garden || !plantName.trim()) return;
    setIsSaving(true); setError(null);
    try {
      const uploaded = plantPhoto
        ? await uploadPublicImage("garden-photos", user.id, "plants", plantPhoto)
        : null;
      await createGardenPlant(
        user.id, garden.id, plantName.trim(), uploaded?.path,
        category.trim(), scientificName.trim(), condition.trim(), careNotes.trim()
      );
      resetForm();
      setShowAddModal(false);
      await loadGarden();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add plant.");
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

  // Cover carousel images — use plant photos if available, else default covers
  const coverPhotos = plants.filter((p) => p.photoUrl).map((p) => p.photoUrl!);
  const coverImages = coverPhotos.length > 0 ? coverPhotos : [""];

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

  const statsRow = [
    { label: "Garden score", value: "9.1k" },
    { label: "Top likes", value: plants.reduce((a, _) => a + 0, 0).toString() || "0" },
    { label: "Updates", value: plants.length.toString() },
  ];

  // ─────────────────────────────────────────────────────
  return (
    <Screen showHeader={false} scroll={false} noPadding={true}>
      {/* ── Tab switcher (top) ── */}
      <View style={styles.topTabs}>
        {(["my_garden", "discover"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.topTab, activeTab === tab && styles.topTabActive]}
          >
            <Text style={[styles.topTabText, activeTab === tab && styles.topTabTextActive]}>
              {tab === "my_garden" ? "My Garden" : "Discover"}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "discover" ? (
        <DiscoverGardensScreen />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
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
                <View key={idx} style={styles.coverSlide}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.coverImg} />
                  ) : (
                    <View style={styles.coverFallback}>
                      <MaterialCommunityIcons name="flower" size={56} color="rgba(255,255,255,0.2)" />
                    </View>
                  )}
                  <View style={styles.coverOverlay} />
                </View>
              ))}
            </ScrollView>

            {/* Pagination indicator */}
            <View style={styles.paginationBadge}>
              <Text style={styles.paginationText}>
                {coverIndex + 1}/{coverImages.length}
              </Text>
            </View>

            {/* Camera button */}
            <Pressable style={styles.coverCameraBtn}>
              <MaterialCommunityIcons name="camera-outline" size={17} color={colors.white} />
            </Pressable>

            {/* Prev arrow */}
            {coverIndex > 0 && (
              <Pressable onPress={() => scrollCover(-1)} style={[styles.coverArrow, styles.coverArrowLeft]}>
                <MaterialCommunityIcons name="chevron-left" size={20} color={colors.white} />
              </Pressable>
            )}

            {/* Next arrow */}
            {coverIndex < coverImages.length - 1 && (
              <Pressable onPress={() => scrollCover(1)} style={[styles.coverArrow, styles.coverArrowRight]}>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.white} />
              </Pressable>
            )}

            {/* Title overlay */}
            <View style={styles.coverTitle}>
              <Text style={styles.coverTitleText}>{garden?.name ?? "My Plant Collection"}</Text>
              <Text style={styles.coverSubText}>
                {plants.length} plants · {plants.length} updates · Rank #2
              </Text>
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
            <View style={styles.actionBtnRow}>
              <Pressable
                onPress={() => { resetForm(); setShowAddModal(true); }}
                style={({ pressed }) => [styles.actionHalfBtn, pressed && { opacity: 0.8 }]}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.greenMid} />
                <Text style={styles.addBtnText}>Add plant</Text>
              </Pressable>

              <Pressable
                onPress={handleIdentifyPlant}
                style={({ pressed }) => [styles.actionHalfBtn, pressed && { opacity: 0.8 }]}
              >
                <MaterialCommunityIcons name="leaf-circle-outline" size={18} color={colors.greenMid} />
                <Text style={styles.addBtnText}>Identify plant</Text>
              </Pressable>
            </View>

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
              <View style={styles.center}>
                <MaterialCommunityIcons name="flower-outline" size={48} color={colors.line} />
                <Text style={styles.emptyTitle}>No plants yet</Text>
                <Text style={styles.emptySub}>Add your first plant to get started!</Text>
              </View>
            )}

            {/* Plant grid */}
            {!isLoading && filtered.length > 0 && (
              <View style={styles.grid}>
                {filtered.map((plant) => (
                  <View key={plant.id} style={styles.plantCard}>
                    {plant.photoUrl ? (
                      <Image source={{ uri: plant.photoUrl }} style={styles.plantPhoto} />
                    ) : (
                      <View style={[styles.plantPhoto, styles.plantPhotoFallback]}>
                        <MaterialCommunityIcons name="flower-outline" size={36} color={colors.greenMuted} />
                      </View>
                    )}
                    <View style={styles.plantCardInfo}>
                      <View style={styles.plantCardRow}>
                        <Text style={styles.plantCardName} numberOfLines={1}>{plant.name}</Text>
                        <Pressable
                          onPress={() => { setPlantOptionsTarget(plant); setShowPlantOptions(true); }}
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
                  </View>
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
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !isSaving && setShowAddModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add a Plant</Text>
              <Pressable onPress={() => !isSaving && setShowAddModal(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.greenMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                    placeholder="e.g. Indoor, Herbs, Flowering"
                    placeholderTextColor={colors.textTertiary}
                    value={category}
                    onChangeText={setCategory}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Condition</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
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
                    </View>
                  </ScrollView>
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
                onPress={handleAddPlant}
                disabled={isSaving || !plantName.trim()}
                style={[styles.saveBtn, (isSaving || !plantName.trim()) && { opacity: 0.4 }]}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.white} size={16} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="flower-outline" size={17} color={colors.white} />
                    <Text style={styles.saveBtnText}>Add to Garden</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          IDENTIFY PLANT (LEAFY AI) MODAL
      ══════════════════════════════════════════════════ */}
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

            <ScrollView showsVerticalScrollIndicator={false}>
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
                    <MaterialCommunityIcons name="check-circle" size={24} color="#16a34a" />
                    <Text style={styles.scannerResultTitle}>Match Found!</Text>
                  </View>
                  
                  <View style={styles.scannerResultBody}>
                    <View style={styles.scannerResultRow}>
                      <Text style={styles.scannerResultLabel}>Best Match</Text>
                      <Text style={styles.scannerResultValBold}>{scannerResult.bestMatch}</Text>
                    </View>
                    
                    {scannerResult.scientificName && (
                      <View style={styles.scannerResultRow}>
                        <Text style={styles.scannerResultLabel}>Scientific Name</Text>
                        <Text style={styles.scannerResultVal}>{scannerResult.scientificName}</Text>
                      </View>
                    )}

                    {scannerResult.category && (
                      <View style={styles.scannerResultRow}>
                        <Text style={styles.scannerResultLabel}>Category</Text>
                        <Text style={styles.scannerResultVal}>{scannerResult.category}</Text>
                      </View>
                    )}

                    <View style={styles.scannerResultRow}>
                      <Text style={styles.scannerResultLabel}>Confidence</Text>
                      <View style={styles.scannerConfBadge}>
                        <Text style={styles.scannerConfText}>{scannerResult.confidence}%</Text>
                      </View>
                    </View>
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
                      setCareNotes(`Leafy AI identified: ${scannerResult.bestMatch} (${scannerResult.confidence}% confidence).`);
                      setPlantPhoto(scannerPhoto);
                      setShowScannerModal(false);
                      setShowAddModal(true);
                    }}
                    style={styles.scannerAddBtn}
                  >
                    <MaterialCommunityIcons name="flower-outline" size={18} color={colors.white} />
                    <Text style={styles.scannerAddBtnText}>Add to my Garden</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={handleIdentifyPlant}
                  disabled={isScanningScanner}
                  style={styles.scannerRetryBtn}
                >
                  <MaterialCommunityIcons name="camera-outline" size={18} color={colors.green} />
                  <Text style={styles.scannerRetryBtnText}>Retake Photo</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── Top tabs ──────────────────────────────────────────
  topTabs: {
    flexDirection: "row",
    backgroundColor: colors.cream,
    paddingTop: 52,
    paddingHorizontal: 20,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  topTab: {
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  topTabActive: { borderBottomColor: colors.green },
  topTabText: { fontSize: 14, fontWeight: "700", color: colors.textTertiary },
  topTabTextActive: { color: colors.green, fontWeight: "800" },

  scroll: { paddingBottom: 100 },

  // ── Cover carousel ────────────────────────────────────
  coverWrap: { height: COVER_HEIGHT, position: "relative" },
  coverSlide: { width: SCREEN_W, height: COVER_HEIGHT },
  coverImg: { width: "100%", height: "100%" },
  coverFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.greenMid,
    alignItems: "center",
    justifyContent: "center",
  },
  coverOverlay: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: "60%",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  paginationBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  },
  coverArrowLeft: { left: 10 },
  coverArrowRight: { right: 10 },
  coverTitle: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 60,
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
  chipRow: { gap: 8, paddingBottom: 14 },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surface0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "92%",
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
  scannerResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  scannerResultTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.green,
  },
  scannerResultBody: {
    gap: 8,
  },
  scannerResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scannerResultLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  scannerResultVal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scannerResultValBold: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.green,
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
});
