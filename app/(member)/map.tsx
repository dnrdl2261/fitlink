import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Platform, ActivityIndicator, Image, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFilteredGyms } from '../../hooks/useFilteredGyms';
import { useLocation } from '../../hooks/useLocation';
import { useLocationStore } from '../../store/locationStore';
import { formatDistance } from '../../utils/distance';
import { COLORS } from '../../utils/constants';
import StarRating from '../../components/StarRating';

let MapView: any = null;
let Marker: any = null;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
} catch (_) {}

export default function MapScreen() {
  const router = useRouter();
  const { gyms } = useFilteredGyms();
  const { hasPermission } = useLocation();
  const { currentLocation } = useLocationStore();

  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [listVisible, setListVisible] = useState(false);

  const kakaoMapRef     = useRef<any>(null);
  const mapContainerRef = useRef<any>(null);
  const userDotRef      = useRef<any>(null);
  const nativeMapRef    = useRef<any>(null);
  const markerEls       = useRef<Record<string, any>>({});

  const dragStartY = useRef(0);
  const swipeHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: any) => { dragStartY.current = e.nativeEvent.pageY; },
    onResponderRelease: (e: any) => { if (e.nativeEvent.pageY - dragStartY.current > 20) setListVisible(false); },
  };

  const selectedGym = gyms.find(g => g.id === selectedGymId);

  // ── 웹: 카카오맵 초기화
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const win = window as any;

    const initMap = () => {
      try {
        const wrapper = mapContainerRef.current;
        if (!wrapper) { setMapError('지도 컨테이너를 찾을 수 없습니다'); return; }

        const container = document.createElement('div');
        container.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0';
        wrapper.appendChild(container);

        const map = new win.kakao.maps.Map(container, {
          center: new win.kakao.maps.LatLng(37.5665, 126.978),
          level: 9,
        });
        kakaoMapRef.current = map;

        gyms.forEach(gym => {
          const el = document.createElement('div');
          el.style.cssText = [
            `background:${COLORS.primary}`,
            'color:#fff',
            'width:28px',
            'height:28px',
            'border-radius:50%',
            'font-size:14px',
            'text-align:center',
            'line-height:24px',
            'cursor:pointer',
            'box-shadow:0 2px 6px rgba(0,0,0,0.28)',
            'border:2.5px solid rgba(255,255,255,0.6)',
            'user-select:none',
            'transition:all 0.15s',
          ].join(';');
          el.textContent = '🏠';

          el.addEventListener('click', () => {
            setSelectedGymId(gym.id);
            map.panTo(new win.kakao.maps.LatLng(gym.coordinate.latitude, gym.coordinate.longitude));
          });

          new win.kakao.maps.CustomOverlay({
            map,
            position: new win.kakao.maps.LatLng(gym.coordinate.latitude, gym.coordinate.longitude),
            content: el,
            yAnchor: 1.5,
          });

          markerEls.current[gym.id] = el;
        });

        setMapReady(true);
      } catch (e: any) {
        setMapError('지도 초기화 오류: ' + (e?.message ?? String(e)));
      }
    };

    const waitAndBoot = () => {
      if (win.kakao?.maps) { try { win.kakao.maps.load(initMap); } catch (e: any) { setMapError(String(e)); } return; }
      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += 100;
        if (win.kakao?.maps) {
          clearInterval(timer);
          try { win.kakao.maps.load(initMap); } catch (e: any) { setMapError(String(e)); }
        } else if (elapsed >= 8000) {
          clearInterval(timer);
          setMapError('카카오맵 SDK 로드 타임아웃 — 페이지를 새로고침해주세요');
        }
      }, 100);
    };

    waitAndBoot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 웹: 내 위치
  useEffect(() => {
    if (Platform.OS !== 'web' || !hasPermission || !kakaoMapRef.current) return;
    const win = window as any;
    if (!win.kakao) return;
    const latlng = new win.kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
    kakaoMapRef.current.setCenter(latlng);
    kakaoMapRef.current.setLevel(7);
    if (userDotRef.current) userDotRef.current.setMap(null);
    const dot = document.createElement('div');
    dot.style.cssText = 'width:14px;height:14px;background:#4A90E2;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(74,144,226,0.18)';
    userDotRef.current = new win.kakao.maps.CustomOverlay({ map: kakaoMapRef.current, position: latlng, content: dot, zIndex: 20 });
  }, [hasPermission, currentLocation]);

  // ── 웹: 선택 마커 하이라이트
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    Object.entries(markerEls.current).forEach(([gymId, el]) => {
      const gym = gyms.find(g => g.id === gymId);
      if (!gym) return;
      const sel = gymId === selectedGymId;
      if (sel) {
        el.style.cssText = [
          'background:#FF6B6B',
          'color:#fff',
          'padding:6px 13px',
          'border-radius:20px',
          'font-size:12px',
          'font-weight:700',
          'white-space:nowrap',
          'cursor:pointer',
          'box-shadow:0 4px 14px rgba(255,107,107,0.45)',
          'border:2px solid rgba(255,255,255,0.4)',
          'user-select:none',
          'transition:all 0.15s',
          'z-index:100',
          'transform:translateY(-3px)',
        ].join(';');
        el.textContent = `🏠 ${gym.name}`;
      } else {
        el.style.cssText = [
          `background:${COLORS.primary}`,
          'color:#fff',
          'width:34px',
          'height:34px',
          'border-radius:50%',
          'font-size:17px',
          'text-align:center',
          'line-height:30px',
          'cursor:pointer',
          'box-shadow:0 2px 6px rgba(0,0,0,0.28)',
          'border:2.5px solid rgba(255,255,255,0.6)',
          'user-select:none',
          'transition:all 0.15s',
        ].join(';');
        el.textContent = '🏠';
      }
    });
  }, [selectedGymId, gyms]);

  // ── 네이티브: 위치 이동
  useEffect(() => {
    if (Platform.OS === 'web' || !hasPermission || !nativeMapRef.current) return;
    nativeMapRef.current.animateToRegion({ ...currentLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 800);
  }, [hasPermission, currentLocation]);

  const moveToMyLocation = () => {
    const win = window as any;
    if (!kakaoMapRef.current || !win.kakao) return;
    kakaoMapRef.current.setCenter(new win.kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude));
    kakaoMapRef.current.setLevel(6);
  };

  // ════════════════════════════════════════════════════════
  // 웹 렌더링
  // ════════════════════════════════════════════════════════
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {/* 풀스크린 지도 */}
        <View ref={mapContainerRef} style={StyleSheet.absoluteFillObject} />

        {!mapReady && !mapError && (
          <View style={styles.loadOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadText}>지도를 불러오는 중...</Text>
          </View>
        )}
        {mapError && (
          <View style={styles.loadOverlay}>
            <Text style={{ fontSize: 28 }}>⚠️</Text>
            <Text style={[styles.loadText, { color: COLORS.error, textAlign: 'center', paddingHorizontal: 24 }]}>{mapError}</Text>
          </View>
        )}

        {/* 상단 위치 배지 */}
        <SafeAreaView pointerEvents="box-none" style={styles.topOverlay}>
          <View style={styles.topBar}>
            <View style={styles.locChip}>
              {hasPermission === null
                ? <><ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 5 }} /><Text style={styles.locChipText}>위치 확인 중</Text></>
                : hasPermission
                  ? <Text style={styles.locChipText}>📍 현재 위치 기준</Text>
                  : <Text style={styles.locChipText}>⚠️ 서울 중심 기준</Text>
              }
            </View>
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>헬스장 {gyms.length}개</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* 내 위치 버튼 */}
        {hasPermission && mapReady && (
          <TouchableOpacity style={styles.myLocBtn} onPress={moveToMyLocation} activeOpacity={0.8}>
            <Text style={{ fontSize: 20 }}>⊙</Text>
          </TouchableOpacity>
        )}

        {/* 하단 목록 버튼 */}
        <View style={[styles.bottomBtns, selectedGym ? styles.bottomBtnsWithCard : null]}>
          <TouchableOpacity style={styles.listBtn} onPress={() => setListVisible(true)} activeOpacity={0.85}>
            <Text style={styles.listBtnText}>≡  목록 보기</Text>
          </TouchableOpacity>
        </View>

        {/* 선택된 헬스장 카드 */}
        {selectedGym && (
          <TouchableOpacity
            style={styles.selCard}
            onPress={() => router.push(`/gym/${selectedGym.id}` as any)}
            activeOpacity={0.88}
          >
            <Image source={{ uri: selectedGym.images[0] }} style={styles.selImg} />
            <View style={styles.selInfo}>
              <View style={styles.selNameRow}>
                <Text style={styles.selName} numberOfLines={1}>{selectedGym.name}</Text>
                {selectedGym.isPartner && <View style={styles.partnerBadge}><Text style={styles.partnerText}>파트너</Text></View>}
              </View>
              <StarRating rating={selectedGym.rating} reviewCount={selectedGym.reviewCount} size="small" />
              {selectedGym.distance !== undefined && (
                <Text style={styles.selDist}>📍 {formatDistance(selectedGym.distance)}</Text>
              )}
            </View>
            <Text style={styles.selArrow}>›</Text>
            <TouchableOpacity style={styles.selClose} onPress={(e) => { e.stopPropagation(); setSelectedGymId(null); }}>
              <Text style={styles.selCloseText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* 목록 모달 */}
        <Modal visible={listVisible} transparent animationType="slide" onRequestClose={() => setListVisible(false)}>
          <View style={styles.listModalOverlay}>
            <TouchableOpacity style={styles.listModalBg} onPress={() => setListVisible(false)} activeOpacity={1} />
            <View style={styles.listPanel}>
              <View {...swipeHandlers}>
                <View style={styles.listPanelHandle} />
                <View style={styles.listPanelHeader}>
                  <Text style={styles.listPanelTitle}>헬스장 {gyms.length}개{hasPermission ? ' · 가까운 순' : ''}</Text>
                </View>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {gyms.map(gym => (
                  <TouchableOpacity
                    key={gym.id}
                    style={[styles.gymRow, gym.id === selectedGymId && styles.gymRowSel]}
                    onPress={() => {
                      setSelectedGymId(gym.id);
                      setListVisible(false);
                      const win = window as any;
                      if (kakaoMapRef.current && win.kakao) {
                        kakaoMapRef.current.panTo(new win.kakao.maps.LatLng(gym.coordinate.latitude, gym.coordinate.longitude));
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: gym.images[0] }} style={styles.gymThumb} />
                    <View style={styles.gymInfo}>
                      <View style={styles.gymNameRow}>
                        <Text style={styles.gymName} numberOfLines={1}>{gym.name}</Text>
                        {gym.isPartner && <View style={styles.partnerBadge}><Text style={styles.partnerText}>파트너</Text></View>}
                      </View>
                      <Text style={styles.gymAddr} numberOfLines={1}>{gym.address}</Text>
                      <View style={styles.gymMeta}>
                        <StarRating rating={gym.rating} size="small" />
                        {gym.distance !== undefined && <Text style={styles.gymDist}>📍 {formatDistance(gym.distance)}</Text>}
                      </View>
                    </View>
                    <Text style={styles.gymArrow}>›</Text>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════
  // 네이티브 렌더링
  // ════════════════════════════════════════════════════════
  if (!MapView) return null;

  return (
    <View style={styles.container}>
      <MapView
        ref={nativeMapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ ...currentLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        showsUserLocation={hasPermission === true}
        showsMyLocationButton={false}
      >
        {gyms.map(gym => (
          <Marker key={gym.id} coordinate={gym.coordinate}
            onPress={() => setSelectedGymId(gym.id)}
            pinColor={gym.id === selectedGymId ? '#FF6B6B' : COLORS.primary}
            title={gym.name}
          />
        ))}
      </MapView>

      {selectedGym && (
        <TouchableOpacity
          style={styles.selCardNative}
          onPress={() => router.push(`/gym/${selectedGym.id}` as any)}
          activeOpacity={0.9}
        >
          <Image source={{ uri: selectedGym.images[0] }} style={styles.selImg} />
          <View style={styles.selInfo}>
            <Text style={styles.selName}>{selectedGym.name}</Text>
            <StarRating rating={selectedGym.rating} reviewCount={selectedGym.reviewCount} size="small" />
          </View>
          <Text style={styles.selArrow}>›</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.listBtnNative} onPress={() => setListVisible(true)}>
        <Text style={styles.listBtnText}>≡  목록 보기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8e8e8' },

  loadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadText: { fontSize: 14, color: COLORS.textSecondary },

  // 상단 오버레이
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'box-none' as any },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
  },
  locChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  locChipText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  countChip: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  countChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  // 내 위치 버튼
  myLocBtn: {
    position: 'absolute', right: 14, bottom: 130,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
  },

  // 하단 버튼
  bottomBtns: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  bottomBtnsWithCard: { bottom: 110 },
  listBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  listBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  // 선택 카드
  selCard: {
    position: 'absolute', bottom: 24, left: 14, right: 14,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 18,
    padding: 12, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  selCardNative: {
    position: 'absolute', bottom: 80, left: 14, right: 14,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 18, padding: 12, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  selImg: { width: 62, height: 62, borderRadius: 12, backgroundColor: COLORS.border },
  selInfo: { flex: 1, gap: 4 },
  selNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selName: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  selDist: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  selArrow: { fontSize: 22, color: COLORS.textSecondary, paddingRight: 4 },
  selClose: { padding: 6 },
  selCloseText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '700' },
  partnerBadge: { backgroundColor: COLORS.primary, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  partnerText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // 목록 모달
  listModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  listModalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  listPanel: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '72%', paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20,
  },
  listPanelHandle: { width: 36, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  listPanelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  listPanelTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  listPanelClose: { fontSize: 18, color: COLORS.textSecondary, padding: 4 },

  gymRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  gymRowSel: { backgroundColor: COLORS.primary + '0e', borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 13 },
  gymThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: COLORS.border },
  gymInfo: { flex: 1, gap: 3 },
  gymNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gymName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  gymAddr: { fontSize: 12, color: COLORS.textSecondary },
  gymMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gymDist: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  gymArrow: { fontSize: 18, color: COLORS.textSecondary },

  listBtnNative: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: '#fff', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
});
