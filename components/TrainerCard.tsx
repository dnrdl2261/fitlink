import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Trainer } from '../types';
import { formatPrice } from '../utils/formatters';
import { COLORS } from '../utils/constants';
import StarRating from './StarRating';

interface TrainerCardProps {
  trainer: Trainer;
  onPress: () => void;
}

export default function TrainerCard({ trainer, onPress }: TrainerCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image
        source={{ uri: trainer.profileImageUrl ?? 'https://picsum.photos/seed/default/200/200' }}
        style={styles.avatar}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{trainer.name} 트레이너</Text>
          <View style={styles.experienceBadge}>
            <Text style={styles.experience}>{trainer.experienceYears}년 경력</Text>
          </View>
        </View>
        <StarRating rating={trainer.rating} reviewCount={trainer.reviewCount} size="small" />
        <Text style={styles.bio} numberOfLines={1}>{trainer.bio}</Text>
        <View style={styles.tags}>
          {trainer.specializations.slice(0, 3).map((s) => (
            <View key={s} style={styles.specTag}>
              <Text style={styles.specText}>{s}</Text>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <Text style={styles.sessionCount}>{trainer.totalSessions.toLocaleString()}회 진행</Text>
          <Text style={styles.price}>{formatPrice(trainer.sessionPrice)}/회</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceElevated,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  experienceBadge: {
    backgroundColor: 'rgba(124,110,232,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  experience: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  bio: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  specs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  specTag: {
    backgroundColor: 'rgba(255,107,107,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  specText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  sessionCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
  },
});
