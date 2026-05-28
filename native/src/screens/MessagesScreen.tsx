import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { EmptyState } from "../components/EmptyState";
import { getConversations, type Conversation } from "../services/messages";
import { colors, radius } from "../theme/colors";

const leafyAvatar = require("../../assets/leafy-ai.png");

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

export function MessagesScreen({ onOpenChat }: MessagesScreenProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  async function loadConversations() {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getConversations(user.id);
      const leafyConvo: Conversation = {
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
      setConversations([leafyConvo, ...data]);
    } catch (convoError) {
      const message = convoError instanceof Error ? convoError.message : "Unable to load inbox.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
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
    const title = convo.title || convo.otherMember?.displayName || "";
    const subtitle = convo.id === "leafy-ai-assistant"
      ? "Instant Plant Care & Gardening Tips"
      : convo.type === "market"
      ? "Marketplace inquiry"
      : "Tap to open chat";

    return [title, convo.otherMember?.displayName, subtitle, convo.type]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchTerm));
  };
  const filteredLeafyConversation = leafyConversation && conversationMatchesSearch(leafyConversation) ? leafyConversation : null;
  const filteredOtherConversations = otherConversations.filter(conversationMatchesSearch);

  function renderConversation(convo: Conversation) {
    const isLeafy = convo.id === "leafy-ai-assistant";
    const chatTitle = convo.title || convo.otherMember?.displayName || "GrowMate Chat";
    const subtitle = isLeafy
      ? "Instant Plant Care & Gardening Tips"
      : typeof (convo as Record<string, unknown>)["lastMessage"] === "string"
      ? String((convo as Record<string, unknown>)["lastMessage"]).slice(0, 48)
      : convo.type === "market"
      ? "Marketplace inquiry"
      : "Tap to open chat";

    return (
      <Pressable key={convo.id} onPress={() => onOpenChat(convo.id, chatTitle)}>
        <Card>
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
              <Text style={styles.chatTitle} numberOfLines={1}>{chatTitle}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            </View>
            {isLeafy ? (
              <View style={styles.aiStatusBadge}>
                <Text style={styles.aiStatusText}>AI BOT</Text>
              </View>
            ) : (
              <Text style={styles.time}>
                {formatConvoTime(convo.updatedAt)}
              </Text>
            )}
          </View>
        </Card>
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Inbox</Text>
        <Button variant="secondary" onPress={loadConversations}>
          Refresh
        </Button>
      </View>

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

      {error && (
        <Card tint="warning">
          <Text style={styles.errorTitle}>Connection error</Text>
          <Text style={styles.body}>{error}</Text>
        </Card>
      )}

      {isLoading && (
        <Card>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.body}>Opening your inbox...</Text>
        </Card>
      )}

      {!isLoading && filteredLeafyConversation && renderConversation(filteredLeafyConversation)}

      {!isLoading && !searchTerm && otherConversations.length === 0 && (
        <EmptyState
          icon="chat-processing-outline"
          title="No messages yet"
          description="Inquiries from marketplace listings and direct chats with other gardeners will appear here."
        />
      )}

      {!isLoading && searchTerm && !filteredLeafyConversation && filteredOtherConversations.length === 0 && (
        <EmptyState
          icon="magnify"
          title="No matches"
          description="Try searching a name, listing, or chat type."
        />
      )}

      {!isLoading && filteredOtherConversations.map(renderConversation)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    color: colors.green,
    fontSize: 30,
    fontWeight: "900",
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
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
  errorTitle: {
    color: colors.green,
    fontSize: 17,
    fontWeight: "900",
  },
  emptyTitle: {
    color: colors.green,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  body: {
    marginTop: 8,
    color: colors.greenMuted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
  },
  convoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  avatar: {
    backgroundColor: colors.sage,
    borderRadius: 24,
    height: 48,
    width: 48,
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
  },
  content: {
    flex: 1,
  },
  chatTitle: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  time: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "800",
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
