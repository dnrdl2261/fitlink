import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, TouchableOpacity, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { usePartnerStore } from '../../store/partnerStore';
import { MOCK_GYMS } from '../../data/gyms';
import { formatDate, formatPrice } from '../../utils/formatters';

const D = {
  bg:          '#EEF2F9',
  surface:     '#FFFFFF',
  primary:     '#4F63F5',
  primaryGlow: 'rgba(79,99,245,0.12)',
  text:        '#0F172A',
  textSec:     '#64748B',
  textMuted:   '#94A3B8',
  border:      '#E2E8F0',
  success:     '#10B981',
  error:       '#EF4444',
  amber:       '#F59E0B',
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: '활성', color: D.success, bg: '#10B98118' },
  completed: { label: '완료', color: D.textSec,  bg: '#64748B12' },
  cancelled: { label: '취소', color: D.error,    bg: '#EF444418' },
};

export default function TrainerMembersScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const { trainer } = useAuthStore();
  const { bookings } = useBookingStore();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const allRequests = usePartnerStore(s => s.requests);
  const removedPartnerIds = usePartnerStore(s => s.removedPartnerIds);
  const trainerId = trainer?.id ?? '';

  const [bookingMember, setBookingMember] = useState<{ memberId: string; memberName: string } | null>(null);
  const [gymPickOpen, setGymPickOpen] = useState(false);

  const partnerGyms = useMemo(() => {
    const myReqs = allRequests.filter(r => r.trainerId === trainerId);
    const approvedIds = myReqs.filter(r => r.status === 'approved').map(r => r.gymId);
    const allIds = [...new Set([...(trainer?.partnerGymIds ?? []), ...approvedIds])]
      .filter(gid => !(removedPartnerIds[gid] ?? []).includes(trainerId));
    return MOCK_GYMS.filter(g => allIds.includes(g.id));
  }, [trainer, allRequests, removedPartnerIds, trainerId]);

  const memberData = useMemo(() => {
    const myBookings = bookings.filter((b) => b.trainerId === trainerId);
    const memberMap = new Map<string, typeof myBookings>();
    myBookings.forEach((b) => {
      if (!memberMap.has(b.memberId)) memberMap.set(b.memberId, []);
      memberMap.get(b.memberId)!.push(b);
    });

    return Array.from(memberMap.entries()).map(([memberId, bks]) => {
      const latest = [...bks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      const totalSessions  = bks.reduce((s, b) => s + b.totalSessions, 0);
      const usedSessions   = bks.reduce((s, b) => s + b.usedSessions, 0);
      const totalAmount    = bks.reduce((s, b) => s + b.totalAmount, 0);
      return {
        memberId,
        memberName:        latest.memberName,
        status:            latest.status,
        totalSessions,
        usedSessions,
        remainingSessions: totalSessions - usedSessions,
        totalAmount,
        startDate:         latest.startDate,
        bookingCount:      bks.length,
      };
    }).sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return b.totalSessions - a.totalSessions;
    });
  }, [bookings, trainerId]);

  const overallStats = useMemo(() => ({
    active:    memberData.filter((m) => m.status === 'active').length,
    completed: memberData.filter((m) => m.status === 'completed').length,
    total:     memberData.reduce((s, m) => s + m.usedSessions, 0),
  }), [memberData]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      {/* 헤더 — 메인 탭으로 진입한 경우(from 없음)엔 뒤로가기 숨김 */}
      <View style={styles.screenHeader}>
        {from ? (
          <TouchableOpacity
            onPress={() => router.navigate((from === 'home' ? '/(trainer)/' : '/(trainer)/more') as any)}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.screenTitle}>회원 관리</Text>
        <View style={styles.countChip}>
          <Text style={styles.countChipText}>{memberData.length}명</Text>
        </View>
      </View>

      {/* 요약 통계 */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: D.success }]}>{overallStats.active}</Text>
          <Text style={styles.statLabel}>활성</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: D.textSec }]}>{overallStats.completed}</Text>
          <Text style={styles.statLabel}>완료</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: D.primary }]}>{overallStats.total}</Text>
          <Text style={styles.statLabel}>총 세션</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {memberData.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="account-group-outline" size={32} color={D.textMuted} />
            </View>
            <Text style={styles.emptyText}>아직 회원이 없습니다</Text>
          </View>
        ) : (
          memberData.map((m) => {
            const progressPct = m.totalSessions > 0
              ? (m.usedSessions / m.totalSessions) * 100
              : 0;
            const statusInfo = STATUS_MAP[m.status] ?? STATUS_MAP.active;
            return (
              <View key={m.memberId} style={styles.memberCard}>
                <View style={[styles.memberCardBar, { backgroundColor: statusInfo.color }]} />
                <View style={styles.memberCardInner}>
                  {/* 상단: 아바타 + 이름 + 뱃지 */}
                  <View style={styles.memberTop}>
                    <View style={styles.avatarWrap}>
                      <Text style={styles.avatarText}>{m.memberName.slice(0, 1)}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{m.memberName}</Text>
                      <Text style={styles.memberSub}>
                        {m.bookingCount}개 예약 · {formatDate(m.startDate)} 시작
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* 세션 진행 프로그레스 */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabel}>세션 진행</Text>
                      <Text style={styles.progressCount}>{m.usedSessions} / {m.totalSessions}회</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
                    </View>
                  </View>

                  {/* 하단: 잔여 세션 + 결제 금액 */}
                  <View style={styles.memberBottom}>
                    <View style={styles.memberStat}>
                      <Text style={styles.memberStatLabel}>잔여 세션</Text>
                      <Text style={[styles.memberStatVal, { color: D.primary }]}>
                        {m.remainingSessions}회
                      </Text>
                    </View>
                    <View style={styles.memberStat}>
                      <Text style={styles.memberStatLabel}>총 결제</Text>
                      <Text style={styles.memberStatVal}>{formatPrice(m.totalAmount)}</Text>
                    </View>
                  </View>
                  <View style={styles.cardBtnRow}>
                    <TouchableOpacity
                      style={[styles.cardBtn, styles.cardBtnGhost]}
                      onPress={() => router.push({ pathname: '/(trainer)/member-detail', params: { memberId: m.memberId, memberName: m.memberName } } as any)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="clipboard-text-outline" size={13} color={D.primary} />
                      <Text style={styles.cardBtnGhostText}>운동 기록</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardBtn, styles.cardBtnPrimary]}
                      onPress={() => { setBookingMember({ memberId: m.memberId, memberName: m.memberName }); setGymPickOpen(true); }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="calendar-plus" size={13} color="#fff" />
                      <Text style={styles.bookBtnText}>예약하기</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* 헬스장 선택 모달 */}
      <Modal visible={gymPickOpen} transparent animationType="slide" onRequestClose={() => setGymPickOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGymPickOpen(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{bookingMember?.memberName} 회원 예약</Text>
              <Text style={styles.modalSub}>예약할 파트너 헬스장을 선택하세요</Text>
            </View>
            {partnerGyms.length === 0 ? (
              <View style={styles.gymEmptyBox}>
                <MaterialCommunityIcons name="domain-off" size={36} color={D.textMuted} />
                <Text style={styles.gymEmptyText}>등록된 파트너 헬스장이 없습니다</Text>
                <Text style={styles.gymEmptyHint}>파트너 헬스장 탭에서 헬스장을 추가하세요</Text>
              </View>
            ) : partnerGyms.map(gym => (
              <TouchableOpacity key={gym.id} style={styles.gymItem}
                onPress={() => {
                  setGymPickOpen(false);
                  router.push({ pathname: '/(trainer)/slots', params: { gymId: gym.id, memberId: bookingMember?.memberId ?? '', memberName: bookingMember?.memberName ?? '' } } as any);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.gymItemIcon}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color={D.primary} />
                </View>
                <View style={styles.gymItemInfo}>
                  <Text style={styles.gymItemName}>{gym.name}</Text>
                  <Text style={styles.gymItemAddr} numberOfLines={1}>{gym.address}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={D.textMuted} />
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: D.surface,
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  backBtn:   { paddingRight: 2, marginLeft: -4 },
  backText:  { fontSize: 30, fontWeight: '300', color: D.primary, marginTop: -4 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: D.text, flex: 1 },
  countChip: {
    backgroundColor: D.primaryGlow,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  countChipText: { fontSize: 14, fontWeight: '700', color: D.primary },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surface,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statVal:  { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: D.textSec },
  statDivider: { width: 1, height: 32, backgroundColor: D.border },

  list: { padding: 14, gap: 12 },

  emptyBox:     { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIconBox: { width: 68, height: 68, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyText:    { fontSize: 15, fontWeight: '600', color: D.textMuted },

  memberCard: {
    flexDirection: 'row',
    backgroundColor: D.surface, borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  memberCardBar: { width: 4 },
  memberCardInner: { flex: 1, padding: 16, gap: 14 },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: D.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: D.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '700', color: D.text },
  memberSub:  { fontSize: 12, color: D.textSec, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },

  progressSection: { gap: 6 },
  progressLabels: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  progressLabel: { fontSize: 12, color: D.textSec },
  progressCount: { fontSize: 12, fontWeight: '600', color: D.text },
  progressBg: {
    height: 8, borderRadius: 4,
    backgroundColor: D.border, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: D.primary },

  memberBottom: {
    flexDirection: 'row', gap: 24,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: D.border,
  },
  memberStat:      { gap: 2 },
  memberStatLabel: { fontSize: 11, color: D.textMuted },
  memberStatVal:   { fontSize: 15, fontWeight: '700', color: D.text },

  bookBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  cardBtnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cardBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 10,
  },
  cardBtnPrimary: { backgroundColor: D.primary },
  cardBtnGhost: { backgroundColor: D.surface, borderWidth: 1.5, borderColor: D.primary },
  cardBtnGhostText: { fontSize: 12, fontWeight: '700', color: D.primary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 44,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: D.border, alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: { marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: D.text },
  modalSub: { fontSize: 13, color: D.textSec, marginTop: 3 },
  gymEmptyBox: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  gymEmptyText: { fontSize: 14, fontWeight: '600', color: D.textSec },
  gymEmptyHint: { fontSize: 12, color: D.textMuted, textAlign: 'center' },
  gymItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border,
  },
  gymItemIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: D.primaryGlow, alignItems: 'center', justifyContent: 'center',
  },
  gymItemInfo: { flex: 1, gap: 3 },
  gymItemName: { fontSize: 15, fontWeight: '700', color: D.text },
  gymItemAddr: { fontSize: 12, color: D.textSec },
});
