import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import { useTrainerSlotStore } from '../../store/trainerSlotStore';
import { MOCK_GYMS } from '../../data/gyms';
import { formatPrice } from '../../utils/formatters';

const ACCENT = COLORS.secondary;

const DURATIONS = [
  { label: '30분', minutes: 30 },
  { label: '1시간', minutes: 60 },
  { label: '1시간 30분', minutes: 90 },
  { label: '2시간', minutes: 120 },
];

function getNext60Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 60; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  }
  return days;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const START_TIMES: string[] = [];
for (let h = 7; h <= 21; h++) {
  START_TIMES.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 21) START_TIMES.push(`${String(h).padStart(2, '0')}:30`);
}

const DAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

export default function SlotAddScreen() {
  const { date: paramDate } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();
  const { trainer } = useAuthStore();
  const { addSlot } = useTrainerSlotStore();

  const days = useMemo(() => getNext60Days(), []);
  const partnerGyms = useMemo(() =>
    MOCK_GYMS.filter((g) => trainer?.partnerGymIds.includes(g.id)),
    [trainer]
  );

  const [selectedDate, setSelectedDate] = useState(paramDate ?? days[0]);
  const [selectedGymId, setSelectedGymId] = useState('');
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [feeText, setFeeText] = useState(String(trainer?.sessionPrice ?? 80000));
  const [notes, setNotes] = useState('');

  const selectedGym = partnerGyms.find((g) => g.id === selectedGymId);
  const facilityFee = selectedGym?.pricing.find((p) => p.sessionType === 'single')?.facilityFee ?? 0;
  const trainerFee = parseInt(feeText.replace(/[^0-9]/g, '')) || 0;
  const endTime = selectedStartTime ? addMinutes(selectedStartTime, selectedDuration) : '';

  const canSubmit = selectedDate && selectedGymId && selectedStartTime && trainerFee > 0;

  const handleSubmit = () => {
    if (!trainer || !canSubmit) return;
    const msg = `${selectedDate} ${selectedStartTime}~${endTime}\n${selectedGym?.name}\nPT비용: ${formatPrice(trainerFee)}\n시설료: ${formatPrice(facilityFee)}`;

    if (Platform.OS === 'web') {
      if (!window.confirm(`슬롯을 등록하시겠습니까?\n\n${msg}`)) return;
      doAdd();
    } else {
      Alert.alert('슬롯 등록', `슬롯을 등록하시겠습니까?\n\n${msg}`, [
        { text: '취소', style: 'cancel' },
        { text: '등록', onPress: doAdd },
      ]);
    }
  };

  const doAdd = () => {
    if (!trainer || !selectedGym) return;
    addSlot({
      trainerId: trainer.id,
      trainerName: trainer.name,
      gymId: selectedGym.id,
      gymName: selectedGym.name,
      date: selectedDate,
      startTime: selectedStartTime,
      endTime,
      trainerFee,
      facilityFee,
      notes: notes.trim() || undefined,
    });
    router.navigate('/(trainer)/schedule' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate('/(trainer)/schedule' as any)} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PT 슬롯 등록</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* 날짜 */}
        <Text style={styles.sectionTitle}>날짜 선택</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          <View style={styles.dateRow}>
            {days.map((d) => {
              const dow = new Date(d).getDay();
              const day = parseInt(d.slice(8));
              const month = parseInt(d.slice(5, 7));
              const isSelected = selectedDate === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  onPress={() => setSelectedDate(d)}
                >
                  <Text style={[styles.dateChipDow, isSelected && styles.dateChipTextActive, dow === 0 && !isSelected && { color: COLORS.error }]}>
                    {DAY_SHORT[dow]}
                  </Text>
                  <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextActive]}>
                    {day}
                  </Text>
                  <Text style={[styles.dateChipMonth, isSelected && styles.dateChipTextActive]}>
                    {month}월
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* 헬스장 */}
        <Text style={styles.sectionTitle}>헬스장 선택</Text>
        {partnerGyms.length === 0 ? (
          <View style={styles.emptyGym}>
            <Text style={styles.emptyGymText}>등록된 파트너 헬스장이 없습니다.</Text>
          </View>
        ) : (
          partnerGyms.map((gym) => {
            const fee = gym.pricing.find((p) => p.sessionType === 'single')?.facilityFee ?? 0;
            const isSelected = selectedGymId === gym.id;
            return (
              <TouchableOpacity
                key={gym.id}
                style={[styles.gymCard, isSelected && styles.gymCardActive]}
                onPress={() => setSelectedGymId(gym.id)}
              >
                <View style={styles.gymCardContent}>
                  <Text style={styles.gymName}>{gym.name}</Text>
                  <Text style={styles.gymSub}>{gym.address}</Text>
                  <Text style={[styles.gymFee, { color: ACCENT }]}>시설이용료 {formatPrice(fee)}/회</Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={ACCENT} />
                )}
              </TouchableOpacity>
            );
          })
        )}

        {/* 시작 시간 */}
        <Text style={styles.sectionTitle}>시작 시간</Text>
        <View style={styles.timeGrid}>
          {START_TIMES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.timeChip, selectedStartTime === t && styles.timeChipActive]}
              onPress={() => setSelectedStartTime(t)}
            >
              <Text style={[styles.timeChipText, selectedStartTime === t && styles.timeChipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 진행 시간 */}
        <Text style={styles.sectionTitle}>진행 시간</Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d.minutes}
              style={[styles.durationChip, selectedDuration === d.minutes && styles.durationChipActive]}
              onPress={() => setSelectedDuration(d.minutes)}
            >
              <Text style={[styles.durationText, selectedDuration === d.minutes && styles.durationTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedStartTime ? (
          <Text style={styles.timePreview}>
            {selectedStartTime} ~ {endTime}
          </Text>
        ) : null}

        {/* PT 비용 */}
        <Text style={styles.sectionTitle}>PT 비용 (회원 부담)</Text>
        <View style={styles.feeInputRow}>
          <TextInput
            style={styles.feeInput}
            value={feeText}
            onChangeText={setFeeText}
            keyboardType="numeric"
            placeholder="PT 비용 입력"
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={styles.feeUnit}>원</Text>
        </View>
        {selectedGymId ? (
          <Text style={styles.feeSummary}>
            시설이용료 {formatPrice(facilityFee)} + PT비용 {formatPrice(trainerFee)} = 회원 부담 {formatPrice(facilityFee + trainerFee)}
          </Text>
        ) : null}

        {/* 메모 */}
        <Text style={styles.sectionTitle}>메모 (선택)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="회원에게 전달할 메시지 (예: 초보자 환영, 체성분 분석 포함)"
          placeholderTextColor={COLORS.textSecondary}
          multiline
          numberOfLines={3}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.submitBtnText}>슬롯 등록하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  content: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 10 },

  dateScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  dateRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  dateChip: {
    width: 56, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.surface, alignItems: 'center', gap: 2,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  dateChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dateChipDow: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  dateChipDay: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  dateChipMonth: { fontSize: 10, color: COLORS.textSecondary },
  dateChipTextActive: { color: '#fff' },

  emptyGym: { padding: 20, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12 },
  emptyGymText: { fontSize: 14, color: COLORS.textSecondary },

  gymCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 2, borderColor: COLORS.border,
  },
  gymCardActive: { borderColor: ACCENT, backgroundColor: ACCENT + '10' },
  gymCardContent: { flex: 1 },
  gymName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  gymSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  gymFee: { fontSize: 13, fontWeight: '600', marginTop: 4 },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5,
    borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  timeChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  timeChipText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  timeChipTextActive: { color: '#fff' },

  durationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  durationChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  durationChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  durationText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  durationTextActive: { color: '#fff' },

  timePreview: {
    marginTop: 10, fontSize: 15, fontWeight: '700',
    color: ACCENT, textAlign: 'center',
  },

  feeInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  feeInput: {
    flex: 1, height: 48,
    fontSize: 18, fontWeight: '700', color: COLORS.text,
  },
  feeUnit: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  feeSummary: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },

  notesInput: {
    backgroundColor: COLORS.surface, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 14, fontSize: 14, color: COLORS.text,
    minHeight: 80, textAlignVertical: 'top',
  },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  submitBtn: {
    backgroundColor: ACCENT, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: COLORS.border },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
