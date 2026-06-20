import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../utils/constants';
import { formatPrice } from '../../utils/formatters';
import {
  gymConfirmedSlots, gymMonthlyRevenue, gymMonthTransactions,
  gymNextSettlement, gymTrainerContribution, gymPopularHours,
} from '../../utils/gymRevenue';

const GYM = '#4F63F5';

const CHART_PERIODS = [
  { key: '3m', label: '3개월' },
  { key: '6m', label: '6개월' },
  { key: '1y', label: '1년' },
] as const;
type PeriodKey = typeof CHART_PERIODS[number]['key'];

const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
const CURRENT_MONTH = TODAY.slice(0, 7);

export default function GymEarningsScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { gymAdmin } = useAuthStore();
  const GYM_ID = gymAdmin?.gymId ?? 'gym_001';
  const { slotBookings } = useGymSlotStore();

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

  // 실제 확정 슬롯(시설 이용료)에서 월별 수익 산출
  const months = useMemo(() => gymMonthlyRevenue(slotBookings, GYM_ID, 12), [slotBookings, GYM_ID]);
  const currentMonthData = months[months.length - 1];
  const prevMonthData    = months[months.length - 2];
  const currentAmount    = currentMonthData?.amount ?? 0;
  const prevAmount       = prevMonthData?.amount ?? 0;
  const diffAmount       = currentAmount - prevAmount;

  const accumulated = useMemo(
    () => gymConfirmedSlots(slotBookings, GYM_ID).reduce((s, b) => s + b.facilityFee, 0),
    [slotBookings, GYM_ID]
  );
  const memberCount = useMemo(
    () => new Set(gymConfirmedSlots(slotBookings, GYM_ID).map(s => s.memberName).filter(Boolean)).size,
    [slotBookings, GYM_ID]
  );
  const transactions  = useMemo(() => gymMonthTransactions(slotBookings, GYM_ID, CURRENT_MONTH), [slotBookings, GYM_ID]);
  const settlement    = useMemo(() => gymNextSettlement(slotBookings, GYM_ID), [slotBookings, GYM_ID]);
  const contributions = useMemo(() => gymTrainerContribution(slotBookings, GYM_ID, CURRENT_MONTH), [slotBookings, GYM_ID]);
  const popularHours  = useMemo(() => gymPopularHours(slotBookings, GYM_ID), [slotBookings, GYM_ID]);
  const maxHourCount  = useMemo(() => Math.max(...popularHours.map(h => h.count), 1), [popularHours]);

  const chartData = useMemo(() => {
    const n = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    return months.slice(-n);
  }, [period, months]);

  const maxAmount = useMemo(() => Math.max(...chartData.map(d => d.amount), 1), [chartData]);
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
              <Text style={styles.heroStatVal}>{currentMonthData?.count ?? 0}</Text>
              <Text style={styles.heroStatLabel}>이번 달 이용</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{memberCount}명</Text>
              <Text style={styles.heroStatLabel}>이용 회원</Text>
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
            <MaterialCommunityIcons name="bank-outline" size={22} color={GYM} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settleLabel}>다음 정산 예정 · {settlement.dateLabel}</Text>
            <Text style={styles.settleAmount}>{formatPrice(settlement.amount)}</Text>
            <Text style={styles.settleSub}>{settlement.monthLabel} 확정 슬롯 기준 · 매월 10일 자동 입금</Text>
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

          {transactions.length === 0 ? (
            <View style={styles.txEmpty}>
              <Text style={styles.txEmptyText}>이번 달 확정된 시설 이용이 없습니다</Text>
            </View>
          ) : (
            transactions.map((tx, i) => (
              <View
                key={tx.id}
                style={[styles.txRow, i < transactions.length - 1 && styles.txRowBorder]}
              >
                <Text style={[styles.txCell, { flex: 1.2 }]}>
                  {tx.date.slice(5).replace('-', '/')}
                </Text>
                <Text style={[styles.txCell, { flex: 2 }]}>{tx.trainer} 트레이너</Text>
                <Text style={[styles.txAmount, { flex: 1, textAlign: 'right' }]}>
                  +{formatPrice(tx.amount)}
                </Text>
              </View>
            ))
          )}

          <View style={styles.txFooter}>
            <Text style={styles.txFooterLabel}>이번 달 합계</Text>
            <Text style={styles.txFooterAmount}>{formatPrice(currentAmount)}</Text>
          </View>
        </View>

        {/* ── 트레이너별 매출 기여도 (이번 달) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>트레이너별 매출 기여도</Text>
          {contributions.length === 0 ? (
            <Text style={styles.txEmptyText}>이번 달 데이터가 없습니다</Text>
          ) : (
            contributions.map((c) => {
              const pct = currentAmount > 0 ? Math.round((c.amount / currentAmount) * 100) : 0;
              return (
                <View key={c.trainerName} style={styles.contribRow}>
                  <View style={styles.contribAvatar}>
                    <Text style={styles.contribAvatarText}>{c.trainerName[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.contribTopRow}>
                      <Text style={styles.contribName}>{c.trainerName} 트레이너</Text>
                      <Text style={styles.contribAmount}>{formatPrice(c.amount)}</Text>
                    </View>
                    <View style={styles.contribBarBg}>
                      <View style={[styles.contribBarFill, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={styles.contribSub}>{c.count}건 · 전체의 {pct}%</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── 인기 시간대 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>인기 시간대</Text>
          <Text style={styles.sectionSub}>확정된 시설 이용을 시간대별로 집계 (가동률 높은 시간 파악)</Text>
          {popularHours.length === 0 ? (
            <Text style={styles.txEmptyText}>데이터가 없습니다</Text>
          ) : (
            <View style={styles.hoursChart}>
              {popularHours.map((h) => {
                const barH = Math.max((h.count / maxHourCount) * 90, 6);
                const isPeak = h.count === maxHourCount;
                return (
                  <View key={h.hour} style={styles.hourCol}>
                    <Text style={styles.hourCount}>{h.count}</Text>
                    <View style={styles.hourTrack}>
                      <View style={[styles.hourBar, { height: barH }, isPeak && styles.hourBarPeak]} />
                    </View>
                    <Text style={[styles.hourLabel, isPeak && styles.hourLabelPeak]}>{h.hour}시</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── 수익 구조 안내 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수익 구조 안내</Text>
          <View style={styles.feeList}>
            <FeeRow icon="account" label="회원 총 결제" value="PT비 + 시설료 + 수수료" />
            <FeeRow icon="home" label="헬스장 수취" value="시설 이용료 전액" valueColor={COLORS.success} />
            <FeeRow icon="percent" label="플랫폼 수수료" value="시설료 × 10% (회원 부담)" />
          </View>
          <View style={styles.feeNotice}>
            <MaterialCommunityIcons name="information-outline" size={14} color={GYM} />
            <Text style={styles.feeNoticeText}>확정된 시설 이용료는 매월 10일 자동 정산됩니다</Text>
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

  settleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 12, marginTop: 12,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: GYM + '33',
  },
  settleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: GYM + '15', alignItems: 'center', justifyContent: 'center' },
  settleLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  settleAmount: { fontSize: 24, fontWeight: '900', color: GYM, marginVertical: 2 },
  settleSub: { fontSize: 11, color: COLORS.textMuted },

  sectionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: -6 },
  txEmpty: { paddingVertical: 18, alignItems: 'center' },
  txEmptyText: { fontSize: 13, color: COLORS.textSecondary },

  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  contribAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: GYM + '18', alignItems: 'center', justifyContent: 'center' },
  contribAvatarText: { fontSize: 15, fontWeight: '800', color: GYM },
  contribTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  contribName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  contribAmount: { fontSize: 14, fontWeight: '800', color: GYM },
  contribBarBg: { height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceElevated, overflow: 'hidden' },
  contribBarFill: { height: 6, borderRadius: 3, backgroundColor: GYM },
  contribSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },

  hoursChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 130, paddingTop: 8 },
  hourCol: { flex: 1, alignItems: 'center', gap: 4 },
  hourCount: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  hourTrack: { height: 90, justifyContent: 'flex-end' },
  hourBar: { width: 16, borderRadius: 5, backgroundColor: GYM + '40' },
  hourBarPeak: { backgroundColor: GYM },
  hourLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  hourLabelPeak: { color: GYM, fontWeight: '700' },

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
