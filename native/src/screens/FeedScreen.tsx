import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Alert } from "react-native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { createFeedPost, getFeedPosts, getPostComments, addPostComment, togglePostReaction, deletePost, type FeedPost, type PostComment } from "../services/feed";
import { pickImageFromLibrary, takePhotoWithCamera, uploadPublicImage, type PickedImage } from "../services/storage";
import { createReport } from "../services/reports";
import { supabase } from "../services/supabase";
import { colors, radius, shadow } from "../theme/colors";
import { useNavigationContext } from "../context/NavigationContext";
import { getActiveListings } from "../services/listings";
import { getOrCreateMarketConversation } from "../services/messages";
import { SellerGardenModal } from "../components/SellerGardenModal";
import { formatCurrency } from "../utils/currency";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { EmptyState } from "../components/EmptyState";
import { ImageZoomModal } from "../components/ImageZoomModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const leafyAvatar = require("../../assets/leafy-ai.png");

const mockStories = [
  { id: "1", name: "My Garden", avatarLetter: "M", isSelf: true, color: "#a1a1a1", imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=120&h=120&fit=crop" },
  { id: "2", name: "Elena G.", avatarLetter: "E", color: "#f59e0b", imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=120&h=120&fit=crop" },
  { id: "3", name: "Mark R.", avatarLetter: "M", color: "#22c55e", imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=120&h=120&fit=crop" },
  { id: "4", name: "Sofie T.", avatarLetter: "S", color: "#e05353", imageUrl: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=120&h=120&fit=crop" },
  { id: "5", name: "Leo K.", avatarLetter: "L", color: "#22c55e", imageUrl: "https://images.unsplash.com/photo-1530968033775-2c9273f0865e?w=120&h=120&fit=crop" },
];

type StoryItem = {
  id: string;
  userId: string;
  name: string;
  avatarLetter: string;
  isSelf?: boolean;
  color: string;
  imageUrl: string | null;
  hasStory: boolean;
  createdAt?: string | null;
};

function getCareChips(post: FeedPost): { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] {
  const chips: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [];
  const bodyLower = (post.body || "").toLowerCase();
  
  if (post.type === "question") {
    chips.push({ label: "Question", icon: "help-circle-outline" });
  } else if (post.type === "tip") {
    chips.push({ label: "Tip", icon: "lightbulb-on-outline" });
  } else if (post.type === "harvest") {
    chips.push({ label: "Harvest", icon: "basket-outline" });
  }

  if (bodyLower.includes("water")) {
    chips.push({ label: "Watering", icon: "water-outline" });
  }
  if (bodyLower.includes("soil") || bodyLower.includes("potting") || bodyLower.includes("mix")) {
    chips.push({ label: "Soil Mix", icon: "sprout-outline" });
  }
  if (bodyLower.includes("sun") || bodyLower.includes("light") || bodyLower.includes("shade")) {
    chips.push({ label: "Sunlight", icon: "weather-sunny" });
  }
  if (bodyLower.includes("fertiliz") || bodyLower.includes("feed") || bodyLower.includes("nourish")) {
    chips.push({ label: "Fertilizer", icon: "leaf-maple" });
  }

  if (chips.length === 0) {
    chips.push({ label: "General Care", icon: "heart-outline" });
  }

  return chips;
}

export function FeedScreen({
  onOpenChat,
}: {
  onOpenChat?: (convoId: string, title: string) => void;
}) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { setActiveTab, setSearchQuery, unreadCount } = useNavigationContext();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [type, setType] = useState<FeedPost["type"]>("update");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [stories, setStories] = useState<StoryItem[]>(mockStories.map((story) => ({ ...story, userId: story.id, hasStory: true })));
  const [loadingStories, setLoadingStories] = useState(true);
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);

  // Seller profile sheet states (Item 18)
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [selectedSellerName, setSelectedSellerName] = useState<string>("");
  const [showSellerGarden, setShowSellerGarden] = useState(false);

  function handleViewSellerGarden(sellerId: string, sellerName: string) {
    setSelectedSellerId(sellerId);
    setSelectedSellerName(sellerName);
    setShowSellerGarden(true);
  }

  async function handleMessageSeller(post: FeedPost) {
    if (!user || !onOpenChat) return;
    if (post.userId === user.id) {
      setError("You cannot message yourself.");
      return;
    }
    try {
      if (post.userId === "sarah-user-id") {
        Alert.alert("Inquiry Sent", `You sent an inquiry to ${post.authorName}! She will receive your message and get back to you shortly.`);
      } else {
        const convoId = await getOrCreateMarketConversation(
          post.id,
          user.id,
          post.userId,
          `Inquiry: ${post.authorName}'s post`
        );
        onOpenChat(convoId, `Inquiry: ${post.authorName}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start conversation.");
    }
  }

  // Pagination state
  const [hasMore, setHasMore] = useState(true);

  // Plant detail modal states
  type DetailPlant = {
    id?: string;
    name: string;
    localName?: string | null;
    scientificName?: string | null;
    category?: string | null;
    condition?: string | null;
    careNotes?: string | null;
    photoUrl?: string | null;
  };
  const [detailPlant, setDetailPlant] = useState<DetailPlant | null>(null);
  const [isLoadingPlantDetail, setIsLoadingPlantDetail] = useState(false);

  // Pull-to-refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Comments states
  const [activePostComments, setActivePostComments] = useState<string | null>(null);
  const [commentModalPost, setCommentModalPost] = useState<FeedPost | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, PostComment[]>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  const [isLoadingComments, setIsLoadingComments] = useState<Record<string, boolean>>({});
  const [replyingToComment, setReplyingToComment] = useState<PostComment | null>(null);

  // Options sheet state
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);

  // Zoom modal state (Item 13)
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Report and delete states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const reportReasons = ["Spam", "Scam / Fraud", "Inappropriate Content", "Offensive Language", "Other"];

  async function handleDeletePost(postId: string) {
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post.");
    }
  }

  async function handleOpenReportModal(postId: string) {
    setReportPostId(postId);
    setReportReason("Spam");
    setReportDetails("");
    setShowReportModal(true);
  }

  async function handleSubmitReport() {
    if (!user || !reportPostId) return;
    setIsReporting(true);
    try {
      await createReport({
        reporterId: user.id,
        postId: reportPostId,
        reason: reportReason,
        details: reportDetails,
      });
      setShowReportModal(false);
      setReportDetails("");
      setError("Thank you. Post has been reported to admins.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsReporting(false);
    }
  }

  const postsRef = useRef(posts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const loadPosts = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const currentPosts = postsRef.current;
      const lastPost = isLoadMore && currentPosts.length > 0 ? currentPosts[currentPosts.length - 1] : undefined;
      const data = await getFeedPosts(user?.id, 10, lastPost?.createdAt);
      if (isLoadMore) {
        setPosts((prev) => [...prev, ...data]);
      } else {
        setPosts(data);
      }
      setHasMore(data.length === 10);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load feed.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadStories = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data: profiles, error: err } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, cover_url")
        .order("created_at", { ascending: true });

      if (err) throw err;

      const { data: storyPosts, error: storyErr } = await supabase
        .from("feed_posts")
        .select("user_id, image_url, created_at")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(120);

      if (storyErr) throw storyErr;

      const latestStoryByUser = new Map<string, { imageUrl: string; createdAt: string }>();
      (storyPosts ?? []).forEach((post) => {
        if (!post.user_id || !post.image_url || latestStoryByUser.has(post.user_id)) return;
        latestStoryByUser.set(post.user_id, {
          imageUrl: post.image_url,
          createdAt: post.created_at,
        });
      });

      const ringColors = ["#f59e0b", "#22c55e", "#e05353", "#3b82f6"];
      const defaultGardenLandscapes = [
        "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=120&h=120&fit=crop",
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=120&h=120&fit=crop",
        "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=120&h=120&fit=crop",
        "https://images.unsplash.com/photo-1530968033775-2c9273f0865e?w=120&h=120&fit=crop"
      ];
      
      const mapped = (profiles ?? []).map((p, index) => {
        const isSelf = p.id === user?.id;
        const latestStory = latestStoryByUser.get(p.id);
        return {
          id: p.id,
          userId: p.id,
          name: isSelf ? "My Garden" : p.display_name,
          avatarLetter: (p.display_name?.[0] ?? "P").toUpperCase(),
          imageUrl: latestStory?.imageUrl || p.cover_url || defaultGardenLandscapes[index % defaultGardenLandscapes.length],
          isSelf,
          color: isSelf ? "#e5e7eb" : ringColors[index % ringColors.length],
          hasStory: Boolean(latestStory?.imageUrl || p.cover_url),
          createdAt: latestStory?.createdAt ?? null,
        };
      });

      // Sort so current user's "My Garden" is always first
      mapped.sort((a, b) => {
        if (a.isSelf) return -1;
        if (b.isSelf) return 1;
        return 0;
      });

      setStories(mapped);
    } catch (e) {
      console.error("Failed to load stories:", e);
      setStories(mockStories.map((story) => ({ ...story, userId: story.id, hasStory: true })));
    } finally {
      setLoadingStories(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPosts().catch(() => {});
    loadStories().catch(() => {});
  }, [loadPosts, loadStories]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([loadPosts(), loadStories()]);
    setIsRefreshing(false);
  }

  async function handlePost() {
    if (!user || !body.trim()) return;

    setIsPosting(true);
    setError(null);

    try {
      const uploadedPhoto = photo ? await uploadPublicImage("feed-photos", user.id, "posts", photo) : null;
      await createFeedPost(user.id, body.trim(), type, uploadedPhoto?.publicUrl, null);
      setBody("");
      setPhoto(null);
      setType("update");
      await loadPosts();
    } catch (postError) {
      const message = postError instanceof Error ? postError.message : "Unable to create post.";
      setError(message);
    } finally {
      setIsPosting(false);
    }
  }

  async function handleViewPlantDetail(plantId: string, plantName: string) {
    setIsLoadingPlantDetail(true);
    setDetailPlant({ name: plantName });
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("garden_plants")
          .select("id, name, local_name, scientific_name, category, condition, care_notes, garden_plant_photos(storage_path)")
          .eq("id", plantId)
          .maybeSingle();

        if (!error && data) {
          const photoRow = data.garden_plant_photos?.[0];
          const photoUrl = photoRow 
            ? supabase.storage.from("garden-photos").getPublicUrl(photoRow.storage_path).data.publicUrl
            : null;

          setDetailPlant({
            id: data.id,
            name: data.name,
            localName: data.local_name,
            scientificName: data.scientific_name,
            category: data.category,
            condition: data.condition,
            careNotes: data.care_notes,
            photoUrl,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load linked plant details", err);
    } finally {
      setIsLoadingPlantDetail(false);
    }
  }

  async function handlePickPhoto() {
    setError(null);

    try {
      const pickedPhoto = await pickImageFromLibrary();
      if (pickedPhoto) {
        setPhoto(pickedPhoto);
      }
    } catch (photoError) {
      const message = photoError instanceof Error ? photoError.message : "Unable to choose feed photo.";
      setError(message);
    }
  }

  async function handleTakePhoto() {
    setError(null);
    try {
      const takenPhoto = await takePhotoWithCamera();
      if (takenPhoto) {
        setPhoto(takenPhoto);
      }
    } catch (photoError) {
      const message = photoError instanceof Error ? photoError.message : "Unable to take photo.";
      setError(message);
    }
  }

  async function handleToggleLike(postId: string) {
    if (!user) return;

    // Optimistically update
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const isLikedNow = !p.isLikedByMe;
          return {
            ...p,
            isLikedByMe: isLikedNow,
            reactionsCount: isLikedNow ? p.reactionsCount + 1 : Math.max(0, p.reactionsCount - 1),
          };
        }
        return p;
      })
    );

    try {
      await togglePostReaction(postId, user.id);
    } catch (likeError) {
      // Revert if error
      loadPosts().catch((err) => {
        console.error("Reverting like state failed:", err);
      });
    }
  }

  async function handleToggleComments(postId: string) {
    if (activePostComments === postId) {
      setActivePostComments(null);
      return;
    }

    setActivePostComments(postId);
    setIsLoadingComments((prev) => ({ ...prev, [postId]: true }));

    try {
      const data = await getPostComments(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: data }));
    } catch (commentError) {
      // Silent error
    } finally {
      setIsLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleOpenCommentsModal(post: FeedPost) {
    setReplyingToComment(null);
    setCommentModalPost(post);
    setIsLoadingComments((prev) => ({ ...prev, [post.id]: true }));
    try {
      const data = await getPostComments(post.id);
      setCommentsMap((prev) => ({ ...prev, [post.id]: data }));
    } catch (commentError) {
      // Silent error
    } finally {
      setIsLoadingComments((prev) => ({ ...prev, [post.id]: false }));
    }
  }

  async function handleSubmitComment(postId: string) {
    if (!user) return;
    const text = newCommentTexts[postId]?.trim();
    if (!text) return;

    const parentId = replyingToComment ? (replyingToComment.parentId || replyingToComment.id) : null;

    setNewCommentTexts((prev) => ({ ...prev, [postId]: "" }));
    setReplyingToComment(null);

    try {
      const newComment = await addPostComment(postId, user.id, text, parentId);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        )
      );
      if (commentModalPost && commentModalPost.id === postId) {
        setCommentModalPost((prev) =>
          prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null
        );
      }
    } catch (error) {
      // Silent error
    }
  }

  function handleReplyTo(comment: PostComment) {
    setReplyingToComment(comment);
    if (commentModalPost) {
      const username = comment.authorName.replace(/\s+/g, "").toLowerCase();
      setNewCommentTexts((prev) => {
        const currentText = prev[commentModalPost.id] || "";
        const mention = `@${username} `;
        if (currentText.includes(mention)) return prev;
        return {
          ...prev,
          [commentModalPost.id]: mention + currentText,
        };
      });
    }
  }

  function getRelativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  function getPostTitle(post: FeedPost) {
    const title = post.title?.trim();
    if (title) return title;
    return null;
  }

  function getMarketQuery(post: FeedPost) {
    return post.gardenPlantName || post.title || post.body.split(/\s+/).slice(0, 4).join(" ");
  }

  async function handleAddStory() {
    if (!user || isAddingStory) return;

    setIsAddingStory(true);
    setError(null);
    try {
      const pickedPhoto = await pickImageFromLibrary();
      if (!pickedPhoto) return;

      const uploadedPhoto = await uploadPublicImage("feed-photos", user.id, "stories", pickedPhoto);
      await createFeedPost(user.id, "Shared a garden story.", "update", uploadedPhoto.publicUrl, null);

      const story: StoryItem = {
        id: user.id,
        userId: user.id,
        name: "My Garden",
        avatarLetter: (user.email?.[0] ?? "M").toUpperCase(),
        imageUrl: uploadedPhoto.publicUrl,
        isSelf: true,
        color: "#e5e7eb",
        hasStory: true,
        createdAt: new Date().toISOString(),
      };

      setStories((current) => [story, ...current.filter((item) => !item.isSelf)]);
      setActiveStory(story);
      await loadPosts();
    } catch (storyError) {
      const message = storyError instanceof Error ? storyError.message : "Unable to add story.";
      setError(message);
    } finally {
      setIsAddingStory(false);
    }
  }

  function handleOpenStory(story: StoryItem) {
    if (!story.hasStory || !story.imageUrl) {
      if (story.isSelf) {
        handleAddStory().catch(() => {});
      }
      return;
    }

    setActiveStory(story);
  }

  return (
    <Screen
      showHeader={false}
      noPadding={true}
      scroll={false}
    >
      <View style={styles.feedScreenShell}>
        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={styles.feedScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.green}
              colors={[colors.green]}
            />
          }
        >
      {/* ── Custom Header ── */}
      <View style={[styles.customHeader, { paddingTop: Math.max(insets.top + 8, Platform.OS === "ios" ? 22 : 28) }]}>
        <Text style={styles.customHeaderTitle}>Community</Text>
        <View style={styles.customHeaderButtons}>
          <Pressable
            onPress={() => {
              Alert.alert("Search", "Searching the plant feed is coming soon!");
            }}
            style={styles.circleHeaderBtn}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            accessibilityLabel="Open messages"
            onPress={() => setActiveTab("Messages")}
            style={styles.circleHeaderBtn}
          >
            <MaterialCommunityIcons name="forum-outline" size={20} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => setShowComposer((prev) => !prev)}
            style={styles.greenCircleHeaderBtn}
          >
            <MaterialCommunityIcons name="plus" size={22} color={colors.white} />
          </Pressable>
        </View>
      </View>


      {/* ── Feed Container ── */}
      <View style={styles.feedContent}>
        {/* ── Collapsible Composer ── */}
        {showComposer && (
          <View style={styles.composerCard}>
            <View style={styles.composerRow}>
              <View style={styles.composerAvatar}>
                <Text style={styles.composerAvatarText}>
                  {(user?.email?.[0] ?? "U").toUpperCase()}
                </Text>
              </View>
              <TextInput
                multiline
                onChangeText={setBody}
                placeholder="Share with the plant community..."
                placeholderTextColor={colors.textTertiary}
                style={styles.composer}
                value={body}
              />
            </View>
            {photo && <Image source={{ uri: photo.uri }} style={styles.preview} />}

            <View style={styles.composerBar}>
              <Pressable
                onPress={handlePickPhoto}
                style={({ pressed }) => [styles.composerIconBtn, pressed && styles.iconBtnPressed]}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name={photo ? "image-edit-outline" : "image-outline"}
                  size={22}
                  color={photo ? colors.green : colors.textTertiary}
                />
                <Text style={[styles.composerActionText, photo && { color: colors.green }]}>Photo</Text>
              </Pressable>

              <Pressable
                onPress={handleTakePhoto}
                style={({ pressed }) => [styles.composerIconBtn, pressed && styles.iconBtnPressed]}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={22}
                  color={colors.textTertiary}
                />
                <Text style={styles.composerActionText}>Camera</Text>
              </Pressable>

              <View style={styles.composerBarSpacer} />

              <Pressable
                onPress={() => {
                  handlePost();
                  setShowComposer(false);
                }}
                disabled={isPosting || !body.trim()}
                style={({ pressed }) => [
                  styles.sendBtn,
                  body.trim() && { backgroundColor: colors.leaf },
                  (pressed || !body.trim() || isPosting) && styles.sendBtnDisabled,
                ]}
              >
                {isPosting ? (
                  <ActivityIndicator color={colors.white} size={14} />
                ) : (
                  <MaterialCommunityIcons name="send" size={16} color={colors.white} />
                )}
                <Text style={styles.sendBtnText}>Post</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Error ── */}
        {error && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.errorText} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* ── Loading skeleton ── */}
        {isLoading && (
          <View style={styles.skeletonWrap}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonHeader}>
                  <View style={styles.skeletonAvatar} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={[styles.skeletonLine, { width: "55%" }]} />
                    <View style={[styles.skeletonLine, { width: "35%", opacity: 0.5 }]} />
                  </View>
                </View>
                <View style={styles.skeletonImage} />
                <View style={{ padding: 12, gap: 8 }}>
                  <View style={[styles.skeletonLine, { width: "80%" }]} />
                  <View style={[styles.skeletonLine, { width: "60%" }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Empty ── */}
        {!isLoading && posts.length === 0 && (
          <EmptyState
            icon="forum-outline"
            title="No posts yet"
            description="Be the first to share a question, garden update, or plant photo with the community!"
          />
        )}

        {/* ── Posts ── */}
        {!isLoading &&
          posts.map((post) => {
            const subtitle = `${getRelativeTime(post.createdAt)} • ${post.authorLocation || "Plantita"}`;
            const careChips = getCareChips(post);
            const postTitle = getPostTitle(post);

            return (
              <View key={post.id} style={styles.postCard}>
                {/* 1. Header Row */}
                <View style={styles.postHeader}>
                  <Pressable
                    onPress={() => handleViewSellerGarden(post.userId, post.authorName)}
                    style={styles.postHeaderLeft}
                  >
                    <View style={styles.postAvatar}>
                      {post.authorAvatarUrl ? (
                        <Image source={{ uri: post.authorAvatarUrl }} style={styles.postAvatarImage} />
                      ) : (
                        <View style={styles.postAvatarFallback}>
                          <Text style={styles.postAvatarText}>
                            {(post.authorName?.[0] ?? "?").toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.onlineDot} />
                    </View>
                    <View style={styles.postMeta}>
                      <View style={styles.authorNameRow}>
                        <Text style={styles.postAuthor} numberOfLines={1}>{post.authorName}</Text>
                        {(post.authorName === "Sarah Patterson" || post.id === "sarah-monstera-post-id") && (
                          <MaterialCommunityIcons name="check-decagram" size={15} color="#22c55e" style={styles.verifiedIcon} />
                        )}
                      </View>
                      <Text style={styles.postTime} numberOfLines={1}>{subtitle}</Text>
                    </View>
                  </Pressable>

                  <View style={styles.postHeaderRight}>
                    {post.userId !== user?.id && (
                      <Pressable
                        style={styles.followBtn}
                        onPress={() => {
                          Alert.alert("Followed", `You are now following ${post.authorName}!`);
                        }}
                      >
                        <Text style={styles.followBtnText}>Follow</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => {
                        setSelectedPost(post);
                        setShowOptionsModal(true);
                      }}
                      style={styles.postOptionsButton}
                    >
                      <MaterialCommunityIcons name="dots-horizontal" size={20} color={colors.greenMuted} />
                    </Pressable>
                  </View>
                </View>

                {/* 2. Text Content Section (Caption) */}
                <View style={styles.postTextSection}>
                  {postTitle && (
                    <Pressable
                      disabled={!post.gardenPlantId}
                      onPress={() => handleViewPlantDetail(post.gardenPlantId!, post.gardenPlantName || "Linked Plant")}
                    >
                      <Text style={styles.postTitle} numberOfLines={2}>{postTitle}</Text>
                    </Pressable>
                  )}
                  <Text style={styles.captionText}>{post.body}</Text>

                  {careChips.length > 0 && (
                    <View style={styles.careChipRow}>
                      {careChips.map((chip) => (
                        <View key={`${post.id}-${chip.label}`} style={styles.careChip}>
                          <MaterialCommunityIcons name={chip.icon} size={13} color={colors.green} />
                          <Text style={styles.careChipText}>{chip.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* 3. Image with Plant Progress Overlay Badge */}
                {post.imageUrl && (
                  <Pressable onPress={() => setZoomImageUrl(post.imageUrl)} style={styles.photoGrid}>
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                      <View style={styles.plantProgressBadge}>
                        <Text style={styles.plantProgressBadgeText}>
                          {post.type === "question" ? "PLANT QUESTION" : post.type === "tip" ? "GARDENING TIP" : post.type === "harvest" ? "GARDEN HARVEST" : "PLANT PROGRESS"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                )}

                {/* 4. Interactions Row (Heart, Comments, Send, Visit Garden) */}
                <View style={styles.postInteractionsRow}>
                  <View style={styles.postInteractionsLeft}>
                    {/* Heart (Like) */}
                    <Pressable style={styles.interactionButton} onPress={() => handleToggleLike(post.id)}>
                      <MaterialCommunityIcons
                        name={post.isLikedByMe ? "heart" : "heart-outline"}
                        size={22}
                        color={post.isLikedByMe ? "#ef4444" : "#e05353"}
                      />
                      <Text style={styles.interactionText}>
                        {post.reactionsCount >= 1000 ? `${(post.reactionsCount / 1000).toFixed(1)}k` : post.reactionsCount}
                      </Text>
                    </Pressable>

                    {/* Comments */}
                    <Pressable style={styles.interactionButton} onPress={() => handleOpenCommentsModal(post)}>
                      <MaterialCommunityIcons name="comment-outline" size={22} color={colors.textSecondary} />
                      <Text style={styles.interactionText}>{post.commentsCount}</Text>
                    </Pressable>

                    {/* Message Seller (Send Airplane) */}
                    <Pressable style={styles.interactionButton} onPress={() => handleMessageSeller(post)}>
                      <MaterialCommunityIcons name="send-outline" size={20} color={colors.textSecondary} style={{ transform: [{ rotate: "-15deg" }] }} />
                    </Pressable>
                  </View>

                  {/* Visit Garden Pill */}
                  <Pressable
                    onPress={() => handleViewSellerGarden(post.userId, post.authorName)}
                    style={styles.visitGardenBtn}
                  >
                    <MaterialCommunityIcons name="sprout-outline" size={14} color="#1a4d2e" />
                    <Text style={styles.visitGardenBtnText}>VISIT GARDEN</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
      </View>

      {!isLoading && hasMore && posts.length > 0 && (
        <Pressable onPress={() => loadPosts(true)} style={styles.loadMoreBtn}>
          <Text style={styles.loadMoreText}>Load more posts</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.greenMuted} />
        </Pressable>
      )}
        </ScrollView>

        {/* ── Ask Leafy Floating Action Button ── */}
        <Pressable
          onPress={() => {
            if (onOpenChat) {
              onOpenChat("leafy-ai-assistant", "Leafy AI Assistant");
            } else {
              setActiveTab("Messages");
            }
          }}
          style={({ pressed }) => [styles.askLeafyFloat, pressed && styles.askLeafyFloatPressed]}
        >
          <Image source={leafyAvatar} style={styles.askLeafyLogo} />
        </Pressable>

      {/* Report Modal */}
      <Modal visible={showReportModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Post</Text>
            <Text style={styles.modalLabel}>Select Reason:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reasonsContainer}>
              {reportReasons.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  style={[styles.reasonChip, reportReason === reason && styles.reasonChipActive]}
                >
                  <Text style={[styles.reasonChipText, reportReason === reason && styles.reasonChipTextActive]}>
                    {reason}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={styles.modalInput}
              placeholder="Tell us details..."
              placeholderTextColor="#8a9583"
              multiline
              numberOfLines={4}
              value={reportDetails}
              onChangeText={setReportDetails}
            />

            <View style={styles.modalActions}>
              <View style={styles.flexButton}>
                <Button disabled={isReporting} onPress={handleSubmitReport}>
                  {isReporting ? "Reporting..." : "Submit"}
                </Button>
              </View>
              <View style={styles.flexButton}>
                <Button variant="secondary" onPress={() => setShowReportModal(false)}>
                  Cancel
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detailed Plant Modal */}
      <Modal visible={detailPlant !== null} animationType="slide" transparent={false} onRequestClose={() => setDetailPlant(null)}>
        <View style={styles.plantDetailContainer}>
          <View style={styles.plantDetailHeader}>
            <Text style={styles.plantDetailTitle}>{detailPlant?.name}</Text>
            <Text style={styles.plantDetailSubtitle}>Linked Garden Plant</Text>
          </View>

          <ScrollView contentContainerStyle={styles.plantDetailScroll}>
            {isLoadingPlantDetail ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={colors.green} size="large" />
                <Text style={styles.loadingText}>Loading plant info...</Text>
              </View>
            ) : (
              <Card>
                {detailPlant?.photoUrl && <Image source={{ uri: detailPlant.photoUrl }} style={styles.plantImageDetail} />}
                <Text style={styles.plantNameDetail}>{detailPlant?.name}</Text>
                
                {detailPlant?.scientificName && (
                  <Text style={styles.scientificNameText}>Scientific: {detailPlant.scientificName}</Text>
                )}
                {detailPlant?.localName && (
                  <Text style={styles.plantDetailMeta}>Local Name: {detailPlant.localName}</Text>
                )}
                {detailPlant?.category && (
                  <Text style={styles.plantDetailMeta}>Category: {detailPlant.category}</Text>
                )}
                {detailPlant?.condition && (
                  <Text style={styles.plantDetailMeta}>Condition: {detailPlant.condition}</Text>
                )}
                {detailPlant?.careNotes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Care Notes:</Text>
                    <Text style={styles.notesText}>{detailPlant.careNotes}</Text>
                  </View>
                )}
              </Card>
            )}
          </ScrollView>

          <View style={styles.plantDetailFooter}>
            <Button onPress={() => setDetailPlant(null)}>Close</Button>
          </View>
        </View>
      </Modal>

      {/* ── Comment Thread Modal ── */}
      <Modal
        visible={commentModalPost !== null}
        animationType="slide"
        onRequestClose={() => {
          setCommentModalPost(null);
          setReplyingToComment(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: colors.cream }}
        >
          {/* Header */}
          <View style={styles.commentModalHeader}>
            <Pressable
              onPress={() => {
                setCommentModalPost(null);
                setReplyingToComment(null);
              }}
              style={styles.commentModalCloseBtn}
              hitSlop={10}
            >
              <MaterialCommunityIcons name="chevron-down" size={26} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.commentModalTitle}>Comments</Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Comment List */}
          <ScrollView
            contentContainerStyle={styles.commentModalScroll}
            keyboardShouldPersistTaps="handled"
          >
            {commentModalPost && (
              <>
                {/* Original Post Content */}
                <View style={styles.commentOriginalPost}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {(commentModalPost.authorName?.[0] ?? "?").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentOriginalBody}>
                    <Text style={styles.commentAuthor}>
                      {commentModalPost.authorName}
                      {commentModalPost.authorLocation && (
                        <Text style={styles.commentAuthorLoc}> • {commentModalPost.authorLocation}</Text>
                      )}
                    </Text>
                    <Text style={styles.commentText}>{commentModalPost.body}</Text>
                    <Text style={styles.commentTime}>{getRelativeTime(commentModalPost.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.commentModalDivider} />

                {/* Loading state */}
                {isLoadingComments[commentModalPost.id] ? (
                  <View style={styles.commentLoaderWrap}>
                    <ActivityIndicator color={colors.green} size="small" />
                  </View>
                ) : (
                  <>
                    {/* Threaded list of comments */}
                    {(() => {
                      const allComments = commentsMap[commentModalPost.id] ?? [];
                      const parentComments = allComments.filter(c => !c.parentId);
                      
                      return parentComments.map((comment) => {
                        const replies = allComments.filter(r => r.parentId === comment.id);
                        
                        return (
                          <View key={comment.id} style={{ marginBottom: 16 }}>
                            {/* Parent Comment */}
                            <View style={styles.commentRowModal}>
                              <View style={styles.commentAvatar}>
                                <Text style={styles.commentAvatarText}>
                                  {(comment.authorName?.[0] ?? "?").toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.commentBodyWrap}>
                                <Text style={styles.commentAuthor}>
                                  {comment.authorName}{" "}
                                  <Text style={styles.commentText}>{comment.body}</Text>
                                </Text>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
                                  <Text style={styles.commentTime}>{getRelativeTime(comment.createdAt)}</Text>
                                  <Pressable onPress={() => handleReplyTo(comment)} hitSlop={6}>
                                    <Text style={styles.replyButtonText}>Reply</Text>
                                  </Pressable>
                                </View>
                              </View>
                            </View>

                            {/* Replies List */}
                            {replies.map((reply) => (
                              <View key={reply.id} style={styles.replyRowModal}>
                                {/* Left thread line */}
                                <View style={styles.replyThreadLine} />
                                
                                <View style={styles.replyCommentAvatar}>
                                  <Text style={styles.replyCommentAvatarText}>
                                    {(reply.authorName?.[0] ?? "?").toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.commentBodyWrap}>
                                  <Text style={styles.commentAuthor}>
                                    {reply.authorName}{" "}
                                    <Text style={styles.commentText}>{reply.body}</Text>
                                  </Text>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
                                    <Text style={styles.commentTime}>{getRelativeTime(reply.createdAt)}</Text>
                                    <Pressable onPress={() => handleReplyTo(reply)} hitSlop={6}>
                                      <Text style={styles.replyButtonText}>Reply</Text>
                                    </Pressable>
                                  </View>
                                </View>
                              </View>
                            ))}
                          </View>
                        );
                      });
                    })()}

                    {(!commentsMap[commentModalPost.id] || commentsMap[commentModalPost.id].length === 0) && (
                      <View style={styles.noCommentsWrap}>
                        <MaterialCommunityIcons name="comment-text-outline" size={32} color={colors.textTertiary} />
                        <Text style={styles.noCommentsTitle}>No comments yet</Text>
                        <Text style={styles.noCommentsSub}>Start the conversation by adding a comment.</Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>

          {/* Comment input at the bottom */}
          {commentModalPost && (
            <View>
              {/* Replying banner */}
              {replyingToComment && (
                <View style={styles.replyingBanner}>
                  <Text style={styles.replyingBannerText}>
                    Replying to <Text style={{ fontWeight: "700" }}>@{replyingToComment.authorName}</Text>
                  </Text>
                  <Pressable onPress={() => setReplyingToComment(null)} hitSlop={10}>
                    <MaterialCommunityIcons name="close" size={16} color={colors.textTertiary} />
                  </Pressable>
                </View>
              )}

              <View style={styles.commentModalInputBar}>
                <View style={styles.commentModalAvatar}>
                  <Text style={styles.commentModalAvatarText}>
                    {(user?.email?.[0] ?? "U").toUpperCase()}
                  </Text>
                </View>
                <TextInput
                  onChangeText={(val) => setNewCommentTexts((prev) => ({ ...prev, [commentModalPost.id]: val }))}
                  placeholder={replyingToComment ? `Reply to ${replyingToComment.authorName}...` : `Comment as ${user?.email?.split("@")[0]}...`}
                  placeholderTextColor={colors.textTertiary}
                  style={styles.commentModalInput}
                  value={newCommentTexts[commentModalPost.id] || ""}
                  multiline
                />
                <Pressable
                  disabled={!(newCommentTexts[commentModalPost.id] || "").trim()}
                  style={[
                    styles.commentModalSend,
                    !(newCommentTexts[commentModalPost.id] || "").trim() && styles.commentModalSendDisabled
                  ]}
                  onPress={() => handleSubmitComment(commentModalPost.id)}
                >
                  <Text style={styles.commentModalSendText}>Post</Text>
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Post Options Bottom Sheet Modal */}
      <Modal visible={showOptionsModal} animationType="slide" transparent={true} onRequestClose={() => setShowOptionsModal(false)}>
        <View style={styles.bottomModalOverlay}>
          <Pressable style={{ flex: 1, width: "100%" }} onPress={() => setShowOptionsModal(false)} />
          <View style={styles.optionsSheet}>
            <View style={styles.optionsHandle} />
            {selectedPost?.userId === user?.id ? (
              <Pressable
                onPress={() => {
                  setShowOptionsModal(false);
                  if (selectedPost) handleDeletePost(selectedPost.id);
                }}
                style={styles.optionBtn}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
                <Text style={styles.optionBtnTextDanger}>Delete Post</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setShowOptionsModal(false);
                  if (selectedPost) handleOpenReportModal(selectedPost.id);
                }}
                style={styles.optionBtn}
              >
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.textPrimary} />
                <Text style={styles.optionBtnText}>Report Post</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setShowOptionsModal(false)} style={[styles.optionBtn, styles.optionCancelBtn]}>
              <Text style={styles.optionCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          IMAGE ZOOM MODAL (Item 13)
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={activeStory !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setActiveStory(null)}
      >
        <View style={styles.storyViewer}>
          <View style={styles.storyProgressTrack}>
            <View style={styles.storyProgressFill} />
          </View>
          <View style={styles.storyViewerHeader}>
            <View style={styles.storyViewerProfile}>
              <View style={styles.storyViewerAvatar}>
                {activeStory?.imageUrl ? (
                  <Image source={{ uri: activeStory.imageUrl }} style={styles.storyViewerAvatarImage} />
                ) : (
                  <Text style={styles.storyViewerAvatarText}>{activeStory?.avatarLetter ?? "G"}</Text>
                )}
              </View>
              <View>
                <Text style={styles.storyViewerName}>{activeStory?.name}</Text>
                {activeStory?.createdAt && (
                  <Text style={styles.storyViewerTime}>{getRelativeTime(activeStory.createdAt)}</Text>
                )}
              </View>
            </View>
            <Pressable onPress={() => setActiveStory(null)} hitSlop={12} style={styles.storyViewerClose}>
              <MaterialCommunityIcons name="close" size={24} color={colors.white} />
            </Pressable>
          </View>

          {activeStory?.imageUrl && (
            <Image source={{ uri: activeStory.imageUrl }} style={styles.storyViewerImage} resizeMode="cover" />
          )}

          {activeStory?.isSelf && (
            <Pressable
              disabled={isAddingStory}
              onPress={() => {
                setActiveStory(null);
                handleAddStory().catch(() => {});
              }}
              style={styles.storyViewerAddBtn}
            >
              {isAddingStory ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <MaterialCommunityIcons name="camera-plus" size={18} color={colors.white} />
                  <Text style={styles.storyViewerAddText}>Add to your story</Text>
                </>
              )}
            </Pressable>
          )}

          {!activeStory?.isSelf && activeStory && (
            <Pressable
              onPress={() => {
                const story = activeStory;
                setActiveStory(null);
                handleViewSellerGarden(story.userId, story.name);
              }}
              style={styles.storyViewerGardenBtn}
            >
              <MaterialCommunityIcons name="flower-outline" size={18} color={colors.white} />
              <Text style={styles.storyViewerGardenText}>View garden</Text>
            </Pressable>
          )}
        </View>
      </Modal>

      <SellerGardenModal
        visible={showSellerGarden}
        onClose={() => setShowSellerGarden(false)}
        sellerId={selectedSellerId}
        sellerName={selectedSellerName}
        onOpenChat={onOpenChat || (() => {})}
      />

      {zoomImageUrl && (
        <ImageZoomModal
          imageUrl={zoomImageUrl}
          onClose={() => setZoomImageUrl(null)}
        />
      )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  feedScreenShell: {
    flex: 1,
    position: "relative",
  },
  feedScroll: {
    flex: 1,
  },
  feedScrollContent: {
    paddingBottom: 124,
  },
  feedHero: {
    backgroundColor: colors.greenDark,
    borderBottomLeftRadius: radius.xs,
    borderBottomRightRadius: radius.xs,
    marginHorizontal: -20,
    marginTop: -14,
    marginBottom: 0,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 22 : 18,
    paddingBottom: 18,
  },
  feedHeroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  feedEyebrow: {
    color: "#b8ef9d",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  feedTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
  },
  feedSubtitle: {
    color: "#d7e9ce",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 310,
  },
  feedMessageBtn: {
    alignItems: "center",
    backgroundColor: colors.greenMid,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  // ── Composer ──────────────────────────────────────────
  composerCard: {
    backgroundColor: colors.surface0,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.line,
    marginHorizontal: 2,
    marginBottom: 16,
    padding: 14,
    ...shadow.sm,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  composerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  composerAvatarText: { fontSize: 14, fontWeight: "800", color: colors.green },
  composer: {
    flex: 1,
    minHeight: 60,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    textAlignVertical: "top",
    backgroundColor: colors.surface1,
    borderRadius: radius.xs,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: radius.md,
    marginTop: 10,
    backgroundColor: colors.surface1,
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  composerBarSpacer: { flex: 1 },
  composerIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  iconBtnPressed: { backgroundColor: colors.surface1 },
  composerActionText: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.green,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },

  // ── States ────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.error,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: { color: colors.errorText, fontSize: 13, fontWeight: "600", flex: 1 },
  center: { alignItems: "center", paddingVertical: 40, gap: 10 },
  centerText: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 14,
    marginBottom: 8,
  },
  loadMoreText: { fontSize: 13, fontWeight: "700", color: colors.greenMuted },

  // ── Stories Row ───────────────────────────────────────
  storiesScroll: {
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    marginHorizontal: 0,
    marginBottom: 8,
  },
  storiesContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
    flexDirection: "row",
  },
  storyItem: {
    alignItems: "center",
    width: 72,
  },
  storyItemPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  storyGradientRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f97316",
    borderColor: "#e11d48",
    borderWidth: 2,
    shadowColor: "#e11d48",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  storyEmptyRing: {
    backgroundColor: colors.surface1,
    borderColor: colors.lineMid,
    borderStyle: "dashed",
    shadowOpacity: 0,
    elevation: 0,
  },
  storyRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    position: "relative",
  },
  addStoryRing: {
    borderColor: "rgba(255,255,255,0.5)",
    borderStyle: "dashed",
  },
  storyAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface2,
  },
  storyPlusBadge: {
    position: "absolute",
    bottom: -4,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  storyAvatarText: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.green,
  },
  storyName: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
  storyViewer: {
    flex: 1,
    backgroundColor: "#050505",
    justifyContent: "center",
  },
  storyProgressTrack: {
    position: "absolute",
    top: 14,
    left: 12,
    right: 12,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    zIndex: 3,
  },
  storyProgressFill: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  storyViewerHeader: {
    position: "absolute",
    top: 28,
    left: 14,
    right: 10,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storyViewerProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  storyViewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  storyViewerAvatarImage: {
    width: "100%",
    height: "100%",
  },
  storyViewerAvatarText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  storyViewerName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  storyViewerTime: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  storyViewerClose: {
    padding: 8,
  },
  storyViewerImage: {
    width: "100%",
    height: "100%",
  },
  storyViewerGardenBtn: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 26,
    zIndex: 3,
    borderColor: "rgba(255,255,255,0.42)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  storyViewerGardenText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },

  // ── Feed Layout & Custom Header ───────────────────────
  feedContent: {
    paddingHorizontal: 16,
    paddingBottom: 80, // Space so content doesn't get hidden behind floating button
  },
  customHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 14 : 20,
    paddingBottom: 12,
    backgroundColor: colors.cream,
  },
  customHeaderTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textPrimary,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  customHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  circleHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0efeb",
    justifyContent: "center",
    alignItems: "center",
  },
  headerBadge: {
    position: "absolute",
    right: -2,
    top: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#d14b4b",
    borderColor: colors.cream,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "900",
  },
  greenCircleHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a4d2e",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Post card ─────────────────────────────────────────
  postCard: {
    backgroundColor: colors.white,
    borderColor: "rgba(26,58,34,0.06)",
    borderWidth: 1,
    borderRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  postHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  postHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postAvatar: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  postAvatarImage: {
    width: "100%",
    height: "100%",
  },
  postAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  postAvatarText: { fontSize: 15, fontWeight: "900", color: colors.green },
  onlineDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.leaf,
    borderWidth: 2,
    borderColor: colors.white,
  },
  postMeta: { flex: 1, minWidth: 0 },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postAuthor: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
  verifiedIcon: {
    marginTop: 1,
  },
  postTime: { fontSize: 12, color: colors.textTertiary, fontWeight: "700", marginTop: 2 },
  followBtn: {
    backgroundColor: "#f1f0ec",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginRight: 4,
  },
  followBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  postOptionsButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface1,
  },
  postAction: { paddingHorizontal: 4 },

  postTextSection: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  photoGrid: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  imageContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: colors.surface1,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1.25,
    borderRadius: 24,
  },
  plantProgressBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  plantProgressBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  postTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    color: colors.green,
    marginBottom: 6,
  },
  captionText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    fontWeight: "500",
  },
  careChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  careChip: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  careChipText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },

  // ── Interactions Row ──────────────────────────────────
  postInteractionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
  },
  postInteractionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  interactionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 32,
  },
  interactionText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  visitGardenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eef6f2",
    borderColor: "rgba(26,77,46,0.12)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  visitGardenBtnText: {
    color: "#1a4d2e",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // ── Ask Leafy Float button ────────────────────────────
  askLeafyFloat: {
    position: "absolute",
    bottom: 58,
    right: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: 999,
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(26,77,46,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100,
  },
  askLeafyFloatPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  askLeafyLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface1,
  },

  // ── Comments ──────────────────────────────────────────
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    padding: 12,
    gap: 10,
  },
  commentRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface1,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: { fontSize: 12, fontWeight: "800", color: colors.green },
  commentBubble: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: 10,
  },
  commentAuthor: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  commentText: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  noComments: { fontSize: 12, color: colors.textTertiary, textAlign: "center", paddingVertical: 6 },
  commentComposer: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4 },
  commentInput: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  commentSend: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
    commentSendDisabled: { opacity: 0.4 },

  // ── Report modal ──────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface0,
    borderRadius: radius.xl,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    ...shadow.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 14,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  reasonsContainer: { flexDirection: "row", marginBottom: 14 },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface1,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  reasonChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  reasonChipText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  reasonChipTextActive: { color: colors.white },
  modalInput: {
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  flexButton: { flex: 1 },

  // ── Plant detail modal ─────────────────────────────────
  plantDetailContainer: { flex: 1, backgroundColor: colors.cream, paddingTop: 50 },
  plantDetailHeader: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  plantDetailTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: "800" },
  plantDetailSubtitle: { color: colors.textSecondary, fontSize: 14, fontWeight: "600", marginTop: 2 },
  plantDetailScroll: { padding: 20 },
  plantImageDetail: {
    width: "100%",
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.surface1,
    marginBottom: 12,
  },
  plantNameDetail: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
  scientificNameText: { color: colors.textSecondary, fontSize: 12, fontStyle: "italic", fontWeight: "600", marginTop: 4 },
  plantDetailMeta: { color: colors.textSecondary, fontSize: 13, fontWeight: "600", marginTop: 4 },
  notesBox: {
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    marginTop: 12,
  },
  notesLabel: { color: colors.textPrimary, fontSize: 12, fontWeight: "800", marginBottom: 4 },
  notesText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  plantDetailFooter: { padding: 20, backgroundColor: colors.cream },
  loaderWrap: { alignItems: "center", justifyContent: "center", padding: 40 },
  loadingText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700", marginTop: 10 },

  // Legacy — kept for plant detail modal references

  bottomModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  optionsSheet: {
    backgroundColor: colors.surface0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    width: "100%",
    gap: 12,
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
  },

  // ── Skeleton loaders ──────────────────────────────────
  skeletonWrap: {
    gap: 16,
    marginTop: 8,
  },
  skeletonCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 0,
    overflow: "hidden",
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  skeletonAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface2,
  },
  skeletonImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.surface2,
    opacity: 0.6,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surface2,
  },

  // ── Comment Modal Styles ─────────────────────────────
  commentModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  commentModalCloseBtn: {
    padding: 2,
  },
  commentModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  commentModalScroll: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: colors.white,
    flexGrow: 1,
  },
  commentOriginalPost: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 16,
  },
  commentOriginalBody: {
    flex: 1,
  },
  commentAuthorLoc: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  commentModalDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginBottom: 16,
  },
  commentRowModal: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 16,
  },
  commentBodyWrap: {
    flex: 1,
    gap: 2,
  },
  commentTime: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: "600",
    marginTop: 4,
  },
  commentLoaderWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noCommentsWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  noCommentsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  noCommentsSub: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
  },
  commentModalInputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  commentModalAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  commentModalAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.green,
  },
  commentModalInput: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  commentModalSend: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  commentModalSendDisabled: {
    opacity: 0.4,
  },
  commentModalSendText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "800",
  },
  // Story AI Badge
  aiBadgeOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.green,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.white,
  },
  aiBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "900",
  },
  // Commerce Button Row
  postCommerceRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  postCommerceBtn: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  postCommerceBtnText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  // Seller Profile Sheet styles (reused from MarketScreen)
  modalContainer: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingTop: Platform.OS === "ios" ? 54 : 20,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  sellerModalTitle: {
    color: colors.green,
    fontSize: 22,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: colors.greenMuted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 100,
  },
  modalLoading: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  sellerLoadingText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  sellerEmptyTitle: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  plantCard: {
    backgroundColor: colors.surface0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
    overflow: "hidden",
  },
  plantImage: {
    width: "100%",
    height: 180,
    backgroundColor: colors.sage,
  },
  plantInfo: {
    padding: 16,
  },
  modalPlantName: {
    color: colors.green,
    fontSize: 17,
    fontWeight: "900",
  },
  modalPlantCategory: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  modalScientificName: {
    color: colors.greenMuted,
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "700",
    marginTop: 2,
  },
  careNotesText: {
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    fontSize: 13,
    color: colors.greenMuted,
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 18,
  },
  sellerHeaderCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sellerHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sellerAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    justifyContent: "center",
    alignItems: "center",
  },
  sellerAvatarText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 16,
  },
  sellerHeaderText: {
    flex: 1,
    justifyContent: "center",
  },
  sellerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sellerProfileName: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  sellerBio: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sellerStatsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  sellerStatCol: {
    flex: 1,
    alignItems: "center",
  },
  sellerStatVal: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  sellerStatLbl: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: "uppercase",
    marginTop: 2,
  },
  sellerTabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 16,
    marginTop: 12,
  },
  sellerTabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  sellerTabBtnActive: {
    borderBottomColor: colors.green,
  },
  sellerTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  sellerTabTextActive: {
    color: colors.green,
    fontWeight: "900",
  },
  plantNameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  aiVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.sage,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiVerifiedBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.green,
  },
  sellerShopCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  shopThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.sage,
  },
  shopThumbFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.sage,
    justifyContent: "center",
    alignItems: "center",
  },
  shopCardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  shopCardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  shopCardPrice: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.green,
    marginTop: 2,
  },
  shopCardLocation: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  sellerModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.cream,
    flexDirection: "row",
    gap: 12,
  },
  floatingMsgBtn: {
    flex: 1.5,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  floatingMsgBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  closeProfileBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  closeProfileBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  addStoryGradientRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addStoryRingInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  storyViewerAddBtn: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 26,
    zIndex: 3,
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  storyViewerAddText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  replyRowModal: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginLeft: 36,
    marginBottom: 12,
    position: "relative",
  },
  replyThreadLine: {
    position: "absolute",
    left: -22,
    top: -16,
    bottom: 12,
    width: 1.5,
    backgroundColor: colors.line,
  },
  replyCommentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  replyCommentAvatarText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.green,
  },
  replyButtonText: {
    fontSize: 12,
    color: colors.green,
    fontWeight: "700",
  },
  replyingBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  replyingBannerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
