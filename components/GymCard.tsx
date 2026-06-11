import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Gym } from '../types';
import { formatDistance } from '../utils/distance';
import { COLORS } from '../utils/constants';
import StarRating from './StarRating';

interface GymCardProps {
  gym: Gym;
  onPress: () => void;
}

export default function GymCard({ gym, onPress }: GymCardProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.65}>
      {/* 텍스트 영역 (왼쪽) */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          {gym.isPartner && <View style={styles.partnerDot} />}
          <Text style={styles.name} numberOfLines={1}>{gym.name}</Text>
        </View>
        <Text style={styles.address} numberOfLines={1}>{gym.address}</Text>
        <View style={styles.meta}>
          <StarRating rating={gym.rating} reviewCount={gym.reviewCount} size="small" />
          {gym.distance !== undefined && (
            <Text style={styles.distance}>{formatDistance(gym.distance)}</Text>
          )}
        </View>
      </View>

      {/* 썸네일 (오른쪽) */}
      <Image source={{ uri: gym.images[0] }} style={styles.thumb} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderSubtle,
    gap: 14,
  },
  info: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  partnerDot: {
    width: 7, height: 7, borderRadius: 9999,
    backgroundColor: COLORS.primary,
  },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  address: { fontSize: 12, color: COLORS.textSecondary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 1 },
  distance: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  thumb: {
    width: 72, height: 72,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
  },
});
