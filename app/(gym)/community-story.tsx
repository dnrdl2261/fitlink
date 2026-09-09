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

const ACCENT = COLORS.gym;

function StoryItem({
  post, isActive, isLiked, isSaved,
  onLike, onSave, onShare,
  screenH,
  onGoAuthor, isFollowingAuthor, isSelf, onToggleFollow,
}: {
  post: Post; isActive: boolean;
  isLiked: boolean; isSaved: boolean;
  onLike: () => void;
  onSave: () => void; onShare: () => void;
  screenH: number;
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

      <View style={[styles.rightBar, { bottom: 28 }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike} activeOpacity={0.8}>
          <MaterialCommunityIcons
            name={isLiked ? 'thumb-up' : 'thumb-up-outline'}
            size={30} color={isLiked ? ACCENT : '#fff'}
          />
          <Text style={styles.actionLabel}>{post.likes}</Text>
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

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="더보기">
          <MaterialCommunityIcons name="dots-vertical" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomContent, { bottom: 24 }]}>
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

    </View>
  );
}

export default function GymCommunityStoryScreen() {
  const { postId, from } = useLocalSearchParams<{ postId: string; from?: string }>();
  const router = useRouter();
  const { gymAdmin } = useAuthStore();
  const { isFollowing, follow, unfollow } = useFollowStore();
  const myId = gymAdmin?.id ?? '';
  const {
    posts, groups, likedPosts, savedPosts,
    toggleLikePost, toggleSavePost, incrementViews,
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

  // initialIndex가 0이 아닐 때 정확한 위치로 스크롤 보장
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

  const handleShare = useCallback((post: Post) => {
    if (Platform.OS === 'web') alert(`"${post.title}" 링크가 복사됩니다.`);
  }, []);

  const goBack = () => router.navigate({ pathname: '/(gym)/community', params: from ? { from } : {} } as any);

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
            isSaved={savedPosts.includes(item.id)}
            onLike={() => toggleLikePost(item.id)}
            onSave={() => toggleSavePost(item.id)}
            onShare={() => handleShare(item)}
            screenH={containerH}
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
        <TouchableOpacity onPress={goBack} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="뒤로 가기">
          <MaterialCommunityIcons name="chevron-left" size={34} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingHorizontal: 4, paddingBottom: 8,
  },
  headerBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20 },
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
  empty: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 16, color: '#888', fontWeight: '600' },
  emptyBack: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#222' },
  emptyBackText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
