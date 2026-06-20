import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, Modal, Image, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTrainerStore } from '../../store/trainerStore';
import { MOCK_GYMS } from '../../data/gyms';
import { Trainer } from '../../types';
import { useLocation } from '../../hooks/useLocation';
import { useLocationStore } from '../../store/locationStore';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useFavoriteStore } from '../../store/favoriteStore';
import { useUiPrefStore } from '../../store/uiPrefStore';
import { useNotificationStore } from '../../store/notificationStore';
import { calculateDistance, formatDistance } from '../../utils/distance';
import { formatPrice, formatTime } from '../../utils/formatters';

const D = {
  bg:          '#EEF2F9',
  surface:     '#FFFFFF',
  primary:     '#4F63F5',
  primaryGlow: 'rgba(79,99,245,0.12)',
  text:        '#0F172A',
  textSec:     '#64748B',
  textMuted:   '#94A3B8',
  border:      '#E2E8F0',
  amber:       '#F59E0B',
};

const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

const QUICK_ACTIONS = [
  { icon: 'calendar-plus',          label: '예약',   route: '/(member)/trainer-list' },
  { icon: 'clipboard-text-outline', label: '내 예약', route: '/(member)/bookings' },
  { icon: 'package-variant-closed', label: '패키지', route: '/(member)/my-packages' },
] as const;

type PriceKey = 'all' | 'u50' | 'm5080' | 'o80';
const PRICE_RANGES: { key: PriceKey; label: string; test: (p: number) => boolean }[] = [
  { key: 'all',   label: '전체',        test: () => true },
  { key: 'u50',   label: '5만원 이하',  test: (p) => p <= 50000 },
  { key: 'm5080', label: '5~8만원',     test: (p) => p > 50000 && p <= 80000 },
  { key: 'o80',   label: '8만원 이상',  test: (p) => p > 80000 },
];

// 검색창이 비어있을 때 노출하는 추천 검색어
const RECOMMENDED_KEYWORDS = ['다이어트', '체형교정', '근력향상', '바디프로필', '재활운동'];

type SortType = 'nearby' | 'rating' | 'priceAsc' | 'priceDesc';

const SORT_OPTIONS: { key: SortType; label: string; desc: string }[] = [
  { key: 'nearby',    label: '내 주변',    desc: '가까운 헬스장 기준' },
  { key: 'rating',    label: '평점순',     desc: '평점 높은 순' },
  { key: 'priceAsc',  label: '낮은가격순', desc: '세션 가격 낮은 순' },
  { key: 'priceDesc', label: '높은가격순', desc: '세션 가격 높은 순' },
];

const SPEC_FILTERS = [
  '전체', '다이어트', '체형교정', '근력향상', '기초체력', '바디프로필',
  '벌크업', '재활운동', '통증관리', '산전산후', '대회준비',
  '유연성증진', '웨딩케어', '선수레슨',
] as const;
type SpecFilter = typeof SPEC_FILTERS[number];

// 운동 목적 키워드 아이콘 (PT 등록 '수업 목적'과 동일)
const GOAL_ICONS: Record<string, string> = {
  '전체':       'view-grid-outline',
  '다이어트':   'run-fast',
  '체형교정':   'human-handsup',
  '근력향상':   'arm-flex-outline',
  '기초체력':   'lightning-bolt-outline',
  '바디프로필': 'camera-outline',
  '벌크업':     'dumbbell',
  '재활운동':   'medical-bag',
  '통증관리':   'heart-pulse',
  '산전산후':   'baby-face-outline',
  '대회준비':   'trophy-outline',
  '유연성증진': 'yoga',
  '웨딩케어':   'ring',
  '선수레슨':   'whistle',
};

export default function MemberHomeScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  const { member } = useAuthStore();
  const { bookings } = useBookingStore();
  const memberId = member?.id ?? 'member_001';

  const [query, setQuery]           = useState('');
  const [sortBy, setSortBy]         = useState<SortType>('nearby');
  const [specFilter, setSpecFilter] = useState<SpecFilter>('전체');
  const [priceKey, setPriceKey]     = useState<PriceKey>('all');
  const [favOnly, setFavOnly]       = useState(false);
  const [sortModal, setSortModal]   = useState(false);
  const [specModal, setSpecModal]   = useState(false);
  const [priceModal, setPriceModal] = useState(false);

  const favoriteIds = useFavoriteStore((s) => s.trainerIds);
  const toggleFavorite = useFavoriteStore((s) => s.toggle);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useUiPrefStore();

  // 트레이너가 보낸 예약 제안 (회원 수신)
  const allNotifications = useNotificationStore((s) => s.notifications);
  const proposals = useMemo(
    () => allNotifications.filter(
      (n) => n.targetRole === 'member' && n.userId === memberId && n.type === 'trainer_proposal'
    ),
    [allNotifications, memberId]
  );

  const runSearch = (q: string) => {
    setQuery(q);
    addRecentSearch(q);
  };

  useLocation();
  const { currentLocation, hasPermission } = useLocationStore();

  // ── 내 PT 현황(대시보드) ──
  const { nextSession, pendingCount } = useMemo(() => {
    const mine = bookings.filter((b) => b.memberId === memberId);
    const upcoming = mine
      .filter((b) => b.status === 'active')
      .flatMap((b) =>
        b.sessions
          .filter((s) => s.status === 'scheduled' && s.date >= TODAY)
          .map((s) => ({ ...s, trainerName: b.trainerName }))
      )
      .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.startTime.localeCompare(b.startTime)));
    const pending = mine.reduce((n, b) => n + b.sessions.filter((s) => s.status === 'pending').length, 0);
    return { nextSession: upcoming[0], pendingCount: pending };
  }, [bookings, memberId]);

  const trainers = useTrainerStore((s) => s.trainers);

  // ── 트레이너 거리(위치별) ──
  const trainerDistances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trainers) {
      const gyms = MOCK_GYMS.filter((g) => t.partnerGymIds.includes(g.id));
      map[t.id] = gyms.length === 0
        ? Infinity
        : Math.min(...gyms.map((g) => calculateDistance(currentLocation, g.coordinate)));
    }
    return map;
  }, [currentLocation, trainers]);

  // ── 검색 + 운동목적별 + 정렬 ──
  const filtered = useMemo(() => {
    let result = [...trainers];
    if (favOnly)
      result = result.filter((t) => favoriteIds.includes(t.id));
    if (specFilter !== '전체')
      result = result.filter((t) => t.trainingGoals?.includes(specFilter as any));
    const priceRange = PRICE_RANGES.find((r) => r.key === priceKey)!;
    if (priceKey !== 'all')
      result = result.filter((t) => priceRange.test(t.sessionPrice));
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) ||
               t.specializations.some((s) => s.toLowerCase().includes(q)) ||
               (t.trainingGoals?.some((g) => g.toLowerCase().includes(q)) ?? false)
      );
    }
    if (sortBy === 'nearby' && hasPermission)
      return result.sort((a, b) => (trainerDistances[a.id] ?? Infinity) - (trainerDistances[b.id] ?? Infinity));
    if (sortBy === 'priceAsc')  return result.sort((a, b) => a.sessionPrice - b.sessionPrice);
    if (sortBy === 'priceDesc') return result.sort((a, b) => b.sessionPrice - a.sessionPrice);
    return result.sort((a, b) => b.rating - a.rating);
  }, [sortBy, specFilter, priceKey, favOnly, favoriteIds, trainerDistances, hasPermission, query, trainers]);

  const currentSort = SORT_OPTIONS.find((o) => o.key === sortBy)!;
  // '내 주변' 선택했지만 위치 권한이 없으면 실제로는 평점순으로 동작 → 라벨도 평점순으로 표기
  const sortLabel = sortBy === 'nearby' && !hasPermission ? '평점순' : currentSort.label;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return '좋은 아침이에요';
    if (h < 17) return '좋은 오후예요';
    return '오늘도 수고하셨어요';
  })();

  const whenLabel = (s: { date: string; startTime: string }) =>
    `${s.date === TODAY ? '오늘' : s.date.slice(5).replace('-', '/')} · ${formatTime(s.startTime)}`;

  const ListHeader = (
    <View>
      {/* ── 인사말 ── */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting} 👋</Text>
      </View>

      {/* ── 트레이너가 보낸 예약 제안 ── */}
      {proposals.length > 0 && (
        <TouchableOpacity
          style={styles.proposalBanner}
          activeOpacity={0.85}
          onPress={() => {
            const t = proposals[0]?.meta?.trainerId;
            if (proposals.length === 1 && t) router.push(`/trainer/${t}` as any);
            else router.push('/(member)/notifications' as any);
          }}
        >
          <View style={styles.proposalIcon}>
            <MaterialCommunityIcons name="calendar-heart" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.proposalTitle}>트레이너가 보낸 예약 제안 {proposals.length}건</Text>
            <Text style={styles.proposalSub}>눌러서 확인하고 예약을 진행하세요</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={D.primary} />
        </TouchableOpacity>
      )}

      {/* ── 내 PT 현황 ── */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>내 PT 현황</Text>
        {nextSession ? (
          <>
            <View style={styles.nextRow}>
              <View style={styles.nextBadge}>
                <MaterialCommunityIcons name="calendar-clock" size={13} color="#fff" />
                <Text style={styles.nextBadgeText}>다음 세션</Text>
              </View>
              <Text style={styles.nextWhen}>{whenLabel(nextSession)}</Text>
            </View>
            <Text style={styles.nextTrainer}>{nextSession.trainerName} 트레이너</Text>
          </>
        ) : (
          <Text style={styles.statusEmpty}>예정된 PT 세션이 없어요. 트레이너를 찾아 예약해보세요.</Text>
        )}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.pendingBtn}
            onPress={() => router.push('/(member)/bookings' as any)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="clipboard-check-outline" size={16} color="#fff" />
            <Text style={styles.pendingBtnText}>완료 확인 요청 {pendingCount}건 확인하기</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 빠른 실행 ── */}
      <View style={styles.quickRow}>
        {QUICK_ACTIONS.map((q) => (
          <TouchableOpacity
            key={q.label}
            style={styles.quickItem}
            onPress={() => router.push(q.route as any)}
            activeOpacity={0.75}
          >
            <View style={styles.quickIcon}>
              <MaterialCommunityIcons name={q.icon as any} size={22} color={D.primary} />
            </View>
            <Text style={styles.quickLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 검색 ── */}
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="트레이너 이름, 전문 분야, 운동 목표 검색"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => addRecentSearch(query)}
          returnKeyType="search"
          placeholderTextColor={D.textMuted}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={16} color={D.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 추천 / 최근 검색어 (검색창이 비었을 때) ── */}
      {query.length === 0 && (
        <View style={styles.suggestWrap}>
          {recentSearches.length > 0 && (
            <>
              <View style={styles.suggestHead}>
                <Text style={styles.suggestLabel}>최근 검색</Text>
                <TouchableOpacity onPress={clearRecentSearches} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.suggestClear}>전체삭제</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipRow}>
                {recentSearches.map((k) => (
                  <TouchableOpacity key={k} style={styles.recentChip} onPress={() => runSearch(k)} activeOpacity={0.75}>
                    <MaterialCommunityIcons name="history" size={13} color={D.textSec} />
                    <Text style={styles.recentChipText}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <Text style={[styles.suggestLabel, { marginTop: recentSearches.length > 0 ? 12 : 0 }]}>추천 검색어</Text>
          <View style={styles.chipRow}>
            {RECOMMENDED_KEYWORDS.map((k) => (
              <TouchableOpacity key={k} style={styles.recommendChip} onPress={() => runSearch(k)} activeOpacity={0.75}>
                <Text style={styles.recommendChipText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── 필터 / 정렬 바 (가로 스크롤) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortBar}
        contentContainerStyle={styles.sortBarContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={[styles.sortBtn, favOnly && styles.sortBtnActive]}
          onPress={() => setFavOnly((v) => !v)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name={favOnly ? 'heart' : 'heart-outline'} size={14} color={favOnly ? '#EF4444' : D.textSec} />
          <Text style={styles.sortBtnText}>찜</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, specFilter !== '전체' && styles.sortBtnActive]}
          onPress={() => setSpecModal(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="dumbbell" size={14} color={specFilter !== '전체' ? D.primary : D.textSec} />
          <Text style={styles.sortBtnText}>{specFilter === '전체' ? '운동목적' : specFilter}</Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={D.textSec} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, priceKey !== 'all' && styles.sortBtnActive]}
          onPress={() => setPriceModal(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="cash" size={14} color={priceKey !== 'all' ? D.primary : D.textSec} />
          <Text style={styles.sortBtnText}>{priceKey === 'all' ? '가격대' : PRICE_RANGES.find((r) => r.key === priceKey)!.label}</Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={D.textSec} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setSortModal(true)} activeOpacity={0.7}>
          <MaterialCommunityIcons name="sort" size={14} color={D.primary} />
          <Text style={styles.sortBtnText}>{sortLabel}</Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={D.textSec} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }: { item: Trainer }) => {
          const dist  = hasPermission ? trainerDistances[item.id] : undefined;
          const goals = (item.trainingGoals ?? []).slice(0, 2);
          const fav   = favoriteIds.includes(item.id);
          return (
            <TouchableOpacity
              style={styles.trainerCard}
              onPress={() => router.push(`/trainer/${item.id}` as any)}
              activeOpacity={0.85}
            >
              <TouchableOpacity
                style={styles.favBtn}
                onPress={() => toggleFavorite(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={fav ? 'heart' : 'heart-outline'}
                  size={20}
                  color={fav ? '#EF4444' : D.textMuted}
                />
              </TouchableOpacity>
              <Image
                source={{ uri: item.profileImageUrl ?? `https://picsum.photos/seed/${item.id}/200/200` }}
                style={styles.trainerPhoto}
                resizeMode="cover"
              />
              <View style={styles.trainerInfo}>
                <View style={styles.trainerNameRow}>
                  <Text style={styles.trainerName}>{item.name}</Text>
                  <Text style={styles.trainerExp}>{item.experienceYears}년</Text>
                </View>
                <View style={styles.specRow}>
                  {goals.map((g) => (
                    <View key={g} style={styles.specChip}>
                      <Text numberOfLines={1} style={styles.specText}>{g}</Text>
                    </View>
                  ))}
                </View>
                {item.address && (
                  <Text style={styles.trainerLocation} numberOfLines={1}>
                    📍 {[item.address.city, item.address.district].filter(Boolean).join(' ')}
                    {dist !== undefined && dist !== Infinity ? `  ·  ${formatDistance(dist)}` : ''}
                  </Text>
                )}
                <View style={styles.trainerMeta}>
                  <View style={styles.ratingRow}>
                    <MaterialCommunityIcons name="star" size={13} color="#FBBF24" />
                    <Text style={styles.ratingNum}>{item.rating.toFixed(1)}</Text>
                    <Text style={styles.reviewCnt}>({item.reviewCount})</Text>
                  </View>
                  <Text style={styles.price}>
                    {formatPrice(item.sessionPrice)}
                    <Text style={styles.priceSub}>/회</Text>
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={D.border} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-search" size={52} color={D.textMuted} />
            <Text style={styles.emptyText}>해당 조건의 트레이너가 없습니다</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* ── 운동목적 모달 ── */}
      <Modal visible={specModal} animationType="slide" transparent onRequestClose={() => setSpecModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSpecModal(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <View style={styles.specHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.specTitle}>운동 목적</Text>
                <Text style={styles.specSubtitle}>찾고 싶은 운동 목적을 선택하세요</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSpecModal(false)}
                style={styles.specClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close" size={20} color={D.textSec} />
              </TouchableOpacity>
            </View>
            <View style={styles.specGrid}>
              {SPEC_FILTERS.map((s) => {
                const active = specFilter === s;
                const icon = GOAL_ICONS[s];
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.specOption, active && styles.specOptionActive]}
                    onPress={() => { setSpecFilter(s); setSpecModal(false); }}
                    activeOpacity={0.8}
                  >
                    {icon ? <MaterialCommunityIcons name={icon as any} size={18} color={active ? '#fff' : D.textSec} /> : null}
                    <Text numberOfLines={1} style={[styles.specOptionText, active && styles.specOptionTextActive]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── 정렬 모달 ── */}
      <Modal visible={sortModal} animationType="slide" transparent onRequestClose={() => setSortModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>정렬</Text>
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortItem, active && styles.sortItemActive]}
                  onPress={() => { setSortBy(opt.key); setSortModal(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ gap: 2 }}>
                    <Text style={[styles.sortItemLabel, active && styles.sortItemLabelActive]}>{opt.label}</Text>
                    <Text style={styles.sortItemDesc}>{opt.desc}</Text>
                  </View>
                  {active && <MaterialCommunityIcons name="check" size={20} color={D.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── 가격대 모달 ── */}
      <Modal visible={priceModal} animationType="slide" transparent onRequestClose={() => setPriceModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPriceModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>가격대 (1회 세션 기준)</Text>
            {PRICE_RANGES.map((opt) => {
              const active = priceKey === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortItem, active && styles.sortItemActive]}
                  onPress={() => { setPriceKey(opt.key); setPriceModal(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sortItemLabel, active && styles.sortItemLabelActive]}>{opt.label}</Text>
                  {active && <MaterialCommunityIcons name="check" size={20} color={D.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  listContent: { paddingTop: 16, paddingBottom: 24 },

  header: { gap: 2, marginHorizontal: 16 },
  greeting: { fontSize: 16, color: D.text, fontWeight: '700' },

  proposalBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.surface, marginHorizontal: 16, marginTop: 14,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: D.primary,
  },
  proposalIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: D.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  proposalTitle: { fontSize: 14, fontWeight: '800', color: D.text },
  proposalSub: { fontSize: 12, color: D.textSec, marginTop: 2 },

  statusCard: {
    backgroundColor: D.surface, borderRadius: 20, padding: 18, gap: 14,
    marginHorizontal: 16, marginTop: 16,
    borderWidth: 1, borderColor: D.primaryGlow,
    shadowColor: D.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 14, elevation: 4,
  },
  statusTitle: { fontSize: 13, fontWeight: '700', color: D.textSec },
  nextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  nextBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  nextWhen: { fontSize: 14, fontWeight: '700', color: D.text },
  nextTrainer: { fontSize: 17, fontWeight: '800', color: D.text, marginTop: -4 },
  statusEmpty: { fontSize: 14, color: D.textSec, lineHeight: 20 },

  pendingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: D.amber, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
  },
  pendingBtnText: { flex: 1, fontSize: 14, fontWeight: '800', color: '#fff' },

  quickRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16 },
  quickItem: { flex: 1, alignItems: 'center', gap: 7 },
  quickIcon: {
    width: 54, height: 54, borderRadius: 17, backgroundColor: D.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  quickLabel: { fontSize: 12, fontWeight: '600', color: D.text },

  /* ── 검색 ── */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.surface,
    marginHorizontal: 16, marginTop: 18,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: D.text },

  /* ── 추천 / 최근 검색어 ── */
  suggestWrap: { marginHorizontal: 16, marginTop: 14 },
  suggestHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  suggestLabel: { fontSize: 12, fontWeight: '700', color: D.textSec, marginBottom: 8 },
  suggestClear: { fontSize: 12, color: D.textMuted, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.border,
  },
  recentChipText: { fontSize: 13, color: D.textSec, fontWeight: '600' },
  recommendChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    backgroundColor: D.primaryGlow,
  },
  recommendChipText: { fontSize: 13, color: D.primary, fontWeight: '700' },

  /* ── 필터 / 정렬 바 ── */
  sortBar: { marginTop: 18, paddingBottom: 10 },
  sortBarContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: D.border,
    backgroundColor: D.surface,
  },
  sortBtnActive: { borderColor: D.primary, backgroundColor: D.primaryGlow },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: D.primary },

  /* ── 운동목적 모달 ── */
  specHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, marginBottom: 14,
  },
  specTitle: { fontSize: 18, fontWeight: '800', color: D.text },
  specSubtitle: { fontSize: 12.5, color: D.textSec, marginTop: 3 },
  specClose: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: D.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  specGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 9,
    paddingHorizontal: 20, paddingBottom: 8,
  },
  specOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24,
    backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border,
  },
  specOptionActive: { backgroundColor: D.primary, borderColor: D.primary },
  specOptionText: { fontSize: 13, fontWeight: '600', color: D.textSec },
  specOptionTextActive: { color: '#fff' },

  /* ── 트레이너 카드 ── */
  trainerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface, borderRadius: 18,
    marginHorizontal: 16, marginBottom: 10,
    padding: 14, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  trainerPhoto:    { width: 80, height: 80, borderRadius: 16, backgroundColor: D.border },
  favBtn:          { position: 'absolute', top: 10, right: 10, zIndex: 2, padding: 2 },
  trainerInfo:     { flex: 1, gap: 5 },
  trainerNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trainerName:     { fontSize: 16, fontWeight: '800', color: D.text },
  trainerExp:      { fontSize: 11, color: D.textMuted, fontWeight: '500' },
  specRow:         { flexDirection: 'row', gap: 6 },
  specChip:        { backgroundColor: D.primaryGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  specText:        { fontSize: 11, fontWeight: '700', color: D.primary },
  trainerLocation: { fontSize: 11, color: D.textMuted },
  trainerMeta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  ratingRow:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingNum:       { fontSize: 13, fontWeight: '700', color: D.text },
  reviewCnt:       { fontSize: 11, color: D.textMuted },
  price:           { fontSize: 15, fontWeight: '900', color: D.primary },
  priceSub:        { fontSize: 11, fontWeight: '500', color: D.textSec },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: D.textMuted },

  /* ── 정렬 모달 ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32, paddingTop: 12,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: D.border,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: D.text, paddingHorizontal: 20, marginBottom: 8 },
  sortItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  sortItemActive:    { backgroundColor: D.primaryGlow },
  sortItemLabel:     { fontSize: 15, fontWeight: '600', color: D.text },
  sortItemLabelActive:{ color: D.primary },
  sortItemDesc:      { fontSize: 12, color: D.textMuted },
});
