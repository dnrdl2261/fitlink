import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  useWindowDimensions, ViewToken, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';
import { useFollowStore } from '../../store/followStore';
import VideoPlayer from '../../components/VideoPlayer';
import { Post, Group } from '../../data/community';

const ACCENT = COLORS.secondary;
const BANNER_H = 72;

function StoryItem({
  post, isActive, isLiked, isDisliked, isSaved,
  onLike, onDislike, onSave, onShare,
  screenH, relatedGroup, onGoGroup,
  onGoAuthor, isFollowingAuthor, isSelf, onToggleFollow,
}: {
  post: Post; isActive: boolean;
  isLiked: boolean; isDisliked: boolean; isSaved: boolean;
  onLike: () => void; onDislike: () => void;
  onSave: () => void; onShare: () => void;
  screenH: number; relatedGroup?: Group;
  onGoGroup?: (id: string) => void;
  onGoAuthor: () => void;
  isFollowingAuthor: boolean;
  isSelf: boolean;
  onToggleFollow: () => void;
}) {
  return (
    <View style={{ height: screenH, backgroundColor: '#000', overflow: 'hidden' }}>
      <View style={StyleSheet.absoluteFill}>
        {post.videoUrl ? (
          <VideoPlayer uri={post.videoUrl} isPlaying={isActive} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noVideo]}>
            <MaterialCommunityIcons name="video-off" size={64} color="rgba(255,255,255,0.3)" />
          </View>
        )}
      </View>

      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            top: '55%',
            // @ts-ignore
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.9))',
            backgroundColor: 'transparent',
          },
        ]}
      />

      <View style={[styles.rightBar, { bottom: BANNER_H + 24 }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike} activeOpacity={0.8}>
          <MaterialCommunityIcons
            name={isLiked ? 'thumb-up' : 'thumb-up-outline'}
            size={30} color={isLiked ? ACCENT : '#fff'}
          />
          <Text style={styles.actionLabel}>{post.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onDislike} activeOpacity={0.8}>
          <MaterialCommunityIcons
            name={isDisliked ? 'thumb-down' : 'thumb-down-outline'}
            size={30} color={isDisliked ? '#aaa' : '#fff'}
          />
          <Text style={styles.actionLabel}>관심없음</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onShare} activeOpacity={0.8}>
          <MaterialCommunityIcons name="share-variant" size={30} color="#fff" />
          <Text style={styles.actionLabel}>공유</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onSave} activeOpacity={0.8}>
          <MaterialCommunityIcons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={30} color={isSaved ? ACCENT : '#fff'}
          />
          <Text style={styles.actionLabel}>저장</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons name="dots-vertical" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomContent, { bottom: BANNER_H + 20 }]}>
        <View style={styles.authorRow}>
          <TouchableOpacity style={styles.authorTouch} onPress={onGoAuthor} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: ACCENT + '55', borderColor: '#fff' }]}>
              <Text style={[styles.avatarText, { color: '#fff' }]}>{post.author[0]}</Text>
            </View>
            <Text style={styles.authorName}>{post.author}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.postTitle} numberOfLines={1}>{post.title}</Text>
        <Text style={styles.postContent} numberOfLines={2}>{post.content}</Text>
      </View>

      {relatedGroup && (
        <TouchableOpacity
          style={styles.groupBanner}
          onPress={() => onGoGroup?.(relatedGroup.id)}
          activeOpacity={0.9}
        >
          <View style={[styles.groupBannerAvatar, { backgroundColor: ACCENT + '33' }]}>
            <Text style={[styles.groupBannerAvatarText, { color: '#fff' }]}>
              {relatedGroup.name[0]}
            </Text>
          </View>
          <View style={styles.groupBannerInfo}>
            <Text style={styles.groupBannerName} numberOfLines={1}>{relatedGroup.name}</Text>
            <Text style={styles.groupBannerMeta}>
              {relatedGroup.location} · {relatedGroup.memberCount}명 · {relatedGroup.category}
            </Text>
          </View>
          <View style={[styles.groupBannerBtn, { backgroundColor: ACCENT }]}>
            <Text style={styles.groupBannerBtnText}>보러가기</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function TrainerCommunityStoryScreen() {
  const { postId, from } = useLocalSearchParams<{ postId: string; from?: string }>();
  const router = useRouter();
  const { trainer } = useAuthStore();
  const { isFollowing, follow, unfollow } = useFollowStore();
  const myId = trainer?.id ?? '';
  const {
    posts, groups, likedPosts, dislikedPosts, savedPosts,
    toggleLikePost, toggleDislikePost, toggleSavePost, incrementViews,
  } = useCommunityStore();
  const { height: screenH } = useWindowDimensions();

  const videoPosts = useMemo(() => posts.filter((p) => p.isVideo), [posts]);

  const initialIndex = useMemo(
    () => Math.max(0, videoPosts.findIndex((p) => p.id === postId)),
    [videoPosts, postId],
  );

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [containerH, setContainerH] = useState(screenH);
  const listRef = useRef<FlatList>(null);
  const videoPostsRef = useRef(videoPosts);
  videoPostsRef.current = videoPosts;

  useEffect(() => {
    if (initialIndex > 0) {
      const t = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [initialIndex]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const idx = viewableItems[0].index;
      setActiveIndex(idx);
      if (videoPostsRef.current[idx]) incrementViews(videoPostsRef.current[idx].id);
    }
  });

  const getRelatedGroup = useCallback((post: Post): Group | undefined => {
    if (post.relatedGroupId) return groups.find((g) => g.id === post.relatedGroupId);
    return undefined;
  }, [groups]);

  const handleShare = useCallback((post: Post) => {
    if (Platform.OS === 'web') alert(`"${post.title}" 링크가 복사됩니다.`);
  }, []);

  const goBack = () => router.navigate({ pathname: '/(trainer)/community', params: from ? { from } : {} } as any);
  const goGroup = (groupId: string) =>
    router.push(`/(trainer)/community-group?groupId=${groupId}` as any);

  if (videoPosts.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="video-off-outline" size={52} color="#555" />
        <Text style={styles.emptyText}>스토리 영상이 없어요</Text>
        <TouchableOpacity onPress={goBack} style={styles.emptyBack}>
          <Text style={styles.emptyBackText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={videoPosts}
        keyExtractor={(p) => p.id}
        pagingEnabled
        snapToInterval={containerH}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}
        getItemLayout={(_, index) => ({
          length: containerH,
          offset: containerH * index,
          index,
        })}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
        renderItem={({ item, index }) => (
          <StoryItem
            post={item}
            isActive={index === activeIndex}
            isLiked={likedPosts.includes(item.id)}
            isDisliked={dislikedPosts.includes(item.id)}
            isSaved={savedPosts.includes(item.id)}
            onLike={() => toggleLikePost(item.id)}
            onDislike={() => toggleDislikePost(item.id)}
            onSave={() => toggleSavePost(item.id)}
            onShare={() => handleShare(item)}
            screenH={containerH}
            relatedGroup={getRelatedGroup(item)}
            onGoGroup={goGroup}
            onGoAuthor={() => { if (item.authorId) router.push(`/user-profile/${item.authorId}` as any); }}
            isFollowingAuthor={!!(myId && item.authorId && isFollowing(myId, item.authorId))}
            isSelf={!!(myId && item.authorId && myId === item.authorId)}
            onToggleFollow={() => {
              if (!myId || !item.authorId) return;
              if (isFollowing(myId, item.authorId)) unfollow(myId, item.authorId);
              else follow(myId, item.authorId);
            }}
          />
        )}
      />

      <View style={styles.header} pointerEvents="box-none">
        <TouchableOpacity onPress={goBack} style={styles.headerBtn}>
          <MaterialCommunityIcons name="chevron-left" size={34} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn}>
            <MaterialCommunityIcons name="magnify" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <MaterialCommunityIcons name="account-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingHorizontal: 4, paddingBottom: 8,
  },
  headerBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20 },
  headerRight: { flexDirection: 'row' },
  noVideo: { alignItems: 'center', justifyContent: 'center' },
  rightBar: { position: 'absolute', right: 12, gap: 22, alignItems: 'center' },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 11, color: '#fff', fontWeight: '700', textAlign: 'center' },
  bottomContent: { position: 'absolute', left: 14, right: 76, gap: 6 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  authorTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarText: { fontSize: 15, fontWeight: '800' },
  authorName: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  followBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 1.5 },
  followText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  postTitle: { fontSize: 14, fontWeight: '700', color: '#fff', lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  postContent: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  groupBanner: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: BANNER_H,
    backgroundColor: 'rgba(20,20,20,0.85)',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  groupBannerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groupBannerAvatarText: { fontSize: 15, fontWeight: '800' },
  groupBannerInfo: { flex: 1 },
  groupBannerName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  groupBannerMeta: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  groupBannerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, flexShrink: 0 },
  groupBannerBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  empty: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 16, color: '#888', fontWeight: '600' },
  emptyBack: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#222' },
  emptyBackText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
