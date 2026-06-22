import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { CAT_COLOR, INITIAL_GROUPS } from '../../data/community';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';
import VideoPlayer from '../../components/VideoPlayer';

const CAT_TO_GROUP: Record<string, string[]> = {
  운동팁: ['운동', '자기계발'],
  인증샷: ['운동', '다이어트'],
  식단: ['다이어트', '운동'],
  질문: ['운동', '자기계발'],
  자유: ['운동', '아웃도어'],
  쇼츠: ['운동', '아웃도어', '자기계발'],
};

const postScrollCache: Record<string, number> = {};

export default function CommunityPostScreen() {
  const { postId, from, returnPostId } = useLocalSearchParams<{ postId: string; from?: string; returnPostId?: string }>();
  const router = useRouter();
  const { gymAdmin } = useAuthStore();
  const { posts, comments, likedPosts, toggleLikePost, incrementViews, addComment } = useCommunityStore();

  const post = posts.find((p) => p.id === postId);
  const postComments = comments.filter((c) => c.postId === postId);
  const isLiked = likedPosts.includes(postId ?? '');

  const similarPosts = useMemo(() =>
    posts.filter(p => p.id !== postId && p.category === post?.category).slice(0, 4),
    [posts, postId, post?.category]
  );

  const popularPosts = useMemo(
    () => [...posts].filter(p => p.id !== postId).sort((a, b) => b.likes - a.likes).slice(0, 5),
    [posts, postId]
  );

  const matchingGroups = useMemo(() => {
    if (!post) return [];
    const relatedCats = CAT_TO_GROUP[post.category] ?? ['운동'];
    return INITIAL_GROUPS.filter(g => relatedCats.includes(g.category)).slice(0, 4);
  }, [post?.category]);

  const authorIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    posts.forEach((p) => { if (p.author && p.authorId) map[p.author] = p.authorId; });
    return map;
  }, [posts]);

  const [commentText, setCommentText] = useState('');
  const [videoPlaying, setVideoPlaying] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (postId) incrementViews(postId);
  }, [postId]);


  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>게시글을 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const catColor = CAT_COLOR[post.category] ?? '#888';

  const handleSubmitComment = () => {
    const text = commentText.trim();
    if (!text) return;
    addComment(post.id, text, gymAdmin?.name ?? '익명', gymAdmin?.profileImageUrl, gymAdmin?.id);
    setCommentText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate((from === 'post' && returnPostId ? { pathname: '/(gym)/community-post', params: { postId: returnPostId } } : '/(gym)/community') as any)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{post.category}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          key={postId}
          ref={scrollViewRef}
          onLayout={() => {
            const savedY = postScrollCache[postId ?? ''];
            if (savedY && savedY > 0) {
              scrollViewRef.current?.scrollTo({ y: savedY, animated: false });
            }
          }}
          onScroll={(e) => { postScrollCache[postId ?? ''] = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={100}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.postSection}>
            <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
              <Text style={[styles.catText, { color: catColor }]}>{post.category}</Text>
            </View>
            <Text style={styles.postTitle}>{post.title}</Text>

            <TouchableOpacity
              style={styles.authorRow}
              onPress={() => post.authorId ? router.push(`/user-profile/${post.authorId}` as any) : undefined}
              activeOpacity={post.authorId ? 0.7 : 1}
              disabled={!post.authorId}
            >
              <View style={styles.authorAvatar}>
                {post.authorAvatar
                  ? <Image source={{ uri: post.authorAvatar }} style={styles.authorAvatarImg} />
                  : <Text style={styles.authorInitial}>{post.author[0]}</Text>}
              </View>
              <View>
                <Text style={styles.authorName}>{post.author}</Text>
                <Text style={styles.authorMeta}>{post.location} · {post.timeAgo}</Text>
              </View>
            </TouchableOpacity>

            {post.isVideo && post.videoUrl ? (
              <View style={[styles.imageWrap, { height: 220 }]}>
                <VideoPlayer uri={post.videoUrl} isPlaying={videoPlaying} />
                {!videoPlaying && (
                  <TouchableOpacity style={styles.playOverlay} onPress={() => setVideoPlaying(true)} activeOpacity={0.8}>
                    {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                    <MaterialCommunityIcons name="play-circle" size={56} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                )}
                {videoPlaying && (
                  <TouchableOpacity
                    style={styles.fullscreenBtn}
                    onPress={() => {
                      const v = (document as any).querySelector('video');
                      if (!v) return;
                      if (v.requestFullscreen) v.requestFullscreen();
                      else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
                      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
                    }}
                  >
                    <MaterialCommunityIcons name="fullscreen" size={22} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ) : post.imageUrl ? (
              <View style={styles.imageWrap}>
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
              </View>
            ) : null}

            <Text style={styles.postContent}>{post.content}</Text>

            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLikePost(post.id)}>
                <MaterialCommunityIcons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isLiked ? '#2DD4BF' : COLORS.textSecondary}
                />
                <Text style={[styles.actionText, isLiked && { color: '#2DD4BF' }]}>
                  {post.likes}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => inputRef.current?.focus()}>
                <MaterialCommunityIcons name="comment-outline" size={22} color={COLORS.textSecondary} />
                <Text style={styles.actionText}>{post.comments}</Text>
              </TouchableOpacity>
              <View style={styles.viewCount}>
                <MaterialCommunityIcons name="eye-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.viewText}>조회 {post.views.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.commentsSection}>
            <Text style={styles.commentHeader}>댓글 {postComments.length}개</Text>
            {postComments.length === 0 ? (
              <View style={styles.noComment}>
                <Text style={styles.noCommentText}>첫 번째 댓글을 남겨보세요!</Text>
              </View>
            ) : (
              postComments.map((c) => {
                const effectiveAuthorId = c.authorId ?? authorIdMap[c.author];
                return (
                  <View key={c.id} style={styles.commentItem}>
                    <TouchableOpacity
                      onPress={() => effectiveAuthorId ? router.push(`/user-profile/${effectiveAuthorId}` as any) : undefined}
                      activeOpacity={effectiveAuthorId ? 0.7 : 1}
                      disabled={!effectiveAuthorId}
                    >
                      <View style={styles.commentAvatar}>
                        {c.authorAvatar
                          ? <Image source={{ uri: c.authorAvatar }} style={styles.commentAvatarImg} />
                          : <Text style={styles.commentInitial}>{c.author[0]}</Text>}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.commentBody}>
                      <View style={styles.commentTop}>
                        <TouchableOpacity
                          onPress={() => effectiveAuthorId ? router.push(`/user-profile/${effectiveAuthorId}` as any) : undefined}
                          activeOpacity={effectiveAuthorId ? 0.7 : 1}
                          disabled={!effectiveAuthorId}
                        >
                          <Text style={styles.commentAuthor}>{c.author}</Text>
                        </TouchableOpacity>
                        <Text style={styles.commentTime}>{c.timeAgo}</Text>
                      </View>
                      <Text style={styles.commentContent}>{c.content}</Text>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 20 }} />
          </View>

          {/* 이 글과 잘 맞는 모임 */}
          {matchingGroups.length > 0 && (
            <View style={styles.recSection}>
              <View style={styles.recHeader}>
                <Text style={styles.recTitle}>🎯 이 글과 잘 맞는 모임이에요</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRow}>
                {matchingGroups.map(g => (
                  <TouchableOpacity key={g.id} style={styles.groupCard} activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/(gym)/community-group', params: { groupId: g.id, from: 'post', returnPostId: post.id } } as any)}>
                    <Image source={{ uri: g.imageUrl }} style={styles.groupImg} />
                    <Text style={styles.groupName} numberOfLines={2}>{g.name}</Text>
                    <Text style={styles.groupMeta}>{g.location} · 멤버 {g.memberCount}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 이 글과 비슷한 게시글 */}
          {similarPosts.length > 0 && (
            <View style={styles.recSection}>
              <Text style={[styles.recTitle, { marginBottom: 4 }]}>🔗 이 글과 비슷한 게시글</Text>
              {similarPosts.map(p => {
                const pc = CAT_COLOR[p.category] ?? '#888';
                return (
                  <TouchableOpacity
                    key={p.id} style={styles.simPost} activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/(gym)/community-post', params: { postId: p.id, from: 'post', returnPostId: post.id } } as any)}
                  >
                    <View style={styles.simPostBody}>
                      <View style={[styles.simCatBadge, { backgroundColor: pc + '18' }]}>
                        <Text style={[styles.simCatText, { color: pc }]}>{p.category}</Text>
                      </View>
                      <Text style={styles.simTitle} numberOfLines={2}>{p.title}</Text>
                      <Text style={styles.simContent} numberOfLines={2}>{p.content}</Text>
                      <View style={styles.simStats}>
                        <MaterialCommunityIcons name="heart-outline" size={13} color={COLORS.textSecondary} />
                        <Text style={styles.simStatText}>{p.likes}</Text>
                        <MaterialCommunityIcons name="comment-outline" size={13} color={COLORS.textSecondary} />
                        <Text style={styles.simStatText}>{p.comments}</Text>
                        <Text style={styles.simTime}>{p.timeAgo}</Text>
                      </View>
                    </View>
                    {p.imageUrl && (
                      <Image source={{ uri: p.imageUrl }} style={styles.simImg} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 인기글 */}
          {popularPosts.length > 0 && (
            <View style={[styles.recSection, { paddingBottom: 20 }]}>
              <Text style={[styles.recTitle, { marginBottom: 4 }]}>🔥 인기글</Text>
              {popularPosts.map((p, index) => {
                const pc = CAT_COLOR[p.category] ?? '#888';
                return (
                  <TouchableOpacity
                    key={p.id} style={styles.simPost} activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/(gym)/community-post', params: { postId: p.id, from: 'post', returnPostId: post.id } } as any)}
                  >
                    <Text style={[styles.popularRank, index < 3 && styles.popularRankHot]}>{index + 1}</Text>
                    <View style={styles.simPostBody}>
                      <View style={[styles.simCatBadge, { backgroundColor: pc + '18' }]}>
                        <Text style={[styles.simCatText, { color: pc }]}>{p.category}</Text>
                      </View>
                      <Text style={styles.simTitle} numberOfLines={2}>{p.title}</Text>
                      <View style={styles.simStats}>
                        <MaterialCommunityIcons name="heart-outline" size={13} color={COLORS.textSecondary} />
                        <Text style={styles.simStatText}>{p.likes}</Text>
                        <MaterialCommunityIcons name="comment-outline" size={13} color={COLORS.textSecondary} />
                        <Text style={styles.simStatText}>{p.comments}</Text>
                        <Text style={styles.simTime}>{p.timeAgo}</Text>
                      </View>
                    </View>
                    {p.imageUrl && (
                      <Image source={{ uri: p.imageUrl }} style={styles.simImg} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.commentInput}
            placeholder="댓글을 입력하세요"
            placeholderTextColor={COLORS.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim()}
          >
            <MaterialCommunityIcons
              name="send"
              size={20}
              color={commentText.trim() ? '#fff' : COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex1: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 15, color: COLORS.textSecondary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 32, fontWeight: '300', color: COLORS.text, lineHeight: 36 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },

  scroll: { flex: 1 },

  postSection: {
    backgroundColor: COLORS.surface,
    padding: 20, gap: 12,
    borderBottomWidth: 8, borderBottomColor: COLORS.background,
  },
  catBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catText: { fontSize: 12, fontWeight: '700' },
  postTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, lineHeight: 28 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  authorAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#2DD4BF' + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  authorInitial: { fontSize: 16, fontWeight: '700', color: '#2DD4BF' },
  authorAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  authorName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  authorMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  imageWrap: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  postImage: { width: '100%', height: 220 },
  playOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },

  postContent: { fontSize: 15, color: COLORS.text, lineHeight: 24, marginTop: 4 },

  actionBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
    gap: 16, marginTop: 4,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  viewCount: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  viewText: { fontSize: 12, color: COLORS.textSecondary },

  commentsSection: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16, paddingTop: 16,
  },
  commentHeader: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  noComment: { paddingVertical: 24, alignItems: 'center' },
  noCommentText: { fontSize: 14, color: COLORS.textSecondary },

  commentItem: {
    flexDirection: 'row', gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#2DD4BF' + '22',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  commentInitial: { fontSize: 13, fontWeight: '700', color: '#2DD4BF' },
  commentAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  commentBody: { flex: 1, gap: 4 },
  commentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  commentTime: { fontSize: 11, color: COLORS.textSecondary },
  commentContent: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  commentInput: {
    flex: 1,
    minHeight: 36, maxHeight: 60,
    backgroundColor: COLORS.background,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 7,
    fontSize: 14, color: COLORS.text,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2DD4BF',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  fullscreenBtn: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6, padding: 4,
  },

  recSection: {
    backgroundColor: COLORS.surface,
    marginTop: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  recHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  recTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  groupRow: { gap: 12, paddingBottom: 8 },
  groupCard: { width: 130 },
  groupImg: { width: 130, height: 96, borderRadius: 10, marginBottom: 6 },
  groupName: { fontSize: 13, fontWeight: '700', color: COLORS.text, lineHeight: 18 },
  groupMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  simPost: {
    flexDirection: 'row', gap: 12, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  simPostBody: { flex: 1, gap: 5 },
  simCatBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  simCatText: { fontSize: 11, fontWeight: '700' },
  simTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  simContent: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  simStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  simStatText: { fontSize: 11, color: COLORS.textSecondary },
  simTime: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 'auto' },
  simImg: { width: 80, height: 80, borderRadius: 8, flexShrink: 0 },

  popularRank: { fontSize: 18, fontWeight: '900', color: COLORS.border, width: 24, textAlign: 'center', paddingTop: 2 },
  popularRankHot: { color: '#2DD4BF' },
});
