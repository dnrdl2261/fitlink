import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Image, Share, Platform, TextInput, Animated,
} from 'react-native';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { GROUP_CAT_COLOR, likersOfPost } from '../../data/community';
import { useCommunityStore } from '../../store/communityStore';
import { useBlockedIds } from '../../hooks/useBlockedIds';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { useAuthStore } from '../../store/authStore';
import VideoPlayer from '../../components/VideoPlayer';
import { Post, Group } from '../../data/community';

// 상단 고정 영역 높이. 스크롤로 숨길 만큼 위로 밀어야 해서 상수로 잡는다.
const TAG_BAR_H = 40;  // 해시태그 모아보기 줄

type Tab = '피드' | '모임' | '스토리';

function PostCard({ post, isVisible, onPress, onComment, onLikes, onTag }: { post: Post; isVisible: boolean; onPress: () => void; onComment: () => void; onLikes: () => void; onTag: (tag: string) => void }) {
  const likedPosts = useCommunityStore((s) => s.likedPosts);
  const toggleLikePost = useCommunityStore((s) => s.toggleLikePost);
  const liked = likedPosts.includes(post.id);
  const [expanded, setExpanded] = useState(false);
  // 2줄을 넘길 만한 길이일 때만 '더보기'를 띄운다 (웹에서는 실제 줄 수 측정이 불안정)
  const needsMore = post.title.length + post.content.length > 45;

  const handleShare = async () => {
    const url = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/community-post?postId=${post.id}`
      : '';
    try {
      if (Platform.OS === 'web') {
        const nav: any = typeof navigator !== 'undefined' ? navigator : null;
        if (nav?.share) { await nav.share({ title: post.title, url }); return; }
        if (nav?.clipboard) { await nav.clipboard.writeText(url); window.alert('링크가 복사되었습니다.'); }
        return;
      }
      await Share.share({ message: `${post.title}\n${url}` });
    } catch {
      // 사용자가 공유를 취소한 경우
    }
  };

  return (
    <TouchableOpacity style={styles.postCard} activeOpacity={0.95} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.authorAvatar}>
          {post.authorAvatar
            ? <Image source={{ uri: post.authorAvatar }} style={styles.authorAvatarImg} />
            : <Text style={styles.authorAvatarText}>{post.author[0]}</Text>}
        </View>
        <Text style={styles.authorName} numberOfLines={1}>{post.author}</Text>
      </View>

      {post.imageUrl && (
        <View style={styles.media}>
          {post.isVideo && post.videoUrl
            ? <VideoPlayer uri={post.videoUrl} isPlaying={isVisible} muted />
            : <Image source={{ uri: post.imageUrl }} style={styles.mediaImg} resizeMode="cover" />}
          {post.isVideo && (
            <View style={styles.muteBadge}>
              <MaterialCommunityIcons name="volume-off" size={14} color="#fff" />
            </View>
          )}
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => toggleLikePost(post.id)}
          accessibilityRole="button"
          accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}
        >
          <MaterialCommunityIcons
            name={liked ? 'heart' : 'heart-outline'}
            size={24}
            color={liked ? '#FF3040' : COLORS.text}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onComment} accessibilityRole="button" accessibilityLabel="댓글">
          <MaterialCommunityIcons name="comment-outline" size={23} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare} accessibilityRole="button" accessibilityLabel="공유">
          <MaterialCommunityIcons name="share-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onLikes}
        accessibilityRole="button"
        accessibilityLabel={`좋아요 ${post.likes}개, 누른 사람 보기`}
      >
        <Text style={styles.likeCount}>좋아요 {post.likes.toLocaleString()}개</Text>
      </TouchableOpacity>

      <Text style={styles.contentText} numberOfLines={expanded ? undefined : 2}>
        <Text style={styles.contentAuthor}>{post.author} </Text>
        {post.title ? `${post.title} · ` : ''}{post.content}
      </Text>
      {needsMore && !expanded && (
        <TouchableOpacity onPress={() => setExpanded(true)} accessibilityRole="button" accessibilityLabel="본문 더보기">
          <Text style={styles.moreText}>더보기</Text>
        </TouchableOpacity>
      )}

      {post.hashtags.length > 0 && (
        <View style={styles.tagRow}>
          {post.hashtags.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => onTag(tag)}
              accessibilityRole="button"
              accessibilityLabel={`#${tag} 태그 글 모아보기`}
            >
              <Text style={styles.tagText}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {post.comments > 0 && (
        <TouchableOpacity onPress={onComment} accessibilityRole="button" accessibilityLabel={`댓글 ${post.comments}개 모두 보기`}>
          <Text style={styles.commentLink}>댓글 {post.comments}개 모두 보기</Text>
        </TouchableOpacity>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{post.location}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>{post.timeAgo}</Text>
      </View>
    </TouchableOpacity>
  );
}

function LikeSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const likedPosts = useCommunityStore((s) => s.likedPosts);
  const { gymAdmin } = useAuthStore();
  const iLiked = likedPosts.includes(post.id);

  // 내가 누른 좋아요는 항상 맨 위. 나머지는 목업 명단에서 채운다.
  const others = likersOfPost(post.id, post.likes - (iLiked ? 1 : 0));
  const names = iLiked ? [gymAdmin?.name ?? '나', ...others] : others;
  const rest = Math.max(0, post.likes - names.length);

  return (
    <View style={styles.sheetBackdrop}>
      <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>좋아요 {post.likes.toLocaleString()}개</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="좋아요 목록 닫기">
            <MaterialCommunityIcons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={names}
          keyExtractor={(n, i) => `${n}_${i}`}
          contentContainerStyle={styles.sheetList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: name, index }) => (
            <View style={styles.likerRow}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentInitial}>{name[0]}</Text>
              </View>
              <Text style={styles.likerName} numberOfLines={1}>{name}</Text>
              {iLiked && index === 0 && <Text style={styles.likerMe}>나</Text>}
            </View>
          )}
          ListFooterComponent={
            rest > 0
              ? <Text style={styles.likerMore}>외 {rest.toLocaleString()}명</Text>
              : null
          }
          ListEmptyComponent={
            <View style={styles.noComment}>
              <Text style={styles.noCommentText}>아직 좋아요가 없습니다</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

function CommentSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const comments = useCommunityStore((s) => s.comments);
  const addComment = useCommunityStore((s) => s.addComment);
  const { gymAdmin } = useAuthStore();
  const [text, setText] = useState('');
  const blockedIds = useBlockedIds();
  const list = useMemo(
    () => comments.filter((c) => c.postId === postId && !(c.authorId && blockedIds.includes(c.authorId))),
    [comments, postId, blockedIds],
  );

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    addComment(postId, t, gymAdmin?.name ?? '익명', gymAdmin?.profileImageUrl, gymAdmin?.id);
    setText('');
  };

  return (
    <View style={styles.sheetBackdrop}>
      <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>댓글 {list.length}개</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="댓글 닫기">
            <MaterialCommunityIcons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={list}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.sheetList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: c }) => (
            <View style={styles.commentItem}>
              <View style={styles.commentAvatar}>
                {c.authorAvatar
                  ? <Image source={{ uri: c.authorAvatar }} style={styles.commentAvatarImg} />
                  : <Text style={styles.commentInitial}>{c.author[0]}</Text>}
              </View>
              <View style={styles.commentBody}>
                <View style={styles.commentTop}>
                  <Text style={styles.commentAuthor}>{c.author}</Text>
                  <Text style={styles.commentTime}>{c.timeAgo}</Text>
                </View>
                <Text style={styles.commentContent}>{c.content}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.noComment}>
              <Text style={styles.noCommentText}>첫 번째 댓글을 남겨보세요!</Text>
            </View>
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글을 입력하세요"
            placeholderTextColor={COLORS.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={submit}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel="댓글 등록"
          >
            <Text style={styles.sendText}>등록</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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

export default function GymCommunityScreen() {
  const router = useRouter();
  const { from, tag, t } = useGlobalSearchParams<{ from?: string; tag?: string; t?: string }>();
  const scrollRef = useRef<any>(null);
  useScrollToTop(scrollRef);
  const { posts, groups, joinedGroups } = useCommunityStore();

  const [activeTab, setActiveTab] = useState<Tab>('피드');
  // 해시태그 모아보기. 다른 화면에서 태그를 누르면 tag 파라미터로 들어온다(t는 같은 태그 재진입용).
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  // 스크롤 중에 태그를 눌러도 필터 줄이 바로 보이도록 목록을 맨 위로 올린다
  const applyTag = (next: string | null) => {
    setTagFilter(next);
    scrollRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  };
  useEffect(() => {
    if (tag) { applyTag(tag); setActiveTab('피드'); }
  }, [tag, t]);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [likePost, setLikePost] = useState<Post | null>(null);

  // onViewableItemsChanged는 렌더마다 새 함수를 주면 RN이 오류를 내므로 ref로 고정
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    setVisibleIds(viewableItems.map((v: any) => v.item.id));
  });
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  const blockedIds = useBlockedIds();

  const headerH = tagFilter ? TAG_BAR_H : 0;
  const { translateY, onScroll } = useHideOnScroll(headerH);

  const filteredPosts = useMemo(() => {
    const visible = blockedIds.length
      ? posts.filter((p) => !p.authorId || !blockedIds.includes(p.authorId))
      : posts;
    return tagFilter ? visible.filter((p) => p.hashtags.includes(tagFilter)) : visible;
  }, [posts, blockedIds, tagFilter]);

  const videoPosts = useMemo(() => posts.filter((p) => p.isVideo), [posts]);

  const goPost = (postId: string) =>
    router.push({ pathname: '/(gym)/community-post', params: { postId, ...(from ? { from } : {}) } } as any);
  const goGroup = (groupId: string) =>
    router.push({ pathname: '/(gym)/community-group', params: { groupId, ...(from ? { from } : {}) } } as any);
  const goWrite = () =>
    router.push({ pathname: '/(gym)/community-write', params: { t: String(Date.now()), ...(from ? { from } : {}) } } as any);
  const goGroupWrite = () =>
    router.push({ pathname: '/(gym)/community-group-write', params: { t: String(Date.now()), ...(from ? { from } : {}) } } as any);
  // 영상 올리기는 글쓰기 화면을 동영상 모드로 연다
  const goVideoWrite = () =>
    router.push({ pathname: '/(gym)/community-write', params: { t: String(Date.now()), mode: 'video', ...(from ? { from } : {}) } } as any);
  const goStory = (postId: string) =>
    router.push({ pathname: '/(gym)/community-story', params: { postId, ...(from ? { from } : {}) } } as any);
  // 커뮤니티 홈 = 피드 탭 맨 위(해시태그 필터도 푼다)
  const goHome = () => { setActiveTab('피드'); applyTag(null); };
  const goVideoTab = () => { setActiveTab('스토리'); setTagFilter(null); };
  const goGroupTab = () => { setActiveTab('모임'); setTagFilter(null); };
  const goSearch = () =>
    router.push({ pathname: '/(gym)/community-search', params: { ...(from ? { from } : {}) } } as any);

  // 우하단 작성 버튼은 현재 탭에 맞는 글쓰기 화면으로 간다
  const [fabLabel, fabIcon, fabAction] = ({
    '피드': ['글쓰기', 'square-edit-outline', goWrite],
    '모임': ['모임 만들기', 'calendar-plus', goGroupWrite],
    '스토리': ['영상 올리기', 'video-plus-outline', goVideoWrite],
  } as const)[activeTab];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.stickyHeader, { transform: [{ translateY }] }]}>
        {tagFilter && (
          <View style={styles.tagBar}>
            <Text style={styles.tagBarText} numberOfLines={1}>#{tagFilter}</Text>
            <Text style={styles.tagBarCount}>글 {filteredPosts.length}개</Text>
            <TouchableOpacity
              onPress={() => applyTag(null)}
              accessibilityRole="button"
              accessibilityLabel="해시태그 모아보기 해제"
            >
              <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {activeTab === '피드' && (
        <FlatList
          style={styles.flex1}
          ref={scrollRef}
          data={filteredPosts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              isVisible={visibleIds.includes(item.id)}
              // 영상 글은 게시글 상세 대신 전체화면 뷰어로 연다.
              // 댓글은 카드의 댓글 버튼이 시트로 띄우므로 여기서 잃는 건 없다.
              onPress={() => (item.isVideo ? goStory(item.id) : goPost(item.id))}
              onComment={() => setCommentPostId(item.id)}
              onLikes={() => setLikePost(item)}
              onTag={applyTag}
            />
          )}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: headerH, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}><Text style={styles.emptyText}>게시글이 없습니다</Text></View>
          }
        />
      )}

      {activeTab === '모임' && (
        <FlatList
          style={styles.flex1}
          ref={scrollRef}
          data={groups}
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
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: headerH, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}><Text style={styles.emptyText}>모임이 없습니다</Text></View>
          }
        />
      )}

      {activeTab === '스토리' && (
        <View style={styles.flex1}>
          <FlatList
            ref={scrollRef}
            data={videoPosts}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <View style={styles.storyCard}>
                <TouchableOpacity activeOpacity={0.88} onPress={() => goStory(item.id)}>
                  <View style={styles.storyThumb}>
                    {item.videoUrl ? (
                      <VideoPlayer uri={item.videoUrl} isPlaying={visibleIds.includes(item.id)} muted />
                    ) : item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.storyThumbImg} resizeMode="cover" />
                    ) : (
                      <View style={styles.storyThumbNoImg}>
                        <MaterialCommunityIcons name="video" size={56} color="rgba(255,255,255,0.6)" />
                      </View>
                    )}
                    {item.videoUrl ? (
                      <View style={styles.muteBadge}>
                        <MaterialCommunityIcons name="volume-off" size={14} color="#fff" />
                      </View>
                    ) : (
                      <View style={styles.storyPlayOverlay}>
                        <MaterialCommunityIcons name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
                      </View>
                    )}
                    <View style={styles.storyViewBadge}>
                      <MaterialCommunityIcons name="eye-outline" size={13} color="#fff" />
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
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingTop: headerH, paddingBottom: 100 }}
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

      {/* 현재 탭에 맞는 작성 버튼 */}
      <TouchableOpacity
        style={styles.writeFab}
        onPress={fabAction}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={fabLabel}
      >
        <MaterialCommunityIcons name={fabIcon} size={26} color="#fff" />
      </TouchableOpacity>

      {/* 상단 탭바를 없앤 대신 이 바가 탭 전환까지 맡는다. tab이 null인 검색만 화면 이동. */}
      <View style={styles.actionBarWrap} pointerEvents="box-none">
        <View style={styles.actionBar}>
          {([
            ['홈', 'home-outline', goHome, '피드'],
            ['영상', 'play-box-outline', goVideoTab, '스토리'],
            ['모임', 'calendar-account-outline', goGroupTab, '모임'],
            ['검색', 'magnify', goSearch, null],
          ] as const).map(([label, icon, onPress, tab], i) => {
            const on = activeTab === tab;
            return (
              <React.Fragment key={label}>
                {i > 0 && <View style={styles.actionDivider} />}
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={onPress}
                  activeOpacity={0.8}
                  accessibilityRole={tab === null ? 'button' : 'tab'}
                  accessibilityLabel={label}
                  // RN-Web 0.21은 accessibilityState.selected를 aria-selected로 안 내보낸다
                  aria-selected={tab === null ? undefined : on}
                >
                  <MaterialCommunityIcons name={icon} size={19} color="#fff" />
                  <Text style={styles.actionText}>{label}</Text>
                  {on && <View style={styles.actionUnderline} />}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {commentPostId && (
        <CommentSheet postId={commentPostId} onClose={() => setCommentPostId(null)} />
      )}

      {likePost && (
        <LikeSheet post={likePost} onClose={() => setLikePost(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex1: { flex: 1 },

  // 목록 위에 떠 있다가 아래로 스크롤하면 위로 밀려 사라지는 영역
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: COLORS.surface,
  },

  authorAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2DD4BF' + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  authorAvatarText: { fontSize: 12, fontWeight: '800', color: '#2DD4BF' },
  authorAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  authorName: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },

  postCard: { backgroundColor: COLORS.surface },
  rank: { fontSize: 22, fontWeight: '900', color: COLORS.border, width: 28, textAlign: 'center', lineHeight: 28, marginTop: 2 },
  rankHot: { color: '#2DD4BF' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catText: { fontSize: 11, fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, marginTop: 2 },
  tagText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  tagBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: TAG_BAR_H, paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tagBarText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  tagBarCount: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  media: { width: '100%', aspectRatio: 1, backgroundColor: '#111', position: 'relative' },
  mediaImg: { width: '100%', height: '100%' },
  muteBadge: {
    position: 'absolute', bottom: 10, right: 10,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4,
  },
  actionBtn: { padding: 2 },
  likeCount: { fontSize: 13, fontWeight: '700', color: COLORS.text, paddingHorizontal: 14, paddingBottom: 4 },
  contentText: { fontSize: 13, color: COLORS.text, lineHeight: 19, paddingHorizontal: 14 },
  contentAuthor: { fontWeight: '700', color: COLORS.text },
  moreText: { fontSize: 13, color: COLORS.textSecondary, paddingHorizontal: 14, paddingTop: 2 },
  commentLink: { fontSize: 13, color: COLORS.textSecondary, paddingHorizontal: 14, paddingTop: 5 },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 12,
  },
  metaText: { fontSize: 11, color: COLORS.textSecondary },
  metaDot: { fontSize: 11, color: COLORS.border },

  // Modal(포털) 대신 화면 안에 덮는 레이어. Modal은 닫힐 때 포커스를 되돌리며
  // 목록 스크롤을 맨 위로 튀게 만든다.
  sheetBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
    zIndex: 50,
  },
  sheetDismiss: { flex: 1 },
  sheet: {
    maxHeight: '75%', backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sheetTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sheetList: { paddingHorizontal: 16, paddingBottom: 8 },
  noComment: { paddingVertical: 24, alignItems: 'center' },
  noCommentText: { fontSize: 14, color: COLORS.textSecondary },
  commentItem: {
    flexDirection: 'row', gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  commentInitial: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  commentAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  commentBody: { flex: 1, gap: 4 },
  commentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  commentTime: { fontSize: 11, color: COLORS.textSecondary },
  commentContent: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 8,
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
    paddingHorizontal: 14, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  likerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  likerName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  likerMe: {
    fontSize: 11, fontWeight: '700', color: COLORS.primary,
    backgroundColor: COLORS.primary + '18',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  likerMore: { fontSize: 13, color: COLORS.textSecondary, paddingVertical: 14, textAlign: 'center' },

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
    backgroundColor: '#2DD4BF' + '18',
  },
  joinedText: { fontSize: 11, fontWeight: '700', color: '#2DD4BF' },

  storyCard: { backgroundColor: COLORS.surface },
  storyThumb: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#111', position: 'relative' },
  storyThumbImg: { width: '100%', height: '100%' },
  storyThumbNoImg: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  storyPlayOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  storyViewBadge: {
    position: 'absolute', bottom: 10, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  storyViewText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  storyInfo: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  storyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 21 },
  storyAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storyAuthorTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  storyAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2DD4BF' + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  storyAvatarText: { fontSize: 12, fontWeight: '800', color: '#2DD4BF' },
  storyAuthorName: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  storyLikes: { fontSize: 13, color: COLORS.textSecondary },
  storyEmpty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  storyEmptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  storyEmptySub: {
    fontSize: 13, color: COLORS.textSecondary, textAlign: 'center',
    paddingHorizontal: 40, lineHeight: 20,
  },

  separator: { height: 1, backgroundColor: COLORS.border },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },

  writeFab: {
    position: 'absolute', right: 16, bottom: 98,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#2DD4BF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  actionBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  actionBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2DD4BF',
    borderRadius: 26, paddingVertical: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  actionItem: { alignItems: 'center', gap: 2, paddingHorizontal: 16 },
  actionUnderline: {
    position: 'absolute', bottom: -5, left: '25%', right: '25%',
    height: 2, backgroundColor: '#fff', borderRadius: 1,
  },
  actionDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.3)' },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 24, paddingVertical: 24,
    width: 280, gap: 20,
  },
  modalMsg: {
    fontSize: 16, fontWeight: '600', color: COLORS.text,
    textAlign: 'center', lineHeight: 24,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalBtnOk: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#2DD4BF', alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modalOkText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
