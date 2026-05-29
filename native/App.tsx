import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Appearance, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { NavigationProvider, useNavigationContext } from "./src/context/NavigationContext";
import { AuthScreen } from "./src/screens/AuthScreen";
import { FeedScreen } from "./src/screens/FeedScreen";
import { GardenScreen } from "./src/screens/GardenScreen";
import { MarketScreen } from "./src/screens/MarketScreen";
import { MessagesScreen } from "./src/screens/MessagesScreen";
import { ChatDetailScreen } from "./src/screens/ChatDetailScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { ListingDetailScreen } from "./src/screens/ListingDetailScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { colors } from "./src/theme/colors";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { getUserOrders } from "./src/services/listings";

type TabKey = "Market" | "Feed" | "Garden" | "Messages" | "Rankings" | "Orders" | "Profile";

const tabs: TabKey[] = ["Market", "Feed", "Garden", "Orders", "Profile"];

const logoSource = require("./assets/growmate-logo.png");
const splashLogoSource = require("./assets/growmate-logo-transparent.png");

// Prototype-matching icons: outline for inactive, filled/solid for active
const tabIconsInactive: Record<TabKey, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Market: "storefront-outline",
  Feed: "message-text-outline",
  Garden: "sprout-outline",
  Messages: "email-outline",
  Rankings: "trophy-outline",
  Orders: "clipboard-text-outline",
  Profile: "account-circle-outline",
};

const tabIconsActive: Record<TabKey, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Market: "storefront",
  Feed: "message-text",
  Garden: "sprout",
  Messages: "email",
  Rankings: "trophy",
  Orders: "clipboard-text",
  Profile: "account-circle",
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationProvider>
            <AppContent />
          </NavigationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function BottomNavItem({
  badgeCount = 0,
  isActive,
  onPress,
  tab,
}: {
  badgeCount?: number;
  isActive: boolean;
  onPress: () => void;
  tab: TabKey;
}) {
  const activeProgress = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(activeProgress, {
      toValue: isActive ? 1 : 0,
      damping: 16,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [activeProgress, isActive]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.94,
      damping: 16,
      stiffness: 260,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      damping: 14,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  const translateY = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });
  const iconScale = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const activeOpacity = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const inactiveOpacity = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.navItem}
    >
      <Animated.View style={[styles.navItemAnimated, { transform: [{ scale: pressScale }, { translateY }] }]}>
        <View style={styles.iconStage}>
          <Animated.View style={[styles.iconGlow, { opacity: activeOpacity, transform: [{ scale: iconScale }] }]} />
          <Animated.View style={[styles.iconHalo, { opacity: inactiveOpacity }]} />
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <MaterialCommunityIcons
              color={isActive ? colors.green : colors.greenMuted}
              name={isActive ? tabIconsActive[tab] : tabIconsInactive[tab]}
              size={isActive ? 24 : 22}
            />
            {badgeCount > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
              </View>
            )}
          </Animated.View>
        </View>
        <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
          {tab}
        </Text>
        <Animated.View style={[styles.activeDot, { opacity: activeOpacity }]} />
      </Animated.View>
    </Pressable>
  );
}

function AppContent() {
  const { activeTab, setActiveTab } = useNavigationContext();
  const [activeChat, setActiveChat] = useState<{ id: string; title: string } | null>(null);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const { isLoading, session } = useAuth();
  const { activeTheme } = useTheme();
  const [ordersBadgeCount, setOrdersBadgeCount] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let isMounted = true;
    async function loadOrdersBadge() {
      if (!session?.user.id) {
        setOrdersBadgeCount(0);
        return;
      }

      try {
        const orders = await getUserOrders(session.user.id);
        const buyerOrders = orders.filter((order) => order.buyerId === session.user.id);
        if (isMounted) {
          const actionable = buyerOrders.filter((order) =>
            ["pending", "accepted", "paid", "disputed"].includes(order.status),
          );
          setOrdersBadgeCount(actionable.length);
        }
      } catch {
        if (isMounted) {
          setOrdersBadgeCount(0);
        }
      }
    }

    loadOrdersBadge();
    return () => {
      isMounted = false;
    };
  }, [session?.user.id, activeTab]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <StatusBar style={activeTheme === "dark" ? "light" : "dark"} />
        <Image source={splashLogoSource} style={styles.loadingLogo} />
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style={activeTheme === "dark" ? "light" : "dark"} />
        <AuthScreen />
      </>
    );
  }

  const handleOpenChat = (conversationId: string, title: string) => {
    setActiveChat({ id: conversationId, title });
  };

  const handleOpenListingDetail = (listingId: string) => {
    setActiveListingId(listingId);
  };

  if (activeChat) {
    return (
      <ChatDetailScreen
        conversationId={activeChat.id}
        title={activeChat.title}
        onClose={() => setActiveChat(null)}
      />
    );
  }

  if (activeListingId) {
    return (
      <ListingDetailScreen
        listingId={activeListingId}
        onClose={() => setActiveListingId(null)}
        onOpenChat={handleOpenChat}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style={activeTheme === "dark" ? "light" : "dark"} />

      {/* Screen content — flex:1 so it fills all space above the nav bar */}
      <View style={styles.screenContainer}>
        {activeTab === "Market" && (
          <ErrorBoundary>
            <MarketScreen onOpenChat={handleOpenChat} onOpenListingDetail={handleOpenListingDetail} />
          </ErrorBoundary>
        )}
        {activeTab === "Feed" && <ErrorBoundary><FeedScreen onOpenChat={handleOpenChat} /></ErrorBoundary>}
        {activeTab === "Garden" && (
          <ErrorBoundary>
            <GardenScreen onOpenChat={handleOpenChat} onOpenListingDetail={handleOpenListingDetail} />
          </ErrorBoundary>
        )}
        {activeTab === "Messages" && <ErrorBoundary><MessagesScreen onOpenChat={handleOpenChat} /></ErrorBoundary>}
        {activeTab === "Orders" && (
          <ErrorBoundary>
            <OrdersScreen onOpenChat={handleOpenChat} onOpenListingDetail={handleOpenListingDetail} />
          </ErrorBoundary>
        )}
        {activeTab === "Profile" && (
          <ErrorBoundary>
            <ProfileScreen onOpenChat={handleOpenChat} onOpenListingDetail={handleOpenListingDetail} />
          </ErrorBoundary>
        )}
      </View>

      {/* Bottom nav — NOT absolutely positioned; sits as a flex child */}
      <View style={[styles.nav, { height: 58 + Math.max(insets.bottom, 12), paddingBottom: Math.max(insets.bottom, 8) }]}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <BottomNavItem
              key={tab}
              tab={tab}
              isActive={isActive}
              badgeCount={tab === "Orders" ? ordersBadgeCount : 0}
              onPress={() => setActiveTab(tab)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    // On web, ensure the root fills the viewport and clips correctly
    ...(Platform.OS === "web" ? { height: "100vh" as any, overflow: "hidden" as any } : {}),
  },
  screenContainer: {
    flex: 1,
    // Prevent content from bleeding under the nav bar
    overflow: "hidden" as any,
  },
  loading: {
    alignItems: "center",
    backgroundColor: colors.cream,
    flex: 1,
    justifyContent: "center",
  },
  loadingLogo: {
    height: 112,
    marginBottom: 24,
    resizeMode: "contain",
    width: 112,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopColor: "rgba(26,58,34,0.08)",
    borderTopWidth: 1,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingTop: 9,
    paddingHorizontal: 10,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 12,
    overflow: "visible",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
    overflow: "visible",
  },
  navItemAnimated: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 54,
    width: "100%",
    overflow: "visible",
  },
  iconStage: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 46,
    overflow: "visible",
  },
  iconGlow: {
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    position: "absolute",
    width: 46,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconHalo: {
    backgroundColor: colors.sage,
    borderRadius: 15,
    height: 30,
    position: "absolute",
    width: 30,
  },
  navLabel: {
    color: colors.greenMuted,
    fontSize: 9,
    fontWeight: "800",
    maxWidth: 58,
    textAlign: "center",
  },
  navLabelActive: {
    color: colors.green,
    fontWeight: "900",
  },
  activeDot: {
    backgroundColor: colors.leaf,
    borderRadius: 2,
    height: 4,
    marginTop: 1,
    width: 8,
  },
  navBadge: {
    alignItems: "center",
    backgroundColor: "#d14b4b",
    borderColor: colors.white,
    borderRadius: 7.5,
    borderWidth: 1,
    height: 15,
    justifyContent: "center",
    minWidth: 15,
    paddingHorizontal: 3,
    position: "absolute",
    right: -4,
    top: -4,
    shadowColor: "#7f1d1d",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  navBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "900",
  },
});
