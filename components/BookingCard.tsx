import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Booking } from '../types';
import { formatDate, formatTime, formatPrice } from '../utils/formatters';
import { COLORS, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '../utils/constants';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  onCancel?: () => void;
}

export default function BookingCard({ booking, onPress, onCancel }: BookingCardProps) {
  const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? COLORS.textSecondary;
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.header}>
        <View>
          <Text style={styles.gymName}>{booking.gymName}</Text>
          <Text style={styles.trainerName}>{booking.trainerName} 트레이너</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>날짜</Text>
          <Text style={styles.detailValue}>{formatDate(booking.sessionDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>시간</Text>
          <Text style={styles.detailValue}>
            {formatTime(booking.startTime)} ~ {formatTime(booking.endTime)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>결제금액</Text>
          <Text style={[styles.detailValue, styles.price]}>
            {formatPrice(booking.payment.totalAmount)}
          </Text>
        </View>
      </View>

      {canCancel && onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>예약 취소</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gymName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  trainerName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  price: {
    color: COLORS.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
  },
});
