import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, Modal, ScrollView } from "react-native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { createFeedPost, getFeedPosts, getPostComments, addPostComment, togglePostReaction, deletePost, type FeedPost, type PostComment } from "../services/feed";
import { pickImageFromLibrary, uploadPublicImage, type PickedImage } from "../services/storage";
import { createReport } from "../services/reports";
import { getOrCreateMyGarden, getGardenPlants, type GardenPlant } from "../services/gardens";
import { supabase } from "../services/supabase";
import { colors } from "../theme/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const postTypes: FeedPost["type"][] = ["update", "question", "harvest", "tip"];

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

  // Garden Plant Link states
  const [userPlants, setUserPlants] = useState<GardenPlant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);

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

  async function loadUserPlants() {
    if (!user) return;
    try {
      const garden = await getOrCreateMyGarden(user.id);
      const plants = await getGardenPlants(garden.id);
      setUserPlants(plants);
    } catch (err) {
      console.error("Failed to load user plants for feed linking", err);
    }
  }

  useEffect(() => {
    loadPosts();
    loadUserPlants();
  }, [user?.id]);

  async function handlePost() {
    if (!user || !body.trim()) return;

    setIsPosting(true);
    setError(null);

    try {
      const uploadedPhoto = photo ? await uploadPublicImage("feed-photos", user.id, "posts", photo) : null;
      await createFeedPost(user.id, body.trim(), type, uploadedPhoto?.publicUrl, selectedPlantId);
      setBody("");
      setPhoto(null);
      setType("update");
      setSelectedPlantId(null);
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

  return (
    <Screen>
      <Text style={styles.title}>Feed</Text>
      <Card>
        <TextInput
          multiline
          onChangeText={setBody}
          placeholder="Share with the plant community..."
          placeholderTextColor="#8a9583"
          style={styles.composer}
          value={body}
        />
        {photo && <Image source={{ uri: photo.uri }} style={styles.preview} />}

        {userPlants.length > 0 && (
          <View style={styles.plantSelectorRow}>
            <Text style={styles.selectorLabel}>Link Plant (Optional):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.plantScroll}>
              {userPlants.map((plant) => {
                const isSelected = selectedPlantId === plant.id;
                return (
                  <Pressable
                    key={plant.id}
                    onPress={() => setSelectedPlantId(isSelected ? null : plant.id)}
                    style={[styles.plantChip, isSelected && styles.plantChipActive]}
                  >
                    <Text style={[styles.plantChipText, isSelected && styles.plantChipTextActive]}>
                      🌱 {plant.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.actions}>
          {postTypes.map((postType) => (
            <Button key={postType} variant={type === postType ? "primary" : "secondary"} onPress={() => setType(postType)}>
              {postType}
            </Button>
          ))}
        </View>
        <View style={styles.buttonGap}>
          <Button variant="secondary" onPress={handlePickPhoto}>
            {photo ? "Change photo" : "Add photo"}
          </Button>
        </View>
        <View style={styles.buttonGap}>
          <Button disabled={isPosting || !body.trim()} onPress={handlePost}>
            {isPosting ? "Posting..." : "Post"}
          </Button>
        </View>
      </Card>

      {error && (
        <Card tint="warning">
          <Text style={styles.emptyTitle}>Feed error</Text>
          <Text style={styles.body}>{error}</Text>
        </Card>
      )}

      {isLoading && (
        <Card>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.body}>Loading community posts...</Text>
        </Card>
      )}

      {!isLoading && posts.length === 0 && (
        <Card>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.body}>Garden updates, questions, harvests, and Leafy AI notes will appear here.</Text>
        </Card>
      )}

      {!isLoading &&
        posts.map((post) => (
          <Card key={post.id}>
            <View style={styles.postHeader}>
              <View style={styles.authorSection}>
                <View>
                  <Text style={styles.author}>{post.authorName}</Text>
                  <Text style={styles.meta}>
                    {post.authorLocation ?? "GrowMate"} - {new Date(post.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {post.userId === user?.id ? (
                  <Pressable onPress={() => handleDeletePost(post.id)} style={styles.actionIconPress}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color="#d14b4b" />
                  </Pressable>
                ) : (
                  <Pressable onPress={() => handleOpenReportModal(post.id)} style={styles.actionIconPress}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.green} />
                  </Pressable>
                )}
              </View>
              <Text style={styles.tag}>{post.type}</Text>
            </View>
            {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
            {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.postImage} />}
            <Text style={styles.postBody}>{post.body}</Text>

            {post.gardenPlantId && (
              <Pressable
                onPress={() => handleViewPlantDetail(post.gardenPlantId!, post.gardenPlantName!)}
                style={styles.linkedPlantBadge}
              >
                <MaterialCommunityIcons name="leaf" size={14} color={colors.white} />
                <Text style={styles.linkedPlantText}>Linked Plant: {post.gardenPlantName}</Text>
              </Pressable>
            )}

            <View style={styles.reactionsBar}>
              <Pressable style={styles.actionBtn} onPress={() => handleToggleLike(post.id)}>
                <Text style={styles.actionBtnText}>
                  {post.isLikedByMe ? "❤️" : "🖤"} {post.reactionsCount} Likes
                </Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleToggleComments(post.id)}>
                <Text style={styles.actionBtnText}>
                  💬 {post.commentsCount} Comments
                </Text>
              </Pressable>
            </View>

            {activePostComments === post.id && (
              <View style={styles.commentsSection}>
                {isLoadingComments[post.id] ? (
                  <ActivityIndicator color={colors.green} size="small" style={styles.commentLoader} />
                ) : (
                  <>
                    {(commentsMap[post.id] ?? []).map((comment) => (
                      <View key={comment.id} style={styles.commentItem}>
                        <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                        <Text style={styles.commentText}>{comment.body}</Text>
                      </View>
                    ))}
                    {(!commentsMap[post.id] || commentsMap[post.id].length === 0) && (
                      <Text style={styles.noComments}>No comments yet. Write the first one!</Text>
                    )}
                    <View style={styles.commentComposer}>
                      <TextInput
                        onChangeText={(val) => setNewCommentTexts((prev) => ({ ...prev, [post.id]: val }))}
                        placeholder="Write a comment..."
                        placeholderTextColor="#8a9583"
                        style={styles.commentInput}
                        value={newCommentTexts[post.id] || ""}
                      />
                      <Pressable
                        disabled={!(newCommentTexts[post.id] || "").trim()}
                        style={styles.commentSubmit}
                        onPress={() => handleSubmitComment(post.id)}
                      >
                        <Text style={styles.commentSubmitText}>Send</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            )}
          </Card>
        ))}

      {!isLoading && hasMore && posts.length > 0 && (
        <View style={styles.loadMoreContainer}>
          <Button variant="secondary" onPress={() => loadPosts(true)}>
            Load More Posts
          </Button>
        </View>
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
  title: {
    color: colors.green,
    fontSize: 30,
    fontWeight: "900",
  },
  composer: {
    borderRadius: 24,
    backgroundColor: colors.cream,
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 92,
    paddingHorizontal: 18,
    paddingVertical: 14,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  preview: {
    backgroundColor: colors.sage,
    borderRadius: 20,
    height: 180,
    marginTop: 14,
    width: "100%",
  },
  buttonGap: {
    marginTop: 14,
  },
  emptyTitle: {
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
  },
  postHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  author: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
  },
  meta: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  tag: {
    backgroundColor: colors.sage,
    borderRadius: 999,
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 7,
    textTransform: "capitalize",
  },
  postTitle: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 16,
  },
  postBody: {
    color: colors.greenMuted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: 10,
  },
  postImage: {
    backgroundColor: colors.sage,
    borderRadius: 20,
    height: 210,
    marginTop: 14,
    width: "100%",
  },
  reactionsBar: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
  },
  actionBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionBtnText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  commentsSection: {
    backgroundColor: colors.cream,
    borderRadius: 18,
    marginTop: 14,
    padding: 12,
  },
  commentLoader: {
    marginVertical: 10,
  },
  commentItem: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  commentAuthor: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  commentText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  noComments: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "700",
    marginVertical: 10,
    textAlign: "center",
  },
  commentComposer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  commentInput: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.green,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentSubmit: {
    backgroundColor: colors.green,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  commentSubmitText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  authorSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIconPress: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cream,
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.green,
    marginBottom: 16,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.greenMuted,
    marginBottom: 8,
  },
  reasonsContainer: {
    flexDirection: "row",
    marginBottom: 14,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.sage,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  reasonChipActive: {
    backgroundColor: colors.green,
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.green,
  },
  reasonChipTextActive: {
    color: colors.white,
  },
  modalInput: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    color: colors.green,
    fontSize: 14,
    fontWeight: "700",
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  flexButton: {
    flex: 1,
  },
  plantSelectorRow: {
    marginTop: 14,
  },
  selectorLabel: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  plantScroll: {
    flexDirection: "row",
    gap: 8,
  },
  plantChip: {
    backgroundColor: colors.sage,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  plantChipActive: {
    backgroundColor: colors.green,
  },
  plantChipText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "800",
  },
  plantChipTextActive: {
    color: colors.white,
  },
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
  linkedPlantText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "900",
  },
  loadMoreContainer: {
    marginVertical: 16,
    alignItems: "center",
  },
  plantDetailContainer: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingTop: 50,
  },
  plantDetailHeader: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  plantDetailTitle: {
    color: colors.green,
    fontSize: 22,
    fontWeight: "900",
  },
  plantDetailSubtitle: {
    color: colors.greenMuted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  plantDetailScroll: {
    padding: 20,
  },
  plantImageDetail: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: colors.sage,
    marginBottom: 12,
  },
  plantNameDetail: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "900",
  },
  scientificNameText: {
    color: colors.greenMuted,
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "700",
    marginTop: 4,
  },
  plantDetailMeta: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  notesBox: {
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  notesLabel: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },
  notesText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  plantDetailFooter: {
    padding: 20,
    backgroundColor: colors.cream,
  },
  loaderWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
  },
});
