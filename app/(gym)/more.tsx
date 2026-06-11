import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Platform, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useGymProfileStore } from '../../store/gymProfileStore';
import { MOCK_GYMS } from '../../data/gyms';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useBookingStore } from '../../store/bookingStore';
import { usePartnerStore } from '../../store/partnerStore';
import { COLORS } from '../../utils/constants';
import { formatPrice } from '../../utils/formatters';

const GYM  = '#2DD4BF';
const DARK = '#0F172A';
const SLATE = '#64748B';
const BG   = '#F1F5F9';
const CARD = '#FFFFFF';
const BD   = '#E2E8F0';

export default function GymMoreScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const { gymAdmin, logout } = useAuthStore();
  const GYM_ID = gymAdmin?.gymId ?? 'gym_001';
  const baseGym = MOCK_GYMS.find(g => g.id === GYM_ID);
  const gymEditsRaw = useGymProfileStore(s => s.edits[GYM_ID]);
  const gymEdits = gymEditsRaw ?? {};
  const gym = baseGym ? { ...baseGym, ...gymEdits } : baseGym;

  const { getBlacklist, slotBookings } = useGymSlotStore();
  const blacklistCount = getBlacklist(GYM_ID).length;
  const partnerCount = (gym?.partnerTrainerIds ?? []).length;
  const pendingPartnerCount = usePartnerStore(s =>
    s.requests.filter(r => r.gymId === GYM_ID && r.status === 'pending').length
  );

  const { bookings } = useBookingStore();
  const activeBookings = bookings.filter((b) => b.status !== 'cancelled');
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const todayCount = activeBookings.filter((b) =>
    b.sessions.some((s) => s.date === today && s.status === 'scheduled')
  ).length;
  const pendingCount = slotBookings.filter((b) => b.gymId === GYM_ID && b.status === 'pending').length;
  const thisMonthRevenue = activeBookings
    .filter((b) => b.status === 'completed' && b.startDate.startsWith('2026-04'))
    .reduce((sum, b) => sum + Math.round(b.totalAmount * 0.05), 0);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('로그아웃 하시겠습니까?')) { logout(); router.replace('/login'); }
      return;
    }
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => { logout(); router.replace('/login'); } },
    ]);
  };

  const sections = [
    {
      title: '운영 현황',
      items: [
        {
          iconName: 'chart-bar',
          iconColor: GYM,
          iconBg: GYM + '18',
          label: '운영 현황',
          sub: `오늘 ${todayCount}건 · 대기 ${pendingCount}건 · 이번달 ${formatPrice(thisMonthRevenue || 1890000)}`,
          onPress: () => router.push({ pathname: '/(gym)/dashboard', params: { tab: 'today' } } as any),
        },
        {
          iconName: 'calendar-month-outline',
          iconColor: '#818CF8',
          iconBg: '#EEF2FF',
          label: '예약 스케줄',
          sub: '날짜별 예약 현황 캘린더',
          onPress: () => router.push('/(gym)/schedule' as any),
        },
      ],
    },
    {
      title: '헬스장 관리',
      items: [
        {
          iconName: 'account-group-outline',
          iconColor: '#F59E0B',
          iconBg: '#FFFBEB',
          label: '트레이너 관리',
          sub: `파트너 ${partnerCount}명 · 블랙리스트 ${blacklistCount}명${pendingPartnerCount > 0 ? ` · 신청 ${pendingPartnerCount}건 대기` : ''}`,
          onPress: () => router.push('/(gym)/trainers'),
          badge: pendingPartnerCount,
        },
        {
          iconName: 'cog-outline',
          iconColor: SLATE,
          iconBg: '#F8FAFC',
          label: '시설 설정',
          sub: '운영 시간 및 트레이너 슬롯 관리',
          onPress: () => router.push('/(gym)/availability'),
        },
        {
          iconName: 'cash-multiple',
          iconColor: '#22C55E',
          iconBg: '#ECFDF5',
          label: '수익 관리',
          sub: `이번달 ${formatPrice(thisMonthRevenue || 560000)} · 헬스장 수익 현황`,
          onPress: () => router.push('/(gym)/earnings' as any),
        },
      ],
    },
    {
      title: '계정',
      items: [
        {
          iconName: 'dumbbell',
          iconColor: GYM,
          iconBg: GYM + '18',
          label: '헬스장 프로필',
          sub: '헬스장 정보 및 소개',
          onPress: () => router.push('/(gym)/profile'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>

        <View style={styles.profileCard}>
          {gym?.images?.[0] ? (
            <Image source={{ uri: gym.images[0] }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: GYM + '18' }]}>
              <MaterialCommunityIcons name="dumbbell" size={26} color={GYM} />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{gymAdmin?.name ?? '관리자'}</Text>
            <Text style={styles.profileRole}>{gym?.name ?? 'FLOWIN 헬스장'}</Text>
          </View>
        </View>

        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity style={styles.menuRow} onPress={item.onPress} activeOpacity={0.7}>
                    <View style={[styles.menuIconWrap, { backgroundColor: (item as any).iconBg }]}>
                      <MaterialCommunityIcons
                        name={(item as any).iconName as any}
                        size={18}
                        color={(item as any).iconColor}
                      />
                    </View>
                    <View style={styles.menuText}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                        {(item as any).badge > 0 && (
                          <View style={styles.menuBadge}>
                            <Text style={styles.menuBadgeText}>{(item as any).badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.menuSub}>{item.sub}</Text>
                    </View>
                    <Text style={styles.menuArrow}>›</Text>
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, marginHorizontal: 16, marginTop: 20, marginBottom: 8, borderRadius: 16, padding: 18, gap: 14, borderWidth: 1, borderColor: BD },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1F5F9' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  profileRole: { fontSize: 13, color: SLATE },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: SLATE, marginBottom: 8, marginLeft: 4 },
  menuCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BD, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  menuSub: { fontSize: 12, color: SLATE, marginTop: 1 },
  menuArrow: { fontSize: 20, color: SLATE },
  divider: { height: 1, backgroundColor: BD, marginLeft: 64 },
  logoutBtn: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BD, paddingVertical: 15, alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#F87171' },
  menuBadge: { backgroundColor: COLORS.error, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  menuBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
});
