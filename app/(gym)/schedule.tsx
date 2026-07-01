import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { DAY_LABELS } from '../../utils/constants';

const GYM   = '#4F63F5';
const SLATE = '#64748B';
const BG    = '#F1F5F9';
const CARD  = '#FFFFFF';
const BD    = '#E2E8F0';
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

type ScheduleStatus = '승인 완료' | '승인 대기' | '완료' | '취소/반려';
type FilterKey     = '전체' | ScheduleStatus;

type ScheduleItem = {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  person: string;
  role: string;
  detail: string;
  status: ScheduleStatus;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: '전체',    label: '전체' },
  { key: '승인 대기', label: '대기' },
  { key: '승인 완료', label: '완료' },
  { key: '완료',    label: '종료' },
  { key: '취소/반려', label: '취소' },
];

const STATUS_CFG: Record<ScheduleStatus, { bg: string; text: string; dot: string }> = {
  '승인 완료': { bg: '#ECFDF5', text: '#059669', dot: '#22C55E' },
  '승인 대기': { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
  '완료':     { bg: CARD, text: '#94A3B8', dot: '#CBD5E1' },
  '취소/반려': { bg: '#FFF1F2', text: '#E11D48', dot: '#F43F5E' },
};

const TYPE_CFG: Record<string, { accent: string; iconBg: string; icon: string }> = {
  'PT 수업':    { accent: GYM,       iconBg: '#ECFDF9', icon: 'human-male-board' },
  '헬스장 이용': { accent: '#818CF8', iconBg: '#EEF2FF', icon: 'dumbbell' },
  '개인 운동':  { accent: '#94A3B8', iconBg: BG, icon: 'run-fast' },
};
const DEFAULT_TYPE = { accent: '#94A3B8', iconBg: BG, icon: 'calendar-check' };

function addMins(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekDates(offset: number): string[] {
  const base = new Date();
  base.setDate(base.getDate() - base.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return localDateStr(d);
  });
}

function fullDateLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${m}월 ${d}일 ${dayNames[dow]}`;
}

// ── 스케줄 카드 ────────────────────────────────────────────
function EventCard({ item }: { item: ScheduleItem }) {
  const tc = TYPE_CFG[item.type] ?? DEFAULT_TYPE;
  const sc = STATUS_CFG[item.status];

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.78}>
      {/* 좌측 컬러 바 */}
      <View style={[s.cardBar, { backgroundColor: tc.accent }]} />

      <View style={s.cardInner}>
        {/* 시간 · 타입 행 */}
        <View style={s.cardTopRow}>
          <Text style={s.cardTime}>
            {item.startTime}
            <Text style={s.cardTimeSep}> – </Text>
            <Text style={s.cardTimeEnd}>{item.endTime}</Text>
          </Text>
          <View style={[s.typePill, { backgroundColor: tc.iconBg }]}>
            <MaterialCommunityIcons name={tc.icon as any} size={11} color={tc.accent} />
            <Text style={[s.typePillText, { color: tc.accent }]}>{item.type}</Text>
          </View>
        </View>

        {/* 구분선 */}
        <View style={s.cardDivider} />

        {/* 인물 · 상태 행 */}
        <View style={s.cardBottomRow}>
          <View style={[s.personIcon, { backgroundColor: tc.iconBg }]}>
            <Text style={[s.personIconText, { color: tc.accent }]}>{item.person[0]}</Text>
          </View>
          <View style={s.personInfo}>
            <Text style={s.personName}>{item.person} <Text style={s.personRole}>{item.role}</Text></Text>
            <Text style={s.personDetail}>{item.detail}</Text>
          </View>
          <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
            <View style={[s.statusDot, { backgroundColor: sc.dot }]} />
            <Text style={[s.statusText, { color: sc.text }]}>{item.status}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── 메인 ────────────────────────────────────────────────────
export default function GymScheduleScreen() {
  const { gymAdmin } = useAuthStore();
  const GYM_ID = gymAdmin?.gymId ?? 'gym_001';

  const { slotBookings } = useGymSlotStore();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selDate, setSelDate]       = useState(TODAY);
  const [filter, setFilter]         = useState<FilterKey>('전체');

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const displayDate    = new Date(selDate);
  const yearMonthLabel = `${displayDate.getFullYear()}년 ${MONTH_NAMES[displayDate.getMonth()]}`;

  // 헬스장 일정 = 해당 헬스장의 슬롯(시설 이용) 예약만. PT 예약은 헬스장 소속 정보가 없어 제외 → 대시보드 집계와 일치
  const allItems = useMemo((): ScheduleItem[] => {
    const items: ScheduleItem[] = [];

    slotBookings
      .filter((b) => b.gymId === GYM_ID && b.date === selDate)
      .forEach((b) => {
        items.push({
          id:        'slot_' + b.id,
          startTime: b.startTime,
          endTime:   addMins(b.startTime, 60),
          type:      '헬스장 이용',
          person:    b.trainerName,
          role:      '트레이너',
          detail:    `시설료 ${(b.facilityFee ?? 0).toLocaleString()}원`,
          status:    b.status === 'pending'   ? '승인 대기'
                   : b.status === 'confirmed' ? '승인 완료'
                   :                            '취소/반려',
        });
      });

    return items.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [slotBookings, selDate, GYM_ID]);

  const filtered = useMemo(() =>
    filter === '전체' ? allItems : allItems.filter((i) => i.status === filter),
    [allItems, filter]
  );

  const counts: Record<FilterKey, number> = {
    '전체':    allItems.length,
    '승인 완료': allItems.filter((i) => i.status === '승인 완료').length,
    '승인 대기': allItems.filter((i) => i.status === '승인 대기').length,
    '완료':    allItems.filter((i) => i.status === '완료').length,
    '취소/반려': allItems.filter((i) => i.status === '취소/반려').length,
  };

  const isToday = selDate === TODAY;

  return (
    <SafeAreaView style={s.root}>

      {/* ══ 고정 헤더 영역 ══ */}
      <View style={s.stickyTop}>

        {/* 월 네비게이션 */}
        <View style={s.monthRow}>
          <TouchableOpacity
            style={s.monthArrow}
            onPress={() => setWeekOffset((o) => o - 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={SLATE} />
          </TouchableOpacity>
          <Text style={s.monthText}>{yearMonthLabel}</Text>
          <TouchableOpacity
            style={s.monthArrow}
            onPress={() => setWeekOffset((o) => o + 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="chevron-right" size={20} color={SLATE} />
          </TouchableOpacity>
        </View>

        {/* 주간 날짜 스트립 */}
        <View style={s.weekStrip}>
          {weekDates.map((d) => {
            const dow  = new Date(d).getDay();
            const day  = parseInt(d.split('-')[2]);
            const isSel    = d === selDate;
            const isToday_ = d === TODAY;
            const isSun    = dow === 0;
            const isSat    = dow === 6;

            // 해당 날짜의 이벤트 수
            const evCount =
              slotBookings.filter((b) => b.gymId === GYM_ID && b.date === d).length;

            return (
              <TouchableOpacity key={d} style={s.dayItem} onPress={() => setSelDate(d)}>
                <Text style={[
                  s.dowText,
                  isSun && !isSel && { color: '#F87171' },
                  isSat && !isSel && { color: '#60A5FA' },
                  isSel && { color: '#fff', fontWeight: '700' },
                ]}>
                  {DAY_LABELS[dow]}
                </Text>

                <View style={[
                  s.dayCircle,
                  isSel    && s.dayCircleSel,
                  isToday_ && !isSel && s.dayCircleToday,
                ]}>
                  <Text style={[
                    s.dayNumber,
                    isSun && !isSel && { color: '#F87171' },
                    isSat && !isSel && { color: '#60A5FA' },
                    isSel  && { color: '#fff', fontWeight: '800' },
                    isToday_ && !isSel && { color: GYM, fontWeight: '800' },
                  ]}>
                    {day}
                  </Text>
                </View>

                {/* 이벤트 인디케이터 도트 */}
                <View style={s.dotWrap}>
                  {evCount > 0 && (
                    <View style={[s.eventDot, { backgroundColor: isSel ? '#fff' : GYM }]} />
                  )}
                  {evCount > 1 && (
                    <View style={[s.eventDot, { backgroundColor: isSel ? 'rgba(255,255,255,0.6)' : '#818CF8' }]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 필터 탭 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          style={s.filterScroll}
        >
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            const cnt    = counts[key];
            return (
              <TouchableOpacity
                key={key}
                style={[s.filterPill, active && s.filterPillOn]}
                onPress={() => setFilter(key)}
              >
                <Text style={[s.filterText, active && s.filterTextOn]}>
                  {label}
                  {cnt > 0 && <Text style={active ? s.filterCountOn : s.filterCount}> {cnt}</Text>}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══ 스크롤 콘텐츠 ══ */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listPad}

        ListHeaderComponent={
          <View style={s.dateHeader}>
            <View style={s.dateHeaderLeft}>
              {isToday && (
                <View style={s.todayChip}>
                  <Text style={s.todayChipText}>오늘</Text>
                </View>
              )}
              <Text style={s.dateHeaderText}>{fullDateLabel(selDate)}</Text>
            </View>
            {allItems.length > 0 && (
              <View style={s.totalBadge}>
                <Text style={s.totalBadgeText}>{allItems.length}건</Text>
              </View>
            )}
          </View>
        }

        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}

        renderItem={({ item }) => <EventCard item={item} />}

        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconBox}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={36} color={SLATE} />
            </View>
            <Text style={s.emptyTitle}>예약 없음</Text>
            <Text style={s.emptySub}>이 날에는 예약된 일정이 없습니다</Text>
          </View>
        }
      />

    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── 고정 헤더 ──
  stickyTop: {
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },

  // 월 네비
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  monthArrow: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },

  // 주간 스트립
  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  dowText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
  dayCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleSel: {
    backgroundColor: GYM,
  },
  dayCircleToday: {
    backgroundColor: GYM + '18',
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  dotWrap: {
    flexDirection: 'row',
    gap: 3,
    height: 5,
    alignItems: 'center',
  },
  eventDot: {
    width: 4, height: 4, borderRadius: 2,
  },

  // 필터
  filterScroll: {
    borderTopWidth: 1,
    borderTopColor: BG,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: BG,
  },
  filterPillOn: {
    backgroundColor: GYM,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: SLATE,
  },
  filterTextOn: {
    color: '#fff',
    fontWeight: '700',
  },
  filterCount: {
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterCountOn: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },

  // 리스트
  listPad: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 48,
  },

  // 날짜 헤더
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayChip: {
    backgroundColor: GYM + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3D4FD9',
    letterSpacing: 0.2,
  },
  dateHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalBadge: {
    backgroundColor: CARD,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BD,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: SLATE,
  },

  // ── 이벤트 카드 ──
  card: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },

  // 카드 상단 행 (시간 + 타입)
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTime: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  cardTimeSep: {
    fontSize: 13,
    fontWeight: '400',
    color: '#94A3B8',
  },
  cardTimeEnd: {
    fontSize: 13,
    fontWeight: '500',
    color: SLATE,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // 구분선
  cardDivider: {
    height: 1,
    backgroundColor: BG,
  },

  // 카드 하단 행 (인물 + 상태)
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  personIcon: {
    width: 38, height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  personIconText: {
    fontSize: 16,
    fontWeight: '800',
  },
  personInfo: {
    flex: 1,
    gap: 2,
  },
  personName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  personRole: {
    fontSize: 13,
    fontWeight: '500',
    color: SLATE,
  },
  personDetail: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    flexShrink: 0,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // 빈 상태
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIconBox: {
    width: 68, height: 68,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: BD,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
