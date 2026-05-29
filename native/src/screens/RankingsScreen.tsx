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
import { readFastCache, writeFastCache } from "../utils/fastCache";

function getRankTrend(userId: string, points: number) {
  if (points === 0) return { type: "stable", text: "—", color: "#6b7280" };
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const val = Math.abs(hash) % 100;
  if (val < 25) {
    const change = (val % 3) + 1;
    return { type: "up", text: `▲${change}`, color: "#16a34a" };
  } else if (val < 50) {
    const change = (val % 2) + 1;
    return { type: "down", text: `▼${change}`, color: "#dc2626" };
  } else {
    return { type: "stable", text: "—", color: "#6b7280" };
  }
}

const MEDAL_COLORS = ["#f59e0b", "#94a3b8", "#cd7f32"];
const MEDAL_BG = ["#fef3c7", "#f1f5f9", "#fdf4e7"];
const MEDAL_ICONS: ("medal" | "medal-outline" | "podium-bronze")[] = ["medal", "medal-outline", "podium-bronze"];
const LEADERBOARD_CACHE_MAX_AGE_MS = 1000 * 60 * 15;
const BADGE_CACHE_MAX_AGE_MS = 1000 * 60 * 20;

type BadgeCachePayload = {
  gardenPlants: GardenPlant[];
  orders: Order[];
};

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
  async function loadLeaderboard(options: { silent?: boolean } = {}) {
    setIsLoadingLeaderboard(options.silent ? false : leaderboard.length === 0);
    setLeaderboardError(null);
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
      writeFastCache<LeaderboardEntry[]>("rankings:leaderboard:v1", data).catch(() => {});
    } catch (loadError) {
      setLeaderboardError(loadError instanceof Error ? loadError.message : "Unable to load leaderboard.");
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }

  // ── Load Garden and Order data for badges ──
  async function loadBadgeData(options: { silent?: boolean } = {}) {
    if (!user) return;
    setIsLoadingBadges(options.silent ? false : gardenPlants.length === 0 && orders.length === 0);
    try {
      const g = await getOrCreateMyGarden(user.id);
      const plants = await getGardenPlants(g.id);
      setGardenPlants(plants);

      const userOrders = await getUserOrders(user.id);
      setOrders(userOrders);
      writeFastCache<BadgeCachePayload>(`rankings:${user.id}:badges:v1`, { gardenPlants: plants, orders: userOrders }).catch(() => {});
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

    async function hydrateLeaderboard() {
      const cached = await readFastCache<LeaderboardEntry[]>("rankings:leaderboard:v1", LEADERBOARD_CACHE_MAX_AGE_MS);
      if (cached) {
        setLeaderboard(cached);
        setIsLoadingLeaderboard(false);
      }
      loadLeaderboard({ silent: !!cached });
    }

    initConsistency();
    hydrateLeaderboard();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateBadges() {
      if (!user?.id || activeView !== "badges") return;
      const cached = await readFastCache<BadgeCachePayload>(`rankings:${user.id}:badges:v1`, BADGE_CACHE_MAX_AGE_MS);
      if (cached && isMounted) {
        setGardenPlants(cached.gardenPlants);
        setOrders(cached.orders);
        setIsLoadingBadges(false);
      }

      if (isMounted) {
        loadBadgeData({ silent: !!cached });
      }
    }

    hydrateBadges();
    return () => {
      isMounted = false;
    };
  }, [user?.id, activeView]);

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

  // ── Leaderboard partitioning (removing 0-points from active rankings) ──
  const rankedUsers = leaderboard.filter((u) => u.points > 0);
  const gettingStartedUsers = leaderboard.filter((u) => u.points === 0);

  const top3 = rankedUsers.slice(0, 3);
  const rest = rankedUsers.slice(3);

  return (
    <Screen showHeader={false} scroll={false} noPadding={true}>
      {/* ── Forest Green Rounded Header ── */}
      <View style={[styles.headerBlock, embedded && styles.headerBlockEmbedded]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {activeView === "badges" ? "Plant Achievements" : "Garden Rankings"}
          </Text>
        </View>
        {activeView === "leaderboard" && (
          <Pressable
            onPress={() => loadLeaderboard()}
            style={styles.headerRefreshBtn}
            hitSlop={8}
          >
            {isLoadingLeaderboard ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={20} color={colors.white} />
            )}
          </Pressable>
        )}
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

          {/* New Gardeners Onboarding Welcome Banner (when no one has points yet) */}
          {!isLoadingLeaderboard && !leaderboardError && rankedUsers.length === 0 && gettingStartedUsers.length > 0 && (
            <View style={styles.noRankedBanner}>
              <MaterialCommunityIcons name="sprout" size={32} color={colors.greenMid} style={{ marginBottom: 6 }} />
              <Text style={styles.noRankedTitle}>Welcome to Rankings!</Text>
              <Text style={styles.noRankedDesc}>
                Be the first gardener to earn points by adding a plant to your garden (+3 pts), posting an update (+5 pts) or creating a shop listing (+10 pts)!
              </Text>
            </View>
          )}

          {/* Podium */}
          {!isLoadingLeaderboard && top3.length > 0 && (
            <View style={styles.podium}>
              {/* 2nd place */}
              {top3[1] && (
                <Pressable
                  style={styles.podiumColContainer}
                  onPress={() => handleViewSellerGarden(top3[1].userId, top3[1].displayName)}
                >
                  <View style={styles.podiumAvatarOuter}>
                    <View style={[styles.podiumAvatar, { borderColor: MEDAL_COLORS[1] }]}>
                      {top3[1].avatarUrl ? (
                        <Image source={{ uri: top3[1].avatarUrl }} style={styles.podiumAvatarImg} />
                      ) : (
                        <Text style={styles.podiumAvatarLetter}>{top3[1].displayName[0]?.toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={[styles.podiumMedalBadge, { backgroundColor: MEDAL_BG[1] }]}>
                      <MaterialCommunityIcons name={MEDAL_ICONS[1]} size={14} color={MEDAL_COLORS[1]} />
                    </View>
                  </View>
                  <View style={[styles.podiumColumn, { height: 70, backgroundColor: MEDAL_BG[1], borderColor: MEDAL_COLORS[1] }]}>
                    <Text style={[styles.podiumRankText, { color: MEDAL_COLORS[1] }]}>2</Text>
                    <Text style={styles.podiumPointsText}>{top3[1].points} pts</Text>
                  </View>
                  <Text style={styles.podiumNameBelow} numberOfLines={1}>{top3[1].displayName}</Text>
                </Pressable>
              )}

              {/* 1st place */}
              {top3[0] && (
                <Pressable
                  style={styles.podiumColContainer}
                  onPress={() => handleViewSellerGarden(top3[0].userId, top3[0].displayName)}
                >
                  <View style={styles.podiumAvatarOuterLg}>
                    <View style={styles.crownWrap}>
                      <MaterialCommunityIcons name="crown" size={18} color="#f59e0b" />
                    </View>
                    <View style={[styles.podiumAvatar, styles.podiumAvatarLg, { borderColor: MEDAL_COLORS[0] }]}>
                      {top3[0].avatarUrl ? (
                        <Image source={{ uri: top3[0].avatarUrl }} style={styles.podiumAvatarImgLg} />
                      ) : (
                        <Text style={styles.podiumAvatarLetterLg}>{top3[0].displayName[0]?.toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={[styles.podiumMedalBadge, { backgroundColor: MEDAL_BG[0] }]}>
                      <MaterialCommunityIcons name={MEDAL_ICONS[0]} size={14} color={MEDAL_COLORS[0]} />
                    </View>
                  </View>
                  <View style={[styles.podiumColumn, { height: 90, backgroundColor: MEDAL_BG[0], borderColor: MEDAL_COLORS[0] }]}>
                    <Text style={[styles.podiumRankText, { color: MEDAL_COLORS[0], fontSize: 26 }]}>1</Text>
                    <Text style={[styles.podiumPointsText, { fontSize: 12, fontWeight: "900" }]}>{top3[0].points} pts</Text>
                  </View>
                  <Text style={[styles.podiumNameBelow, styles.podiumNameBelowLg]} numberOfLines={1}>{top3[0].displayName}</Text>
                </Pressable>
              )}

              {/* 3rd place */}
              {top3[2] && (
                <Pressable
                  style={styles.podiumColContainer}
                  onPress={() => handleViewSellerGarden(top3[2].userId, top3[2].displayName)}
                >
                  <View style={styles.podiumAvatarOuter}>
                    <View style={[styles.podiumAvatar, { borderColor: MEDAL_COLORS[2] }]}>
                      {top3[2].avatarUrl ? (
                        <Image source={{ uri: top3[2].avatarUrl }} style={styles.podiumAvatarImg} />
                      ) : (
                        <Text style={styles.podiumAvatarLetter}>{top3[2].displayName[0]?.toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={[styles.podiumMedalBadge, { backgroundColor: MEDAL_BG[2] }]}>
                      <MaterialCommunityIcons name={MEDAL_ICONS[2]} size={14} color={MEDAL_COLORS[2]} />
                    </View>
                  </View>
                  <View style={[styles.podiumColumn, { height: 52, backgroundColor: MEDAL_BG[2], borderColor: MEDAL_COLORS[2] }]}>
                    <Text style={[styles.podiumRankText, { color: MEDAL_COLORS[2] }]}>3</Text>
                    <Text style={styles.podiumPointsText}>{top3[2].points} pts</Text>
                  </View>
                  <Text style={styles.podiumNameBelow} numberOfLines={1}>{top3[2].displayName}</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* List remaining */}
          {!isLoadingLeaderboard && rest.length > 0 && (
            <View style={styles.listWrap}>
              <Text style={styles.listLabel}>All Rankings</Text>
              {rest.map((entry, idx) => {
                const trend = getRankTrend(entry.userId, entry.points);
                const isNipping = idx === 0; // Rank #4
                return (
                  <Pressable
                    key={entry.userId}
                    style={[styles.row, isNipping && styles.rowNipping]}
                    onPress={() => handleViewSellerGarden(entry.userId, entry.displayName)}
                  >
                    <View style={styles.rankContainer}>
                      <Text style={styles.rankNum}>#{idx + 4}</Text>
                      <View style={styles.trendRow}>
                        {trend.type === "up" && <MaterialCommunityIcons name="arrow-up" size={10} color="#16a34a" />}
                        {trend.type === "down" && <MaterialCommunityIcons name="arrow-down" size={10} color="#dc2626" />}
                        <Text style={[styles.trendText, { color: trend.color }]}>{trend.text}</Text>
                      </View>
                    </View>
                    {entry.avatarUrl ? (
                      <Image source={{ uri: entry.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarLetter}>{entry.displayName[0]?.toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.rowInfo}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.rowName} numberOfLines={1}>{entry.displayName}</Text>
                        {isNipping && (
                          <View style={styles.nippingTag}>
                            <Text style={styles.nippingTagText}>Podium Chaser</Text>
                          </View>
                        )}
                      </View>
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
                );
              })}
            </View>
          )}

          {/* Getting Started onboarding section for users with 0 points */}
          {!isLoadingLeaderboard && gettingStartedUsers.length > 0 && (
            <View style={styles.gettingStartedSection}>
              <Text style={styles.gettingStartedLabel}>🌱 Getting Started</Text>
              <Text style={styles.gettingStartedIntro}>
                New gardeners setting up their roots. Help them grow by checking out their profiles!
              </Text>
              <View style={styles.gettingStartedGrid}>
                {gettingStartedUsers.map((entry) => (
                  <Pressable
                    key={entry.userId}
                    style={styles.gettingStartedCard}
                    onPress={() => handleViewSellerGarden(entry.userId, entry.displayName)}
                  >
                    {entry.avatarUrl ? (
                      <Image source={{ uri: entry.avatarUrl }} style={styles.gettingStartedAvatar} />
                    ) : (
                      <View style={styles.gettingStartedAvatarFallback}>
                        <Text style={styles.gettingStartedAvatarLetter}>
                          {entry.displayName[0]?.toUpperCase() ?? "G"}
                        </Text>
                      </View>
                    )}
                    <View style={styles.gettingStartedInfo}>
                      <Text style={styles.gettingStartedName} numberOfLines={1}>
                        {entry.displayName}
                      </Text>
                      <Text style={styles.gettingStartedStatus}>Ready to grow</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
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
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 24,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBlockEmbedded: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: -0.5,
  },
  headerRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
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

  noRankedBanner: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineMid,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  noRankedTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.green,
    marginBottom: 6,
  },
  noRankedDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },

  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  podiumColContainer: {
    alignItems: "center",
    flex: 1,
    maxWidth: 120,
  },
  crownWrap: {
    position: "absolute",
    top: -15,
    alignSelf: "center",
    zIndex: 15,
  },
  podiumAvatarOuter: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    position: "relative",
  },
  podiumAvatarOuterLg: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    position: "relative",
  },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    overflow: "hidden",
  },
  podiumAvatarLg: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  podiumAvatarImg: { width: "100%", height: "100%", borderRadius: 26 },
  podiumAvatarImgLg: { width: "100%", height: "100%", borderRadius: 33 },
  podiumAvatarLetter: { fontSize: 18, fontWeight: "900", color: colors.green },
  podiumAvatarLetterLg: { fontSize: 22, fontWeight: "900", color: colors.green },

  podiumMedalBadge: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    zIndex: 12,
    ...shadow.sm,
  },
  podiumColumn: {
    width: "100%",
    marginTop: -8,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 1,
    ...shadow.sm,
  },
  podiumRankText: {
    fontSize: 20,
    fontWeight: "900",
  },
  podiumPointsText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "800",
    marginTop: 2,
  },
  podiumNameBelow: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: 8,
    width: "100%",
  },
  podiumNameBelowLg: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.green,
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
  rowNipping: {
    borderColor: "#f59e0b",
    borderWidth: 1.5,
    backgroundColor: "#fffbeb",
    ...shadow.md,
  },
  nippingTag: {
    backgroundColor: "#fef3c7",
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: "#f59e0b",
  },
  nippingTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#d97706",
  },
  rankContainer: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: { fontSize: 13, fontWeight: "900", color: colors.textPrimary },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    marginTop: 2,
  },
  trendText: {
    fontSize: 9,
    fontWeight: "800",
  },
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
  ptsBubble: { alignItems: "center", minWidth: 40 },
  ptsNum: { fontSize: 16, fontWeight: "900", color: colors.green },
  ptsLabel: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },

  // ── Getting Started section styles ──
  gettingStartedSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  gettingStartedLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  gettingStartedIntro: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  gettingStartedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gettingStartedCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 8,
    ...shadow.sm,
  },
  gettingStartedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  gettingStartedAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  gettingStartedAvatarLetter: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.green,
  },
  gettingStartedInfo: {
    flex: 1,
  },
  gettingStartedName: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  gettingStartedStatus: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },

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
