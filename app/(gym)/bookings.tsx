import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, FlatList, Modal, Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useBookingStore } from '../../store/bookingStore';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { MOCK_TRAINERS } from '../../data/trainers';
import { MOCK_GYMS } from '../../data/gyms';
import { formatTime, formatPrice } from '../../utils/formatters';
import { COLORS, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, DAY_LABELS } from '../../utils/constants';
import { SlotBooking } from '../../types';
import StarRating from '../../components/StarRating';

const GYM   = '#2DD4BF';
const NAVY  = '#0F172A';
const BG    = '#F1F5F9';
const CARD  = '#FFFFFF';
const CARD2 = '#F8F9FA';
const BD    = '#E2E8F0';
const TXT   = '#0F172A';
const SEC   = '#64748B';
const ORANGE = '#F59E0B';
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

function formatHeaderDate(): string {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function parseDateLabel(date: string): string {
  const [, m, d] = date.split('-');
  return `${parseInt(m)}월 ${parseInt(d)}일 (${DAY_LABELS[new Date(date).getDay()]})`;
}

function addMinutes(time: string, min: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + min;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ── 트레이너 아바타 ──────────────────────────────────────────
function TrainerAvatar({ trainerId, trainerName, size = 48 }: {
  trainerId: string; trainerName: string; size?: number;
}) {
  const trainer = MOCK_TRAINERS.find((t) => t.id === trainerId);
  if (trainer?.profileImageUrl) {
    return (
      <Image
        source={{ uri: trainer.profileImageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.border }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: GYM + '20', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.42, fontWeight: '800', color: GYM }}>{trainerName[0]}</Text>
    </View>
  );
}

// ── Step 1: 예약 요청 카드 (미사용 — TrainerGroupCard로 대체됨) ──
function SlotRequestCard({ booking, onDetail }: { booking: SlotBooking; onDetail: () => void }) {
  const endTime = addMinutes(booking.startTime, 30);
  const trainer = MOCK_TRAINERS.find((t) => t.id === booking.trainerId);
  return (
    <TouchableOpacity style={st.reqCard} onPress={onDetail} activeOpacity={0.86}>
      <View style={st.reqAccentBar} />
      <View style={st.reqContent}>
        {/* 상단 레이블 */}
        <View style={st.reqHeaderRow}>
          <View style={st.reqLiveDot} />
          <Text style={st.reqLiveLabel}>새 예약 요청</Text>
          <View style={st.reqWaitBadge}>
            <MaterialCommunityIcons name="clock-outline" size={10} color="#D97706" />
            <Text style={st.reqWaitText}>승인 대기</Text>
          </View>
        </View>

        {/* 트레이너 정보 */}
        <View style={st.reqBodyRow}>
          <TrainerAvatar trainerId={booking.trainerId} trainerName={booking.trainerName} size={54} />
          <View style={st.reqBodyInfo}>
            <Text style={st.reqTrainerName}>{booking.trainerName} 트레이너</Text>
            {trainer && (
              <Text style={st.reqSpec} numberOfLines={1}>
                {trainer.specializations?.slice(0, 2).join(' · ')} · {trainer.experienceYears}년 경력
              </Text>
            )}
            <View style={st.reqMetaRow}>
              <MaterialCommunityIcons name="calendar-outline" size={11} color={COLORS.textSecondary} />
              <Text style={st.reqMetaText}>{parseDateLabel(booking.date)}</Text>
            </View>
            <View style={st.reqMetaRow}>
              <MaterialCommunityIcons name="clock-outline" size={11} color={GYM} />
              <Text style={[st.reqMetaText, { color: GYM, fontWeight: '700' }]}>
                {booking.startTime} – {endTime}
              </Text>
            </View>
          </View>
        </View>

        {/* 하단 시설료 + CTA */}
        <View style={st.reqFooterRow}>
          <View style={st.reqFeeInfo}>
            <Text style={st.reqFeeNum}>{formatPrice(booking.facilityFee)}</Text>
            <Text style={st.reqFeeTag}>시설 이용료</Text>
          </View>
          <View style={st.reqCTABtn}>
            <Text style={st.reqCTAText}>상세 확인</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={GYM} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── 트레이너별 그룹 카드 (체크박스 개별 선택) ───────────────────
type TrainerGroup = { trainerId: string; trainerName: string; slots: SlotBooking[]; totalFee: number };

function TrainerGroupCard({ group, onApprove, onReject, highlighted }: {
  group: TrainerGroup;
  onApprove: (slots: SlotBooking[]) => void;
  onReject:  (slots: SlotBooking[]) => void;
  highlighted?: boolean;
}) {
  // boolean[] 인덱스 방식 — Set보다 단순하고 상태 오염 없음
  const [checks, setChecks] = React.useState<boolean[]>(
    () => group.slots.map(() => true)
  );

  const toggle = (idx: number) =>
    setChecks(prev => prev.map((v, i) => i === idx ? !v : v));

  const toggleAll = () =>
    setChecks(prev => {
      const allOn = prev.every(Boolean);
      return prev.map(() => !allOn);
    });

  const checkedSlots = group.slots.filter((_, i) => checks[i] === true);
  const checkedCount = checkedSlots.length;
  const total        = group.slots.length;
  const allOn        = checkedCount === total;
  const noneOn       = checkedCount === 0;
  const someOn       = !allOn && !noneOn;
  const checkedFee   = checkedSlots.reduce((sum, s) => sum + s.facilityFee, 0);
  const trainer      = MOCK_TRAINERS.find(t => t.id === group.trainerId);

  return (
    <View style={[st.groupCard, highlighted && st.groupCardHL]}>
      <View style={st.groupAccentBar} />
      <View style={st.groupInner}>

        {/* 헤더: 트레이너 정보 + 전체선택 */}
        <View style={st.groupHeaderRow}>
          <TrainerAvatar trainerId={group.trainerId} trainerName={group.trainerName} size={46} />
          <View style={st.groupInfo}>
            <Text style={st.groupTrainerName}>{group.trainerName} 트레이너</Text>
            {trainer && (
              <Text style={st.groupSpec} numberOfLines={1}>
                {trainer.specializations?.slice(0, 2).join(' · ')} · {trainer.experienceYears}년 경력
              </Text>
            )}
          </View>
          <TouchableOpacity style={st.groupSelectAllBtn} onPress={toggleAll} activeOpacity={0.7}>
            <Text style={st.groupSelectAllTxt}>전체</Text>
            <View style={[st.cb, allOn && st.cbOn, someOn && st.cbMixed]}>
              {allOn  && <MaterialCommunityIcons name="check" size={10} color="#fff" />}
              {someOn && <View style={st.cbDash} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* 슬롯 목록 + 개별 체크박스 */}
        <View style={st.groupSlotList}>
          {group.slots.map((slot, i) => {
            const on = checks[i] === true;
            return (
              <TouchableOpacity
                key={slot.id}
                style={[st.groupSlotRow, i > 0 && st.groupSlotDivider]}
                onPress={() => toggle(i)}
                activeOpacity={0.75}
              >
                <View style={[st.cb, on && st.cbOn]}>
                  {on && <MaterialCommunityIcons name="check" size={10} color="#fff" />}
                </View>
                <View style={st.groupSlotDot} />
                <View style={[st.groupSlotInfo, !on && { opacity: 0.35 }]}>
                  <Text style={st.groupSlotDate}>{parseDateLabel(slot.date)}</Text>
                  <Text style={st.groupSlotTime}>{slot.startTime} – {addMinutes(slot.startTime, 30)}</Text>
                </View>
                <Text style={[st.groupSlotFee, !on && { opacity: 0.35 }]}>{formatPrice(slot.facilityFee)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 선택 합계 */}
        <View style={st.groupTotalRow}>
          <Text style={st.groupTotalLabel}>{checkedCount}/{total}개 선택</Text>
          <Text style={[st.groupTotalFee, noneOn && { color: COLORS.textMuted }]}>
            {formatPrice(checkedFee)}
          </Text>
        </View>

        {/* 액션 버튼 */}
        <View style={st.groupActions}>
          <TouchableOpacity
            style={[st.groupRejectBtn, noneOn && { opacity: 0.35 }]}
            onPress={() => { if (!noneOn) onReject(checkedSlots); }}
            activeOpacity={noneOn ? 1 : 0.8}
          >
            <MaterialCommunityIcons name="close" size={13} color={COLORS.error} />
            <Text style={st.groupRejectText}>{someOn ? `${checkedCount}개 거부` : '거부'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.groupApproveBtn, noneOn && { opacity: 0.35 }]}
            onPress={() => { if (!noneOn) onApprove(checkedSlots); }}
            activeOpacity={noneOn ? 1 : 0.8}
          >
            <MaterialCommunityIcons name="check" size={13} color="#fff" />
            <Text style={st.groupApproveText}>{someOn ? `${checkedCount}개 승인` : '일괄 승인'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── 예약 현황 그룹 카드 ──────────────────────────────────────
const STATUS_CFG = {
  pending:   { label: '승인 대기', bg: '#FEF3C7', text: '#D97706', icon: 'clock-alert-outline' },
  confirmed: { label: '승인 완료', bg: '#ECFDF5', text: '#059669', icon: 'check-circle-outline' },
  cancelled: { label: '거부됨',   bg: '#FEF2F2', text: '#DC2626', icon: 'close-circle-outline' },
} as const;

function BookingGroupCard({ trainerId, trainerName, slots, onQR }: {
  trainerId: string; trainerName: string;
  slots: SlotBooking[]; onQR?: (b: SlotBooking) => void;
}) {
  const totalFee = slots.reduce((sum, s) => sum + s.facilityFee, 0);
  const hasPending   = slots.some(s => s.status === 'pending');
  const hasConfirmed = slots.some(s => s.status === 'confirmed');
  const accent = hasPending ? '#F59E0B' : hasConfirmed ? GYM : COLORS.error;

  return (
    <View style={st.bgCard}>
      <View style={[st.bgAccentBar, { backgroundColor: accent }]} />
      <View style={st.bgInner}>
        <View style={st.bgHeader}>
          <TrainerAvatar trainerId={trainerId} trainerName={trainerName} size={42} />
          <View style={st.bgInfo}>
            <Text style={st.bgName}>{trainerName} 트레이너</Text>
            <Text style={st.bgMeta}>{slots.length}개 슬롯 · {formatPrice(totalFee)}</Text>
          </View>
        </View>
        {slots.map((slot, i) => {
          const cfg = STATUS_CFG[slot.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
          const endTime = addMinutes(slot.startTime, 30);
          const isToday = slot.date === today;
          return (
            <View key={slot.id} style={[st.bgRow, i > 0 && st.bgRowDivider]}>
              <MaterialCommunityIcons name={cfg.icon as any} size={13} color={cfg.text} />
              <View style={st.bgSlotInfo}>
                <Text style={st.bgSlotDate}>{parseDateLabel(slot.date)}</Text>
                <Text style={[st.bgSlotTime, { color: GYM }]}>{slot.startTime} – {endTime}</Text>
              </View>
              <View style={[st.bgBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[st.bgBadgeTxt, { color: cfg.text }]}>{cfg.label}</Text>
              </View>
              {slot.status === 'confirmed' && isToday && onQR && (
                <TouchableOpacity style={st.bgQrBtn} onPress={() => onQR(slot)} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="qrcode-scan" size={11} color="#fff" />
                  <Text style={st.bgQrTxt}>QR</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Step 5: 예약 현황 카드 ────────────────────────────────────
function BookingStatusCard({ booking, onQR }: {
  booking: SlotBooking & { _type?: string }; onQR?: () => void;
}) {
  const endTime = addMinutes(booking.startTime, 30);
  const isToday = booking.date === today;
  const S = {
    pending:   { label: '승인 대기', bg: '#FEF3C7', text: '#D97706', accent: '#F59E0B', icon: 'clock-alert-outline' },
    confirmed: { label: '승인 완료', bg: '#ECFDF5', text: '#059669', accent: '#10B981', icon: 'check-circle-outline' },
    cancelled: { label: '거부됨',   bg: '#FEF2F2', text: '#DC2626', accent: '#EF4444', icon: 'close-circle-outline' },
  } as const;
  const cfg = S[booking.status as keyof typeof S] ?? S.pending;
  return (
    <View style={st.sCard}>
      <View style={[st.sAccentBar, { backgroundColor: cfg.accent }]} />
      <View style={st.sContent}>
        <View style={st.sTopRow}>
          <TrainerAvatar trainerId={booking.trainerId} trainerName={booking.trainerName} size={44} />
          <View style={st.sInfo}>
            <Text style={st.sTrainerName}>{booking.trainerName} 트레이너</Text>
            <View style={st.sMeta}>
              <MaterialCommunityIcons name="calendar-outline" size={11} color={COLORS.textSecondary} />
              <Text style={st.sMetaText}>{parseDateLabel(booking.date)}</Text>
            </View>
            <View style={st.sMeta}>
              <MaterialCommunityIcons name="clock-outline" size={11} color={GYM} />
              <Text style={[st.sMetaText, { color: GYM, fontWeight: '700' }]}>
                {booking.startTime} – {endTime}
              </Text>
            </View>
          </View>
          <View style={[st.sBadge, { backgroundColor: cfg.bg }]}>
            <MaterialCommunityIcons name={cfg.icon as any} size={12} color={cfg.text} />
            <Text style={[st.sBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={st.sBottomRow}>
          <Text style={st.sFee}>
            {formatPrice(booking.facilityFee)}{' '}
            <Text style={st.sFeeTag}>시설료</Text>
          </Text>
          {booking.status === 'confirmed' && isToday && onQR && (
            <TouchableOpacity style={st.qrBtn} onPress={onQR} activeOpacity={0.85}>
              <MaterialCommunityIcons name="qrcode-scan" size={13} color="#fff" />
              <Text style={st.qrBtnText}>QR 입장</Text>
            </TouchableOpacity>
          )}
          {booking.status === 'confirmed' && !isToday && (
            <View style={st.confirmedTag}>
              <MaterialCommunityIcons name="check-circle-outline" size={13} color="#059669" />
              <Text style={st.confirmedTagText}>확정됨</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── PT 예약 카드 ──────────────────────────────────────────────
function PTBookingCard({ item }: { item: any }) {
  const statusColor = BOOKING_STATUS_COLORS[item.status] ?? COLORS.textSecondary;
  const daysLabel = item.schedule.daysOfWeek
    .sort((a: number, b: number) => a - b)
    .map((d: number) => DAY_LABELS[d])
    .join(' · ');
  const todaySessions = item.sessions.filter((s: any) => s.date === today && s.status === 'scheduled');
  const progress = item.totalSessions > 0 ? (1 - item.remainingSessions / item.totalSessions) : 0;
  return (
    <View style={st.ptCard}>
      <View style={[st.ptAccentBar, { backgroundColor: statusColor }]} />
      <View style={st.ptContent}>
        <View style={st.ptTopRow}>
          <View style={[st.ptAvatar, { backgroundColor: statusColor + '20' }]}>
            <Text style={[st.ptAvatarText, { color: statusColor }]}>{item.trainerName[0]}</Text>
          </View>
          <View style={st.ptInfo}>
            <View style={st.ptNameRow}>
              <Text style={st.ptMember}>{item.trainerName} 트레이너</Text>
              {todaySessions.length > 0 && (
                <View style={st.ptTodayTag}>
                  <MaterialCommunityIcons name="calendar-today" size={10} color={GYM} />
                  <Text style={st.ptTodayText}>오늘 {formatTime(todaySessions[0].startTime)}</Text>
                </View>
              )}
            </View>
            <Text style={st.ptSchedule}>매주 {daysLabel} · {formatTime(item.schedule.startTime)}</Text>
          </View>
          <View style={[st.ptStatusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[st.ptStatusText, { color: statusColor }]}>{BOOKING_STATUS_LABELS[item.status]}</Text>
          </View>
        </View>
        <View style={st.ptBottomRow}>
          <View style={st.ptProgressBar}>
            <View style={[st.ptProgressFill, { width: `${Math.min(progress * 100, 100)}%` as any, backgroundColor: statusColor }]} />
          </View>
          <View style={st.ptSessionRow}>
            <Text style={st.ptSessionText}>잔여 {item.remainingSessions}/{item.totalSessions}회</Text>
            <Text style={st.ptAmount}>{formatPrice(item.totalAmount)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// Step 2: 트레이너 상세 바텀시트
// ════════════════════════════════════════════════════════════
function TrainerDetailSheet({ booking, onClose, onApprove, onReject }: {
  booking: SlotBooking | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (!booking) return null;
  const trainer = MOCK_TRAINERS.find((t) => t.id === booking.trainerId);
  const endTime = addMinutes(booking.startTime, 30);

  return (
    <Modal visible={!!booking} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.sheetOverlay} activeOpacity={1} onPress={onClose} />
      <View style={st.sheet}>
        <View style={st.sheetHandle} />

        <View style={st.sheetStepRow}>
          <View style={st.sheetStepBadge}>
            <MaterialCommunityIcons name="magnify" size={12} color={GYM} />
            <Text style={st.sheetStepText}>Step 2  예약 요청 상세 확인</Text>
          </View>
        </View>

        <View style={st.sheetTrainerRow}>
          <TrainerAvatar trainerId={booking.trainerId} trainerName={booking.trainerName} size={66} />
          <View style={st.sheetTrainerInfo}>
            <Text style={st.sheetTrainerName}>{booking.trainerName} 트레이너</Text>
            {trainer && (
              <>
                <StarRating rating={trainer.rating} reviewCount={trainer.reviewCount} size="small" />
                <Text style={st.sheetSpec} numberOfLines={1}>
                  {trainer.specializations?.slice(0, 3).join(' · ') ?? ''}
                </Text>
              </>
            )}
          </View>
          {trainer && (
            <View style={st.sheetExpBadge}>
              <Text style={st.sheetExpText}>{trainer.experienceYears}년</Text>
              <Text style={st.sheetExpLabel}>경력</Text>
            </View>
          )}
        </View>

        <View style={st.sheetSummaryCard}>
          <View style={st.sheetSummaryTitleRow}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={14} color={COLORS.text} />
            <Text style={st.sheetSummaryTitle}>예약 요청 내용</Text>
          </View>
          <View style={st.sheetRow}>
            <Text style={st.sheetRowLabel}>날짜</Text>
            <Text style={st.sheetRowValue}>{parseDateLabel(booking.date)}</Text>
          </View>
          <View style={st.sheetDivider} />
          <View style={st.sheetRow}>
            <Text style={st.sheetRowLabel}>이용 시간</Text>
            <Text style={st.sheetRowValue}>{booking.startTime} ~ {endTime}</Text>
          </View>
          <View style={st.sheetDivider} />
          <View style={st.sheetRow}>
            <Text style={st.sheetRowLabel}>시설 이용료</Text>
            <Text style={[st.sheetRowValue, { color: GYM, fontWeight: '800' }]}>
              {formatPrice(booking.facilityFee)}
            </Text>
          </View>
        </View>

        {trainer && (
          <View style={st.revenuePreview}>
            <View style={st.revenuePreviewTitleRow}>
              <MaterialCommunityIcons name="account-details" size={14} color={GYM} />
              <Text style={st.revenuePreviewTitle}>트레이너 현황</Text>
            </View>
            <View style={st.revenueStats}>
              {[
                { num: `⭐ ${trainer.rating.toFixed(1)}`, label: '평점' },
                { num: `${trainer.experienceYears}년`, label: '경력' },
                { num: `${trainer.totalSessions}회`, label: '누적 세션' },
                { num: formatPrice(trainer.sessionPrice), label: 'PT 단가' },
              ].map((s, i, arr) => (
                <React.Fragment key={s.label}>
                  <View style={st.revenueStat}>
                    <Text style={st.revenueStatNum}>{s.num}</Text>
                    <Text style={st.revenueStatLabel}>{s.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={st.revenueStatDivider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        <View style={st.sheetBtns}>
          <TouchableOpacity style={st.sheetRejectBtn} onPress={onReject} activeOpacity={0.8}>
            <MaterialCommunityIcons name="close" size={16} color={COLORS.error} />
            <Text style={st.sheetRejectText}>거부하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.sheetApproveBtn} onPress={onApprove} activeOpacity={0.85}>
            <MaterialCommunityIcons name="check" size={16} color="#fff" />
            <Text style={st.sheetApproveText}>승인하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// Step 3: 처리 확인 모달
// ════════════════════════════════════════════════════════════
function ConfirmActionModal({ action, booking, onConfirm, onCancel }: {
  action: 'approve' | 'reject' | null;
  booking: SlotBooking | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!action || !booking) return null;
  const endTime = addMinutes(booking.startTime, 30);
  const isApprove = action === 'approve';

  return (
    <Modal visible={!!action} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={st.confirmOverlay}>
        <View style={st.confirmModal}>
          <View style={st.confirmStepRow}>
            <View style={st.confirmStepBadge}>
              <Text style={st.confirmStepText}>Step 3  승인/거부 처리</Text>
            </View>
          </View>

          <View style={[st.confirmIcon, { backgroundColor: isApprove ? GYM + '22' : COLORS.error + '18' }]}>
            <MaterialCommunityIcons
              name={isApprove ? 'check-circle-outline' : 'close-circle-outline'}
              size={36}
              color={isApprove ? GYM : COLORS.error}
            />
          </View>

          <Text style={st.confirmTitle}>
            {isApprove ? '예약을 승인하시겠습니까?' : '예약을 거부하시겠습니까?'}
          </Text>
          <Text style={st.confirmSub}>
            {isApprove
              ? '승인 후 트레이너에게 알림이 자동 발송됩니다.'
              : '거부 후 트레이너에게 거부 알림이 발송됩니다.'}
          </Text>

          <View style={st.confirmSummary}>
            <Text style={st.confirmSummaryTrainer}>{booking.trainerName} 트레이너</Text>
            <Text style={st.confirmSummaryDate}>{parseDateLabel(booking.date)}</Text>
            <Text style={st.confirmSummaryTime}>{booking.startTime} ~ {endTime}</Text>
            <Text style={[st.confirmSummaryFee, { color: GYM }]}>{formatPrice(booking.facilityFee)}</Text>
          </View>

          <View style={st.confirmBtnRow}>
            <TouchableOpacity style={st.confirmCancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={st.confirmCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.confirmOkBtn, { backgroundColor: isApprove ? ORANGE : COLORS.error }]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={st.confirmOkText}>{isApprove ? '승인 확정' : '거부 확정'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// Step 4: 트레이너 알림 발송 모달
// ════════════════════════════════════════════════════════════
function NotificationSentModal({ result, booking, onClose }: {
  result: 'approved' | 'rejected' | null;
  booking: SlotBooking | null;
  onClose: () => void;
}) {
  if (!result || !booking) return null;
  const endTime  = addMinutes(booking.startTime, 30);
  const approved = result === 'approved';

  return (
    <Modal visible={!!result} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.notifOverlay}>
        <View style={st.notifModal}>
          <View style={st.notifStepRow}>
            <View style={st.notifStepBadge}>
              <Text style={st.notifStepText}>Step 4  트레이너 알림 발송</Text>
            </View>
          </View>

          <View style={[st.notifCircle, {
            backgroundColor: approved ? COLORS.success : COLORS.error,
            shadowColor: approved ? COLORS.success : COLORS.error,
          }]}>
            <MaterialCommunityIcons
              name={approved ? 'check' : 'close'}
              size={36}
              color="#fff"
            />
          </View>

          <Text style={st.notifTitle}>
            {approved ? '예약 승인 완료!' : '예약 거부 완료'}
          </Text>
          <Text style={st.notifSub}>
            {approved
              ? `${booking.trainerName} 트레이너의 예약이 확정되었습니다.`
              : `${booking.trainerName} 트레이너의 예약이 거부되었습니다.`}
          </Text>

          <View style={[st.notifAlertBox, {
            borderColor: approved ? GYM + '44' : COLORS.error + '44',
            backgroundColor: approved ? GYM + '0a' : COLORS.error + '08',
          }]}>
            <MaterialCommunityIcons name="email-fast-outline" size={22} color={approved ? GYM : COLORS.error} />
            <View style={st.notifAlertText}>
              <Text style={[st.notifAlertTitle, { color: approved ? GYM : COLORS.error }]}>
                트레이너에게 알림이 발송되었습니다
              </Text>
              <Text style={st.notifAlertSub}>
                {approved
                  ? '트레이너 앱에 승인 알림과 QR 코드 안내가 전송됩니다.'
                  : '트레이너 앱에 거부 알림과 사유가 전송됩니다.'}
              </Text>
            </View>
          </View>

          <View style={st.notifSummary}>
            {[
              { label: '트레이너', value: booking.trainerName },
              { label: '날짜', value: parseDateLabel(booking.date) },
              { label: '시간', value: `${booking.startTime} ~ ${endTime}` },
              { label: '시설 이용료', value: formatPrice(booking.facilityFee), highlight: true },
            ].map((row, i, arr) => (
              <React.Fragment key={row.label}>
                <View style={st.notifSummaryRow}>
                  <Text style={st.notifSummaryLabel}>{row.label}</Text>
                  <Text style={[st.notifSummaryValue, row.highlight && { color: GYM, fontWeight: '800' }]}>
                    {row.value}
                  </Text>
                </View>
                {i < arr.length - 1 && <View style={st.notifSumDiv} />}
              </React.Fragment>
            ))}
          </View>

          <TouchableOpacity
            style={[st.notifBtn, { backgroundColor: approved ? ORANGE : COLORS.textSecondary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={st.notifBtnText}>예약 현황 보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// QR 입장 확인 모달
// ════════════════════════════════════════════════════════════
function QRVerifyModal({ booking, onClose }: { booking: SlotBooking | null; onClose: () => void }) {
  const [verified, setVerified] = useState(false);
  if (!booking) return null;
  const endTime = addMinutes(booking.startTime, 30);
  return (
    <Modal visible={!!booking} transparent animationType="slide" onRequestClose={() => { setVerified(false); onClose(); }}>
      <View style={st.qrOverlay}>
        <View style={st.qrModal}>
          <TouchableOpacity style={st.qrClose} onPress={() => { setVerified(false); onClose(); }}>
            <MaterialCommunityIcons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={st.qrModalTitle}>QR 입장 확인</Text>
          <TrainerAvatar trainerId={booking.trainerId} trainerName={booking.trainerName} size={64} />
          <Text style={st.qrTrainerName}>{booking.trainerName} 트레이너</Text>
          <View style={st.qrTimeRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.textSecondary} />
            <Text style={st.qrTime}>{booking.startTime} ~ {endTime}</Text>
          </View>
          <View style={[st.qrFrame, verified && st.qrFrameVerified]}>
            {!verified ? (
              <>
                <MaterialCommunityIcons name="qrcode-scan" size={40} color={COLORS.textMuted} />
                <Text style={st.qrScanText}>QR 스캔 대기 중</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="check-circle" size={56} color={COLORS.success} />
                <Text style={st.qrVerifiedText}>입장 확인 완료</Text>
              </>
            )}
          </View>
          <TouchableOpacity
            style={[st.verifyBtn, verified && { backgroundColor: COLORS.success }]}
            onPress={() => verified ? (setVerified(false), onClose()) : setVerified(true)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name={verified ? 'check' : 'qrcode-scan'} size={18} color="#fff" />
            <Text style={st.verifyBtnText}>{verified ? '완료' : '입장 확인'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── 일정 추가 모달 ─────────────────────────────────────────
const SLOT_TIMES   = ['06:00','07:00','08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
const MOCK_MEMBERS = ['김지수','이준혁','박소연','최민준','정유진','한서현'];

function AddScheduleModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [done, setDone] = useState(false);
  const [selMember, setSelMember] = useState('');
  const [selDate, setSelDate]     = useState('');
  const [selTime, setSelTime]     = useState('');

  const next7 = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }), []
  );

  const handleClose = () => { setDone(false); setSelMember(''); setSelDate(''); setSelTime(''); onClose(); };
  const canSubmit = !!(selMember && selDate && selTime);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={as.overlay} activeOpacity={1} onPress={handleClose} />
      <View style={as.sheet}>
        <View style={as.handle} />
        {!done ? (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={as.title}>일정 추가</Text>
            <Text style={as.label}>회원 선택</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={as.hRow}>
              {MOCK_MEMBERS.map((m) => (
                <TouchableOpacity key={m} style={[as.chip, selMember === m && as.chipOn]} onPress={() => setSelMember(selMember === m ? '' : m)}>
                  <Text style={[as.chipTxt, selMember === m && as.chipTxtOn]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={as.label}>날짜 선택</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={as.hRow}>
              {next7.map((d) => {
                const [, mm, dd] = d.split('-');
                const dow = new Date(d).getDay();
                return (
                  <TouchableOpacity key={d} style={[as.dateChip, selDate === d && as.chipOn]} onPress={() => setSelDate(selDate === d ? '' : d)}>
                    <Text style={[as.dateDow, selDate === d ? as.chipTxtOn : dow === 0 ? as.sunTxt : dow === 6 ? as.satTxt : as.secTxt]}>
                      {DAY_LABELS[dow]}
                    </Text>
                    <Text style={[as.dateNum, selDate === d && as.chipTxtOn]}>{parseInt(mm)}/{parseInt(dd)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={as.label}>시간 선택</Text>
            <View style={as.timeGrid}>
              {SLOT_TIMES.map((t) => (
                <TouchableOpacity key={t} style={[as.timeChip, selTime === t && as.chipOn]} onPress={() => setSelTime(selTime === t ? '' : t)}>
                  <Text style={[as.chipTxt, selTime === t && as.chipTxtOn]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[as.submitBtn, !canSubmit && as.submitOff]} onPress={() => { if (canSubmit) setDone(true); }} activeOpacity={canSubmit ? 0.85 : 1}>
              <Text style={as.submitTxt}>등록하기</Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        ) : (
          <View style={as.successBox}>
            <View style={as.successCircle}>
              <MaterialCommunityIcons name="check" size={36} color="#fff" />
            </View>
            <Text style={as.successTitle}>일정 등록 완료!</Text>
            <Text style={as.successSub}>{selMember} 회원의 이용 일정이 등록되었습니다.</Text>
            <View style={as.successInfo}>
              <MaterialCommunityIcons name="calendar-check" size={16} color={GYM} />
              <Text style={as.successInfoTxt}>{selDate.split('-').slice(1).join('/')}  {selTime}</Text>
            </View>
            <TouchableOpacity style={as.successBtn} onPress={handleClose} activeOpacity={0.85}>
              <Text style={as.successBtnTxt}>확인</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// 메인 화면
// ════════════════════════════════════════════════════════════
const MAIN_TABS = ['슬롯 요청', '오늘 수업', '이용중', '완료'] as const;
type MainTab = typeof MAIN_TABS[number];
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled';

const TAB_ICONS: Record<MainTab, string> = {
  '슬롯 요청': 'calendar-clock',
  '오늘 수업': 'calendar-today',
  '이용중':    'run-fast',
  '완료':      'flag-checkered',
};

export default function GymBookingsScreen() {
  const scrollRef = useRef<any>(null);
  useScrollToTop(scrollRef);
  const { gymAdmin } = useAuthStore();
  const GYM_ID = gymAdmin?.gymId ?? 'gym_001';
  const gym    = MOCK_GYMS.find((g) => g.id === GYM_ID);

  const { bookings }                               = useBookingStore();
  const { slotBookings, confirmSlot, cancelSlot }  = useGymSlotStore();
  const { addNotification } = useNotificationStore();
  useGymSlotStore((s) => s.slotBookings);

  const [mainTab,      setMainTab]      = useState<MainTab>('슬롯 요청');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // 알림(슬롯 요청)에서 진입 시 슬롯 요청 탭으로 전환하고 해당 트레이너 그룹을 잠시 강조
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const [hlTrainer, setHlTrainer] = useState<string | undefined>(highlight);
  useEffect(() => {
    setHlTrainer(highlight);
    if (!highlight) return;
    setMainTab('슬롯 요청');
    const t = setTimeout(() => setHlTrainer(undefined), 3000);
    return () => clearTimeout(t);
  }, [highlight]);
  const [qrTarget,     setQrTarget]     = useState<SlotBooking | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [batchConfirm, setBatchConfirm] = useState<{
    slots: SlotBooking[]; group: TrainerGroup; action: 'approve' | 'reject';
  } | null>(null);

  const mySlots = useMemo(() =>
    slotBookings.filter((b) => b.gymId === GYM_ID)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [slotBookings, GYM_ID]
  );

  const pendingSlots   = mySlots.filter((b) => b.status === 'pending');
  const confirmedSlots = mySlots.filter((b) => b.status === 'confirmed');
  const todayConfirmed = confirmedSlots.filter((b) => b.date === today);

  const pendingGroups = useMemo<TrainerGroup[]>(() => {
    const map = new Map<string, SlotBooking[]>();
    pendingSlots.forEach((s) => {
      const arr = map.get(s.trainerId) ?? [];
      arr.push(s);
      map.set(s.trainerId, arr);
    });
    return Array.from(map.entries()).map(([trainerId, slots]) => ({
      trainerId,
      trainerName: slots[0].trainerName,
      slots,
      totalFee: slots.reduce((sum, s) => sum + s.facilityFee, 0),
    }));
  }, [pendingSlots]);

  const handleGroupApprove = (slots: SlotBooking[], group: TrainerGroup) => {
    if (!slots.length) return;
    setBatchConfirm({ slots, group, action: 'approve' });
  };

  const handleGroupReject = (slots: SlotBooking[], group: TrainerGroup) => {
    if (!slots.length) return;
    setBatchConfirm({ slots, group, action: 'reject' });
  };

  const executeBatch = () => {
    if (!batchConfirm) return;
    const { slots, group, action } = batchConfirm;
    if (action === 'approve') {
      slots.forEach(s => confirmSlot(s.id));
      addNotification({
        type: 'slot_approved', targetRole: 'trainer', userId: group.trainerId,
        title: '슬롯 예약이 승인되었습니다',
        body: `${gym?.name ?? '헬스장'}에서 ${slots.length}개 슬롯이 승인되었습니다.`,
        meta: { slotBookingId: slots[0]?.id },
      });
    } else {
      slots.forEach(s => cancelSlot(s.id));
      addNotification({
        type: 'slot_rejected', targetRole: 'trainer', userId: group.trainerId,
        title: '슬롯 예약이 거절되었습니다',
        body: `${gym?.name ?? '헬스장'}에서 ${slots.length}개 슬롯이 거절되었습니다.`,
        meta: { slotBookingId: slots[0]?.id },
      });
    }
    setBatchConfirm(null);
  };

  const filteredSlots = useMemo(() => {
    if (statusFilter === 'all') return mySlots;
    return mySlots.filter((b) => b.status === statusFilter);
  }, [mySlots, statusFilter]);

  const filteredGroups = useMemo(() => {
    // pending은 위의 "대기 중인 요청" 섹션에 표시되므로 예약 현황에서 제외
    const base = filteredSlots.filter(s => s.status !== 'pending');
    const map = new Map<string, SlotBooking[]>();
    base.forEach(s => {
      const arr = map.get(s.trainerId) ?? [];
      arr.push(s);
      map.set(s.trainerId, arr);
    });
    return Array.from(map.entries()).map(([trainerId, slots]) => ({
      trainerId,
      trainerName: slots[0].trainerName,
      slots,
    }));
  }, [filteredSlots]);

  const allPTBookings       = bookings.filter((b) => b.status !== 'cancelled');
  const todayPTBookings     = allPTBookings.filter((b) => b.sessions.some((s) => s.date === today && s.status === 'scheduled'));
  const activePTBookings    = allPTBookings.filter((b) => b.status === 'active');
  const completedPTBookings = allPTBookings.filter((b) => b.status === 'completed');

  const filterCounts = {
    all:       mySlots.length,
    pending:   mySlots.filter((b) => b.status === 'pending').length,
    confirmed: mySlots.filter((b) => b.status === 'confirmed').length,
    cancelled: mySlots.filter((b) => b.status === 'cancelled').length,
  };

  return (
    <SafeAreaView style={st.container}>

      {/* ── 프리미엄 헤더 ── */}
      <View style={st.gymHeader}>
        <View style={st.gymHeaderTop}>
          <View style={st.gymIconBox}>
            <MaterialCommunityIcons name="dumbbell" size={20} color={GYM} />
          </View>
          <View style={st.gymHeaderTextBox}>
            <Text style={st.gymHeaderSub}>관리 중인 헬스장</Text>
            <Text style={st.gymHeaderName}>{gym?.name ?? '헬스장'}</Text>
          </View>
          <View style={st.gymHeaderDateBox}>
            <MaterialCommunityIcons name="calendar-outline" size={12} color={COLORS.textSecondary} />
            <Text style={st.gymHeaderDate}>{formatHeaderDate()}</Text>
          </View>
        </View>

        <View style={st.gymStatRow}>
          <TouchableOpacity
            style={[st.gymStatCard, { borderColor: 'rgba(245,158,11,0.25)' }]}
            onPress={() => { setMainTab('슬롯 요청'); setStatusFilter('pending'); }}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="clock-alert-outline" size={17} color="#F59E0B" />
            <Text style={[st.gymStatNum, { color: '#F59E0B' }]}>{pendingSlots.length}</Text>
            <Text style={st.gymStatLabel}>처리 대기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.gymStatCard, { borderColor: 'rgba(45,212,191,0.25)' }]}
            onPress={() => { setMainTab('슬롯 요청'); setStatusFilter('confirmed'); }}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="calendar-check-outline" size={17} color={GYM} />
            <Text style={[st.gymStatNum, { color: GYM }]}>{todayConfirmed.length}</Text>
            <Text style={st.gymStatLabel}>오늘 확정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.gymStatCard, { borderColor: 'rgba(129,140,248,0.25)' }]}
            onPress={() => setMainTab('오늘 수업')}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="human-male-board" size={17} color="#818CF8" />
            <Text style={[st.gymStatNum, { color: '#818CF8' }]}>{todayPTBookings.length}</Text>
            <Text style={st.gymStatLabel}>오늘 수업</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.gymStatCard, { borderColor: 'rgba(52,211,153,0.25)' }]}
            onPress={() => { setMainTab('슬롯 요청'); setStatusFilter('confirmed'); }}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={17} color="#34D399" />
            <Text style={[st.gymStatNum, { color: '#34D399' }]}>{confirmedSlots.length}</Text>
            <Text style={st.gymStatLabel}>승인 완료</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 대기 알림 배너 ── */}
      {pendingSlots.length > 0 && mainTab === '슬롯 요청' && (
        <TouchableOpacity
          style={st.pendingBanner}
          onPress={() => (scrollRef.current as any)?.scrollTo({ y: 0, animated: true })}
          activeOpacity={0.8}
        >
          <View style={st.pendingBannerLeft}>
            <View style={st.pendingPulse} />
            <Text style={st.pendingBannerText}>
              처리 대기 중인 예약 요청{' '}
              <Text style={st.pendingBannerCount}>{pendingSlots.length}건</Text>
            </Text>
          </View>
          <View style={st.pendingBannerRight}>
            <Text style={st.pendingBannerAction}>처리하기</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color="#D97706" />
          </View>
        </TouchableOpacity>
      )}

      {/* ── 메인 탭 ── */}
      <View style={st.tabBar}>
        {MAIN_TABS.map((tab) => {
          const badge = tab === '슬롯 요청' ? pendingSlots.length : 0;
          const active = mainTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[st.tab, active && st.tabActive]}
              onPress={() => setMainTab(tab)}
            >
              <MaterialCommunityIcons
                name={TAB_ICONS[tab] as any}
                size={15}
                color={active ? GYM : COLORS.textSecondary}
              />
              <Text style={[st.tabText, active && st.tabTextActive]}>{tab}</Text>
              {badge > 0 && (
                <View style={[st.tabBadge, active && st.tabBadgeActive]}>
                  <Text style={[st.tabBadgeText, active && st.tabBadgeTextActive]}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ════ 슬롯 요청 탭 ════ */}
      {mainTab === '슬롯 요청' && (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* 대기 섹션 - 트레이너별 그룹 */}
          {pendingGroups.length > 0 && (
            <View style={st.sectionBlock}>
              <View style={st.sectionHeader}>
                <View style={st.sectionHeaderLeft}>
                  <View style={[st.sectionIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <MaterialCommunityIcons name="clock-alert" size={14} color="#D97706" />
                  </View>
                  <Text style={st.sectionTitle}>대기 중인 요청</Text>
                </View>
                <View style={st.sectionCount}>
                  <Text style={st.sectionCountText}>{pendingSlots.length}건</Text>
                </View>
              </View>
              <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, gap: 10 }}>
                {pendingGroups.map((group) => (
                  <TrainerGroupCard
                    key={group.trainerId + '-' + group.slots.map(s => s.id).join(',')}
                    group={group}
                    highlighted={hlTrainer === group.trainerId}
                    onApprove={(slots) => handleGroupApprove(slots, group)}
                    onReject={(slots) => handleGroupReject(slots, group)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* 예약 현황 섹션 */}
          <View style={st.sectionBlock}>
            <View style={st.sectionHeader}>
              <View style={st.sectionHeaderLeft}>
                <View style={[st.sectionIconBox, { backgroundColor: GYM + '18' }]}>
                  <MaterialCommunityIcons name="format-list-bulleted" size={14} color={GYM} />
                </View>
                <Text style={st.sectionTitle}>예약 현황</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
              {([
                ['all',       '전체',    filterCounts.confirmed + filterCounts.cancelled],
                ['confirmed', '승인완료', filterCounts.confirmed],
                ['cancelled', '거부됨',  filterCounts.cancelled],
              ] as [StatusFilter, string, number][]).map(([val, label, count]) => (
                <TouchableOpacity
                  key={val}
                  style={[st.filterChip, statusFilter === val && st.filterChipActive]}
                  onPress={() => setStatusFilter(val)}
                >
                  <Text style={[st.filterChipText, statusFilter === val && st.filterChipTextActive]}>
                    {label}
                    {count > 0 && (
                      <Text style={[st.filterChipCount, statusFilter === val && st.filterChipCountActive]}>
                        {' '}{count}
                      </Text>
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 현황 카드 - 트레이너별 그룹 */}
          <View style={{ paddingHorizontal: 14, paddingTop: 10, gap: 10 }}>
            {filteredGroups.length === 0 ? (
              <View style={st.empty}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={52} color={COLORS.textMuted} />
                <Text style={st.emptyTitle}>
                  {statusFilter === 'all' ? '예약 내역이 없습니다' :
                   statusFilter === 'pending' ? '대기 중인 요청이 없습니다' :
                   statusFilter === 'confirmed' ? '승인된 예약이 없습니다' : '거부된 예약이 없습니다'}
                </Text>
              </View>
            ) : filteredGroups.map((g) => (
              <BookingGroupCard
                key={g.trainerId}
                trainerId={g.trainerId}
                trainerName={g.trainerName}
                slots={g.slots}
                onQR={(slot) => setQrTarget(slot)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* ════ 오늘 수업 ════ */}
      {mainTab === '오늘 수업' && (
        <FlatList
          ref={scrollRef}
          style={{ flex: 1 }}
          data={todayPTBookings}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <PTBookingCard item={item} />}
          contentContainerStyle={st.listPad}
          ListEmptyComponent={
            <View style={st.empty}>
              <MaterialCommunityIcons name="calendar-today" size={52} color={COLORS.textMuted} />
              <Text style={st.emptyTitle}>오늘 예정된 수업이 없습니다</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ════ 이용중 ════ */}
      {mainTab === '이용중' && (
        <FlatList
          ref={scrollRef}
          style={{ flex: 1 }}
          data={activePTBookings}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <PTBookingCard item={item} />}
          contentContainerStyle={st.listPad}
          ListEmptyComponent={
            <View style={st.empty}>
              <MaterialCommunityIcons name="run-fast" size={52} color={COLORS.textMuted} />
              <Text style={st.emptyTitle}>이용 중인 PT가 없습니다</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ════ 완료 ════ */}
      {mainTab === '완료' && (
        <FlatList
          ref={scrollRef}
          style={{ flex: 1 }}
          data={completedPTBookings}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <PTBookingCard item={item} />}
          contentContainerStyle={st.listPad}
          ListEmptyComponent={
            <View style={st.empty}>
              <MaterialCommunityIcons name="flag-checkered" size={52} color={COLORS.textMuted} />
              <Text style={st.emptyTitle}>완료된 PT가 없습니다</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={st.fab} onPress={() => setAddModalOpen(true)} activeOpacity={0.85}>
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={st.fabLabel}>일정 추가</Text>
      </TouchableOpacity>

      <AddScheduleModal visible={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <QRVerifyModal booking={qrTarget} onClose={() => setQrTarget(null)} />

      {/* ── 일괄 승인/거부 확인 모달 ── */}
      <Modal
        visible={!!batchConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setBatchConfirm(null)}
      >
        <View style={st.confirmOverlay}>
          <View style={st.confirmModal}>
            <View style={[st.confirmIcon, {
              backgroundColor: batchConfirm?.action === 'approve' ? GYM + '22' : COLORS.error + '18',
            }]}>
              <MaterialCommunityIcons
                name={batchConfirm?.action === 'approve' ? 'check-circle-outline' : 'close-circle-outline'}
                size={36}
                color={batchConfirm?.action === 'approve' ? GYM : COLORS.error}
              />
            </View>
            <Text style={st.confirmTitle}>
              {batchConfirm?.action === 'approve' ? '예약을 승인하시겠습니까?' : '예약을 거부하시겠습니까?'}
            </Text>
            <Text style={st.confirmSub}>
              {batchConfirm?.group.trainerName} 트레이너{'\n'}
              {batchConfirm?.slots.length}개 슬롯을{' '}
              {batchConfirm?.action === 'approve' ? '승인' : '거부'}합니다
            </Text>
            <View style={st.confirmBtnRow}>
              <TouchableOpacity style={st.confirmCancelBtn} onPress={() => setBatchConfirm(null)} activeOpacity={0.8}>
                <Text style={st.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.confirmOkBtn, {
                  backgroundColor: batchConfirm?.action === 'approve' ? GYM : COLORS.error,
                }]}
                onPress={executeBatch}
                activeOpacity={0.85}
              >
                <Text style={st.confirmOkText}>
                  {batchConfirm?.action === 'approve' ? '승인 확정' : '거부 확정'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════════════════════
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── 헤더 ──
  gymHeader: { backgroundColor: CARD, paddingTop: 6, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BD },
  gymHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  gymIconBox: { width: 42, height: 42, borderRadius: 13, backgroundColor: GYM + '22', alignItems: 'center', justifyContent: 'center' },
  gymHeaderTextBox: { flex: 1 },
  gymHeaderSub:  { fontSize: 11, color: SEC, fontWeight: '600', marginBottom: 2 },
  gymHeaderName: { fontSize: 18, fontWeight: '800', color: TXT },
  gymHeaderDateBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gymHeaderDate: { fontSize: 11, color: SEC, fontWeight: '500' },

  gymStatRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  gymStatCard: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', gap: 5, backgroundColor: CARD2, borderWidth: 1 },
  gymStatNum:   { fontSize: 19, fontWeight: '800' },
  gymStatLabel: { fontSize: 10, color: SEC, fontWeight: '600', textAlign: 'center' },

  // ── 배너 ──
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(245,158,11,0.14)',
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.3)',
  },
  pendingBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
  pendingBannerText:  { fontSize: 13, color: '#FCD34D', fontWeight: '600' },
  pendingBannerCount: { fontWeight: '900', color: '#FBBF24' },
  pendingBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pendingBannerAction:{ fontSize: 12, fontWeight: '700', color: '#FBBF24' },

  // ── 탭바 ──
  tabBar: { flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BD, paddingHorizontal: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 11, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: GYM },
  tabText:       { fontSize: 12, fontWeight: '600', color: SEC },
  tabTextActive: { color: GYM, fontWeight: '700' },
  tabBadge:      { backgroundColor: COLORS.error, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeActive:    { backgroundColor: GYM },
  tabBadgeText:      { fontSize: 9, color: '#fff', fontWeight: '800' },
  tabBadgeTextActive:{ color: '#fff' },

  // ── 섹션 헤더 ──
  sectionBlock: { backgroundColor: CARD, borderBottomWidth: 4, borderBottomColor: BG },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:   { fontSize: 14, fontWeight: '800', color: TXT },
  sectionCount:   { backgroundColor: GYM + '22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  sectionCountText:{ fontSize: 12, fontWeight: '700', color: GYM },

  // ── 필터 ──
  filterRow:            { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  filterChip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD2, borderWidth: 1, borderColor: BD },
  filterChipActive:     { backgroundColor: GYM, borderColor: GYM },
  filterChipText:       { fontSize: 13, fontWeight: '600', color: SEC },
  filterChipTextActive: { color: '#fff' },
  filterChipCount:      { fontWeight: '700', color: SEC },
  filterChipCountActive:{ color: 'rgba(255,255,255,0.85)' },

  listPad: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 100, gap: 10 },

  // ── 트레이너 그룹 카드 ──
  groupCard: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  groupCardHL: { borderWidth: 2, borderColor: GYM, shadowColor: GYM, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  groupAccentBar: { width: 4, backgroundColor: '#F59E0B' },
  groupInner: { flex: 1, padding: 14, gap: 12 },
  groupHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupInfo: { flex: 1, gap: 3 },
  groupTrainerName: { fontSize: 15, fontWeight: '800', color: NAVY },
  groupSpec: { fontSize: 11, color: SEC },
  groupCountBadge: { backgroundColor: 'rgba(245,158,11,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  groupCountText: { fontSize: 12, fontWeight: '800', color: '#FBBF24' },
  groupSlotList: { gap: 8 },
  groupSlotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupSlotDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BD, paddingTop: 8 },
  groupSlotDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GYM },
  groupSlotInfo: { flex: 1, gap: 1 },
  groupSlotDate: { fontSize: 11, color: SEC },
  groupSlotTime: { fontSize: 13, fontWeight: '700', color: GYM },
  groupSlotFee: { fontSize: 12, fontWeight: '700', color: TXT },
  groupTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: CARD2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  groupTotalLabel: { fontSize: 12, color: SEC },
  groupTotalFee: { fontSize: 16, fontWeight: '900', color: GYM },
  groupActions: { flexDirection: 'row', gap: 10 },
  groupRejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.error + '55', backgroundColor: COLORS.error + '12' },
  groupRejectText: { fontSize: 13, fontWeight: '700', color: '#F87171' },
  groupApproveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 16, backgroundColor: ORANGE, shadowColor: ORANGE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 },
  groupApproveText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // ── 예약 현황 그룹 카드 ──
  bgCard:      { flexDirection: 'row', backgroundColor: CARD, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 2 },
  bgAccentBar: { width: 4 },
  bgInner:     { flex: 1, padding: 13, gap: 10 },
  bgHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bgInfo:      { flex: 1, gap: 2 },
  bgName:      { fontSize: 14, fontWeight: '800', color: TXT },
  bgMeta:      { fontSize: 12, color: SEC },
  bgRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  bgRowDivider:{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BD, paddingTop: 8 },
  bgSlotInfo:  { flex: 1, gap: 1 },
  bgSlotDate:  { fontSize: 11, color: SEC },
  bgSlotTime:  { fontSize: 13, fontWeight: '700' },
  bgBadge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  bgBadgeTxt:  { fontSize: 10, fontWeight: '700' },
  bgQrBtn:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: GYM, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgQrTxt:     { fontSize: 10, fontWeight: '800', color: '#fff' },
  groupSelectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  groupSelectAllTxt: { fontSize: 11, color: SEC, fontWeight: '600' },
  cb:      { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: BD, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD2 },
  cbOn:    { backgroundColor: GYM, borderColor: GYM },
  cbMixed: { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: '#F59E0B' },
  cbDash:  { width: 8, height: 2, borderRadius: 1, backgroundColor: '#F59E0B' },

  // ── Step 1 요청 카드 ──
  reqCard: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  reqAccentBar: { width: 4, backgroundColor: '#F59E0B' },
  reqContent:   { flex: 1, padding: 14, gap: 11 },
  reqHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reqLiveDot:   { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#F59E0B' },
  reqLiveLabel: { fontSize: 12, fontWeight: '700', color: '#FCD34D', flex: 1 },
  reqWaitBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(245,158,11,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  reqWaitText:    { fontSize: 10, fontWeight: '700', color: '#FBBF24' },
  reqBodyRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reqBodyInfo:    { flex: 1, gap: 4 },
  reqTrainerName: { fontSize: 15, fontWeight: '800', color: TXT },
  reqSpec:        { fontSize: 11, color: SEC },
  reqMetaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reqMetaText:    { fontSize: 12, color: SEC },
  reqFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 11, borderTopWidth: 1, borderTopColor: BD },
  reqFeeInfo: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  reqFeeNum:  { fontSize: 16, fontWeight: '800', color: TXT },
  reqFeeTag:  { fontSize: 11, color: SEC },
  reqCTABtn:  { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: GYM + '22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  reqCTAText: { fontSize: 12, fontWeight: '700', color: GYM },

  // ── Step 5 현황 카드 ──
  sCard: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2 },
  sAccentBar: { width: 4 },
  sContent:   { flex: 1, padding: 13, gap: 10 },
  sTopRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  sInfo:      { flex: 1, gap: 4 },
  sTrainerName:{ fontSize: 14, fontWeight: '700', color: TXT },
  sMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sMetaText:  { fontSize: 11, color: SEC },
  sBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  sBadgeText: { fontSize: 11, fontWeight: '700' },
  sBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 9, borderTopWidth: 1, borderTopColor: BD },
  sFee:    { fontSize: 13, fontWeight: '700', color: TXT },
  sFeeTag: { fontSize: 11, color: SEC, fontWeight: '400' },
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: GYM, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7, shadowColor: GYM, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 3 },
  qrBtnText:     { fontSize: 12, fontWeight: '700', color: '#fff' },
  confirmedTag:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmedTagText:{ fontSize: 12, color: '#34D399', fontWeight: '600' },

  // ── PT 카드 ──
  ptCard: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2 },
  ptAccentBar: { width: 4 },
  ptContent:   { flex: 1, padding: 13, gap: 10 },
  ptTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 11 },
  ptAvatar:    { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ptAvatarText:{ fontSize: 18, fontWeight: '800' },
  ptInfo:      { flex: 1, gap: 2 },
  ptNameRow:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ptMember:    { fontSize: 15, fontWeight: '800', color: TXT },
  ptTodayTag:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: GYM + '22', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  ptTodayText: { fontSize: 10, fontWeight: '700', color: GYM },
  ptTrainer:   { fontSize: 12, color: SEC },
  ptSchedule:  { fontSize: 12, color: GYM, fontWeight: '600' },
  ptStatusBadge:{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  ptStatusText: { fontSize: 12, fontWeight: '700' },
  ptBottomRow:  { gap: 6 },
  ptProgressBar:{ height: 5, backgroundColor: BD, borderRadius: 3, overflow: 'hidden' },
  ptProgressFill:{ height: '100%', borderRadius: 3 },
  ptSessionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ptSessionText:{ fontSize: 12, color: SEC },
  ptAmount:     { fontSize: 12, fontWeight: '700', color: TXT },

  // ── 빈 상태 ──
  empty:      { alignItems: 'center', paddingVertical: 56, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: SEC },

  // ── Step 2 바텀시트 ──
  sheetOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:         { backgroundColor: CARD, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, gap: 14, paddingBottom: 36 },
  sheetHandle:   { width: 36, height: 4, backgroundColor: BD, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetStepRow:  { alignItems: 'center' },
  sheetStepBadge:{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: GYM + '22', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: GYM + '44' },
  sheetStepText: { fontSize: 12, fontWeight: '700', color: GYM },
  sheetTrainerRow:{ flexDirection: 'row', alignItems: 'center', gap: 14 },
  sheetTrainerInfo:{ flex: 1, gap: 4 },
  sheetTrainerName:{ fontSize: 18, fontWeight: '800', color: TXT },
  sheetSpec:     { fontSize: 12, color: SEC },
  sheetExpBadge: { alignItems: 'center', gap: 2 },
  sheetExpText:  { fontSize: 18, fontWeight: '800', color: GYM },
  sheetExpLabel: { fontSize: 11, color: SEC },
  sheetSummaryCard:{ backgroundColor: CARD2, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: BD },
  sheetSummaryTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sheetSummaryTitle:{ fontSize: 13, fontWeight: '700', color: TXT },
  sheetRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetRowLabel: { fontSize: 13, color: SEC },
  sheetRowValue: { fontSize: 13, color: TXT, fontWeight: '600' },
  sheetDivider:  { height: 1, backgroundColor: BD },
  revenuePreview:{ backgroundColor: GYM + '12', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: GYM + '33', gap: 10 },
  revenuePreviewTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  revenuePreviewTitle:{ fontSize: 13, fontWeight: '700', color: GYM },
  revenueStats:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  revenueStat:   { alignItems: 'center', gap: 4 },
  revenueStatNum:{ fontSize: 14, fontWeight: '800', color: TXT },
  revenueStatLabel:{ fontSize: 11, color: SEC },
  revenueStatDivider:{ width: 1, height: 28, backgroundColor: BD },
  sheetBtns:     { flexDirection: 'row', gap: 10 },
  sheetRejectBtn:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.error + '55' },
  sheetRejectText: { fontSize: 14, fontWeight: '700', color: '#F87171' },
  sheetApproveBtn:{ flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: ORANGE, paddingVertical: 15, borderRadius: 16, shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  sheetApproveText:{ fontSize: 14, fontWeight: '800', color: '#fff' },

  // ── 확인 모달 ──
  confirmOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmModal:  { backgroundColor: CARD, borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: BD },
  confirmStepRow:{ alignSelf: 'stretch', alignItems: 'center', marginBottom: 4 },
  confirmStepBadge:{ backgroundColor: GYM + '22', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: GYM + '44' },
  confirmStepText:{ fontSize: 12, fontWeight: '700', color: GYM },
  confirmIcon:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  confirmTitle:  { fontSize: 18, fontWeight: '800', color: TXT, textAlign: 'center' },
  confirmSub:    { fontSize: 13, color: SEC, textAlign: 'center', lineHeight: 18 },
  confirmSummary:{ backgroundColor: CARD2, borderRadius: 14, padding: 14, width: '100%', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: BD },
  confirmSummaryTrainer:{ fontSize: 15, fontWeight: '700', color: TXT },
  confirmSummaryDate:   { fontSize: 12, color: SEC },
  confirmSummaryTime:   { fontSize: 14, fontWeight: '700', color: GYM },
  confirmSummaryFee:    { fontSize: 14, fontWeight: '800', marginTop: 2 },
  confirmBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmCancelBtn:{ flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: CARD2, borderWidth: 1, borderColor: BD },
  confirmCancelText:{ fontSize: 14, fontWeight: '700', color: SEC },
  confirmOkBtn:  { flex: 2, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  confirmOkText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // ── 알림 모달 ──
  notifOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  notifModal:    { backgroundColor: CARD, borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: BD },
  notifStepRow:  { alignSelf: 'stretch', alignItems: 'center' },
  notifStepBadge:{ backgroundColor: GYM + '22', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: GYM + '44' },
  notifStepText: { fontSize: 12, fontWeight: '700', color: GYM },
  notifCircle:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  notifTitle:    { fontSize: 22, fontWeight: '900', color: TXT },
  notifSub:      { fontSize: 14, color: SEC, textAlign: 'center', lineHeight: 20 },
  notifAlertBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, width: '100%' },
  notifAlertText:  { flex: 1, gap: 4 },
  notifAlertTitle: { fontSize: 14, fontWeight: '700' },
  notifAlertSub:   { fontSize: 12, color: SEC, lineHeight: 17 },
  notifSummary:    { backgroundColor: CARD2, borderRadius: 14, padding: 14, width: '100%', gap: 6, borderWidth: 1, borderColor: BD },
  notifSummaryRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  notifSummaryLabel:{ fontSize: 13, color: SEC },
  notifSummaryValue:{ fontSize: 13, color: TXT, fontWeight: '600' },
  notifSumDiv:      { height: 1, backgroundColor: BD },
  notifBtn:         { width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  notifBtnText:     { color: '#fff', fontSize: 14, fontWeight: '800' },

  // ── QR 모달 ──
  qrOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  qrModal:      { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12, alignItems: 'center', position: 'relative', borderTopWidth: 1, borderTopColor: BD },
  qrClose:      { position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 15, backgroundColor: CARD2, alignItems: 'center', justifyContent: 'center' },
  qrModalTitle:  { fontSize: 17, fontWeight: '800', color: TXT, marginTop: 4 },
  qrTrainerName: { fontSize: 16, fontWeight: '700', color: TXT },
  qrTimeRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  qrTime:        { fontSize: 14, color: SEC },
  qrFrame:       { width: 200, height: 200, borderRadius: 20, borderWidth: 2.5, borderColor: GYM, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD2, gap: 8 },
  qrFrameVerified:{ borderColor: COLORS.success, backgroundColor: 'rgba(34,197,94,0.1)' },
  qrScanText:     { fontSize: 13, color: SEC, fontWeight: '600' },
  qrVerifiedText: { fontSize: 15, fontWeight: '800', color: COLORS.success },
  verifyBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: ORANGE, paddingVertical: 15, borderRadius: 16, shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  verifyBtnText:  { color: '#fff', fontSize: 15, fontWeight: '800' },

  // ── FAB ──
  fab: { position: 'absolute', bottom: 24, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ORANGE, borderRadius: 30, paddingVertical: 12, paddingHorizontal: 18, shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  fabLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const as = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:   { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '88%', borderTopWidth: 1, borderTopColor: BD },
  handle:  { width: 36, height: 4, backgroundColor: BD, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title:   { fontSize: 18, fontWeight: '800', color: TXT, marginBottom: 4 },
  label:   { fontSize: 13, fontWeight: '700', color: SEC, marginBottom: 8, marginTop: 18 },
  hRow:    { gap: 8, paddingVertical: 4 },
  chip:    { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: CARD2, borderWidth: 1, borderColor: BD },
  chipOn:  { backgroundColor: GYM, borderColor: GYM },
  chipTxt: { fontSize: 14, fontWeight: '600', color: SEC },
  chipTxtOn: { color: '#fff' },
  dateChip:  { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: CARD2, borderWidth: 1, borderColor: BD, gap: 2 },
  dateDow:   { fontSize: 11, fontWeight: '700' },
  dateNum:   { fontSize: 14, fontWeight: '700', color: TXT },
  sunTxt:    { color: '#F87171' },
  satTxt:    { color: '#60A5FA' },
  secTxt:    { color: SEC },
  timeGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip:  { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: CARD2, borderWidth: 1, borderColor: BD },
  submitBtn: { backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 24, shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  submitOff: { opacity: 0.4 },
  submitTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  successBox:    { alignItems: 'center', paddingVertical: 24, gap: 14 },
  successCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  successTitle:  { fontSize: 20, fontWeight: '800', color: TXT },
  successSub:    { fontSize: 14, color: SEC, textAlign: 'center', lineHeight: 21 },
  successInfo:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARD2, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: BD },
  successInfoTxt:{ fontSize: 14, fontWeight: '600', color: TXT },
  successBtn:    { width: '100%', backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  successBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
