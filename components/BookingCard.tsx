import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Booking } from '../types';
import { formatPrice } from '../utils/formatters';
import { COLORS, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, DAY_LABELS, WEEKDAY_ORDER } from '../utils/constants';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  onCancel?: () => void;
  onReview?: () => void;
  onRefund?: () => void;
  reviewDone?: boolean;
}

export default function BookingCard({ booking, onPress, onCancel, onReview, onRefund, reviewDone }: BookingCardProps) {
  const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? COLORS.textSecondary;
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const progressPct = booking.totalSessions > 0
    ? (booking.usedSessions / booking.totalSessions) * 100
    : 0;
  const daysLabel = WEEKDAY_ORDER
    .filter((d) => booking.schedule.daysOfWeek.includes(d))
    .map((d) => DAY_LABELS[d])
    .join('·');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.trainerName}>{booking.trainerName} 트레이너</Text>
          <Text style={styles.packageLabel}>{booking.totalSessions}회 패키지</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.sessionRow}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionCountLabel}>잔여 횟수</Text>
          <Text style={[styles.sessionCount, { color: booking.remainingSessions > 0 ? COLORS.primary : COLORS.textSecondary }]}>
            {booking.remainingSessions}
            <Text style={styles.sessionTotal}>/{booking.totalSessions}회</Text>
          </Text>
        </View>
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${100 - progressPct}%` as any }]} />
          </View>
          <Text style={styles.scheduleText}>매주 {daysLabel}</Text>
        </View>
      </View>

      {booking.status === 'completed' && (
        <TouchableOpacity
          style={[styles.reviewBtn, reviewDone && styles.reviewBtnDone]}
          onPress={reviewDone ? undefined : onReview}
          activeOpacity={reviewDone ? 1 : 0.7}
        >
          <Text style={[styles.reviewBtnText, reviewDone && styles.reviewBtnTextDone]}>
            {reviewDone ? '✓ 리뷰 작성 완료' : '리뷰 작성'}
          </Text>
        </TouchableOpacity>
      )}

      {booking.status === 'active' && onRefund && booking.remainingSessions > 0 && (
        <TouchableOpacity style={styles.refundBtn} onPress={onRefund} activeOpacity={0.7}>
          <Text style={styles.refundBtnText}>환불 신청 (잔여 {booking.remainingSessions}회)</Text>
        </TouchableOpacity>
      )}

      {booking.status === 'refunded' && booking.refundedAmount != null && (
        <View style={styles.refundedNote}>
          <Text style={styles.refundedNoteText}>{formatPrice(booking.refundedAmount)} 환불 완료</Text>
        </View>
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
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { gap: 3 },
  trainerName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  packageLabel: { fontSize: 13, color: COLORS.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderSubtle,
    marginVertical: 14,
  },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sessionInfo: { alignItems: 'center', minWidth: 64 },
  sessionCountLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  sessionCount: { fontSize: 26, fontWeight: '800' },
  sessionTotal: { fontSize: 14, fontWeight: '400', color: COLORS.textSecondary },
  progressWrap: { flex: 1, gap: 6 },
  progressBg: {
    height: 6, borderRadius: 3,
    backgroundColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  scheduleText: { fontSize: 12, color: COLORS.textSecondary },
  reviewBtn: {
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
  },
  reviewBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  reviewBtnDone: { borderColor: COLORS.border, backgroundColor: COLORS.background },
  reviewBtnTextDone: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  refundBtn: {
    marginTop: 14, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.error, alignItems: 'center',
  },
  refundBtnText: { color: COLORS.error, fontSize: 14, fontWeight: '600' },
  refundedNote: {
    marginTop: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#A855F715', alignItems: 'center',
  },
  refundedNoteText: { color: '#A855F7', fontSize: 13, fontWeight: '700' },
});
