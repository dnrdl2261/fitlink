import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { MOCK_GYMS } from '../../data/gyms';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { formatPrice } from '../../utils/formatters';
import { COLORS, DAY_LABELS } from '../../utils/constants';
import { SlotInfo } from '../../types';

const TRAINER_ID = 'trainer_001';
const TRAINER_NAME = '김트레이너';

function getWeekDates(): { date: string; label: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      label: DAY_LABELS[d.getDay()],
    };
  });
}

export default function TrainerSlotsScreen() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [bookingTarget, setBookingTarget] = useState<SlotInfo | null>(null);
  const [memberCount, setMemberCount] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<import('../../types').SlotBooking | null>(null);

  const { getAvailableSlots, bookSlot, cancelSlot } = useGymSlotStore();
  useGymSlotStore((s) => s.slotBookings);

  const weekDates = getWeekDates();
  const selectedGym = selectedGymId ? MOCK_GYMS.find((g) => g.id === selectedGymId) ?? null : null;
  const slots = selectedGym ? getAvailableSlots(selectedGymId!, selectedDate, TRAINER_ID) : [];

  const dayOfWeek = new Date(selectedDate).getDay();
  const hours = selectedGym?.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
  const singleFee = selectedGym?.pricing.find((p) => p.sessionType === 'single')?.facilityFee ?? 0;
  const totalFee = singleFee * memberCount;

  const openBookingModal = (slot: SlotInfo) => {
    setBookingTarget(slot);
    setMemberCount(1);
  };

  const handleConfirmBooking = () => {
    if (!bookingTarget || !selectedGym) return;
    const id = bookSlot({
      gymId: selectedGymId!,
      gymName: selectedGym.name,
      trainerId: TRAINER_ID,
      trainerName: TRAINER_NAME,
      date: selectedDate,
      startTime: bookingTarget.startTime,
      memberCount,
      facilityFee: totalFee,
    });
    setBookingTarget(null);
    if (id) {
      Alert.alert('예약 대기 중', `${bookingTarget.startTime} 슬롯이 예약 대기 상태로 등록되었습니다.\n헬스장 관리자 확정 후 예약이 완료됩니다.`);
    } else {
      Alert.alert('예약 실패', '해당 슬롯이 마감되었습니다.');
    }
  };

  const canCancel = (date: string, startTime: string): boolean => {
    const slotTime = new Date(`${date}T${startTime}:00`);
    const cutoff = new Date(slotTime.getTime() - 10 * 60 * 1000);
    return new Date() < cutoff;
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
    Alert.alert('취소 완료', '예약이 취소되었습니다.');
  };

  // ── 헬스장 목록 화면 ──────────────────────────────────
  if (!selectedGymId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>헬스장 선택</Text>
          <Text style={styles.listHeaderSub}>슬롯을 예약할 헬스장을 선택하세요</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {MOCK_GYMS.map((gym) => {
            const fee = gym.pricing.find((p) => p.sessionType === 'single')?.facilityFee ?? 0;
            const maxSlot = gym.operatingHours[0]?.maxExternalTrainers ?? 0;
            return (
              <TouchableOpacity
                key={gym.id}
                style={styles.gymCard}
                onPress={() => setSelectedGymId(gym.id)}
              >
                <View style={styles.gymCardLeft}>
                  <View style={styles.gymCardIconBox}>
                    <Text style={styles.gymCardIcon}>🏋️</Text>
                  </View>
                </View>
                <View style={styles.gymCardInfo}>
                  <Text style={styles.gymCardName}>{gym.name}</Text>
                  <Text style={styles.gymCardAddress}>{gym.address}</Text>
                  <View style={styles.gymCardMeta}>
                    <View style={styles.gymCardTag}>
                      <Text style={styles.gymCardTagText}>1회 {formatPrice(fee)}</Text>
                    </View>
                    <View style={styles.gymCardTag}>
                      <Text style={styles.gymCardTagText}>최대 {maxSlot}팀</Text>
                    </View>
                    <View style={styles.gymCardTag}>
                      <Text style={styles.gymCardTagText}>08:00 ~ 22:00</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.gymCardRight}>
                  <Text style={styles.gymCardRating}>⭐ {gym.rating.toFixed(1)}</Text>
                  <Text style={styles.gymCardArrow}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 슬롯 예약 화면 ────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더: 뒤로가기 + 헬스장명 */}
      <View style={styles.slotHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedGymId(null)}>
          <Text style={styles.backBtnText}>‹ 목록</Text>
        </TouchableOpacity>
        <Text style={styles.slotHeaderTitle} numberOfLines={1}>{selectedGym!.name}</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {/* 날짜 선택 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
        <View style={styles.dateRow}>
          {weekDates.map((d) => (
            <TouchableOpacity
              key={d.date}
              style={[styles.dateBtn, selectedDate === d.date && styles.dateBtnActive]}
              onPress={() => setSelectedDate(d.date)}
            >
              <Text style={[styles.dateLabelText, selectedDate === d.date && styles.dateTextActive]}>
                {d.label}
              </Text>
              <Text style={[styles.dateDayNum, selectedDate === d.date && styles.dateTextActive]}>
                {parseInt(d.date.slice(8, 10))}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 헬스장 정보 */}
        <View style={styles.gymInfoCard}>
          <Text style={styles.gymInfoName}>{selectedGym!.name}</Text>
          <Text style={styles.gymInfoAddress}>{selectedGym!.address}</Text>
          {hours && (
            <Text style={styles.gymInfoHours}>
              영업시간 {hours.openTime} ~ {hours.closeTime}　·　1회 이용료 {formatPrice(singleFee)}
            </Text>
          )}
        </View>

        {(!hours || !hours.ptAvailable) && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>이 날은 외부 트레이너 PT가 불가한 날입니다.</Text>
          </View>
        )}

        {hours && hours.ptAvailable && (
          <>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.legendText}>예약 가능</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
                <Text style={styles.legendText}>대기 중</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
                <Text style={styles.legendText}>확정됨</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.textSecondary }]} />
                <Text style={styles.legendText}>마감</Text>
              </View>
            </View>

            {slots.map((slot) => {
              const isMine = !!slot.myBooking;
              const isPending = slot.myBooking?.status === 'pending';
              const isConfirmed = slot.myBooking?.status === 'confirmed';
              const isFull = !slot.isAvailable && !isMine;

              const borderColor = isConfirmed
                ? COLORS.secondary + '88'
                : isPending
                ? COLORS.warning + '88'
                : isFull
                ? COLORS.border
                : COLORS.success + '44';

              const timeColor = isConfirmed
                ? COLORS.secondary
                : isPending
                ? COLORS.warning
                : isFull
                ? COLORS.textSecondary
                : COLORS.success;

              return (
                <View key={slot.startTime} style={[styles.slotCard, { borderColor, opacity: isFull ? 0.5 : 1 }]}>
                  <View style={styles.slotLeft}>
                    <Text style={[styles.slotTime, { color: timeColor }]}>
                      {slot.startTime} ~ {slot.endTime}
                    </Text>
                    <View style={styles.capacityBar}>
                      {Array.from({ length: slot.maxTrainers }).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.capacityCell,
                            i < slot.bookedCount
                              ? isMine && i === slot.bookedCount - 1
                                ? isPending
                                  ? styles.capacityCellPending
                                  : styles.capacityCellMine
                                : styles.capacityCellFilled
                              : styles.capacityCellEmpty,
                          ]}
                        />
                      ))}
                      <Text style={styles.capacityText}>{slot.bookedCount}/{slot.maxTrainers}</Text>
                    </View>
                    {isMine && (
                      <Text style={[styles.myBookingInfo, { color: timeColor }]}>
                        {slot.myBooking!.memberCount}명 · {formatPrice(slot.myBooking!.facilityFee)}
                        {isPending ? '  (대기 중)' : '  (예약 확정)'}
                      </Text>
                    )}
                  </View>

                  <View style={styles.slotRight}>
                    {isMine ? (
                      <TouchableOpacity
                        style={[styles.slotBtn, styles.slotBtnCancel]}
                        onPress={() => handleCancelPress(slot.myBooking!)}
                      >
                        <Text style={styles.slotBtnCancelText}>취소</Text>
                      </TouchableOpacity>
                    ) : isFull ? (
                      <View style={[styles.slotBtn, styles.slotBtnFull]}>
                        <Text style={styles.slotBtnFullText}>마감</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.slotBtn, styles.slotBtnBook]}
                        onPress={() => openBookingModal(slot)}
                      >
                        <Text style={styles.slotBtnBookText}>예약</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* 취소 확인 모달 */}
      <Modal
        visible={!!cancelTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalBox}>
            <Text style={styles.cancelModalTitle}>예약 취소</Text>
            <Text style={styles.cancelModalMsg}>정말 취소하시겠습니까?</Text>
            {cancelTarget && (
              <View style={styles.cancelModalInfo}>
                <Text style={styles.cancelModalInfoText}>{cancelTarget.gymName}</Text>
                <Text style={styles.cancelModalInfoText}>
                  {cancelTarget.date}  {cancelTarget.startTime}
                </Text>
                <Text style={styles.cancelModalInfoText}>
                  회원 {cancelTarget.memberCount}명 · {formatPrice(cancelTarget.facilityFee)}
                </Text>
              </View>
            )}
            <View style={styles.cancelModalBtnRow}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, styles.cancelModalBtnNo]}
                onPress={() => setCancelTarget(null)}
              >
                <Text style={styles.cancelModalBtnNoText}>아니오</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelModalBtn, styles.cancelModalBtnYes]}
                onPress={handleCancelConfirm}
              >
                <Text style={styles.cancelModalBtnYesText}>취소하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 예약 모달 */}
      <Modal
        visible={!!bookingTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>예약 하기</Text>

            {bookingTarget && (
              <>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalGymName}>{selectedGym!.name}</Text>
                  <Text style={styles.modalDate}>{selectedDate}</Text>
                </View>
                <View style={styles.modalTimeBox}>
                  <Text style={styles.modalTimeText}>
                    {bookingTarget.startTime} ~ {bookingTarget.endTime}
                  </Text>
                </View>

                <Text style={styles.modalLabel}>함께하는 회원 수</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setMemberCount((c) => Math.max(1, c - 1))}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{memberCount}명</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setMemberCount((c) => Math.min(10, c + 1))}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.feeBox}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>1회 시설 이용료</Text>
                    <Text style={styles.feeValue}>{formatPrice(singleFee)}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>인원</Text>
                    <Text style={styles.feeValue}>{memberCount}명</Text>
                  </View>
                  <View style={[styles.feeRow, styles.feeTotalRow]}>
                    <Text style={styles.feeTotalLabel}>총 이용료</Text>
                    <Text style={styles.feeTotalValue}>{formatPrice(totalFee)}</Text>
                  </View>
                </View>

                <Text style={styles.modalNote}>
                  * 예약 후 헬스장 관리자 확정 시 예약이 완료됩니다.
                </Text>

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                    onPress={() => setBookingTarget(null)}
                  >
                    <Text style={styles.modalBtnCancelText}>닫기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnConfirm]}
                    onPress={handleConfirmBooking}
                  >
                    <Text style={styles.modalBtnConfirmText}>예약 신청</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // 헬스장 목록
  listHeader: {
    padding: 20, backgroundColor: COLORS.secondary,
  },
  listHeaderTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  listHeaderSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  listContent: { padding: 16, gap: 12, paddingBottom: 40 },
  gymCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  gymCardLeft: {},
  gymCardIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: COLORS.secondary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  gymCardIcon: { fontSize: 26 },
  gymCardInfo: { flex: 1, gap: 6 },
  gymCardName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  gymCardAddress: { fontSize: 12, color: COLORS.textSecondary },
  gymCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gymCardTag: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  gymCardTagText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  gymCardRight: { alignItems: 'flex-end', gap: 8 },
  gymCardRating: { fontSize: 13, fontWeight: '700', color: COLORS.warning },
  gymCardArrow: { fontSize: 22, color: COLORS.textSecondary, fontWeight: '300' },

  // 슬롯 화면 헤더
  slotHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  backBtnText: { fontSize: 15, color: COLORS.secondary, fontWeight: '700' },
  slotHeaderTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.text },
  backBtnPlaceholder: { width: 52 },

  dateScroll: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dateRow: { flexDirection: 'row', padding: 10, gap: 8 },
  dateBtn: {
    width: 52, height: 64, borderRadius: 14, alignItems: 'center',
    justifyContent: 'center', backgroundColor: COLORS.background, gap: 2,
  },
  dateBtnActive: { backgroundColor: COLORS.secondary },
  dateLabelText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  dateDayNum: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  dateTextActive: { color: '#fff' },

  content: { padding: 14, gap: 10, paddingBottom: 40 },

  gymInfoCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  gymInfoName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  gymInfoAddress: { fontSize: 12, color: COLORS.textSecondary },
  gymInfoHours: { fontSize: 12, color: COLORS.secondary, fontWeight: '600', marginTop: 2 },

  emptyBox: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },

  legendRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 4, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.textSecondary },

  slotCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1,
  },
  slotLeft: { flex: 1, gap: 6 },
  slotTime: { fontSize: 15, fontWeight: '700' },
  capacityBar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  capacityCell: { width: 18, height: 8, borderRadius: 4 },
  capacityCellEmpty: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  capacityCellFilled: { backgroundColor: COLORS.textSecondary },
  capacityCellPending: { backgroundColor: COLORS.warning },
  capacityCellMine: { backgroundColor: COLORS.secondary },
  capacityText: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 4 },
  myBookingInfo: { fontSize: 12, fontWeight: '600' },

  slotRight: { marginLeft: 12 },
  slotBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 60, alignItems: 'center' },
  slotBtnBook: { backgroundColor: COLORS.success },
  slotBtnBookText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  slotBtnCancel: { borderWidth: 1, borderColor: COLORS.secondary },
  slotBtnCancelText: { color: COLORS.secondary, fontWeight: '700', fontSize: 13 },
  slotBtnFull: { backgroundColor: COLORS.surfaceElevated },
  slotBtnFullText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },

  // 취소 확인 모달
  cancelModalBox: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 24, width: '100%', maxWidth: 340, gap: 14,
  },
  cancelModalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  cancelModalMsg: { fontSize: 15, color: COLORS.text, textAlign: 'center' },
  cancelModalInfo: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 12, padding: 14, gap: 4,
  },
  cancelModalInfoText: { fontSize: 13, color: COLORS.textSecondary },
  cancelModalBtnRow: { flexDirection: 'row', gap: 10 },
  cancelModalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelModalBtnNo: { backgroundColor: COLORS.surfaceElevated },
  cancelModalBtnNoText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  cancelModalBtnYes: { backgroundColor: COLORS.error },
  cancelModalBtnYesText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  modalInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalGymName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  modalDate: { fontSize: 13, color: COLORS.textSecondary },
  modalTimeBox: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 12, padding: 14,
    alignItems: 'center',
  },
  modalTimeText: { fontSize: 22, fontWeight: '800', color: COLORS.secondary },
  modalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  stepperBtnText: { fontSize: 22, color: COLORS.secondary, fontWeight: '700', lineHeight: 26 },
  stepperValue: { fontSize: 24, fontWeight: '800', color: COLORS.text, minWidth: 60, textAlign: 'center' },
  feeBox: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 12, padding: 14, gap: 8,
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { fontSize: 13, color: COLORS.textSecondary },
  feeValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  feeTotalRow: {
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 4,
  },
  feeTotalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  feeTotalValue: { fontSize: 17, fontWeight: '800', color: COLORS.secondary },
  modalNote: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  modalBtnRow: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: COLORS.surfaceElevated },
  modalBtnCancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  modalBtnConfirm: { backgroundColor: COLORS.secondary },
  modalBtnConfirmText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
