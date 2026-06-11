import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Trainer } from '../types';
import { formatDistance } from '../utils/distance';
import { formatPrice } from '../utils/formatters';
import { COLORS } from '../utils/constants';

interface TrainerCardProps {
  trainer: Trainer;
  onPress: () => void;
  distance?: number;
}

const SPEC_COLORS: Record<string, { bg: string; text: string }> = {
  '체중감량':      { bg: '#FEF3C7', text: '#D97706' },
  '근육증가':      { bg: '#DBEAFE', text: '#2563EB' },
  '재활':          { bg: '#D1FAE5', text: '#059669' },
  '체력향상':      { bg: '#EDE9FE', text: '#7C3AED' },
  '크로스핏':      { bg: '#FEE2E2', text: '#DC2626' },
  '필라테스':      { bg: '#FCE7F3', text: '#DB2777' },
  '요가':          { bg: '#ECFDF5', text: '#10B981' },
  '스포츠퍼포먼스':{ bg: '#FFF7ED', text: '#EA580C' },
};

export default function TrainerCard({ trainer, onPress, distance }: TrainerCardProps) {
  const isMale = trainer.gender === 'male';
  const specs = trainer.specializations.slice(0, 2);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.72}>
      {/* 원형 프로필 사진 */}
      <Image
        source={{ uri: trainer.profileImageUrl ?? `https://picsum.photos/seed/${trainer.id}/200/200` }}
        style={styles.avatar}
      />

      {/* 정보 영역 */}
      <View style={styles.info}>
        {/* 이름 + 성별 뱃지 */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{trainer.name}</Text>
          <View style={[styles.genderBadge, { backgroundColor: isMale ? '#DBEAFE' : '#FCE7F3' }]}>
            <Text style={[styles.genderText, { color: isMale ? '#2563EB' : '#DB2777' }]}>
              {isMale ? '남' : '여'}
            </Text>
          </View>
          <Text style={styles.exp}>{trainer.experienceYears}년</Text>
        </View>

        {/* 전문 분야 칩 */}
        <View style={styles.specRow}>
          {specs.map((s) => {
            const col = SPEC_COLORS[s] ?? { bg: '#F3F4F6', text: '#6B7280' };
            return (
              <View key={s} style={[styles.specChip, { backgroundColor: col.bg }]}>
                <Text style={[styles.specText, { color: col.text }]}>{s}</Text>
              </View>
            );
          })}
        </View>

        {/* 위치 */}
        {trainer.address && (
          <Text style={styles.location} numberOfLines={1}>
            📍 {[trainer.address.city, trainer.address.district].filter(Boolean).join(' ')}
            {distance !== undefined ? `  ·  ${formatDistance(distance)}` : ''}
          </Text>
        )}

        {/* 하단: 별점 + 가격 */}
        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.ratingNum}>{trainer.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCnt}>({trainer.reviewCount})</Text>
          </View>
          <Text style={styles.price}>{formatPrice(trainer.sessionPrice)}<Text style={styles.priceSub}>/회</Text></Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
    gap: 14,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3F4F6',
  },
  info: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '800', color: '#111' },
  genderBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6,
  },
  genderText: { fontSize: 10, fontWeight: '700' },
  exp: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  specRow: { flexDirection: 'row', gap: 6 },
  specChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12,
  },
  specText: { fontSize: 11, fontWeight: '700' },
  location: { fontSize: 11, color: '#9CA3AF' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { color: '#FBBF24', fontSize: 13 },
  ratingNum: { fontSize: 13, fontWeight: '700', color: '#111' },
  reviewCnt: { fontSize: 11, color: '#9CA3AF' },
  price: { fontSize: 15, fontWeight: '900', color: COLORS.primary },
  priceSub: { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },
});
