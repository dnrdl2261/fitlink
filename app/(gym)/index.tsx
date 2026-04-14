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
import { MOCK_GYMS } from '../../data/gyms';
import { formatPrice, formatDate, formatTime } from '../../utils/formatters';
import { COLORS, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../utils/constants';

export default function GymDashboard() {
  const router = useRouter();
  const { gymAdmin, logout } = useAuthStore();
  const { bookings, updateStatus } = useBookingStore();

  const gym = MOCK_GYMS.find((g) => g.id === 'gym_001');
  const gymBookings = bookings.filter((b) => b.gymId === 'gym_001');
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = gymBookings.filter((b) => b.sessionDate === today);
  const pendingBookings = gymBookings.filter((b) => b.status === 'pending');

  const thisMonthRevenue = gymBookings
    .filter((b) => b.status === 'completed' && b.sessionDate.startsWith('2026-04'))
    .reduce((sum, b) => sum + Math.round(b.payment.facilityFee * 0.9), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={[styles.header, { backgroundColor: COLORS.gym }]}>
          <View>
            <Text style={styles.headerSub}>관리자</Text>
            <Text style={styles.headerGym}>{gym?.name ?? '헬스장'}</Text>
          </View>
          <TouchableOpacity onPress={() => { logout(); router.replace('/login'); }}>
            <Text style={styles.switchText}>역할 전환</Text>
          </TouchableOpacity>
        </View>

        {/* 오늘 현황 */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderTopColor: COLORS.gym }]}>
            <Text style={styles.statEmoji}>📅</Text>
            <Text style={[styles.statNum, { color: COLORS.gym }]}>{todayBookings.length}</Text>
            <Text style={styles.statLabel}>오늘 예약</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.warning }]}>
            <Text style={styles.statEmoji}>⏳</Text>
            <Text style={[styles.statNum, { color: COLORS.warning }]}>{pendingBookings.length}</Text>
            <Text style={styles.statLabel}>승인 대기</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={[styles.statNum, { color: COLORS.success }]}>
              {Math.round((thisMonthRevenue || 1890000) / 10000)}만
            </Text>
            <Text style={styles.statLabel}>이번 달 매출</Text>
          </View>
        </View>

        {/* 승인 대기 예약 */}
        {pendingBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏳ 승인 대기 ({pendingBookings.length}건)</Text>
            {pendingBookings.slice(0, 3).map((b) => (
              <View key={b.id} style={styles.pendingCard}>
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingMember}>{b.memberName} 회원</Text>
                  <Text style={styles.pendingTrainer}>{b.trainerName} 트레이너</Text>
                  <Text style={styles.pendingTime}>
                    {formatDate(b.sessionDate)} {b.startTime}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => updateStatus(b.id, 'confirmed')}
                >
                  <Text style={styles.approveBtnText}>확정</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* 오늘 일정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘 일정</Text>
          {todayBookings.length === 0 ? (
            <Text style={styles.emptyText}>오늘 예약이 없습니다</Text>
          ) : (
            todayBookings.map((b) => {
              const statusColor = BOOKING_STATUS_COLORS[b.status];
              return (
                <View key={b.id} style={styles.sessionRow}>
                  <View style={[styles.sessionDot, { backgroundColor: statusColor }]} />
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTime}>{formatTime(b.startTime)}</Text>
                    <Text style={styles.sessionMembers}>
                      {b.memberName} + {b.trainerName} 트레이너
                    </Text>
                  </View>
                  <Text style={[styles.sessionStatus, { color: statusColor }]}>
                    {BOOKING_STATUS_LABELS[b.status]}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* 수익 요약 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수익 구조 (헬스장 몫)</Text>
          <View style={styles.revenueBox}>
            <View style={styles.revenueRow}>
              <Text style={styles.revenueLabel}>시설 이용료 수취</Text>
              <Text style={[styles.revenueValue, { color: COLORS.success }]}>시설료 × 90%</Text>
            </View>
            <View style={styles.revenueRow}>
              <Text style={styles.revenueLabel}>FitLink 수수료</Text>
              <Text style={styles.revenueValue}>(시설료 + PT비) × 10%</Text>
            </View>
            <View style={[styles.revenueRow, { marginTop: 8 }]}>
              <Text style={[styles.revenueLabel, { fontWeight: '700' }]}>이번 달 정산 예정</Text>
              <Text style={[styles.revenueValue, { color: COLORS.gym, fontWeight: '800', fontSize: 18 }]}>
                {formatPrice(thisMonthRevenue || 1890000)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerGym: { fontSize: 22, fontWeight: '800', color: '#fff' },
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
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  pendingInfo: { flex: 1 },
  pendingMember: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  pendingTrainer: { fontSize: 12, color: COLORS.textSecondary },
  pendingTime: { fontSize: 12, color: COLORS.warning, fontWeight: '600', marginTop: 2 },
  approveBtn: {
    backgroundColor: COLORS.gym,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  sessionInfo: { flex: 1 },
  sessionTime: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  sessionMembers: { fontSize: 12, color: COLORS.textSecondary },
  sessionStatus: { fontSize: 12, fontWeight: '700' },
  revenueBox: { gap: 10 },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueLabel: { fontSize: 14, color: COLORS.textSecondary },
  revenueValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
});
