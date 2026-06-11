import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, Modal, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MOCK_TRAINERS } from '../../data/trainers';
import { MOCK_GYMS } from '../../data/gyms';
import { Trainer } from '../../types';
import { useLocation } from '../../hooks/useLocation';
import { useLocationStore } from '../../store/locationStore';
import { calculateDistance, formatDistance } from '../../utils/distance';
import { formatPrice } from '../../utils/formatters';

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

type SortType = 'nearby' | 'rating' | 'priceAsc' | 'priceDesc';

const SORT_OPTIONS: { key: SortType; label: string; desc: string }[] = [
  { key: 'nearby',    label: '내 주변',    desc: '가까운 헬스장 기준' },
  { key: 'rating',    label: '평점순',     desc: '평점 높은 순' },
  { key: 'priceAsc',  label: '낮은가격순', desc: '세션 가격 낮은 순' },
  { key: 'priceDesc', label: '높은가격순', desc: '세션 가격 높은 순' },
];

const SPEC_FILTERS = [
  '전체', '체중감량', '근육증가', '필라테스', '크로스핏',
  '재활', '체력향상', '스포츠퍼포먼스', '요가',
] as const;
type SpecFilter = typeof SPEC_FILTERS[number];

const SPEC_COLORS: Record<string, { bg: string; text: string }> = {
  '체중감량':       { bg: '#FEF3C7', text: '#D97706' },
  '근육증가':       { bg: '#DBEAFE', text: '#2563EB' },
  '재활':           { bg: '#D1FAE5', text: '#059669' },
  '체력향상':       { bg: '#EDE9FE', text: '#7C3AED' },
  '크로스핏':       { bg: '#FEE2E2', text: '#DC2626' },
  '필라테스':       { bg: '#FCE7F3', text: '#DB2777' },
  '요가':           { bg: '#ECFDF5', text: '#10B981' },
  '스포츠퍼포먼스': { bg: '#FFF7ED', text: '#EA580C' },
};

const FEATURED_IDS = MOCK_TRAINERS
  .slice()
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 5)
  .map((t) => t.id);

export default function TrainersScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  const [query, setQuery]               = useState('');
  const [sortBy, setSortBy]             = useState<SortType>('rating');
  const [specFilter, setSpecFilter]     = useState<SpecFilter>('전체');
  const [sortModal, setSortModal]       = useState(false);

  useLocation();
  const { currentLocation, hasPermission } = useLocationStore();

  const trainerDistances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of MOCK_TRAINERS) {
      const gyms = MOCK_GYMS.filter((g) => t.partnerGymIds.includes(g.id));
      map[t.id] = gyms.length === 0
        ? Infinity
        : Math.min(...gyms.map((g) => calculateDistance(currentLocation, g.coordinate)));
    }
    return map;
  }, [currentLocation]);

  const filtered = useMemo(() => {
    let result = [...MOCK_TRAINERS];
    if (specFilter !== '전체')
      result = result.filter((t) => t.specializations.includes(specFilter as any));
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) ||
               t.specializations.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'nearby' && hasPermission)
      return result.sort((a, b) => (trainerDistances[a.id] ?? Infinity) - (trainerDistances[b.id] ?? Infinity));
    if (sortBy === 'rating')   return result.sort((a, b) => b.rating - a.rating);
    if (sortBy === 'priceAsc') return result.sort((a, b) => a.sessionPrice - b.sessionPrice);
    if (sortBy === 'priceDesc')return result.sort((a, b) => b.sessionPrice - a.sessionPrice);
    return result.sort((a, b) => b.rating - a.rating);
  }, [sortBy, specFilter, trainerDistances, hasPermission, query]);

  const currentSort = SORT_OPTIONS.find((o) => o.key === sortBy)!;
  const featured    = MOCK_TRAINERS.filter((t) => FEATURED_IDS.includes(t.id));

  const ListHeader = (
    <View>
      {/* ── 검색 바 ── */}
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="트레이너 이름, 전문 분야 검색"
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={D.textMuted}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={16} color={D.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 추천 트레이너 ── */}
      {specFilter === '전체' && query === '' && (
        <View style={styles.featuredSection}>
          <View style={styles.featuredHeader}>
            <Text style={styles.featuredTitle}>추천 트레이너</Text>
            <Text style={styles.featuredSub}>최고 평점 · 인기 트레이너</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
          >
            {featured.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.featuredCard}
                onPress={() => router.push(`/trainer/${t.id}`)}
                activeOpacity={0.88}
              >
                <Image
                  source={{ uri: t.profileImageUrl ?? `https://picsum.photos/seed/${t.id}/300/400` }}
                  style={styles.featuredImg}
                  resizeMode="cover"
                />
                <View style={styles.featuredGrad} />
                <View style={styles.featuredInfo}>
                  <View style={styles.featuredRatingRow}>
                    <MaterialCommunityIcons name="star" size={10} color="#FBBF24" />
                    <Text style={styles.featuredRating}>{t.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.featuredName} numberOfLines={1}>{t.name}</Text>
                  <Text style={styles.featuredSpec} numberOfLines={1}>{t.specializations[0]}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── 카테고리 필터 칩 ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterScrollWrap}
      >
        {SPEC_FILTERS.map((s) => {
          const active = specFilter === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSpecFilter(s)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── 정렬 ── */}
      <View style={styles.sortBar}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setSortModal(true)} activeOpacity={0.7}>
          <MaterialCommunityIcons name="sort" size={14} color={D.primary} />
          <Text style={styles.sortBtnText}>{currentSort.label}</Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={D.textSec} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Trainer }) => {
          const dist  = hasPermission ? trainerDistances[item.id] : undefined;
          const specs = item.specializations.slice(0, 2);
          return (
            <TouchableOpacity
              style={styles.trainerCard}
              onPress={() => router.push(`/trainer/${item.id}`)}
              activeOpacity={0.85}
            >
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
                  {specs.map((s) => {
                    const c = SPEC_COLORS[s] ?? { bg: '#F3F4F6', text: '#6B7280' };
                    return (
                      <View key={s} style={[styles.specChip, { backgroundColor: c.bg }]}>
                        <Text style={[styles.specText, { color: c.text }]}>{s}</Text>
                      </View>
                    );
                  })}
                </View>
                {item.address && (
                  <Text style={styles.trainerLocation} numberOfLines={1}>
                    📍 {[item.address.city, item.address.district].filter(Boolean).join(' ')}
                    {dist !== undefined && dist !== Infinity
                      ? `  ·  ${formatDistance(dist)}`
                      : ''}
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
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-search" size={52} color={D.textMuted} />
            <Text style={styles.emptyText}>해당 조건의 트레이너가 없습니다</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

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
                    <Text style={[styles.sortItemLabel, active && styles.sortItemLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.sortItemDesc}>{opt.desc}</Text>
                  </View>
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
  list:      { flex: 1 },

  /* ── 검색 ── */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.surface,
    marginHorizontal: 14, marginTop: 12, marginBottom: 4,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: D.text },

  /* ── 추천 ── */
  featuredSection: { paddingTop: 10, paddingBottom: 6 },
  featuredHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 14, marginBottom: 10,
  },
  featuredTitle: { fontSize: 16, fontWeight: '800', color: D.text },
  featuredSub:   { fontSize: 12, color: D.textSec },
  featuredScroll:{ paddingHorizontal: 14, gap: 10, paddingBottom: 4 },
  featuredCard: {
    width: 128, height: 175, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14, shadowRadius: 12, elevation: 6,
  },
  featuredImg:  { width: '100%', height: '100%' },
  featuredGrad: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  featuredInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 12, gap: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  featuredRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  featuredRating:    { fontSize: 11, fontWeight: '700', color: '#fff' },
  featuredName:      { fontSize: 14, fontWeight: '800', color: '#fff' },
  featuredSpec:      { fontSize: 11, color: 'rgba(255,255,255,0.8)' },

  /* ── 필터 칩 ── */
  filterScrollWrap: { backgroundColor: D.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  filterScroll: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: D.border,
    backgroundColor: D.surface,
  },
  filterChipActive:    { backgroundColor: D.primary, borderColor: D.primary },
  filterChipText:      { fontSize: 13, fontWeight: '600', color: D.textSec },
  filterChipTextActive:{ color: '#fff' },

  /* ── 정렬 바 ── */
  sortBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8,
  },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: D.border,
    backgroundColor: D.surface,
  },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: D.primary },

  /* ── 트레이너 카드 ── */
  trainerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface,
    marginHorizontal: 14, marginBottom: 10, borderRadius: 18,
    padding: 14, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  trainerPhoto:    { width: 80, height: 80, borderRadius: 16, backgroundColor: D.border },
  trainerInfo:     { flex: 1, gap: 5 },
  trainerNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trainerName:     { fontSize: 16, fontWeight: '800', color: D.text },
  trainerExp:      { fontSize: 11, color: D.textMuted, fontWeight: '500' },
  specRow:         { flexDirection: 'row', gap: 6 },
  specChip:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  specText:        { fontSize: 11, fontWeight: '700' },
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
