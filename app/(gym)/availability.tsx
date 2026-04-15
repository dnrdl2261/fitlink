import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MOCK_GYMS } from '../../data/gyms';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { formatPrice } from '../../utils/formatters';
import { COLORS, DAY_LABELS } from '../../utils/constants';

const GYM_ID = 'gym_001';

export default function AvailabilityScreen() {
  const gym = MOCK_GYMS.find((g) => g.id === GYM_ID)!;
  const today = new Date().toISOString().split('T')[0];

  const [ptEnabled, setPtEnabled] = useState(
    gym.operatingHours.reduce((acc, h) => ({ ...acc, [h.dayOfWeek]: h.ptAvailable }), {} as Record<number, boolean>)
  );
  const [slotDate, setSlotDate] = useState(today);

  const { getCapacity, updateCapacity, getGymDaySlots, confirmSlot, cancelSlot } = useGymSlotStore();
  // slotBookings를 직접 구독 → 확정/거절 시 화면 즉시 갱신
  const slotBookings = useGymSlotStore((s) => s.slotBookings);

  const handleToggle = (dayOfWeek: number) => {
    const newVal = !ptEnabled[dayOfWeek];
    setPtEnabled((prev) => ({ ...prev, [dayOfWeek]: newVal }));
    Alert.alert(
      'PT 설정 변경',
      `${DAY_LABELS[dayOfWeek]}요일 PT ${newVal ? '허용' : '불허용'}으로 변경되었습니다.`
    );
  };

  const handleCapacityChange = (dayOfWeek: number, delta: number) => {
    const current = getCapacity(GYM_ID, dayOfWeek);
    const next = Math.max(0, current + delta);
    updateCapacity(GYM_ID, dayOfWeek, next);
  };

  // 슬롯 현황용 날짜 이동 (오늘 포함 7일)
  const slotWeekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const daySlots = getGymDaySlots(GYM_ID, slotDate).filter((s) => s.bookedCount > 0);
  const pendingBookings = slotBookings.filter((b) => b.gymId === GYM_ID && b.status === 'pending');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 운영 시간 + PT 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>운영 시간 및 PT 가용 설정</Text>
          <Text style={styles.sectionNote}>* 실제 운영 시간 변경은 고객센터를 통해 요청하세요</Text>
          {gym.operatingHours.map((h) => (
            <View key={h.dayOfWeek} style={styles.dayRow}>
              <Text style={styles.dayLabel}>{DAY_LABELS[h.dayOfWeek]}요일</Text>
              <Text style={styles.hourRange}>{h.openTime} ~ {h.closeTime}</Text>
              <TouchableOpacity
                style={[styles.ptToggle, ptEnabled[h.dayOfWeek] ? styles.ptToggleOn : styles.ptToggleOff]}
                onPress={() => handleToggle(h.dayOfWeek)}
              >
                <Text style={styles.ptToggleText}>
                  {ptEnabled[h.dayOfWeek] ? 'PT ON' : 'PT OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* 외부 트레이너 수용 인원 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>외부 트레이너 수용 인원 (슬롯당)</Text>
          <Text style={styles.sectionNote}>30분 슬롯마다 동시에 받을 수 있는 최대 외부 트레이너 수</Text>
          {gym.operatingHours.map((h) => {
            const cap = getCapacity(GYM_ID, h.dayOfWeek);
            return (
              <View key={h.dayOfWeek} style={styles.capacityRow}>
                <Text style={styles.dayLabel}>{DAY_LABELS[h.dayOfWeek]}요일</Text>
                {ptEnabled[h.dayOfWeek] ? (
                  <View style={styles.stepperBox}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleCapacityChange(h.dayOfWeek, -1)}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{cap}명</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleCapacityChange(h.dayOfWeek, +1)}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.ptOffNote}>PT OFF</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* 대기 중인 예약 확정 */}
        <View style={styles.section}>
          <View style={styles.pendingHeader}>
            <Text style={styles.sectionTitle}>대기 중인 예약</Text>
            {pendingBookings.length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingBookings.length}</Text>
              </View>
            )}
          </View>
          {pendingBookings.length === 0 ? (
            <Text style={styles.sectionNote}>대기 중인 예약이 없습니다.</Text>
          ) : (
            pendingBookings.map((b) => (
              <View key={b.id} style={styles.pendingCard}>
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingTrainer}>{b.trainerName}</Text>
                  <Text style={styles.pendingDetail}>
                    {b.date}  {b.startTime}  ·  {b.memberCount}명  ·  {b.facilityFee.toLocaleString('ko-KR')}원
                  </Text>
                </View>
                <View style={styles.pendingBtnRow}>
                  <TouchableOpacity
                    style={[styles.pendingBtn, styles.pendingBtnReject]}
                    onPress={() => {
                      cancelSlot(b.id);
                      Alert.alert('거절 완료', `${b.trainerName}의 예약이 거절되었습니다.`);
                    }}
                  >
                    <Text style={styles.pendingBtnRejectText}>거절</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pendingBtn, styles.pendingBtnConfirm]}
                    onPress={() => {
                      confirmSlot(b.id);
                      Alert.alert('확정 완료', `${b.trainerName}의 예약이 확정되었습니다.`);
                    }}
                  >
                    <Text style={styles.pendingBtnConfirmText}>확정</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 슬롯 예약 현황 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>슬롯 예약 현황</Text>
          {/* 날짜 선택 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotDateScroll}>
            <View style={styles.slotDateRow}>
              {slotWeekDates.map((d) => {
                const dow = new Date(d).getDay();
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.slotDateBtn, slotDate === d && styles.slotDateBtnActive]}
                    onPress={() => setSlotDate(d)}
                  >
                    <Text style={[styles.slotDateLabel, slotDate === d && styles.slotDateTextActive]}>
                      {DAY_LABELS[dow]}
                    </Text>
                    <Text style={[styles.slotDateNum, slotDate === d && styles.slotDateTextActive]}>
                      {parseInt(d.slice(8, 10))}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {daySlots.length === 0 ? (
            <Text style={styles.sectionNote}>해당 날짜에 슬롯 예약이 없습니다.</Text>
          ) : (
            daySlots.map((slot) => (
              <View key={slot.startTime} style={styles.slotRow}>
                <Text style={styles.slotTimeText}>{slot.startTime} ~ {slot.endTime}</Text>
                <View style={styles.slotCapBar}>
                  {Array.from({ length: slot.maxTrainers }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.slotCapCell,
                        i < slot.bookedCount ? styles.slotCapCellFilled : styles.slotCapCellEmpty,
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.slotCapText}>{slot.bookedCount}/{slot.maxTrainers}</Text>
              </View>
            ))
          )}
        </View>

        {/* 가격 정책 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시설 이용료 설정</Text>
          {gym.pricing.map((p) => (
            <View key={p.sessionType} style={styles.priceRow}>
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>{p.label}</Text>
                <Text style={styles.priceType}>{p.sessionType}</Text>
              </View>
              <View style={styles.priceValueBox}>
                <Text style={styles.priceValue}>{formatPrice(p.facilityFee)}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => Alert.alert('가격 수정', '가격 정책 수정은 고객센터를 통해 요청하세요.\n📞 1588-0000')}
          >
            <Text style={styles.editBtnText}>가격 수정 요청</Text>
          </TouchableOpacity>
        </View>

        {/* 시설 태그 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>등록된 시설</Text>
          <View style={styles.facilityGrid}>
            {gym.facilities.map((f) => (
              <View key={f} style={styles.facilityTag}>
                <Text style={styles.facilityText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => Alert.alert('시설 추가', '시설 정보 수정은 고객센터를 통해 요청하세요.\n📞 1588-0000')}
          >
            <Text style={styles.editBtnText}>시설 수정 요청</Text>
          </TouchableOpacity>
        </View>

        {/* 파트너 트레이너 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>파트너 트레이너 ({gym.partnerTrainerIds.length}명)</Text>
          <Text style={styles.sectionNote}>
            파트너 트레이너 추가/제거는 고객센터를 통해 요청하세요.
          </Text>
          {gym.partnerTrainerIds.map((tid) => (
            <View key={tid} style={styles.trainerRow}>
              <View style={styles.trainerAvatar}>
                <Text style={{ fontSize: 20 }}>💪</Text>
              </View>
              <Text style={styles.trainerId}>트레이너 ID: {tid}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  section: {
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  sectionNote: { fontSize: 12, color: COLORS.textSecondary },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  dayLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, width: 50 },
  hourRange: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  ptToggle: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  ptToggleOn: { backgroundColor: COLORS.gym },
  ptToggleOff: { backgroundColor: COLORS.surfaceElevated },
  ptToggleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  priceInfo: {},
  priceLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  priceType: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  priceValueBox: {
    backgroundColor: 'rgba(45,212,191,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceValue: { fontSize: 15, fontWeight: '800', color: COLORS.gym },
  editBtn: {
    borderWidth: 1,
    borderColor: COLORS.gym,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  editBtnText: { color: COLORS.gym, fontWeight: '700', fontSize: 14 },
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  facilityTag: {
    backgroundColor: 'rgba(45,212,191,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  facilityText: { fontSize: 13, color: COLORS.gym, fontWeight: '600' },
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trainerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(45,212,191,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerId: { fontSize: 14, color: COLORS.textSecondary },

  // 대기 중인 예약
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingBadge: {
    backgroundColor: COLORS.warning,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '800', color: '#000' },
  pendingCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  pendingInfo: { gap: 4 },
  pendingTrainer: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  pendingDetail: { fontSize: 12, color: COLORS.textSecondary },
  pendingBtnRow: { flexDirection: 'row', gap: 8 },
  pendingBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  pendingBtnReject: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  pendingBtnRejectText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },
  pendingBtnConfirm: { backgroundColor: COLORS.gym },
  pendingBtnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // 수용 인원 설정
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  stepperBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepperBtnText: { fontSize: 18, color: COLORS.gym, fontWeight: '700', lineHeight: 22 },
  stepperValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, minWidth: 36, textAlign: 'center' },
  ptOffNote: { marginLeft: 'auto', fontSize: 12, color: COLORS.textSecondary },

  // 슬롯 현황
  slotDateScroll: { marginBottom: 8 },
  slotDateRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  slotDateBtn: {
    width: 44,
    height: 58,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceElevated,
    gap: 2,
  },
  slotDateBtnActive: { backgroundColor: COLORS.gym },
  slotDateLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  slotDateNum: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  slotDateTextActive: { color: '#fff' },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  slotTimeText: { fontSize: 13, fontWeight: '600', color: COLORS.text, width: 110 },
  slotCapBar: { flexDirection: 'row', gap: 4, flex: 1 },
  slotCapCell: { width: 16, height: 8, borderRadius: 4 },
  slotCapCellFilled: { backgroundColor: COLORS.gym },
  slotCapCellEmpty: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  slotCapText: { fontSize: 12, color: COLORS.textSecondary, width: 36, textAlign: 'right' },
});
