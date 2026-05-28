import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { getLeaderboard, type LeaderboardEntry } from "../services/rankings";
import { getOrCreateMyGarden, getGardenPlants, type GardenPlant } from "../services/gardens";
import { getUserOrders, type Order } from "../services/listings";
import { colors, radius, shadow, fontSize, spacing } from "../theme/colors";
import { Screen } from "../components/Screen";
import { SellerGardenModal } from "../components/SellerGardenModal";

const MEDAL_COLORS = ["#f59e0b", "#94a3b8", "#cd7f32"];
const MEDAL_BG = ["#fef3c7", "#f1f5f9", "#fdf4e7"];
const MEDAL_ICONS: ("medal" | "medal-outline" | "podium-bronze")[] = ["medal", "medal-outline", "podium-bronze"];

type RankingsScreenProps = {
  embedded?: boolean;
  onOpenChat?: (convoId: string, title: string) => void;
  onOpenListingDetail?: (listingId: string) => void;
};

export function RankingsScreen({
  embedded = false,
  onOpenChat,
  onOpenListingDetail,
}: RankingsScreenProps) {
  const { user } = useAuth();

  // Seller garden modal state
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [selectedSellerName, setSelectedSellerName] = useState<string>("");
  const [showSellerGarden, setShowSellerGarden] = useState(false);

  function handleViewSellerGarden(sellerId: string, sellerName: string) {
    setSelectedSellerId(sellerId);
    setSelectedSellerName(sellerName);
    setShowSellerGarden(true);
  }
  const [activeView, setActiveView] = useState<"badges" | "leaderboard">("leaderboard");
  const [activeTab, setActiveTab] = useState<"consistency" | "collections" | "sets">("consistency");

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Badges state / dynamic counts
  const [gardenPlants, setGardenPlants] = useState<GardenPlant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingBadges, setIsLoadingBadges] = useState(false);

  // AsyncStorage consistency data
  const [appOpens, setAppOpens] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);
  const [weekendVisits, setWeekendVisits] = useState(0);
  const [returnedAfterBreak, setReturnedAfterBreak] = useState(false);

  // ── Load Leaderboard ──
  async function loadLeaderboard() {
    setIsLoadingLeaderboard(true);
    setLeaderboardError(null);
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (loadError) {
      setLeaderboardError(loadError instanceof Error ? loadError.message : "Unable to load leaderboard.");
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }

  // ── Load Garden and Order data for badges ──
  async function loadBadgeData() {
    if (!user) return;
    setIsLoadingBadges(true);
    try {
      const g = await getOrCreateMyGarden(user.id);
      const plants = await getGardenPlants(g.id);
      setGardenPlants(plants);

      const userOrders = await getUserOrders(user.id);
      setOrders(userOrders);
    } catch (e) {
      console.warn("Error loading badge data:", e);
    } finally {
      setIsLoadingBadges(false);
    }
  }

  // ── Initialize AsyncStorage consistency tracking ──
  useEffect(() => {
    async function initConsistency() {
      try {
        const storedOpens = await AsyncStorage.getItem("growmate_app_opens");
        const storedStreak = await AsyncStorage.getItem("growmate_login_streak");
        const storedWeekend = await AsyncStorage.getItem("growmate_weekend_visits");
        const storedLastOpen = await AsyncStorage.getItem("growmate_last_open_time");

        let opens = storedOpens ? parseInt(storedOpens, 10) : 0;
        let streak = storedStreak ? parseInt(storedStreak, 10) : 0;
        let weekend = storedWeekend ? parseInt(storedWeekend, 10) : 0;
        let lastOpen = storedLastOpen ? parseInt(storedLastOpen, 10) : 0;
        let returnedBreak = false;

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // Session-based increment check (increment once per screen mount session)
        opens += 1;

        if (lastOpen > 0) {
          const diff = now - lastOpen;
          if (diff > oneDay * 3) {
            returnedBreak = true;
            streak = 1; 
          } else if (diff >= oneDay && diff <= oneDay * 2) {
            streak += 1;
            returnedBreak = false;
          } else {
            returnedBreak = false; // Opened within same day
          }

          // Weekend check
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            const lastDate = new Date(lastOpen);
            if (lastDate.toDateString() !== today.toDateString()) {
              weekend += 1;
            }
          }
        }

        setAppOpens(opens);
        setLoginStreak(streak);
        setWeekendVisits(weekend);
        setReturnedAfterBreak(returnedBreak);

        await AsyncStorage.setItem("growmate_app_opens", opens.toString());
        await AsyncStorage.setItem("growmate_login_streak", streak.toString());
        await AsyncStorage.setItem("growmate_weekend_visits", weekend.toString());
        await AsyncStorage.setItem("growmate_last_open_time", now.toString());
      } catch (err) {
        console.warn("AsyncStorage error:", err);
      }
    }

    initConsistency();
    loadLeaderboard();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadBadgeData();
    }
  }, [user?.id]);

  // ── Calculate Category Counts for Collections ──
  const indoorCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    return cat === "indoor" || cat === "indoor plant" || cat === "indoor plants" || cat === "aroid";
  }).length;

  const rareCount = gardenPlants.filter((p) => {
    const cond = (p.condition ?? "").toLowerCase();
    const name = (p.name ?? "").toLowerCase();
    return cond.includes("rare") || name.includes("rare") || name.includes("variegated");
  }).length;

  const floweringCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    return cat === "flowering" || cat === "flowering plants" || cat === "flower" || cat === "blooming";
  }).length;

  const herbsCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    return cat === "herbs" || cat === "herb";
  }).length;

  const veggiesCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    const name = (p.name ?? "").toLowerCase();
    return (
      cat === "vegetables" ||
      cat === "vegetable" ||
      cat === "veggie" ||
      cat === "veggies" ||
      cat === "crops" ||
      name.includes("talong") ||
      name.includes("tomato") ||
      name.includes("chili") ||
      name.includes("pechay") ||
      name.includes("spring onion")
    );
  }).length;

  const rootCropsCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    const name = (p.name ?? "").toLowerCase();
    return (
      cat === "root crops" ||
      cat === "root crop" ||
      cat === "tubers" ||
      cat === "tuber" ||
      name.includes("kamote") ||
      name.includes("cassava") ||
      name.includes("gabi") ||
      name.includes("ube") ||
      name.includes("taro") ||
      name.includes("radish") ||
      name.includes("labanos")
    );
  }).length;

  const fruitTreesCount = gardenPlants.filter((p) => {
    const cat = (p.category ?? "").toLowerCase();
    const name = (p.name ?? "").toLowerCase();
    return cat.includes("fruit") || cat.includes("citrus") || name.includes("calamansi") || name.includes("mango") || name.includes("lemon");
  }).length;

  // ── Calculate Sets ──
  const hasMonstera = gardenPlants.some(p => p.name.toLowerCase().includes("monstera") || (p.localName ?? "").toLowerCase().includes("monstera"));
  const hasAnthurium = gardenPlants.some(p => p.name.toLowerCase().includes("anthurium") || (p.localName ?? "").toLowerCase().includes("anthurium"));
  const hasAlocasia = gardenPlants.some(p => p.name.toLowerCase().includes("alocasia") || (p.localName ?? "").toLowerCase().includes("alocasia"));
  const hasPothos = gardenPlants.some(p => p.name.toLowerCase().includes("pothos") || (p.localName ?? "").toLowerCase().includes("pothos"));
  const aroidProgress = (hasMonstera ? 1 : 0) + (hasAnthurium ? 1 : 0) + (hasAlocasia ? 1 : 0) + (hasPothos ? 1 : 0);

  const hasTalong = gardenPlants.some(p => p.name.toLowerCase().includes("talong") || (p.localName ?? "").toLowerCase().includes("talong") || p.name.toLowerCase().includes("eggplant"));
  const hasTomato = gardenPlants.some(p => p.name.toLowerCase().includes("tomato") || (p.localName ?? "").toLowerCase().includes("tomato"));
  const hasChili = gardenPlants.some(p => p.name.toLowerCase().includes("chili") || (p.localName ?? "").toLowerCase().includes("chili") || p.name.toLowerCase().includes("sili"));
  const hasPechay = gardenPlants.some(p => p.name.toLowerCase().includes("pechay") || (p.localName ?? "").toLowerCase().includes("pechay"));
  const hasSpringOnion = gardenPlants.some(p => p.name.toLowerCase().includes("spring onion") || p.name.toLowerCase().includes("onion") || (p.localName ?? "").toLowerCase().includes("spring onion"));
  const hasKamote = gardenPlants.some(p => p.name.toLowerCase().includes("kamote") || p.name.toLowerCase().includes("sweet potato") || (p.localName ?? "").toLowerCase().includes("kamote"));
  const hasCassava = gardenPlants.some(p => p.name.toLowerCase().includes("cassava") || p.name.toLowerCase().includes("kamoteng kahoy") || (p.localName ?? "").toLowerCase().includes("kamoteng kahoy"));
  const foodProgress = (hasTalong ? 1 : 0) + (hasTomato ? 1 : 0) + (hasChili ? 1 : 0) + (hasPechay ? 1 : 0) + (hasSpringOnion ? 1 : 0) + (hasKamote ? 1 : 0) + (hasCassava ? 1 : 0);

  const hasSnakePlant = gardenPlants.some(p => p.name.toLowerCase().includes("snake plant") || p.name.toLowerCase().includes("sansevieria"));
  const hasPeperomia = gardenPlants.some(p => p.name.toLowerCase().includes("peperomia"));
  const hasCactus = gardenPlants.some(p => p.name.toLowerCase().includes("cactus"));
  const hasBasil = gardenPlants.some(p => p.name.toLowerCase().includes("basil"));
  const beginnerCount = (hasSnakePlant ? 1 : 0) + (hasPothos ? 1 : 0) + (hasPeperomia ? 1 : 0) + (hasCactus ? 1 : 0) + (hasBasil ? 1 : 0);
  const beginnerProgress = Math.min(beginnerCount, 4);

  const purchasedCategories = new Set<string>();
  orders.forEach(o => {
    if (o.status === "completed" && o.buyerId === user?.id) {
      purchasedCategories.add(o.listingName);
    }
  });
  const marketExplorerProgress = Math.min(purchasedCategories.size, 3);

  // ── Real Progress ──
  const displayIndoor = indoorCount;
  const displayRare = rareCount;
  const displayFlowering = floweringCount;
  const displayHerbs = herbsCount;
  const displayVeggies = veggiesCount;
  const displayRootCrops = rootCropsCount;
  const displayFruit = fruitTreesCount;

  const displayAroidProgress = aroidProgress;
  const displayFoodProgress = foodProgress;
  const displayBeginnerProgress = beginnerProgress;
  const displayMarketProgress = marketExplorerProgress;

  // ── Badges List Data ──
  const consistencyBadges = [
    {
      id: "daily_visitor",
      title: "Daily Visitor",
      desc: "3-day login streak",
      progress: Math.min(loginStreak, 3),
      max: 3,
      unlocked: loginStreak >= 3,
      iconLocked: "calendar-blank-outline",
      iconUnlocked: "calendar-check",
    },
    {
      id: "green_streak",
      title: "Green Streak",
      desc: "7-day login streak",
      progress: Math.min(loginStreak, 7),
      max: 7,
      unlocked: loginStreak >= 7,
      iconLocked: "fire",
      iconUnlocked: "fire",
    },
    {
      id: "garden_regular",
      title: "Garden Regular",
      desc: "30 app opens",
      progress: Math.min(appOpens, 30),
      max: 30,
      unlocked: appOpens >= 30,
      iconLocked: "sprout-outline",
      iconUnlocked: "sprout",
    },
    {
      id: "weekend_grower",
      title: "Weekend Grower",
      desc: "4 weekend visits",
      progress: Math.min(weekendVisits, 4),
      max: 4,
      unlocked: weekendVisits >= 4,
      iconLocked: "calendar-range-outline",
      iconUnlocked: "calendar-heart",
    },
    {
      id: "back_to_garden",
      title: "Back to Garden",
      desc: "Returned after a break",
      progress: returnedAfterBreak ? 1 : 0,
      max: 1,
      unlocked: returnedAfterBreak,
      iconLocked: "sync-off",
      iconUnlocked: "sync",
    },
  ];

  const collectionsBadges = [
    {
      id: "indoor_starter",
      title: "Indoor Starter",
      desc: "5 indoor plants",
      progress: displayIndoor,
      max: 5,
      unlocked: displayIndoor >= 5,
      iconLocked: "home-outline",
      iconUnlocked: "home",
    },
    {
      id: "rare_shelf",
      title: "Rare Shelf",
      desc: "3 rare plants",
      progress: displayRare,
      max: 3,
      unlocked: displayRare >= 3,
      iconLocked: "diamond-outline",
      iconUnlocked: "diamond-stone",
    },
    {
      id: "bloom_keeper",
      title: "Bloom Keeper",
      desc: "5 flowering plants",
      progress: displayFlowering,
      max: 5,
      unlocked: displayFlowering >= 5,
      iconLocked: "flower-outline",
      iconUnlocked: "flower",
    },
    {
      id: "herb_basket",
      title: "Herb Basket",
      desc: "5 herbs",
      progress: displayHerbs,
      max: 5,
      unlocked: displayHerbs >= 5,
      iconLocked: "leaf-outline",
      iconUnlocked: "leaf",
    },
    {
      id: "bahay_kubo_set",
      title: "Bahay Kubo Set",
      desc: "5 veggies",
      progress: displayVeggies,
      max: 5,
      unlocked: displayVeggies >= 5,
      iconLocked: "basket-outline",
      iconUnlocked: "carrot",
    },
    {
      id: "root_crop_keeper",
      title: "Root Crop Keeper",
      desc: "3 root crops",
      progress: displayRootCrops,
      max: 3,
      unlocked: displayRootCrops >= 3,
      iconLocked: "pot-mix-outline",
      iconUnlocked: "pot-mix",
    },
    {
      id: "fruit_corner",
      title: "Fruit Corner",
      desc: "3 fruit trees",
      progress: displayFruit,
      max: 3,
      unlocked: displayFruit >= 3,
      iconLocked: "food-apple-outline",
      iconUnlocked: "food-apple",
    },
  ];

  const setsBadges = [
    {
      id: "aroid_set",
      title: "Aroid Set",
      desc: "Monstera, Anthurium, Alocasia, Pothos",
      progress: displayAroidProgress,
      max: 4,
      unlocked: displayAroidProgress >= 4,
      iconLocked: "leaf-maple-outline",
      iconUnlocked: "leaf-maple",
    },
    {
      id: "food_garden_set",
      title: "Food Garden Set",
      desc: "Talong, tomato, chili, pechay, onion, kamote, or cassava",
      progress: displayFoodProgress,
      max: 7,
      unlocked: displayFoodProgress >= 5,
      iconLocked: "basket-outline",
      iconUnlocked: "basket",
    },
    {
      id: "beginner_set",
      title: "Beginner Set",
      desc: "Snake plant, pothos, peperomia, cactus or basil",
      progress: displayBeginnerProgress,
      max: 4,
      unlocked: displayBeginnerProgress >= 4,
      iconLocked: "hand-heart-outline",
      iconUnlocked: "hand-heart",
    },
    {
      id: "market_explorer",
      title: "Market Explorer",
      desc: "3 market categories",
      progress: displayMarketProgress,
      max: 3,
      unlocked: displayMarketProgress >= 3,
      iconLocked: "cart-outline",
      iconUnlocked: "cart",
    },
  ];

  const currentBadges =
    activeTab === "consistency"
      ? consistencyBadges
      : activeTab === "collections"
      ? collectionsBadges
      : setsBadges;

  // ── Leaderboard slice ──
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <Screen showHeader={false} scroll={false} noPadding={true}>
      {/* ── Forest Green Rounded Header ── */}
      <View style={[styles.headerBlock, embedded && styles.headerBlockEmbedded]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerSubtitle}>
            {activeView === "badges" ? "ACHIEVEMENTS" : "COMMUNITY"}
          </Text>
          <Text style={styles.headerTitle}>
            {activeView === "badges" ? "Your Plant Badges" : "Leaderboard"}
          </Text>
        </View>
        <Pressable
          style={styles.headerTrophyBtn}
          onPress={() => setActiveView(activeView === "badges" ? "leaderboard" : "badges")}
        >
          <MaterialCommunityIcons
            name={activeView === "badges" ? "trophy" : "medal"}
            size={22}
            color={colors.green}
          />
        </Pressable>
      </View>

      {/* ── Segment Selector for switching between Leaderboard & Badges ── */}
      <View style={styles.topSelector}>
        <Pressable
          onPress={() => setActiveView("leaderboard")}
          style={[styles.selectorBtn, activeView === "leaderboard" && styles.selectorBtnActive]}
        >
          <Text style={[styles.selectorBtnText, activeView === "leaderboard" && styles.selectorBtnTextActive]}>
            Leaderboard
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveView("badges")}
          style={[styles.selectorBtn, activeView === "badges" && styles.selectorBtnActive]}
        >
          <Text style={[styles.selectorBtnText, activeView === "badges" && styles.selectorBtnTextActive]}>
            Plant Badges
          </Text>
        </Pressable>
      </View>

      {/* ── View: Badges ── */}
      {activeView === "badges" && (
        <View style={styles.contentWrap}>
          {/* Sub Navigation Tabs */}
          <View style={styles.tabBar}>
            {(["consistency", "collections", "sets"] as const).map((tab) => {
              const isActive = activeTab === tab;
              const displayLabel =
                tab === "consistency" ? "Consistency" : tab === "collections" ? "Collections" : "Sets";
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                    {displayLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Cards List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listScroll}
          >
            {currentBadges.map((badge) => (
              <View key={badge.id} style={styles.badgeCard}>
                {/* Left Icon Block */}
                <View
                  style={[
                    styles.cardIconBox,
                    badge.unlocked ? styles.cardIconBoxUnlocked : styles.cardIconBoxLocked,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={(badge.unlocked ? badge.iconUnlocked : badge.iconLocked) as any}
                    size={24}
                    color={badge.unlocked ? "#f97316" : "#84cc16"}
                  />
                </View>

                {/* Middle Info Block */}
                <View style={styles.cardMid}>
                  <Text style={styles.badgeTitleText}>{badge.title}</Text>
                  <Text style={styles.badgeDescText}>{badge.desc}</Text>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${(badge.progress / badge.max) * 100}%` as any,
                          backgroundColor: badge.unlocked ? "#f97316" : "#84cc16",
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Right Status Badge */}
                <View
                  style={[
                    styles.statusPill,
                    badge.unlocked ? styles.statusPillUnlocked : styles.statusPillLocked,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      badge.unlocked ? styles.statusPillTextUnlocked : styles.statusPillTextLocked,
                    ]}
                  >
                    {badge.unlocked ? "Unlocked" : `${badge.progress}/${badge.max}`}
                  </Text>
                </View>
              </View>
            ))}
            <View style={{ height: Platform.OS === "ios" ? 100 : 80 }} />
          </ScrollView>
        </View>
      )}

      {/* ── View: Leaderboard ── */}
      {activeView === "leaderboard" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.leaderboardScroll}
        >
          {/* Refresh row */}
          <Pressable onPress={loadLeaderboard} style={styles.refreshRow}>
            <MaterialCommunityIcons name="refresh" size={14} color={colors.greenMuted} />
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>

          {/* Loading / Error states */}
          {isLoadingLeaderboard && (
            <View style={styles.center}>
              <ActivityIndicator color={colors.green} size="large" />
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          )}

          {!isLoadingLeaderboard && leaderboardError && (
            <View style={styles.errorCard}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color={colors.errorText} />
              <Text style={styles.errorText}>{leaderboardError}</Text>
            </View>
          )}

          {!isLoadingLeaderboard && !leaderboardError && leaderboard.length === 0 && (
            <View style={styles.center}>
              <MaterialCommunityIcons name="trophy-outline" size={48} color={colors.line} />
              <Text style={styles.emptyTitle}>No rankings yet</Text>
              <Text style={styles.emptySub}>Add plants, list items, post updates, or complete transactions to earn points.</Text>
            </View>
          )}

          {/* Podium */}
          {!isLoadingLeaderboard && top3.length > 0 && (
            <View style={styles.podium}>
              {/* 2nd place */}
              {top3[1] && (
                <Pressable
                  style={styles.podiumItem}
                  onPress={() => handleViewSellerGarden(top3[1].userId, top3[1].displayName)}
                >
                  <View style={[styles.podiumAvatar, { borderColor: MEDAL_COLORS[1] }]}>
                    {top3[1].avatarUrl ? (
                      <Image source={{ uri: top3[1].avatarUrl }} style={styles.podiumAvatarImg} />
                    ) : (
                      <Text style={styles.podiumAvatarLetter}>{top3[1].displayName[0]?.toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={[styles.podiumMedalBadge, { backgroundColor: MEDAL_BG[1] }]}>
                    <MaterialCommunityIcons name={MEDAL_ICONS[1]} size={18} color={MEDAL_COLORS[1]} />
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{top3[1].displayName}</Text>
                  <Text style={styles.podiumPoints}>{top3[1].points} pts</Text>
                  <View style={[styles.podiumBar, { height: 56, backgroundColor: MEDAL_BG[1], borderColor: MEDAL_COLORS[1] }]} />
                </Pressable>
              )}

              {/* 1st place */}
              {top3[0] && (
                <Pressable
                  style={styles.podiumItem}
                  onPress={() => handleViewSellerGarden(top3[0].userId, top3[0].displayName)}
                >
                  <View style={styles.crownWrap}>
                    <MaterialCommunityIcons name="crown" size={22} color="#f59e0b" />
                  </View>
                  <View style={[styles.podiumAvatar, styles.podiumAvatarLg, { borderColor: MEDAL_COLORS[0] }]}>
                    {top3[0].avatarUrl ? (
                      <Image source={{ uri: top3[0].avatarUrl }} style={styles.podiumAvatarImgLg} />
                    ) : (
                      <Text style={styles.podiumAvatarLetterLg}>{top3[0].displayName[0]?.toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={[styles.podiumMedalBadge, { backgroundColor: MEDAL_BG[0] }]}>
                    <MaterialCommunityIcons name={MEDAL_ICONS[0]} size={18} color={MEDAL_COLORS[0]} />
                  </View>
                  <Text style={[styles.podiumName, styles.podiumNameLg]} numberOfLines={1}>{top3[0].displayName}</Text>
                  <Text style={[styles.podiumPoints, styles.podiumPointsLg]}>{top3[0].points} pts</Text>
                  <View style={[styles.podiumBar, { height: 80, backgroundColor: MEDAL_BG[0], borderColor: MEDAL_COLORS[0] }]} />
                </Pressable>
              )}

              {/* 3rd place */}
              {top3[2] && (
                <Pressable
                  style={styles.podiumItem}
                  onPress={() => handleViewSellerGarden(top3[2].userId, top3[2].displayName)}
                >
                  <View style={[styles.podiumAvatar, { borderColor: MEDAL_COLORS[2] }]}>
                    {top3[2].avatarUrl ? (
                      <Image source={{ uri: top3[2].avatarUrl }} style={styles.podiumAvatarImg} />
                    ) : (
                      <Text style={styles.podiumAvatarLetter}>{top3[2].displayName[0]?.toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={[styles.podiumMedalBadge, { backgroundColor: MEDAL_BG[2] }]}>
                    <MaterialCommunityIcons name={MEDAL_ICONS[2]} size={18} color={MEDAL_COLORS[2]} />
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{top3[2].displayName}</Text>
                  <Text style={styles.podiumPoints}>{top3[2].points} pts</Text>
                  <View style={[styles.podiumBar, { height: 40, backgroundColor: MEDAL_BG[2], borderColor: MEDAL_COLORS[2] }]} />
                </Pressable>
              )}
            </View>
          )}

          {/* List remaining */}
          {!isLoadingLeaderboard && rest.length > 0 && (
            <View style={styles.listWrap}>
              <Text style={styles.listLabel}>All Rankings</Text>
              {rest.map((entry, idx) => (
                <Pressable
                  key={entry.userId}
                  style={styles.row}
                  onPress={() => handleViewSellerGarden(entry.userId, entry.displayName)}
                >
                  <View style={styles.rankBubble}>
                    <Text style={styles.rankNum}>#{idx + 4}</Text>
                  </View>
                  {entry.avatarUrl ? (
                    <Image source={{ uri: entry.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarLetter}>{entry.displayName[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>{entry.displayName}</Text>
                    {entry.location && (
                      <View style={styles.locationRow}>
                        <MaterialCommunityIcons color={colors.greenMuted} name="map-marker-outline" size={11} />
                        <Text style={styles.rowMeta}>{entry.location}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.ptsBubble}>
                    <Text style={styles.ptsNum}>{entry.points}</Text>
                    <Text style={styles.ptsLabel}>pts</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ height: Platform.OS === "ios" ? 100 : 80 }} />
        </ScrollView>
      )}

      {/* Seller Garden Modal for public profile garden view */}
      {showSellerGarden && (
        <SellerGardenModal
          visible={showSellerGarden}
          onClose={() => setShowSellerGarden(false)}
          sellerId={selectedSellerId}
          sellerName={selectedSellerName}
          onOpenChat={(convoId, title) => {
            setShowSellerGarden(false);
            onOpenChat?.(convoId, title);
          }}
          onOpenListingDetail={(listingId) => {
            setShowSellerGarden(false);
            onOpenListingDetail?.(listingId);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── Forest Green Rounded Header ──
  headerBlock: {
    backgroundColor: colors.green,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 54 : 40,
    paddingBottom: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBlockEmbedded: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    paddingTop: 24,
    paddingBottom: 22,
  },
  headerLeft: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    fontWeight: "800",
    color: "#a3b899",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: -0.5,
  },
  headerTrophyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  // ── Sub Navigation Tabs Bar ──
  contentWrap: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
    paddingHorizontal: 20,
  },
  tabBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  tabBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.greenMuted,
  },
  tabBtnTextActive: {
    color: colors.white,
  },

  // ── Badge Card Rows ──
  listScroll: {
    paddingBottom: 40,
  },
  badgeCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eef2eb",
    ...shadow.sm,
  },
  cardIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardIconBoxUnlocked: {
    backgroundColor: "#fff7ed",
  },
  cardIconBoxLocked: {
    backgroundColor: "#f0fdf4",
  },
  cardMid: {
    flex: 1,
    justifyContent: "center",
  },
  badgeTitleText: {
    fontSize: fontSize.base,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  badgeDescText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.line,
    borderRadius: 3,
    width: "90%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 54,
  },
  statusPillUnlocked: {
    backgroundColor: "#ffedd5",
  },
  statusPillLocked: {
    backgroundColor: "#f0fdf4",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusPillTextUnlocked: {
    color: "#f97316",
  },
  statusPillTextLocked: {
    color: "#84cc16",
  },

  // ── Leaderboard styles ──
  leaderboardScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginBottom: 16,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.greenMuted,
  },
  center: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: "600", marginTop: 8 },
  emptyTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.textPrimary },
  emptySub: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: "center" },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.error,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: colors.errorText, fontSize: fontSize.sm, fontWeight: "600", flex: 1 },

  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  podiumItem: { alignItems: "center", flex: 1, maxWidth: 120 },
  crownWrap: { marginBottom: 4 },
  crownIcon: { fontSize: 22 },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    overflow: "hidden",
    marginBottom: 6,
  },
  podiumAvatarLg: { width: 68, height: 68, borderRadius: 34 },
  podiumAvatarImg: { width: "100%", height: "100%", borderRadius: 26 },
  podiumAvatarImgLg: { width: "100%", height: "100%", borderRadius: 34 },
  podiumAvatarLetter: { fontSize: 18, fontWeight: "900", color: colors.green },
  podiumAvatarLetterLg: { fontSize: 24, fontWeight: "900", color: colors.green },

  podiumMedalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 4,
  },
  podiumMedalText: { fontSize: 14 },
  podiumName: { fontSize: 12, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  podiumNameLg: { fontSize: 14, fontWeight: "800" },
  podiumPoints: { fontSize: 11, color: colors.textSecondary, fontWeight: "700" },
  podiumPointsLg: { fontSize: 13, fontWeight: "800", color: colors.green },
  podiumBar: {
    width: "100%",
    marginTop: 8,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    minHeight: 20,
  },

  listWrap: { gap: 8, marginBottom: 20 },
  listLabel: {
    fontSize: fontSize.xs,
    fontWeight: "800",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    ...shadow.sm,
  },
  rankBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: { fontSize: 11, fontWeight: "800", color: colors.greenMuted },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 15, fontWeight: "800", color: colors.green },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  rowMeta: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  ptsBubble: { alignItems: "center" },
  ptsNum: { fontSize: 16, fontWeight: "800", color: colors.green },
  ptsLabel: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },

  // ── Top Selector segment control ──
  topSelector: {
    flexDirection: "row",
    backgroundColor: "#eef2eb",
    borderRadius: radius.md,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
  },
  selectorBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorBtnActive: {
    backgroundColor: colors.white,
    ...shadow.sm,
  },
  selectorBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.greenMuted,
  },
  selectorBtnTextActive: {
    color: colors.green,
  },
});
