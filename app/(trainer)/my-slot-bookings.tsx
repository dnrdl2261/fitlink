import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/formatters';
import { DAY_LABELS } from '../../utils/constants';

const D = {
  bg:      '#F8F9FA',
  surface: '#FFFFFF',
  surface2:'#F3F4F6',
  primary: '#5C6AF5',
  text:    '#111827',
  textSec: '#6B7280',
  textMuted:'#9CA3AF',
  border:  '#E5E7EB',
  success: '#22C55E',
  error:   '#EF4444',
  amber:   '#F59E0B',
};
import { SlotBooking } from '../../types';

// ── QR 시각 컴포넌트 (스캔 불가, 시각적 표현) ──────────────
function QRCode({ value, size = 180 }: { value: string; size?: number }) {
  const cells = 21;
  const cell = Math.floor((size - 20) / cells);

  const isFinder = (r: number, c: number): boolean | null => {
    const tl = r < 8 && c < 8;
    const tr = r < 8 && c >= cells - 8;
    const bl = r >= cells - 8 && c < 8;
    if (!tl && !tr && !bl) return null;
    const rr = tl ? r : tr ? r : r - (cells - 8);
    const cc = tl ? c : tr ? c - (cells - 8) : c;
    if (rr === 0 || rr === 6 || cc === 0 || cc === 6) return true;
    if (rr === 7 || cc === 7) return false;
    if (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4) return true;
    return false;
  };

  const isDark = (r: number, c: number): boolean => {
    const f = isFinder(r, c);
    if (f !== null) return f;
    let h = 0;
    for (let k = 0; k < value.length; k++) h = (h * 31 + value.charCodeAt(k)) & 0xfffffff;
    return ((h * (r + 1) * 7 + c * 13 + r * 17) % 3) === 0;
  };

  return (
    <View style={{ width: size, height: size, backgroundColor: '#fff', padding: 10, borderRadius: 12 }}>
      {Array.from({ length: cells }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {Array.from({ length: cells }, (_, c) => (
            <View key={c} style={{ width: cell, height: cell, backgroundColor: isDark(r, c) ? '#000' : '#fff' }} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── 타이머 훅 ──────────────────────────────────────────────
function useCountdown(initialSeconds: number, active: boolean) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    ref.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 0) { if (ref.current) clearInterval(ref.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [active]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return { display: fmt(seconds), seconds, reset: () => setSeconds(initialSeconds) };
}

// ── 상태 배지 ───────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: '승인 대기', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#F59E0B', dot: '#F59E0B' },
  confirmed: { label: '승인 완료', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  text: '#22C55E', dot: '#22C55E' },
  cancelled: { label: '취소됨',    bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  text: '#EF4444', dot: '#EF4444' },
};

function StatusBadge({ status }: { status: SlotBooking['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ── QR 모달 ─────────────────────────────────────────────────
function QRModal({ booking, onClose }: { booking: SlotBooking | null; onClose: () => void }) {
  const { display, seconds, reset } = useCountdown(3600, !!booking);

  useEffect(() => { if (!booking) reset(); }, [booking]);

  if (!booking) return null;

  const parts = booking.date.split('-');
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  const dow = new Date(booking.date).getDay();

  return (
    <Modal visible={!!booking} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.qrModal}>
          <TouchableOpacity style={styles.qrClose} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.qrCloseText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.qrTitle}>이용 중 🏋️</Text>

          <View style={styles.qrBox}>
            <QRCode value={booking.id} size={200} />
          </View>

          {/* 타이머 — 자동 시작 */}
          <View style={styles.timerBox}>
            <Text style={styles.timerLabel}>남은 이용 시간</Text>
            <Text style={[styles.timerDisplay, seconds < 300 && styles.timerDisplayWarn]}>
              {display}
            </Text>
          </View>

          {/* 예약 요약 */}
          <View style={styles.qrSummary}>
            <Text style={styles.qrGymName}>{booking.gymName}</Text>
            <Text style={styles.qrInfo}>
              {month}월 {day}일 ({DAY_LABELS[dow]})  {booking.startTime} ~{' '}
              {(() => {
                const [h, m] = booking.startTime.split(':').map(Number);
                const t = h * 60 + m + 30;
                return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
              })()}
            </Text>
            <Text style={styles.qrFee}>{formatPrice(booking.facilityFee)}</Text>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>이용 완료</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────
export default function MySlotBookingsScreen() {
  const router = useRouter();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const { trainer } = useAuthStore();
  const { slotBookings, cancelSlot } = useGymSlotStore();
  const [qrTarget, setQrTarget] = useState<SlotBooking | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed'>('all');

  // 알림에서 진입 시 해당 슬롯을 잠시 강조
  const [hlId, setHlId] = useState<string | undefined>(highlight);
  useEffect(() => {
    setHlId(highlight);
    if (!highlight) return;
    const t = setTimeout(() => setHlId(undefined), 3000);
    return () => clearTimeout(t);
  }, [highlight]);

  const myBookings = slotBookings
    .filter((b) => b.trainerId === trainer?.id)
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.startTime.localeCompare(a.startTime);
    });

  const filtered = myBookings.filter((b) => {
    if (activeTab === 'all') return true;
    return b.status === activeTab;
  });

  const counts = {
    all: myBookings.length,
    pending: myBookings.filter((b) => b.status === 'pending').length,
    confirmed: myBookings.filter((b) => b.status === 'confirmed').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate('/(trainer)/more' as any)} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 예약 현황</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        {([['all', '전체'], ['pending', '승인 대기'], ['confirmed', '승인 완료']] as const).map(([tab, label]) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {label}
              {counts[tab] > 0 && <Text style={styles.tabCount}> {counts[tab]}</Text>}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconBox}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={32} color={D.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>예약 내역이 없습니다</Text>
          <Text style={styles.emptySub}>
            {activeTab === 'pending' ? '대기 중인 예약이 없습니다.' :
             activeTab === 'confirmed' ? '승인된 예약이 없습니다.' :
             '헬스장 슬롯을 예약해보세요!'}
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(trainer)/slots' as any)}>
            <Text style={styles.emptyBtnText}>헬스장 예약하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {filtered.map((booking) => {
            const parts = booking.date.split('-');
            const month = parseInt(parts[1]);
            const day = parseInt(parts[2]);
            const dow = new Date(booking.date).getDay();

            return (
              <View key={booking.id} style={[styles.bookingCard, hlId === booking.id && styles.bookingCardHL]}>
                <View style={[styles.bookingCardBar, { backgroundColor: STATUS_CONFIG[booking.status].dot }]} />
                <View style={styles.bookingCardInner}>
                <View style={styles.bookingTop}>
                  <View style={styles.bookingGymRow}>
                    <Text style={styles.bookingGym} numberOfLines={1}>{booking.gymName}</Text>
                    <StatusBadge status={booking.status} />
                  </View>
                  <Text style={styles.bookingDate}>
                    {month}월 {day}일 ({DAY_LABELS[dow]})
                  </Text>
                  <Text style={styles.bookingTime}>
                    {booking.startTime} ~ {(() => {
                      const [h, m] = booking.startTime.split(':').map(Number);
                      const total = h * 60 + m + 30;
                      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
                    })()}
                  </Text>
                </View>

                <View style={styles.bookingDivider} />

                <View style={styles.bookingBottom}>
                  <View style={styles.bookingMeta}>
                    <Text style={styles.bookingFee}>{formatPrice(booking.facilityFee)}</Text>
                    <Text style={styles.bookingCreated}>신청일 {booking.createdAt}</Text>
                  </View>
                  <View style={styles.bookingBtns}>
                    {booking.status === 'confirmed' && (
                      <TouchableOpacity
                        style={styles.qrBtn}
                        onPress={() => setQrTarget(booking)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.qrBtnIcon}>□</Text>
                        <Text style={styles.qrBtnText}>QR 입장</Text>
                      </TouchableOpacity>
                    )}
                    {booking.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => cancelSlot(booking.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cancelBtnText}>예약 취소</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                </View>
              </View>
            );
          })}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      <QRModal booking={qrTarget} onClose={() => setQrTarget(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  backBtn: { width: 40 },
  backText: { fontSize: 30, fontWeight: '300', color: D.primary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: D.text },

  tabRow: {
    flexDirection: 'row', backgroundColor: D.surface,
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  tab: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: D.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: D.textSec },
  tabTextActive: { color: D.primary },
  tabCount: { fontSize: 12, fontWeight: '800' },

  list: { padding: 16, gap: 12 },

  bookingCard: {
    flexDirection: 'row',
    backgroundColor: D.surface, borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  bookingCardHL: {
    borderWidth: 2, borderColor: D.primary,
    shadowColor: D.primary, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5,
  },
  bookingCardBar: { width: 4 },
  bookingCardInner: { flex: 1 },
  bookingTop: { padding: 16, gap: 5 },
  bookingGymRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bookingGym: { fontSize: 16, fontWeight: '800', color: D.text, flex: 1 },
  bookingDate: { fontSize: 13, color: D.textSec },
  bookingTime: { fontSize: 15, fontWeight: '700', color: D.primary },
  bookingDivider: { height: 1, backgroundColor: D.border },
  bookingBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  bookingMeta: { gap: 3 },
  bookingFee: { fontSize: 15, fontWeight: '700', color: D.text },
  bookingCreated: { fontSize: 11, color: D.textMuted },
  bookingBtns: { flexDirection: 'row', gap: 8 },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: D.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: D.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  qrBtnIcon: { fontSize: 16, color: '#fff', fontWeight: '700' },
  qrBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  cancelBtn: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: D.border,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: D.textSec },

  emptyBox:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIconBox: { width: 68, height: 68, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: D.text },
  emptySub: { fontSize: 13, color: D.textSec, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, backgroundColor: D.primary, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 13,
    shadowColor: D.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  qrModal: {
    backgroundColor: D.surface, borderRadius: 28, padding: 28,
    width: '100%', maxWidth: 360, alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: D.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 16,
    position: 'relative',
  },
  qrClose: {
    position: 'absolute', top: 16, right: 16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: D.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  qrCloseText: { fontSize: 14, color: D.textSec, fontWeight: '700' },
  qrTitle: { fontSize: 20, fontWeight: '900', color: D.text, marginTop: 4, letterSpacing: -0.3 },
  qrBox: {
    borderWidth: 4, borderColor: D.primary, borderRadius: 20,
    padding: 8, backgroundColor: '#fff',
    shadowColor: D.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },

  timerBox: { alignItems: 'center', gap: 2 },
  timerLabel: { fontSize: 12, color: D.textSec, fontWeight: '600', letterSpacing: 0.5 },
  timerDisplay: {
    fontSize: 42, fontWeight: '900', color: D.primary,
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: 3,
  },
  timerDisplayWarn: { color: D.error },

  qrSummary: { alignItems: 'center', gap: 4, width: '100%' },
  qrGymName: { fontSize: 16, fontWeight: '800', color: D.text },
  qrInfo: { fontSize: 13, color: D.textSec },
  qrFee: { fontSize: 15, fontWeight: '800', color: D.primary },

  checkinBtn: {
    width: '100%', backgroundColor: D.primary,
    paddingVertical: 15, borderRadius: 14, alignItems: 'center',
    shadowColor: D.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  checkinBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  doneBtn: {
    width: '100%', backgroundColor: D.success,
    paddingVertical: 15, borderRadius: 14, alignItems: 'center',
    shadowColor: D.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
