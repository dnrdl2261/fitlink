import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, Image, useWindowDimensions, Modal, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MOCK_TRAINERS } from '../../data/trainers';
import { MOCK_GYMS } from '../../data/gyms';
import { Trainer } from '../../types';
import { COLORS } from '../../utils/constants';
import { useLocationStore } from '../../store/locationStore';
import { useAuthStore } from '../../store/authStore';
import { useFollowStore } from '../../store/followStore';
import { calculateDistance } from '../../utils/distance';
import { CITIES, getDistricts, getDongs } from '../../data/regions';

type ModalStep = 'district' | 'dong';
type SortType = 'recommend' | 'rating' | 'distance';

const SORT_LABELS: Record<SortType, string> = {
  recommend: '추천순',
  rating: '평점순',
  distance: '내주변',
};

function getPhotos(trainer: Trainer) {
  const s = trainer.id.replace('trainer_', '');
  return [
    trainer.profileImageUrl ?? `https://picsum.photos/seed/${s}a/200/260`,
    `https://picsum.photos/seed/${s}b/200/260`,
    `https://picsum.photos/seed/${s}c/200/260`,
  ];
}

function getPrimaryGym(trainer: Trainer) {
  return MOCK_GYMS.find(g => trainer.partnerGymIds.includes(g.id))?.name ?? null;
}

function getTrialPrice(price: number) {
  return Math.round(price * 0.4 / 1000) * 1000;
}

function getBadges(trainer: Trainer): string[] {
  const badges: string[] = [];
  if (trainer.trainingStyles?.includes('식단밀착관리')) badges.push('식단관리 제공');
  if (trainer.certifications.filter(c => c.verified).length >= 2) badges.push('검증 자격 보유');
  return badges.slice(0, 2);
}

export default function TrainerListScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const PHOTO_H = Math.round(width / 3 * 1.05);

  const { member } = useAuthStore();
  const { links, follow, unfollow } = useFollowStore();
  const { currentLocation, hasPermission } = useLocationStore();

  const [sortBy, setSortBy] = useState<SortType>('recommend');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [activeCity, setActiveCity] = useState('전체');
  const [activeDistrict, setActiveDistrict] = useState('전체');
  const [activeDong, setActiveDong] = useState('전체');
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [modalCity, setModalCity] = useState(CITIES[0]);
  const [modalStep, setModalStep] = useState<ModalStep | null>(null);
  const [modalDistrict, setModalDistrict] = useState('');

  // 사진 뷰어
  const [photoViewer, setPhotoViewer] = useState<{ photos: string[]; index: number } | null>(null);
  const [pvIdx, setPvIdx] = useState(0);
  const pvScrollRef = useRef<ScrollView>(null);

  const openViewer = (photos: string[], index: number) => {
    setPvIdx(index);
    setPhotoViewer({ photos, index });
  };

  useEffect(() => {
    if (!photoViewer) return;
    const timer = setTimeout(() => {
      pvScrollRef.current?.scrollTo({ x: photoViewer.index * width, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, [photoViewer, width]);

  const trainerDistances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of MOCK_TRAINERS) {
      const gyms = MOCK_GYMS.filter(g => t.partnerGymIds.includes(g.id));
      map[t.id] = gyms.length === 0 ? Infinity : Math.min(...gyms.map(g => calculateDistance(currentLocation, g.coordinate)));
    }
    return map;
  }, [currentLocation]);

  const filtered = useMemo(() => {
    let r = MOCK_TRAINERS;
    if (activeCity !== '전체') r = r.filter(t => t.address?.city === activeCity);
    if (activeDistrict !== '전체') r = r.filter(t => t.address?.district === activeDistrict);
    if (activeDong !== '전체') r = r.filter(t => t.address?.dong === activeDong);
    const sorted = [...r];
    if (sortBy === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'distance' && hasPermission) sorted.sort((a, b) => (trainerDistances[a.id] ?? Infinity) - (trainerDistances[b.id] ?? Infinity));
    else sorted.sort((a, b) => b.rating * Math.log(b.reviewCount + 1) - a.rating * Math.log(a.reviewCount + 1));
    return sorted;
  }, [activeCity, activeDistrict, activeDong, sortBy, trainerDistances, hasPermission]);

  const isFollowing = (id: string) => member ? links.some(l => l.followerId === member.id && l.followeeId === id) : false;
  const toggleFollow = (id: string) => {
    if (!member) return;
    isFollowing(id) ? unfollow(member.id, id) : follow(member.id, id);
  };

  const clearRegion = () => { setActiveCity('전체'); setActiveDistrict('전체'); setActiveDong('전체'); };
  const openRegion = () => { setModalStep(null); setModalDistrict(''); setRegionModalVisible(true); };

  const handleCitySelect = (c: string) => { setModalCity(c); setModalStep(null); setModalDistrict(''); };
  const handleSelectCityAll = () => { setActiveCity(modalCity); setActiveDistrict('전체'); setActiveDong('전체'); setRegionModalVisible(false); };
  const handleDistrictRow = (d: string) => { setModalDistrict(d); setModalStep('dong'); };
  const handleSelectDistrictAll = () => { setActiveCity(modalCity); setActiveDistrict(modalDistrict); setActiveDong('전체'); setRegionModalVisible(false); };
  const handleDongSelect = (d: string) => { setActiveCity(modalCity); setActiveDistrict(modalDistrict); setActiveDong(d); setRegionModalVisible(false); };

  const districts = getDistricts(modalCity);
  const dongs = getDongs(modalCity, modalDistrict);

  const renderItem = ({ item: t }: { item: Trainer }) => {
    const photos = getPhotos(t);
    const gym = getPrimaryGym(t);
    const liked = isFollowing(t.id);
    const badges = getBadges(t);
    const trial = getTrialPrice(t.sessionPrice);
    const region = [t.address?.city, t.address?.district].filter(Boolean).join(' ');

    return (
      <View style={s.card}>
        {/* 사진 3장 - 탭하면 프로필 이동 */}
        <TouchableOpacity activeOpacity={0.92} onPress={() => router.push(`/trainer/${t.id}`)}>
          <View style={[s.photoRow, { height: PHOTO_H }]}>
            <Image source={{ uri: photos[0] }} style={s.photo} resizeMode="cover" />
            <View style={s.photoDivider} />
            <Image source={{ uri: photos[1] }} style={s.photo} resizeMode="cover" />
            <View style={s.photoDivider} />
            <View style={s.photoLast}>
              <Image source={{ uri: photos[2] }} style={s.photo} resizeMode="cover" />
              <TouchableOpacity
                style={s.heartBtn}
                onPress={() => toggleFollow(t.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={17}
                  color={liked ? '#FF4D6D' : 'rgba(255,255,255,0.9)'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* 정보 - 탭하면 프로필 이동 */}
        <TouchableOpacity style={s.info} activeOpacity={0.7} onPress={() => router.push(`/trainer/${t.id}`)}>
          <Text style={s.name}>{t.name} 선생님</Text>

          <View style={s.metaRow}>
            <MaterialCommunityIcons name="star" size={12} color="#FBBF24" />
            <Text style={s.ratingVal}>{t.rating.toFixed(1)}</Text>
            <Text style={s.metaGray}> ({t.reviewCount})</Text>
            {t.experienceYears > 0 && <Text style={s.metaGray}> · 경력 {t.experienceYears}년</Text>}
            {gym ? <Text style={s.metaGray} numberOfLines={1}> · {gym}</Text> : null}
          </View>

          {region ? (
            <View style={s.regionRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={11} color="#bbb" />
              <Text style={s.regionText}>활동지역 {region}</Text>
            </View>
          ) : null}

          <Text style={s.tagline} numberOfLines={1}>{t.tagline}</Text>

          <View style={s.bottomRow}>
            <View style={s.badges}>
              {badges.map((b, i) => (
                <View key={i} style={[s.badge, i === 1 && s.badge2]}>
                  <Text style={[s.badgeText, i === 1 && s.badge2Text]}>{b}</Text>
                </View>
              ))}
            </View>
            <View style={s.priceBlock}>
              <Text style={s.price}>{t.sessionPrice.toLocaleString()}원</Text>
              <View style={s.trialRow}>
                <View style={s.trialDot} />
                <Text style={s.trialText}>1회 체험 {trial.toLocaleString()}원</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>

      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>트레이너 찾기</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 필터바 */}
      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterBarInner}>
          <TouchableOpacity style={s.filterPill} onPress={() => setSortModalVisible(true)}>
            <MaterialCommunityIcons name="tune-variant" size={12} color={COLORS.text} />
            <Text style={s.filterPillText}>{SORT_LABELS[sortBy]}</Text>
            <MaterialCommunityIcons name="chevron-down" size={12} color={COLORS.text} />
          </TouchableOpacity>

          <TouchableOpacity style={[s.filterPill, activeCity !== '전체' && s.filterPillOn]} onPress={openRegion}>
            <Text style={[s.filterPillText, activeCity !== '전체' && s.filterPillOnText]}>
              📍 {activeCity !== '전체' ? [activeCity, activeDistrict !== '전체' ? activeDistrict : ''].filter(Boolean).join(' ') : '지역'}
            </Text>
            {activeCity !== '전체' && (
              <TouchableOpacity onPress={e => { e.stopPropagation(); clearRegion(); }} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                <MaterialCommunityIcons name="close" size={11} color="#fff" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 목록 */}
      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyText}>해당 트레이너가 없습니다</Text>
          </View>
        }
      />

      {/* 정렬 드롭다운 */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <TouchableOpacity style={s.dimBg} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
          <View style={s.sortDropdown}>
            {(Object.entries(SORT_LABELS) as [SortType, string][]).map(([key, label]) => (
              <TouchableOpacity key={key} style={s.sortRow} onPress={() => { setSortBy(key); setSortModalVisible(false); }}>
                <Text style={[s.sortRowText, sortBy === key && s.sortRowTextOn]}>{label}</Text>
                {sortBy === key && <MaterialCommunityIcons name="check" size={15} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 지역 모달 */}
      <Modal visible={regionModalVisible} animationType="slide" transparent onRequestClose={() => setRegionModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setRegionModalVisible(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
              <Text style={s.modalTitle}>지역 선택</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={s.modalBody}>
              <ScrollView style={s.cityCol} showsVerticalScrollIndicator={false}>
                {CITIES.map(c => (
                  <TouchableOpacity key={c} style={[s.cityItem, modalCity === c && s.cityItemOn]} onPress={() => handleCitySelect(c)}>
                    <Text style={[s.cityText, modalCity === c && s.cityTextOn]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={s.distCol} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={s.distHeader} onPress={modalStep === 'dong' ? handleSelectDistrictAll : handleSelectCityAll}>
                  {modalStep === 'dong' && (
                    <TouchableOpacity onPress={() => setModalStep(null)} style={{ marginRight: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ fontSize: 20, color: COLORS.textSecondary }}>‹</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={s.distHeaderText}>{modalStep === 'dong' ? modalDistrict : modalCity}</Text>
                  <Text style={s.distHeaderAll}>전체 &gt;</Text>
                </TouchableOpacity>
                {(modalStep === 'dong' ? dongs : districts).map(item => (
                  <TouchableOpacity key={item} style={s.distItem} onPress={() => modalStep === 'dong' ? handleDongSelect(item) : handleDistrictRow(item)}>
                    <Text style={s.distText}>{item}</Text>
                    {modalStep !== 'dong' && <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>›</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* 사진 뷰어 모달 */}
      <Modal
        visible={photoViewer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoViewer(null)}
      >
        <View style={s.pvOverlay}>
          {/* 닫기 */}
          <TouchableOpacity style={s.pvCloseBtn} onPress={() => setPhotoViewer(null)}>
            <MaterialCommunityIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          {/* 인덱스 */}
          <View style={s.pvCounter}>
            <Text style={s.pvCounterText}>{pvIdx + 1} / {photoViewer?.photos.length ?? 0}</Text>
          </View>

          {/* 사진 슬라이드 */}
          <ScrollView
            ref={pvScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            scrollEventThrottle={50}
            onScroll={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              if (idx !== pvIdx) setPvIdx(idx);
            }}
            onMomentumScrollEnd={e => {
              setPvIdx(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
          >
            {(photoViewer?.photos ?? []).map((uri, idx) => (
              <View key={idx} style={[s.pvPage, { width }]}>
                <Image source={{ uri }} style={{ width, height: width * 1.3 }} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          {/* 점 인디케이터 */}
          <View style={s.pvDots}>
            {(photoViewer?.photos ?? []).map((_, i) => (
              <View key={i} style={[s.pvDot, i === pvIdx && s.pvDotActive]} />
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // 헤더
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5e5',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },

  // 필터바
  filterBar: {
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5e5',
  },
  filterBarInner: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 8 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff',
  },
  filterPillText: { fontSize: 12, fontWeight: '500', color: '#333' },
  filterPillOn: { backgroundColor: '#111', borderColor: '#111' },
  filterPillOnText: { color: '#fff', fontWeight: '600' },

  // 카드
  card: { backgroundColor: '#fff' },
  photoRow: { flexDirection: 'row', backgroundColor: '#000' },
  photo: { flex: 1 },
  photoDivider: { width: 2, backgroundColor: '#fff' },
  photoLast: { flex: 1, position: 'relative' },

  heartBtn: {
    position: 'absolute', top: 7, right: 7,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  info: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },

  name: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 3 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  ratingVal: { fontSize: 12, fontWeight: '700', color: '#111', marginLeft: 2 },
  metaGray: { fontSize: 11, color: '#888' },

  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 5 },
  regionText: { fontSize: 11, color: '#bbb' },

  tagline: { fontSize: 13, color: '#333', marginBottom: 10 },

  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  badges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginRight: 8, alignItems: 'center' },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: '#FFF3E0' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#E65100' },
  badge2: { backgroundColor: '#E8F5E9' },
  badge2Text: { color: '#2E7D32' },

  priceBlock: { alignItems: 'flex-end' },
  price: { fontSize: 17, fontWeight: '900', color: '#111' },
  trialRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  trialDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  trialText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },

  separator: { height: 8, backgroundColor: '#f2f2f2' },

  emptyWrap: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#999' },

  // 정렬 드롭다운
  dimBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', paddingTop: 100, paddingLeft: 14 },
  sortDropdown: {
    backgroundColor: '#fff', borderRadius: 10,
    minWidth: 130, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  sortRowText: { fontSize: 14, color: '#333' },
  sortRowTextOn: { fontWeight: '700', color: COLORS.primary },

  // 지역 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '85%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  modalClose: { fontSize: 17, color: '#333', fontWeight: '600' },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  modalBody: { flex: 1, flexDirection: 'row' },
  cityCol: { flex: 1, backgroundColor: '#f5f5f5', borderRightWidth: 1, borderRightColor: '#eee' },
  cityItem: { paddingVertical: 13, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cityItemOn: { backgroundColor: '#fff' },
  cityText: { fontSize: 13, color: '#888', fontWeight: '500' },
  cityTextOn: { color: '#111', fontWeight: '700' },
  distCol: { flex: 2, backgroundColor: '#fff' },
  distHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fafafa',
  },
  distHeaderText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111' },
  distHeaderAll: { fontSize: 12, color: '#888' },
  distItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  distText: { fontSize: 13, color: '#333' },

  // 사진 뷰어
  pvOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center' },
  pvCloseBtn: {
    position: 'absolute', top: 52, right: 18, zIndex: 20,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  pvCounter: { position: 'absolute', top: 58, alignSelf: 'center', zIndex: 20 },
  pvCounterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  pvPage: { justifyContent: 'center', alignItems: 'center' },
  pvDots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingBottom: 48, paddingTop: 20 },
  pvDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  pvDotActive: { backgroundColor: '#fff' },
});
