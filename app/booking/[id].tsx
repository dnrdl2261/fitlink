import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBookingStore } from '../../store/bookingStore';
import { formatDate, formatTime, formatPrice } from '../../utils/formatters';
import { COLORS, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '../../utils/constants';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bookings, cancelBooking } = useBookingStore();
  const booking = bookings.find((b) => b.id === id);

  if (!booking) {
    return (
      <View style={styles.notFound}>
        <Text>예약 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? COLORS.textSecondary;
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

  const handleCancel = () => {
    Alert.alert('예약 취소', '정말 예약을 취소하시겠습니까?\n취소된 예약은 복구할 수 없습니다.', [
      { text: '아니오', style: 'cancel' },
      {
        text: '취소하기',
        style: 'destructive',
        onPress: () => {
          cancelBooking(booking.id);
          router.back();
        },
      },
    ]);
  };

  const endHour = parseInt(booking.startTime.split(':')[0]) + 1;
  const endTime = `${String(endHour).padStart(2, '0')}:00`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 상태 배너 */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.statusEmoji]}>
            {booking.status === 'confirmed' ? '✅' :
             booking.status === 'pending' ? '⏳' :
             booking.status === 'completed' ? '🏅' : '❌'}
          </Text>
          <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {/* 예약 정보 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>예약 정보</Text>
          <InfoRow label="헬스장" value={booking.gymName} />
          <InfoRow label="트레이너" value={`${booking.trainerName} 트레이너`} />
          <InfoRow label="날짜" value={formatDate(booking.sessionDate)} />
          <InfoRow label="시간" value={`${formatTime(booking.startTime)} ~ ${formatTime(endTime)}`} />
          {booking.notes && <InfoRow label="메모" value={booking.notes} />}
        </View>

        {/* 결제 내역 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>결제 내역</Text>
          <InfoRow label="헬스장 시설이용료" value={formatPrice(booking.payment.facilityFee)} />
          <InfoRow label="PT 비용" value={formatPrice(booking.payment.trainerFee)} />
          <InfoRow label="플랫폼 수수료" value={formatPrice(booking.payment.platformFee)} />
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>합계</Text>
            <Text style={styles.totalValue}>{formatPrice(booking.payment.totalAmount)}</Text>
          </View>
        </View>

        {/* Mock QR 코드 (확정된 경우) */}
        {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>입장 QR 코드</Text>
            <Text style={styles.qrNote}>헬스장 도착 시 이 화면을 보여주세요</Text>
            <View style={styles.qrBox}>
              <Text style={styles.qrEmoji}>▪️▫️▪️▫️▪️{'\n'}▫️▪️▫️▪️▫️{'\n'}▪️▫️▪️▫️▪️{'\n'}▫️▪️▫️▪️▫️{'\n'}▪️▫️▪️▫️▪️</Text>
              <Text style={styles.qrId}>#{booking.id.slice(-8).toUpperCase()}</Text>
            </View>
          </View>
        )}

        {/* 예약 번호 */}
        <Text style={styles.bookingId}>예약번호: {booking.id.toUpperCase()}</Text>
        <Text style={styles.createdAt}>예약일: {formatDate(booking.createdAt)}</Text>

        {canCancel && (
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
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statusEmoji: { fontSize: 40 },
  statusLabel: { fontSize: 20, fontWeight: '800' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  infoValue: { fontSize: 13, color: COLORS.text, fontWeight: '500', flex: 2, textAlign: 'right' },
  divider: { height: 1, backgroundColor: COLORS.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  qrNote: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  qrBox: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  qrEmoji: { fontSize: 28, textAlign: 'center', letterSpacing: 4, lineHeight: 36 },
  qrId: { fontSize: 16, fontWeight: '700', color: COLORS.text, letterSpacing: 2 },
  bookingId: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  createdAt: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: { color: COLORS.error, fontSize: 15, fontWeight: '700' },
});
