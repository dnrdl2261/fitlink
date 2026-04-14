import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useBookingStore } from '../../store/bookingStore';
import { formatPrice } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';

export default function EarningsScreen() {
  const { bookings } = useBookingStore();

  const completedBookings = bookings.filter(
    (b) => b.trainerId === 'trainer_001' && b.status === 'completed'
  );

  const stats = useMemo(() => {
    const totalEarnings = completedBookings.reduce(
      (sum, b) => sum + Math.round(b.payment.trainerFee * 0.9),
      0
    );
    const thisMonth = completedBookings
      .filter((b) => b.sessionDate.startsWith('2026-04'))
      .reduce((sum, b) => sum + Math.round(b.payment.trainerFee * 0.9), 0);
    const lastMonth = completedBookings
      .filter((b) => b.sessionDate.startsWith('2026-03'))
      .reduce((sum, b) => sum + Math.round(b.payment.trainerFee * 0.9), 0);

    return { totalEarnings, thisMonth, lastMonth, sessionCount: completedBookings.length };
  }, [completedBookings]);

  const monthlyData = [
    { month: '1월', amount: 3200000 },
    { month: '2월', amount: 3800000 },
    { month: '3월', amount: 4100000 },
    { month: '4월', amount: stats.thisMonth || 4200000 },
  ];
  const maxAmount = Math.max(...monthlyData.map((d) => d.amount));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 요약 카드 */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>이번 달 수익</Text>
          <Text style={styles.summaryAmount}>{formatPrice(stats.thisMonth || 4200000)}</Text>
          <Text style={styles.summaryNote}>지난 달 대비 +{formatPrice(Math.abs((stats.thisMonth || 4200000) - (stats.lastMonth || 100000)))} 증가</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.sessionCount + 28}회</Text>
              <Text style={styles.statLabel}>이번 달 세션</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatPrice(Math.round((stats.thisMonth || 4200000) / 31))}원</Text>
              <Text style={styles.statLabel}>1회 평균</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>10%</Text>
              <Text style={styles.statLabel}>플랫폼 수수료</Text>
            </View>
          </View>
        </View>

        {/* 월별 수익 차트 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>월별 수익 추이 (2026년)</Text>
          <View style={styles.chart}>
            {monthlyData.map((d) => {
              const barHeight = (d.amount / maxAmount) * 120;
              return (
                <View key={d.month} style={styles.barContainer}>
                  <Text style={styles.barAmount}>{Math.round(d.amount / 10000)}만</Text>
                  <View style={[styles.bar, { height: barHeight }]} />
                  <Text style={styles.barMonth}>{d.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 최근 수입 내역 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 수입 내역</Text>
          {completedBookings.slice(0, 8).map((b) => (
            <View key={b.id} style={styles.earningItem}>
              <View style={styles.earningIcon}>
                <Text style={styles.earningEmoji}>💰</Text>
              </View>
              <View style={styles.earningInfo}>
                <Text style={styles.earningMember}>{b.memberName} 회원</Text>
                <Text style={styles.earningGym}>{b.gymName} · {b.sessionDate}</Text>
              </View>
              <View style={styles.earningAmounts}>
                <Text style={styles.earningNet}>
                  +{formatPrice(Math.round(b.payment.trainerFee * 0.9))}
                </Text>
                <Text style={styles.earningGross}>
                  총 {formatPrice(b.payment.trainerFee)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 수익 구조 안내 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수익 구조 안내</Text>
          <View style={styles.feeBox}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>회원 총 결제</Text>
              <Text style={styles.feeValue}>PT비 + 시설료 + 수수료</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>트레이너 수취</Text>
              <Text style={[styles.feeValue, { color: COLORS.success }]}>PT비 × 90%</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>플랫폼 수수료</Text>
              <Text style={styles.feeValue}>(PT비 + 시설료) × 10%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  summaryCard: {
    backgroundColor: COLORS.secondary,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  summaryAmount: { fontSize: 36, fontWeight: '900', color: '#fff' },
  summaryNote: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  statRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  section: {
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
    paddingTop: 20,
  },
  barContainer: { alignItems: 'center', gap: 4, width: 60 },
  barAmount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  bar: { width: 36, backgroundColor: COLORS.secondary, borderRadius: 6 },
  barMonth: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  earningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74,222,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningEmoji: { fontSize: 20 },
  earningInfo: { flex: 1 },
  earningMember: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  earningGym: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  earningAmounts: { alignItems: 'flex-end' },
  earningNet: { fontSize: 15, fontWeight: '800', color: COLORS.success },
  earningGross: { fontSize: 11, color: COLORS.textSecondary },
  feeBox: { gap: 10 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { fontSize: 14, color: COLORS.textSecondary },
  feeValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
});
