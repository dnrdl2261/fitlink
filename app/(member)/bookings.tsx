import React, { useState, useEffect } from 'react';
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
import BookingCard from '../../components/BookingCard';
import { useBookingStore } from '../../store/bookingStore';
import { COLORS } from '../../utils/constants';
import { BookingStatus } from '../../types';

const TABS: { key: BookingStatus | 'upcoming'; label: string }[] = [
  { key: 'upcoming', label: '예정' },
  { key: 'completed', label: '완료' },
  { key: 'cancelled', label: '취소' },
];

export default function BookingsScreen() {
  const router = useRouter();
  const { bookings, cancelBooking, autoConfirmPending } = useBookingStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | BookingStatus>('upcoming');

  useEffect(() => { autoConfirmPending(); }, []);

  const myBookings = bookings.filter((b) => b.memberId === 'member_001');

  const filtered = myBookings.filter((b) => {
    if (activeTab === 'upcoming') return b.status === 'pending' || b.status === 'confirmed';
    return b.status === activeTab;
  });

  const handleCancel = (bookingId: string) => {
    Alert.alert('예약 취소', '정말 예약을 취소하시겠습니까?', [
      { text: '아니오', style: 'cancel' },
      {
        text: '취소하기',
        style: 'destructive',
        onPress: () => cancelBooking(bookingId),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 탭 */}
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
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => router.push(`/booking/${item.id}`)}
            onCancel={
              item.status === 'pending' || item.status === 'confirmed'
                ? () => handleCancel(item.id)
                : undefined
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>
              {activeTab === 'upcoming' ? '📅' : activeTab === 'completed' ? '✅' : '❌'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? '예정된 예약이 없습니다'
                : activeTab === 'completed'
                ? '완료된 세션이 없습니다'
                : '취소된 예약이 없습니다'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => router.push('/')}
              >
                <Text style={styles.bookBtnText}>헬스장 찾아보기</Text>
              </TouchableOpacity>
            )}
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
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  listContent: { paddingBottom: 20 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  bookBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
