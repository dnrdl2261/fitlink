import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { useCommunityStore } from '../../store/communityStore';
import { useBlockedIds } from '../../hooks/useBlockedIds';
import { Post, Group } from '../../data/community';

const GYM = '#2DD4BF';

// 게시글과 모임을 한 리스트에 섞어 보여주기 위한 행 타입
type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'post'; key: string; post: Post }
  | { kind: 'group'; key: string; group: Group };

export default function GymCommunitySearchScreen() {
  const router = useRouter();
  const { from } = useGlobalSearchParams<{ from?: string }>();
  const searchContent = useCommunityStore((s) => s.searchContent);
  const blockedIds = useBlockedIds();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ posts: Post[]; groups: Group[] }>({ posts: [], groups: [] });
  const [loading, setLoading] = useState(false);

  const term = query.trim();

  // 입력이 멎은 뒤 서버에 질의한다. 뒤늦게 온 응답은 버린다.
  useEffect(() => {
    if (!term) {
      setResult({ posts: [], groups: [] });
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const timer = setTimeout(() => {
      searchContent(term)
        .then((r) => { if (alive) setResult(r); })
        .finally(() => { if (alive) setLoading(false); });
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [term, searchContent]);

  const rows = useMemo<Row[]>(() => {
    // 차단한 사람의 글은 서버가 모르니 여기서 뺀다
    const posts = result.posts.filter((p) => !p.authorId || !blockedIds.includes(p.authorId));
    const out: Row[] = [];
    if (posts.length) {
      out.push({ kind: 'header', key: 'h-post', label: `게시글 ${posts.length}` });
      posts.forEach((post) => out.push({ kind: 'post', key: `p-${post.id}`, post }));
    }
    if (result.groups.length) {
      out.push({ kind: 'header', key: 'h-group', label: `모임 ${result.groups.length}` });
      result.groups.forEach((group) => out.push({ kind: 'group', key: `g-${group.id}`, group }));
    }
    return out;
  }, [result, blockedIds]);

  const withFrom = (extra: Record<string, string>) => ({ ...extra, ...(from ? { from } : {}) });

  // 커뮤니티는 탭 화면이라 router.back()이 홈으로 튄다. 경로를 직접 지정한다.
  const goBack = () => router.navigate('/(gym)/community' as any);
  const goPost = (post: Post) =>
    router.push({
      pathname: post.isVideo ? '/(gym)/community-story' : '/(gym)/community-post',
      params: withFrom({ postId: post.id }),
    } as any);
  const goGroup = (groupId: string) =>
    router.push({ pathname: '/(gym)/community-group', params: withFrom({ groupId }) } as any);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={19} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="글, 해시태그, 모임 검색"
            placeholderTextColor={COLORS.textMuted}
            autoFocus
            returnKeyType="search"
            accessibilityLabel="커뮤니티 검색어"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="검색어 지우기"
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return <Text style={styles.sectionTitle}>{item.label}</Text>;
          }
          if (item.kind === 'post') {
            const post = item.post;
            return (
              <TouchableOpacity style={styles.row} onPress={() => goPost(post)} activeOpacity={0.8}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{post.title}</Text>
                  <Text style={styles.rowSub} numberOfLines={2}>{post.content}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {post.author} · {post.timeAgo}
                    {post.hashtags.length > 0 ? ` · #${post.hashtags.join(' #')}` : ''}
                  </Text>
                </View>
                {post.imageUrl ? (
                  <Image source={{ uri: post.imageUrl }} style={styles.thumb} resizeMode="cover" />
                ) : post.isVideo ? (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <MaterialCommunityIcons name="play" size={22} color={COLORS.textMuted} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }
          const group = item.group;
          return (
            <TouchableOpacity style={styles.row} onPress={() => goGroup(group.id)} activeOpacity={0.8}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>{group.name}</Text>
                <Text style={styles.rowSub} numberOfLines={2}>{group.description}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {group.category} · {group.location} · 멤버 {group.memberCount}/{group.maxMembers}
                </Text>
              </View>
              {group.imageUrl ? (
                <Image source={{ uri: group.imageUrl }} style={styles.thumb} resizeMode="cover" />
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator color={GYM} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={term ? 'magnify-close' : 'magnify'}
                  size={52}
                  color={COLORS.border}
                />
                <Text style={styles.emptyText}>
                  {term ? '검색 결과가 없습니다' : '커뮤니티에서 찾고 싶은 걸 입력하세요'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingRight: 16, paddingVertical: 8, gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderSubtle,
  },
  backBtn: { paddingLeft: 8, paddingRight: 4, paddingVertical: 4 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 20, paddingHorizontal: 12, height: 38,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },

  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: GYM,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  rowSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  rowMeta: { fontSize: 11, color: COLORS.textMuted },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: COLORS.surfaceSubtle },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', gap: 10, paddingTop: 90 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
