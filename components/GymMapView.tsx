import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Gym, GeoCoordinate } from '../types';
import { COLORS } from '../utils/constants';

let MapView: any = null;
let Marker: any = null;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
} catch (_) {}

interface Props {
  gyms: Gym[];
  currentLocation: GeoCoordinate;
  selectedGymId: string | null;
  onSelectGym: (id: string | null) => void;
  bottomInset?: number; // 현재위치 버튼이 하단 카드를 가리지 않도록 띄우는 높이
  fitToGyms?: boolean;  // true면 검색/필터 결과(gyms)에 맞춰 지도 영역을 자동 이동·줌
}

// 웹(카카오) 지도 — 멤버 지도와 동일한 초기화 패턴 사용
function WebMap({ gyms, currentLocation, selectedGymId, onSelectGym, bottomInset = 16, fitToGyms = false }: Props) {
  const wrapperRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const lastSelectRef = useRef(0); // 마커 선택 직후의 지도 click(해제) 무시용
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 지도 1회 초기화
  useEffect(() => {
    const win = window as any;
    let timer: any;

    const initMap = () => {
      try {
        const wrapper = wrapperRef.current;
        if (!wrapper) { setError('지도 컨테이너를 찾을 수 없습니다'); return; }
        const container = document.createElement('div');
        container.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0';
        wrapper.appendChild(container);
        mapRef.current = new win.kakao.maps.Map(container, {
          center: new win.kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude),
          level: 7,
        });
        // 지도 빈 곳 클릭 시 마커 선택 해제 (마커 선택 직후 300ms 내 발생한 click은 무시)
        win.kakao.maps.event.addListener(mapRef.current, 'click', () => {
          if (Date.now() - lastSelectRef.current < 300) return;
          onSelectGym(null);
        });
        setReady(true);
      } catch (e: any) {
        setError('지도 초기화 오류: ' + (e?.message ?? String(e)));
      }
    };

    if (win.kakao?.maps) { win.kakao.maps.load(initMap); return; }
    let elapsed = 0;
    timer = setInterval(() => {
      elapsed += 100;
      if (win.kakao?.maps) { clearInterval(timer); win.kakao.maps.load(initMap); }
      else if (elapsed >= 8000) { clearInterval(timer); setError('카카오맵 SDK 로드 타임아웃 — 새로고침해주세요'); }
    }, 100);
    return () => { if (timer) clearInterval(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 목록(필터/선택) 변경 시 마커 재생성
  useEffect(() => {
    const win = window as any;
    if (!ready || !mapRef.current || !win.kakao) return;
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];

    gyms.forEach(gym => {
      const sel = gym.id === selectedGymId;
      const el = document.createElement('div');
      el.style.cssText = sel
        ? 'background:#FF6B6B;color:#fff;padding:6px 13px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;box-shadow:0 4px 14px rgba(255,107,107,0.45);border:2px solid rgba(255,255,255,0.4);transform:translateY(-3px);z-index:100'
        : `background:${COLORS.primary};color:#fff;width:30px;height:30px;border-radius:50%;font-size:15px;text-align:center;line-height:26px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.28);border:2.5px solid rgba(255,255,255,0.6)`;
      el.textContent = sel ? `🏋️ ${gym.name}` : '🏋️';
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // 지도 클릭(선택 해제)으로 전파 방지
        lastSelectRef.current = Date.now();
        onSelectGym(gym.id);
        mapRef.current.panTo(new win.kakao.maps.LatLng(gym.coordinate.latitude, gym.coordinate.longitude));
      });
      const overlay = new win.kakao.maps.CustomOverlay({
        map: mapRef.current,
        position: new win.kakao.maps.LatLng(gym.coordinate.latitude, gym.coordinate.longitude),
        content: el,
        yAnchor: 1.4,
      });
      overlaysRef.current.push(overlay);
    });
  }, [gyms, selectedGymId, ready, onSelectGym]);

  // 기준 위치 변경 시 지도 중심 이동
  useEffect(() => {
    const win = window as any;
    if (!ready || !mapRef.current || !win.kakao) return;
    mapRef.current.setCenter(new win.kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude));
  }, [currentLocation, ready]);

  // 검색/필터 시 결과(gyms) 영역에 맞춰 지도 이동·줌
  useEffect(() => {
    const win = window as any;
    if (!ready || !mapRef.current || !win.kakao || !fitToGyms || gyms.length === 0) return;
    const bounds = new win.kakao.maps.LatLngBounds();
    gyms.forEach(g => bounds.extend(new win.kakao.maps.LatLng(g.coordinate.latitude, g.coordinate.longitude)));
    mapRef.current.setBounds(bounds);
  }, [gyms, fitToGyms, ready]);

  const recenter = () => {
    const win = window as any;
    if (mapRef.current && win.kakao)
      mapRef.current.setCenter(new win.kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude));
  };

  return (
    <View style={styles.fill}>
      <View ref={wrapperRef} style={StyleSheet.absoluteFillObject} />
      {!ready && !error && (
        <View style={styles.overlay}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      )}
      {error && (
        <View style={styles.overlay}><Text style={styles.errorText}>{error}</Text></View>
      )}
      {ready && (
        <TouchableOpacity style={[styles.myLocBtn, { bottom: bottomInset }]} onPress={recenter} activeOpacity={0.85}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// 네이티브(react-native-maps) 지도
function NativeMap({ gyms, currentLocation, selectedGymId, onSelectGym, bottomInset = 16, fitToGyms = false }: Props) {
  const mapRef = useRef<any>(null);
  useEffect(() => {
    if (!mapRef.current || !fitToGyms || gyms.length === 0) return;
    mapRef.current.fitToCoordinates(gyms.map(g => g.coordinate), {
      edgePadding: { top: 80, right: 60, bottom: 120, left: 60 }, animated: true,
    });
  }, [gyms, fitToGyms]);
  if (!MapView) return <View style={styles.fill} />;
  return (
    <View style={styles.fill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ ...currentLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        onPress={() => onSelectGym(null)}
      >
        {gyms.map(gym => (
          <Marker
            key={gym.id}
            coordinate={gym.coordinate}
            onPress={() => onSelectGym(gym.id)}
            pinColor={gym.id === selectedGymId ? '#FF6B6B' : COLORS.primary}
            title={gym.name}
          />
        ))}
      </MapView>
      <TouchableOpacity
        style={[styles.myLocBtn, { bottom: bottomInset }]}
        onPress={() => mapRef.current?.animateToRegion({ ...currentLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 600)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

export default function GymMapView(props: Props) {
  return Platform.OS === 'web' ? <WebMap {...props} /> : <NativeMap {...props} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, position: 'relative' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F9',
  },
  errorText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  myLocBtn: {
    position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6,
  },
});
