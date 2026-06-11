import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { useCommunityStore } from '../../store/communityStore';
import { useFollowStore } from '../../store/followStore';
import { useAuthStore } from '../../store/authStore';
import { MOCK_TRAINERS } from '../../data/trainers';
import { MOCK_MEMBER, MOCK_GYM_ADMINS } from '../../data/users';
import { Post, CAT_COLOR } from '../../data/community';

interface UserInfo {
  name: string;
  avatar?: string;
  bio?: string;
  role: 'member' | 'trainer' | 'gym_admin' | 'unknown';
  location?: string;
}

const ROLE_LABEL: Record<string, string> = {
  member: '회원',
  trainer: '트레이너',
  gym_admin: '헬스장 관리자',
};

function resolveUser(userId: string, fallbackName?: string): UserInfo {
  const trainer = MOCK_TRAINERS.find((t) => t.id === userId);
  if (trainer) {
    return {
      name: trainer.name,
      avatar: trainer.profileImageUrl,
      bio: trainer.tagline,
      role: 'trainer',
      location: trainer.address
        ? `${trainer.address.city} ${trainer.address.district}`
        : undefined,
    };
  }
  if (MOCK_MEMBER.id === userId) {
    return {
      name: MOCK_MEMBER.name,
      avatar: MOCK_MEMBER.profileImageUrl,
      bio: '피트니스를 즐기는 회원입니다',
      role: 'member',
    };
  }
  const admin = MOCK_GYM_ADMINS.find((a) => a.id === userId);
  if (admin) {
    return { name: admin.name, bio: '헬스장 관리자', role: 'gym_admin' };
  }
  return { name: fallbackName ?? userId, role: 'unknown' };
}

function PostItem({ post, onPress }: { post: Post; onPress: () => void }) {
  const catColor = CAT_COLOR[post.category] ?? '#888';
  return (
    <TouchableOpacity style={styles.postCard} activeOpacity={0.82} onPress={onPress}>
      <View style={styles.postCatRow}>
        <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
          <Text style={[styles.catText, { color: catColor }]}>{post.category}</Text>
        </View>
        {post.isVideo && (
          <View style={styles.videoBadge}>
            <MaterialCommunityIcons name="play-circle" size={13} color="#FF2D55" />
            <Text style={styles.videoText}>영상</Text>
          </View>
        )}
      </View>
      <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
      <Text style={styles.postSnippet} numberOfLines={2}>{post.content}</Text>
      <View style={styles.postMeta}>
        <Text style={styles.metaTime}>{post.timeAgo}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaViews}>조회 {post.views.toLocaleString()}</Text>
        <View style={styles.metaSpacer} />
        <MaterialCommunityIcons name="heart-outline" size={12} color={COLORS.textSecondary} />
        <Text style={styles.metaNum}>{post.likes}</Text>
        <MaterialCommunityIcons
          name="comment-outline" size={12} color={COLORS.textSecondary}
          style={{ marginLeft: 8 }}
        />
        <Text style={styles.metaNum}>{post.comments}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function UserProfileScreen() {
  const rawId = useLocalSearchParams().userId;
  const userId = Array.isArray(rawId) ? rawId[0] : (rawId ?? '');
  const router = useRouter();

  const { posts } = useCommunityStore();
  const { links, follow, unfollow } = useFollowStore();
  const { member, trainer, gymAdmin, role } = useAuthStore();

  const myId = useMemo(() => {
    if (role === 'member') return member?.id ?? '';
    if (role === 'trainer') return trainer?.id ?? '';
    return gymAdmin?.id ?? '';
  }, [role, member, trainer, gymAdmin]);

  const userPosts = useMemo(
    () => posts.filter((p) => p.authorId === userId),
    [posts, userId],
  );

  const userInfo = useMemo(
    () => resolveUser(userId, userPosts[0]?.author),
    [userId, userPosts],
  );

  const followerCount = links.filter(l => l.followeeId === userId).length;
  const followingCount = links.filter(l => l.followerId === userId).length;
  const isSelf = !!myId && userId === myId;
  const following = !isSelf && !!myId && links.some(l => l.followerId === myId && l.followeeId === userId);

  const imagePosts = useMemo(() => userPosts.filter((p) => !!p.imageUrl), [userPosts]);
  const textPosts = useMemo(() => userPosts.filter((p) => !p.imageUrl), [userPosts]);

  const goPost = (postId: string) => {
    if (role === 'trainer') router.push(`/(trainer)/community-post?postId=${postId}` as any);
    else if (role === 'gym_admin') router.push(`/(gym)/community-post?postId=${postId}` as any);
    else router.push(`/(member)/community-post?postId=${postId}` as any);
  };

  const handleFollow = () => {
    if (!myId || isSelf) return;
    if (following) unfollow(myId, userId);
    else follow(myId, userId);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{userInfo.name}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Profile section */}
        <View style={styles.profileSection}>
          {/* Avatar + Stats */}
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrap}>
              {userInfo.avatar ? (
                <Image source={{ uri: userInfo.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {userInfo.name[0] ?? '?'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.statsWrap}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{userPosts.length}</Text>
                <Text style={styles.statLabel}>게시글</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{followerCount}</Text>
                <Text style={styles.statLabel}>팔로워</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{followingCount}</Text>
                <Text style={styles.statLabel}>팔로잉</Text>
              </View>
            </View>
          </View>

          {/* Info */}
          <Text style={styles.profileName}>{userInfo.name}</Text>
          {userInfo.role !== 'unknown' && (
            <Text style={styles.profileRoleTag}>{ROLE_LABEL[userInfo.role]}</Text>
          )}
          {!!userInfo.bio && <Text style={styles.profileBio}>{userInfo.bio}</Text>}
          {!!userInfo.location && (
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={13} color={COLORS.textSecondary} />
              <Text style={styles.locationText}>{userInfo.location}</Text>
            </View>
          )}

          {/* Follow button */}
          {!isSelf && !!myId && (
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followingBtn]}
              onPress={handleFollow}
              activeOpacity={0.8}
            >
              <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                {following ? '팔로잉' : '팔로우'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Image grid */}
        {imagePosts.length > 0 && (
          <>
            <View style={styles.sectionDivider} />
            <View style={styles.gridWrap}>
              {imagePosts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridCell}
                  activeOpacity={0.85}
                  onPress={() => goPost(post.id)}
                >
                  <Image
                    source={{ uri: post.imageUrl }}
                    style={styles.gridImg}
                    resizeMode="cover"
                  />
                  {post.isVideo && (
                    <View style={styles.gridPlayBadge}>
                      <MaterialCommunityIcons name="play" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Text posts */}
        {textPosts.length > 0 && (
          <>
            <View style={styles.sectionDivider} />
            {textPosts.map((post, idx) => (
              <View key={post.id}>
                <PostItem post={post} onPress={() => goPost(post.id)} />
                {idx < textPosts.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </>
        )}

        {/* Empty state */}
        {userPosts.length === 0 && (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="post-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>아직 게시글이 없어요</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  headerBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '700', color: COLORS.text,
    marginHorizontal: 8,
  },
  headerPlaceholder: { width: 32 },

  profileSection: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20,
  },

  profileTopRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  avatarWrap: { marginRight: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 32, fontWeight: '800', color: COLORS.primary },

  statsWrap: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },

  profileName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  profileRoleTag: {
    marginTop: 2, fontSize: 12, fontWeight: '600',
    color: COLORS.primary,
  },
  profileBio: {
    marginTop: 4, fontSize: 14, color: COLORS.text, lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4,
  },
  locationText: { fontSize: 13, color: COLORS.textSecondary },

  followBtn: {
    marginTop: 14, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', backgroundColor: COLORS.background,
  },
  followingBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  followBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  followingBtnText: { color: '#fff' },

  sectionDivider: { height: 8, backgroundColor: COLORS.surfaceElevated },

  gridWrap: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  gridCell: {
    width: '33.333%', aspectRatio: 1,
    borderWidth: 1, borderColor: COLORS.background,
    position: 'relative',
  },
  gridImg: { width: '100%', height: '100%' },
  gridPlayBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10, padding: 3,
  },

  separator: { height: 1, backgroundColor: COLORS.border },

  postCard: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  postCatRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 6 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catText: { fontSize: 11, fontWeight: '700' },
  videoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    backgroundColor: '#FF2D5518',
  },
  videoText: { fontSize: 11, fontWeight: '700', color: '#FF2D55' },
  postTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 21 },
  postSnippet: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginTop: 2 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaTime: { fontSize: 11, color: COLORS.textSecondary },
  metaViews: { fontSize: 11, color: COLORS.textSecondary },
  metaDot: { fontSize: 11, color: COLORS.border },
  metaSpacer: { flex: 1 },
  metaNum: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 2 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
