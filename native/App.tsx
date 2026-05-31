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

// Inactive outline icons
const tabIconsInactive: Record<TabKey, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Market: "storefront-outline",
  Feed: "view-list-outline",
  Garden: "sprout-outline",
  Orders: "receipt-outline",
  Profile: "account-circle-outline",
  Messages: "email-outline",
  Rankings: "trophy-outline",
};

// Active solid filled icons
const tabIconsActive: Record<TabKey, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Market: "storefront",
  Feed: "view-list",
  Garden: "sprout",
  Orders: "receipt",
  Profile: "account-circle",
  Messages: "email",
  Rankings: "trophy",
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
  const popAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(activeProgress, {
      toValue: isActive ? 1 : 0,
      damping: 16,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [activeProgress, isActive]);

  useEffect(() => {
    if (isActive) {
      popAnim.setValue(1);
      Animated.sequence([
        Animated.timing(popAnim, {
          toValue: 1.2,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(popAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isActive]);

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
    outputRange: [0, -3],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.navItem}
    >
      <Animated.View
        style={[
          styles.navItemAnimated,
          { transform: [{ scale: pressScale }, { translateY }] },
        ]}
      >
        <View style={styles.iconContainer}>
          <Animated.View style={{ transform: [{ scale: popAnim }] }}>
            <MaterialCommunityIcons
              color={isActive ? "#0c2b1d" : "#8c8c8c"}
              name={isActive ? tabIconsActive[tab] : tabIconsInactive[tab]}
              size={22}
            />
          </Animated.View>
          {badgeCount > 0 && (
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.navLabel,
            isActive ? styles.navLabelActive : styles.navLabelInactive,
          ]}
          numberOfLines={1}
        >
          {tab}
        </Text>
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
  const [lastMainTab, setLastMainTab] = useState<TabKey>("Feed");

  useEffect(() => {
    if (tabs.includes(activeTab)) {
      setLastMainTab(activeTab);
    }
  }, [activeTab]);

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
      <View style={[styles.nav, { height: 52 + Math.max(insets.bottom, 10), paddingBottom: Math.max(insets.bottom, 10) }]}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab || (activeTab === "Messages" && tab === lastMainTab);
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
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 6,
    paddingHorizontal: 6,
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
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
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
    width: "100%",
    overflow: "visible",
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: 10,
    maxWidth: 58,
    textAlign: "center",
    lineHeight: 12,
  },
  navLabelActive: {
    color: "#0c2b1d",
    fontWeight: "700",
  },
  navLabelInactive: {
    color: "#8c8c8c",
    fontWeight: "400",
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
    right: -6,
    top: -6,
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
