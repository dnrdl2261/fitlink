import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, Platform, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useNotificationStore } from '../../store/notificationStore';
import { formatPrice, formatTime } from '../../utils/formatters';

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
  amber:       '#F59E0B',
  amberPale:   'rgba(245,158,11,0.10)',
};

const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
const WD = ['일', '월', '화', '수', '목', '금', '토'];

type Tab = 'confirm' | 'complete';

export default function ManageScreen() {
  const { trainer } = useAuthStore();
  const { bookings, confirmBooking, requestCompletion } = useBookingStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const trainerId = trainer?.id ?? '';
  const [tab, setTab] = useState<Tab>('confirm');

  // 회원이 결제했지만 아직 확정 안 된 예약
  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.trainerId === trainerId && b.status === 'pending'),
    [bookings, trainerId]
  );

  // 완료 처리할 세션: 이용중 예약의 오늘까지 예정 세션
  const completable = useMemo(
    () =>
      bookings
        .filter((b) => b.trainerId === trainerId && b.status === 'active')
        .flatMap((b) => {
          let n = b.usedSessions;
          return b.sessions
            .filter((s) => s.status === 'scheduled' && s.date <= TODAY)
            .map((s) => {
              n += 1;
              return {
                ...s,
                memberId: b.memberId,
                memberName: b.memberName,
                bookingType: b.type,
                sessionNo: n,
                totalSessions: b.totalSessions,
              };
            });
        })
        .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.startTime.localeCompare(b.startTime))),
    [bookings, trainerId]
  );

  const confirmDialog = (msg: string, onYes: () => void, yesLabel = '확정') => {
    if (Platform.OS === 'web') { if (window.confirm(msg)) onYes(); return; }
    Alert.alert('확인', msg, [
      { text: '취소', style: 'cancel' },
      { text: yesLabel, onPress: onYes },
    ]);
  };

  const handleConfirmBooking = (b: typeof pendingBookings[number]) => {
    confirmDialog(`${b.memberName} 회원의 ${b.totalSessions}회 PT 예약을 확정할까요?`, () => {
      confirmBooking(b.id);
      addNotification({
        type: 'booking_confirmed',
        title: '예약이 확정되었습니다',
        body: `${trainer?.name ?? ''} 트레이너가 ${b.totalSessions}회 PT 예약을 확정했습니다. 첫 세션에서 만나요!`,
        targetRole: 'member',
        userId: b.memberId,
        meta: { bookingId: b.id },
      });
    });
  };

  const handleComplete = (s: typeof completable[number]) => {
    const isConsult = s.bookingType === 'consultation';
    const ptLabel = isConsult ? '무료상담' : `PT ${s.sessionNo}/${s.totalSessions}회`;
    const dt = new Date(`${s.date}T00:00:00`);
    const dateLabel = `${dt.getMonth() + 1}월 ${dt.getDate()}일(${WD[dt.getDay()]}) ${formatTime(s.startTime)}`;
    const summary =
      `${s.memberName} 회원 · ${ptLabel}\n${dateLabel}\n\n` +
      `회원에게 완료 확인을 요청합니다. 회원이 확인하면 1회차가 차감되고,\n` +
      `사실과 다르면 회원이 이의를 제기할 수 있습니다.`;
    confirmDialog(`[세션 완료 확인 요청]\n\n${summary}`, () => {
      requestCompletion(s.bookingId, s.id);
      addNotification({
        type: 'session_confirm_request',
        title: '세션 완료 확인 요청',
        body:
          `${trainer?.name ?? ''} 트레이너가 ${ptLabel} 세션(${dateLabel}) 완료 확인을 요청했습니다.\n` +
          `예약 화면에서 확인해 주세요. 사실과 다르면 이의를 제기할 수 있습니다.`,
        targetRole: 'member',
        userId: s.memberId,
        meta: { bookingId: s.bookingId, sessionId: s.id },
      });
    }, '확인 요청 보내기');
  };

  const whenLabel = (date: string, startTime: string) =>
    `${date === TODAY ? '오늘' : `${date.slice(5).replace('-', '/')}`} · ${formatTime(startTime)}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      {/* 탭 */}
      <View style={styles.tabRow}>
        <TabBtn label="예약 확정" count={pendingBookings.length} active={tab === 'confirm'} onPress={() => setTab('confirm')} />
        <TabBtn label="세션 완료" count={completable.length} active={tab === 'complete'} onPress={() => setTab('complete')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {tab === 'confirm' ? (
          pendingBookings.length === 0 ? (
            <EmptyBox icon="check-decagram-outline" text="확정할 예약이 없습니다" />
          ) : (
            <>
              <Text style={styles.hint}>회원이 결제한 예약입니다. 확정하면 회원에게 알림이 발송됩니다.</Text>
              {pendingBookings.map((b) => (
                <View key={b.id} style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{b.memberName[0]}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{b.memberName} 회원</Text>
                      <Text style={styles.sub}>{b.totalSessions}회 PT · {formatPrice(b.totalAmount)} 결제 완료</Text>
                    </View>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => handleConfirmBooking(b)} activeOpacity={0.85}>
                      <MaterialCommunityIcons name="check" size={15} color="#fff" />
                      <Text style={styles.primaryBtnText}>확정</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )
        ) : (
          completable.length === 0 ? (
            <EmptyBox icon="checkbox-marked-circle-outline" text="완료 처리할 세션이 없습니다" />
          ) : (
            <>
              <Text style={styles.hint}>오늘까지 예정된 세션입니다. 완료 확인을 요청하면 회원 확인 후 회차가 차감됩니다.</Text>
              {completable.map((s) => {
                const consult = s.bookingType === 'consultation';
                return (
                  <View key={s.id} style={styles.card}>
                    <View style={styles.row}>
                      <View style={[styles.avatar, consult && { backgroundColor: '#E0F2FE' }]}>
                        <Text style={[styles.avatarText, consult && { color: '#0891B2' }]}>{s.memberName[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.name}>{s.memberName} 회원</Text>
                          {consult
                            ? <View style={[styles.chip, { backgroundColor: '#E0F2FE' }]}><Text style={[styles.chipText, { color: '#0891B2' }]}>무료상담</Text></View>
                            : <View style={[styles.chip, { backgroundColor: D.primaryGlow }]}><Text style={[styles.chipText, { color: D.primary }]}>PT {s.sessionNo}/{s.totalSessions}</Text></View>
                          }
                        </View>
                        <Text style={styles.sub}>{whenLabel(s.date, s.startTime)} ~ {formatTime(s.endTime)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(s)} activeOpacity={0.85}>
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color={D.primary} />
                      <Text style={styles.completeBtnText}>완료 확인 요청</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TabBtn({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      {count > 0 && (
        <View style={[styles.tabCount, active && styles.tabCountActive]}>
          <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function EmptyBox({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIconBox}>
        <MaterialCommunityIcons name={icon as any} size={30} color={D.textMuted} />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: D.bg,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: D.surface, borderWidth: 1.5, borderColor: D.border,
  },
  tabBtnActive: { backgroundColor: D.primary, borderColor: D.primary },
  tabLabel: { fontSize: 14, fontWeight: '700', color: D.textSec },
  tabLabelActive: { color: '#fff' },
  tabCount: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
    backgroundColor: D.amberPale, alignItems: 'center', justifyContent: 'center',
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 11, fontWeight: '800', color: D.amber },
  tabCountTextActive: { color: '#fff' },

  scroll: { padding: 16, gap: 12 },
  hint: { fontSize: 12, color: D.textMuted, marginBottom: 2 },

  card: {
    backgroundColor: D.surface, borderRadius: 18, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: D.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: D.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700', color: D.text },
  sub: { fontSize: 12.5, color: D.textSec, marginTop: 2 },
  chip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  chipText: { fontSize: 10, fontWeight: '700' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 11,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: D.primaryGlow, paddingVertical: 12, borderRadius: 12,
  },
  completeBtnText: { fontSize: 14, fontWeight: '700', color: D.primary },

  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontSize: 14, color: D.textMuted },
});
