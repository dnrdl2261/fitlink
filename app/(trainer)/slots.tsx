import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, TextInput, Modal, Alert, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { MOCK_GYMS } from '../../data/gyms';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useLocationStore } from '../../store/locationStore';
import { formatPrice } from '../../utils/formatters';
import { DAY_LABELS } from '../../utils/constants';
import { SlotInfo } from '../../types';

// ── 색상 ──────────────────────────────────────────────────────
const DARK = {
  bg:       '#F8F9FA',
  surface:  '#FFFFFF',
  surface2: '#F3F4F6',
  border:   '#E5E7EB',
  text:     '#111827',
  textSec:  '#6B7280',
  textMuted:'#9CA3AF',
  primary:  '#4F63F5',
  success:  '#22C55E',
  error:    '#EF4444',
  amber:    '#F59E0B',
};

const LIGHT = {
  bg:       '#F8F9FA',
  surface:  '#FFFFFF',
  surface2: '#F3F4F6',
  border:   '#E5E7EB',
  text:     '#111827',
  textSec:  '#6B7280',
  textMuted:'#9CA3AF',
  primary:  '#5C6AF5',
  success:  '#22C55E',
  error:    '#EF4444',
  amber:    '#F59E0B',
};

// ── 필터 정의 ─────────────────────────────────────────────────
const FILTERS = [
  { id: 'all',    label: '전체' },
  { id: 'pt',     label: 'PT가능' },
  { id: 'park',   label: '주차가능' },
  { id: 'shower', label: '샤워실' },
  { id: 'locker', label: '락커룸' },
  { id: 'sauna',  label: '사우나' },
];

// ── 거리 계산 ──────────────────────────────────────────────────
function calcKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// ── 월력 유틸 ──────────────────────────────────────────────────
function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function toDateStr(d: Date) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ── 6단계 인디케이터 ───────────────────────────────────────────
function FlowIndicator({ step }: { step: number }) {
  const steps = ['헬스장', '시간', '의류비', '요청', '대기', '이용'];
  return (
    <View style={fi.wrap}>
      <View style={fi.row}>
        {steps.map((_, i) => (
          <React.Fragment key={i}>
            <View style={[fi.dot, i < step && fi.dotDone, i === step && fi.dotActive]}>
              <Text style={[fi.num, i <= step && fi.numActive]}>
                {i < step ? '✓' : i + 1}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[fi.line, i < step && fi.lineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <View style={fi.labels}>
        {steps.map((label, i) => (
          <Text key={label} style={[fi.label, i === step && fi.labelActive, i < step && fi.labelDone]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const fi = StyleSheet.create({
  wrap:        { backgroundColor: LIGHT.surface, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: LIGHT.border },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingHorizontal: 16 },
  dot:         { width: 26, height: 26, borderRadius: 13, backgroundColor: LIGHT.surface2, borderWidth: 2, borderColor: LIGHT.border, alignItems: 'center', justifyContent: 'center' },
  dotDone:     { backgroundColor: LIGHT.primary, borderColor: LIGHT.primary },
  dotActive:   { backgroundColor: LIGHT.primary, borderColor: LIGHT.primary },
  num:         { fontSize: 10, fontWeight: '800', color: LIGHT.textMuted },
  numActive:   { color: '#fff' },
  line:        { flex: 1, height: 2, backgroundColor: LIGHT.border },
  lineDone:    { backgroundColor: LIGHT.primary },
  labels:      { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 5, paddingBottom: 2 },
  label:       { fontSize: 9, color: LIGHT.textMuted, flex: 1, textAlign: 'center' },
  labelActive: { color: LIGHT.primary, fontWeight: '800' },
  labelDone:   { color: LIGHT.primary, fontWeight: '600' },
});

// ── 다중 선택 타입 ─────────────────────────────────────────────
type PendingSlot = { date: string; slot: SlotInfo };

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function TrainerSlotsScreen() {
  const today    = new Date();
  const todayStr = toDateStr(today);
  const router   = useRouter();
  const { gymId: initGymId, memberName } = useLocalSearchParams<{ gymId?: string; memberName?: string }>();

  const { trainer }         = useAuthStore();
  const { getAvailableSlots, cancelSlot, isBlacklisted, toggleFavorite, favoriteGyms } = useGymSlotStore();
  useGymSlotStore((s) => s.slotBookings);
  const { currentLocation } = useLocationStore();

  // ── 상태 ──────────────────────────────────────────────────────
  const [step, setStep]               = useState<'gym' | 'time' | 'review'>(initGymId ? 'time' : 'gym');
  const [selectedGymId, setSelectedGymId] = useState<string | null>(initGymId ?? null);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');

  // 달력 상태
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 다중 슬롯 선택
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const [amOpen, setAmOpen] = useState(true);
  const [pmOpen, setPmOpen] = useState(true);

  // 날짜 중복선택 모드
  const [multiDateMode, setMultiDateMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // 취소 모달
  const [cancelTarget, setCancelTarget] = useState<import('../../types').SlotBooking | null>(null);

  // 헬스장 변경(다른 gymId로 재진입) 시 상태 리셋
  useEffect(() => {
    setStep(initGymId ? 'time' : 'gym');
    setSelectedGymId(initGymId ?? null);
    setSelectedDate(null);
    setSelectedDates([]);
    setMultiDateMode(false);
    setPendingSlots([]);
  }, [initGymId]);

  // ── 헬스장 목록 ───────────────────────────────────────────────
  const sortedGyms = useMemo(() => {
    return MOCK_GYMS.map((g) => ({
      ...g,
      distance: calcKm(currentLocation.latitude, currentLocation.longitude, g.coordinate.latitude, g.coordinate.longitude),
    })).sort((a, b) => {
      const af = favoriteGyms.includes(a.id) ? 0 : 1;
      const bf = favoriteGyms.includes(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.distance - b.distance;
    });
  }, [currentLocation, favoriteGyms]);

  const filteredGyms = useMemo(() => {
    let list = sortedGyms;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((g) => g.name.toLowerCase().includes(q) || g.address.toLowerCase().includes(q));
    if (filter === 'pt')     list = list.filter((g) => g.operatingHours.some((h) => h.ptAvailable));
    if (filter === 'park')   list = list.filter((g) => g.facilities.some((f) => f.includes('주차')));
    if (filter === 'shower') list = list.filter((g) => g.facilities.some((f) => f.includes('샤워')));
    if (filter === 'locker') list = list.filter((g) => g.facilities.some((f) => f.includes('락커')));
    if (filter === 'sauna')  list = list.filter((g) => g.facilities.some((f) => f.includes('사우나')));
    return list;
  }, [sortedGyms, search, filter]);

  // ── 선택된 헬스장 정보 ─────────────────────────────────────────
  const selectedGym = selectedGymId ? MOCK_GYMS.find((g) => g.id === selectedGymId) ?? null : null;
  const singleFee   = selectedGym?.pricing.find((p) => p.sessionType === 'single')?.facilityFee ?? 0;

  // ── 다중 슬롯 선택 로직 ────────────────────────────────────────
  const toggleSlot = (date: string, slot: SlotInfo) => {
    if (multiDateMode && selectedDates.length > 0) {
      setPendingSlots(prev => {
        const allAdded = selectedDates.every(d =>
          prev.some(p => p.date === d && p.slot.startTime === slot.startTime)
        );
        if (allAdded) {
          return prev.filter(p => !(selectedDates.includes(p.date) && p.slot.startTime === slot.startTime));
        }
        const toAdd = selectedDates
          .filter(d => !prev.some(p => p.date === d && p.slot.startTime === slot.startTime))
          .map(d => ({ date: d, slot }));
        return [...prev, ...toAdd];
      });
    } else {
      setPendingSlots(prev => {
        const idx = prev.findIndex(p => p.date === date && p.slot.startTime === slot.startTime);
        if (idx >= 0) return prev.filter((_, i) => i !== idx);
        return [...prev, { date, slot }];
      });
    }
  };

  const pendingDates = useMemo(() => new Set(pendingSlots.map(p => p.date)), [pendingSlots]);
  const totalFee = singleFee * pendingSlots.length;

  const isSlotPending = (date: string, startTime: string) =>
    pendingSlots.some(p => p.date === date && p.slot.startTime === startTime);

  const handleGoToReview = () => {
    if (pendingSlots.length === 0) return;
    setStep('review');
  };

  const handleSubmit = () => {
    if (!selectedGymId || !selectedGym || pendingSlots.length === 0) return;
    const sorted = [...pendingSlots].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.slot.startTime.localeCompare(b.slot.startTime)
    );
    router.push({
      pathname: '/(trainer)/gym-book-pay',
      params: {
        gymId:       selectedGymId,
        gymName:     selectedGym.name,
        facilityFee: String(singleFee),
        slots:       JSON.stringify(sorted.map(p => ({ date: p.date, startTime: p.slot.startTime, endTime: p.slot.endTime }))),
        memberName:  memberName ?? '',
      },
    } as any);
  };

  // ── 달력 ──────────────────────────────────────────────────────
  const calDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  const isPastDate = (d: Date) => toDateStr(d) < todayStr;

  const handleSelectDate = (d: Date) => {
    if (isPastDate(d)) return;
    const ds = toDateStr(d);
    if (multiDateMode) {
      setSelectedDates(prev =>
        prev.includes(ds) ? prev.filter(x => x !== ds) : [...prev, ds]
      );
    } else {
      setSelectedDate(ds);
    }
  };

  // ── 슬롯 ──────────────────────────────────────────────────────
  const activeDate = multiDateMode ? (selectedDates[0] ?? null) : selectedDate;

  const slots = useMemo(() => {
    if (!selectedGymId || !activeDate) return [];
    return getAvailableSlots(selectedGymId, activeDate, trainer?.id ?? '');
  }, [selectedGymId, activeDate, trainer?.id]);

  const amSlots = slots.filter((s) => s.startTime < '12:00');
  const pmSlots = slots.filter((s) => s.startTime >= '12:00');

  const dayOfWeek = activeDate ? new Date(activeDate).getDay() : 0;
  const hours = selectedGym?.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);

  const canCancel = (date: string, startTime: string) => {
    const slotTime = new Date(`${date}T${startTime}:00`);
    return new Date() < new Date(slotTime.getTime() - 10 * 60 * 1000);
  };

  const handleCancelPress = (booking: import('../../types').SlotBooking) => {
    if (!canCancel(booking.date, booking.startTime)) {
      Alert.alert('취소 불가', '예약 시간 10분 전부터는 취소가 불가능합니다.');
      return;
    }
    setCancelTarget(booking);
  };

  const handleCancelConfirm = () => {
    if (!cancelTarget) return;
    cancelSlot(cancelTarget.id);
    setCancelTarget(null);
  };

  // ════════════════════════════════════════════════════════════
  // STEP 1: 헬스장 검색 및 선택
  // ════════════════════════════════════════════════════════════
  if (step === 'gym') {
    return (
      <SafeAreaView key="gym" style={ds.container}>
        <View style={ds.header}>
          <TouchableOpacity style={ds.headerBack} onPress={() => router.navigate('/(trainer)/more' as any)}>
            <Text style={ds.headerBackText}>‹</Text>
          </TouchableOpacity>
          <View style={ds.headerCenter}>
            <Text style={ds.headerTitle}>헬스장 검색</Text>
            <Text style={ds.headerSub}>슬롯을 예약할 헬스장을 선택하세요</Text>
          </View>
          <TouchableOpacity
            style={ds.myBookBtn}
            onPress={() => router.push('/(trainer)/my-slot-bookings' as any)}
          >
            <Text style={ds.myBookBtnText}>내 예약</Text>
          </TouchableOpacity>
        </View>

        <View style={ds.searchWrap}>
          <View style={ds.searchBar}>
            <Text style={ds.searchIcon}>🔍</Text>
            <TextInput
              style={ds.searchInput}
              placeholder="헬스장 이름 또는 주소 검색..."
              placeholderTextColor={DARK.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={ds.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={ds.filterScroll}
          contentContainerStyle={ds.filterContent}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[ds.filterChip, filter === f.id && ds.filterChipActive]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[ds.filterChipText, filter === f.id && ds.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ds.listContent}>
          {filteredGyms.length === 0 && (
            <View style={ds.emptyBox}>
              <Text style={ds.emptyIcon}>🏋️</Text>
              <Text style={ds.emptyText}>검색 결과가 없습니다</Text>
              <Text style={ds.emptySub}>다른 검색어나 필터를 시도해보세요</Text>
            </View>
          )}
          {filteredGyms.map((gym) => {
            const fee    = gym.pricing.find((p) => p.sessionType === 'single')?.facilityFee ?? 0;
            const hasPT  = gym.operatingHours.some((h) => h.ptAvailable);
            const fav    = favoriteGyms.includes(gym.id);
            const tags   = [
              hasPT                                           && 'PT가능',
              gym.facilities.some((f) => f.includes('주차')) && '주차',
              gym.facilities.some((f) => f.includes('샤워')) && '샤워실',
              gym.facilities.some((f) => f.includes('락커')) && '락커',
              gym.facilities.some((f) => f.includes('사우나'))&& '사우나',
            ].filter(Boolean) as string[];

            return (
              <TouchableOpacity
                key={gym.id}
                style={ds.gymCard}
                onPress={() => { setSelectedGymId(gym.id); setStep('time'); setSelectedDate(null); setPendingSlots([]); }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: gym.images[0] }} style={ds.gymImg} />
                <View style={ds.gymInfo}>
                  <View style={ds.gymNameRow}>
                    <Text style={ds.gymName} numberOfLines={1}>{gym.name}</Text>
                    {fav && <Text style={ds.gymFavStar}>★</Text>}
                  </View>
                  <Text style={ds.gymAddr} numberOfLines={1}>{gym.address}</Text>
                  <View style={ds.gymTags}>
                    {tags.slice(0, 3).map((t) => (
                      <View key={t} style={[ds.gymTag, t === 'PT가능' && ds.gymTagPT]}>
                        <Text style={[ds.gymTagText, t === 'PT가능' && ds.gymTagPTText]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={ds.gymMeta}>
                    <Text style={ds.gymRating}>⭐ {gym.rating.toFixed(1)}</Text>
                    <Text style={ds.gymMetaDot}>·</Text>
                    <Text style={ds.gymDist}>📍 {fmtDist(gym.distance)}</Text>
                    <Text style={ds.gymMetaDot}>·</Text>
                    <Text style={ds.gymFee}>1회 {formatPrice(fee)}</Text>
                  </View>
                </View>
                <View style={ds.gymRight}>
                  <TouchableOpacity
                    style={ds.favBtn}
                    onPress={(e) => { e.stopPropagation(); toggleFavorite(gym.id); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[ds.favIcon, fav && ds.favIconActive]}>{fav ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                  <View style={ds.selectBtn}>
                    <Text style={ds.selectBtnText}>선택</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════
  // STEP 3: 선택 목록 확인 및 예약 신청
  // ════════════════════════════════════════════════════════════
  if (step === 'review') {
    const sorted = [...pendingSlots].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.slot.startTime.localeCompare(b.slot.startTime)
    );
    return (
      <SafeAreaView key="review" style={ls.container}>
        <View style={ls.header}>
          <TouchableOpacity onPress={() => setStep('time')} style={ls.backBtn}>
            <Text style={ls.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={ls.headerTitle} numberOfLines={1}>예약 목록 확인</Text>
          <View style={{ width: 60 }} />
        </View>

        <FlowIndicator step={1} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ls.scrollContent}>
          {/* 헬스장 정보 */}
          <View style={ls.gymInfoCard}>
            <Image source={{ uri: selectedGym?.images[0] }} style={ls.gymInfoImg} />
            <View style={ls.gymInfoText}>
              <Text style={ls.gymInfoName}>{selectedGym?.name}</Text>
              <Text style={ls.gymInfoAddr}>{selectedGym?.address}</Text>
              <Text style={ls.gymInfoFee}>1회 이용료 {formatPrice(singleFee)}</Text>
            </View>
          </View>

          {/* 선택 목록 */}
          <View style={ls.reviewCard}>
            <View style={ls.reviewCardHeader}>
              <Text style={ls.reviewCardTitle}>선택한 예약 목록</Text>
              <View style={ls.reviewCountBadge}>
                <Text style={ls.reviewCountText}>{sorted.length}개</Text>
              </View>
            </View>

            {sorted.map((p, idx) => {
              const parts = p.date.split('-');
              const m = parseInt(parts[1]);
              const d = parseInt(parts[2]);
              const dow = new Date(p.date).getDay();
              return (
                <View key={`${p.date}-${p.slot.startTime}`}>
                  {idx > 0 && <View style={ls.reviewItemDivider} />}
                  <View style={ls.reviewItem}>
                    <View style={ls.reviewItemLeft}>
                      <Text style={ls.reviewItemDate}>{m}월 {d}일 ({DAY_LABELS[dow]})</Text>
                      <Text style={ls.reviewItemTime}>{p.slot.startTime} ~ {p.slot.endTime}</Text>
                    </View>
                    <Text style={ls.reviewItemFee}>{formatPrice(singleFee)}</Text>
                    <TouchableOpacity
                      onPress={() => toggleSlot(p.date, p.slot)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={ls.reviewRemoveBtn}
                    >
                      <Text style={ls.reviewRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <View style={ls.reviewTotalRow}>
              <Text style={ls.reviewTotalLabel}>총 {sorted.length}회 합계</Text>
              <Text style={ls.reviewTotalFee}>{formatPrice(totalFee)}</Text>
            </View>
          </View>

          {/* 더 추가하기 */}
          <TouchableOpacity style={ls.addMoreBtn} onPress={() => setStep('time')} activeOpacity={0.75}>
            <Text style={ls.addMoreBtnText}>+ 날짜·시간 더 추가하기</Text>
          </TouchableOpacity>

          {/* 안내 */}
          <View style={ls.reviewInfoBox}>
            <Text style={ls.reviewInfoTitle}>📋 예약 신청 후 진행 사항</Text>
            <Text style={ls.reviewInfoBody}>
              • 헬스장 관리자에게 각 슬롯의 예약 요청이 전송됩니다{'\n'}
              • 승인 완료 후 내 예약에서 QR 코드로 입장하실 수 있습니다
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={ls.footer}>
          <View style={ls.footerInfo}>
            <Text style={ls.footerTime}>{sorted.length}개 선택됨</Text>
            <Text style={ls.footerFee}>합계 {formatPrice(totalFee)}</Text>
          </View>
          <TouchableOpacity style={ls.nextBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={ls.nextBtnText}>예약 신청하기</Text>
            <Text style={ls.nextBtnArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════
  // STEP 2: 이용 시간 선택 (달력 + 슬롯 다중 선택)
  // ════════════════════════════════════════════════════════════
  const isBlocked = isBlacklisted(selectedGymId ?? '', trainer?.id ?? '');

  const [selDateParts] = activeDate ? [activeDate.split('-')] : [['', '', '']];
  const selMonth = activeDate ? parseInt(selDateParts[1]) : 0;
  const selDay   = activeDate ? parseInt(selDateParts[2]) : 0;

  return (
    <SafeAreaView key="time" style={ls.container}>
      <View style={ls.header}>
        <TouchableOpacity onPress={() => { setStep('gym'); setSelectedDate(null); setPendingSlots([]); }} style={ls.backBtn}>
          <Text style={ls.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={ls.headerTitle} numberOfLines={1}>{selectedGym?.name}</Text>
        <TouchableOpacity onPress={() => router.push('/(trainer)/my-slot-bookings' as any)} style={ls.myBookSmall}>
          <Text style={ls.myBookSmallText}>내 예약</Text>
        </TouchableOpacity>
      </View>

      <FlowIndicator step={1} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ls.scrollContent}>
        {isBlocked && (
          <View style={ls.blockedBanner}>
            <Text style={ls.blockedIcon}>🚫</Text>
            <View>
              <Text style={ls.blockedTitle}>이용이 제한된 헬스장입니다</Text>
              <Text style={ls.blockedSub}>해당 헬스장 관리자에 의해 슬롯 예약이 불가합니다.</Text>
            </View>
          </View>
        )}

        {!isBlocked && (
          <>
            {/* 헬스장 정보 */}
            <View style={ls.gymInfoCard}>
              <Image source={{ uri: selectedGym?.images[0] }} style={ls.gymInfoImg} />
              <View style={ls.gymInfoText}>
                <Text style={ls.gymInfoName}>{selectedGym?.name}</Text>
                <Text style={ls.gymInfoAddr}>{selectedGym?.address}</Text>
                <Text style={ls.gymInfoFee}>1회 이용료 {formatPrice(singleFee)}</Text>
              </View>
            </View>

            {!!memberName && (
              <View style={ls.memberChip}>
                <MaterialCommunityIcons name="account-circle-outline" size={16} color={LIGHT.primary} />
                <Text style={ls.memberChipText}>{memberName} 회원을 위한 예약</Text>
              </View>
            )}

            {/* 달력 */}
            <View style={ls.calCard}>
              <View style={ls.calHeader}>
                <TouchableOpacity onPress={prevMonth} style={ls.calNavBtn}>
                  <Text style={ls.calNavText}>‹</Text>
                </TouchableOpacity>
                <Text style={ls.calMonthTitle}>{calYear}년 {calMonth + 1}월</Text>
                <TouchableOpacity onPress={nextMonth} style={ls.calNavBtn}>
                  <Text style={ls.calNavText}>›</Text>
                </TouchableOpacity>
              </View>

              {/* 날짜 중복선택 토글 */}
              <TouchableOpacity
                style={[ls.multiToggle, multiDateMode && ls.multiToggleOn]}
                onPress={() => { setMultiDateMode(v => !v); setSelectedDates([]); setSelectedDate(null); }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="calendar-multiple"
                  size={14}
                  color={multiDateMode ? '#fff' : LIGHT.textSec}
                />
                <Text style={[ls.multiToggleText, multiDateMode && ls.multiToggleTextOn]}>
                  날짜 중복선택{multiDateMode ? ' ON' : ''}
                </Text>
              </TouchableOpacity>

              {/* 선택된 날짜 요약 (중복선택 모드) */}
              {multiDateMode && selectedDates.length > 0 && (
                <View style={ls.multiSummary}>
                  <Text style={ls.multiSummaryCount}>{selectedDates.length}일 선택됨</Text>
                  <Text style={ls.multiSummaryDates} numberOfLines={2}>
                    {[...selectedDates].sort().map(d => {
                      const [y2, m2, d2] = d.split('-').map(Number);
                      const dow = new Date(y2, m2 - 1, d2).getDay();
                      return `${m2}/${d2}(${['일','월','화','수','목','금','토'][dow]})`;
                    }).join(' · ')}
                  </Text>
                </View>
              )}

              <View style={ls.calDowRow}>
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                  <Text key={d} style={[ls.calDow, i === 0 && ls.calDowSun, i === 6 && ls.calDowSat]}>{d}</Text>
                ))}
              </View>

              <View style={ls.calGrid}>
                {calDays.map((d, idx) => {
                  if (!d) return <View key={`empty-${idx}`} style={ls.calCell} />;
                  const ds         = toDateStr(d);
                  const isToday    = ds === todayStr;
                  const isPast     = ds < todayStr;
                  const isSel      = multiDateMode ? selectedDates.includes(ds) : ds === selectedDate;
                  const hasPending = pendingDates.has(ds);
                  const dow        = d.getDay();

                  return (
                    <TouchableOpacity
                      key={ds}
                      style={ls.calCell}
                      onPress={() => !isPast && handleSelectDate(d)}
                      activeOpacity={isPast ? 1 : 0.7}
                    >
                      <View style={[
                        ls.calDayCircle,
                        isSel && ls.calDayCircleSel,
                        isToday && !isSel && ls.calDayCircleToday,
                        isPast && ls.calDayCirclePast,
                      ]}>
                        <Text style={[
                          ls.calDayNum,
                          isSel && ls.calDayNumSel,
                          isToday && !isSel && ls.calDayNumToday,
                          isPast && ls.calDayNumPast,
                          !isSel && !isPast && dow === 0 && ls.calDayNumSun,
                          !isSel && !isPast && dow === 6 && ls.calDayNumSat,
                        ]}>
                          {d.getDate()}
                        </Text>
                      </View>
                      {hasPending && !isSel && <View style={ls.calPendingDot} />}
                      {isToday && !isSel && !hasPending && <View style={ls.calTodayDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {!activeDate && (
              <View style={ls.dateHintBox}>
                <Text style={ls.dateHintIcon}>📅</Text>
                <Text style={ls.dateHintText}>
                  {multiDateMode
                    ? '날짜를 여러 개 선택하면 공통 시간대를 한 번에 예약할 수 있습니다'
                    : '날짜를 선택하면 이용 가능한 시간대가 표시됩니다'}
                </Text>
              </View>
            )}

            {activeDate && (
              <View style={ls.slotSection}>
                <Text style={ls.slotSectionTitle}>
                  {multiDateMode && selectedDates.length > 1
                    ? `${selectedDates.length}일 공통 시간 선택 (${selMonth}/${selDay} 기준)`
                    : `${selMonth}월 ${selDay}일 (${DAY_LABELS[dayOfWeek]}) 이용 시간 선택`}
                </Text>

                {(!hours || !hours.ptAvailable) && (
                  <View style={ls.noSlotBox}>
                    <Text style={ls.noSlotText}>이 날은 외부 트레이너 PT가 불가한 날입니다.</Text>
                  </View>
                )}

                {hours && hours.ptAvailable && (
                  <>
                    <View style={ls.legendRow}>
                      {[
                        { color: LIGHT.primary, label: '선택됨' },
                        { color: LIGHT.amber,   label: '내 예약' },
                        { color: '#9CA3AF',     label: '마감' },
                      ].map((l) => (
                        <View key={l.label} style={ls.legendItem}>
                          <View style={[ls.legendDot, { backgroundColor: l.color }]} />
                          <Text style={ls.legendText}>{l.label}</Text>
                        </View>
                      ))}
                    </View>

                    {/* 오전 */}
                    <View style={ls.accordion}>
                      <TouchableOpacity style={ls.accordionHead} onPress={() => setAmOpen((v) => !v)}>
                        <View>
                          <Text style={ls.accordionTitle}>오전</Text>
                          <Text style={ls.accordionSub}>{hours.openTime} ~ 11:30</Text>
                        </View>
                        <View style={ls.accordionRight}>
                          <Text style={ls.accordionCount}>{amSlots.filter((s) => s.isAvailable && !s.myBooking).length}개 가능</Text>
                          <Text style={ls.accordionChev}>{amOpen ? '▲' : '▼'}</Text>
                        </View>
                      </TouchableOpacity>
                      {amOpen && (
                        <View style={ls.accordionBody}>
                          {amSlots.length === 0
                            ? <Text style={ls.noSlotText}>오전 슬롯이 없습니다</Text>
                            : amSlots.map((slot) => renderSlot(slot, activeDate ?? '', pendingSlots, toggleSlot, handleCancelPress, LIGHT))}
                        </View>
                      )}
                    </View>

                    {/* 오후 */}
                    <View style={ls.accordion}>
                      <TouchableOpacity style={ls.accordionHead} onPress={() => setPmOpen((v) => !v)}>
                        <View>
                          <Text style={ls.accordionTitle}>오후</Text>
                          <Text style={ls.accordionSub}>12:00 ~ {hours.closeTime}</Text>
                        </View>
                        <View style={ls.accordionRight}>
                          <Text style={ls.accordionCount}>{pmSlots.filter((s) => s.isAvailable && !s.myBooking).length}개 가능</Text>
                          <Text style={ls.accordionChev}>{pmOpen ? '▲' : '▼'}</Text>
                        </View>
                      </TouchableOpacity>
                      {pmOpen && (
                        <View style={ls.accordionBody}>
                          {pmSlots.length === 0
                            ? <Text style={ls.noSlotText}>오후 슬롯이 없습니다</Text>
                            : pmSlots.map((slot) => renderSlot(slot, activeDate ?? '', pendingSlots, toggleSlot, handleCancelPress, LIGHT))}
                        </View>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 하단 선택 완료 버튼 */}
      {!isBlocked && pendingSlots.length > 0 && (
        <View style={ls.footer}>
          <View style={ls.footerInfo}>
            <Text style={ls.footerTime}>{pendingSlots.length}개 선택됨</Text>
            <Text style={ls.footerFee}>합계 {formatPrice(totalFee)}</Text>
          </View>
          <TouchableOpacity style={ls.nextBtn} onPress={handleGoToReview} activeOpacity={0.85}>
            <Text style={ls.nextBtnText}>선택 완료</Text>
            <Text style={ls.nextBtnArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 취소 확인 모달 */}
      <Modal visible={!!cancelTarget} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
        <View style={ls.modalOverlay}>
          <View style={ls.cancelModal}>
            <Text style={ls.cancelModalTitle}>예약 취소</Text>
            <Text style={ls.cancelModalMsg}>정말 취소하시겠습니까?</Text>
            {cancelTarget && (
              <View style={ls.cancelInfo}>
                <Text style={ls.cancelInfoText}>{cancelTarget.gymName}</Text>
                <Text style={ls.cancelInfoText}>{cancelTarget.date}  {cancelTarget.startTime}</Text>
              </View>
            )}
            <View style={ls.cancelBtnRow}>
              <TouchableOpacity style={[ls.cancelBtn, ls.cancelBtnNo]} onPress={() => setCancelTarget(null)}>
                <Text style={ls.cancelBtnNoText}>아니오</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ls.cancelBtn, ls.cancelBtnYes]} onPress={handleCancelConfirm}>
                <Text style={ls.cancelBtnYesText}>취소하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── 슬롯 칩 렌더 ─────────────────────────────────────────────
function renderSlot(
  slot: SlotInfo,
  currentDate: string,
  pendingSlots: PendingSlot[],
  toggleSlot: (date: string, slot: SlotInfo) => void,
  handleCancelPress: (b: import('../../types').SlotBooking) => void,
  D: typeof LIGHT,
) {
  const isMine      = !!slot.myBooking;
  const isPending   = slot.myBooking?.status === 'pending';
  const isConfirmed = slot.myBooking?.status === 'confirmed';
  const isFull      = !slot.isAvailable && !isMine;
  const isAdded     = !isMine && pendingSlots.some(p => p.date === currentDate && p.slot.startTime === slot.startTime);

  const remaining = slot.maxTrainers - slot.bookedCount;

  const bg = isAdded     ? D.primary
           : isConfirmed ? D.primary + '22'
           : isPending   ? D.amber   + '18'
           : '#FFFFFF';

  const border = isAdded     ? D.primary
               : isConfirmed ? D.primary
               : isPending   ? D.amber
               : '#E5E7EB';

  const timeColor = isAdded     ? '#FFFFFF'
                  : isConfirmed ? D.primary
                  : isPending   ? D.amber
                  : isFull      ? D.textMuted
                  : D.primary;

  const capLabel = isMine
    ? (isConfirmed ? '확정' : '대기')
    : isAdded
    ? '✓'
    : isFull
    ? '마감'
    : `${slot.bookedCount}/${slot.maxTrainers}`;

  const capColor = isAdded || isMine
    ? timeColor
    : isFull
    ? D.textMuted
    : remaining <= 1 ? D.amber : D.success;

  return (
    <TouchableOpacity
      key={slot.startTime}
      style={[ls.slotChip, { backgroundColor: bg, borderColor: border }, isFull && { opacity: 0.38 }]}
      onPress={() => {
        if (isMine) handleCancelPress(slot.myBooking!);
        else if (!isFull) toggleSlot(currentDate, slot);
      }}
      activeOpacity={isFull ? 1 : 0.7}
    >
      <Text style={[ls.slotChipTime, { color: timeColor }]}>{slot.startTime}</Text>
      <Text style={[ls.slotChipSub, { color: capColor }]}>{capLabel}</Text>
    </TouchableOpacity>
  );
}

// ── 다크 테마 스타일 ──────────────────────────────────────────
const ds = StyleSheet.create({
  container:      { flex: 1, backgroundColor: DARK.bg },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  headerBack:     { width: 36 },
  headerBackText: { fontSize: 32, fontWeight: '300', color: DARK.text },
  headerCenter:   { flex: 1 },
  headerTitle:    { fontSize: 20, fontWeight: '800', color: DARK.text },
  headerSub:      { fontSize: 12, color: DARK.textSec, marginTop: 1 },
  myBookBtn:      { backgroundColor: 'rgba(92,106,245,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: DARK.primary + '60' },
  myBookBtnText:  { fontSize: 12, fontWeight: '700', color: DARK.primary },

  searchWrap:     { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar:      { flexDirection: 'row', alignItems: 'center', backgroundColor: DARK.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: DARK.border, gap: 8 },
  searchIcon:     { fontSize: 16 },
  searchInput:    { flex: 1, fontSize: 14, color: DARK.text },
  searchClear:    { fontSize: 14, color: DARK.textMuted, paddingHorizontal: 4 },

  filterScroll:   { flexShrink: 0 },
  filterContent:  { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterChip:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: DARK.surface, borderWidth: 1, borderColor: DARK.border },
  filterChipActive:{ backgroundColor: DARK.primary, borderColor: DARK.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: DARK.textSec },
  filterChipTextActive: { color: '#fff' },

  listContent:    { padding: 16, gap: 14 },
  emptyBox:       { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon:      { fontSize: 48 },
  emptyText:      { fontSize: 16, fontWeight: '700', color: DARK.textSec },
  emptySub:       { fontSize: 13, color: DARK.textMuted },

  gymCard:        { backgroundColor: DARK.surface, borderRadius: 18, flexDirection: 'row', padding: 14, gap: 12, borderWidth: 1, borderColor: DARK.border },
  gymImg:         { width: 76, height: 76, borderRadius: 12, backgroundColor: DARK.surface2 },
  gymInfo:        { flex: 1, gap: 5 },
  gymNameRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gymName:        { fontSize: 15, fontWeight: '700', color: DARK.text, flex: 1 },
  gymFavStar:     { fontSize: 13, color: DARK.amber },
  gymAddr:        { fontSize: 11, color: DARK.textSec },
  gymTags:        { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  gymTag:         { backgroundColor: DARK.surface2, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: DARK.border },
  gymTagPT:       { backgroundColor: 'rgba(92,106,245,0.15)', borderColor: DARK.primary + '50' },
  gymTagText:     { fontSize: 10, color: DARK.textSec, fontWeight: '600' },
  gymTagPTText:   { color: DARK.primary },
  gymMeta:        { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  gymRating:      { fontSize: 11, color: DARK.amber, fontWeight: '600' },
  gymMetaDot:     { fontSize: 10, color: DARK.textMuted },
  gymDist:        { fontSize: 11, color: DARK.textSec },
  gymFee:         { fontSize: 11, color: DARK.textSec },

  gymRight:       { alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  favBtn:         { padding: 4 },
  favIcon:        { fontSize: 20, color: DARK.textMuted },
  favIconActive:  { color: DARK.amber },
  selectBtn:      { backgroundColor: DARK.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  selectBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
});

// ── 라이트 테마 스타일 (Step 2 & 3) ─────────────────────────
const ls = StyleSheet.create({
  container:    { flex: 1, backgroundColor: LIGHT.bg },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: LIGHT.surface, borderBottomWidth: 1, borderBottomColor: LIGHT.border, gap: 8 },
  backBtn:      { width: 36 },
  backText:     { fontSize: 30, fontWeight: '300', color: LIGHT.primary },
  headerTitle:  { flex: 1, fontSize: 16, fontWeight: '700', color: LIGHT.text, textAlign: 'center' },
  myBookSmall:  { paddingHorizontal: 10, paddingVertical: 5 },
  myBookSmallText: { fontSize: 12, color: LIGHT.primary, fontWeight: '600' },

  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },

  blockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: LIGHT.error + '14', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: LIGHT.error + '40' },
  blockedIcon:   { fontSize: 28 },
  blockedTitle:  { fontSize: 15, fontWeight: '800', color: LIGHT.error },
  blockedSub:    { fontSize: 12, color: LIGHT.error, opacity: 0.8, marginTop: 2 },

  gymInfoCard:   { backgroundColor: LIGHT.surface, borderRadius: 14, flexDirection: 'row', padding: 12, gap: 12, borderWidth: 1, borderColor: LIGHT.border },
  gymInfoImg:    { width: 60, height: 60, borderRadius: 10, backgroundColor: LIGHT.surface2 },
  gymInfoText:   { flex: 1, justifyContent: 'center', gap: 3 },
  gymInfoName:   { fontSize: 15, fontWeight: '700', color: LIGHT.text },
  gymInfoAddr:   { fontSize: 11, color: LIGHT.textSec },
  gymInfoFee:    { fontSize: 12, color: LIGHT.primary, fontWeight: '600' },


  calCard:       { backgroundColor: LIGHT.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: LIGHT.border },
  calHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calNavBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: LIGHT.surface2, borderRadius: 10, borderWidth: 1, borderColor: LIGHT.border },
  calNavText:    { fontSize: 20, fontWeight: '300', color: LIGHT.text },
  calMonthTitle: { fontSize: 17, fontWeight: '800', color: LIGHT.text },

  calDowRow:     { flexDirection: 'row', marginBottom: 8 },
  calDow:        { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: LIGHT.textSec, paddingVertical: 4 },
  calDowSun:     { color: LIGHT.error },
  calDowSat:     { color: LIGHT.primary },

  calGrid:       { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:       { width: `${100 / 7}%` as any, alignItems: 'center', paddingVertical: 4, gap: 2 },
  calDayCircle:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calDayCircleSel:   { backgroundColor: LIGHT.primary },
  calDayCircleToday: { borderWidth: 2, borderColor: LIGHT.primary },
  calDayCirclePast:  {},
  calDayNum:     { fontSize: 14, fontWeight: '700', color: LIGHT.text },
  calDayNumSel:  { color: '#fff' },
  calDayNumToday:{ color: LIGHT.primary },
  calDayNumPast: { color: LIGHT.textMuted, fontWeight: '400' },
  calDayNumSun:  { color: LIGHT.error },
  calDayNumSat:  { color: LIGHT.primary },
  calTodayDot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: LIGHT.primary },
  calPendingDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: LIGHT.success },

  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: LIGHT.primary + '12', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: LIGHT.primary + '30',
  },
  memberChipText: { fontSize: 13, fontWeight: '700', color: LIGHT.primary },

  multiToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: LIGHT.border,
    backgroundColor: LIGHT.surface2,
  },
  multiToggleOn:     { backgroundColor: LIGHT.primary, borderColor: LIGHT.primary },
  multiToggleText:   { fontSize: 12, fontWeight: '600', color: LIGHT.textSec },
  multiToggleTextOn: { color: '#fff', fontWeight: '700' },

  multiSummary: {
    backgroundColor: LIGHT.primary + '10', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 10, gap: 4,
    borderWidth: 1, borderColor: LIGHT.primary + '30',
  },
  multiSummaryCount: { fontSize: 12, fontWeight: '800', color: LIGHT.primary },
  multiSummaryDates: { fontSize: 12, color: LIGHT.primary, opacity: 0.8, lineHeight: 18 },

  dateHintBox:   { backgroundColor: LIGHT.surface, borderRadius: 14, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: LIGHT.border },
  dateHintIcon:  { fontSize: 32 },
  dateHintText:  { fontSize: 13, color: LIGHT.textSec, textAlign: 'center', lineHeight: 20 },

  slotSection:   { gap: 12 },
  slotSectionTitle: { fontSize: 15, fontWeight: '800', color: LIGHT.text },

  noSlotBox:     { backgroundColor: LIGHT.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: LIGHT.border },
  noSlotText:    { fontSize: 13, color: LIGHT.textSec, textAlign: 'center' },

  legendRow:     { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:     { width: 8, height: 8, borderRadius: 4 },
  legendText:    { fontSize: 11, color: LIGHT.textSec },

  accordion:     { backgroundColor: LIGHT.surface, borderRadius: 14, borderWidth: 1, borderColor: LIGHT.border, overflow: 'hidden' },
  accordionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  accordionTitle:{ fontSize: 15, fontWeight: '800', color: LIGHT.text },
  accordionSub:  { fontSize: 11, color: LIGHT.textSec, marginTop: 2 },
  accordionRight:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  accordionCount:{ fontSize: 12, fontWeight: '700', color: LIGHT.success },
  accordionChev: { fontSize: 12, color: LIGHT.textSec, fontWeight: '700' },
  accordionBody: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 10, paddingBottom: 14 },

  slotChip: {
    width: '22%', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', gap: 2,
  },
  slotChipTime: { fontSize: 13, fontWeight: '700' },
  slotChipSub:  { fontSize: 9, fontWeight: '700' },

  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: LIGHT.surface, borderTopWidth: 1, borderTopColor: LIGHT.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, paddingBottom: 14, gap: 10 },
  footerInfo:    { flex: 1, gap: 1 },
  footerTime:    { fontSize: 13, fontWeight: '800', color: LIGHT.primary },
  footerFee:     { fontSize: 11, color: LIGHT.textSec },
  nextBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: LIGHT.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, shadowColor: LIGHT.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  nextBtnText:   { fontSize: 13, fontWeight: '800', color: '#fff' },
  nextBtnArrow:  { fontSize: 16, color: '#fff', fontWeight: '300' },

  // Review step
  reviewCard:       { backgroundColor: LIGHT.surface, borderRadius: 16, borderWidth: 1, borderColor: LIGHT.border, overflow: 'hidden' },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 12 },
  reviewCardTitle:  { fontSize: 15, fontWeight: '800', color: LIGHT.text },
  reviewCountBadge: { backgroundColor: LIGHT.primary + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: LIGHT.primary + '30' },
  reviewCountText:  { fontSize: 13, fontWeight: '800', color: LIGHT.primary },
  reviewItemDivider:{ height: 1, backgroundColor: LIGHT.border, marginHorizontal: 16 },
  reviewItem:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  reviewItemLeft:   { flex: 1, gap: 3 },
  reviewItemDate:   { fontSize: 14, fontWeight: '700', color: LIGHT.text },
  reviewItemTime:   { fontSize: 13, color: LIGHT.primary, fontWeight: '700' },
  reviewItemFee:    { fontSize: 14, fontWeight: '700', color: LIGHT.text, minWidth: 60, textAlign: 'right' },
  reviewRemoveBtn:  { width: 28, height: 28, borderRadius: 14, backgroundColor: LIGHT.error + '15', alignItems: 'center', justifyContent: 'center' },
  reviewRemoveText: { fontSize: 11, color: LIGHT.error, fontWeight: '800' },
  reviewTotalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: LIGHT.border, backgroundColor: LIGHT.surface2 },
  reviewTotalLabel: { fontSize: 14, fontWeight: '700', color: LIGHT.textSec },
  reviewTotalFee:   { fontSize: 20, fontWeight: '900', color: LIGHT.primary },

  addMoreBtn:    { backgroundColor: LIGHT.primary + '10', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: LIGHT.primary + '30' },
  addMoreBtnText:{ fontSize: 14, fontWeight: '700', color: LIGHT.primary },

  reviewInfoBox: { backgroundColor: LIGHT.primary + '08', borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: LIGHT.primary + '25' },
  reviewInfoTitle:{ fontSize: 13, fontWeight: '700', color: LIGHT.primary },
  reviewInfoBody: { fontSize: 12, color: LIGHT.textSec, lineHeight: 20 },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  cancelModal:   { backgroundColor: LIGHT.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  cancelModalTitle:{ fontSize: 20, fontWeight: '800', color: LIGHT.text, textAlign: 'center' },
  cancelModalMsg:{ fontSize: 14, color: LIGHT.textSec, textAlign: 'center' },
  cancelInfo:    { backgroundColor: LIGHT.surface2, borderRadius: 12, padding: 12, gap: 4 },
  cancelInfoText:{ fontSize: 13, color: LIGHT.textSec },
  cancelBtnRow:  { flexDirection: 'row', gap: 10 },
  cancelBtn:     { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtnNo:   { backgroundColor: LIGHT.surface2 },
  cancelBtnNoText:{ color: LIGHT.textSec, fontWeight: '700', fontSize: 14 },
  cancelBtnYes:  { backgroundColor: LIGHT.error },
  cancelBtnYesText:{ color: '#fff', fontWeight: '800', fontSize: 14 },
});
