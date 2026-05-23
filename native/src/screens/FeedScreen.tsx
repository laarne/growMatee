import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, Modal, ScrollView } from "react-native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { createFeedPost, getFeedPosts, getPostComments, addPostComment, togglePostReaction, deletePost, type FeedPost, type PostComment } from "../services/feed";
import { pickImageFromLibrary, uploadPublicImage, type PickedImage } from "../services/storage";
import { createReport } from "../services/reports";
import { supabase } from "../services/supabase";
import { colors, radius, shadow } from "../theme/colors";

import { MaterialCommunityIcons } from "@expo/vector-icons";

const mockStories = [
  { id: "1", name: "Your Story", avatarLetter: "U", isSelf: true, color: "#22c55e" },
  { id: "2", name: "JM Plants", avatarLetter: "J", color: "#f59e0b" },
  { id: "3", name: "Leafy AI", avatarLetter: "L", isBot: true, color: "#10b981" },
  { id: "4", name: "GreenThumb", avatarLetter: "G", color: "#3b82f6" },
  { id: "5", name: "UrbanJungle", avatarLetter: "U", color: "#ec4899" },
  { id: "6", name: "BloomAroma", avatarLetter: "B", color: "#8b5cf6" },
];

export function FeedScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [type, setType] = useState<FeedPost["type"]>("update");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [hasMore, setHasMore] = useState(true);

  // Plant detail modal states
  const [detailPlant, setDetailPlant] = useState<any>(null);
  const [isLoadingPlantDetail, setIsLoadingPlantDetail] = useState(false);

  // Comments states
  const [activePostComments, setActivePostComments] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, PostComment[]>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  const [isLoadingComments, setIsLoadingComments] = useState<Record<string, boolean>>({});

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

  async function loadPosts(isLoadMore = false) {
    if (!isLoadMore) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const lastPost = isLoadMore && posts.length > 0 ? posts[posts.length - 1] : undefined;
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
  }

  useEffect(() => {
    loadPosts();
  }, [user?.id]);

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
      loadPosts();
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

  async function handleSubmitComment(postId: string) {
    if (!user) return;
    const text = newCommentTexts[postId]?.trim();
    if (!text) return;

    setNewCommentTexts((prev) => ({ ...prev, [postId]: "" }));

    try {
      const newComment = await addPostComment(postId, user.id, text);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        )
      );
    } catch (error) {
      // Silent error
    }
  }

  const typeColor: Record<string, { bg: string; text: string }> = {
    update:   { bg: "#e0f2fe", text: "#0369a1" },
    question: { bg: "#fef3c7", text: "#92650a" },
    harvest:  { bg: "#dcfce7", text: "#15803d" },
    tip:      { bg: "#fdf4ff", text: "#7e22ce" },
  };

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

  return (
    <Screen sectionLabel="Community" title="Feed">
      {/* ── Stories Row ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContainer}
        style={styles.storiesScroll}
      >
        {mockStories.map((story) => (
          <View key={story.id} style={styles.storyItem}>
            <View style={[styles.storyRing, { borderColor: story.color }]}>
              <View style={styles.storyAvatarFallback}>
                {story.isBot ? (
                  <MaterialCommunityIcons name="robot-outline" size={20} color={colors.green} />
                ) : (
                  <Text style={styles.storyAvatarText}>{story.avatarLetter}</Text>
                )}
              </View>
            </View>
            <Text numberOfLines={1} style={styles.storyName}>
              {story.name}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Composer ── */}
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

          <View style={styles.composerBarSpacer} />

          <Pressable
            onPress={handlePost}
            disabled={isPosting || !body.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
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

      {/* ── Error ── */}
      {error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.errorText} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={styles.centerText}>Loading posts...</Text>
        </View>
      )}

      {/* ── Empty ── */}
      {!isLoading && posts.length === 0 && (
        <View style={styles.center}>
          <MaterialCommunityIcons name="forum-outline" size={48} color={colors.line} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySub}>Be the first to share something with the community!</Text>
        </View>
      )}

      {/* ── Posts ── */}
      {!isLoading &&
        posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* Header */}
            <View style={styles.postHeader}>
              <View style={styles.postHeaderLeft}>
                <View style={styles.postAvatar}>
                  <Text style={styles.postAvatarText}>
                    {(post.authorName?.[0] ?? "?").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>{post.authorName}</Text>
                  <Text style={styles.postTime}>{getRelativeTime(post.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.postHeaderRight}>
                <View style={[styles.typeBadge, { backgroundColor: (typeColor[post.type] ?? typeColor.update).bg }]}>
                  <Text style={[styles.typeBadgeText, { color: (typeColor[post.type] ?? typeColor.update).text }]}>
                    {post.type}
                  </Text>
                </View>
                {post.userId === user?.id ? (
                  <Pressable onPress={() => handleDeletePost(post.id)} style={styles.postAction} hitSlop={8}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => handleOpenReportModal(post.id)} style={styles.postAction} hitSlop={8}>
                    <Text style={styles.reportText}>Report</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Image */}
            {post.imageUrl && (
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            )}

            {/* Actions Row */}
            <View style={styles.postActions}>
              <View style={styles.postActionsLeft}>
                <Pressable style={styles.actionIconBtn} onPress={() => handleToggleLike(post.id)}>
                  <MaterialCommunityIcons
                    name={post.isLikedByMe ? "heart" : "heart-outline"}
                    size={24}
                    color={post.isLikedByMe ? "#ef4444" : colors.textPrimary}
                  />
                </Pressable>
                <Pressable style={styles.actionIconBtn} onPress={() => handleToggleComments(post.id)}>
                  <MaterialCommunityIcons
                    name="comment-outline"
                    size={24}
                    color={colors.textPrimary}
                  />
                </Pressable>
                <Pressable style={styles.actionIconBtn}>
                  <MaterialCommunityIcons
                    name="send-outline"
                    size={24}
                    color={colors.textPrimary}
                  />
                </Pressable>
              </View>
              <Pressable style={styles.actionIconBtn}>
                <MaterialCommunityIcons
                  name="bookmark-outline"
                  size={24}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>

            {/* Content Section (Caption & Likes) */}
            <View style={styles.postContentSection}>
              {post.reactionsCount > 0 && (
                <Text style={styles.likesText}>
                  {post.reactionsCount === 1 ? "1 like" : `${post.reactionsCount} likes`}
                </Text>
              )}

              <View style={styles.captionRow}>
                <Text style={styles.captionText}>
                  <Text style={styles.boldAuthor}>{post.authorName}</Text>{" "}
                  {post.body}
                </Text>
              </View>

              {post.gardenPlantId && (
                <Pressable
                  onPress={() => handleViewPlantDetail(post.gardenPlantId!, post.gardenPlantName || "Linked Plant")}
                  style={styles.linkedBadgeWrapper}
                >
                  <MaterialCommunityIcons name="flower-outline" size={14} color={colors.green} />
                  <Text style={styles.linkedBadgeText}>
                    Linked plant: {post.gardenPlantName}
                  </Text>
                </Pressable>
              )}

              {post.commentsCount > 0 && activePostComments !== post.id && (
                <Pressable onPress={() => handleToggleComments(post.id)}>
                  <Text style={styles.viewCommentsLink}>
                    View all {post.commentsCount} comments
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Comments Section */}
            {activePostComments === post.id && (
              <View style={styles.commentsSection}>
                {isLoadingComments[post.id] ? (
                  <ActivityIndicator color={colors.green} size="small" />
                ) : (
                  <>
                    {(commentsMap[post.id] ?? []).map((comment) => (
                      <View key={comment.id} style={styles.commentRow}>
                        <View style={styles.commentAvatar}>
                          <Text style={styles.commentAvatarText}>
                            {(comment.authorName?.[0] ?? "?").toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.commentBubble}>
                          <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                          <Text style={styles.commentText}>{comment.body}</Text>
                        </View>
                      </View>
                    ))}
                    {(!commentsMap[post.id] || commentsMap[post.id].length === 0) && (
                      <Text style={styles.noComments}>Be the first to comment</Text>
                    )}
                    <View style={styles.commentComposer}>
                      <TextInput
                        onChangeText={(val) => setNewCommentTexts((prev) => ({ ...prev, [post.id]: val }))}
                        placeholder="Write a comment..."
                        placeholderTextColor={colors.textTertiary}
                        style={styles.commentInput}
                        value={newCommentTexts[post.id] || ""}
                      />
                      <Pressable
                        disabled={!(newCommentTexts[post.id] || "").trim()}
                        style={[styles.commentSend, !(newCommentTexts[post.id] || "").trim() && styles.commentSendDisabled]}
                        onPress={() => handleSubmitComment(post.id)}
                      >
                        <MaterialCommunityIcons name="send" size={16} color={colors.white} />
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        ))}

      {!isLoading && hasMore && posts.length > 0 && (
        <Pressable onPress={() => loadPosts(true)} style={styles.loadMoreBtn}>
          <Text style={styles.loadMoreText}>Load more posts</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.greenMuted} />
        </Pressable>
      )}

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── Composer ──────────────────────────────────────────
  composerCard: {
    backgroundColor: colors.surface0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
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
    fontWeight: "500",
    textAlignVertical: "top",
    paddingTop: 0,
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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 12,
  },
  storiesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
    flexDirection: "row",
  },
  storyItem: {
    alignItems: "center",
    width: 68,
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    marginBottom: 4,
  },
  storyAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatarText: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.green,
  },
  storyName: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "center",
  },

  // ── Post card ─────────────────────────────────────────
  postCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  postHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  postHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  postAvatarText: { fontSize: 14, fontWeight: "800", color: colors.green },
  postMeta: { },
  postAuthor: { fontSize: 13, fontWeight: "800", color: colors.textPrimary },
  postTime: { fontSize: 10, color: colors.textTertiary, fontWeight: "600", marginTop: 1 },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  typeBadgeText: { fontSize: 10, fontWeight: "900", textTransform: "capitalize" },
  postAction: { paddingHorizontal: 4 },

  postBody: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.surface1,
    marginBottom: 0,
  },
  postDivider: { height: 1, backgroundColor: colors.line, marginTop: 8 },

  postActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  postActionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  actionIconBtn: {
    padding: 2,
  },
  postContentSection: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  likesText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  captionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  boldAuthor: {
    fontWeight: "800",
    color: colors.textPrimary,
    fontSize: 13,
  },
  captionText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  viewCommentsLink: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: "700",
    marginTop: 4,
  },
  linkedBadgeWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    borderColor: "#dcfce7",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 2,
  },
  linkedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.green,
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
  commentAvatarText: { fontSize: 11, fontWeight: "800", color: colors.green },
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
  linkedPlantBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.green,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  linkedPlantText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  deleteText: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "900",
  },
  reportText: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "900",
  },
});

