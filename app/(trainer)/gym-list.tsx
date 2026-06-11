import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MOCK_GYMS } from '../../data/gyms';
import { Gym } from '../../types';

const D = {
  bg:          '#EEF2F9',
  surface:     '#FFFFFF',
  primary:     '#4F63F5',
  primaryGlow: 'rgba(79,99,245,0.12)',
  secondary:   '#5B5FD6',
  text:        '#0F172A',
  textSec:     '#64748B',
  textMuted:   '#94A3B8',
  border:      '#E2E8F0',
  amber:       '#F59E0B',
  success:     '#22C55E',
};

type SortType = 'rating' | 'reviewCount' | 'priceAsc' | 'priceDesc';

const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: 'rating',      label: '평점순' },
  { key: 'reviewCount', label: '리뷰 많은순' },
  { key: 'priceAsc',    label: '이용료 낮은순' },
  { key: 'priceDesc',   label: '이용료 높은순' },
];

const CITIES = ['전체', '서울', '부산', '경기', '인천', '대구', '대전', '광주', '울산', '강원', '충북', '충남', '세종', '전남', '전북', '제주'] as const;
type CityFilter = typeof CITIES[number];

export default function GymListScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  const [query, setQuery]       = useState('');
  const [city, setCity]         = useState<CityFilter>('전체');
  const [sortBy, setSortBy]     = useState<SortType>('rating');
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = [...MOCK_GYMS];

    if (city !== '전체')
      result = result.filter(g => g.city === city);

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.address.toLowerCase().includes(q) ||
        g.district.toLowerCase().includes(q) ||
        g.facilities.some(f => f.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'rating')      return result.sort((a, b) => b.rating - a.rating);
    if (sortBy === 'reviewCount') return result.sort((a, b) => b.reviewCount - a.reviewCount);
    if (sortBy === 'priceAsc') {
      return result.sort((a, b) => {
        const pa = a.pricing.find(p => p.sessionType === 'single')?.facilityFee ?? 0;
        const pb = b.pricing.find(p => p.sessionType === 'single')?.facilityFee ?? 0;
        return pa - pb;
      });
    }
    if (sortBy === 'priceDesc') {
      return result.sort((a, b) => {
        const pa = a.pricing.find(p => p.sessionType === 'single')?.facilityFee ?? 0;
        const pb = b.pricing.find(p => p.sessionType === 'single')?.facilityFee ?? 0;
        return pb - pa;
      });
    }
    return result;
  }, [query, city, sortBy]);

  const currentSort = SORT_OPTIONS.find(o => o.key === sortBy)!;

  const ListHeader = (
    <View>
      {/* 검색 바 */}
      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="헬스장 이름, 지역, 시설 검색"
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

      {/* 지역 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterScroll}
        style={s.filterScrollWrap}
      >
        {CITIES.map(c => {
          const active = city === c;
          return (
            <TouchableOpacity
              key={c}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setCity(c)}
              activeOpacity={0.75}
            >
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 정렬 */}
      <View style={s.sortBar}>
        <Text style={s.resultCount}>{filtered.length}개의 헬스장</Text>
        <TouchableOpacity style={s.sortBtn} onPress={() => setSortOpen(true)} activeOpacity={0.7}>
          <MaterialCommunityIcons name="sort" size={14} color={D.primary} />
          <Text style={s.sortBtnText}>{currentSort.label}</Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={D.textSec} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }: { item: Gym }) => {
          const singlePrice = item.pricing.find(p => p.sessionType === 'single');
          return (
            <TouchableOpacity
              style={s.gymCard}
              onPress={() => router.push({ pathname: `/gym/${item.id}` as any, params: { from: 'trainer' } })}
              activeOpacity={0.85}
            >
                <Image source={{ uri: item.images[0] }} style={s.gymPhoto} resizeMode="cover" />
                <View style={s.gymInfo}>
                  {/* 이름 + 파트너 배지 */}
                  <View style={s.gymNameRow}>
                    <Text style={s.gymName} numberOfLines={1}>{item.name}</Text>
                    {item.isPartner && (
                      <View style={s.partnerBadge}>
                        <Text style={s.partnerText}>파트너</Text>
                      </View>
                    )}
                  </View>

                  {/* 평점 + 리뷰 */}
                  <View style={s.metaRow}>
                    <MaterialCommunityIcons name="star" size={13} color={D.amber} />
                    <Text style={s.ratingNum}>{item.rating.toFixed(1)}</Text>
                    <Text style={s.reviewCnt}>({item.reviewCount})</Text>
                    <Text style={s.dot}>·</Text>
                    <Text style={s.location}>{item.district} {item.dong}</Text>
                  </View>

                  {/* 주소 */}
                  <Text style={s.address} numberOfLines={1}>📍 {item.address}</Text>

                  {/* 설명 */}
                  <Text style={s.desc} numberOfLines={2}>{item.description}</Text>

                  {/* 시설 칩 */}
                  <View style={s.facilityRow}>
                    {item.facilities.slice(0, 3).map(f => (
                      <View key={f} style={s.facilityChip}>
                        <Text style={s.facilityText}>{f}</Text>
                      </View>
                    ))}
                    {item.facilities.length > 3 && (
                      <Text style={s.facilityMore}>+{item.facilities.length - 3}</Text>
                    )}
                  </View>

                  {/* 가격 */}
                  {singlePrice && (
                    <Text style={s.price}>
                      시설이용료{' '}
                      <Text style={s.priceNum}>₩{singlePrice.facilityFee.toLocaleString()}</Text>
                      /회
                    </Text>
                  )}
                </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="dumbbell" size={52} color={D.textMuted} />
            <Text style={s.emptyText}>해당 조건의 헬스장이 없습니다</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        style={s.list}
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      {/* 정렬 모달 */}
      {sortOpen && (
        <TouchableOpacity style={s.sortOverlay} activeOpacity={1} onPress={() => setSortOpen(false)}>
          <View style={s.sortSheet}>
            <View style={s.sortHandle} />
            <Text style={s.sortTitle}>정렬</Text>
            {SORT_OPTIONS.map(opt => {
              const active = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.sortItem, active && s.sortItemActive]}
                  onPress={() => { setSortBy(opt.key); setSortOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.sortItemText, active && s.sortItemTextActive]}>{opt.label}</Text>
                  {active && <MaterialCommunityIcons name="check" size={18} color={D.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  list: { flex: 1 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.surface,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: D.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: D.text, padding: 0 },

  filterScrollWrap: { marginTop: 8 },
  filterScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: D.surface,
    borderWidth: 1, borderColor: D.border,
  },
  filterChipActive: { backgroundColor: D.primary, borderColor: D.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: D.textSec },
  filterChipTextActive: { color: '#fff' },

  sortBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  resultCount: { fontSize: 13, color: D.textSec, fontWeight: '600' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.surface, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: D.border,
  },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: D.text },

  gymCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: D.surface,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, borderWidth: 1, borderColor: D.border,
    overflow: 'hidden',
  },
  gymPhoto: { width: 110, minHeight: 160, backgroundColor: D.border },
  gymInfo: { flex: 1, padding: 12, gap: 5 },


  gymNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gymName: { fontSize: 15, fontWeight: '700', color: D.text, flex: 1 },
  partnerBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: D.primary + '18', borderRadius: 5,
  },
  partnerText: { fontSize: 10, fontWeight: '700', color: D.primary },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingNum: { fontSize: 13, fontWeight: '700', color: D.text },
  reviewCnt: { fontSize: 12, color: D.textSec },
  dot: { fontSize: 12, color: D.textMuted, marginHorizontal: 1 },
  location: { fontSize: 12, color: D.textSec },

  address: { fontSize: 11, color: D.textMuted },
  desc: { fontSize: 12, color: D.textSec, lineHeight: 17 },

  facilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  facilityChip: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: D.bg, borderRadius: 5,
    borderWidth: 1, borderColor: D.border,
  },
  facilityText: { fontSize: 10, color: D.textSec, fontWeight: '500' },
  facilityMore: { fontSize: 10, color: D.textMuted, alignSelf: 'center' },

  price: { fontSize: 11, color: D.textSec, marginTop: 2 },
  priceNum: { fontSize: 13, fontWeight: '700', color: D.primary },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: D.textSec },

  sortOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  sortSheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  sortHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: D.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sortTitle: {
    fontSize: 16, fontWeight: '700', color: D.text,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border,
  },
  sortItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border,
  },
  sortItemActive: { backgroundColor: D.primary + '08' },
  sortItemText: { fontSize: 15, color: D.text },
  sortItemTextActive: { fontWeight: '700', color: D.primary },
});
