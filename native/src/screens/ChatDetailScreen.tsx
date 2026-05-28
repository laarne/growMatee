import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, Pressable, Keyboard } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { generateLeafyChatResponse } from "../services/leafyChat";
import { scanPlantWithLeafy, type LeafyScanResult } from "../services/leafyScan";
import { getMessages, sendMessage, markConversationAsRead, type Message } from "../services/messages";
import { pickImageFromLibrary, type PickedImage } from "../services/storage";
import { supabase } from "../services/supabase";
import { colors } from "../theme/colors";
import { unwrapDelimitedUserInput, wrapUserInputForPrompt } from "../utils/promptSafety";
import { sanitizeUserInput } from "../utils/sanitize";
import { STORAGE_KEYS } from "../utils/storageKeys";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const leafyAvatar = require("../../assets/leafy-ai.png");

function getLeafyMessagesStorageKey(userId: string) {
  return `${STORAGE_KEYS.LEAFY_MESSAGES}:${userId}`;
}

function getLeafyResponse(delimitedUserInput: string): string {
  const q = unwrapDelimitedUserInput(delimitedUserInput).toLowerCase();

  // Watering
  if (q.includes("water") || q.includes("watering") || q.includes("dry") || q.includes("thirsty")) {
    return "🌊 Most indoor plants prefer the 'soak and dry' method: water thoroughly until it drains from the bottom, then let the top 2 inches of soil dry completely before watering again. Stick your finger into the soil — if it's moist, wait a day more!";
  }
  // Overwatering
  if (q.includes("overwater") || q.includes("too much water") || q.includes("root rot")) {
    return "⚠️ Overwatering is the #1 plant killer! Signs: yellowing leaves, mushy stems, soggy soil, and fungus gnats. Fix: let the soil fully dry out, improve drainage, and remove any rotten roots during repotting.";
  }
  // Yellow leaves
  if (q.includes("yellow") || q.includes("yellowing")) {
    return "🍂 Yellow leaves can mean: (1) Overwatering — most common cause, (2) Under-watering — soil too dry, (3) Low light, (4) Lack of nutrients. Check your soil moisture first. If it's wet, let it dry. If dry, water thoroughly.";
  }
  // Brown tips
  if (q.includes("brown tip") || q.includes("brown edge") || q.includes("crispy")) {
    return "🌿 Brown leaf tips usually indicate: (1) Low humidity — mist leaves or use a pebble tray, (2) Over-fertilizing — flush the soil, (3) Tap water with fluoride — try filtered or rain water.";
  }
  // Sunlight & light
  if (q.includes("sunlight") || q.includes("light") || q.includes("window") || q.includes("dark")) {
    return "☀️ Light guide: South or west windows = bright direct light (cacti, succulents). East window = bright indirect light (Monsteras, Pothos). North window = low light (Ferns, ZZ plants). Leggy stems reaching toward light = needs more!";
  }
  // Monstera
  if (q.includes("monstera")) {
    return "🌿 Monstera care: Bright indirect light, water every 1-2 weeks (when top 2 inches dry), chunky well-draining soil (add orchid bark + perlite), wipe leaves monthly. Fenestrations (holes) appear with maturity and good light!";
  }
  // Pothos
  if (q.includes("pothos") || q.includes("golden pothos")) {
    return "✨ Pothos are almost indestructible! Water when soil is dry, they tolerate low light (but variegated ones need more light). Great for beginners. Propagate easily in water — just snip below a node!";
  }
  // Snake plant
  if (q.includes("snake plant") || q.includes("sansevieria") || q.includes("dracaena trifasciata")) {
    return "🌵 Snake plants are the ultimate low-maintenance plant. Water only every 2-6 weeks, tolerate very low light, and thrive on neglect. They're one of the best air purifiers too!";
  }
  // Succulents
  if (q.includes("succulent") || q.includes("cactus") || q.includes("cacti")) {
    return "🌵 Succulents & cacti need: Bright direct sunlight (6+ hours), watering only when soil is BONE DRY, well-draining cactus mix with extra perlite, and a terracotta pot for breathability. Never leave them in standing water!";
  }
  // Soil & repotting
  if (q.includes("soil") || q.includes("potting mix") || q.includes("repot") || q.includes("pot size")) {
    return "🪴 Repotting tips: Choose a pot only 2 inches larger. Repot in spring when you see roots circling or coming out of drainage holes. Use chunky, well-draining mix. Water thoroughly after repotting and keep in indirect light for 1-2 weeks to recover.";
  }
  // Fertilizer
  if (q.includes("fertiliz") || q.includes("nutrient") || q.includes("feed") || q.includes("npk")) {
    return "🌱 Fertilizing guide: Use a balanced liquid fertilizer (e.g. 20-20-20 NPK) at half strength every 2-4 weeks during growing season (spring/summer). Don't fertilize in winter — plants rest! Always fertilize moist soil to avoid root burn.";
  }
  // Humidity
  if (q.includes("humid") || q.includes("mist") || q.includes("dry air")) {
    return "💧 Tropical plants (Calatheas, Ferns, Orchids) love humidity of 50-70%. Tips: Group plants together, use a pebble tray with water, or get a small humidifier. Misting can help but may cause fungal issues if overdone.";
  }
  // Propagation
  if (q.includes("propagat") || q.includes("cutting") || q.includes("clone") || q.includes("stem")) {
    return "✂️ Propagation tips: Most plants propagate from stem cuttings. Cut just below a node (the bump on the stem), let it callus for an hour, then place in water or moist perlite. Change water weekly. Pot up once roots are 2-3 inches long!";
  }
  // Pests
  if (q.includes("pest") || q.includes("bug") || q.includes("spider mite") || q.includes("mealybug") || q.includes("aphid") || q.includes("fungus gnat")) {
    return "🐛 Common pests: Spider mites (fine webbing, spray neem oil), Mealybugs (white fluff, wipe with isopropyl), Aphids (sticky leaves, insecticidal soap), Fungus gnats (overwatering causes these, let soil dry out and use sticky traps). Neem oil + dish soap is a great all-purpose spray!";
  }
  // Calathea
  if (q.includes("calathea") || q.includes("prayer plant") || q.includes("maranta")) {
    return "🙏 Calatheas are drama queens! They need: Filtered water (fluoride causes brown tips), high humidity, indirect light, and consistent moist (not soggy) soil. Keep them away from vents and cold drafts. They'll reward you with stunning foliage!";
  }
  // Orchid
  if (q.includes("orchid") || q.includes("phalaenopsis")) {
    return "🌸 Orchid care: Water by soaking in water for 15 minutes, then let drain completely. Water every 7-14 days. Bright indirect light, bark-based potting mix (not soil!), and fertilize with orchid food monthly. Reblooming tip: place in a cooler room (60°F/15°C) at night for 4-6 weeks.";
  }
  // ZZ plant
  if (q.includes("zz plant") || q.includes("zamioculcas")) {
    return "💪 ZZ plants are nearly indestructible! They store water in their rhizomes, so water only every 3-4 weeks. They thrive in low to medium light. Perfect for offices or dark corners. Wipe leaves to remove dust and keep them shiny.";
  }
  // Peace lily
  if (q.includes("peace lily") || q.includes("spathiphyllum")) {
    return "🕊️ Peace Lilies are great communicators — they visibly droop when thirsty! Water when they droop slightly, keep in low to medium indirect light, and they'll reward you with white blooms. Note: toxic to pets and children.";
  }
  // Herbs
  if (q.includes("herb") || q.includes("basil") || q.includes("mint") || q.includes("rosemary") || q.includes("thyme")) {
    return "🌿 Herb growing tips: Herbs need 6-8 hours of direct sunlight (south-facing window or grow light). Water when the top inch of soil is dry. Pinch off flowers (deadhead) to keep the plant producing leaves. Harvest from the top to encourage bushy growth!";
  }
  // Vegetables
  if (q.includes("vegetable") || q.includes("tomato") || q.includes("chili") || q.includes("pepper") || q.includes("eggplant") || q.includes("talong")) {
    return "🍅 Vegetable growing tips: Most veggies need full sun (6-8 hrs), consistent watering (not letting them dry out completely), and regular fertilizing. Support tall plants like tomatoes with stakes. Harvest regularly to encourage more production!";
  }
  // Root crops
  if (q.includes("root crop") || q.includes("kamote") || q.includes("sweet potato") || q.includes("cassava") || q.includes("kamoteng kahoy") || q.includes("gabi") || q.includes("taro") || q.includes("ube")) {
    return "Root crop tips: Use loose, deep, well-draining soil so tubers can expand. Keep moisture steady while vines/leaves are growing, avoid waterlogged soil, and harvest only after the plant has had enough time to size up. For kamote and cassava, start with healthy cuttings and give them full sun.";
  }
  // Fruit trees
  if (q.includes("fruit tree") || q.includes("calamansi") || q.includes("mango") || q.includes("papaya") || q.includes("banana") || q.includes("guava")) {
    return "Fruit tree tips: Give young trees full sun, deep watering, and room for roots. Mulch around the base but keep mulch away from the trunk. Feed lightly during active growth, and watch for pests on new leaves and flowers.";
  }
  // Buy/sell/market
  if (q.includes("buy") || q.includes("sell") || q.includes("market") || q.includes("price")) {
    return "🛒 You can find plants to buy and sell right here in the GrowMate Marketplace! Head to the Market tab to browse listings, or apply to become a verified seller in your profile settings. Happy trading! 🌱";
  }
  // Hello/hi greeting
  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q === "yo" || q.includes("good morning") || q.includes("good evening")) {
    return "🌿 Hello there, plant lover! 🌱 I'm Leafy, your personal plant care assistant. Ask me anything — watering schedules, pest problems, propagation, specific plants — I'm here to help you grow!";
  }
  // Thank you
  if (q.includes("thank") || q.includes("thanks")) {
    return "🌸 You're so welcome! Happy growing! Remember: the best plant parent is an observant one. Keep checking on your plants daily and you'll notice issues before they become serious. 🌿💚";
  }

  // Default fallback
  return "🌿 Great question! Here's a general tip: Always observe your plant closely — look at the leaves, feel the soil, and check for pests weekly. If you notice something unusual, describe it to me and I'll help diagnose! Healthy plant care starts with good observation. 💚";
}

type ChatDetailScreenProps = {
  conversationId: string;
  title: string;
  onClose: () => void;
};

function formatLeafyScanResponse(result: LeafyScanResult): string {
  const commonNames = result.commonNames.length ? result.commonNames.slice(0, 3).join(", ") : "Not available";
  const alternatives = result.alternativeMatches?.length
    ? `\n\nOther possible matches: ${result.alternativeMatches
        .slice(0, 3)
        .map((match) => `${match.name} (${match.confidence}%)`)
        .join(", ")}.`
    : "";

  return [
    `I scanned the photo and the best match is ${result.bestMatch}${result.scientificName ? ` (${result.scientificName})` : ""}.`,
    `Confidence: ${result.confidence}%`,
    `Common names: ${commonNames}`,
    `Family: ${result.family ?? "Not available"}`,
    `Genus: ${result.genus ?? "Not available"}`,
    `Category: ${result.category}`,
    `Safety status: ${result.saleStatus.replace(/_/g, " ")}`,
    result.reviewReason ? `Note: ${result.reviewReason}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .concat(alternatives);
}

export function ChatDetailScreen({ conversationId, title, onClose }: ChatDetailScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLeafyTyping, setIsLeafyTyping] = useState(false);
  const [attachedImage, setAttachedImage] = useState<PickedImage | null>(null);
  const [visibleTimestampMessageId, setVisibleTimestampMessageId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  async function loadMessages(silent = false) {
    if (conversationId === "leafy-ai-assistant") {
      if (!silent) {
        setIsLoading(true);
      }
      if (!user?.id) {
        setMessages([]);
        setIsLoading(false);
        return;
      }
      try {
        const leafyStorageKey = getLeafyMessagesStorageKey(user.id);
        const stored = await AsyncStorage.getItem(leafyStorageKey);
        if (stored) {
          setMessages(JSON.parse(stored));
        } else {
          const welcomeMsg: Message = {
            id: "welcome-leafy",
            conversationId: "leafy-ai-assistant",
            senderId: "leafy-ai",
            body: "Hello! I am Leafy, your GrowMate AI assistant. 🌿 Ask me anything about plant care, watering, soils, or gardening tips!",
            imageUrl: null,
            createdAt: new Date().toISOString()
          };
          setMessages([welcomeMsg]);
          await AsyncStorage.setItem(leafyStorageKey, JSON.stringify([welcomeMsg]));
        }
      } catch (e) {
        console.warn("AsyncStorage leafy chat error:", e);
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
      return;
    }

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
    if (!user || isSending) return;

    const selectedImage = conversationId === "leafy-ai-assistant" ? attachedImage : null;
    const content = sanitizeUserInput(text, { maxLength: 2000, preserveNewlines: true });
    if (!content && !selectedImage) return;

    setIsSending(true);
    setText("");
    setAttachedImage(null);

    if (conversationId === "leafy-ai-assistant") {
      const leafyStorageKey = getLeafyMessagesStorageKey(user.id);
      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        conversationId: "leafy-ai-assistant",
        senderId: user.id,
        body: content || "Shared a plant photo",
        imageUrl: selectedImage?.uri ?? null,
        createdAt: new Date().toISOString()
      };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      await AsyncStorage.setItem(leafyStorageKey, JSON.stringify(updatedMessages));
      
      // Auto scroll
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);

      // Start typing indicator simulation
      setIsLeafyTyping(true);

      // Generate Leafy response
      setTimeout(async () => {
        const delimitedUserContent = wrapUserInputForPrompt(content);
        const leafyHistory = updatedMessages
          .slice(-10)
          .map((messageItem) => ({
            role: messageItem.senderId === "leafy-ai" ? "assistant" as const : "user" as const,
            content: messageItem.body,
          }));
        let leafyResponseText = "";

        try {
          if (selectedImage) {
            const scanResult = await scanPlantWithLeafy(selectedImage);
            leafyResponseText = formatLeafyScanResponse(scanResult);
          } else {
            leafyResponseText = await generateLeafyChatResponse(content, leafyHistory);
          }
        } catch (leafyError) {
          console.warn("Leafy generative response failed, using local fallback:", leafyError);
          leafyResponseText = selectedImage
            ? "I could not scan that photo yet. Please try another clear plant photo, or describe the plant and symptoms so I can still help."
            : getLeafyResponse(delimitedUserContent);
        }

        const leafyMsg: Message = {
          id: `msg-${Date.now()}-leafy`,
          conversationId: "leafy-ai-assistant",
          senderId: "leafy-ai",
          body: leafyResponseText,
          imageUrl: null,
          createdAt: new Date().toISOString()
        };
        const finalMessages = [...updatedMessages, leafyMsg];
        setMessages(finalMessages);
        await AsyncStorage.setItem(leafyStorageKey, JSON.stringify(finalMessages));
        
        // Disable typing animation and finish sending
        setIsLeafyTyping(false);
        setIsSending(false);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }, 1200);

      return;
    }

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

  async function handlePickLeafyImage() {
    try {
      const image = await pickImageFromLibrary();
      if (image) {
        setAttachedImage(image);
        setError(null);
      }
    } catch (pickError) {
      const message = pickError instanceof Error ? pickError.message : "Unable to choose image.";
      setError(message);
    }
  }

  useEffect(() => {
    setVisibleTimestampMessageId(null);
    loadMessages();
    if (user && conversationId !== "leafy-ai-assistant") {
      markConversationAsRead(conversationId, user.id).catch(console.error);
    }

    let channel: any = null;

    if (supabase && conversationId !== "leafy-ai-assistant") {
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
      if (conversationId !== "leafy-ai-assistant") {
        loadMessages(true);
        if (user) {
          markConversationAsRead(conversationId, user.id).catch(console.error);
        }
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
  }, [messages.length, isLeafyTyping]);

  // Scroll to bottom when keyboard is shown
  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    return () => {
      showSubscription.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 + insets.top : 0}
      style={styles.root}
    >
      <Screen scroll={false}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={18} color={colors.green} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
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
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesList}
            style={styles.scroll}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 && !isLeafyTyping ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No messages yet. Send a message to start conversing!</Text>
              </View>
            ) : (
              <>
                {messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  const isTimestampVisible = visibleTimestampMessageId === msg.id;
                  return (
                    <View key={msg.id} style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther]}>
                      {!isMe && conversationId === "leafy-ai-assistant" && (
                        <Image source={leafyAvatar} style={styles.leafyAvatar} />
                      )}
                      <Pressable
                        onPress={() => setVisibleTimestampMessageId((current) => (current === msg.id ? null : msg.id))}
                        style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
                      >
                        {msg.imageUrl && <Image source={{ uri: msg.imageUrl }} style={styles.messageImage} />}
                        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                          {msg.body}
                        </Text>
                        {isTimestampVisible && (
                          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
                {isLeafyTyping && (
                  <View style={[styles.bubbleWrap, styles.bubbleWrapOther]}>
                    {conversationId === "leafy-ai-assistant" && (
                      <Image source={leafyAvatar} style={styles.leafyAvatar} />
                    )}
                    <View style={[styles.bubble, styles.bubbleOther, styles.typingBubble]}>
                      <ActivityIndicator size="small" color={colors.green} style={styles.typingIndicator} />
                      <Text style={[styles.bubbleText, styles.bubbleTextOther, styles.typingText]}>
                        Leafy is typing...
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}

        {conversationId === "leafy-ai-assistant" && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Ask Leafy AI:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
              {[
                { label: "Watering Monstera", query: "How often should I water my Monstera?" },
                { label: "Succulent Soil Mix", query: "What soil mix is best for succulents?" },
                { label: "Propagate Pothos", query: "How do I propagate pothos cuttings?" },
                { label: "Treat Yellow Leaves", query: "How do I treat yellow leaves?" },
              ].map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    setText(item.query);
                  }}
                  style={styles.suggestionChip}
                >
                  <Text style={styles.suggestionChipText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {conversationId === "leafy-ai-assistant" && attachedImage && (
          <View style={styles.attachmentPreview}>
            <Image source={{ uri: attachedImage.uri }} style={styles.attachmentThumb} />
            <View style={styles.attachmentTextWrap}>
              <Text numberOfLines={1} style={styles.attachmentTitle}>Photo attached</Text>
              <Text numberOfLines={1} style={styles.attachmentSubtitle}>Leafy will scan this image when you send.</Text>
            </View>
            <Pressable onPress={() => setAttachedImage(null)} style={styles.removeAttachmentBtn} hitSlop={8}>
              <MaterialCommunityIcons color={colors.greenMuted} name="close" size={18} />
            </Pressable>
          </View>
        )}

        <View style={[styles.composerRow, { paddingBottom: Math.max(insets.bottom + 6, 12) }]}>
          {conversationId === "leafy-ai-assistant" && (
            <Pressable
              accessibilityLabel="Upload plant photo"
              disabled={isSending}
              onPress={handlePickLeafyImage}
              style={({ pressed }) => [styles.attachButton, pressed && styles.attachButtonPressed]}
            >
              <MaterialCommunityIcons color={colors.green} name="image-plus" size={21} />
            </Pressable>
          )}
          <TextInput
            multiline
            onChangeText={setText}
            placeholder="Type your message..."
            placeholderTextColor="#8a9583"
            style={styles.input}
            value={text}
          />
          <Button disabled={isSending || (!text.trim() && !(conversationId === "leafy-ai-assistant" && attachedImage))} onPress={handleSend}>
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
    gap: 10,
    paddingBottom: 8,
  },
  title: {
    color: colors.green,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 30,
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  scroll: {
    flex: 1,
    marginVertical: 6,
  },
  messagesList: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: 8,
    paddingBottom: 6,
  },
  bubbleWrap: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
    width: "100%",
  },
  bubbleWrapMe: {
    justifyContent: "flex-end",
  },
  bubbleWrapOther: {
    justifyContent: "flex-start",
  },
  leafyAvatar: {
    backgroundColor: colors.sage,
    borderColor: colors.lineMid,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    width: 32,
  },
  bubble: {
    borderRadius: 20,
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    fontSize: 12,
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
    paddingTop: 8,
    paddingBottom: 6,
  },
  attachButton: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  attachButtonPressed: {
    backgroundColor: colors.sage,
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
  attachmentPreview: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    padding: 8,
  },
  attachmentThumb: {
    backgroundColor: colors.sage,
    borderRadius: 10,
    height: 44,
    width: 44,
  },
  attachmentTextWrap: {
    flex: 1,
  },
  attachmentTitle: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  attachmentSubtitle: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  removeAttachmentBtn: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  messageImage: {
    aspectRatio: 1,
    backgroundColor: colors.sage,
    borderRadius: 14,
    marginBottom: 8,
    width: 180,
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
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingIndicator: {
    marginRight: 4,
  },
  typingText: {
    fontStyle: "italic",
    color: colors.greenMuted,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.cream,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.greenMid,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  suggestionsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  suggestionChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineMid,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.green,
  },
});
