import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import TrainerCard from '../../components/TrainerCard';
import { MOCK_TRAINERS } from '../../data/trainers';
import { Specialization } from '../../types';
import { COLORS } from '../../utils/constants';

const SPECS: (Specialization | '전체')[] = [
  '전체', '체중감량', '근육증가', '재활', '필라테스', '크로스핏', '요가', '체력향상', '스포츠퍼포먼스',
];

const REGIONS: ('전체' | '서울' | '부산')[] = ['전체', '서울', '부산'];

export default function TrainersScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSpec, setActiveSpec] = useState<Specialization | '전체'>('전체');
  const [activeRegion, setActiveRegion] = useState<'전체' | '서울' | '부산'>('전체');

  const filtered = useMemo(() => {
    let result = MOCK_TRAINERS;
    if (activeRegion !== '전체') {
      result = result.filter((t) => t.region === activeRegion);
    }
    if (activeSpec !== '전체') {
      result = result.filter((t) => t.specializations.includes(activeSpec as Specialization));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.bio.toLowerCase().includes(q) ||
          t.specializations.some((s) => s.includes(q))
      );
    }
    return result.sort((a, b) => b.rating - a.rating);
  }, [searchQuery, activeSpec, activeRegion]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="트레이너 이름, 전문분야 검색"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      {/* 지역 필터 */}
      <View style={styles.regionContainer}>
        <View style={styles.regionRow}>
          {REGIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.regionChip, activeRegion === r && styles.regionChipActive]}
              onPress={() => setActiveRegion(r)}
            >
              <Text style={[styles.regionChipText, activeRegion === r && styles.regionChipTextActive]}>
                {r === '전체' ? '전체 지역' : `📍 ${r}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 전문분야 필터 */}
      <View style={styles.specContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.specRow}>
            {SPECS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.specChip, activeSpec === item && styles.specChipActive]}
                onPress={() => setActiveSpec(item)}
              >
                <Text style={[styles.specText, activeSpec === item && styles.specTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 트레이너 목록 */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrainerCard trainer={item} onPress={() => router.push(`/trainer/${item.id}`)} />
        )}
        ListHeaderComponent={
          <Text style={styles.resultCount}>총 {filtered.length}명의 트레이너</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>해당 분야의 트레이너가 없습니다</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  regionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  regionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  regionChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  regionChipActive: {
    backgroundColor: '#388E3C',
    borderColor: '#388E3C',
  },
  regionChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  regionChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  specContainer: {
    paddingBottom: 10,
  },
  specRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  specChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  specChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  specText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  specTextActive: { color: '#fff', fontWeight: '700' },
  resultCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listContent: { paddingBottom: 20 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
