import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTrainerStore } from '../../store/trainerStore';
import { useBookingStore, calcEndTime } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useOfferStore } from '../../store/offerStore';
import { formatTime, formatPrice } from '../../utils/formatters';
import { PAY_METHODS } from '../../utils/constants';
import { requestPayment } from '../../config/payment';

const D = {
  bg:          '#EEF2F9',
  surface:     '#FFFFFF',
  primary:     '#4F63F5',
  primaryGlow: 'rgba(79,99,245,0.12)',
  primarySoft: 'rgba(79,99,245,0.06)',
  text:        '#0F172A',
  textSec:     '#64748B',
  textMuted:   '#94A3B8',
  border:      '#E2E8F0',
  success:     '#10B981',
  error:       '#EF4444',
  amber:       '#F59E0B',
  amberPale:   'rgba(245,158,11,0.10)',
};

const DURATION = 60;
const STEP_LABELS = ['희망 일정', '수업 선택', '결제', '예약 완료'];
const DAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const AM_SLOTS: string[] = [];
for (let h = 6; h <= 11; h++) {
  AM_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  AM_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}
const PM_SLOTS: string[] = [];
for (let h = 12; h <= 21; h++) {
  PM_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 21) PM_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

const CLASS_TYPES = [
  { id: '1:1 PT',    label: '1:1 PT',    icon: 'account-outline',    desc: '트레이너와 1대1 집중 트레이닝' },
  { id: '그룹 PT',   label: '그룹 PT',   icon: 'account-group-outline', desc: '소그룹 (2~4명) 함께하는 트레이닝' },
];

// 회원 '운동 목적'(trainers.tsx SPEC_FILTERS) 키워드와 통일. '기타'만 추가 유지.
const CLASS_PURPOSES = [
  { id: '다이어트',     label: '다이어트',     icon: 'run-fast' },
  { id: '체형교정',     label: '체형교정',     icon: 'human-handsup' },
  { id: '근력향상',     label: '근력향상',     icon: 'arm-flex-outline' },
  { id: '기초체력',     label: '기초체력',     icon: 'lightning-bolt-outline' },
  { id: '바디프로필',   label: '바디프로필',   icon: 'camera-outline' },
  { id: '벌크업',       label: '벌크업',       icon: 'dumbbell' },
  { id: '재활운동',     label: '재활운동',     icon: 'medical-bag' },
  { id: '통증관리',     label: '통증관리',     icon: 'heart-pulse' },
  { id: '산전산후',     label: '산전산후',     icon: 'baby-face-outline' },
  { id: '대회준비',     label: '대회준비',     icon: 'trophy-outline' },
  { id: '유연성증진',   label: '유연성증진',   icon: 'yoga' },
  { id: '웨딩케어',     label: '웨딩케어',     icon: 'ring' },
  { id: '선수레슨',     label: '선수레슨',     icon: 'whistle' },
  { id: '기타',         label: '기타',         icon: '' },
];

const SESSION_COUNTS = [1, 5, 10, 20, 30, 40];

function timeLabel(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')}`;
}

function formatDays(days: number[]): string {
  return WEEKDAY_ORDER.filter((d) => days.includes(d)).map((d) => DAY_SHORT[d]).join('·');
}

// 선택한 희망 요일 중 가장 가까운 미래 날짜를 시작일로 계산 (트레이너가 추후 조정)
function nextDateForDays(days: number[]): string {
  const base = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    if (days.includes(d.getDay())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  return '';
}

function StepIndicator({ step }: { step: number }) {
  return (
    <View style={s.stepRow}>
      {STEP_LABELS.map((label, i) => {
        const active = step === i + 1;
        const done = step > i + 1;
        return (
          <React.Fragment key={i}>
            <View style={s.stepItem}>
              <View style={[s.stepCircle, (active || done) && s.stepCircleActive]}>
                {done
                  ? <MaterialCommunityIcons name="check" size={14} color="#fff" />
                  : <Text style={[s.stepNum, (active || done) && s.stepNumActive]}>{i + 1}</Text>
                }
              </View>
              <Text style={[s.stepLabel, active && s.stepLabelActive, done && s.stepLabelDone]}>{label}</Text>
            </View>
            {i < STEP_LABELS.length - 1 && (
              <View style={[s.stepLine, done && s.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.screenHeader}>
      <TouchableOpacity style={s.headerBackBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="뒤로 가기">
        <MaterialCommunityIcons name="chevron-left" size={26} color={D.primary} />
      </TouchableOpacity>
      <Text style={s.screenHeaderTitle}>PT 예약</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

export default function NewBookingScreen() {
  const router = useRouter();
  const { trainerId, offerId, offerCount, offerPrice } = useLocalSearchParams<{ trainerId?: string; offerId?: string; offerCount?: string; offerPrice?: string }>();
  const { trainer: myTrainer, member } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const acceptOffer = useOfferStore((s) => s.acceptOffer);
  const storeTrainers = useTrainerStore((s) => s.trainers);
  const trainerFromStore = storeTrainers.find((t) => t.id === trainerId);
  const trainer = myTrainer?.id === trainerId ? myTrainer : trainerFromStore;
  const { addBooking, recordPayment } = useBookingStore();

  // 트레이너 맞춤 재등록 제안으로 진입 시 횟수·1회가격 고정
  const offerCountN = Number(offerCount) || 0;
  const offerPriceN = Number(offerPrice) || 0;
  const isOffer = !!offerId && offerCountN > 0 && offerPriceN > 0;

  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);
  const [preferredDays, setPreferredDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');

  const [classType, setClassType] = useState('');
  const [classPurpose, setClassPurpose] = useState('');
  const [sessionCount, setSessionCount] = useState(isOffer ? offerCountN : 0);

  const [payMethod, setPayMethod] = useState('card');
  const [completedBookingId, setCompletedBookingId] = useState('');

  const endTime = startTime ? calcEndTime(startTime, DURATION) : '';

  const basePrice = trainer?.sessionPrice ?? 60000;
  const pricePerSession = isOffer ? offerPriceN : basePrice;
  const rawTotal = pricePerSession * (sessionCount || 0);
  const finalPrice = rawTotal;
  const offerDiscountPct = isOffer && basePrice > 0 ? Math.max(0, Math.round((1 - offerPriceN / basePrice) * 100)) : 0;

  const canProceed =
    step === 1 ? preferredDays.length > 0 && startTime !== '' :
    step === 2 ? classType !== '' && classPurpose !== '' && sessionCount > 0 :
    step === 3 ? true : false;

  const goNext = () => {
    setStep((prev) => prev + 1);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
  };

  const handleConfirm = async () => {
    if (!trainer) return;
    // 결제 요청(미설정 시 데모 즉시성공, 포트원 설정 시 실 결제창). 성공해야 예약 생성.
    const orderId = `pt_${Date.now()}`;
    const pay = await requestPayment({
      orderId,
      orderName: `${trainer.name} 트레이너 ${sessionCount}회 PT`,
      amount: finalPrice,
      customerName: member?.name,
    });
    if (!pay.success) {
      const msg = pay.message ?? '결제에 실패했습니다. 다시 시도해주세요.';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('결제 실패', msg);
      return;
    }
    const sortedDays = [...preferredDays].sort();
    const startDate = nextDateForDays(sortedDays);
    const bookingId = addBooking({
      trainerId: trainer.id,
      trainerName: trainer.name,
      productId: `${classType}_${classPurpose}_${sessionCount}`,
      totalSessions: sessionCount,
      pricePerSession,
      totalAmount: finalPrice,
      schedule: { daysOfWeek: sortedDays, startTime, duration: DURATION },
      startDate,
      notes: `${classType} · ${classPurpose}`,
    });
    recordPayment({ orderId, bookingId, memberId: member?.id ?? '', amount: finalPrice, paymentId: pay.paymentId });
    addNotification({
      type: 'payment_done', targetRole: 'member', userId: member?.id ?? '',
      title: '결제가 완료되었습니다',
      body: `${trainer.name} 트레이너 ${sessionCount}회 패키지 결제 ${finalPrice.toLocaleString()}원이 완료되었습니다.`,
      meta: { bookingId },
    });
    addNotification({
      type: 'booking_confirmed', targetRole: 'trainer', userId: trainer.id,
      title: '새 PT 예약이 접수되었습니다',
      body: `${member?.name ?? '회원'}님이 ${sessionCount}회 패키지를 결제했습니다. 일정을 확인해주세요.`,
      meta: { bookingId, trainerId: trainer.id },
    });
    if (isOffer && offerId) acceptOffer(offerId);
    setCompletedBookingId(bookingId);
    setStep(4);
  };

  if (!trainer) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader onBack={() => router.back()} />
        <View style={s.centered}>
          <Text style={{ color: D.textSec, fontSize: 15 }}>트레이너 정보를 찾을 수 없습니다.</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.errorBtn}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Step 4: 예약 완료 ── */
  if (step === 4) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader onBack={() => router.replace('/(member)/trainers' as any)} />
        <StepIndicator step={4} />
        <ScrollView contentContainerStyle={s.doneContent} showsVerticalScrollIndicator={false}>
          <View style={s.doneCircle}>
            <MaterialCommunityIcons name="check" size={54} color="#fff" />
          </View>
          <Text style={s.doneTitle}>예약이 완료되었습니다!</Text>
          <Text style={s.doneSub}>PT 예약이 성공적으로 완료되었습니다</Text>
          <View style={s.doneSummaryCard}>
            <DoneRow icon="account"         label="트레이너"  value={`${trainer.name} 트레이너`} />
            <DoneRow icon="calendar"        label="희망 요일"  value={`매주 ${formatDays(preferredDays)}요일`} />
            <DoneRow icon="clock-outline"   label="희망 시간"  value={`${formatTime(startTime)} ~ ${formatTime(endTime)}`} />
            <DoneRow icon="dumbbell"        label="수업 유형" value={classType} />
            <DoneRow icon="target"          label="수업 목적" value={classPurpose} />
            <View style={s.doneDivider} />
            <DoneRow icon="repeat"          label="횟수"      value={`${sessionCount}회`} />
            <DoneRow icon="cash"            label="결제 금액" value={formatPrice(finalPrice)} valColor={D.primary} />
          </View>
          <View style={s.statusBadge}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={D.amber} />
            <Text style={s.statusBadgeText}>트레이너 확정 대기 중</Text>
          </View>
        </ScrollView>
        <View style={s.doneBottomBar}>
          <TouchableOpacity style={s.doneSecondaryBtn} onPress={() => router.replace('/(member)/trainers' as any)}>
            <Text style={s.doneSecondaryText}>홈으로</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.donePrimaryBtn} onPress={() => router.replace(`/booking/${completedBookingId}` as any)}>
            <Text style={s.donePrimaryText}>예약 확인하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader onBack={() => router.back()} />
      <StepIndicator step={step} />

      {/* 트레이너 배너 */}
      <View style={s.trainerBanner}>
        <View style={s.trainerAvatar}>
          <Text style={s.trainerAvatarText}>{trainer.name[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.trainerBannerName} numberOfLines={1}>{trainer.name} 트레이너</Text>
          <Text style={s.trainerBannerSub} numberOfLines={1}>{trainer.tagline}</Text>
        </View>
        <View style={s.priceChip}>
          <Text style={s.priceChipVal}>{formatPrice(basePrice)}</Text>
          <Text style={s.priceChipUnit}>/회</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* ── Step 1: 희망 일정 ── */}
        {step === 1 && (
          <>
            <Text style={s.stepTitle}>희망 요일과 시간을 선택하세요</Text>

            <View style={s.card}>
              <Text style={s.cardLabel}>희망 요일</Text>
              <View style={s.dayGrid}>
                {WEEKDAY_ORDER.map((d) => {
                  const active = preferredDays.includes(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[s.dayBtn, active && s.dayBtnActive]}
                      onPress={() => setPreferredDays((prev) =>
                        prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                      )}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.dayBtnText, active && s.dayBtnTextActive,
                        !active && d === 0 && { color: D.error },
                        !active && d === 6 && { color: '#6C8EF5' },
                      ]}>{DAY_SHORT[d]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {preferredDays.length > 0
                ? <Text style={s.selectedDateText}>매주 {formatDays(preferredDays)}요일</Text>
                : <Text style={s.selectedDateHint}>희망 요일을 선택해주세요 (복수 선택 가능)</Text>
              }
            </View>

            <View style={s.card}>
              <View style={s.cardLabelRow}>
                <Text style={s.cardLabel}>희망 시간</Text>
                <View style={s.fixedChip}>
                  <Text style={s.fixedChipText}>1시간 고정</Text>
                </View>
              </View>
              <Text style={s.periodLabel}>오전</Text>
              <View style={s.timeGrid}>
                {AM_SLOTS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.timeBtn, startTime === t && s.timeBtnActive]}
                    onPress={() => setStartTime(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.timeBtnText, startTime === t && s.timeBtnTextActive]}>{timeLabel(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[s.periodLabel, { marginTop: 14 }]}>오후</Text>
              <View style={s.timeGrid}>
                {PM_SLOTS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.timeBtn, startTime === t && s.timeBtnActive]}
                    onPress={() => setStartTime(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.timeBtnText, startTime === t && s.timeBtnTextActive]}>{timeLabel(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {startTime ? (
                <View style={s.selectedTimeBox}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={D.primary} />
                  <Text style={s.selectedTimeText}>{formatTime(startTime)} ~ {formatTime(endTime)}</Text>
                </View>
              ) : (
                <View style={s.selectedTimeHintBox}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={D.textMuted} />
                  <Text style={s.selectedTimeHint}>희망 시간을 선택해주세요</Text>
                </View>
              )}
            </View>

            <View style={s.payNotice}>
              <MaterialCommunityIcons name="information-outline" size={16} color={D.success} />
              <Text style={s.payNoticeText}>선택하신 희망 요일·시간을 바탕으로 트레이너가 일정을 확정합니다</Text>
            </View>
          </>
        )}

        {/* ── Step 2: 수업 선택 ── */}
        {step === 2 && (
          <>
            <Text style={s.stepTitle}>수업을 선택하세요</Text>

            <View style={s.schedulePreview}>
              <MaterialCommunityIcons name="calendar-check" size={15} color={D.primary} />
              <Text style={s.schedulePreviewText}>
                매주 {formatDays(preferredDays)}요일 · {formatTime(startTime)} ~ {formatTime(endTime)}
              </Text>
            </View>

            {/* 수업 유형 */}
            <View style={s.card}>
              <Text style={s.cardLabel}>수업 유형</Text>
              {CLASS_TYPES.map((ct) => {
                const active = classType === ct.id;
                return (
                  <TouchableOpacity
                    key={ct.id}
                    style={[s.typeRow, active && s.typeRowActive]}
                    onPress={() => setClassType(ct.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.typeIconWrap, active && s.typeIconWrapActive]}>
                      <MaterialCommunityIcons name={ct.icon as any} size={22} color={active ? '#fff' : D.textSec} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.typeLabel, active && s.typeLabelActive]}>{ct.label}</Text>
                      <Text style={s.typeDesc}>{ct.desc}</Text>
                    </View>
                    {active && <MaterialCommunityIcons name="check-circle" size={22} color={D.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 수업 목적 */}
            <View style={s.card}>
              <Text style={s.cardLabel}>수업 목적</Text>
              <View style={s.purposeGrid}>
                {CLASS_PURPOSES.map((cp) => {
                  const active = classPurpose === cp.id;
                  return (
                    <TouchableOpacity
                      key={cp.id}
                      style={[s.purposeBtn, active && s.purposeBtnActive]}
                      onPress={() => setClassPurpose(cp.id)}
                      activeOpacity={0.7}
                    >
                      {cp.icon !== '' && (
                        <MaterialCommunityIcons name={cp.icon as any} size={18} color={active ? '#fff' : D.textSec} />
                      )}
                      <Text numberOfLines={1} style={[s.purposeText, active && s.purposeTextActive]}>{cp.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 횟수 선택 (제안 모드: 고정) */}
            {isOffer ? (
              <View style={[s.card, { borderWidth: 1.5, borderColor: D.primary }]}>
                <Text style={s.cardLabel}>🎁 트레이너 맞춤 재등록 제안</Text>
                <View style={s.offerLockRow}>
                  <View style={s.offerLockCount}>
                    <Text style={s.offerLockCountNum}>{sessionCount}<Text style={s.offerLockCountUnit}>회</Text></Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {offerDiscountPct > 0 && (
                      <Text style={s.offerLockBase}>정상가 {formatPrice(basePrice * sessionCount)}</Text>
                    )}
                    <Text style={s.offerLockTotal}>{formatPrice(finalPrice)}</Text>
                    <Text style={s.offerLockPer}>
                      {formatPrice(pricePerSession)}/회{offerDiscountPct > 0 ? ` · ${offerDiscountPct}% 할인` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={s.offerLockNote}>트레이너가 보낸 맞춤 제안가입니다. 횟수·가격은 고정됩니다.</Text>
              </View>
            ) : (
            <View style={s.card}>
              <Text style={s.cardLabel}>횟수 선택</Text>
              <View style={s.countGrid}>
                {SESSION_COUNTS.map((count) => {
                  const active = sessionCount === count;
                  const total = basePrice * count;
                  return (
                    <TouchableOpacity
                      key={count}
                      style={[s.countCard, active && s.countCardActive]}
                      onPress={() => setSessionCount(count)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.countNum, active && { color: D.primary }]}>
                        {count}<Text style={s.countUnit}>회</Text>
                      </Text>
                      <Text style={[s.countTotal, active && { color: D.primary, fontWeight: '700' }]}>
                        {formatPrice(total)}
                      </Text>
                      <Text style={s.countPer}>{formatPrice(basePrice)}/회</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            )}
          </>
        )}

        {/* ── Step 3: 결제 ── */}
        {step === 3 && (
          <>
            <Text style={s.stepTitle}>결제 정보를 확인하세요</Text>

            <View style={s.summaryCard}>
              <Text style={s.summaryTitle}>예약 내역</Text>
              <SRow label="트레이너"   value={`${trainer.name} 트레이너`} />
              <SRow label="희망 요일"  value={`매주 ${formatDays(preferredDays)}요일`} />
              <SRow label="희망 시간"  value={`${formatTime(startTime)} ~ ${formatTime(endTime)}`} />
              <SRow label="수업 유형"  value={classType} />
              <SRow label="수업 목적"  value={classPurpose} />
              <View style={s.divider} />
              <SRow label="횟수"       value={`${sessionCount}회`} />
              <SRow label="1회당 금액" value={formatPrice(pricePerSession)} />
            </View>

            {/* 결제 수단 */}
            <View style={s.payCard}>
              <View style={s.payCardHead}>
                <MaterialCommunityIcons name="credit-card-outline" size={18} color={D.primary} />
                <Text style={s.payCardTitle}>결제 수단</Text>
              </View>
              <View style={s.payMethodGrid}>
                {PAY_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.payMethodBtn, payMethod === m.id && s.payMethodBtnActive]}
                    onPress={() => setPayMethod(m.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name={m.icon as any} size={22} color={payMethod === m.id ? D.primary : D.textMuted} />
                    <Text style={[s.payMethodText, payMethod === m.id && s.payMethodTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 데모 결제 안내 */}
            <View style={s.demoNotice}>
              <MaterialCommunityIcons name="information-outline" size={15} color={D.amber} />
              <Text style={s.demoNoticeText}>
                데모 결제입니다. 실제 청구·결제가 발생하지 않습니다.
              </Text>
            </View>

            {/* 최종 금액 */}
            <View style={s.finalCard}>
              <Text style={s.finalTitle}>최종 결제 금액</Text>
              <View style={s.finalBreakdown}>
                <View style={s.finalRow}>
                  <Text style={s.finalRowLabel}>{sessionCount}회 × {formatPrice(basePrice)}</Text>
                  <Text style={s.finalRowVal}>{formatPrice(rawTotal)}</Text>
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.finalAmountRow}>
                <Text style={s.finalAmountLabel}>결제 금액</Text>
                <Text style={s.finalAmountVal}>{formatPrice(finalPrice)}</Text>
              </View>
            </View>

            {/* 결제 보안 배지 */}
            <View style={s.trustRow}>
              <View style={s.trustBadge}>
                <MaterialCommunityIcons name="shield-lock-outline" size={14} color={D.success} />
                <Text style={s.trustText}>SSL 보안</Text>
              </View>
              <View style={s.trustBadge}>
                <MaterialCommunityIcons name="lock-outline" size={14} color={D.success} />
                <Text style={s.trustText}>암호화 결제</Text>
              </View>
              <View style={s.trustBadge}>
                <MaterialCommunityIcons name="shield-check-outline" size={14} color={D.success} />
                <Text style={s.trustText}>안전 보장</Text>
              </View>
            </View>

            <View style={s.payNotice}>
              <MaterialCommunityIcons name="shield-check" size={16} color={D.success} />
              <Text style={s.payNoticeText}>결제 후 트레이너 확정을 거쳐 예약이 완료됩니다</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={s.bottomBar}>
        {step > 1 && (
          <TouchableOpacity style={s.prevBtn} onPress={() => { setStep((p) => p - 1); setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 0); }}>
            <Text style={s.prevBtnText}>이전</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.nextBtn, !canProceed && s.nextBtnDisabled]}
          disabled={!canProceed}
          onPress={() => step < 3 ? goNext() : handleConfirm()}
        >
          <Text style={s.nextBtnText}>
            {step === 3 ? `${formatPrice(finalPrice)} 결제하기` : '다음 →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  );
}

function DoneRow({ icon, label, value, valColor }: { icon: string; label: string; value: string; valColor?: string }) {
  return (
    <View style={s.doneRow}>
      <MaterialCommunityIcons name={icon as any} size={16} color={D.primary} style={{ width: 22 }} />
      <Text style={s.doneRowLabel}>{label}</Text>
      <Text style={[s.doneRowVal, valColor ? { color: valColor } : {}]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorBtn:  { backgroundColor: D.primary, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14 },

  screenHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: D.surface,
  },
  headerBackBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
  },
  screenHeaderTitle: { fontSize: 15, fontWeight: '700', color: D.text },

  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: D.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stepItem:        { alignItems: 'center', gap: 4 },
  stepLine:        { flex: 1, height: 2, backgroundColor: D.border, marginHorizontal: 4, marginBottom: 18 },
  stepLineDone:    { backgroundColor: D.primary },
  stepCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: D.bg, borderWidth: 2, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive:{ backgroundColor: D.primary, borderColor: D.primary },
  stepNum:         { fontSize: 11, fontWeight: '700', color: D.textMuted },
  stepNumActive:   { color: '#fff' },
  stepLabel:       { fontSize: 10, color: D.textMuted, fontWeight: '500' },
  stepLabelActive: { color: D.primary, fontWeight: '700' },
  stepLabelDone:   { color: D.primary },

  trainerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: D.surface, marginBottom: 2,
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  trainerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: D.primaryGlow, alignItems: 'center', justifyContent: 'center',
  },
  trainerAvatarText: { fontSize: 15, fontWeight: '800', color: D.primary },
  trainerBannerName: { fontSize: 14, fontWeight: '700', color: D.text },
  trainerBannerSub:  { fontSize: 11, color: D.textSec, marginTop: 1 },
  priceChip:         { alignItems: 'flex-end' },
  priceChipVal:      { fontSize: 14, fontWeight: '800', color: D.primary },
  priceChipUnit:     { fontSize: 11, color: D.textSec },

  content:   { padding: 14, paddingBottom: 120 },
  stepTitle: { fontSize: 17, fontWeight: '800', color: D.text, marginBottom: 12 },

  card: {
    backgroundColor: D.surface, borderRadius: 20,
    padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  cardLabel: {
    fontSize: 12, fontWeight: '700', color: D.textSec, marginBottom: 14,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  fixedChip:    { backgroundColor: D.primaryGlow, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  fixedChipText:{ fontSize: 11, fontWeight: '700', color: D.primary },

  /* 희망 요일 */
  dayGrid:        { flexDirection: 'row', gap: 6 },
  dayBtn: {
    flex: 1, aspectRatio: 1, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border,
  },
  dayBtnActive:    { backgroundColor: D.primary, borderColor: D.primary },
  dayBtnText:      { fontSize: 14, fontWeight: '700', color: D.textSec },
  dayBtnTextActive:{ color: '#fff' },
  selectedDateText:{ fontSize: 13, color: D.primary, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  selectedDateHint:{ fontSize: 13, color: D.textSec, textAlign: 'center', marginTop: 12 },

  /* 시간 그리드 */
  periodLabel: { fontSize: 11, fontWeight: '700', color: D.textMuted, marginBottom: 8, letterSpacing: 0.4 },
  timeGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeBtn: {
    width: '23%', paddingVertical: 11, borderRadius: 10, alignItems: 'center',
    backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border,
  },
  timeBtnActive:     { backgroundColor: D.primary, borderColor: D.primary },
  timeBtnText:       { fontSize: 12, fontWeight: '600', color: D.textSec },
  timeBtnTextActive: { color: '#fff', fontWeight: '700' },
  selectedTimeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: D.primaryGlow, borderRadius: 12,
  },
  selectedTimeText: { fontSize: 13, fontWeight: '700', color: D.primary },
  selectedTimeHintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: D.bg, borderRadius: 12,
    borderWidth: 1.5, borderColor: D.border, borderStyle: 'dashed',
  },
  selectedTimeHint: { fontSize: 13, color: D.textMuted },

  /* Step 2 공통 */
  schedulePreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.primarySoft, borderRadius: 12, padding: 13, marginBottom: 14,
  },
  schedulePreviewText: { fontSize: 13, color: D.primary, fontWeight: '600', flex: 1 },

  /* 수업 유형 */
  typeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 13, paddingHorizontal: 14,
    backgroundColor: D.bg, borderRadius: 14,
    borderWidth: 1.5, borderColor: D.border,
    marginBottom: 8,
  },
  typeRowActive: { borderColor: D.primary, backgroundColor: D.primaryGlow },
  typeIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: D.border, alignItems: 'center', justifyContent: 'center',
  },
  typeIconWrapActive: { backgroundColor: D.primary },
  typeLabel:       { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 2 },
  typeLabelActive: { color: D.primary },
  typeDesc:        { fontSize: 12, color: D.textSec },

  /* 수업 목적 */
  purposeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  purposeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: D.bg, borderRadius: 24,
    borderWidth: 1.5, borderColor: D.border,
  },
  purposeBtnActive:  { backgroundColor: D.primary, borderColor: D.primary },
  purposeText:       { fontSize: 13, fontWeight: '600', color: D.textSec },
  purposeTextActive: { color: '#fff' },

  /* 횟수 선택 */
  countGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countCard: {
    width: '48%', backgroundColor: D.bg, borderRadius: 16,
    borderWidth: 1.5, borderColor: D.border,
    padding: 14, gap: 4, alignItems: 'flex-start',
    position: 'relative',
  },
  countCardActive: {
    borderColor: D.primary, backgroundColor: D.primaryGlow,
    shadowColor: D.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
  },
  countTag: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: D.amberPale, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  countTagActive:     { backgroundColor: D.primary },
  countTagText:       { fontSize: 10, fontWeight: '700', color: D.amber },
  countTagTextActive: { color: '#fff' },
  countNum:  { fontSize: 26, fontWeight: '800', color: D.text, marginTop: 4 },
  countUnit: { fontSize: 14, fontWeight: '600' },
  countTotal:{ fontSize: 15, fontWeight: '700', color: D.text },
  countPer:  { fontSize: 11, color: D.textSec },

  offerLockRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: D.primaryGlow, borderRadius: 14, padding: 14 },
  offerLockCount: { width: 64, height: 64, borderRadius: 16, backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center' },
  offerLockCountNum: { fontSize: 22, fontWeight: '900', color: '#fff' },
  offerLockCountUnit: { fontSize: 13, fontWeight: '700', color: '#fff' },
  offerLockBase: { fontSize: 12, color: D.textMuted, textDecorationLine: 'line-through' },
  offerLockTotal: { fontSize: 20, fontWeight: '900', color: D.primary, marginTop: 1 },
  offerLockPer: { fontSize: 12, color: D.textSec, marginTop: 2, fontWeight: '600' },
  offerLockNote: { fontSize: 11, color: D.textMuted, marginTop: 4 },
  freePtBadge: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: '#6EE7B7',
  },
  freePtBadgeActive: { backgroundColor: D.success + '20', borderColor: D.success },
  freePtText:       { fontSize: 10, fontWeight: '700', color: D.success },
  freePtTextActive: { color: D.success },

  /* Step 3 결제 */
  summaryCard: {
    backgroundColor: D.surface, borderRadius: 20,
    padding: 18, gap: 10, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 4 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: D.textSec },
  summaryValue: { fontSize: 13, color: D.text, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 16 },
  divider: { height: 1, backgroundColor: D.border },
  discountNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: D.amberPale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  discountNoticeText: { fontSize: 12, fontWeight: '600', color: D.amber },

  payCard: {
    backgroundColor: D.surface, borderRadius: 20, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  payCardHead:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  payCardTitle: { fontSize: 16, fontWeight: '700', color: D.text },

  appliedCoupon: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: D.success + '12', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: D.success + '30',
  },
  appliedCouponLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  appliedLabel:  { fontSize: 14, fontWeight: '600', color: D.text },
  appliedDisc:   { fontSize: 12, color: D.success, fontWeight: '500', marginTop: 2 },
  removeCoupon:  { fontSize: 13, color: D.error, fontWeight: '600', paddingLeft: 8 },
  couponInputRow:{ flexDirection: 'row', gap: 8, alignItems: 'center' },
  couponInput: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border,
    paddingHorizontal: 14, fontSize: 14, color: D.text, fontWeight: '600',
  },
  couponApplyBtn: {
    height: 50, paddingHorizontal: 18, borderRadius: 12,
    backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center',
  },
  couponApplyBtnOff: { backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border },
  couponApplyText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  couponError: { fontSize: 12, color: D.error, marginTop: 6 },
  couponHint:  { fontSize: 11, color: D.textMuted, marginTop: 6 },

  pointBal: {
    marginLeft: 'auto' as any,
    backgroundColor: D.amberPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  pointBalText:  { fontSize: 12, fontWeight: '600', color: D.amber },
  pointInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pointInput: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border,
    paddingHorizontal: 14, fontSize: 14, color: D.text, fontWeight: '600',
  },
  pointInputDisabled: { opacity: 0.5 },
  useAllBtn: {
    height: 50, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center',
  },
  useAllBtnActive: { backgroundColor: D.amberPale, borderColor: D.amber + '88' },
  useAllText:      { fontSize: 13, fontWeight: '600', color: D.textSec },
  useAllTextActive:{ color: D.amber },
  pointApplied:    { fontSize: 12, color: D.amber, fontWeight: '600', marginTop: 6 },

  payMethodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payMethodBtn: {
    width: '30%', flexGrow: 1, alignItems: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border,
  },
  payMethodBtnActive:  { borderColor: D.primary, backgroundColor: D.primaryGlow },
  payMethodText:       { fontSize: 11, fontWeight: '600', color: D.textMuted },
  payMethodTextActive: { color: D.primary, fontWeight: '700' },

  earnedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.primaryGlow, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: D.primary + '30',
  },
  earnedText: { fontSize: 13, color: D.textSec, flex: 1 },
  earnedVal:  { fontSize: 13, fontWeight: '800', color: D.primary },

  demoNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.amberPale, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: D.amber + '40',
  },
  demoNoticeText: { fontSize: 12.5, color: D.textSec, flex: 1, fontWeight: '600' },

  trustRow:   { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  trustBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.success + '12', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: D.success + '30',
  },
  trustText:  { fontSize: 11, fontWeight: '600', color: D.success },

  finalCard: {
    backgroundColor: D.primaryGlow, borderRadius: 20, padding: 18, marginBottom: 12,
    borderWidth: 2, borderColor: D.primary + '30',
  },
  finalTitle: {
    fontSize: 12, fontWeight: '700', color: D.primary, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  finalBreakdown:  { gap: 8, marginBottom: 8 },
  finalRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finalRowLabel:   { fontSize: 13, color: D.textSec },
  finalRowVal:     { fontSize: 13, color: D.text, fontWeight: '500' },
  finalAmountRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 },
  finalAmountLabel:{ fontSize: 17, fontWeight: '700', color: D.text },
  finalAmountVal:  { fontSize: 28, fontWeight: '900', color: D.primary },

  payNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.success + '12', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: D.success + '30',
  },
  payNoticeText: { fontSize: 13, color: D.success, fontWeight: '600' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 16, paddingBottom: 28,
    backgroundColor: D.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 8,
    gap: 10,
  },
  prevBtn: {
    flex: 1, paddingVertical: 17, borderRadius: 16,
    backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border, alignItems: 'center',
  },
  prevBtnText: { fontSize: 15, color: D.textSec, fontWeight: '600' },
  nextBtn: {
    flex: 3, paddingVertical: 17, borderRadius: 16,
    backgroundColor: D.primary, alignItems: 'center',
    shadowColor: D.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  nextBtnDisabled: { backgroundColor: D.bg, shadowOpacity: 0, elevation: 0 },
  nextBtnText:     { fontSize: 16, color: '#fff', fontWeight: '700' },

  /* Step 4 완료 */
  doneContent: {
    flexGrow: 1, alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 52, paddingBottom: 140, gap: 14,
  },
  doneCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: D.primary, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45, shadowRadius: 24, elevation: 12,
  },
  doneTitle: { fontSize: 26, fontWeight: '800', color: D.text },
  doneSub:   { fontSize: 14, color: D.textSec, marginBottom: 8 },
  doneSummaryCard: {
    width: '100%', backgroundColor: D.surface, borderRadius: 20,
    padding: 18, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  doneRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  doneRowLabel: { fontSize: 13, color: D.textSec, flex: 1 },
  doneRowVal:   { fontSize: 13, color: D.text, fontWeight: '600' },
  doneDivider:  { height: 1, backgroundColor: D.border, width: '100%' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24,
    backgroundColor: D.amberPale, borderWidth: 1.5, borderColor: D.amber + '44',
  },
  statusBadgeText: { fontSize: 13, fontWeight: '600', color: D.amber },

  doneBottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 16, paddingBottom: 28, gap: 10,
    backgroundColor: D.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 8,
  },
  doneSecondaryBtn: {
    flex: 1, paddingVertical: 17, borderRadius: 16,
    backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border, alignItems: 'center',
  },
  doneSecondaryText: { fontSize: 15, color: D.textSec, fontWeight: '600' },
  donePrimaryBtn: {
    flex: 2, paddingVertical: 17, borderRadius: 16, backgroundColor: D.primary, alignItems: 'center',
    shadowColor: D.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  donePrimaryText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});
