import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Image,
} from 'react-native';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import {
  FeedCat, GroupCat, CAT_COLOR, GROUP_CAT_COLOR,
  FEED_CATS, GROUP_CATS,
} from '../../data/community';
import { useCommunityStore } from '../../store/communityStore';
import { Post, Group } from '../../data/community';

const GYM = '#2DD4BF';

type Tab = '피드' | '모임' | '스토리';

function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const catColor = CAT_COLOR[post.category] ?? '#888';

  return (
    <TouchableOpacity style={styles.postCard} activeOpacity={0.82} onPress={onPress}>
      <View style={styles.authorRow}>
        <View style={styles.authorTouchArea}>
          <View style={styles.authorAvatar}>
            {post.authorAvatar
              ? <Image source={{ uri: post.authorAvatar }} style={styles.authorAvatarImg} />
              : <Text style={styles.authorAvatarText}>{post.author[0]}</Text>}
          </View>
          <Text style={styles.authorName}>{post.author}</Text>
        </View>
      </View>
      <View style={styles.postMain}>
        <View style={styles.postBody}>
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
          <Text style={styles.postContent} numberOfLines={2}>{post.content}</Text>
          <View style={styles.postMeta}>
            <Text style={styles.metaLocation}>{post.location}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaTime}>{post.timeAgo}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaViews}>조회 {post.views.toLocaleString()}</Text>
            <View style={styles.metaSpacer} />
            <MaterialCommunityIcons name="heart-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.metaNum}>{post.likes}</Text>
            <MaterialCommunityIcons name="comment-outline" size={12} color={COLORS.textSecondary} style={{ marginLeft: 8 }} />
            <Text style={styles.metaNum}>{post.comments}</Text>
          </View>
        </View>
        {post.imageUrl && (
          <View style={styles.thumbWrap}>
            <Image source={{ uri: post.imageUrl }} style={styles.thumb} />
            {post.isVideo && (
              <View style={styles.playOverlay}>
                <MaterialCommunityIcons name="play" size={20} color="#fff" />
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function GroupCard({ group, isJoined, onPress }: { group: Group; isJoined: boolean; onPress: () => void }) {
  const catColor = GROUP_CAT_COLOR[group.category] ?? '#888';
  return (
    <TouchableOpacity style={styles.groupCard} activeOpacity={0.82} onPress={onPress}>
      <Image source={{ uri: group.imageUrl }} style={styles.groupImg} />
      <View style={styles.groupBody}>
        <View style={[styles.catBadge, { backgroundColor: catColor + '18', alignSelf: 'flex-start' }]}>
          <Text style={[styles.catText, { color: catColor }]}>{group.category}</Text>
        </View>
        <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
        <Text style={styles.groupDesc} numberOfLines={2}>{group.description}</Text>
        <View style={styles.groupMeta}>
          <MaterialCommunityIcons name="map-marker-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.groupLoc}>{group.location}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.groupMemberText}>{group.memberCount}명</Text>
          <View style={[
            styles.recruitBadge,
            { backgroundColor: group.isRecruiting ? '#E8F5E9' : '#F5F5F5' },
          ]}>
            <Text style={[
              styles.recruitText,
              { color: group.isRecruiting ? '#2E7D32' : COLORS.textSecondary },
            ]}>
              {group.isRecruiting ? '모집 중' : '마감'}
            </Text>
          </View>
          {isJoined && (
            <View style={styles.joinedBadge}>
              <Text style={styles.joinedText}>참여 중</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MemberCommunityScreen() {
  const router = useRouter();
  const { from } = useGlobalSearchParams<{ from?: string }>();
  const scrollRef = useRef<any>(null);
  useScrollToTop(scrollRef);
  const { posts, groups, joinedGroups, dislikedPosts } = useCommunityStore();

  const [activeTab, setActiveTab] = useState<Tab>('피드');
  const [feedCat, setFeedCat] = useState<FeedCat>('전체');
  const [groupCat, setGroupCat] = useState<GroupCat>('전체');

  const filteredPosts = useMemo(() => {
    if (feedCat === '전체') return posts;
    return posts.filter((p) => p.category === feedCat);
  }, [posts, feedCat]);

  const filteredGroups = useMemo(() => {
    if (groupCat === '전체') return groups;
    return groups.filter((g) => g.category === groupCat);
  }, [groups, groupCat]);

  const videoPosts = useMemo(
    () => posts.filter((p) => p.isVideo && !dislikedPosts.includes(p.id)),
    [posts, dislikedPosts],
  );

  const goPost = (postId: string) =>
    router.push({ pathname: '/(member)/community-post', params: { postId, ...(from ? { from } : {}) } } as any);
  const goGroup = (groupId: string) =>
    router.push({ pathname: '/(member)/community-group', params: { groupId, ...(from ? { from } : {}) } } as any);
  const goWrite = () =>
    router.push({ pathname: '/(member)/community-write', params: { t: String(Date.now()), ...(from ? { from } : {}) } } as any);
  const goGroupWrite = () =>
    router.push({ pathname: '/(member)/community-group-write', params: { t: String(Date.now()), ...(from ? { from } : {}) } } as any);
  const goStory = (postId: string) =>
    router.push({ pathname: '/(member)/community-story', params: { postId, ...(from ? { from } : {}) } } as any);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        {(['피드', '모임', '스토리'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === '피드' && (
        <View style={styles.flex1}>
          <View style={styles.chipWrap}>
            <FlatList
              data={FEED_CATS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c) => c}
              contentContainerStyle={styles.chipRow}
              renderItem={({ item: cat }) => (
                <TouchableOpacity
                  style={[styles.chip, feedCat === cat && styles.chipActive]}
                  onPress={() => setFeedCat(cat)}
                >
                  <Text style={[styles.chipText, feedCat === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
          <FlatList
            ref={scrollRef}
            data={filteredPosts}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <PostCard post={item} onPress={() => goPost(item.id)} />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.empty}><Text style={styles.emptyText}>게시글이 없습니다</Text></View>
            }
          />
        </View>
      )}

      {activeTab === '모임' && (
        <View style={styles.flex1}>
          <View style={styles.chipWrap}>
            <FlatList
              data={GROUP_CATS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c) => c}
              contentContainerStyle={styles.chipRow}
              renderItem={({ item: cat }) => (
                <TouchableOpacity
                  style={[styles.chip, groupCat === cat && styles.chipActive]}
                  onPress={() => setGroupCat(cat)}
                >
                  <Text style={[styles.chipText, groupCat === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
          <FlatList
            ref={scrollRef}
            data={filteredGroups}
            keyExtractor={(g) => g.id}
            renderItem={({ item }) => (
              <GroupCard
                group={item}
                isJoined={joinedGroups.includes(item.id)}
                onPress={() => goGroup(item.id)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.empty}><Text style={styles.emptyText}>모임이 없습니다</Text></View>
            }
          />
        </View>
      )}

      {activeTab === '스토리' && (
        <View style={styles.flex1}>
          <FlatList
            ref={scrollRef}
            data={videoPosts}
            numColumns={2}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <View style={styles.storyCard}>
                <TouchableOpacity activeOpacity={0.88} onPress={() => goStory(item.id)}>
                  <View style={styles.storyThumb}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.storyThumbImg} resizeMode="cover" />
                    ) : (
                      <View style={styles.storyThumbNoImg}>
                        <MaterialCommunityIcons name="video" size={34} color="rgba(255,255,255,0.6)" />
                      </View>
                    )}
                    <View style={styles.storyPlayOverlay}>
                      <MaterialCommunityIcons name="play-circle" size={38} color="rgba(255,255,255,0.9)" />
                    </View>
                    <View style={styles.storyViewBadge}>
                      <MaterialCommunityIcons name="eye-outline" size={10} color="#fff" />
                      <Text style={styles.storyViewText}>
                        {item.views >= 1000 ? `${(item.views / 1000).toFixed(1)}k` : item.views}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.storyInfo}>
                  <Text style={styles.storyTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.storyAuthorRow}>
                    <TouchableOpacity
                      style={styles.storyAuthorTouch}
                      onPress={() => item.authorId && router.push(`/user-profile/${item.authorId}` as any)}
                      activeOpacity={item.authorId ? 0.7 : 1}
                    >
                      <View style={styles.storyAvatar}>
                        <Text style={styles.storyAvatarText}>{item.author[0]}</Text>
                      </View>
                      <Text style={styles.storyAuthorName} numberOfLines={1}>{item.author}</Text>
                    </TouchableOpacity>
                    <Text style={styles.storyLikes}> · ❤️ {item.likes}</Text>
                  </View>
                </View>
              </View>
            )}
            columnWrapperStyle={styles.storyRow}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 6, paddingTop: 6 }}
            ListEmptyComponent={
              <View style={styles.storyEmpty}>
                <MaterialCommunityIcons name="video-off-outline" size={52} color={COLORS.border} />
                <Text style={styles.storyEmptyText}>아직 스토리 영상이 없어요</Text>
                <Text style={styles.storyEmptySub}>피드에 쇼츠를 올리면 여기에 표시됩니다</Text>
              </View>
            }
          />
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={activeTab === '모임' ? goGroupWrite : goWrite}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons
          name={activeTab === '스토리' ? 'video-plus' : 'plus'}
          size={20} color="#fff"
        />
        <Text style={styles.fabText}>
          {activeTab === '모임' ? '모임 만들기' : activeTab === '스토리' ? '영상 올리기' : '글쓰기'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex1: { flex: 1 },

  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
  tabText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: GYM, fontWeight: '800' },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: '15%', right: '15%',
    height: 2, backgroundColor: GYM, borderRadius: 1,
  },

  chipWrap: {
    height: 56, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    overflow: 'hidden',
  },
  chipRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 56, paddingHorizontal: 14, gap: 8,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: GYM, borderColor: GYM },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  authorRow: { marginBottom: 10 },
  authorTouchArea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: GYM + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  authorAvatarText: { fontSize: 12, fontWeight: '800', color: GYM },
  authorAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  authorName: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },

  postCard: { backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 14 },
  postMain: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  postBody: { flex: 1, gap: 4 },
  postCatRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catText: { fontSize: 11, fontWeight: '700' },
  videoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    backgroundColor: '#FF2D5518',
  },
  videoText: { fontSize: 11, fontWeight: '700', color: '#FF2D55' },
  postTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 21 },
  postContent: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaLocation: { fontSize: 11, color: COLORS.textSecondary },
  metaTime: { fontSize: 11, color: COLORS.textSecondary },
  metaViews: { fontSize: 11, color: COLORS.textSecondary },
  metaDot: { fontSize: 11, color: COLORS.border },
  metaSpacer: { flex: 1 },
  metaNum: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 2 },
  thumbWrap: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  playOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },

  groupCard: {
    backgroundColor: COLORS.surface, flexDirection: 'row',
    paddingHorizontal: 16, paddingVertical: 14, gap: 14, alignItems: 'flex-start',
  },
  groupImg: { width: 72, height: 72, borderRadius: 12, backgroundColor: COLORS.border },
  groupBody: { flex: 1, gap: 4 },
  groupName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  groupDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  groupLoc: { fontSize: 12, color: COLORS.textSecondary },
  groupMemberText: { fontSize: 12, color: COLORS.textSecondary },
  recruitBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 4 },
  recruitText: { fontSize: 11, fontWeight: '700' },
  joinedBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 4,
    backgroundColor: GYM + '18',
  },
  joinedText: { fontSize: 11, fontWeight: '700', color: GYM },

  storyRow: { gap: 6 },
  storyCard: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: 12, overflow: 'hidden', margin: 3,
  },
  storyThumb: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#111', position: 'relative' },
  storyThumbImg: { width: '100%', height: '100%' },
  storyThumbNoImg: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  storyPlayOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  storyViewBadge: {
    position: 'absolute', bottom: 6, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
  },
  storyViewText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  storyInfo: { padding: 8, gap: 4 },
  storyTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text, lineHeight: 17 },
  storyAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storyAuthorTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  storyAvatar: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: GYM + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  storyAvatarText: { fontSize: 9, fontWeight: '800', color: GYM },
  storyAuthorName: { flex: 1, fontSize: 11, color: COLORS.textSecondary },
  storyLikes: { fontSize: 11, color: COLORS.textSecondary },
  storyEmpty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  storyEmptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  storyEmptySub: {
    fontSize: 13, color: COLORS.textSecondary, textAlign: 'center',
    paddingHorizontal: 40, lineHeight: 20,
  },

  separator: { height: 1, backgroundColor: COLORS.border },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },

  fab: {
    position: 'absolute', bottom: 24, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: GYM,
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 6, elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
