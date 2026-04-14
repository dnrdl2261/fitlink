import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFilteredGyms } from '../../hooks/useFilteredGyms';
import { useLocation } from '../../hooks/useLocation';
import { useLocationStore } from '../../store/locationStore';
import { formatDistance } from '../../utils/distance';
import { formatPrice } from '../../utils/formatters';
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

  // 지도 탭 진입 시 직접 위치 권한 요청
  const { hasPermission } = useLocation();
  const { currentLocation } = useLocationStore();
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  const selectedGym = gyms.find((g) => g.id === selectedGymId);

  // 위치 확보 후 지도 이동
  useEffect(() => {
    if (hasPermission && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...currentLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 },
        800
      );
    }
  }, [hasPermission, currentLocation]);

  // 웹 또는 react-native-maps 미지원 환경 → 거리 정렬 리스트
  if (!MapView || Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        {/* 상태 배너 */}
        <View style={styles.webBanner}>
          {hasPermission === null ? (
            <>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.webBannerText}>위치 정보를 확인하는 중...</Text>
            </>
          ) : hasPermission ? (
            <>
              <Text style={styles.webBannerIcon}>📍</Text>
              <Text style={styles.webBannerText}>현재 위치 기준으로 정렬됨</Text>
            </>
          ) : (
            <>
              <Text style={styles.webBannerIcon}>⚠️</Text>
              <Text style={styles.webBannerText}>위치 권한 거부 — 서울 중심 기준 표시</Text>
            </>
          )}
        </View>

        <ScrollView style={styles.gymListFallback} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>주변 헬스장 ({gyms.length}개)</Text>
          {gyms.map((gym) => (
            <TouchableOpacity
              key={gym.id}
              style={styles.gymListItem}
              onPress={() => router.push(`/gym/${gym.id}`)}
            >
              <Image source={{ uri: gym.images[0] }} style={styles.gymThumb} />
              <View style={styles.gymInfo}>
                <View style={styles.gymNameRow}>
                  <Text style={styles.gymName}>{gym.name}</Text>
                  {gym.isPartner && (
                    <View style={styles.partnerBadge}>
                      <Text style={styles.partnerText}>파트너</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.gymAddress} numberOfLines={1}>{gym.address}</Text>
                <View style={styles.gymMeta}>
                  <StarRating rating={gym.rating} size="small" />
                  {gym.distance !== undefined && (
                    <Text style={styles.gymDistance}>📍 {formatDistance(gym.distance)}</Text>
                  )}
                </View>
                <Text style={styles.gymPrice}>
                  시설료 {formatPrice(gym.pricing.find((p) => p.sessionType === 'single')?.facilityFee ?? 0)}/회
                </Text>
              </View>
              <Text style={styles.gymArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 네이티브 앱 — 실제 지도
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          ...currentLocation,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={hasPermission === true}
        showsMyLocationButton={hasPermission === true}
        userInterfaceStyle="dark"
      >
        {gyms.map((gym) => (
          <Marker
            key={gym.id}
            coordinate={gym.coordinate}
            onPress={() => setSelectedGymId(gym.id)}
            pinColor={gym.id === selectedGymId ? COLORS.secondary : COLORS.primary}
            title={gym.name}
          />
        ))}
      </MapView>

      {/* 위치 확인 중 오버레이 */}
      {hasPermission === null && (
        <View style={styles.locatingOverlay}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.locatingText}>위치 확인 중...</Text>
        </View>
      )}

      {/* 선택된 헬스장 미리보기 */}
      {selectedGym && (
        <TouchableOpacity
          style={styles.gymPreview}
          onPress={() => router.push(`/gym/${selectedGym.id}`)}
          activeOpacity={0.9}
        >
          <Image source={{ uri: selectedGym.images[0] }} style={styles.previewImage} />
          <View style={styles.previewInfo}>
            <Text style={styles.previewName}>{selectedGym.name}</Text>
            <StarRating rating={selectedGym.rating} reviewCount={selectedGym.reviewCount} size="small" />
            {selectedGym.distance !== undefined && (
              <Text style={styles.previewDistance}>📍 {formatDistance(selectedGym.distance)}</Text>
            )}
          </View>
          <Text style={styles.previewArrow}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { flex: 1 },

  // 네이티브 오버레이
  locatingOverlay: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locatingText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },

  gymPreview: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  previewImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: COLORS.surfaceElevated },
  previewInfo: { flex: 1, gap: 4 },
  previewName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  previewDistance: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  previewArrow: { fontSize: 24, color: COLORS.textSecondary },

  // 웹 / 폴백
  webBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  webBannerIcon: { fontSize: 16 },
  webBannerText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },

  gymListFallback: { flex: 1 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  gymListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gymThumb: { width: 90, height: 90, backgroundColor: COLORS.surfaceElevated },
  gymInfo: { flex: 1, padding: 12, gap: 4 },
  gymNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gymName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  partnerBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  partnerText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  gymAddress: { fontSize: 11, color: COLORS.textSecondary },
  gymMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gymDistance: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  gymPrice: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  gymArrow: { fontSize: 20, color: COLORS.textSecondary, paddingRight: 12 },
});
