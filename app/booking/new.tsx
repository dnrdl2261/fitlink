import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MOCK_TRAINERS } from '../../data/trainers';
import { MOCK_GYMS } from '../../data/gyms';
import { useBookingStore } from '../../store/bookingStore';
import { formatPrice, formatDate } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';

// 향후 14일 날짜 생성
function getNext14Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00',
];

const DAY_LABELS_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

export default function NewBookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    gymId?: string;
    gymName?: string;
    trainerId?: string;
    trainerName?: string;
  }>();

  const { addBooking } = useBookingStore();

  // 초기값 설정
  const [selectedGymId, setSelectedGymId] = useState(params.gymId ?? '');
  const [selectedTrainerId, setSelectedTrainerId] = useState(params.trainerId ?? '');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [step, setStep] = useState(1);

  const dates = useMemo(() => getNext14Days(), []);

  const selectedGym = MOCK_GYMS.find((g) => g.id === selectedGymId);
  const selectedTrainer = MOCK_TRAINERS.find((t) => t.id === selectedTrainerId);

  // 트레이너가 선택된 경우 해당 헬스장 목록 필터링
  const availableGyms = selectedTrainerId
    ? MOCK_GYMS.filter((g) => selectedTrainer?.partnerGymIds.includes(g.id))
    : MOCK_GYMS;

  const availableTrainers = selectedGymId
    ? MOCK_TRAINERS.filter((t) => t.partnerGymIds.includes(selectedGymId))
    : MOCK_TRAINERS;

  const facilityFee =
    selectedGym?.pricing.find((p) => p.sessionType === 'single')?.facilityFee ?? 0;
  const trainerFee = selectedTrainer?.sessionPrice ?? 0;
  const platformFee = Math.round((facilityFee + trainerFee) * 0.1);
  const total = facilityFee + trainerFee + platformFee;

  const canProceed =
    step === 1
      ? selectedGymId !== '' && selectedTrainerId !== ''
      : step === 2
      ? selectedDate !== '' && selectedTime !== ''
      : true;

  const handleConfirm = () => {
    if (!selectedGym || !selectedTrainer || !selectedDate || !selectedTime) return;

    const endHour = parseInt(selectedTime.split(':')[0]) + 1;
    const endTime = `${String(endHour).padStart(2, '0')}:00`;

    const bookingId = addBooking({
      trainerId: selectedTrainer.id,
      trainerName: selectedTrainer.name,
      gymId: selectedGym.id,
      gymName: selectedGym.name,
      sessionDate: selectedDate,
      startTime: selectedTime,
      endTime,
      facilityFee,
      trainerFee,
    });

    Alert.alert(
      '예약 완료! 🎉',
      `${selectedGym.name}에서\n${formatDate(selectedDate)} ${selectedTime} 예약이 접수되었습니다.\n트레이너 확인 후 확정됩니다.`,
      [
        {
          text: '예약 확인하기',
          onPress: () => router.replace(`/booking/${bookingId}`),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 스텝 표시기 */}
      <View style={styles.stepIndicator}>
        {['장소·트레이너', '날짜·시간', '결제 확인'].map((label, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepCircle, step >= i + 1 && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, step >= i + 1 && styles.stepNumActive]}>
                {i + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, step === i + 1 && styles.stepLabelActive]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Step 1: 헬스장 + 트레이너 선택 */}
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>헬스장 선택</Text>
            {availableGyms.map((gym) => (
              <TouchableOpacity
                key={gym.id}
                style={[styles.selectItem, selectedGymId === gym.id && styles.selectItemActive]}
                onPress={() => setSelectedGymId(gym.id)}
              >
                <View style={styles.selectItemContent}>
                  <Text style={styles.selectItemName}>{gym.name}</Text>
                  <Text style={styles.selectItemSub}>{gym.address}</Text>
                  <Text style={styles.selectItemPrice}>
                    시설이용료 {formatPrice(gym.pricing.find((p) => p.sessionType === 'single')?.facilityFee ?? 0)}/회
                  </Text>
                </View>
                {selectedGymId === gym.id && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}

            <Text style={[styles.stepTitle, { marginTop: 20 }]}>트레이너 선택</Text>
            {availableTrainers.map((trainer) => (
              <TouchableOpacity
                key={trainer.id}
                style={[
                  styles.selectItem,
                  selectedTrainerId === trainer.id && styles.selectItemActive,
                ]}
                onPress={() => setSelectedTrainerId(trainer.id)}
              >
                <View style={styles.selectItemContent}>
                  <Text style={styles.selectItemName}>{trainer.name} 트레이너</Text>
                  <Text style={styles.selectItemSub}>
                    {trainer.specializations.join(' · ')} | {trainer.experienceYears}년 경력
                  </Text>
                  <Text style={styles.selectItemPrice}>
                    PT비용 {formatPrice(trainer.sessionPrice)}/회
                  </Text>
                </View>
                {selectedTrainerId === trainer.id && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Step 2: 날짜 + 시간 선택 */}
        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>날짜 선택</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.dateRow}>
                {dates.map((date) => {
                  const d = new Date(date);
                  const dayOfWeek = d.getDay();
                  return (
                    <TouchableOpacity
                      key={date}
                      style={[
                        styles.dateItem,
                        selectedDate === date && styles.dateItemActive,
                        dayOfWeek === 0 && styles.dateItemSunday,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[styles.dateDow, selectedDate === date && styles.dateTextActive]}>
                        {DAY_LABELS_SHORT[dayOfWeek]}
                      </Text>
                      <Text style={[styles.dateDay, selectedDate === date && styles.dateTextActive]}>
                        {d.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={[styles.stepTitle, { marginTop: 20 }]}>시간 선택</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeItem, selectedTime === time && styles.timeItemActive]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[styles.timeText, selectedTime === time && styles.timeTextActive]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Step 3: 결제 확인 */}
        {step === 3 && selectedGym && selectedTrainer && selectedDate && selectedTime && (
          <>
            <Text style={styles.stepTitle}>예약 내용 확인</Text>
            <View style={styles.summaryCard}>
              <SummaryRow label="헬스장" value={selectedGym.name} />
              <SummaryRow label="트레이너" value={`${selectedTrainer.name} 트레이너`} />
              <SummaryRow label="날짜" value={formatDate(selectedDate)} />
              <SummaryRow
                label="시간"
                value={`${selectedTime} ~ ${String(parseInt(selectedTime.split(':')[0]) + 1).padStart(2, '0')}:00 (1시간)`}
              />
              <View style={styles.divider} />
              <SummaryRow label="헬스장 시설이용료" value={formatPrice(facilityFee)} />
              <SummaryRow label="PT 비용" value={formatPrice(trainerFee)} />
              <SummaryRow label="플랫폼 수수료 (10%)" value={formatPrice(platformFee)} />
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>총 결제 금액</Text>
                <Text style={styles.totalValue}>{formatPrice(total)}</Text>
              </View>
            </View>
            <View style={styles.paymentNotice}>
              <Text style={styles.noticeText}>
                💳 이 예약은 프로토타입입니다. 실제 결제가 발생하지 않습니다.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomBar}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backBtnText}>이전</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
          disabled={!canProceed}
          onPress={() => (step < 3 ? setStep(step + 1) : handleConfirm())}
        >
          <Text style={styles.nextBtnText}>
            {step === 3 ? '예약 확정하기 🎉' : '다음 →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: COLORS.primary },
  stepNum: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: COLORS.textSecondary },
  stepLabelActive: { color: COLORS.primary, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 100 },
  stepTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  selectItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectItemActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(124,110,232,0.15)' },
  selectItemContent: { flex: 1 },
  selectItemName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  selectItemSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  selectItemPrice: { fontSize: 13, color: COLORS.secondary, fontWeight: '600', marginTop: 4 },
  checkMark: { fontSize: 22, color: COLORS.primary, fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  dateItem: {
    width: 56,
    height: 72,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 4,
  },
  dateItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateItemSunday: { borderColor: '#FFCDD2' },
  dateDow: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  dateDay: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  dateTextActive: { color: '#fff' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeItem: {
    width: '22%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  timeItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  timeTextActive: { color: '#fff' },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary },
  summaryValue: { fontSize: 14, color: COLORS.text, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 16 },
  divider: { height: 1, backgroundColor: COLORS.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  paymentNotice: {
    marginTop: 12,
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  noticeText: { fontSize: 13, color: COLORS.success, textAlign: 'center' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  backBtnText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  nextBtn: {
    flex: 3,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: COLORS.border },
  nextBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});
