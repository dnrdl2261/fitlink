import React, { useState, useEffect } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useNotificationStore } from '../../store/notificationStore';
import { SlotBooking } from '../../types';
import { formatPrice, formatTime } from '../../utils/formatters';
import { COLORS, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../utils/constants';

const GYM  = '#2DD4BF';
const DARK = '#0F172A';
const SLATE = '#64748B';

type Tab = 'today' | 'pending' | 'revenue';

const SLOT_STATUS_CONFIRMED = { bg: '#ECFDF5', text: '#059669', dot: '#22C55E', label: '슬롯 확정' };
const TYPE_SLOT    = { accent: '#818CF8', iconBg: '#EEF2FF', icon: 'dumbbell',         label: '헬스장 이용' };
const TYPE_SESSION = { accent: GYM,       iconBg: '#ECFDF9', icon: 'human-male-board',  label: 'PT 수업' };

export default function GymDashboard() {
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const { gymAdmin } = useAuthStore();
  const GYM_ID = gymAdmin?.gymId ?? 'gym_001';
  const { bookings } = useBookingStore();
  const { confirmSlot, cancelSlot } = useGymSlotStore();
  const { addNotification } = useNotificationStore();
  const slotBookings = useGymSlotStore((s) => s.slotBookings);

  const [activeTab, setActiveTab] = useState<Tab>('today');
  useEffect(() => {
    const t: Tab = tabParam === 'pending' ? 'pending' : tabParam === 'revenue' ? 'revenue' : 'today';
    setActiveTab(t);
  }, [tabParam]);

  const [confirmModal, setConfirmModal] = useState<{
    type: 'confirm' | 'reject';
    booking: SlotBooking;
  } | null>(null);

  const gymBookings = bookings.filter((b) => b.status !== 'cancelled');
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  const todayBookings = gymBookings
    .filter((b) => b.sessions.some((s) => s.date === today && s.status === 'scheduled'))
    .sort((a, b) => {
      const aTime = a.sessions.find((s) => s.date === today)?.startTime ?? '';
      const bTime = b.sessions.find((s) => s.date === today)?.startTime ?? '';
      return aTime.localeCompare(bTime);
    });

  const confirmedSlotsToday = slotBookings.filter(
    (b) => b.gymId === GYM_ID && b.status === 'confirmed' && b.date === today
  );
  const pendingSlots = slotBookings.filter((b) => b.gymId === GYM_ID && b.status === 'pending');
  const totalPending = pendingSlots.length;

  const thisMonthRevenue = gymBookings
    .filter((b) => b.status === 'completed' && b.startDate.startsWith('2026-04'))
    .reduce((sum, b) => sum + Math.round(b.totalAmount * 0.05), 0);

  const revenueItems = [
    ...slotBookings
      .filter((b) => b.gymId === GYM_ID && b.status === 'confirmed')
      .map((b) => ({
        id: b.id, date: b.date, time: b.startTime,
        label: `${b.trainerName} 트레이너`, detail: `회원 ${b.memberCount}명`,
        amount: b.facilityFee, type: 'slot' as const,
      })),
    ...gymBookings
      .filter((b) => b.status === 'completed')
      .map((b) => ({
        id: b.id, date: b.startDate, time: b.schedule.startTime,
        label: b.trainerName + ' 트레이너', detail: 'PT 수업',
        amount: Math.round(b.totalAmount * 0.05), type: 'session' as const,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const handleModalConfirm = () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'confirm') {
      confirmSlot(confirmModal.booking.id);
      addNotification({
        type: 'slot_approved', targetRole: 'trainer', userId: confirmModal.booking.trainerId,
        title: '슬롯 예약이 승인되었습니다',
        body: `${gymAdmin?.name ?? '헬스장'}에서 ${confirmModal.booking.date} ${confirmModal.booking.startTime} 슬롯 예약을 승인했습니다.`,
        meta: { slotBookingId: confirmModal.booking.id },
      });
      setConfirmModal(null);
      Alert.alert('확정 완료', `${confirmModal.booking.trainerName}의 예약이 확정되었습니다.`);
    } else {
      cancelSlot(confirmModal.booking.id);
      addNotification({
        type: 'slot_rejected', targetRole: 'trainer', userId: confirmModal.booking.trainerId,
        title: '슬롯 예약이 거절되었습니다',
        body: `${gymAdmin?.name ?? '헬스장'}에서 ${confirmModal.booking.date} ${confirmModal.booking.startTime} 슬롯 예약을 거절했습니다.`,
        meta: { slotBookingId: confirmModal.booking.id },
      });
      setConfirmModal(null);
      Alert.alert('거절 완료', `${confirmModal.booking.trainerName}의 예약이 거절되었습니다.`);
    }
  };

  const todayTotalCount = confirmedSlotsToday.length + todayBookings.length;
  const todayDateLabel = (() => {
    const d = new Date(today + 'T00:00:00');
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${dayNames[d.getDay()]}`;
  })();

  return (
    <SafeAreaView style={s.container}>
      {/* 통계 카드 */}
      <View style={s.statsGrid}>
        <TouchableOpacity
          style={[s.statCard, { borderTopColor: GYM }, activeTab === 'today' && s.statCardActive]}
          onPress={() => setActiveTab('today')}
        >
          <View style={[s.statIconBox, { backgroundColor: GYM + '18' }]}>
            <MaterialCommunityIcons name="calendar-today" size={20} color={GYM} />
          </View>
          <Text style={[s.statNum, { color: GYM }]}>{todayTotalCount}</Text>
          <Text style={s.statLabel}>오늘 예약</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.statCard, { borderTopColor: COLORS.warning }, activeTab === 'pending' && s.statCardActive]}
          onPress={() => setActiveTab('pending')}
        >
          <View style={[s.statIconBox, { backgroundColor: '#FFFBEB' }]}>
            <MaterialCommunityIcons name="clock-alert-outline" size={20} color={COLORS.warning} />
          </View>
          <Text style={[s.statNum, { color: COLORS.warning }]}>{totalPending}</Text>
          <Text style={s.statLabel}>승인 대기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.statCard, { borderTopColor: COLORS.success }, activeTab === 'revenue' && s.statCardActive]}
          onPress={() => setActiveTab('revenue')}
        >
          <View style={[s.statIconBox, { backgroundColor: '#ECFDF5' }]}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color={COLORS.success} />
          </View>
          <Text style={[s.statNum, { color: COLORS.success }]}>
            {Math.round((thisMonthRevenue || 1890000) / 10000)}만
          </Text>
          <Text style={s.statLabel}>이번 달 매출</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 바 */}
      <View style={s.tabBar}>
        {(['today', 'pending', 'revenue'] as Tab[]).map((tab) => {
          const labels: Record<Tab, string> = { today: '오늘 예약', pending: '승인 대기', revenue: '매출' };
          const active = activeTab === tab;
          return (
            <TouchableOpacity key={tab} style={[s.tab, active && s.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabText, active && s.tabTextActive]}>{labels[tab]}</Text>
              {tab === 'pending' && totalPending > 0 && (
                <View style={s.tabBadge}><Text style={s.tabBadgeText}>{totalPending}</Text></View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* ── 오늘 예약 ── */}
        {activeTab === 'today' && (
          <>
            <View style={s.dateHeader}>
              <View style={s.dateHeaderLeft}>
                <View style={s.todayChip}><Text style={s.todayChipText}>오늘</Text></View>
                <Text style={s.dateHeaderText}>{todayDateLabel}</Text>
              </View>
              {todayTotalCount > 0 && (
                <View style={s.totalBadge}><Text style={s.totalBadgeText}>{todayTotalCount}건</Text></View>
              )}
            </View>

            {todayTotalCount === 0 ? (
              <View style={s.empty}>
                <View style={s.emptyIconBox}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={36} color={SLATE} />
                </View>
                <Text style={s.emptyTitle}>오늘 예약 없음</Text>
                <Text style={s.emptySub}>오늘 예약된 일정이 없습니다</Text>
              </View>
            ) : (
              <>
                {confirmedSlotsToday
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((slot) => {
                    const [h, m] = slot.startTime.split(':').map(Number);
                    const endMin = h * 60 + m + 30;
                    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
                    return (
                      <View key={slot.id} style={s.card}>
                        <View style={[s.cardBar, { backgroundColor: TYPE_SLOT.accent }]} />
                        <View style={s.cardInner}>
                          <View style={s.cardTopRow}>
                            <Text style={s.cardTime}>
                              {slot.startTime}
                              <Text style={s.cardTimeSep}> – </Text>
                              <Text style={s.cardTimeEnd}>{endTime}</Text>
                            </Text>
                            <View style={[s.typePill, { backgroundColor: TYPE_SLOT.iconBg }]}>
                              <MaterialCommunityIcons name={TYPE_SLOT.icon as any} size={11} color={TYPE_SLOT.accent} />
                              <Text style={[s.typePillText, { color: TYPE_SLOT.accent }]}>{TYPE_SLOT.label}</Text>
                            </View>
                          </View>
                          <View style={s.cardDivider} />
                          <View style={s.cardBottomRow}>
                            <View style={[s.personIcon, { backgroundColor: TYPE_SLOT.iconBg }]}>
                              <Text style={[s.personIconText, { color: TYPE_SLOT.accent }]}>{slot.trainerName[0]}</Text>
                            </View>
                            <View style={s.personInfo}>
                              <Text style={s.personName}>{slot.trainerName} <Text style={s.personRole}>트레이너</Text></Text>
                              <Text style={s.personDetail}>회원 {slot.memberCount}명</Text>
                            </View>
                            <View style={[s.statusPill, { backgroundColor: SLOT_STATUS_CONFIRMED.bg }]}>
                              <View style={[s.statusDot, { backgroundColor: SLOT_STATUS_CONFIRMED.dot }]} />
                              <Text style={[s.statusText, { color: SLOT_STATUS_CONFIRMED.text }]}>{SLOT_STATUS_CONFIRMED.label}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                {todayBookings.map((b) => {
                  const statusColor = BOOKING_STATUS_COLORS[b.status];
                  const statusLabel = BOOKING_STATUS_LABELS[b.status];
                  const sessionToday = b.sessions.find((ss) => ss.date === today);
                  const startTime = sessionToday?.startTime ?? b.schedule.startTime;
                  return (
                    <View key={b.id} style={s.card}>
                      <View style={[s.cardBar, { backgroundColor: TYPE_SESSION.accent }]} />
                      <View style={s.cardInner}>
                        <View style={s.cardTopRow}>
                          <Text style={s.cardTime}>{formatTime(startTime)}</Text>
                          <View style={[s.typePill, { backgroundColor: TYPE_SESSION.iconBg }]}>
                            <MaterialCommunityIcons name={TYPE_SESSION.icon as any} size={11} color={TYPE_SESSION.accent} />
                            <Text style={[s.typePillText, { color: TYPE_SESSION.accent }]}>{TYPE_SESSION.label}</Text>
                          </View>
                        </View>
                        <View style={s.cardDivider} />
                        <View style={s.cardBottomRow}>
                          <View style={[s.personIcon, { backgroundColor: TYPE_SESSION.iconBg }]}>
                            <Text style={[s.personIconText, { color: TYPE_SESSION.accent }]}>{b.trainerName[0]}</Text>
                          </View>
                          <View style={s.personInfo}>
                            <Text style={s.personName}>{b.trainerName} <Text style={s.personRole}>트레이너</Text></Text>
                            <Text style={s.personDetail}>PT 수업</Text>
                          </View>
                          <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
                            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ── 승인 대기 ── */}
        {activeTab === 'pending' && (
          <>
            <View style={s.dateHeader}>
              <Text style={s.dateHeaderText}>승인 대기 예약</Text>
              {pendingSlots.length > 0 && (
                <View style={s.totalBadge}><Text style={s.totalBadgeText}>{pendingSlots.length}건</Text></View>
              )}
            </View>

            {pendingSlots.length === 0 ? (
              <View style={s.empty}>
                <View style={s.emptyIconBox}>
                  <MaterialCommunityIcons name="clock-check-outline" size={36} color={SLATE} />
                </View>
                <Text style={s.emptyTitle}>대기 중인 예약 없음</Text>
                <Text style={s.emptySub}>모든 예약이 처리되었습니다</Text>
              </View>
            ) : (
              pendingSlots
                .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                .map((b) => (
                  <View key={b.id} style={s.card}>
                    <View style={[s.cardBar, { backgroundColor: '#F59E0B' }]} />
                    <View style={s.cardInner}>
                      <View style={s.cardTopRow}>
                        <Text style={s.cardTime}>
                          {b.date}<Text style={s.cardTimeSep}> · </Text>
                          <Text style={s.cardTimeEnd}>{b.startTime}</Text>
                        </Text>
                        <View style={[s.typePill, { backgroundColor: TYPE_SLOT.iconBg }]}>
                          <MaterialCommunityIcons name={TYPE_SLOT.icon as any} size={11} color={TYPE_SLOT.accent} />
                          <Text style={[s.typePillText, { color: TYPE_SLOT.accent }]}>{TYPE_SLOT.label}</Text>
                        </View>
                      </View>
                      <View style={s.cardDivider} />
                      <View style={s.cardBottomRow}>
                        <View style={[s.personIcon, { backgroundColor: TYPE_SLOT.iconBg }]}>
                          <Text style={[s.personIconText, { color: TYPE_SLOT.accent }]}>{b.trainerName[0]}</Text>
                        </View>
                        <View style={s.personInfo}>
                          <Text style={s.personName}>{b.trainerName} <Text style={s.personRole}>트레이너</Text></Text>
                          <Text style={s.personDetail}>회원 {b.memberCount}명 · {formatPrice(b.facilityFee)}</Text>
                        </View>
                        <View style={s.pendingBtnCol}>
                          <TouchableOpacity style={s.actionBtnConfirm} onPress={() => setConfirmModal({ type: 'confirm', booking: b })}>
                            <Text style={s.actionBtnConfirmText}>확정</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.actionBtnReject} onPress={() => setConfirmModal({ type: 'reject', booking: b })}>
                            <Text style={s.actionBtnRejectText}>거절</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
            )}
          </>
        )}

        {/* ── 매출 ── */}
        {activeTab === 'revenue' && (
          <>
            <View style={s.dateHeader}>
              <Text style={s.dateHeaderText}>매출 목록</Text>
              <Text style={s.revenueTotalText}>이번 달 {formatPrice(thisMonthRevenue || 1890000)}</Text>
            </View>

            {revenueItems.length === 0 ? (
              <View style={s.empty}>
                <View style={s.emptyIconBox}>
                  <MaterialCommunityIcons name="chart-bar" size={36} color={SLATE} />
                </View>
                <Text style={s.emptyTitle}>매출 내역 없음</Text>
                <Text style={s.emptySub}>아직 완료된 예약이 없습니다</Text>
              </View>
            ) : (
              revenueItems.map((item) => {
                const tc = item.type === 'slot'
                  ? { accent: GYM,       iconBg: GYM + '18',  label: '슬롯' }
                  : { accent: '#818CF8', iconBg: '#EEF2FF',   label: '세션' };
                return (
                  <View key={item.id} style={s.card}>
                    <View style={[s.cardBar, { backgroundColor: tc.accent }]} />
                    <View style={s.cardInner}>
                      <View style={s.cardTopRow}>
                        <Text style={s.cardTime}>
                          {item.date}<Text style={s.cardTimeSep}> · </Text>
                          <Text style={s.cardTimeEnd}>{item.time}</Text>
                        </Text>
                        <View style={[s.typePill, { backgroundColor: tc.iconBg }]}>
                          <MaterialCommunityIcons name="cash-multiple" size={11} color={tc.accent} />
                          <Text style={[s.typePillText, { color: tc.accent }]}>{tc.label}</Text>
                        </View>
                      </View>
                      <View style={s.cardDivider} />
                      <View style={s.cardBottomRow}>
                        <View style={[s.personIcon, { backgroundColor: tc.iconBg }]}>
                          <Text style={[s.personIconText, { color: tc.accent }]}>{item.label[0]}</Text>
                        </View>
                        <View style={s.personInfo}>
                          <Text style={s.personName}>{item.label}</Text>
                          <Text style={s.personDetail}>{item.detail}</Text>
                        </View>
                        <Text style={s.revenueAmount}>+{formatPrice(item.amount)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

      </ScrollView>

      {/* 확정/거절 확인 모달 */}
      <Modal visible={!!confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            {confirmModal && (
              <>
                <View style={[s.modalIconBox, {
                  backgroundColor: confirmModal.type === 'confirm' ? GYM + '18' : COLORS.error + '18',
                }]}>
                  <MaterialCommunityIcons
                    name={confirmModal.type === 'confirm' ? 'calendar-check' : 'calendar-remove'}
                    size={32}
                    color={confirmModal.type === 'confirm' ? GYM : COLORS.error}
                  />
                </View>
                <Text style={s.modalTitle}>
                  {confirmModal.type === 'confirm' ? '예약 확정' : '예약 거절'}
                </Text>
                <Text style={s.modalMessage}>
                  {confirmModal.type === 'confirm' ? '정말 확정하시겠습니까?' : '정말 거절하시겠습니까?'}
                </Text>
                <View style={s.modalInfo}>
                  <Text style={s.modalInfoText}>트레이너: {confirmModal.booking.trainerName}</Text>
                  <Text style={s.modalInfoText}>일시: {confirmModal.booking.date}  {confirmModal.booking.startTime}</Text>
                  <Text style={s.modalInfoText}>인원: {confirmModal.booking.memberCount}명 · {formatPrice(confirmModal.booking.facilityFee)}</Text>
                </View>
                <View style={s.modalBtnRow}>
                  <TouchableOpacity style={[s.modalBtn, s.modalBtnCancel]} onPress={() => setConfirmModal(null)}>
                    <Text style={s.modalBtnCancelText}>아니오</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.modalBtn, confirmModal.type === 'confirm' ? s.modalBtnConfirm : s.modalBtnReject]}
                    onPress={handleModalConfirm}
                  >
                    <Text style={s.modalBtnActionText}>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  statsGrid: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 4,
    borderTopWidth: 3, borderWidth: 1, borderColor: COLORS.border,
  },
  statCardActive: { backgroundColor: COLORS.surfaceElevated },
  statIconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: SLATE },

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
  tabActive: { borderBottomColor: GYM },
  tabText: { fontSize: 15, fontWeight: '600', color: SLATE },
  tabTextActive: { color: GYM },
  tabBadge: {
    backgroundColor: COLORS.warning, borderRadius: 9,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  tabBadgeText: { fontSize: 11, fontWeight: '800', color: '#000' },

  content: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 48, gap: 10 },

  dateHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 16,
  },
  dateHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayChip: { backgroundColor: GYM + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  todayChipText: { fontSize: 11, fontWeight: '800', color: '#0D9488', letterSpacing: 0.2 },
  dateHeaderText: { fontSize: 15, fontWeight: '700', color: DARK },
  totalBadge: {
    backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  totalBadgeText: { fontSize: 12, fontWeight: '700', color: SLATE },
  revenueTotalText: { fontSize: 14, fontWeight: '700', color: GYM },

  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardBar: { width: 4 },
  cardInner: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTime: { fontSize: 15, fontWeight: '800', color: DARK, letterSpacing: -0.3, flexShrink: 1 },
  cardTimeSep: { fontSize: 13, fontWeight: '400', color: '#CBD5E1' },
  cardTimeEnd: { fontSize: 13, fontWeight: '500', color: SLATE },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, flexShrink: 0,
  },
  typePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
  cardDivider: { height: 1, backgroundColor: '#F1F5F9' },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  personIconText: { fontSize: 16, fontWeight: '800' },
  personInfo: { flex: 1, gap: 2 },
  personName: { fontSize: 14, fontWeight: '700', color: DARK },
  personRole: { fontSize: 13, fontWeight: '500', color: SLATE },
  personDetail: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, flexShrink: 0,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },

  pendingBtnCol: { gap: 6, flexShrink: 0 },
  actionBtnConfirm: {
    backgroundColor: GYM, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, alignItems: 'center',
  },
  actionBtnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  actionBtnReject: {
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center',
  },
  actionBtnRejectText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 12 },

  revenueAmount: { fontSize: 14, fontWeight: '800', color: COLORS.success, flexShrink: 0 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIconBox: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4, borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  emptySub: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 24, width: '100%', maxWidth: 360, gap: 16, alignItems: 'center',
  },
  modalIconBox: {
    width: 68, height: 68, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  modalMessage: { fontSize: 16, color: COLORS.text, textAlign: 'center' },
  modalInfo: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 12,
    padding: 14, gap: 6, width: '100%',
  },
  modalInfoText: { fontSize: 13, color: COLORS.textSecondary },
  modalBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: COLORS.surfaceElevated },
  modalBtnCancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  modalBtnConfirm: { backgroundColor: GYM },
  modalBtnReject: { backgroundColor: COLORS.error },
  modalBtnActionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
