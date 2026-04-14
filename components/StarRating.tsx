import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: 'small' | 'medium' | 'large';
}

export default function StarRating({ rating, reviewCount, size = 'medium' }: StarRatingProps) {
  const fontSize = size === 'small' ? 12 : size === 'large' ? 18 : 14;
  const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.ceil(rating));

  return (
    <View style={styles.container}>
      <Text style={[styles.stars, { fontSize }]}>
        {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      </Text>
      <Text style={[styles.rating, { fontSize }]}>{rating.toFixed(1)}</Text>
      {reviewCount !== undefined && (
        <Text style={[styles.count, { fontSize: fontSize - 2 }]}>({reviewCount})</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stars: {
    color: '#FFB300',
  },
  rating: {
    color: COLORS.text,
    fontWeight: '600',
  },
  count: {
    color: COLORS.textSecondary,
  },
});
