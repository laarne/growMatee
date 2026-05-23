import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
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
import { RankingsScreen } from "./src/screens/RankingsScreen";
import { colors } from "./src/theme/colors";

type TabKey = "Market" | "Feed" | "Garden" | "Messages" | "Rankings" | "Profile";

const tabs: TabKey[] = ["Market", "Feed", "Garden", "Rankings", "Profile"];

const logoSource = require("./assets/icon.png");

// Prototype-matching icons: outline for inactive, filled/solid for active
const tabIconsInactive: Record<TabKey, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Market: "storefront-outline",
  Feed: "forum-outline",
  Garden: "flower-outline",
  Messages: "email-outline",
  Rankings: "trophy-outline",
  Profile: "account-outline",
};

const tabIconsActive: Record<TabKey, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Market: "storefront",
  Feed: "forum",
  Garden: "flower",
  Messages: "email",
  Rankings: "trophy",
  Profile: "account",
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { activeTab, setActiveTab } = useNavigationContext();
  const [activeChat, setActiveChat] = useState<{ id: string; title: string } | null>(null);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <Image source={logoSource} style={styles.loadingLogo} />
        <ActivityIndicator color={colors.green} size="large" />
        <Text style={styles.loadingText}>Loading GrowMate</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style="dark" />
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
      <StatusBar style="dark" />

      {/* Screen content — flex:1 so it fills all space above the nav bar */}
      <View style={styles.screenContainer}>
        {activeTab === "Market" && (
          <MarketScreen onOpenChat={handleOpenChat} onOpenListingDetail={handleOpenListingDetail} />
        )}
        {activeTab === "Feed" && <FeedScreen />}
        {activeTab === "Garden" && <GardenScreen />}
        {activeTab === "Messages" && <MessagesScreen onOpenChat={handleOpenChat} />}
        {activeTab === "Rankings" && <RankingsScreen />}
        {activeTab === "Profile" && <ProfileScreen onOpenListingDetail={handleOpenListingDetail} />}
      </View>

      {/* Bottom nav — NOT absolutely positioned; sits as a flex child */}
      <View style={styles.nav}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <MaterialCommunityIcons
                  color={isActive ? colors.white : colors.greenMuted}
                  name={isActive ? tabIconsActive[tab] : tabIconsInactive[tab]}
                  size={24}
                />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const NAV_HEIGHT = Platform.OS === "ios" ? 80 : 68;

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
  loadingText: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 14,
  },
  loadingLogo: {
    borderRadius: 22,
    height: 86,
    marginBottom: 18,
    width: 86,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    backgroundColor: colors.white,
    height: NAV_HEIGHT,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 8,
    paddingHorizontal: 4,
    // Subtle top shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 3,
  },
  navItemPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  iconWrapActive: {
    backgroundColor: colors.green,
  },
  navLabel: {
    color: colors.greenMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: colors.green,
    fontWeight: "900",
  },
});
