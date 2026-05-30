import { useEffect, useState } from "react";
import { Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { EmptyState } from "../components/EmptyState";
import { SkeletonBlock, SkeletonLine } from "../components/Skeleton";
import { getConversations, type Conversation } from "../services/messages";
import { colors, radius, shadow } from "../theme/colors";
import { readFastCache, writeFastCache } from "../utils/fastCache";

const leafyAvatar = require("../../assets/leafy-ai.png");
const MESSAGES_CACHE_MAX_AGE_MS = 1000 * 60 * 10;

type MessagesScreenProps = {
  onOpenChat: (conversationId: string, title: string) => void;
};

function formatConvoTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  } else {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
}

function createLeafyConversation(): Conversation {
  return {
    id: "leafy-ai-assistant",
    type: "leafy",
    listingId: null,
    gardenId: null,
    title: "Leafy AI Assistant",
    updatedAt: new Date().toISOString(),
    otherMember: {
      id: "leafy-ai",
      displayName: "Leafy AI Assistant",
      avatarUrl: null,
    },
  };
}

export function MessagesScreen({ onOpenChat }: MessagesScreenProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  async function loadConversations(options: { silent?: boolean } = {}) {
    if (!user) return;
    setIsLoading(options.silent ? false : conversations.length === 0);
    setError(null);
    try {
      const data = await getConversations(user.id);
      const leafyConvo = createLeafyConversation();
      setConversations([leafyConvo, ...data]);
      writeFastCache<Conversation[]>(`messages:${user.id}:v1`, data).catch(() => {});
    } catch (convoError) {
      const message = convoError instanceof Error ? convoError.message : "Unable to load inbox.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateThenRefresh() {
      if (!user) return;
      const cached = await readFastCache<Conversation[]>(`messages:${user.id}:v1`, MESSAGES_CACHE_MAX_AGE_MS);
      if (cached && isMounted) {
        setConversations([createLeafyConversation(), ...cached]);
        setIsLoading(false);
      }

      if (isMounted) {
        loadConversations({ silent: !!cached });
      }
    }

    hydrateThenRefresh();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  }

  const leafyConversation = conversations.find((convo) => convo.id === "leafy-ai-assistant");
  const otherConversations = conversations.filter((convo) => convo.id !== "leafy-ai-assistant");
  const searchTerm = search.trim().toLowerCase();
  const conversationMatchesSearch = (convo: Conversation) => {
    if (!searchTerm) return true;
    const title = (convo.type === "market" && convo.otherMember)
      ? convo.otherMember.displayName
      : convo.title || convo.otherMember?.displayName || "";
    const subtitle = convo.id === "leafy-ai-assistant"
      ? "Instant Plant Care & Gardening Tips"
      : convo.lastMessage?.body
      ? convo.lastMessage.body
      : convo.type === "market"
      ? "Marketplace inquiry"
      : "Tap to open chat";

    return [title, convo.otherMember?.displayName, subtitle, convo.type]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchTerm));
  };
  const filteredLeafyConversation = leafyConversation && conversationMatchesSearch(leafyConversation) ? leafyConversation : null;
  const filteredOtherConversations = otherConversations.filter(conversationMatchesSearch);

  const filteredConversations = [
    ...(filteredLeafyConversation ? [filteredLeafyConversation] : []),
    ...filteredOtherConversations,
  ];

  function renderConversation(convo: Conversation) {
    const isLeafy = convo.id === "leafy-ai-assistant";
    
    // Anchor marketplace inquiries to the user's name
    const chatTitle = (convo.type === "market" && convo.otherMember)
      ? convo.otherMember.displayName
      : convo.title || convo.otherMember?.displayName || "GrowMate Chat";

    const subtitle = isLeafy
      ? "Instant Plant Care & Gardening Tips"
      : convo.lastMessage?.body
      ? convo.lastMessage.body
      : convo.type === "market"
      ? "Marketplace inquiry"
      : "Tap to open chat";

    const isUnread = (() => {
      if (isLeafy) return false;
      if (!convo.lastMessage) return false;
      if (convo.lastMessage.senderId === user?.id) return false;
      if (!convo.lastReadAt) return true;
      return new Date(convo.lastMessage.createdAt).getTime() > new Date(convo.lastReadAt).getTime();
    })();

    const showThumbnail = convo.type === "market" && !!convo.listingPhotoUrl;

    return (
      <Pressable 
        key={convo.id} 
        onPress={() => onOpenChat(convo.id, chatTitle)}
        style={styles.convoItem}
      >
        <View style={styles.convoRow}>
          {isLeafy ? (
            <Image source={leafyAvatar} style={styles.avatar} />
          ) : convo.otherMember?.avatarUrl ? (
            <Image source={{ uri: convo.otherMember.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <MaterialCommunityIcons name="account" size={28} color={colors.greenMuted} />
            </View>
          )}

          <View style={styles.content}>
            <Text 
              style={[styles.chatTitle, isUnread && styles.unreadTitle]} 
              numberOfLines={1}
            >
              {chatTitle}
            </Text>
            <Text 
              style={[styles.subtitle, isUnread && styles.unreadSubtitle]} 
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>

          <View style={styles.metaColumn}>
            {isLeafy ? (
              <View style={styles.aiStatusBadge}>
                <Text style={styles.aiStatusText}>AI BOT</Text>
              </View>
            ) : (
              <View style={styles.metaRow}>
                {isUnread && <View style={styles.unreadDot} />}
                <Text style={[styles.time, isUnread && styles.unreadTime]}>
                  {formatConvoTime(convo.updatedAt)}
                </Text>
              </View>
            )}
          </View>

          {showThumbnail && (
            <Image source={{ uri: convo.listingPhotoUrl! }} style={styles.productThumbnail} />
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Screen
      sectionLabel="Inbox"
      title="Messages"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.green}
          colors={[colors.green]}
        />
      }
    >
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={19} color={colors.greenMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search messages"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8} style={styles.clearSearchBtn}>
              <MaterialCommunityIcons name="close" size={16} color={colors.greenMuted} />
            </Pressable>
          )}
        </View>
        <Pressable 
          onPress={() => loadConversations()} 
          style={styles.refreshBtn}
          accessibilityLabel="Refresh conversations"
        >
          <MaterialCommunityIcons name="refresh" size={22} color={colors.green} />
        </Pressable>
      </View>

      {error && (
        <Card tint="warning">
          <Text style={styles.errorTitle}>Connection error</Text>
          <Text style={styles.body}>{error}</Text>
        </Card>
      )}

      {isLoading && (
        <MessagesSkeleton />
      )}

      {!isLoading && filteredConversations.length > 0 && (
        <View style={styles.convoContainer}>
          {filteredConversations.map((convo, index) => (
            <View key={convo.id}>
              {renderConversation(convo)}
              {index < filteredConversations.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}

      {!isLoading && !searchTerm && otherConversations.length === 0 && (
        <EmptyState
          icon="chat-processing-outline"
          title="No messages yet"
          description="Inquiries from marketplace listings and direct chats with other gardeners will appear here."
        />
      )}

      {!isLoading && searchTerm && filteredConversations.length === 0 && (
        <EmptyState
          icon="magnify"
          title="No matches"
          description="Try searching a name, listing, or chat type."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  searchWrap: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 3,
  },
  searchInput: {
    color: colors.green,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 10,
  },
  clearSearchBtn: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  refreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    color: colors.green,
    fontSize: 17,
    fontWeight: "900",
  },
  body: {
    marginTop: 8,
    color: colors.greenMuted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
  },
  convoContainer: {
    backgroundColor: colors.surface0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
    overflow: "hidden",
  },
  skeletonContainer: {
    backgroundColor: colors.surface0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  convoItem: {
    padding: 16,
  },
  convoRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  avatar: {
    backgroundColor: colors.sage,
    borderRadius: 24,
    height: 48,
    width: 48,
    marginRight: 12,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "#e9edf0",
    borderRadius: 24,
    borderColor: "#d5dbe0",
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  chatTitle: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "500",
  },
  unreadTitle: {
    fontWeight: "800",
  },
  subtitle: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "400",
    marginTop: 3,
  },
  unreadSubtitle: {
    color: colors.green,
    fontWeight: "700",
  },
  metaColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.leaf,
  },
  time: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  unreadTime: {
    color: colors.green,
    fontWeight: "700",
  },
  productThumbnail: {
    width: 40,
    height: 40,
    borderRadius: radius.xs,
    marginLeft: 12,
    backgroundColor: colors.surface1,
  },
  aiStatusBadge: {
    backgroundColor: "#e8f5e9",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiStatusText: {
    color: "#2e7d32",
    fontSize: 10,
    fontWeight: "900",
  },
});

function MessagesSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[0, 1, 2].map((item, index) => (
        <View key={item}>
          <View style={styles.convoItem}>
            <View style={styles.convoRow}>
              <SkeletonBlock height={48} width={48} borderRadius={24} />
              <View style={styles.content}>
                <SkeletonLine width="64%" height={14} style={{ marginBottom: 6 }} />
                <SkeletonLine width="82%" height={11} />
              </View>
              <SkeletonLine width={42} height={10} />
            </View>
          </View>
          {index < 2 && <View style={styles.divider} />}
        </View>
      ))}
    </View>
  );
}
