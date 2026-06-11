import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MOCK_TRAINERS } from '../../data/trainers';
import { useBookingStore, calcEndTime } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDate, formatTime } from '../../utils/formatters';

const D = {
  bg:       '#EEF2F9',
  surface:  '#FFFFFF',
  primary:  '#4F63F5',
  primaryGlow: 'rgba(79,99,245,0.12)',
  teal:     '#0891B2',
  tealPale: '#E0F2FE',
  text:     '#0F172A',
  textSec:  '#64748B',
  textMuted:'#94A3B8',
  border:   '#E2E8F0',
  success:  '#10B981',
};

const DURATION = 30;
const STEP_LABELS = ['날짜 & 시간', '상담 내용', '예약 완료'];

const AM_SLOTS: string[] = [];
for (let h = 9; h <= 11; h++) {
  AM_SLOTS.push(`${String(h).padStart(2,'0')}:00`);
  AM_SLOTS.push(`${String(h).padStart(2,'0')}:30`);
}
const PM_SLOTS: string[] = [];
for (let h = 12; h <= 20; h++) {
  PM_SLOTS.push(`${String(h).padStart(2,'0')}:00`);
  if (h < 20) PM_SLOTS.push(`${String(h).padStart(2,'0')}:30`);
}

function buildCalendar(year: number, month: number): (string | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function timeLabel(t: string) {
  const [h, m] = t.split(':').map(Number);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? '오전' : '오후';
  return `${ampm} ${h12}:${String(m).padStart(2,'0')}`;
}

function timeOnly(t: string) {
  const [h, m] = t.split(':').map(Number);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2,'0')}`;
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
                  ? <MaterialCommunityIcons name="check" size={13} color="#fff" />
                  : <Text style={[s.stepNum, (active || done) && s.stepNumActive]}>{i + 1}</Text>
                }
              </View>
              <Text style={[s.stepLabel, active && s.stepLabelActive]}>{label}</Text>
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

export default function ConsultationScreen() {
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  const router = useRouter();
  const { trainer: myTrainer, member } = useAuthStore();
  const { addConsultation, isSlotTaken } = useBookingStore();
  const { addNotification } = useNotificationStore();

  const trainerData = MOCK_TRAINERS.find(t => t.id === trainerId);
  const trainer = myTrainer?.id === trainerId ? myTrainer : trainerData;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const [step, setStep]       = useState(1);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [selDate, setSelDate] = useState('');
  const [selTime, setSelTime] = useState('');
  const [notes, setNotes]     = useState('');

  const calCells = useMemo(() => buildCalendar(calYear, calMonth), [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  };

  const canStep1 = selDate !== '' && selTime !== '';

  const handleConfirm = () => {
    if (!trainer) return;
    addConsultation({
      trainerId: trainer.id,
      trainerName: trainer.name,
      date: selDate,
      startTime: selTime,
      duration: DURATION,
      notes: notes.trim() || undefined,
    });
    addNotification({
      type: 'consultation_request',
      targetRole: 'trainer',
      userId: trainer.id,
      title: '무료상담 예약이 접수되었습니다',
      body: `${member?.name ?? '회원'}님이 ${formatDate(selDate)} ${timeLabel(selTime)} 무료상담을 신청했습니다.`,
    });
    setStep(3);
  };

  if (!trainer) return null;

  return (
    <SafeAreaView style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => step > 1 ? setStep(step - 1) : router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={D.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>무료 상담 예약</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 트레이너 정보 */}
      <View style={s.trainerBar}>
        <View style={s.tealDot} />
        <Text style={s.trainerBarText}>
          <Text style={s.trainerBarName}>{trainer.name}</Text> 트레이너와의 무료상담 (30분)
        </Text>
      </View>

      {/* 스텝 인디케이터 */}
      {step < 3 && <StepIndicator step={step} />}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── STEP 1: 날짜 & 시간 ── */}
        {step === 1 && (
          <View style={s.stepContent}>
            {/* 캘린더 */}
            <View style={s.card}>
              <View style={s.calNav}>
                <TouchableOpacity onPress={prevMonth} style={s.calNavBtn}>
                  <MaterialCommunityIcons name="chevron-left" size={22} color={D.primary} />
                </TouchableOpacity>
                <Text style={s.calNavTitle}>{calYear}년 {calMonth}월</Text>
                <TouchableOpacity onPress={nextMonth} style={s.calNavBtn}>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={D.primary} />
                </TouchableOpacity>
              </View>
              <View style={s.calDowRow}>
                {['일','월','화','수','목','금','토'].map(d => (
                  <Text key={d} style={[s.calDow, d==='일' && {color:'#EF4444'}, d==='토' && {color:'#3B82F6'}]}>{d}</Text>
                ))}
              </View>
              <View style={s.calGrid}>
                {calCells.map((cell, i) => {
                  if (!cell) return <View key={i} style={s.calCell} />;
                  const isPast = cell < todayStr;
                  const isSel = cell === selDate;
                  const dow = i % 7;
                  return (
                    <TouchableOpacity
                      key={cell}
                      style={[s.calCell, isSel && s.calCellSel, isPast && s.calCellPast]}
                      onPress={() => { if (!isPast) { setSelDate(cell); setSelTime(''); } }}
                      disabled={isPast}
                    >
                      <Text style={[
                        s.calDayText,
                        isSel && s.calDayTextSel,
                        isPast && s.calDayTextPast,
                        dow === 0 && !isSel && { color: '#EF4444' },
                        dow === 6 && !isSel && { color: '#3B82F6' },
                      ]}>
                        {Number(cell.slice(8))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 시간 선택 */}
            {selDate !== '' && (
              <View style={s.card}>
                <Text style={s.cardTitle}>시간 선택</Text>
                <Text style={s.timeGroupLabel}>오전</Text>
                <View style={s.timeGrid}>
                  {AM_SLOTS.map(t => {
                    const taken = !!selDate && isSlotTaken(selDate, t, calcEndTime(t, 30));
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[s.timeChip, selTime === t && s.timeChipSel, taken && s.timeChipDisabled]}
                        onPress={() => setSelTime(t)}
                        disabled={taken}
                      >
                        <Text style={[s.timeChipText, selTime === t && s.timeChipTextSel, taken && s.timeChipTextDisabled]}>{timeOnly(t)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[s.timeGroupLabel, { marginTop: 12 }]}>오후</Text>
                <View style={s.timeGrid}>
                  {PM_SLOTS.map(t => {
                    const taken = !!selDate && isSlotTaken(selDate, t, calcEndTime(t, 30));
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[s.timeChip, selTime === t && s.timeChipSel, taken && s.timeChipDisabled]}
                        onPress={() => setSelTime(t)}
                        disabled={taken}
                      >
                        <Text style={[s.timeChipText, selTime === t && s.timeChipTextSel, taken && s.timeChipTextDisabled]}>{timeOnly(t)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── STEP 2: 상담 내용 ── */}
        {step === 2 && (
          <View style={s.stepContent}>
            {/* 선택된 일정 요약 */}
            <View style={s.summaryCard}>
              <MaterialCommunityIcons name="calendar-check" size={18} color={D.teal} />
              <Text style={s.summaryText}>
                {formatDate(selDate)}  {timeLabel(selTime)} (30분)
              </Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>상담 내용 <Text style={s.optionalLabel}>(선택)</Text></Text>
              <Text style={s.cardDesc}>
                궁금한 점이나 상담받고 싶은 내용을 미리 작성하면 더 알찬 상담이 가능합니다.
              </Text>
              <TextInput
                style={s.notesInput}
                multiline
                numberOfLines={6}
                placeholder="예) 체중감량을 목표로 하고 있어요. 주 3회 운동 가능합니다. 무릎 부상 이력이 있어서 재활 운동도 필요합니다."
                placeholderTextColor={D.textMuted}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>안내사항</Text>
              {[
                '무료 상담은 30분 간 진행됩니다.',
                '상담 후 PT 등록 여부는 자유롭게 결정하실 수 있습니다.',
                '상담 시간 변경/취소는 예약 상세에서 가능합니다.',
              ].map((rule, i) => (
                <View key={i} style={s.ruleRow}>
                  <Text style={s.ruleDot}>•</Text>
                  <Text style={s.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── STEP 3: 완료 ── */}
        {step === 3 && (
          <View style={s.doneWrap}>
            <View style={s.doneIconWrap}>
              <MaterialCommunityIcons name="chat-question-outline" size={52} color={D.teal} />
            </View>
            <Text style={s.doneTitle}>무료상담 예약 완료!</Text>
            <Text style={s.doneSub}>트레이너에게 상담 요청이 전달되었습니다.</Text>

            <View style={s.doneCard}>
              <View style={s.doneRow}>
                <Text style={s.doneRowLabel}>트레이너</Text>
                <Text style={s.doneRowValue}>{trainer.name}</Text>
              </View>
              <View style={s.doneRow}>
                <Text style={s.doneRowLabel}>일시</Text>
                <Text style={s.doneRowValue}>{formatDate(selDate)} {timeLabel(selTime)}</Text>
              </View>
              <View style={s.doneRow}>
                <Text style={s.doneRowLabel}>소요 시간</Text>
                <Text style={s.doneRowValue}>30분</Text>
              </View>
              <View style={s.doneRow}>
                <Text style={s.doneRowLabel}>비용</Text>
                <Text style={[s.doneRowValue, { color: D.teal, fontWeight: '700' }]}>무료</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.doneHomeBtn}
              onPress={() => router.navigate('/(member)/trainers' as any)}
            >
              <Text style={s.doneHomeBtnText}>트레이너 목록으로</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      {step === 1 && (
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.nextBtn, !canStep1 && s.nextBtnDisabled]}
            onPress={() => canStep1 && setStep(2)}
            disabled={!canStep1}
          >
            <Text style={s.nextBtnText}>다음</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      {step === 2 && (
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.nextBtn} onPress={handleConfirm}>
            <Text style={s.nextBtnText}>예약 확정하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: D.surface,
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: D.text },

  trainerBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.tealPale,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  tealDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: D.teal },
  trainerBarText: { fontSize: 13, color: D.teal },
  trainerBarName: { fontWeight: '700' },

  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    backgroundColor: D.surface,
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.border,
  },
  stepCircleActive: { backgroundColor: D.primary },
  stepNum: { fontSize: 12, fontWeight: '700', color: D.textMuted },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 10, color: D.textMuted, fontWeight: '500' },
  stepLabelActive: { color: D.primary, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: D.border, marginBottom: 14 },
  stepLineDone: { backgroundColor: D.primary },

  stepContent: { padding: 16, gap: 14 },

  card: {
    backgroundColor: D.surface, borderRadius: 14,
    padding: 16, gap: 10,
    borderWidth: 1, borderColor: D.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: D.text },
  cardDesc: { fontSize: 13, color: D.textSec, lineHeight: 19 },
  optionalLabel: { fontSize: 12, color: D.textMuted, fontWeight: '400' },

  // 캘린더
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calNavBtn: { padding: 4 },
  calNavTitle: { fontSize: 15, fontWeight: '700', color: D.text },
  calDowRow: { flexDirection: 'row', marginTop: 8 },
  calDow: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: D.textSec, paddingVertical: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCellSel: { backgroundColor: D.primary, borderRadius: 20 },
  calCellPast: { opacity: 0.3 },
  calDayText: { fontSize: 14, color: D.text, fontWeight: '500' },
  calDayTextSel: { color: '#fff', fontWeight: '800' },
  calDayTextPast: { color: D.textMuted },

  // 시간
  timeGroupLabel: { fontSize: 12, fontWeight: '700', color: D.textSec },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: D.border,
    backgroundColor: D.bg,
  },
  timeChipSel: { backgroundColor: D.primary, borderColor: D.primary },
  timeChipDisabled: { backgroundColor: D.border, borderColor: D.border, opacity: 0.5 },
  timeChipText: { fontSize: 13, color: D.textSec, fontWeight: '500' },
  timeChipTextSel: { color: '#fff', fontWeight: '700' },
  timeChipTextDisabled: { color: D.textMuted, textDecorationLine: 'line-through' },

  // 요약 카드
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.tealPale,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: D.teal + '30',
  },
  summaryText: { fontSize: 14, color: D.teal, fontWeight: '600' },

  // 메모
  notesInput: {
    borderWidth: 1, borderColor: D.border, borderRadius: 10,
    padding: 12, fontSize: 14, color: D.text,
    backgroundColor: D.bg, minHeight: 120, lineHeight: 21,
  },

  // 안내사항
  ruleRow: { flexDirection: 'row', gap: 6 },
  ruleDot: { fontSize: 13, color: D.teal, fontWeight: '700', lineHeight: 20 },
  ruleText: { flex: 1, fontSize: 13, color: D.textSec, lineHeight: 20 },

  // 완료
  doneWrap: { flex: 1, padding: 24, gap: 20, paddingTop: 40 },
  doneIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: D.tealPale,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },
  doneTitle: { fontSize: 22, fontWeight: '800', color: D.text, textAlign: 'center' },
  doneSub: { fontSize: 14, color: D.textSec, textAlign: 'center', marginTop: -8 },
  doneCard: {
    backgroundColor: D.surface, borderRadius: 14,
    borderWidth: 1, borderColor: D.border,
    overflow: 'hidden',
  },
  doneRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border,
  },
  doneRowLabel: { fontSize: 13, color: D.textSec },
  doneRowValue: { fontSize: 14, fontWeight: '600', color: D.text },
  doneHomeBtn: {
    backgroundColor: D.teal, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  doneHomeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // 하단
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: D.surface,
    paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: D.border,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: D.primary, borderRadius: 14, paddingVertical: 15,
  },
  nextBtnDisabled: { backgroundColor: D.border },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
