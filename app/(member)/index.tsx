import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import GymCard from '../../components/GymCard';
import { useFilteredGyms } from '../../hooks/useFilteredGyms';
import { useLocation } from '../../hooks/useLocation';
import { COLORS } from '../../utils/constants';

const FILTERS = ['전체', '파트너만', '5km 이내', '10km 이내'];

export default function MemberHomeScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('전체');
  const { hasPermission } = useLocation();

  const filterOptions =
    activeFilter === '파트너만'
      ? { partnerOnly: true }
      : activeFilter === '5km 이내'
      ? { maxDistance: 5 }
      : activeFilter === '10km 이내'
      ? { maxDistance: 10 }
      : {};

  const { gyms, searchQuery, setSearchQuery } = useFilteredGyms(filterOptions);

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="헬스장 이름, 주소, 시설 검색"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      {/* 위치 알림 */}
      {hasPermission === false && (
        <View style={styles.locationBanner}>
          <Text style={styles.locationBannerText}>
            📍 위치 권한이 없어 서울 중심가 기준으로 거리를 표시합니다
          </Text>
        </View>
      )}

      {/* 필터 탭 */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 헬스장 목록 */}
      <FlatList
        data={gyms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GymCard gym={item} onPress={() => router.push(`/gym/${item.id}`)} />
        )}
        ListHeaderComponent={
          <Text style={styles.resultCount}>총 {gyms.length}개 헬스장</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>조건에 맞는 헬스장이 없습니다</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  locationBannerText: {
    fontSize: 12,
    color: COLORS.warning,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  resultCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
