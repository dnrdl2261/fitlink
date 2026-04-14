import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { formatPrice } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';

export default function MemberProfileScreen() {
  const router = useRouter();
  const { member, logout } = useAuthStore();
  const { bookings } = useBookingStore();

  const myBookings = bookings.filter((b) => b.memberId === 'member_001');
  const completedCount = myBookings.filter((b) => b.status === 'completed').length;
  const totalSpent = myBookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + b.payment.totalAmount, 0);

  const handleLogout = () => {
    const doLogout = () => { logout(); router.replace('/login'); };
    if (Platform.OS === 'web') {
      doLogout();
    } else {
      Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 프로필 헤더 */}
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: member?.profileImageUrl ?? 'https://picsum.photos/seed/default/200/200' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{member?.name}</Text>
          <Text style={styles.email}>{member?.email}</Text>
          <View style={styles.goalTags}>
            {member?.fitnessGoals.map((g) => (
              <View key={g} style={styles.goalTag}>
                <Text style={styles.goalText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{myBookings.length}</Text>
            <Text style={styles.statLabel}>총 예약</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>완료 세션</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatPrice(totalSpent)}</Text>
            <Text style={styles.statLabel}>총 이용금액</Text>
          </View>
        </View>

        {/* 메뉴 */}
        <View style={styles.menuSection}>
          {[
            { emoji: '📞', label: '고객센터', onPress: () => {} },
            { emoji: '📋', label: '이용약관', onPress: () => {} },
            { emoji: '🔒', label: '개인정보처리방침', onPress: () => {} },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>역할 변경 (로그아웃)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: COLORS.border,
  },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  email: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  goalTags: { flexDirection: 'row', gap: 8, marginTop: 12 },
  goalTag: {
    backgroundColor: 'rgba(124,110,232,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  goalText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  menuSection: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  menuEmoji: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text },
  menuArrow: { fontSize: 22, color: COLORS.border },
  logoutBtn: {
    margin: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.error, fontSize: 15, fontWeight: '600' },
});
