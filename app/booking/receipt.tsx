import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBookingStore } from '../../store/bookingStore';
import { formatDate, formatTime, formatPrice } from '../../utils/formatters';

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

const DAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bookings } = useBookingStore();
  const booking = bookings.find((b) => b.id === id);

  if (!booking) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <Text style={{ color: D.textSec, fontSize: 15 }}>영수증 정보를 찾을 수 없습니다.</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtnLarge}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const originalTotal = booking.pricePerSession * booking.totalSessions;
  const discount = originalTotal - booking.totalAmount;
  const earnedPoints = Math.round(booking.totalAmount * 0.01);
  const payDate = booking.createdAt.split('T')[0];
  const receiptNo = `RCP-${booking.id.toUpperCase().replace('BOOKING_', '').slice(0, 8)}`;

  const handleDownload = () => {
    const msg = '영수증이 저장되었습니다.\n(실제 앱에서는 PDF로 다운로드됩니다)';
    if (Platform.OS === 'web') { window.alert(msg); return; }
    Alert.alert('저장 완료', msg);
  };

  const handleShare = () => {
    const msg = '영수증을 공유합니다.\n(실제 앱에서는 카카오톡·이메일로 공유됩니다)';
    if (Platform.OS === 'web') { window.alert(msg); return; }
    Alert.alert('공유', msg);
  };

  return (
    <SafeAreaView style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={D.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>결제 영수증</Text>
        <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
          <MaterialCommunityIcons name="share-variant-outline" size={20} color={D.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* 영수증 상단 */}
        <View style={s.receiptCard}>
          {/* 로고 영역 */}
          <View style={s.receiptTop}>
            <View style={s.logoArea}>
              <MaterialCommunityIcons name="dumbbell" size={24} color={D.primary} />
              <Text style={s.logoText}>FLOWIN</Text>
            </View>
            <View style={s.receiptNoBadge}>
              <Text style={s.receiptNoLabel}>영수증 번호</Text>
              <Text style={s.receiptNoVal}>{receiptNo}</Text>
            </View>
          </View>

          {/* 결제 완료 표시 */}
          <View style={s.paidBanner}>
            <MaterialCommunityIcons name="check-circle" size={20} color={D.success} />
            <Text style={s.paidText}>결제 완료</Text>
            <Text style={s.paidDate}>{formatDate(payDate)}</Text>
          </View>

          <View style={s.receiptDividerDashed} />

          {/* 구매 내역 */}
          <Text style={s.sectionTitle}>구매 내역</Text>
          <ReceiptRow label="트레이너" value={`${booking.trainerName} 트레이너`} />
          <ReceiptRow label="수업 유형" value={booking.notes?.split(' · ')[0] ?? 'PT 수업'} />
          <ReceiptRow label="수업 목적" value={booking.notes?.split(' · ')[1] ?? '-'} />
          <ReceiptRow label="시작일" value={`${formatDate(booking.startDate)} (${DAY_SHORT[new Date(booking.startDate).getDay()]}요일)`} />
          <ReceiptRow label="수업 시간" value={formatTime(booking.schedule.startTime)} />
          <ReceiptRow label="패키지 횟수" value={`${booking.totalSessions}회`} />

          <View style={s.receiptDivider} />

          {/* 금액 내역 */}
          <Text style={s.sectionTitle}>금액 내역</Text>
          <ReceiptRow label={`1회당 금액 × ${booking.totalSessions}회`} value={formatPrice(originalTotal)} />
          {discount > 0 && (
            <ReceiptRow label="다회권 할인" value={`-${formatPrice(discount)}`} valueColor={D.success} />
          )}

          <View style={s.receiptDivider} />

          {/* 최종 금액 */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>총 결제 금액</Text>
            <Text style={s.totalVal}>{formatPrice(booking.totalAmount)}</Text>
          </View>

          {/* 포인트 적립 */}
          <View style={s.pointsRow}>
            <MaterialCommunityIcons name="gift-outline" size={14} color={D.primary} />
            <Text style={s.pointsText}>
              적립 포인트:{' '}
              <Text style={s.pointsVal}>+{earnedPoints.toLocaleString()}P</Text>
            </Text>
          </View>

          <View style={s.receiptDividerDashed} />

          {/* QR 코드 영역 */}
          <View style={s.qrSection}>
            <View style={s.qrBox}>
              {/* QR 패턴 모방 */}
              <View style={s.qrGrid}>
                {Array.from({ length: 25 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      s.qrDot,
                      [0,1,5,6,7,11,13,17,18,19,23,24].includes(i) && s.qrDotFilled,
                    ]}
                  />
                ))}
              </View>
            </View>
            <Text style={s.qrLabel}>예약 확인 QR</Text>
            <Text style={s.qrSub}>{booking.id.toUpperCase()}</Text>
          </View>

          <View style={s.receiptDividerDashed} />

          {/* 하단 정보 */}
          <View style={s.footerInfo}>
            <FooterRow icon="store-outline" text="FLOWIN Inc. | 사업자등록번호: 123-45-67890" />
            <FooterRow icon="map-marker-outline" text="서울특별시 강남구 테헤란로 123, FLOWIN 빌딩" />
            <FooterRow icon="phone-outline" text="고객센터: 1588-0000 (평일 09:00~18:00)" />
          </View>
        </View>

        {/* 신뢰 배지 */}
        <View style={s.trustRow}>
          <TrustBadge icon="shield-lock-outline" label="SSL 보안" />
          <TrustBadge icon="lock-outline" label="암호화 결제" />
          <TrustBadge icon="shield-check-outline" label="안전 보장" />
        </View>

        {/* 버튼 */}
        <TouchableOpacity style={s.downloadBtn} onPress={handleDownload} activeOpacity={0.85}>
          <MaterialCommunityIcons name="download-outline" size={20} color="#fff" />
          <Text style={s.downloadBtnText}>영수증 저장 (PDF)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.shareBtn2} onPress={handleShare} activeOpacity={0.85}>
          <MaterialCommunityIcons name="share-variant-outline" size={18} color={D.primary} />
          <Text style={s.shareBtn2Text}>공유하기</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ReceiptRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.receiptRow}>
      <Text style={s.receiptLabel}>{label}</Text>
      <Text style={[s.receiptValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

function FooterRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.footerRow}>
      <MaterialCommunityIcons name={icon as any} size={12} color={D.textMuted} />
      <Text style={s.footerText}>{text}</Text>
    </View>
  );
}

function TrustBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.trustBadge}>
      <MaterialCommunityIcons name={icon as any} size={13} color={D.success} />
      <Text style={s.trustText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  backBtnLarge: {
    backgroundColor: D.primary, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: D.text },
  shareBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: D.primaryGlow, alignItems: 'center', justifyContent: 'center',
  },

  content: { padding: 16, gap: 12 },

  receiptCard: {
    backgroundColor: D.surface, borderRadius: 24,
    padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 5,
  },

  receiptTop: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 16,
  },
  logoArea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 20, fontWeight: '900', color: D.primary },

  receiptNoBadge: { alignItems: 'flex-end' },
  receiptNoLabel: { fontSize: 10, color: D.textMuted, fontWeight: '500' },
  receiptNoVal: { fontSize: 12, fontWeight: '700', color: D.text, marginTop: 2 },

  paidBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.success + '12', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: D.success + '30', marginBottom: 16,
  },
  paidText: { fontSize: 14, fontWeight: '700', color: D.success, flex: 1 },
  paidDate: { fontSize: 12, color: D.textMuted },

  receiptDivider: { height: 1, backgroundColor: D.border, marginVertical: 12 },
  receiptDividerDashed: {
    height: 1, borderWidth: 1, borderStyle: 'dashed',
    borderColor: D.border, marginVertical: 16,
  },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: D.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },

  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 8,
  },
  receiptLabel: { fontSize: 13, color: D.textSec, flex: 1 },
  receiptValue: { fontSize: 13, color: D.text, fontWeight: '500', textAlign: 'right', flex: 1 },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginVertical: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: D.text },
  totalVal:   { fontSize: 26, fontWeight: '900', color: D.primary },

  pointsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: D.primaryGlow, borderRadius: 8, padding: 8,
  },
  pointsText: { fontSize: 12, color: D.textSec },
  pointsVal:  { fontSize: 12, fontWeight: '800', color: D.primary },

  qrSection: { alignItems: 'center', gap: 8 },
  qrBox: {
    width: 90, height: 90, padding: 8,
    backgroundColor: D.surface, borderRadius: 12,
    borderWidth: 2, borderColor: D.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  qrGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 70, height: 70, gap: 2 },
  qrDot: {
    width: 12, height: 12, borderRadius: 2,
    backgroundColor: D.border,
  },
  qrDotFilled: { backgroundColor: D.text },
  qrLabel: { fontSize: 13, fontWeight: '600', color: D.text },
  qrSub:   { fontSize: 10, color: D.textMuted },

  footerInfo: { gap: 6 },
  footerRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  footerText: { fontSize: 11, color: D.textMuted, flex: 1, lineHeight: 16 },

  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  trustBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.success + '12', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: D.success + '30',
  },
  trustText: { fontSize: 11, fontWeight: '600', color: D.success },

  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, backgroundColor: D.primary,
    shadowColor: D.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  downloadBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  shareBtn2: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.primary + '40',
  },
  shareBtn2Text: { fontSize: 14, fontWeight: '600', color: D.primary },
});
