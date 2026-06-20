import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, Image,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MOCK_GYMS } from '../../data/gyms';
import { useGymProfileStore, mergeGymEdits } from '../../store/gymProfileStore';
import { useLocationStore } from '../../store/locationStore';
import { useLocation } from '../../hooks/useLocation';
import { calculateDistance, formatDistance } from '../../utils/distance';
import GymMapView from '../../components/GymMapView';
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

type SortType = 'distance' | 'rating' | 'reviewCount' | 'priceAsc' | 'priceDesc';

const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: 'distance',    label: '가까운 순' },
  { key: 'rating',      label: '평점순' },
  { key: 'reviewCount', label: '리뷰 많은순' },
  { key: 'priceAsc',    label: '이용료 낮은순' },
  { key: 'priceDesc',   label: '이용료 높은순' },
];

export default function GymListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  useLocation(); // GPS 현재위치를 기본 기준으로 가져옴
  const { currentLocation, selectedDong } = useLocationStore();
  const gymEdits = useGymProfileStore((s) => s.edits); // 관리자 수정값(가격 등) 반영

  const [query, setQuery]       = useState('');
  const [regionFilter, setRegionFilter] = useState<{ city: string; district?: string } | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [sortBy, setSortBy]     = useState<SortType>('distance');
  const [sortOpen, setSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);

  // 지도 모드에서는 상단 네비게이션 헤더를 숨기고 지도 위 플로팅 뒤로가기로 대체
  useEffect(() => {
    navigation.setOptions({ headerShown: viewMode !== 'map' });
  }, [viewMode, navigation]);

  // 입력어에 대한 자동완성 후보 (지역 + 헬스장). 지역이 이미 선택된 경우 그 안에서만 헬스장 추천.
  const suggestions = useMemo(() => {
    const q = query.trim();
    const empty = { regions: [] as { city: string; district?: string; label: string }[], gyms: [] as Gym[] };
    if (!q) return empty;
    const lq = q.toLowerCase();
    const pool = regionFilter
      ? MOCK_GYMS.filter(g => g.city === regionFilter.city && (!regionFilter.district || g.district === regionFilter.district))
      : MOCK_GYMS;
    const regionMap = new Map<string, { city: string; district?: string; label: string }>();
    if (!regionFilter) {
      MOCK_GYMS.forEach(g => {
        if (g.city.includes(q)) regionMap.set(g.city, { city: g.city, label: g.city });
        const cd = `${g.city} ${g.district}`;
        if (g.district.includes(q) || cd.includes(q))
          regionMap.set(cd, { city: g.city, district: g.district, label: cd });
      });
    }
    return {
      regions: Array.from(regionMap.values()).slice(0, 4),
      gyms: pool.filter(g => g.name.toLowerCase().includes(lq)).slice(0, 5),
    };
  }, [query, regionFilter]);

  const filtered = useMemo(() => {
    let result = MOCK_GYMS.map((g) => mergeGymEdits(g, gymEdits));

    if (regionFilter)
      result = result.filter(g =>
        g.city === regionFilter.city &&
        (!regionFilter.district || g.district === regionFilter.district)
      );

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.address.toLowerCase().includes(q) ||
        g.district.toLowerCase().includes(q) ||
        g.facilities.some(f => f.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'distance')
      return result.sort((a, b) =>
        calculateDistance(currentLocation, a.coordinate) - calculateDistance(currentLocation, b.coordinate)
      );
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
  }, [query, regionFilter, sortBy, currentLocation, gymEdits]);

  const currentSort = SORT_OPTIONS.find(o => o.key === sortBy)!;
  const selectedMapGym = filtered.find(g => g.id === selectedGymId);

  const suggestOpenNow = suggestOpen && query.trim().length > 0 && (suggestions.regions.length > 0 || suggestions.gyms.length > 0);

  // 자동완성 후보 항목 (지역 + 헬스장) — 목록·지도 검색 공용
  const renderSuggestItems = () => (
    <>
      {suggestions.regions.map(r => (
        <TouchableOpacity
          key={'r-' + r.label} style={s.suggestItem}
          onPress={() => { setRegionFilter({ city: r.city, district: r.district }); setQuery(''); setSuggestOpen(false); }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="map-marker-outline" size={16} color={D.primary} />
          <Text style={s.suggestText} numberOfLines={1}>{r.label}</Text>
          <Text style={s.suggestTag}>지역</Text>
        </TouchableOpacity>
      ))}
      {suggestions.gyms.map(g => (
        <TouchableOpacity
          key={'g-' + g.id} style={s.suggestItem}
          onPress={() => { setQuery(g.name); setSuggestOpen(false); }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="dumbbell" size={16} color={D.primary} />
          <Text style={s.suggestText} numberOfLines={1}>{g.name}</Text>
          <Text style={s.suggestTag}>헬스장</Text>
        </TouchableOpacity>
      ))}
    </>
  );

  // 선택지역 칩 — 목록·지도 공용
  const renderRegionChip = () => (
    regionFilter ? (
      <View style={s.regionChipRow}>
        <View style={s.regionChip}>
          <MaterialCommunityIcons name="map-marker" size={13} color={D.primary} />
          <Text style={s.regionChipText}>
            {regionFilter.district ? `${regionFilter.city} ${regionFilter.district}` : regionFilter.city}
          </Text>
          <TouchableOpacity onPress={() => setRegionFilter(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <MaterialCommunityIcons name="close" size={14} color={D.textSec} />
          </TouchableOpacity>
        </View>
      </View>
    ) : null
  );

  // 검색바 + 자동완성 + 선택지역 칩 (목록 모드 — 전체 너비)
  const renderSearchZone = () => (
    <>
      <View style={s.searchZone}>
        <View style={s.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="지역·헬스장 이름·시설 검색"
            value={query}
            onChangeText={(t) => { setQuery(t); setSuggestOpen(true); }}
            placeholderTextColor={D.textMuted}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSuggestOpen(false); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={16} color={D.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {suggestOpenNow && (
          <View style={s.suggestPanel}>{renderSuggestItems()}</View>
        )}
      </View>
      {renderRegionChip()}
    </>
  );

  return (
    <SafeAreaView style={s.container}>
      {viewMode === 'list' && (<>
      {/* 기준 위치 (탭하면 지역 선택) */}
      <TouchableOpacity style={s.locBar} onPress={() => router.push('/location-picker' as any)} activeOpacity={0.7}>
        <MaterialCommunityIcons name="map-marker" size={16} color={D.primary} />
        <Text style={s.locBarText} numberOfLines={1}>{selectedDong ? selectedDong : '현재 위치 기준'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={D.textSec} />
      </TouchableOpacity>

      {/* 통합 검색바 + 자동완성 + 선택지역 */}
      {renderSearchZone()}

      {/* 정렬 + 목록/지도 토글 */}
      <View style={s.sortBar}>
        <Text style={s.resultCount}>{filtered.length}개의 헬스장</Text>
        <View style={s.sortBarRight}>
          {viewMode === 'list' && (
            <TouchableOpacity style={s.sortBtn} onPress={() => setSortOpen(true)} activeOpacity={0.7}>
              <MaterialCommunityIcons name="sort" size={14} color={D.primary} />
              <Text style={s.sortBtnText}>{currentSort.label}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={D.textSec} />
            </TouchableOpacity>
          )}
          <View style={s.viewToggle}>
            <TouchableOpacity
              style={[s.toggleBtn, s.toggleBtnActive]}
              onPress={() => setViewMode('list')} activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={16} color={'#fff'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.toggleBtn}
              onPress={() => setViewMode('map')} activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="map-outline" size={16} color={D.textSec} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </>)}

      {viewMode === 'map' ? (
        <View style={s.mapWrap}>
          <GymMapView
            gyms={filtered}
            currentLocation={currentLocation}
            selectedGymId={selectedGymId}
            onSelectGym={setSelectedGymId}
            bottomInset={selectedMapGym ? 100 : 16}
            fitToGyms={query.trim().length > 0 || !!regionFilter}
          />

          {/* 지도 위 플로팅 상단: 위치·검색·토글 한 줄 */}
          <View pointerEvents="box-none" style={s.mapOverlayTop}>
            <View style={s.mapTopRow}>
              <TouchableOpacity style={s.mapLocChip} onPress={() => router.push('/location-picker' as any)} activeOpacity={0.8}>
                <MaterialCommunityIcons name="map-marker" size={14} color={D.primary} />
                <Text style={s.mapLocChipText} numberOfLines={1}>{selectedDong ? selectedDong : '현재 위치 기준'}</Text>
                <MaterialCommunityIcons name="chevron-down" size={14} color={D.textSec} />
              </TouchableOpacity>

              <View style={s.mapSearch}>
                <View style={s.mapSearchInput}>
                  <MaterialCommunityIcons name="magnify" size={16} color={D.textMuted} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="검색"
                    value={query}
                    onChangeText={(t) => { setQuery(t); setSuggestOpen(true); }}
                    placeholderTextColor={D.textMuted}
                  />
                  {query.length > 0 && (
                    <TouchableOpacity onPress={() => { setQuery(''); setSuggestOpen(false); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="close-circle" size={15} color={D.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                {suggestOpenNow && (
                  <View style={s.suggestPanelMap}>{renderSuggestItems()}</View>
                )}
              </View>

              <View style={s.viewToggle}>
                <TouchableOpacity style={s.toggleBtn} onPress={() => setViewMode('list')} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="format-list-bulleted" size={16} color={D.textSec} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.toggleBtn, s.toggleBtnActive]} onPress={() => setViewMode('map')} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="map-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            {renderRegionChip()}
          </View>
          {selectedMapGym && (
            <TouchableOpacity
              style={s.mapCard}
              onPress={() => router.push({ pathname: `/gym/${selectedMapGym.id}` as any, params: { from: 'trainer' } })}
              activeOpacity={0.9}
            >
              <Image source={{ uri: selectedMapGym.images[0] }} style={s.mapCardImg} />
              <View style={s.mapCardInfo}>
                <Text style={s.mapCardName} numberOfLines={1}>{selectedMapGym.name}</Text>
                <Text style={s.mapCardMeta} numberOfLines={1}>
                  ⭐ {selectedMapGym.rating.toFixed(1)} · {selectedMapGym.district} {selectedMapGym.dong} · 📍 {formatDistance(calculateDistance(currentLocation, selectedMapGym.coordinate))}
                </Text>
              </View>
              <Text style={s.mapCardArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
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
                    <Text style={s.dot}>·</Text>
                    <Text style={s.location}>📍 {formatDistance(calculateDistance(currentLocation, item.coordinate))}</Text>
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
      )}

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

  locBar: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 },
  locBarText: { fontSize: 15, fontWeight: '700', color: D.text, flexShrink: 1 },

  searchZone: { position: 'relative', zIndex: 20 },
  suggestPanel: {
    position: 'absolute', top: 56, left: 16, right: 16, zIndex: 30,
    backgroundColor: D.surface, borderRadius: 12, borderWidth: 1, borderColor: D.border,
    paddingVertical: 4, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
  },
  suggestItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  suggestText: { flex: 1, fontSize: 14, color: D.text },
  suggestTag: { fontSize: 11, fontWeight: '600', color: D.textMuted },
  regionChipRow: { paddingHorizontal: 16, paddingTop: 4 },
  regionChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    paddingLeft: 10, paddingRight: 8, paddingVertical: 6, borderRadius: 16,
    backgroundColor: D.primaryGlow, borderWidth: 1, borderColor: D.primary + '40',
  },
  regionChipText: { fontSize: 13, fontWeight: '600', color: D.text },

  sortBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sortBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewToggle: {
    flexDirection: 'row', backgroundColor: D.surface,
    borderRadius: 8, borderWidth: 1, borderColor: D.border, overflow: 'hidden',
  },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  toggleBtnActive: { backgroundColor: D.primary },
  resultCount: { fontSize: 13, color: D.textSec, fontWeight: '600' },

  mapWrap: { flex: 1, position: 'relative' },
  mapOverlayTop: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: 12,
  },
  mapTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16,
  },
  mapLocChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: D.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  mapLocChipText: { fontSize: 13, fontWeight: '700', color: D.text, flexShrink: 1 },
  mapSearch: { flex: 1, position: 'relative' },
  mapSearchInput: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: D.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  suggestPanelMap: {
    position: 'absolute', top: 46, left: 0, right: 0, zIndex: 30,
    backgroundColor: D.surface, borderRadius: 12, borderWidth: 1, borderColor: D.border,
    paddingVertical: 4, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
  },
  mapCard: {
    position: 'absolute', left: 16, right: 16, bottom: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.surface, borderRadius: 16, padding: 10,
    borderWidth: 1, borderColor: D.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  mapCardImg: { width: 60, height: 60, borderRadius: 12 },
  mapCardInfo: { flex: 1 },
  mapCardName: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 4 },
  mapCardMeta: { fontSize: 12, color: D.textSec },
  mapCardArrow: { fontSize: 24, color: D.textMuted, paddingRight: 6 },
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
