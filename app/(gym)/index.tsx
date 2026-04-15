import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { MOCK_GYMS } from '../../data/gyms';
import { SlotBooking } from '../../types';
import { formatPrice, formatDate, formatTime } from '../../utils/formatters';
import { COLORS, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../utils/constants';

const GYM_ID = 'gym_001';

type Tab = 'today' | 'pending';

export default function GymDashboard() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { bookings } = useBookingStore();
  const { confirmSlot, cancelSlot } = useGymSlotStore();
  const slotBookings = useGymSlotStore((s) => s.slotBookings);

  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [confirmModal, setConfirmModal] = useState<{
    type: 'confirm' | 'reject';
    booking: SlotBooking;
  } | null>(null);

  const gym = MOCK_GYMS.find((g) => g.id === GYM_ID);
  const gymBookings = bookings.filter((b) => b.gymId === GYM_ID);
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = gymBookings
    .filter((b) => b.sessionDate === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const pendingSlots = slotBookings.filter((b) => b.gymId === GYM_ID && b.status === 'pending');
  const confirmedSlotsToday = slotBookings.filter(
    (b) => b.gymId === GYM_ID && b.status === 'confirmed' && b.date === today
  );
  const totalPending = pendingSlots.length + gymBookings.filter((b) => b.status === 'pending').length;

  const thisMonthRevenue = gymBookings
    .filter((b) => b.status === 'completed' && b.sessionDate.startsWith('2026-04'))
    .reduce((sum, b) => sum + Math.round(b.payment.facilityFee * 0.9), 0);

  // 매출 목록: 확정된 슬롯 예약 + 완료된 세션 예약
  const revenueItems = [
    ...slotBookings
      .filter((b) => b.gymId === GYM_ID && (b.status === 'confirmed'))
      .map((b) => ({
        id: b.id,
        date: b.date,
        time: b.startTime,
        label: `${b.trainerName} 트레이너`,
        detail: `회원 ${b.memberCount}명`,
        amount: b.facilityFee,
        type: 'slot' as const,
      })),
    ...gymBookings
      .filter((b) => b.status === 'completed')
      .map((b) => ({
        id: b.id,
        date: b.sessionDate,
        time: b.startTime,
        label: b.memberName + ' 회원',
        detail: b.trainerName + ' 트레이너',
        amount: Math.round(b.payment.facilityFee * 0.9),
        type: 'session' as const,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const handleModalConfirm = () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'confirm') {
      confirmSlot(confirmModal.booking.id);
      setConfirmModal(null);
      Alert.alert('확정 완료', `${confirmModal.booking.trainerName}의 예약이 확정되었습니다.`);
    } else {
      cancelSlot(confirmModal.booking.id);
      setConfirmModal(null);
      Alert.alert('거절 완료', `${confirmModal.booking.trainerName}의 예약이 거절되었습니다.`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: COLORS.gym }]}>
        <View>
          <Text style={styles.headerSub}>관리자</Text>
          <Text style={styles.headerGym}>{gym?.name ?? '헬스장'}</Text>
        </View>
        <TouchableOpacity onPress={() => { logout(); router.replace('/login'); }}>
          <Text style={styles.switchText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 통계 카드 — 탭 클릭으로 전환 */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { borderTopColor: COLORS.gym }, activeTab === 'today' && styles.statCardActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={styles.statEmoji}>📅</Text>
          <Text style={[styles.statNum, { color: COLORS.gym }]}>{todayBookings.length}</Text>
          <Text style={styles.statLabel}>오늘 예약</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { borderTopColor: COLORS.warning }, activeTab === 'pending' && styles.statCardActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={styles.statEmoji}>⏳</Text>
          <Text style={[styles.statNum, { color: COLORS.warning }]}>{totalPending}</Text>
          <Text style={styles.statLabel}>승인 대기</Text>
        </TouchableOpacity>

        <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
          <Text style={styles.statEmoji}>💰</Text>
          <Text style={[styles.statNum, { color: COLORS.success }]}>
            {Math.round((thisMonthRevenue || 1890000) / 10000)}만
          </Text>
          <Text style={styles.statLabel}>이번 달 매출</Text>
        </View>
      </View>

      {/* 탭 바 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            오늘 예약
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            승인 대기
          </Text>
          {totalPending > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{totalPending}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 오늘 예약 탭 */}
        {activeTab === 'today' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘 예약 일정</Text>
            {todayBookings.length === 0 && confirmedSlotsToday.length === 0 ? (
              <Text style={styles.emptyText}>오늘 예약된 세션이 없습니다</Text>
            ) : (
              <>
                {confirmedSlotsToday
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((s) => {
                    const [h, m] = s.startTime.split(':').map(Number);
                    const endMin = h * 60 + m + 30;
                    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
                    return (
                      <View key={s.id} style={styles.sessionRow}>
                        <View style={[styles.sessionBar, { backgroundColor: COLORS.gym }]} />
                        <View style={styles.sessionInfo}>
                          <Text style={styles.sessionTime}>{s.startTime} ~ {endTime}</Text>
                          <Text style={styles.sessionMembers}>
                            {s.trainerName} · 회원 {s.memberCount}명
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: COLORS.gym + '22' }]}>
                          <Text style={[styles.statusBadgeText, { color: COLORS.gym }]}>슬롯 확정</Text>
                        </View>
                      </View>
                    );
                  })}
                {todayBookings.map((b) => {
                  const statusColor = BOOKING_STATUS_COLORS[b.status];
                  return (
                    <View key={b.id} style={styles.sessionRow}>
                      <View style={[styles.sessionBar, { backgroundColor: statusColor }]} />
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionTime}>{formatTime(b.startTime)}</Text>
                        <Text style={styles.sessionMembers}>
                          {b.memberName} · {b.trainerName} 트레이너
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {BOOKING_STATUS_LABELS[b.status]}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* 승인 대기 탭 */}
        {activeTab === 'pending' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>승인 대기 예약</Text>
            {pendingSlots.length === 0 ? (
              <Text style={styles.emptyText}>대기 중인 예약이 없습니다</Text>
            ) : (
              pendingSlots
                .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                .map((b) => (
                  <View key={b.id} style={styles.pendingCard}>
                    <View style={styles.pendingInfo}>
                      <Text style={styles.pendingTrainer}>{b.trainerName} 트레이너</Text>
                      <Text style={styles.pendingDate}>{b.date}  {b.startTime}</Text>
                      <Text style={styles.pendingDetail}>
                        회원 {b.memberCount}명 · 시설 이용료 {formatPrice(b.facilityFee)}
                      </Text>
                    </View>
                    <View style={styles.pendingBtnCol}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnConfirm]}
                        onPress={() => setConfirmModal({ type: 'confirm', booking: b })}
                      >
                        <Text style={styles.actionBtnConfirmText}>확정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnReject]}
                        onPress={() => setConfirmModal({ type: 'reject', booking: b })}
                      >
                        <Text style={styles.actionBtnRejectText}>거절</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
            )}
          </View>
        )}

        {/* 매출 목록 */}
        <View style={styles.section}>
          <View style={styles.revenueHeader}>
            <Text style={styles.sectionTitle}>매출 목록</Text>
            <Text style={[styles.revenueTotalText]}>
              이번 달 {formatPrice(thisMonthRevenue || 1890000)}
            </Text>
          </View>
          {revenueItems.length === 0 ? (
            <Text style={styles.emptyText}>매출 내역이 없습니다</Text>
          ) : (
            revenueItems.map((item) => (
              <View key={item.id} style={styles.revenueItem}>
                <View style={[styles.revenueTypeBadge, { backgroundColor: item.type === 'slot' ? COLORS.gym + '22' : COLORS.primary + '22' }]}>
                  <Text style={[styles.revenueTypeText, { color: item.type === 'slot' ? COLORS.gym : COLORS.primary }]}>
                    {item.type === 'slot' ? '슬롯' : '세션'}
                  </Text>
                </View>
                <View style={styles.revenueItemInfo}>
                  <Text style={styles.revenueItemLabel}>{item.label}</Text>
                  <Text style={styles.revenueItemDetail}>{item.date}  {item.time}  ·  {item.detail}</Text>
                </View>
                <Text style={styles.revenueItemAmount}>+{formatPrice(item.amount)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 확정/거절 확인 모달 */}
      <Modal
        visible={!!confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {confirmModal && (
              <>
                <Text style={styles.modalTitle}>
                  {confirmModal.type === 'confirm' ? '예약 확정' : '예약 거절'}
                </Text>
                <Text style={styles.modalMessage}>
                  {confirmModal.type === 'confirm'
                    ? `정말 확정하시겠습니까?`
                    : `정말 거절하시겠습니까?`}
                </Text>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoText}>트레이너: {confirmModal.booking.trainerName}</Text>
                  <Text style={styles.modalInfoText}>
                    일시: {confirmModal.booking.date}  {confirmModal.booking.startTime}
                  </Text>
                  <Text style={styles.modalInfoText}>
                    인원: {confirmModal.booking.memberCount}명 · {formatPrice(confirmModal.booking.facilityFee)}
                  </Text>
                </View>
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                    onPress={() => setConfirmModal(null)}
                  >
                    <Text style={styles.modalBtnCancelText}>아니오</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      confirmModal.type === 'confirm' ? styles.modalBtnConfirm : styles.modalBtnReject,
                    ]}
                    onPress={handleModalConfirm}
                  >
                    <Text style={styles.modalBtnActionText}>
                      {confirmModal.type === 'confirm' ? '확정' : '거절'}
                    </Text>
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

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20,
  },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerGym: { fontSize: 22, fontWeight: '800', color: '#fff' },
  switchText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'underline' },

  statsGrid: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 4,
    borderTopWidth: 3, borderWidth: 1, borderColor: COLORS.border,
  },
  statCardActive: { borderColor: COLORS.gym, backgroundColor: COLORS.surfaceElevated },
  statEmoji: { fontSize: 24 },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 4, marginRight: 24,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.gym },
  tabText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.gym },
  tabBadge: {
    backgroundColor: COLORS.warning, borderRadius: 9,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  tabBadgeText: { fontSize: 11, fontWeight: '800', color: '#000' },

  content: { padding: 16, gap: 12, paddingBottom: 40 },
  section: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 12 },

  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sessionBar: { width: 4, height: 44, borderRadius: 2 },
  sessionInfo: { flex: 1 },
  sessionTime: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sessionMembers: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  pendingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.06)',
    borderRadius: 12, padding: 14, gap: 12,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
    borderLeftWidth: 3, borderLeftColor: COLORS.warning,
  },
  pendingInfo: { flex: 1, gap: 3 },
  pendingTrainer: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  pendingDate: { fontSize: 13, color: COLORS.warning, fontWeight: '600' },
  pendingDetail: { fontSize: 12, color: COLORS.textSecondary },
  pendingBtnCol: { gap: 6 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, minWidth: 52, alignItems: 'center' },
  actionBtnConfirm: { backgroundColor: COLORS.gym },
  actionBtnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionBtnReject: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  actionBtnRejectText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },

  revenueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueTotalText: { fontSize: 14, fontWeight: '700', color: COLORS.gym },
  revenueItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  revenueTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  revenueTypeText: { fontSize: 11, fontWeight: '700' },
  revenueItemInfo: { flex: 1, gap: 2 },
  revenueItemLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  revenueItemDetail: { fontSize: 11, color: COLORS.textSecondary },
  revenueItemAmount: { fontSize: 14, fontWeight: '800', color: COLORS.success },

  // 확인 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 24, width: '100%', maxWidth: 360, gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  modalMessage: { fontSize: 16, color: COLORS.text, textAlign: 'center' },
  modalInfo: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 12,
    padding: 14, gap: 6,
  },
  modalInfoText: { fontSize: 13, color: COLORS.textSecondary },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: COLORS.surfaceElevated },
  modalBtnCancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  modalBtnConfirm: { backgroundColor: COLORS.gym },
  modalBtnReject: { backgroundColor: COLORS.error },
  modalBtnActionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
