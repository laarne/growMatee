import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { getMessages, sendMessage, markConversationAsRead, type Message } from "../services/messages";
import { supabase } from "../services/supabase";
import { colors } from "../theme/colors";

type ChatDetailScreenProps = {
  conversationId: string;
  title: string;
  onClose: () => void;
};

export function ChatDetailScreen({ conversationId, title, onClose }: ChatDetailScreenProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  async function loadMessages(silent = false) {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const data = await getMessages(conversationId);
      setMessages(data);
      if (!silent) {
        setError(null);
      }
    } catch (msgError) {
      if (!silent) {
        const message = msgError instanceof Error ? msgError.message : "Unable to load messages.";
        setError(message);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }

  async function handleSend() {
    if (!user || !text.trim() || isSending) return;

    setIsSending(true);
    const content = text.trim();
    setText("");

    try {
      const newMsg = await sendMessage(conversationId, user.id, content);
      setMessages((current) => [...current, newMsg]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Failed to send message.";
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    loadMessages();
    if (user) {
      markConversationAsRead(conversationId, user.id).catch(console.error);
    }

    let channel: any = null;

    if (supabase) {
      channel = supabase
        .channel(`chat:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: any) => {
            const newMsg = payload.new;
            setMessages((current) => {
              if (current.some((m) => m.id === newMsg.id)) {
                return current;
              }
              return [
                ...current,
                {
                  id: newMsg.id,
                  conversationId: newMsg.conversation_id,
                  senderId: newMsg.sender_id,
                  body: newMsg.body,
                  imageUrl: newMsg.image_url,
                  createdAt: newMsg.created_at,
                },
              ];
            });
            if (user) {
              markConversationAsRead(conversationId, user.id).catch(console.error);
            }
          }
        )
        .subscribe();
    }

    // Poll for new messages every 5 seconds as a silent fallback
    const interval = setInterval(() => {
      loadMessages(true);
      if (user) {
        markConversationAsRead(conversationId, user.id).catch(console.error);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [conversationId, user?.id]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <Screen>
        <View style={styles.header}>
          <Button variant="secondary" onPress={onClose}>
            Back
          </Button>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>

        {error && (
          <Card tint="warning">
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.green} size="large" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : (
          <ScrollView ref={scrollViewRef} contentContainerStyle={styles.messagesList} style={styles.scroll}>
            {messages.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No messages yet. Send a message to start conversing!</Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <View key={msg.id} style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther]}>
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                      <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                        {msg.body}
                      </Text>
                      <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <View style={styles.composerRow}>
          <TextInput
            multiline
            onChangeText={setText}
            placeholder="Type your message..."
            placeholderTextColor="#8a9583"
            style={styles.input}
            value={text}
          />
          <Button disabled={isSending || !text.trim()} onPress={handleSend}>
            {isSending ? "Sending" : "Send"}
          </Button>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.cream,
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
  },
  title: {
    color: colors.green,
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
  },
  scroll: {
    flex: 1,
    marginVertical: 10,
  },
  messagesList: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  bubbleWrap: {
    flexDirection: "row",
    marginVertical: 6,
    width: "100%",
  },
  bubbleWrapMe: {
    justifyContent: "flex-end",
  },
  bubbleWrapOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    borderRadius: 20,
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: colors.green,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.sage,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: colors.white,
  },
  bubbleTextOther: {
    color: colors.green,
  },
  timeText: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "right",
  },
  timeTextMe: {
    color: colors.sage,
  },
  timeTextOther: {
    color: colors.greenMuted,
  },
  composerRow: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    color: colors.green,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    maxHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loaderWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  loadingText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
  },
  emptyWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyText: {
    color: colors.greenMuted,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  errorText: {
    color: "#9f2d20",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
});
