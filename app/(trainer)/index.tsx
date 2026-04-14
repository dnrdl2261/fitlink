import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { formatPrice, formatDate, formatTime } from '../../utils/formatters';
import { COLORS, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../utils/constants';

export default function TrainerDashboard() {
  const router = useRouter();
  const { trainer, logout } = useAuthStore();
  const { bookings } = useBookingStore();

  const trainerBookings = bookings.filter((b) => b.trainerId === 'trainer_001');
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = trainerBookings.filter((b) => b.sessionDate === today);
  const upcomingBookings = trainerBookings
    .filter((b) => b.sessionDate >= today && (b.status === 'confirmed' || b.status === 'pending'))
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
    .slice(0, 5);

  const thisMonthEarnings = trainerBookings
    .filter((b) => b.status === 'completed' && b.sessionDate.startsWith('2026-04'))
    .reduce((sum, b) => sum + b.payment.trainerFee * 0.9, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 환영 배너 */}
        <View style={styles.welcomeBanner}>
          <View>
            <Text style={styles.welcomeText}>안녕하세요 👋</Text>
            <Text style={styles.trainerName}>{trainer?.name} 트레이너님</Text>
          </View>
          <TouchableOpacity onPress={() => { logout(); router.replace('/login'); }}>
            <Text style={styles.switchText}>역할 전환</Text>
          </TouchableOpacity>
        </View>

        {/* 오늘 현황 카드 */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderTopColor: COLORS.primary }]}>
            <Text style={styles.statEmoji}>📅</Text>
            <Text style={[styles.statNum, { color: COLORS.primary }]}>{todayBookings.length}</Text>
            <Text style={styles.statLabel}>오늘 세션</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.secondary }]}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={[styles.statNum, { color: COLORS.secondary }]}>{formatPrice(Math.round(thisMonthEarnings / 10000))}만</Text>
            <Text style={styles.statLabel}>이번 달 수익</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.warning }]}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={[styles.statNum, { color: COLORS.warning }]}>{trainer?.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>평점</Text>
          </View>
        </View>

        {/* 오늘 일정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘 일정</Text>
          {todayBookings.length === 0 ? (
            <Text style={styles.emptyText}>오늘 예약된 세션이 없습니다</Text>
          ) : (
            todayBookings.map((b) => {
              const statusColor = BOOKING_STATUS_COLORS[b.status];
              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.sessionItem}
                  onPress={() => router.push(`/booking/${b.id}`)}
                >
                  <View style={[styles.timeBar, { backgroundColor: statusColor }]} />
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTime}>{formatTime(b.startTime)}</Text>
                    <Text style={styles.sessionMember}>{b.memberName} 회원</Text>
                    <Text style={styles.sessionGym}>{b.gymName}</Text>
                  </View>
                  <View style={[styles.sessionStatus, { backgroundColor: statusColor + '25' }]}>
                    <Text style={[styles.sessionStatusText, { color: statusColor }]}>
                      {BOOKING_STATUS_LABELS[b.status]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* 다가오는 예약 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>다가오는 예약</Text>
          {upcomingBookings.length === 0 ? (
            <Text style={styles.emptyText}>예정된 예약이 없습니다</Text>
          ) : (
            upcomingBookings.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.upcomingItem}
                onPress={() => router.push(`/booking/${b.id}`)}
              >
                <View style={styles.upcomingDate}>
                  <Text style={styles.upcomingMonth}>{b.sessionDate.slice(5, 7)}월</Text>
                  <Text style={styles.upcomingDay}>{b.sessionDate.slice(8, 10)}</Text>
                </View>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingMember}>{b.memberName} 회원</Text>
                  <Text style={styles.upcomingGym}>{b.gymName} · {b.startTime}</Text>
                </View>
                <Text style={styles.upcomingEarning}>
                  {formatPrice(Math.round(b.payment.trainerFee * 0.9))}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.secondary,
  },
  welcomeText: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  trainerName: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  switchText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'underline' },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statEmoji: { fontSize: 24 },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  section: {
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 12 },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timeBar: { width: 4, height: 50, borderRadius: 2 },
  sessionInfo: { flex: 1 },
  sessionTime: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sessionMember: { fontSize: 14, color: COLORS.text, marginTop: 2 },
  sessionGym: { fontSize: 12, color: COLORS.textSecondary },
  sessionStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  sessionStatusText: { fontSize: 12, fontWeight: '700' },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  upcomingDate: {
    width: 48,
    height: 52,
    backgroundColor: 'rgba(124,110,232,0.15)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingMonth: { fontSize: 11, color: COLORS.primary },
  upcomingDay: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  upcomingInfo: { flex: 1 },
  upcomingMember: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  upcomingGym: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  upcomingEarning: { fontSize: 14, fontWeight: '700', color: COLORS.success },
});
