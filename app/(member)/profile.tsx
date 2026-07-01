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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { formatPrice } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';

export default function MemberProfileScreen() {
  const router = useRouter();
  const { member, logout } = useAuthStore();
  const { bookings } = useBookingStore();

  const memberId = member?.id ?? 'member_001';
  const myBookings = bookings.filter((b) => b.memberId === memberId);
  const completedCount = myBookings.filter((b) => b.status === 'completed').length;
  const totalSpent = myBookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const handleLogout = () => {
    const doLogout = () => { logout(); router.replace('/login'); };
    if (Platform.OS === 'web') {
      if (window.confirm('로그아웃 하시겠습니까?')) doLogout();
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
          {member?.profileImageUrl ? (
            <Image source={{ uri: member.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialCommunityIcons name="account" size={48} color={COLORS.textSecondary} />
            </View>
          )}
          <Text style={styles.name}>{member?.name}</Text>
          <Text style={styles.email}>{member?.email}</Text>
          {member?.phone ? <Text style={styles.phone}>{member.phone}</Text> : null}
          <View style={styles.goalTags}>
            {member?.fitnessGoals.map((g) => (
              <View key={g} style={styles.goalTag}>
                <Text style={styles.goalText}>{g}</Text>
              </View>
            ))}
          </View>
          {member?.preferredLocations && member.preferredLocations.length > 0 && (
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.locationText}>{member.preferredLocations.join(' · ')}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/(member)/edit-profile' as any)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="pencil-outline" size={14} color={COLORS.primary} />
            <Text style={styles.editBtnText}>프로필 수정</Text>
          </TouchableOpacity>
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
            { emoji: '📋', label: '약관 및 정책', onPress: () => {} },
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
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 10,
    backgroundColor: COLORS.surfaceElevated,
  },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  email: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  goalTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, justifyContent: 'center' },
  goalTag: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  goalText: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  phone: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locationText: { fontSize: 12, color: COLORS.textSecondary },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 12, paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  statBox: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  menuSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderSubtle,
    gap: 12,
  },
  menuEmoji: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text },
  menuArrow: { fontSize: 18, color: COLORS.border },
  logoutBtn: {
    margin: 16,
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.error, fontSize: 15, fontWeight: '500' },
});
