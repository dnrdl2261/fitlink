import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useBookingStore } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../utils/constants';
import { formatPrice } from '../../utils/formatters';

const GYM = '#4F63F5';

const CHART_PERIODS = [
  { key: '3m', label: '3개월' },
  { key: '6m', label: '6개월' },
  { key: '1y', label: '1년' },
] as const;
type PeriodKey = typeof CHART_PERIODS[number]['key'];

const MOCK_MONTHLY = [
  { key: '2025-07', label: '7월',  amount: 310000, count: 21 },
  { key: '2025-08', label: '8월',  amount: 380000, count: 25 },
  { key: '2025-09', label: '9월',  amount: 350000, count: 23 },
  { key: '2025-10', label: '10월', amount: 420000, count: 28 },
  { key: '2025-11', label: '11월', amount: 460000, count: 31 },
  { key: '2025-12', label: '12월', amount: 490000, count: 33 },
  { key: '2026-01', label: '1월',  amount: 390000, count: 26 },
  { key: '2026-02', label: '2월',  amount: 445000, count: 30 },
  { key: '2026-03', label: '3월',  amount: 500000, count: 34 },
  { key: '2026-04', label: '4월',  amount: 480000, count: 32 },
  { key: '2026-05', label: '5월',  amount: 560000, count: 37 },
  { key: '2026-06', label: '6월',  amount: 0,       count: 0  },
];

const CURRENT_MONTH = '2026-05';
const PREV_MONTH    = '2026-04';

const MOCK_TRANSACTIONS = [
  { id: 'g1',  date: '2026-05-20', trainer: '김태양', amount: 190000 },
  { id: 'g2',  date: '2026-05-19', trainer: '이서연', amount: 126000 },
  { id: 'g3',  date: '2026-05-18', trainer: '박준혁', amount: 190000 },
  { id: 'g4',  date: '2026-05-17', trainer: '최유진', amount: 140000 },
  { id: 'g5',  date: '2026-05-16', trainer: '정민성', amount: 190000 },
  { id: 'g6',  date: '2026-05-15', trainer: '김태양', amount: 190000 },
  { id: 'g7',  date: '2026-05-14', trainer: '이서연', amount: 126000 },
  { id: 'g8',  date: '2026-05-13', trainer: '박준혁', amount: 190000 },
  { id: 'g9',  date: '2026-05-12', trainer: '최유진', amount: 140000 },
  { id: 'g10', date: '2026-05-11', trainer: '정민성', amount: 190000 },
  { id: 'g11', date: '2026-05-09', trainer: '김태양', amount: 190000 },
  { id: 'g12', date: '2026-05-08', trainer: '이서연', amount: 126000 },
];

export default function GymEarningsScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { gymAdmin } = useAuthStore();
  const GYM_ID = gymAdmin?.gymId ?? 'gym_001';
  const { slotBookings } = useGymSlotStore();
  const { bookings } = useBookingStore();

  const [period, setPeriod]           = useState<PeriodKey>('3m');
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  const confirmedSlots = useMemo(
    () => slotBookings.filter(s => s.gymId === GYM_ID && s.status === 'confirmed'),
    [slotBookings, GYM_ID]
  );
  const slotRevenue = useMemo(
    () => confirmedSlots.reduce((sum, s) => sum + s.facilityFee, 0),
    [confirmedSlots]
  );

  const ptBookings = bookings.filter(b => b.status !== 'cancelled');
  const memberCount = new Set(ptBookings.map(b => b.memberId)).size;

  const currentMonthData = MOCK_MONTHLY.find(d => d.key === CURRENT_MONTH);
  const prevMonthData    = MOCK_MONTHLY.find(d => d.key === PREV_MONTH);
  const currentAmount    = currentMonthData?.amount ?? 560000;
  const prevAmount       = prevMonthData?.amount ?? 480000;
  const diffAmount       = currentAmount - prevAmount;

  const accumulated = MOCK_MONTHLY
    .filter(d => d.key < CURRENT_MONTH && d.amount > 0)
    .reduce((sum, d) => sum + d.amount, 0) + currentAmount;

  const chartData = useMemo(() => {
    const n = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    return MOCK_MONTHLY.filter(d => d.amount > 0).slice(-n);
  }, [period]);

  const maxAmount = useMemo(() => Math.max(...chartData.map(d => d.amount)), [chartData]);
  const highlighted = highlightIdx !== null ? chartData[highlightIdx] : chartData[chartData.length - 1];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >

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
              <Text style={styles.heroStatVal}>{currentMonthData?.count ?? 37}</Text>
              <Text style={styles.heroStatLabel}>이번 달 이용</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{memberCount || 8}명</Text>
              <Text style={styles.heroStatLabel}>이용 회원</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>10%</Text>
              <Text style={styles.heroStatLabel}>플랫폼 수수료</Text>
            </View>
          </View>
        </View>

        {/* ── 누적 수익 강조 카드 ── */}
        <View style={styles.accCard}>
          <View style={styles.accLeft}>
            <MaterialCommunityIcons name="cash-multiple" size={22} color={GYM} />
            <View>
              <Text style={styles.accLabel}>누적 수익</Text>
              <Text style={styles.accSub}>서비스 시작 이후 합산</Text>
            </View>
          </View>
          <Text style={styles.accAmount}>{formatPrice(accumulated)}</Text>
        </View>

        {/* ── 월별 수익 차트 ── */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>월별 수익 추이</Text>
            <View style={styles.periodBtns}>
              {CHART_PERIODS.map(p => (
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

          <View style={styles.highlightRow}>
            <Text style={styles.highlightMonth}>{highlighted?.label}</Text>
            <Text style={styles.highlightAmount}>{formatPrice(highlighted?.amount ?? 0)}</Text>
            <Text style={styles.highlightCount}>{highlighted?.count}건</Text>
          </View>

          <View style={styles.chart}>
            {chartData.map((d, i) => {
              const isHigh = highlightIdx === i || (highlightIdx === null && i === chartData.length - 1);
              const barH = maxAmount > 0 ? Math.max((d.amount / maxAmount) * 120, 8) : 8;
              return (
                <TouchableOpacity
                  key={d.key}
                  style={styles.barContainer}
                  onPress={() => setHighlightIdx(i === highlightIdx ? null : i)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barWrapper}>
                    <View style={[styles.bar, { height: barH }, isHigh && styles.barHighlight]} />
                  </View>
                  <Text style={[styles.barMonth, isHigh && styles.barMonthHighlight]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: GYM + '40' }]} />
              <Text style={styles.legendText}>일반</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: GYM }]} />
              <Text style={styles.legendText}>선택</Text>
            </View>
          </View>
        </View>

        {/* ── 결제 내역 ── */}
        <View style={styles.section}>
          <View style={styles.txSectionHeader}>
            <Text style={styles.sectionTitle}>결제 내역</Text>
            <Text style={styles.txMonthLabel}>{currentMonthData?.label} 기준</Text>
          </View>

          <View style={styles.txTableHeader}>
            <Text style={[styles.txHeaderCell, { flex: 1.2 }]}>날짜</Text>
            <Text style={[styles.txHeaderCell, { flex: 2 }]}>트레이너</Text>
            <Text style={[styles.txHeaderCell, { flex: 1, textAlign: 'right' }]}>금액</Text>
          </View>
          <View style={styles.txHRule} />

          {MOCK_TRANSACTIONS.map((tx, i) => (
            <View
              key={tx.id}
              style={[styles.txRow, i < MOCK_TRANSACTIONS.length - 1 && styles.txRowBorder]}
            >
              <Text style={[styles.txCell, { flex: 1.2 }]}>
                {tx.date.slice(5).replace('-', '/')}
              </Text>
              <Text style={[styles.txCell, { flex: 2 }]}>{tx.trainer} 트레이너</Text>
              <Text style={[styles.txAmount, { flex: 1, textAlign: 'right' }]}>
                +{formatPrice(tx.amount)}
              </Text>
            </View>
          ))}

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
            <FeeRow icon="home" label="헬스장 수취" value="시설이용료 100%" valueColor={COLORS.success} />
            <FeeRow icon="percent" label="플랫폼 수수료" value="(PT비 + 시설료) × 10%" />
          </View>
          <View style={styles.feeNotice}>
            <MaterialCommunityIcons name="information-outline" size={14} color={GYM} />
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
        <MaterialCommunityIcons name={icon as any} size={16} color={GYM} />
      </View>
      <Text style={styles.feeLabel}>{label}</Text>
      <Text style={[styles.feeValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  heroCard: {
    backgroundColor: GYM,
    paddingTop: 28, paddingBottom: 24, paddingHorizontal: 20,
    alignItems: 'center', gap: 6,
  },
  heroLabel:     { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  heroAmount:    { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroDiff: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  heroDiffText:  { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  heroStats: {
    flexDirection: 'row', marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 8, width: '100%',
  },
  heroStatItem:   { flex: 1, alignItems: 'center', gap: 3 },
  heroStatVal:    { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroStatLabel:  { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroStatDivider:{ width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },

  accCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 12, backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 18,
    borderWidth: 1.5, borderColor: GYM + '40',
    shadowColor: GYM, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  accLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accLabel:  { fontSize: 14, fontWeight: '700', color: COLORS.text },
  accSub:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  accAmount: { fontSize: 22, fontWeight: '900', color: GYM },

  section: {
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 12,
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  chartHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodBtns:   { flexDirection: 'row', gap: 4 },
  periodBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
  },
  periodBtnActive:     { backgroundColor: GYM, borderColor: GYM },
  periodBtnText:       { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  periodBtnTextActive: { color: '#fff' },

  highlightRow:      { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 4 },
  highlightMonth:    { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  highlightAmount:   { fontSize: 22, fontWeight: '800', color: GYM, flex: 1 },
  highlightCount:    { fontSize: 13, color: COLORS.textSecondary },

  chart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around',
    height: 150, paddingTop: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  barContainer: { alignItems: 'center', gap: 6, flex: 1 },
  barWrapper:   { height: 120, justifyContent: 'flex-end' },
  bar: {
    width: '100%', maxWidth: 28, backgroundColor: GYM + '40',
    borderRadius: 6, borderTopLeftRadius: 6, borderTopRightRadius: 6,
  },
  barHighlight:         { backgroundColor: GYM },
  barMonth:             { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  barMonthHighlight:    { color: GYM, fontWeight: '700' },
  chartLegend:  { flexDirection: 'row', gap: 14, justifyContent: 'flex-end', marginTop: -4 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:    { width: 10, height: 10, borderRadius: 3 },
  legendText:   { fontSize: 11, color: COLORS.textSecondary },

  txSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txMonthLabel:    { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  txTableHeader:   { flexDirection: 'row', paddingBottom: 6, paddingTop: 2 },
  txHeaderCell:    { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.3 },
  txHRule:         { height: 1, backgroundColor: COLORS.border, marginBottom: 2 },
  txRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  txRowBorder:     { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  txCell:          { fontSize: 13, color: COLORS.textSecondary },
  txAmount:        { fontSize: 13, fontWeight: '700', color: COLORS.success },
  txFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, marginTop: 6, borderTopWidth: 1.5, borderTopColor: COLORS.border,
  },
  txFooterLabel:  { fontSize: 14, fontWeight: '700', color: COLORS.text },
  txFooterAmount: { fontSize: 16, fontWeight: '900', color: GYM },

  feeList:   { gap: 8 },
  feeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feeIconBox:{
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: GYM + '18', alignItems: 'center', justifyContent: 'center',
  },
  feeLabel:  { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  feeValue:  { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  feeNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GYM + '12', borderRadius: 8, padding: 10,
  },
  feeNoticeText: { fontSize: 12, color: GYM, fontWeight: '500' },
});
