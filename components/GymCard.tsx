import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Gym } from '../types';
import { formatDistance } from '../utils/distance';
import { formatPrice } from '../utils/formatters';
import { COLORS } from '../utils/constants';
import StarRating from './StarRating';

interface GymCardProps {
  gym: Gym;
  onPress: () => void;
}

export default function GymCard({ gym, onPress }: GymCardProps) {
  const singlePrice = gym.pricing.find((p) => p.sessionType === 'single');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: gym.images[0] }} style={styles.image} />
      {gym.isPartner && (
        <View style={styles.partnerBadge}>
          <Text style={styles.partnerText}>파트너</Text>
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{gym.name}</Text>
        <Text style={styles.address} numberOfLines={1}>{gym.address}</Text>
        <View style={styles.row}>
          <StarRating rating={gym.rating} reviewCount={gym.reviewCount} size="small" />
          {gym.distance !== undefined && (
            <Text style={styles.distance}>{formatDistance(gym.distance)}</Text>
          )}
        </View>
        <View style={styles.footer}>
          <View style={styles.facilities}>
            {gym.facilities.slice(0, 3).map((f) => (
              <View key={f} style={styles.facilityTag}>
                <Text style={styles.facilityText}>{f}</Text>
              </View>
            ))}
            {gym.facilities.length > 3 && (
              <Text style={styles.moreText}>+{gym.facilities.length - 3}</Text>
            )}
          </View>
          {singlePrice && (
            <Text style={styles.price}>{formatPrice(singlePrice.facilityFee)}/회</Text>
          )}
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.surfaceElevated,
  },
  partnerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  partnerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    padding: 14,
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  address: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distance: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  facilities: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    flexWrap: 'wrap',
  },
  facilityTag: {
    backgroundColor: 'rgba(124,110,232,0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  facilityText: {
    fontSize: 11,
    color: COLORS.primary,
  },
  moreText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    alignSelf: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
  },
});
