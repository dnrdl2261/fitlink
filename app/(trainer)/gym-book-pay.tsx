import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  Animated, Easing, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { MOCK_GYM_ADMINS } from '../../data/users';
import { formatPrice } from '../../utils/formatters';
import { DAY_LABELS, PAY_METHODS } from '../../utils/constants';

const D = {
  bg:          '#F8F9FA',
  surface:     '#FFFFFF',
  surface2:    '#F3F4F6',
  primary:     '#5C6AF5',
  primaryGlow: 'rgba(92,106,245,0.10)',
  text:        '#111827',
  textSec:     '#6B7280',
  textMuted:   '#9CA3AF',
  border:      '#E5E7EB',
  success:     '#22C55E',
  amber:       '#F59E0B',
  amberPale:   'rgba(245,158,11,0.10)',
  error:       '#EF4444',
};

const MOCK_COUPONS: Record<string, { label: string; discount: number }> = {
  'WELCOME10': { label: '신규 가입 10% 할인', discount: 0.10 },
  'FLOWIN20':  { label: 'FLOWIN 20% 쿠폰',   discount: 0.20 },
  'SUMMER5':   { label: '여름 특가 5%',       discount: 0.05 },
};
const MY_POINTS = 8000;

const CLOTHING_ITEMS = [
  { id: 'shirt',  label: '운동복 상의', price: 2000, icon: '👕' },
  { id: 'pants',  label: '운동복 하의', price: 2000, icon: '🩳' },
  { id: 'towel',  label: '수건',        price: 1000, icon: '🏃' },
  { id: 'locker', label: '락커 이용',   price: 1000, icon: '🔒' },
];

type SlotItem = { date: string; startTime: string; endTime: string };

function formatSlotDate(date: string) {
  const parts = date.split('-');
  const m = parseInt(parts[1]);
  const d = parseInt(parts[2]);
  const dow = new Date(date).getDay();
  return `${m}월 ${d}일 (${DAY_LABELS[dow]})`;
}

// ── 카운트다운 훅 ──────────────────────────────────────────────
function useCountdown(initialSeconds: number, active: boolean) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    ref.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 0) { if (ref.current) clearInterval(ref.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [active]);

  const fmt = (s: number) => {
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return { display: fmt(seconds), seconds };
}

// ── 6단계 인디케이터 ───────────────────────────────────────────
function FlowIndicator({ step }: { step: number }) {
  const steps = ['헬스장', '시간', '의류', '결제', '요청', '대기', '이용'];
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
  wrap:        { backgroundColor: D.surface, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: D.border },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingHorizontal: 16 },
  dot:         { width: 26, height: 26, borderRadius: 13, backgroundColor: D.surface2, borderWidth: 2, borderColor: D.border, alignItems: 'center', justifyContent: 'center' },
  dotDone:     { backgroundColor: D.primary, borderColor: D.primary },
  dotActive:   { backgroundColor: D.primary, borderColor: D.primary },
  num:         { fontSize: 10, fontWeight: '800', color: D.textMuted },
  numActive:   { color: '#fff' },
  line:        { flex: 1, height: 2, backgroundColor: D.border },
  lineDone:    { backgroundColor: D.primary },
  labels:      { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 5, paddingBottom: 2 },
  label:       { fontSize: 9, color: D.textMuted, flex: 1, textAlign: 'center' },
  labelActive: { color: D.primary, fontWeight: '800' },
  labelDone:   { color: D.primary, fontWeight: '600' },
});

// ════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ════════════════════════════════════════════════════════════
export default function GymBookPayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    gymId: string; gymName: string; facilityFee: string; slots: string; memberName?: string;
  }>();

  const { gymId, gymName, memberName } = params;
  const facilityFee = Number(params.facilityFee);
  const slotsData = useMemo<SlotItem[]>(() => {
    try { return JSON.parse(params.slots || '[]'); }
    catch { return []; }
  }, [params.slots]);

  const totalFacilityFee = facilityFee * slotsData.length;

  const [step, setStep]           = useState<'clothing' | 'payment' | 'request' | 'waiting' | 'approved'>('clothing');
  const [payMethod, setPayMethod] = useState('card');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bookingIds, setBookingIds] = useState<string[]>([]);
  const [couponCode, setCouponCode]       = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ label: string; discount: number } | null>(null);
  const [couponError, setCouponError]     = useState('');
  const [pointsInput, setPointsInput]     = useState('');
  const [useAllPoints, setUseAllPoints]   = useState(false);

  const { bookSlot, confirmSlot } = useGymSlotStore();
  const { trainer }               = useAuthStore();
  const { addNotification }       = useNotificationStore();

  // 파라미터 변경(다른 헬스장 예약 시작) 시 전체 상태 리셋
  useEffect(() => {
    setStep('clothing');
    setSelectedItems([]);
    setBookingIds([]);
    setPayMethod('card');
    setCouponCode(''); setAppliedCoupon(null); setCouponError('');
    setPointsInput(''); setUseAllPoints(false);
  }, [params.gymId, params.slots]);

  const clothingTotal = selectedItems.reduce((sum, id) => {
    const item = CLOTHING_ITEMS.find((c) => c.id === id);
    return sum + (item?.price ?? 0);
  }, 0);

  // 결제 금액 계산: 시설이용료 + 의류비 − 쿠폰 − 포인트
  const rawTotal       = totalFacilityFee + clothingTotal;
  const couponDiscount = appliedCoupon ? Math.round(rawTotal * appliedCoupon.discount) : 0;
  const usedPoints     = useAllPoints
    ? Math.min(MY_POINTS, rawTotal)
    : Math.min(Number(pointsInput) || 0, MY_POINTS, rawTotal);
  const finalPrice     = Math.max(0, rawTotal - couponDiscount - usedPoints);

  const handleApplyCoupon = () => {
    const found = MOCK_COUPONS[couponCode.trim().toUpperCase()];
    if (found) { setAppliedCoupon(found); setCouponError(''); }
    else setCouponError('유효하지 않은 쿠폰 코드입니다');
  };

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  // 승인 대기 → 30분 후 자동 전환
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [waitSeconds, setWaitSeconds] = useState(30 * 60);

  useEffect(() => {
    if (step !== 'waiting') return;
    setWaitSeconds(30 * 60);
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1, duration: 1200,
        easing: Easing.linear, useNativeDriver: true,
      })
    );
    loop.start();
    const tick = setInterval(() => {
      setWaitSeconds((s) => {
        if (s <= 1) {
          clearInterval(tick);
          loop.stop();
          bookingIds.forEach((id) => confirmSlot(id));
          setStep('approved');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { loop.stop(); clearInterval(tick); };
  }, [step]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // 슬롯별 bookSlot 호출 후 request 단계로
  const handleBook = () => {
    if (!trainer) return;
    const ids: string[] = [];
    for (const slot of slotsData) {
      const id = bookSlot({
        gymId, gymName,
        trainerId:   trainer.id,
        trainerName: trainer.name,
        date:        slot.date,
        startTime:   slot.startTime,
        memberCount: 1,
        facilityFee,
      });
      if (id) ids.push(id);
    }
    if (ids.length > 0) {
      setBookingIds(ids);
      const gymAdminId = MOCK_GYM_ADMINS.find((a) => a.gymId === gymId)?.id ?? '';
      if (gymAdminId) {
        addNotification({
          type: 'slot_request', targetRole: 'gym', userId: gymAdminId,
          title: '새 슬롯 예약 요청',
          body: `${trainer.name} 트레이너가 ${slotsData[0].date} ${slotsData[0].startTime} 슬롯을 요청했습니다.`,
          meta: { trainerId: trainer.id },
        });
      }
      setStep('request');
    }
  };

  const { display: timerDisplay, seconds: timerSeconds } = useCountdown(3600, step === 'approved');

  // ══════════════════════════════════════════════════════════
  // STEP: 의류비 결제
  // ══════════════════════════════════════════════════════════
  if (step === 'clothing') {
    return (
      <SafeAreaView key="clothing" style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>의류비 결제</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlowIndicator step={2} />

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* 예약 요약 */}
          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <Text style={s.cardTitle}>예약 정보</Text>
              <View style={s.slotCountBadge}>
                <Text style={s.slotCountText}>총 {slotsData.length}개 슬롯</Text>
              </View>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>헬스장</Text>
              <Text style={s.infoValue} numberOfLines={1}>{gymName}</Text>
            </View>
            {!!memberName && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>예약 회원</Text>
                <Text style={[s.infoValue, { color: D.primary, fontWeight: '700' }]}>{memberName}</Text>
              </View>
            )}
            <View style={s.divider} />
            {slotsData.map((slot, i) => (
              <React.Fragment key={i}>
                <View style={s.slotRow}>
                  <Text style={s.slotIndex}>{i + 1}</Text>
                  <View style={s.slotInfo}>
                    <Text style={s.slotDate}>{formatSlotDate(slot.date)}</Text>
                    <Text style={s.slotTime}>{slot.startTime} ~ {slot.endTime}</Text>
                  </View>
                  <Text style={s.slotFee}>{formatPrice(facilityFee)}</Text>
                </View>
                {i < slotsData.length - 1 && <View style={s.divider} />}
              </React.Fragment>
            ))}
            <View style={s.totalDivider} />
            <View style={s.infoRow}>
              <Text style={s.totalLabel}>시설 이용료 합계</Text>
              <Text style={s.totalValue}>{formatPrice(totalFacilityFee)}</Text>
            </View>
          </View>

          {/* 의류 대여 선택 */}
          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <Text style={s.cardTitle}>의류 대여 선택</Text>
              <Text style={s.cardTitleSub}>선택 사항</Text>
            </View>
            <Text style={s.cardDesc}>필요한 항목을 선택하세요. 건너뛰기도 가능합니다.</Text>
            {CLOTHING_ITEMS.map((item) => {
              const isOn = selectedItems.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.clothingRow, isOn && s.clothingRowActive]}
                  onPress={() => toggleItem(item.id)}
                  activeOpacity={0.75}
                >
                  <Text style={s.clothingIcon}>{item.icon}</Text>
                  <View style={s.clothingInfo}>
                    <Text style={[s.clothingLabel, isOn && s.clothingLabelActive]}>{item.label}</Text>
                    <Text style={s.clothingPrice}>{formatPrice(item.price)}</Text>
                  </View>
                  <View style={[s.checkbox, isOn && s.checkboxOn]}>
                    {isOn && <Text style={s.checkboxMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}

            {clothingTotal > 0 && (
              <>
                <View style={s.totalDivider} />
                <View style={s.infoRow}>
                  <Text style={s.totalLabel}>의류 대여 합계</Text>
                  <Text style={s.totalValue}>{formatPrice(clothingTotal)}</Text>
                </View>
              </>
            )}
          </View>

          <Text style={s.note}>
            * 다음 단계에서 쿠폰·포인트·결제수단을 선택합니다.{'\n'}
            * 승인 완료 시 각 슬롯별 QR 코드로 입장하실 수 있습니다.
          </Text>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity style={s.skipBtn} onPress={() => { setSelectedItems([]); setStep('payment'); }} activeOpacity={0.8}>
            <Text style={s.skipBtnText}>의류 건너뛰기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.payBtn} onPress={() => setStep('payment')} activeOpacity={0.85}>
            <Text style={s.payBtnText}>다음 (결제)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP: 결제 (쿠폰 · 포인트 · 결제수단)
  // ══════════════════════════════════════════════════════════
  if (step === 'payment') {
    return (
      <SafeAreaView key="payment" style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setStep('clothing')} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>결제</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlowIndicator step={3} />

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* 결제 요약 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>결제 내역</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>시설 이용료 ({slotsData.length}개 슬롯)</Text>
              <Text style={s.infoValue}>{formatPrice(totalFacilityFee)}</Text>
            </View>
            {clothingTotal > 0 && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>의류 대여</Text>
                <Text style={s.infoValue}>{formatPrice(clothingTotal)}</Text>
              </View>
            )}
          </View>

          {/* 쿠폰 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>🎟️ 쿠폰 적용</Text>
            {appliedCoupon ? (
              <View style={s.appliedCoupon}>
                <View style={{ flex: 1 }}>
                  <Text style={s.appliedLabel}>{appliedCoupon.label}</Text>
                  <Text style={s.appliedDisc}>-{formatPrice(couponDiscount)} 할인</Text>
                </View>
                <TouchableOpacity onPress={() => setAppliedCoupon(null)}>
                  <Text style={s.removeCoupon}>제거</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.couponInputRow}>
                  <TextInput
                    style={s.couponInput}
                    placeholder="쿠폰 코드 입력"
                    value={couponCode}
                    onChangeText={(t) => { setCouponCode(t); setCouponError(''); }}
                    placeholderTextColor={D.textMuted}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[s.couponApplyBtn, !couponCode && s.couponApplyBtnOff]}
                    onPress={handleApplyCoupon}
                    disabled={!couponCode}
                  >
                    <Text style={[s.couponApplyText, !couponCode && { color: D.textMuted }]}>적용</Text>
                  </TouchableOpacity>
                </View>
                {couponError ? <Text style={s.couponError}>{couponError}</Text> : null}
                <Text style={s.couponHint}>예시: WELCOME10 · FLOWIN20 · SUMMER5</Text>
              </>
            )}
          </View>

          {/* 포인트 */}
          <View style={s.card}>
            <View style={s.pointHead}>
              <Text style={s.cardTitle}>⚡ 포인트 사용</Text>
              <View style={s.pointBal}>
                <Text style={s.pointBalText}>보유 {MY_POINTS.toLocaleString()}P</Text>
              </View>
            </View>
            <View style={s.couponInputRow}>
              <TextInput
                style={[s.couponInput, useAllPoints && s.pointInputDisabled]}
                placeholder="사용할 포인트"
                value={useAllPoints ? String(Math.min(MY_POINTS, rawTotal)) : pointsInput}
                onChangeText={(t) => { setPointsInput(t.replace(/[^0-9]/g, '')); setUseAllPoints(false); }}
                keyboardType="numeric"
                editable={!useAllPoints}
                placeholderTextColor={D.textMuted}
              />
              <TouchableOpacity
                style={[s.useAllBtn, useAllPoints && s.useAllBtnActive]}
                onPress={() => { setUseAllPoints(!useAllPoints); setPointsInput(''); }}
              >
                <Text style={[s.useAllText, useAllPoints && s.useAllTextActive]}>전액 사용</Text>
              </TouchableOpacity>
            </View>
            {usedPoints > 0 && <Text style={s.pointApplied}>-{usedPoints.toLocaleString()}P 적용됨</Text>}
          </View>

          {/* 결제 수단 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>결제 수단</Text>
            <View style={s.payGrid}>
              {PAY_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.payMethod, payMethod === m.id && s.payMethodActive]}
                  onPress={() => setPayMethod(m.id)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name={m.icon as any} size={22} color={payMethod === m.id ? D.primary : D.textMuted} />
                  <Text style={[s.payLabel, payMethod === m.id && s.payLabelActive]}>{m.label}</Text>
                  {payMethod === m.id && (
                    <View style={s.checkBadge}><Text style={s.checkText}>✓</Text></View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 최종 금액 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>최종 결제 금액</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>정가</Text>
              <Text style={s.infoValue}>{formatPrice(rawTotal)}</Text>
            </View>
            {couponDiscount > 0 && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>쿠폰 할인</Text>
                <Text style={[s.infoValue, { color: D.success }]}>-{formatPrice(couponDiscount)}</Text>
              </View>
            )}
            {usedPoints > 0 && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>포인트 사용</Text>
                <Text style={[s.infoValue, { color: D.amber }]}>-{usedPoints.toLocaleString()}P</Text>
              </View>
            )}
            <View style={s.totalDivider} />
            <View style={s.infoRow}>
              <Text style={s.totalLabel}>결제 금액</Text>
              <Text style={s.totalValue}>{formatPrice(finalPrice)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity style={s.skipBtn} onPress={() => setStep('clothing')} activeOpacity={0.8}>
            <Text style={s.skipBtnText}>이전</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.payBtn} onPress={handleBook} activeOpacity={0.85}>
            <Text style={s.payBtnText}>{formatPrice(finalPrice)} 결제 후 예약</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP: 관리자에게 예약 요청
  // ══════════════════════════════════════════════════════════
  if (step === 'request') {
    return (
      <SafeAreaView key="request" style={s.container}>
        <View style={s.header}>
          <View style={{ width: 40 }} />
          <Text style={s.headerTitle}>예약 요청</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlowIndicator step={4} />

        <ScrollView contentContainerStyle={[s.content, s.centerContent]} showsVerticalScrollIndicator={false}>
          <View style={s.requestHeroBox}>
            <View style={s.requestIconCircle}>
              <Text style={s.requestIcon}>📋</Text>
            </View>
            <Text style={s.requestTitle}>예약 내용을 확인해주세요</Text>
            <Text style={s.requestSub}>아래 정보로 헬스장 관리자에게{'\n'}{slotsData.length}개 슬롯 예약을 요청합니다</Text>
          </View>

          {/* 예약 요약 카드 */}
          <View style={[s.card, { width: '100%' }]}>
            <View style={s.summaryTop}>
              <Text style={s.summaryGym} numberOfLines={1}>{gymName}</Text>
              <View style={s.pendingBadge}>
                <View style={[s.dot, { backgroundColor: D.amber }]} />
                <Text style={[s.dotLabel, { color: D.amber }]}>{slotsData.length}개 요청 예정</Text>
              </View>
            </View>
            <View style={s.summaryRows}>
              {slotsData.map((slot, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={s.divider} />}
                  <View style={s.slotRow}>
                    <Text style={s.slotIndex}>{i + 1}</Text>
                    <View style={s.slotInfo}>
                      <Text style={s.slotDate}>{formatSlotDate(slot.date)}</Text>
                      <Text style={s.slotTime}>{slot.startTime} ~ {slot.endTime}</Text>
                    </View>
                    <Text style={s.slotFee}>{formatPrice(facilityFee)}</Text>
                  </View>
                </React.Fragment>
              ))}
              <View style={s.totalDivider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>시설 이용료 합계</Text>
                <Text style={[s.infoValue, { color: D.primary, fontWeight: '800' }]}>{formatPrice(totalFacilityFee)}</Text>
              </View>
              {clothingTotal > 0 && (
                <>
                  <View style={s.divider} />
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>의류 대여</Text>
                    <Text style={s.infoValue}>{formatPrice(clothingTotal)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* 안내 박스 */}
          <View style={s.infoBox}>
            <Text style={s.infoBoxTitle}>📱 예약 요청 후 진행 사항</Text>
            <View style={s.infoBoxItem}>
              <View style={s.infoBoxDot} />
              <Text style={s.infoBoxText}>헬스장 관리자에게 {slotsData.length}개 슬롯 예약 요청이 전송됩니다</Text>
            </View>
            <View style={s.infoBoxItem}>
              <View style={s.infoBoxDot} />
              <Text style={s.infoBoxText}>승인 또는 거부 알림을 이메일로 받습니다</Text>
            </View>
            <View style={s.infoBoxItem}>
              <View style={s.infoBoxDot} />
              <Text style={s.infoBoxText}>승인 완료 시 각 슬롯별 QR 코드로 입장하실 수 있습니다</Text>
            </View>
          </View>
        </ScrollView>

        <View style={s.doneBtns}>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => setStep('clothing')} activeOpacity={0.8}>
            <Text style={s.secondaryBtnText}>이전</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.primaryBtn} onPress={() => setStep('waiting')} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>예약 신청하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP: 관리자 승인 대기
  // ══════════════════════════════════════════════════════════
  if (step === 'waiting') {
    return (
      <SafeAreaView key="waiting" style={s.container}>
        <View style={s.header}>
          <View style={{ width: 40 }} />
          <Text style={s.headerTitle}>승인 대기 중</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlowIndicator step={5} />

        <ScrollView
          contentContainerStyle={s.waitingContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 스피너 */}
          <Animated.View style={[s.spinnerOuter, { transform: [{ rotate: spin }] }]}>
            <View style={s.spinnerInner} />
          </Animated.View>

          <View style={s.waitingTextBox}>
            <Text style={s.waitingTitle}>관리자 승인 대기 중</Text>
            <Text style={s.waitingSub}>
              헬스장 관리자가 {slotsData.length}개 슬롯{'\n'}예약 요청을 검토 중입니다.
            </Text>
            <View style={s.waitingCountdown}>
              <Text style={s.waitingCountdownLabel}>자동 승인까지</Text>
              <Text style={s.waitingCountdownTimer}>
                {`${String(Math.floor(waitSeconds / 60)).padStart(2, '0')}:${String(waitSeconds % 60).padStart(2, '0')}`}
              </Text>
            </View>
          </View>

          {/* 예약 정보 */}
          <View style={s.waitingCard}>
            <Text style={s.waitingCardGym} numberOfLines={1}>{gymName}</Text>
            <Text style={s.waitingCardDate}>{slotsData.length}개 슬롯 예약 요청됨</Text>
            <Text style={s.waitingCardFee}>{formatPrice(totalFacilityFee)}</Text>
          </View>

          {/* 이메일 안내 */}
          <View style={s.emailBox}>
            <Text style={s.emailBoxIcon}>✉️</Text>
            <View style={s.emailBoxText}>
              <Text style={s.emailBoxTitle}>이메일로 알림을 보내드립니다</Text>
              <Text style={s.emailBoxSub}>관리자 승인 또는 거부 시{'\n'}등록된 이메일로 즉시 알림이 전송됩니다</Text>
            </View>
          </View>

          {/* 내 예약 확인 버튼 */}
          <TouchableOpacity
            style={s.waitingCheckBtn}
            onPress={() => router.push('/(trainer)/my-slot-bookings' as any)}
            activeOpacity={0.8}
          >
            <Text style={s.waitingCheckBtnText}>내 예약 현황 확인</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP: 승인 완료
  // ══════════════════════════════════════════════════════════
  return (
    <SafeAreaView key="approved" style={s.container}>
      <View style={s.header}>
        <View style={{ width: 40 }} />
        <Text style={s.headerTitle}>승인 완료</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlowIndicator step={6} />

      <ScrollView contentContainerStyle={[s.content, s.centerContent]} showsVerticalScrollIndicator={false}>
        {/* 성공 뱃지 */}
        <View style={s.approvedBadge}>
          <View style={s.approvedCheck}>
            <Text style={s.approvedCheckText}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.approvedTitle}>{slotsData.length}개 예약 승인 완료!</Text>
            <Text style={s.approvedSub}>내 예약에서 각 슬롯의 QR 코드를 확인하세요</Text>
          </View>
        </View>

        {/* 승인된 슬롯 목록 */}
        <View style={[s.card, { width: '100%' }]}>
          <View style={s.summaryTop}>
            <Text style={s.summaryGym} numberOfLines={1}>{gymName}</Text>
            <View style={[s.pendingBadge, { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.35)' }]}>
              <View style={[s.dot, { backgroundColor: D.success }]} />
              <Text style={[s.dotLabel, { color: D.success }]}>승인 완료</Text>
            </View>
          </View>
          <View style={s.summaryRows}>
            {slotsData.map((slot, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={s.divider} />}
                <View style={s.slotRow}>
                  <Text style={s.slotIndex}>{i + 1}</Text>
                  <View style={s.slotInfo}>
                    <Text style={s.slotDate}>{formatSlotDate(slot.date)}</Text>
                    <Text style={s.slotTime}>{slot.startTime} ~ {slot.endTime}</Text>
                  </View>
                  <Text style={s.slotFee}>{formatPrice(facilityFee)}</Text>
                </View>
              </React.Fragment>
            ))}
            <View style={s.totalDivider} />
            <View style={s.infoRow}>
              <Text style={s.totalLabel}>결제 합계</Text>
              <Text style={[s.totalValue, { color: D.success }]}>{formatPrice(finalPrice)}</Text>
            </View>
          </View>
        </View>

        {/* QR 안내 */}
        <View style={s.qrGuideBox}>
          <Text style={s.qrGuideIcon}>🎫</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.qrGuideTitle}>QR 코드로 입장하세요</Text>
            <Text style={s.qrGuideSub}>각 슬롯별 QR 코드는 내 예약 현황에서{'\n'}확인하실 수 있습니다</Text>
          </View>
        </View>
      </ScrollView>

      <View style={s.doneBtns}>
        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => router.push('/(trainer)/my-slot-bookings' as any)}
          activeOpacity={0.8}
        >
          <Text style={s.secondaryBtnText}>내 예약 현황</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => router.replace('/(trainer)/slots' as any)}
          activeOpacity={0.85}
        >
          <Text style={s.primaryBtnText}>추가 예약하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── 스타일 ──────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: D.bg },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: D.border, backgroundColor: D.surface },
  backBtn:      { width: 40, paddingVertical: 4 },
  backText:     { fontSize: 30, fontWeight: '300', color: D.primary },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: D.text },

  content:      { padding: 16, gap: 14, paddingBottom: 120 },
  centerContent:{ alignItems: 'center' },

  card:         { backgroundColor: D.surface, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: D.border, width: '100%' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: D.text },
  cardTitleSub: { fontSize: 12, color: D.primary, fontWeight: '600', backgroundColor: D.primaryGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardDesc:     { fontSize: 12, color: D.textSec, marginTop: -4 },

  slotCountBadge: { backgroundColor: D.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  slotCountText:  { fontSize: 11, fontWeight: '800', color: '#fff' },

  slotRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  slotIndex: { width: 20, height: 20, borderRadius: 10, backgroundColor: D.primary, color: '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center', lineHeight: 20 },
  slotInfo:  { flex: 1, gap: 1 },
  slotDate:  { fontSize: 13, fontWeight: '700', color: D.text },
  slotTime:  { fontSize: 12, color: D.textSec },
  slotFee:   { fontSize: 13, fontWeight: '700', color: D.primary },

  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  infoLabel:    { fontSize: 13, color: D.textSec },
  infoValue:    { fontSize: 13, color: D.text, fontWeight: '600' },
  divider:      { height: 1, backgroundColor: D.border },
  totalDivider: { height: 1.5, backgroundColor: D.border, marginVertical: 4 },
  totalLabel:   { fontSize: 15, fontWeight: '800', color: D.text },
  totalValue:   { fontSize: 18, fontWeight: '900', color: D.primary },

  clothingRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.surface2, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: D.border },
  clothingRowActive:  { borderColor: D.primary, backgroundColor: D.primaryGlow },
  clothingIcon:       { fontSize: 24 },
  clothingInfo:       { flex: 1, gap: 2 },
  clothingLabel:      { fontSize: 14, color: D.textSec, fontWeight: '600' },
  clothingLabelActive:{ color: D.primary },
  clothingPrice:      { fontSize: 13, color: D.text, fontWeight: '700' },
  checkbox:           { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: D.border, alignItems: 'center', justifyContent: 'center', backgroundColor: D.surface },
  checkboxOn:         { backgroundColor: D.primary, borderColor: D.primary },
  checkboxMark:       { fontSize: 12, color: '#fff', fontWeight: '800' },

  payGrid:        { gap: 10 },
  payMethod:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.surface2, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: D.border, position: 'relative' },
  payMethodActive:{ borderColor: D.primary, backgroundColor: D.primaryGlow },
  payLabel:       { fontSize: 14, color: D.textSec, fontWeight: '600', flex: 1 },
  payLabelActive: { color: D.primary },
  checkBadge:     { width: 22, height: 22, borderRadius: 11, backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center' },
  checkText:      { fontSize: 11, color: '#fff', fontWeight: '800' },

  note:         { fontSize: 12, color: D.textMuted, lineHeight: 18 },

  // 쿠폰
  appliedCoupon:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: D.success + '12', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: D.success + '30' },
  appliedLabel:   { fontSize: 14, fontWeight: '600', color: D.text },
  appliedDisc:    { fontSize: 12, color: D.success, fontWeight: '500', marginTop: 2 },
  removeCoupon:   { fontSize: 13, color: D.error, fontWeight: '600', paddingLeft: 8 },
  couponInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  couponInput:    { flex: 1, height: 48, borderRadius: 12, backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border, paddingHorizontal: 14, fontSize: 14, color: D.text, fontWeight: '600' },
  couponApplyBtn: { height: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center' },
  couponApplyBtnOff: { backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border },
  couponApplyText:{ fontSize: 14, fontWeight: '700', color: '#fff' },
  couponError:    { fontSize: 12, color: D.error, marginTop: 6 },
  couponHint:     { fontSize: 11, color: D.textMuted, marginTop: 6 },

  // 포인트
  pointHead:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pointBal:       { backgroundColor: D.amberPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pointBalText:   { fontSize: 12, fontWeight: '600', color: D.amber },
  pointInputDisabled: { opacity: 0.5 },
  useAllBtn:      { height: 48, paddingHorizontal: 14, borderRadius: 12, backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border, alignItems: 'center', justifyContent: 'center' },
  useAllBtnActive:{ backgroundColor: D.amberPale, borderColor: D.amber + '88' },
  useAllText:     { fontSize: 13, fontWeight: '600', color: D.textSec },
  useAllTextActive: { color: D.amber },
  pointApplied:   { fontSize: 12, color: D.amber, fontWeight: '600', marginTop: 6 },

  footer:       { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, backgroundColor: D.surface, borderTopWidth: 1, borderTopColor: D.border, paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 28 },
  skipBtn:      { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: D.border },
  skipBtnText:  { fontSize: 14, fontWeight: '700', color: D.textSec },
  payBtn:       { flex: 2, backgroundColor: D.primary, paddingVertical: 15, borderRadius: 14, alignItems: 'center', shadowColor: D.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  payBtnText:   { color: '#fff', fontSize: 14, fontWeight: '800' },

  // 예약 요청 단계
  requestHeroBox:    { alignItems: 'center', gap: 12, marginBottom: 8, marginTop: 8 },
  requestIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: D.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: D.primary + '40' },
  requestIcon:       { fontSize: 38 },
  requestTitle:      { fontSize: 22, fontWeight: '900', color: D.text },
  requestSub:        { fontSize: 14, color: D.textSec, textAlign: 'center', lineHeight: 20 },

  summaryTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  summaryGym:   { fontSize: 16, fontWeight: '800', color: D.text, flex: 1 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: D.amberPale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  dot:          { width: 6, height: 6, borderRadius: 3 },
  dotLabel:     { fontSize: 11, fontWeight: '700' },
  summaryRows:  { gap: 6 },

  infoBox:      { backgroundColor: D.primaryGlow, borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: D.primary + '40', width: '100%' },
  infoBoxTitle: { fontSize: 14, fontWeight: '700', color: D.primary },
  infoBoxItem:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoBoxDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: D.primary, marginTop: 5 },
  infoBoxText:  { fontSize: 13, color: D.text, flex: 1, lineHeight: 18, opacity: 0.85 },

  // 승인 대기 단계
  waitingContainer:      { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24, paddingBottom: 40 },
  spinnerOuter:          { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: D.primary, borderTopColor: 'transparent', borderRightColor: D.primary + '40' },
  spinnerInner:          { position: 'absolute', width: 60, height: 60, top: 6, left: 6, borderRadius: 30, borderWidth: 3, borderColor: D.primary + '40', borderTopColor: D.primary },
  waitingTextBox:        { alignItems: 'center', gap: 8 },
  waitingTitle:          { fontSize: 22, fontWeight: '900', color: D.text },
  waitingSub:            { fontSize: 14, color: D.textSec, textAlign: 'center', lineHeight: 20 },
  waitingCountdown:      { alignItems: 'center', gap: 2, marginTop: 4 },
  waitingCountdownLabel: { fontSize: 12, color: D.textSec, fontWeight: '600' },
  waitingCountdownTimer: { fontSize: 36, fontWeight: '900', color: D.primary, fontVariant: ['tabular-nums'] as any, letterSpacing: 2 },
  waitingCard:           { backgroundColor: D.surface, borderRadius: 14, padding: 16, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: D.border, width: '100%' },
  waitingCardGym:        { fontSize: 16, fontWeight: '700', color: D.text },
  waitingCardDate:       { fontSize: 13, color: D.textSec },
  waitingCardFee:        { fontSize: 15, fontWeight: '800', color: D.primary, marginTop: 2 },
  emailBox:              { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: D.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: D.border, width: '100%' },
  emailBoxIcon:          { fontSize: 26, marginTop: 2 },
  emailBoxText:          { flex: 1, gap: 4 },
  emailBoxTitle:         { fontSize: 14, fontWeight: '700', color: D.text },
  emailBoxSub:           { fontSize: 12, color: D.textSec, lineHeight: 18 },
  waitingCheckBtn:       { paddingVertical: 13, paddingHorizontal: 28, borderRadius: 14, borderWidth: 1.5, borderColor: D.primary },
  waitingCheckBtnText:   { fontSize: 14, fontWeight: '700', color: D.primary },

  // 승인 완료 단계
  approvedBadge:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', width: '100%', marginTop: 8 },
  approvedCheck:     { width: 50, height: 50, borderRadius: 25, backgroundColor: D.success, alignItems: 'center', justifyContent: 'center', shadowColor: D.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  approvedCheckText: { fontSize: 26, color: '#fff', fontWeight: '300' },
  approvedTitle:     { fontSize: 18, fontWeight: '900', color: D.text },
  approvedSub:       { fontSize: 12, color: D.textSec, marginTop: 2, lineHeight: 17 },

  qrGuideBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: D.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: D.border, width: '100%' },
  qrGuideIcon:  { fontSize: 26, marginTop: 2 },
  qrGuideTitle: { fontSize: 14, fontWeight: '700', color: D.text },
  qrGuideSub:   { fontSize: 12, color: D.textSec, lineHeight: 18, marginTop: 3 },

  doneBtns:         { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, backgroundColor: D.surface, borderTopWidth: 1, borderTopColor: D.border, paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 28 },
  secondaryBtn:     { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: D.primary },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: D.primary },
  primaryBtn:       { flex: 1, backgroundColor: D.primary, paddingVertical: 15, borderRadius: 14, alignItems: 'center', shadowColor: D.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  primaryBtnText:   { fontSize: 14, fontWeight: '800', color: '#fff' },
});
