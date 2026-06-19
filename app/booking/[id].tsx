import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBookingStore } from '../../store/bookingStore';
import { useReviewStore } from '../../store/reviewStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDate, formatTime, formatPrice } from '../../utils/formatters';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, DAY_LABELS } from '../../utils/constants';

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월→일 순서 (예약 폼과 통일)

const D = {
  bg:          '#EEF2F9',
  surface:     '#FFFFFF',
  primary:     '#4F63F5',
  primaryGlow: 'rgba(79,99,245,0.12)',
  text:        '#0F172A',
  textSec:     '#64748B',
  textMuted:   '#94A3B8',
  border:      '#E2E8F0',
  success:     '#10B981',
  error:       '#EF4444',
  amber:       '#F59E0B',
  amberPale:   'rgba(245,158,11,0.10)',
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bookings, cancelBooking } = useBookingStore();
  const { role, member } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const allReviews = useReviewStore((s) => s.reviews);
  const reviewedBookingIds = allReviews.map((r) => r.bookingId);
  const booking = bookings.find((b) => b.id === id);

  if (!booking) {
    return (
      <View style={styles.notFound}>
        <Text>예약 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? D.textSec;
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const progressPct = booking.totalSessions > 0
    ? (booking.usedSessions / booking.totalSessions) * 100
    : 0;
  const daysLabel = WEEKDAY_ORDER
    .filter((d) => booking.schedule.daysOfWeek.includes(d))
    .map((d) => DAY_LABELS[d])
    .join('·');

  const upcomingSessions = booking.sessions.filter((s) => s.status === 'scheduled').slice(0, 5);
  const completedSessions = booking.sessions.filter((s) => s.status === 'completed');

  const handleCancel = () => {
    Alert.alert(
      '예약 취소',
      '패키지 예약을 취소하시겠습니까?\n취소된 예약은 복구할 수 없습니다.',
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: () => {
            cancelBooking(booking.id);
            addNotification({
              type: 'booking_cancelled', targetRole: 'member', userId: member?.id ?? '',
              title: '예약이 취소되었습니다',
              body: `${booking.trainerName} 트레이너와의 PT 예약이 취소되었습니다.`,
              meta: { bookingId: booking.id },
            });
            router.back();
          },
        },
      ]
    );
  };

  const durationLabel =
    booking.schedule.duration === 30 ? '30분' :
    booking.schedule.duration === 60 ? '1시간' :
    booking.schedule.duration === 90 ? '1시간 30분' : '2시간';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* 상태 배너 */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '15' }]}>
          <Text style={styles.statusEmoji}>
            {booking.status === 'active' ? '🏋️' : booking.status === 'completed' ? '🏅' : '❌'}
          </Text>
          <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {/* 예약 정보 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>예약 정보</Text>
          <InfoRow label="트레이너" value={`${booking.trainerName} 트레이너`} />
          <InfoRow label="패키지" value={`${booking.totalSessions}회 패키지`} />
          <InfoRow label="운동 요일" value={`매주 ${daysLabel}요일`} />
          <InfoRow label="운동 시간" value={`${formatTime(booking.schedule.startTime)} (${durationLabel})`} />
          <InfoRow label="시작일" value={formatDate(booking.startDate)} />
          {booking.notes && <InfoRow label="메모" value={booking.notes} />}
        </View>

        {/* 세션 진행 현황 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>세션 진행 현황</Text>
          <View style={styles.progressSection}>
            <View style={styles.progressNumbers}>
              <View style={styles.progressNum}>
                <Text style={styles.progressNumVal}>{booking.usedSessions}</Text>
                <Text style={styles.progressNumLabel}>완료</Text>
              </View>
              <View style={styles.progressNum}>
                <Text style={[styles.progressNumVal, { color: D.primary }]}>{booking.remainingSessions}</Text>
                <Text style={styles.progressNumLabel}>잔여</Text>
              </View>
              <View style={styles.progressNum}>
                <Text style={styles.progressNumVal}>{booking.totalSessions}</Text>
                <Text style={styles.progressNumLabel}>전체</Text>
              </View>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
            </View>
            <Text style={styles.progressCaption}>
              {booking.totalSessions}회 중 {booking.usedSessions}회 완료
            </Text>
          </View>
        </View>

        {/* 결제 내역 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>결제 내역</Text>
          <InfoRow label="1회당 금액" value={formatPrice(booking.pricePerSession)} />
          <InfoRow label="패키지 횟수" value={`${booking.totalSessions}회`} />
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>총 결제 금액</Text>
            <Text style={styles.totalValue}>{formatPrice(booking.totalAmount)}</Text>
          </View>
        </View>

        {/* 예정 세션 */}
        {upcomingSessions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>예정 세션</Text>
            {upcomingSessions.map((s, i) => (
              <View key={s.id} style={styles.sessionItem}>
                <View style={[styles.sessionDot, { backgroundColor: D.primary }]} />
                <View style={styles.sessionItemContent}>
                  <Text style={styles.sessionDate}>{formatDate(s.date)}</Text>
                  <Text style={styles.sessionTime}>{formatTime(s.startTime)} ~ {formatTime(s.endTime)}</Text>
                </View>
                {i === 0 && (
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextBadgeText}>다음</Text>
                  </View>
                )}
              </View>
            ))}
            {booking.sessions.filter(s => s.status === 'scheduled').length > 5 && (
              <Text style={styles.moreText}>
                외 {booking.sessions.filter(s => s.status === 'scheduled').length - 5}개 세션
              </Text>
            )}
          </View>
        )}

        {/* 완료된 세션 */}
        {completedSessions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>완료된 세션 ({completedSessions.length}회)</Text>
            {completedSessions.slice(-3).reverse().map((s) => (
              <View key={s.id} style={styles.sessionItem}>
                <MaterialCommunityIcons name="check-circle" size={16} color={D.success} />
                <View style={styles.sessionItemContent}>
                  <Text style={[styles.sessionDate, { color: D.textSec }]}>{formatDate(s.date)}</Text>
                  <Text style={[styles.sessionTime, { color: D.textSec }]}>{formatTime(s.startTime)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.bookingId}>예약번호: {booking.id.toUpperCase()}</Text>
        <Text style={styles.createdAt}>예약일: {formatDate(booking.createdAt.split('T')[0])}</Text>

        {/* 영수증 버튼 */}
        <TouchableOpacity
          style={styles.receiptBtn}
          onPress={() => router.push(`/booking/receipt?id=${booking.id}` as any)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="receipt-outline" size={18} color={D.primary} />
          <Text style={styles.receiptBtnText}>영수증 보기</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={D.primary} />
        </TouchableOpacity>

        {/* 후기 작성 버튼 */}
        {role === 'member' && booking.usedSessions > 0 && !reviewedBookingIds.includes(booking.id) && (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => router.push({
              pathname: '/review/write',
              params: { trainerId: booking.trainerId, trainerName: booking.trainerName, bookingId: booking.id },
            } as any)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="star-plus-outline" size={18} color="#fff" />
            <Text style={styles.reviewBtnText}>후기 작성하기</Text>
          </TouchableOpacity>
        )}
        {role === 'member' && booking.usedSessions > 0 && reviewedBookingIds.includes(booking.id) && (
          <View style={styles.reviewedBadge}>
            <MaterialCommunityIcons name="check-circle" size={16} color={D.success} />
            <Text style={styles.reviewedText}>후기를 작성했습니다</Text>
          </View>
        )}

        {booking.status === 'active' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>예약 취소</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  statusBanner: {
    borderRadius: 20, padding: 26,
    alignItems: 'center', gap: 10,
  },
  statusEmoji: { fontSize: 46 },
  statusLabel: { fontSize: 22, fontWeight: '800' },

  card: {
    backgroundColor: D.surface, borderRadius: 20,
    padding: 18, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: D.text, marginBottom: 4 },

  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel: { fontSize: 13, color: D.textSec, flex: 1 },
  infoValue: { fontSize: 13, color: D.text, fontWeight: '500', flex: 2, textAlign: 'right' },

  divider:    { height: 1, backgroundColor: D.border },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: D.text },
  totalValue: { fontSize: 22, fontWeight: '800', color: D.primary },

  progressSection: { gap: 10 },
  progressNumbers: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: D.bg, borderRadius: 14, padding: 16,
  },
  progressNum:      { alignItems: 'center', gap: 4 },
  progressNumVal:   { fontSize: 26, fontWeight: '800', color: D.text },
  progressNumLabel: { fontSize: 12, color: D.textSec },
  progressBg: {
    height: 8, borderRadius: 4,
    backgroundColor: D.border, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 4, backgroundColor: D.primary,
  },
  progressCaption: { fontSize: 12, color: D.textSec, textAlign: 'center' },

  sessionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
  },
  sessionDot:         { width: 8, height: 8, borderRadius: 4 },
  sessionItemContent: { flex: 1 },
  sessionDate:        { fontSize: 14, fontWeight: '600', color: D.text },
  sessionTime:        { fontSize: 12, color: D.textSec, marginTop: 1 },

  nextBadge: {
    backgroundColor: D.primaryGlow,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  nextBadgeText: { fontSize: 11, fontWeight: '700', color: D.primary },
  moreText:  { fontSize: 12, color: D.textSec, textAlign: 'center', marginTop: 4 },
  bookingId: { fontSize: 12, color: D.textMuted, textAlign: 'center' },
  createdAt: { fontSize: 12, color: D.textMuted, textAlign: 'center' },

  receiptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14,
    backgroundColor: D.primaryGlow, borderWidth: 1.5, borderColor: D.primary + '35',
  },
  receiptBtnText: { fontSize: 14, fontWeight: '600', color: D.primary, flex: 1 },

  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#F59E0B', marginTop: 8,
    shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  reviewBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  reviewedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: D.success + '12',
    borderWidth: 1, borderColor: D.success + '30', marginTop: 8,
  },
  reviewedText: { color: D.success, fontSize: 14, fontWeight: '600' },

  cancelBtn: {
    paddingVertical: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: D.error + '60',
    backgroundColor: D.error + '08',
    alignItems: 'center', marginTop: 8,
  },
  cancelText: { color: D.error, fontSize: 15, fontWeight: '700' },
});
