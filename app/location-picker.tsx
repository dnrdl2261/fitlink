import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  SafeAreaView, StyleSheet, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { useLocationStore } from '../store/locationStore';
import { REGION_DATA } from '../data/regions';
import { reverseGeocode, forwardGeocode } from '../utils/geocode';

type DongItem = { city: string; district: string; dong: string };

const ALL_DONGS: DongItem[] = Object.entries(REGION_DATA).flatMap(([city, districts]) =>
  Object.entries(districts).flatMap(([district, dongs]) =>
    dongs.map((dong) => ({ city, district, dong }))
  )
);

export default function LocationPickerScreen() {
  const router = useRouter();
  const { currentLocation, recentSearches, setLocation, setPermission, setSelectedDong, addRecentSearch, clearRecentSearches } =
    useLocationStore();

  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [confirmingMap, setConfirmingMap] = useState(false);

  const mapContainerRef = useRef<any>(null);
  const kakaoMapRef = useRef<any>(null);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return ALL_DONGS.filter(
      (d) => d.dong.includes(q) || d.district.includes(q) || d.city.includes(q)
    ).slice(0, 50);
  }, [query]);

  const selectDong = (dong: string) => {
    setSelectedDong(dong);
    addRecentSearch(dong);
    router.back();
    forwardGeocode(dong).then((coord) => {
      if (coord) {
        setLocation(coord);
        setPermission(true);
      }
    });
  };

  // ── 현위치로 설정
  const handleGPS = () => {
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        alert('이 브라우저에서는 위치 기능을 지원하지 않습니다');
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          setLocation({ latitude: coords.latitude, longitude: coords.longitude });
          setPermission(true);
          const dong = (await reverseGeocode(coords.latitude, coords.longitude)) || '현재 위치';
          setSelectedDong(dong);
          addRecentSearch(dong);
          setLocating(false);
          router.back();
        },
        () => {
          setLocating(false);
          setPermission(false);
          alert('위치 권한이 필요합니다. 브라우저 설정에서 위치 권한을 허용해주세요.');
        },
        { timeout: 10000 }
      );
    } else {
      handleGPSNative();
    }
  };

  const handleGPSNative = async () => {
    setLocating(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermission(false);
        setLocating(false);
        return;
      }
      setPermission(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const dong = (await reverseGeocode(pos.coords.latitude, pos.coords.longitude)) || '현재 위치';
      setSelectedDong(dong);
      addRecentSearch(dong);
      router.back();
    } catch {
      setLocating(false);
    }
  };

  // ── 지도에서 설정: 카카오맵 초기화
  useEffect(() => {
    if (!mapPickerVisible || Platform.OS !== 'web') return;

    let mapDiv: HTMLDivElement | null = null;

    const init = () => {
      const win = window as any;
      const wrapper = mapContainerRef.current;
      if (!wrapper || !win.kakao?.maps) return;

      mapDiv = document.createElement('div');
      mapDiv.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0';
      wrapper.appendChild(mapDiv);

      const map = new win.kakao.maps.Map(mapDiv, {
        center: new win.kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude),
        level: 5,
      });
      kakaoMapRef.current = map;
    };

    // Modal이 렌더 완료될 시간을 살짝 기다린 뒤 초기화
    const timer = setTimeout(() => {
      const win = window as any;
      if (win.kakao?.maps) {
        win.kakao.maps.load(init);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (mapDiv?.parentNode) mapDiv.parentNode.removeChild(mapDiv);
      kakaoMapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapPickerVisible]);

  // ── 지도 중심 좌표로 위치 확정
  const handleMapConfirm = async () => {
    if (!kakaoMapRef.current) return;
    setConfirmingMap(true);
    try {
      const center = kakaoMapRef.current.getCenter();
      const lat = center.getLat();
      const lng = center.getLng();
      setLocation({ latitude: lat, longitude: lng });
      const dong = (await reverseGeocode(lat, lng)) || '현재 위치';
      setSelectedDong(dong);
      addRecentSearch(dong);
      setMapPickerVisible(false);
      router.back();
    } catch {
      setConfirmingMap(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="chevron-left" size={30} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>위치 설정</Text>
        <View style={{ width: 46 }} />
      </View>

      {/* 검색바 */}
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="지역, 건물명, 지하철역"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 현위치 / 지도 버튼 */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleGPS} disabled={locating}>
          {locating
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <MaterialCommunityIcons name="crosshairs-gps" size={18} color={COLORS.primary} />
          }
          <Text style={styles.actionBtnText}>현위치로 설정</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => setMapPickerVisible(true)}>
          <MaterialCommunityIcons name="map-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionBtnText}>지도에서 설정</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* 검색 결과 or 최근 검색 */}
      {query.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.city}-${item.district}-${item.dong}`}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => selectDong(item.dong)}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={COLORS.textMuted} />
              <View style={styles.resultTextWrap}>
                <Text style={styles.resultDong}>{item.dong}</Text>
                <Text style={styles.resultSub}>{item.city} {item.district}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>검색 결과가 없어요</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <View style={styles.recentWrap}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>최근 검색 내역</Text>
            {recentSearches.length > 0 && (
              <TouchableOpacity onPress={clearRecentSearches}>
                <Text style={styles.recentClear}>내역 전체 삭제</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentSearches.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>최근 검색 내역이 없어요</Text>
            </View>
          ) : (
            recentSearches.map((dong) => (
              <TouchableOpacity key={dong} style={styles.recentItem} onPress={() => selectDong(dong)}>
                <MaterialCommunityIcons name="history" size={18} color={COLORS.textMuted} />
                <Text style={styles.recentDong}>{dong}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* 지도 피커 모달 (web only) */}
      {Platform.OS === 'web' && (
        <Modal
          visible={mapPickerVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setMapPickerVisible(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            {/* 헤더 */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setMapPickerVisible(false)} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="chevron-left" size={30} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>지도에서 위치 설정</Text>
              <View style={{ width: 46 }} />
            </View>

            {/* 안내 문구 */}
            <View style={styles.mapGuide}>
              <MaterialCommunityIcons name="gesture-tap" size={16} color={COLORS.textSecondary} />
              <Text style={styles.mapGuideText}>지도를 이동하여 원하는 위치에 핀을 맞추세요</Text>
            </View>

            {/* 지도 영역 */}
            <View style={{ flex: 1, position: 'relative' }}>
              <View ref={mapContainerRef} style={{ flex: 1 }} />

              {/* 중앙 고정 핀 */}
              <View style={styles.centerPin} pointerEvents="none">
                <Text style={{ fontSize: 36, lineHeight: 40 }}>📍</Text>
              </View>
            </View>

            {/* 확정 버튼 */}
            <View style={styles.mapConfirmWrap}>
              <TouchableOpacity
                style={[styles.mapConfirmBtn, confirmingMap && { opacity: 0.7 }]}
                onPress={handleMapConfirm}
                disabled={confirmingMap}
              >
                {confirmingMap
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.mapConfirmText}>이 위치로 설정</Text>
                }
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 16, marginBottom: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },

  actionRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  divider: { height: 8, backgroundColor: COLORS.surfaceSubtle },

  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  resultTextWrap: { flex: 1 },
  resultDong: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  resultSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  recentWrap: { flex: 1, paddingTop: 16 },
  recentHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 8,
  },
  recentTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  recentClear: { fontSize: 13, color: COLORS.textSecondary },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  recentDong: { fontSize: 15, color: COLORS.text },

  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },

  // 지도 피커
  mapGuide: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.primaryPale,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  mapGuideText: { fontSize: 13, color: COLORS.textSecondary },

  centerPin: {
    position: 'absolute',
    top: '50%' as any,
    left: '50%' as any,
    transform: [{ translateX: -18 }, { translateY: -40 }],
    pointerEvents: 'none' as any,
    zIndex: 100,
  },

  mapConfirmWrap: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  mapConfirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
  },
  mapConfirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
