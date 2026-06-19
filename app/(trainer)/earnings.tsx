import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useBookingStore } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';
import { formatPrice, formatDate } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';
import { monthlyEarnings, monthTransactions, sessionNet, nextSettlement } from '../../utils/earnings';

const TRAINER = '#4F63F5';

const CHART_PERIODS = [
  { key: '3m', label: '3개월' },
  { key: '6m', label: '6개월' },
  { key: '1y', label: '1년' },
] as const;
type PeriodKey = typeof CHART_PERIODS[number]['key'];

const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
const CURRENT_MONTH = TODAY.slice(0, 7);

export default function EarningsScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { bookings } = useBookingStore();
  const { trainer } = useAuthStore();
  const trainerId = trainer?.id ?? 'trainer_001';

  const [period, setPeriod] = useState<PeriodKey>('3m');
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  const trainerBookings = useMemo(
    () => bookings.filter((b) => b.trainerId === trainerId),
    [bookings, trainerId]
  );

  const stats = useMemo(() => {
    // 누적 수익·완료 세션은 예약 상태와 무관하게 '완료된 세션' 전체를 기준으로 한다
    let totalEarnings = 0;
    let totalSessions = 0;
    for (const b of trainerBookings) {
      if (b.type === 'consultation') continue;
      const net = sessionNet(b);
      for (const s of b.sessions) {
        if (s.status === 'completed') { totalEarnings += net; totalSessions += 1; }
      }
    }
    const memberCount = new Set(trainerBookings.map((b) => b.memberId)).size;
    const activeCount = trainerBookings.filter((b) => b.status === 'active').length;
    return { totalEarnings, memberCount, totalSessions, activeCount };
  }, [trainerBookings]);

  // 실제 예약 데이터에서 월별 수익 산출 (현재월 포함 최근 12개월)
  const months = useMemo(() => monthlyEarnings(trainerBookings, 12), [trainerBookings]);
  const currentMonthData = months[months.length - 1];
  const prevMonthData = months[months.length - 2];
  const currentAmount = currentMonthData?.amount ?? 0;
  const prevAmount = prevMonthData?.amount ?? 0;
  const diffAmount = currentAmount - prevAmount;

  const transactions = useMemo(
    () => monthTransactions(trainerBookings, CURRENT_MONTH),
    [trainerBookings]
  );

  const settlement = useMemo(() => nextSettlement(trainerBookings), [trainerBookings]);

  const chartData = useMemo(() => {
    const n = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    return months.slice(-n);
  }, [period, months]);

  const maxAmount = useMemo(() => Math.max(...chartData.map((d) => d.amount), 1), [chartData]);

  const recentEarnings = useMemo(() => {
    return trainerBookings
      .filter((b) => b.usedSessions > 0)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);
  }, [trainerBookings]);

  const highlighted = highlightIdx !== null ? chartData[highlightIdx] : chartData[chartData.length - 1];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── 히어로 카드 ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>이번 달 수익</Text>
          <Text style={styles.heroAmount}>{formatPrice(currentAmount)}</Text>
          <View style={styles.heroDiff}>
            <MaterialCommunityIcons
              name={diffAmount >= 0 ? 'trending-up' : 'trending-down'}
              size={16}
              color={diffAmount >= 0 ? '#86efac' : '#fca5a5'}
            />
            <Text style={styles.heroDiffText}>
              지난 달 대비 {diffAmount >= 0 ? '+' : ''}{formatPrice(Math.abs(diffAmount))}
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{currentMonthData?.sessions ?? 0}</Text>
              <Text style={styles.heroStatLabel}>이번 달 세션</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{stats.memberCount}</Text>
              <Text style={styles.heroStatLabel}>담당 회원</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>10%</Text>
              <Text style={styles.heroStatLabel}>플랫폼 수수료</Text>
            </View>
          </View>
        </View>

        {/* ── 다음 정산 예정 ── */}
        <View style={styles.settleCard}>
          <View style={styles.settleIcon}>
            <MaterialCommunityIcons name="bank-outline" size={22} color={TRAINER} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settleLabel}>다음 정산 예정 · {settlement.dateLabel}</Text>
            <Text style={styles.settleAmount}>{formatPrice(settlement.amount)}</Text>
            <Text style={styles.settleSub}>{settlement.monthLabel} 완료 세션 기준 · 매월 10일 자동 입금</Text>
          </View>
        </View>

        {/* ── 누적 현황 행 ── */}
        <View style={styles.accRow}>
          <View style={styles.accCard}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color={TRAINER} />
            <Text style={styles.accVal}>{formatPrice(stats.totalEarnings)}</Text>
            <Text style={styles.accLabel}>누적 수익</Text>
          </View>
          <View style={styles.accCard}>
            <MaterialCommunityIcons name="account-group" size={20} color={TRAINER} />
            <Text style={styles.accVal}>{stats.memberCount}명</Text>
            <Text style={styles.accLabel}>총 회원</Text>
          </View>
          <View style={styles.accCard}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color={TRAINER} />
            <Text style={styles.accVal}>{stats.totalSessions}회</Text>
            <Text style={styles.accLabel}>완료 세션</Text>
          </View>
        </View>

        {/* ── 월별 수익 차트 ── */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>월별 수익 추이</Text>
            <View style={styles.periodBtns}>
              {CHART_PERIODS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
                  onPress={() => { setPeriod(p.key); setHighlightIdx(null); }}
                >
                  <Text style={[styles.periodBtnText, period === p.key && styles.periodBtnTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 선택된 월 표시 */}
          <View style={styles.highlightRow}>
            <Text style={styles.highlightMonth}>{highlighted?.label}</Text>
            <Text style={styles.highlightAmount}>{formatPrice(highlighted?.amount ?? 0)}</Text>
            <Text style={styles.highlightSessions}>{highlighted?.sessions}세션</Text>
          </View>

          {/* 막대 차트 */}
          <View style={styles.chart}>
            {chartData.map((d, i) => {
              const isHigh = highlightIdx === i || (highlightIdx === null && i === chartData.length - 1);
              const barH = maxAmount > 0 ? Math.max((d.amount / maxAmount) * 130, 8) : 8;
              return (
                <TouchableOpacity
                  key={d.key}
                  style={styles.barContainer}
                  onPress={() => setHighlightIdx(i === highlightIdx ? null : i)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barWrapper}>
                    <View style={[
                      styles.bar,
                      { height: barH },
                      isHigh && styles.barHighlight,
                    ]} />
                  </View>
                  <Text style={[styles.barMonth, isHigh && styles.barMonthHighlight]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 범례 */}
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TRAINER + '40' }]} />
              <Text style={styles.legendText}>일반</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TRAINER }]} />
              <Text style={styles.legendText}>선택</Text>
            </View>
          </View>
        </View>

        {/* ── 최근 수입 내역 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 수입 내역</Text>
          {recentEarnings.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="cash-remove" size={36} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>아직 수입 내역이 없습니다</Text>
            </View>
          ) : (
            recentEarnings.map((b) => {
              const netAmount = Math.round(b.usedSessions * b.pricePerSession * 0.9);
              const initial = b.memberName[0];
              return (
                <View key={b.id} style={styles.earningItem}>
                  <View style={styles.earningAvatar}>
                    <Text style={styles.earningAvatarText}>{initial}</Text>
                  </View>
                  <View style={styles.earningInfo}>
                    <Text style={styles.earningMember}>{b.memberName} 회원</Text>
                    <Text style={styles.earningDetail}>
                      {b.usedSessions}회 완료 · {b.totalSessions}회 패키지
                    </Text>
                    <Text style={styles.earningDate}>{formatDate(b.startDate)}</Text>
                  </View>
                  <View style={styles.earningAmounts}>
                    <Text style={styles.earningNet}>+{formatPrice(netAmount)}</Text>
                    <Text style={styles.earningGross}>총 {formatPrice(b.totalAmount)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── 결제 내역 ── */}
        <View style={styles.section}>
          <View style={styles.txSectionHeader}>
            <Text style={styles.sectionTitle}>결제 내역</Text>
            <Text style={styles.txMonthLabel}>{currentMonthData?.label} 기준</Text>
          </View>

          {/* 테이블 헤더 */}
          <View style={styles.txTableHeader}>
            <Text style={[styles.txHeaderCell, { flex: 1.2 }]}>날짜</Text>
            <Text style={[styles.txHeaderCell, { flex: 2 }]}>회원명</Text>
            <Text style={[styles.txHeaderCell, { flex: 1, textAlign: 'right' }]}>금액</Text>
          </View>
          <View style={styles.txHRule} />

          {/* 거래 행 */}
          {transactions.length === 0 ? (
            <View style={styles.txEmpty}>
              <Text style={styles.txEmptyText}>이번 달 완료된 세션이 없습니다</Text>
            </View>
          ) : (
            transactions.map((tx, i) => (
              <View
                key={tx.id}
                style={[
                  styles.txRow,
                  i < transactions.length - 1 && styles.txRowBorder,
                ]}
              >
                <Text style={[styles.txCell, { flex: 1.2 }]}>
                  {tx.date.slice(5).replace('-', '/')}
                </Text>
                <Text style={[styles.txCell, { flex: 2 }]}>{tx.member} 회원</Text>
                <Text style={[styles.txAmount, { flex: 1, textAlign: 'right' }]}>
                  +{formatPrice(tx.amount)}
                </Text>
              </View>
            ))
          )}

          {/* 합계 행 */}
          <View style={styles.txFooter}>
            <Text style={styles.txFooterLabel}>이번 달 합계</Text>
            <Text style={styles.txFooterAmount}>{formatPrice(currentAmount)}</Text>
          </View>
        </View>

        {/* ── 수익 구조 안내 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수익 구조 안내</Text>
          <View style={styles.feeList}>
            <FeeRow icon="account" label="회원 총 결제" value="PT비 + 시설 이용료" />
            <FeeRow icon="cash" label="트레이너 수취" value="PT비 × 90%" valueColor={COLORS.success} />
            <FeeRow icon="percent" label="플랫폼 수수료" value="PT비 × 10%" />
          </View>
          <View style={styles.feeNotice}>
            <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.primary} />
            <Text style={styles.feeNoticeText}>시설 이용료는 헬스장에 별도 정산 · 수익은 매월 10일 자동 정산됩니다</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function FeeRow({ icon, label, value, valueColor }: {
  icon: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={styles.feeRow}>
      <View style={styles.feeIconBox}>
        <MaterialCommunityIcons name={icon as any} size={16} color={TRAINER} />
      </View>
      <Text style={styles.feeLabel}>{label}</Text>
      <Text style={[styles.feeValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  /* Hero card */
  heroCard: {
    backgroundColor: TRAINER,
    paddingTop: 28, paddingBottom: 24, paddingHorizontal: 20,
    alignItems: 'center', gap: 6,
  },
  heroLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  heroAmount: { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroDiff: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  heroDiffText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  heroStats: {
    flexDirection: 'row', marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 8, width: '100%',
  },
  heroStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  heroStatVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  /* Settlement card */
  settleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface,
    marginHorizontal: 12, marginTop: 12,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: TRAINER + '33',
  },
  settleIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: TRAINER + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  settleLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  settleAmount: { fontSize: 24, fontWeight: '900', color: TRAINER, marginVertical: 2 },
  settleSub: { fontSize: 11, color: COLORS.textMuted },

  /* Accumulated stats row */
  accRow: {
    flexDirection: 'row', gap: 8,
    margin: 12,
  },
  accCard: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  accVal: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  accLabel: { fontSize: 11, color: COLORS.textSecondary },

  /* Section */
  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 12, marginBottom: 12,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  /* Chart */
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodBtns: { flexDirection: 'row', gap: 4 },
  periodBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1, borderColor: COLORS.border,
  },
  periodBtnActive: { backgroundColor: TRAINER, borderColor: TRAINER },
  periodBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  periodBtnTextActive: { color: '#fff' },

  highlightRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    paddingHorizontal: 4,
  },
  highlightMonth: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  highlightAmount: { fontSize: 22, fontWeight: '800', color: TRAINER, flex: 1 },
  highlightSessions: { fontSize: 13, color: COLORS.textSecondary },

  chart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around',
    height: 160, paddingTop: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  barContainer: { alignItems: 'center', gap: 6, flex: 1 },
  barWrapper: { height: 130, justifyContent: 'flex-end', alignItems: 'center' },
  bar: {
    width: 24,
    backgroundColor: TRAINER + '40',
    borderRadius: 6,
    borderTopLeftRadius: 6, borderTopRightRadius: 6,
  },
  barHighlight: { backgroundColor: TRAINER },
  barMonth: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  barMonthHighlight: { color: TRAINER, fontWeight: '700' },

  chartLegend: {
    flexDirection: 'row', gap: 14, justifyContent: 'flex-end', marginTop: -4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, color: COLORS.textSecondary },

  /* Earnings list */
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
  earningItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  earningAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: TRAINER + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  earningAvatarText: { fontSize: 16, fontWeight: '800', color: TRAINER },
  earningInfo: { flex: 1 },
  earningMember: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  earningDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  earningDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  earningAmounts: { alignItems: 'flex-end' },
  earningNet: { fontSize: 15, fontWeight: '800', color: COLORS.success },
  earningGross: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  /* Fee structure */
  feeList: { gap: 8 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feeIconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: TRAINER + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  feeLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  feeValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  feeNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryPale, borderRadius: 8,
    padding: 10,
  },
  feeNoticeText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },

  /* Transaction table */
  txSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  txMonthLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  txTableHeader: { flexDirection: 'row', paddingBottom: 6, paddingTop: 2 },
  txHeaderCell: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.3 },
  txHRule: { height: 1, backgroundColor: COLORS.border, marginBottom: 2 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  txRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  txCell: { fontSize: 13, color: COLORS.textSecondary },
  txAmount: { fontSize: 13, fontWeight: '700', color: COLORS.success },
  txFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, marginTop: 6,
    borderTopWidth: 1.5, borderTopColor: COLORS.border,
  },
  txFooterLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  txFooterAmount: { fontSize: 16, fontWeight: '900', color: TRAINER },
  txEmpty: { paddingVertical: 18, alignItems: 'center' },
  txEmptyText: { fontSize: 13, color: COLORS.textSecondary },
});
