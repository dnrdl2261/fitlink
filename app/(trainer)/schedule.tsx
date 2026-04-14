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
import { useRouter } from 'expo-router';
import { useBookingStore } from '../../store/bookingStore';
import { formatTime, formatDate } from '../../utils/formatters';
import { COLORS, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../utils/constants';

function getWeekDates(): { date: string; label: string; dayOfWeek: number }[] {
  const dates = [];
  const now = new Date();
  for (let i = -1; i <= 5; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getDay();
    const labels = ['일', '월', '화', '수', '목', '금', '토'];
    dates.push({ date: dateStr, label: labels[dow], dayOfWeek: dow });
  }
  return dates;
}

export default function TrainerScheduleScreen() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const { bookings, updateStatus } = useBookingStore();

  const weekDates = getWeekDates();
  const dayBookings = bookings
    .filter((b) => b.trainerId === 'trainer_001' && b.sessionDate === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleApprove = (bookingId: string) => {
    Alert.alert('예약 확정', '이 예약을 확정하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '확정', onPress: () => updateStatus(bookingId, 'confirmed') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 주간 달력 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
        <View style={styles.weekRow}>
          {weekDates.map((d) => (
            <TouchableOpacity
              key={d.date}
              style={[
                styles.dayBtn,
                selectedDate === d.date && styles.dayBtnActive,
                d.date === today && styles.dayBtnToday,
              ]}
              onPress={() => setSelectedDate(d.date)}
            >
              <Text style={[styles.dayLabel, selectedDate === d.date && styles.dayTextActive]}>
                {d.label}
              </Text>
              <Text style={[styles.dayNum, selectedDate === d.date && styles.dayTextActive]}>
                {parseInt(d.date.slice(8, 10))}
              </Text>
              {d.date === today && <View style={styles.todayDot} />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.dateHeader}>{formatDate(selectedDate)}</Text>
        <Text style={styles.bookingCount}>{dayBookings.length}개 세션</Text>

        {dayBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏖️</Text>
            <Text style={styles.emptyText}>이 날은 예약이 없습니다</Text>
          </View>
        ) : (
          dayBookings.map((b) => {
            const statusColor = BOOKING_STATUS_COLORS[b.status];
            const endHour = parseInt(b.startTime.split(':')[0]) + 1;
            const endTime = `${String(endHour).padStart(2, '0')}:00`;

            return (
              <TouchableOpacity
                key={b.id}
                style={styles.sessionCard}
                onPress={() => router.push(`/booking/${b.id}`)}
              >
                <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
                <View style={styles.sessionContent}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTime}>
                      {formatTime(b.startTime)} ~ {formatTime(endTime)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {BOOKING_STATUS_LABELS[b.status]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.memberName}>{b.memberName} 회원</Text>
                  <Text style={styles.gymName}>{b.gymName}</Text>
                  {b.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>💬 {b.notes}</Text>
                    </View>
                  )}
                  {b.status === 'pending' && (
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(b.id)}>
                      <Text style={styles.approveBtnText}>예약 확정</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  weekScroll: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  weekRow: { flexDirection: 'row', padding: 12, gap: 8 },
  dayBtn: {
    width: 52,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    gap: 4,
  },
  dayBtnActive: { backgroundColor: COLORS.secondary },
  dayBtnToday: { borderWidth: 2, borderColor: COLORS.secondary },
  dayLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  dayNum: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  dayTextActive: { color: '#fff' },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  dateHeader: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  bookingCount: { fontSize: 13, color: COLORS.textSecondary },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBar: { width: 4 },
  sessionContent: { flex: 1, padding: 14, gap: 4 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionTime: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  memberName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  gymName: { fontSize: 13, color: COLORS.textSecondary },
  notesBox: { backgroundColor: COLORS.surfaceElevated, borderRadius: 8, padding: 8, marginTop: 4 },
  notesText: { fontSize: 12, color: COLORS.textSecondary },
  approveBtn: {
    marginTop: 8,
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
