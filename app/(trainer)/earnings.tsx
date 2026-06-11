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

const TRAINER = '#4F63F5';

const CHART_PERIODS = [
  { key: '3m', label: '3개월' },
  { key: '6m', label: '6개월' },
  { key: '1y', label: '1년' },
] as const;
type PeriodKey = typeof CHART_PERIODS[number]['key'];

const MOCK_MONTHLY = [
  { key: '2025-07', label: '7월', amount: 2400000, sessions: 18 },
  { key: '2025-08', label: '8월', amount: 3100000, sessions: 24 },
  { key: '2025-09', label: '9월', amount: 2900000, sessions: 21 },
  { key: '2025-10', label: '10월', amount: 3500000, sessions: 26 },
  { key: '2025-11', label: '11월', amount: 3800000, sessions: 28 },
  { key: '2025-12', label: '12월', amount: 4000000, sessions: 30 },
  { key: '2026-01', label: '1월', amount: 3200000, sessions: 23 },
  { key: '2026-02', label: '2월', amount: 3700000, sessions: 27 },
  { key: '2026-03', label: '3월', amount: 4100000, sessions: 31 },
  { key: '2026-04', label: '4월', amount: 3900000, sessions: 29 },
  { key: '2026-05', label: '5월', amount: 4350000, sessions: 33 },
  { key: '2026-06', label: '6월', amount: 0, sessions: 0 },
];

const CURRENT_MONTH = '2026-05';
const PREV_MONTH = '2026-04';

const MOCK_TRANSACTIONS = [
  { id: 't1',  date: '2026-05-20', member: '김지수', amount: 140000 },
  { id: 't2',  date: '2026-05-19', member: '이준혁', amount: 140000 },
  { id: 't3',  date: '2026-05-18', member: '박소연', amount: 126000 },
  { id: 't4',  date: '2026-05-17', member: '최민준', amount: 140000 },
  { id: 't5',  date: '2026-05-15', member: '김지수', amount: 140000 },
  { id: 't6',  date: '2026-05-14', member: '이준혁', amount: 140000 },
  { id: 't7',  date: '2026-05-13', member: '박소연', amount: 126000 },
  { id: 't8',  date: '2026-05-12', member: '정하은', amount: 126000 },
  { id: 't9',  date: '2026-05-11', member: '김지수', amount: 140000 },
  { id: 't10', date: '2026-05-10', member: '최민준', amount: 140000 },
  { id: 't11', date: '2026-05-08', member: '이준혁', amount: 140000 },
  { id: 't12', date: '2026-05-07', member: '정하은', amount: 126000 },
];

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
    const completed = trainerBookings.filter((b) => b.status === 'completed');
    const active = trainerBookings.filter((b) => b.status === 'active');
    const totalEarnings = completed.reduce(
      (sum, b) => sum + Math.round(b.usedSessions * b.pricePerSession * 0.9), 0
    );
    const memberCount = new Set(trainerBookings.map((b) => b.memberId)).size;
    const totalSessions = completed.reduce((sum, b) => sum + b.usedSessions, 0);
    return { totalEarnings, memberCount, totalSessions, activeCount: active.length };
  }, [trainerBookings]);

  const currentMonthData = MOCK_MONTHLY.find((d) => d.key === CURRENT_MONTH);
  const prevMonthData = MOCK_MONTHLY.find((d) => d.key === PREV_MONTH);
  const currentAmount = currentMonthData?.amount ?? 4350000;
  const prevAmount = prevMonthData?.amount ?? 3900000;
  const diffAmount = currentAmount - prevAmount;

  const chartData = useMemo(() => {
    const n = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    const nonZero = MOCK_MONTHLY.filter((d) => d.amount > 0);
    return nonZero.slice(-n);
  }, [period]);

  const maxAmount = useMemo(() => Math.max(...chartData.map((d) => d.amount)), [chartData]);

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
              <Text style={styles.heroStatVal}>{currentMonthData?.sessions ?? 33}</Text>
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
          {MOCK_TRANSACTIONS.map((tx, i) => (
            <View
              key={tx.id}
              style={[
                styles.txRow,
                i < MOCK_TRANSACTIONS.length - 1 && styles.txRowBorder,
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
          ))}

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
            <FeeRow icon="account" label="회원 총 결제" value="PT비 + 시설료 + 수수료" />
            <FeeRow icon="cash" label="트레이너 수취" value="PT비 × 90%" valueColor={COLORS.success} />
            <FeeRow icon="percent" label="플랫폼 수수료" value="(PT비 + 시설료) × 10%" />
          </View>
          <View style={styles.feeNotice}>
            <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.primary} />
            <Text style={styles.feeNoticeText}>수익은 매월 10일 자동 정산됩니다</Text>
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
});
