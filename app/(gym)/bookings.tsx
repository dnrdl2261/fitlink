import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBookingStore } from '../../store/bookingStore';
import { formatTime, formatPrice } from '../../utils/formatters';
import { COLORS, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../utils/constants';
import { BookingStatus } from '../../types';

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'confirmed', label: '확정' },
  { key: 'completed', label: '완료' },
];

export default function GymBookingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const { bookings, updateStatus } = useBookingStore();

  const gymBookings = bookings
    .filter((b) => b.gymId === 'gym_001')
    .filter((b) => activeTab === 'all' || b.status === activeTab)
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

  const handleApprove = (bookingId: string) => {
    Alert.alert('예약 확정', '예약을 확정하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '확정', onPress: () => updateStatus(bookingId, 'confirmed') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={gymBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const statusColor = BOOKING_STATUS_COLORS[item.status];
          return (
            <View style={styles.bookingCard}>
              <View style={styles.cardHeader}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateMonth}>{item.sessionDate.slice(5, 7)}월</Text>
                  <Text style={styles.dateDay}>{item.sessionDate.slice(8, 10)}</Text>
                </View>
                <View style={styles.bookingInfo}>
                  <Text style={styles.memberName}>{item.memberName} 회원</Text>
                  <Text style={styles.trainerName}>{item.trainerName} 트레이너</Text>
                  <Text style={styles.timeText}>{formatTime(item.startTime)} (1시간)</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '25' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {BOOKING_STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.facilityFee}>
                  시설이용료 {formatPrice(item.payment.facilityFee)}
                </Text>
                {item.status === 'pending' && (
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item.id)}>
                    <Text style={styles.approveBtnText}>확정하기</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListHeaderComponent={
          <Text style={styles.resultCount}>{gymBookings.length}건의 예약</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>해당 조건의 예약이 없습니다</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tabActive: { backgroundColor: COLORS.gym, borderColor: COLORS.gym },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  resultCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listContent: { paddingBottom: 20 },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },
  dateBox: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: { fontSize: 11, color: COLORS.gym },
  dateDay: { fontSize: 22, fontWeight: '800', color: COLORS.gym },
  bookingInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  trainerName: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  timeText: { fontSize: 12, color: COLORS.gym, fontWeight: '600', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  facilityFee: { fontSize: 13, color: COLORS.textSecondary },
  approveBtn: {
    backgroundColor: COLORS.gym,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
