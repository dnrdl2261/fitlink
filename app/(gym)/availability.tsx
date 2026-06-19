import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { MOCK_GYMS } from '../../data/gyms';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useGymProfileStore } from '../../store/gymProfileStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, DAY_LABELS } from '../../utils/constants';
import { FacilityTag } from '../../types';

const GYM  = '#4F63F5';
const BG   = '#F1F5F9';
const CARD = '#FFFFFF';
const BD   = '#E2E8F0';

// 분 선택 목록 (5분 단위)
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export default function AvailabilityScreen() {
  const { gymAdmin } = useAuthStore();
  const GYM_ID = gymAdmin?.gymId ?? 'gym_001';
  const baseGym = MOCK_GYMS.find((g) => g.id === GYM_ID)!;
  const updateProfile = useGymProfileStore((s) => s.updateProfile);
  const gymEdits = useGymProfileStore((s) => s.edits[GYM_ID]) ?? {};
  const gym = { ...baseGym, ...gymEdits };
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  const [ptEnabled, setPtEnabled] = useState(
    gym.operatingHours.reduce((acc, h) => ({ ...acc, [h.dayOfWeek]: h.ptAvailable }), {} as Record<number, boolean>)
  );
  const [slotDate, setSlotDate] = useState(today);

  // 운영 시간 편집 상태
  const [hoursOverrides, setHoursOverrides] = useState<Record<number, { openTime: string; closeTime: string }>>(
    gym.operatingHours.reduce((acc, h) => ({
      ...acc,
      [h.dayOfWeek]: { openTime: h.openTime, closeTime: h.closeTime },
    }), {} as Record<number, { openTime: string; closeTime: string }>)
  );

  // 시간 피커 상태
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingTimeTarget, setEditingTimeTarget] = useState<{ dayOfWeek: number; field: 'openTime' | 'closeTime' } | null>(null);
  const [pickerHour, setPickerHour] = useState(0);
  const [pickerMinute, setPickerMinute] = useState(0);

  // 가격 편집 상태
  const [pricingOverrides, setPricingOverrides] = useState<Record<string, string>>(
    gym.pricing.reduce((acc, p) => ({
      ...acc,
      [p.sessionType]: String(p.facilityFee),
    }), {} as Record<string, string>)
  );

  // 시설 편집 상태
  const [facilitiesOverride, setFacilitiesOverride] = useState<string[]>(gym.facilities);
  const [newFacility, setNewFacility] = useState('');

  const { getCapacity, updateCapacity, getGymDaySlots, confirmSlot, cancelSlot } = useGymSlotStore();
  const { addNotification } = useNotificationStore();
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

  // 시간 피커 열기
  const openTimePicker = (dayOfWeek: number, field: 'openTime' | 'closeTime') => {
    const currentTime = hoursOverrides[dayOfWeek]?.[field] ?? '00:00';
    const parts = currentTime.split(':');
    const h = parseInt(parts[0]) || 0;
    const rawMin = parseInt(parts[1]) || 0;
    // 5분 단위 중 가장 가까운 값으로 스냅
    const snapped = MINUTE_OPTIONS.reduce((prev, cur) =>
      Math.abs(cur - rawMin) < Math.abs(prev - rawMin) ? cur : prev, 0
    );
    setPickerHour(Math.min(23, Math.max(0, h)));
    setPickerMinute(snapped);
    setEditingTimeTarget({ dayOfWeek, field });
    setTimePickerVisible(true);
  };

  // 시간 피커 확인
  const confirmTimePicker = () => {
    if (!editingTimeTarget) return;
    const { dayOfWeek, field } = editingTimeTarget;
    const timeStr = `${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`;
    setHoursOverrides((prev) => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], [field]: timeStr },
    }));
    setTimePickerVisible(false);
  };

  // 운영 시간 + PT 설정 저장
  const handleSaveHours = () => {
    const operatingHours = gym.operatingHours.map((h) => ({
      ...h,
      openTime: hoursOverrides[h.dayOfWeek]?.openTime ?? h.openTime,
      closeTime: hoursOverrides[h.dayOfWeek]?.closeTime ?? h.closeTime,
      ptAvailable: ptEnabled[h.dayOfWeek],
    }));
    updateProfile(GYM_ID, { operatingHours });
    Alert.alert('저장 완료', '운영 시간이 업데이트되었습니다.');
  };

  // 시설 이용료 저장
  const handleSavePricing = () => {
    const pricing = gym.pricing.map((p) => ({
      ...p,
      facilityFee: parseInt((pricingOverrides[p.sessionType] ?? '').replace(/\D/g, '')) || 0,
    }));
    updateProfile(GYM_ID, { pricing });
    Alert.alert('저장 완료', '시설 이용료가 업데이트되었습니다.');
  };

  const slotWeekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });

  const daySlots = getGymDaySlots(GYM_ID, slotDate).filter((s) => s.bookedCount > 0);
  const pendingBookings = slotBookings.filter((b) => b.gymId === GYM_ID && b.status === 'pending');

  const handleAddFacility = () => {
    const trimmed = newFacility.trim();
    if (!trimmed) return;
    if (facilitiesOverride.includes(trimmed)) {
      Alert.alert('중복', '이미 등록된 시설입니다.');
      return;
    }
    const next = [...facilitiesOverride, trimmed];
    setFacilitiesOverride(next);
    updateProfile(GYM_ID, { facilities: next as FacilityTag[] });
    setNewFacility('');
  };

  const handleRemoveFacility = (f: string) => {
    Alert.alert('시설 삭제', `'${f}'을(를) 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          const next = facilitiesOverride.filter((item) => item !== f);
          setFacilitiesOverride(next);
          updateProfile(GYM_ID, { facilities: next as FacilityTag[] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* 운영 시간 + PT 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>운영 시간 및 PT 가용 설정</Text>
          <Text style={styles.sectionNote}>* 시간 버튼을 눌러 운영 시간을 변경하세요</Text>
          {gym.operatingHours.map((h) => (
            <View key={h.dayOfWeek} style={styles.dayRow}>
              <Text style={styles.dayLabelShort}>{DAY_LABELS[h.dayOfWeek]}</Text>
              <View style={styles.timeRangeBox}>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => openTimePicker(h.dayOfWeek, 'openTime')}
                >
                  <Text style={styles.timeBtnText}>
                    {hoursOverrides[h.dayOfWeek]?.openTime ?? h.openTime}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.timeSep}>~</Text>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => openTimePicker(h.dayOfWeek, 'closeTime')}
                >
                  <Text style={styles.timeBtnText}>
                    {hoursOverrides[h.dayOfWeek]?.closeTime ?? h.closeTime}
                  </Text>
                </TouchableOpacity>
              </View>
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
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveHours}>
            <Text style={styles.saveBtnText}>운영 시간 저장</Text>
          </TouchableOpacity>
        </View>

        {/* 외부 트레이너 수용 인원 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>외부 트레이너 수용 인원 (슬롯당)</Text>
          <Text style={styles.sectionNote}>30분 슬롯마다 동시에 받을 수 있는 최대 외부 트레이너 수</Text>
          {gym.operatingHours.map((h) => {
            const cap = getCapacity(GYM_ID, h.dayOfWeek);
            return (
              <View key={h.dayOfWeek} style={styles.capacityRow}>
                <Text style={styles.dayLabelFull}>{DAY_LABELS[h.dayOfWeek]}요일</Text>
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
                <View style={styles.pendingCardBar} />
                <View style={styles.pendingCardInner}>
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
                        addNotification({
                          type: 'slot_rejected', targetRole: 'trainer', userId: b.trainerId,
                          title: '슬롯 예약이 거절되었습니다',
                          body: `${gym.name}에서 ${b.date} ${b.startTime} 슬롯 예약을 거절했습니다.`,
                          meta: { slotBookingId: b.id },
                        });
                        Alert.alert('거절 완료', `${b.trainerName}의 예약이 거절되었습니다.`);
                      }}
                    >
                      <Text style={styles.pendingBtnRejectText}>거절</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pendingBtn, styles.pendingBtnConfirm]}
                      onPress={() => {
                        confirmSlot(b.id);
                        addNotification({
                          type: 'slot_approved', targetRole: 'trainer', userId: b.trainerId,
                          title: '슬롯 예약이 승인되었습니다',
                          body: `${gym.name}에서 ${b.date} ${b.startTime} 슬롯 예약을 승인했습니다.`,
                          meta: { slotBookingId: b.id },
                        });
                        Alert.alert('확정 완료', `${b.trainerName}의 예약이 확정되었습니다.`);
                      }}
                    >
                      <Text style={styles.pendingBtnConfirmText}>확정</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 슬롯 예약 현황 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>슬롯 예약 현황</Text>
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

        {/* 가격 정책 — 인라인 편집 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시설 이용료 설정</Text>
          <Text style={styles.sectionNote}>* 세션 유형별 시설 이용료를 직접 수정할 수 있습니다</Text>
          {gym.pricing.map((p) => (
            <View key={p.sessionType} style={styles.priceRow}>
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>{p.label}</Text>
                <Text style={styles.priceType}>{p.sessionType}</Text>
              </View>
              <View style={styles.priceEditBox}>
                <TextInput
                  style={styles.priceInput}
                  value={pricingOverrides[p.sessionType] ?? String(p.facilityFee)}
                  onChangeText={(v: string) =>
                    setPricingOverrides((prev) => ({ ...prev, [p.sessionType]: v }))
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                />
                <Text style={styles.priceUnit}>원</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSavePricing}>
            <Text style={styles.saveBtnText}>가격 저장</Text>
          </TouchableOpacity>
        </View>

        {/* 시설 태그 — 추가/삭제 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>등록된 시설</Text>
          <Text style={styles.sectionNote}>* 태그를 눌러 삭제하거나 새 시설을 추가할 수 있습니다</Text>
          <View style={styles.facilityGrid}>
            {facilitiesOverride.map((f) => (
              <TouchableOpacity
                key={f}
                style={styles.facilityTagEditable}
                onPress={() => handleRemoveFacility(f)}
              >
                <Text style={styles.facilityText}>{f}</Text>
                <Text style={styles.facilityRemove}>✕</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addFacilityRow}>
            <TextInput
              style={styles.addFacilityInput}
              value={newFacility}
              onChangeText={setNewFacility}
              placeholder="새 시설 이름 입력"
              placeholderTextColor={COLORS.textSecondary}
              onSubmitEditing={handleAddFacility}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addFacilityBtn, !newFacility.trim() && styles.addFacilityBtnDisabled]}
              onPress={handleAddFacility}
              disabled={!newFacility.trim()}
            >
              <Text style={styles.addFacilityBtnText}>추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 파트너 트레이너 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>파트너 트레이너 ({gym.partnerTrainerIds.length}명)</Text>
          <Text style={styles.sectionNote}>파트너 트레이너 추가/제거는 고객센터를 통해 요청하세요.</Text>
          {gym.partnerTrainerIds.map((tid) => (
            <View key={tid} style={styles.trainerRow}>
              <View style={styles.trainerAvatar}>
                <MaterialCommunityIcons name="dumbbell" size={20} color={GYM} />
              </View>
              <Text style={styles.trainerId}>트레이너 ID: {tid}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* 시간 피커 모달 */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>시간 선택</Text>
            <View style={styles.pickerColumns}>
              {/* 시 (0~23) */}
              <View style={styles.pickerColWrap}>
                <Text style={styles.pickerColLabel}>시</Text>
                <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.pickerItem, pickerHour === i && styles.pickerItemSelected]}
                      onPress={() => setPickerHour(i)}
                    >
                      <Text style={[styles.pickerItemText, pickerHour === i && styles.pickerItemTextSelected]}>
                        {String(i).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <Text style={styles.pickerColon}>:</Text>
              {/* 분 (5분 단위) */}
              <View style={styles.pickerColWrap}>
                <Text style={styles.pickerColLabel}>분</Text>
                <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                  {MINUTE_OPTIONS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.pickerItem, pickerMinute === m && styles.pickerItemSelected]}
                      onPress={() => setPickerMinute(m)}
                    >
                      <Text style={[styles.pickerItemText, pickerMinute === m && styles.pickerItemTextSelected]}>
                        {String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={styles.pickerBtnRow}>
              <TouchableOpacity
                style={styles.pickerCancelBtn}
                onPress={() => setTimePickerVisible(false)}
              >
                <Text style={styles.pickerCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerConfirmBtn} onPress={confirmTimePicker}>
                <Text style={styles.pickerConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
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

  // 운영 시간 행
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  // 단자 (운영시간 섹션용 — 한 글자)
  dayLabelShort: { fontSize: 13, fontWeight: '700', color: COLORS.text, width: 20 },
  // 전체 요일 (수용 인원 섹션용 — "일요일" 3글자)
  dayLabelFull: { fontSize: 13, fontWeight: '700', color: COLORS.text, width: 52 },

  timeRangeBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeBtn: {
    width: 60,
    height: 34,
    borderWidth: 1.5,
    borderColor: '#5B8CFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,212,191,0.08)',
  },
  timeBtnText: { fontSize: 13, color: '#5B8CFF', fontWeight: '700' },
  timeSep: { fontSize: 13, color: COLORS.textSecondary },
  ptToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  ptToggleOn: { backgroundColor: '#5B8CFF' },
  ptToggleOff: { backgroundColor: COLORS.surfaceElevated },
  ptToggleText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // 저장 버튼
  saveBtn: {
    backgroundColor: '#5B8CFF',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // 수용 인원
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
  stepperBtnText: { fontSize: 18, color: '#5B8CFF', fontWeight: '700', lineHeight: 22 },
  stepperValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, minWidth: 36, textAlign: 'center' },
  ptOffNote: { marginLeft: 'auto', fontSize: 12, color: COLORS.textSecondary },

  // 가격 편집
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
  priceEditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(45,212,191,0.08)',
    borderWidth: 1,
    borderColor: '#5B8CFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceInput: {
    minWidth: 80,
    fontSize: 15,
    fontWeight: '800',
    color: '#5B8CFF',
    textAlign: 'right',
    paddingVertical: 2,
  },
  priceUnit: { fontSize: 13, color: '#5B8CFF', fontWeight: '600' },

  // 시설 편집
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  facilityTagEditable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(45,212,191,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  facilityText: { fontSize: 13, color: '#5B8CFF', fontWeight: '600' },
  facilityRemove: { fontSize: 11, color: '#5B8CFF', fontWeight: '800', opacity: 0.7 },
  addFacilityRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  addFacilityInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceElevated,
  },
  addFacilityBtn: {
    backgroundColor: '#5B8CFF',
    borderRadius: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFacilityBtnDisabled: { backgroundColor: COLORS.border },
  addFacilityBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // 파트너 트레이너
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
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingCardBar: { width: 4, backgroundColor: COLORS.warning },
  pendingCardInner: { flex: 1, padding: 12, gap: 10 },
  pendingInfo: { gap: 4 },
  pendingTrainer: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  pendingDetail: { fontSize: 12, color: COLORS.textSecondary },
  pendingBtnRow: { flexDirection: 'row', gap: 8 },
  pendingBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  pendingBtnReject: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  pendingBtnRejectText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },
  pendingBtnConfirm: { backgroundColor: '#5B8CFF' },
  pendingBtnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 13 },

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
  slotDateBtnActive: { backgroundColor: '#5B8CFF' },
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
  slotCapCellFilled: { backgroundColor: '#5B8CFF' },
  slotCapCellEmpty: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  slotCapText: { fontSize: 12, color: COLORS.textSecondary, width: 36, textAlign: 'right' },

  // 시간 피커 모달
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: 300,
    gap: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  pickerColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 12,
  },
  pickerColWrap: { alignItems: 'center', gap: 6 },
  pickerColLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  pickerCol: { height: 220, width: 90 },
  pickerItem: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  pickerItemSelected: { backgroundColor: '#5B8CFF' },
  pickerItemText: { fontSize: 22, fontWeight: '600', color: COLORS.text },
  pickerItemTextSelected: { color: '#fff', fontWeight: '800' },
  pickerColon: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 32,
  },
  pickerBtnRow: { flexDirection: 'row', gap: 10 },
  pickerCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerCancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  pickerConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#5B8CFF',
  },
  pickerConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
