import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';
import CertificationBadge from '../../components/CertificationBadge';
import StarRating from '../../components/StarRating';

export default function TrainerProfileScreen() {
  const router = useRouter();
  const { trainer, logout } = useAuthStore();

  if (!trainer) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 프로필 헤더 */}
        <View style={styles.header}>
          <Image
            source={{ uri: trainer.profileImageUrl ?? 'https://picsum.photos/seed/default/200/200' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{trainer.name} 트레이너</Text>
          <StarRating rating={trainer.rating} reviewCount={trainer.reviewCount} size="medium" />
          <View style={styles.specTags}>
            {trainer.specializations.map((s) => (
              <View key={s} style={styles.specTag}>
                <Text style={styles.specText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{trainer.experienceYears}년</Text>
            <Text style={styles.statLabel}>경력</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{trainer.totalSessions.toLocaleString()}</Text>
            <Text style={styles.statLabel}>총 세션</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatPrice(trainer.sessionPrice)}</Text>
            <Text style={styles.statLabel}>1회 가격</Text>
          </View>
        </View>

        {/* 소개 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>트레이너 소개</Text>
          <Text style={styles.bio}>{trainer.bio}</Text>
        </View>

        {/* 자격증 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>자격증 및 인증 ({trainer.certifications.length}개)</Text>
          {trainer.certifications.map((cert) => (
            <CertificationBadge key={cert.id} cert={cert} />
          ))}
        </View>

        {/* 경력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>경력 사항</Text>
          {trainer.workHistory.map((w) => (
            <View key={w.id} style={styles.workItem}>
              <Text style={styles.workGym}>{w.gymName}</Text>
              <Text style={styles.workPosition}>{w.position}</Text>
              <Text style={styles.workPeriod}>
                {w.startDate.slice(0, 7)} ~ {w.endDate ? w.endDate.slice(0, 7) : '현재'}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            const doLogout = () => { logout(); router.replace('/login'); };
            if (Platform.OS === 'web') {
              doLogout();
            } else {
              Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                { text: '로그아웃', onPress: doLogout },
              ]);
            }
          }}
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 28,
    gap: 10,
  },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.border },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  specTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  specTag: {
    backgroundColor: 'rgba(255,107,107,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  specText: { fontSize: 13, color: COLORS.secondary, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.secondary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  section: {
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  bio: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  workItem: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
    paddingLeft: 12,
    paddingBottom: 12,
    gap: 2,
  },
  workGym: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  workPosition: { fontSize: 13, color: COLORS.secondary },
  workPeriod: { fontSize: 12, color: COLORS.textSecondary },
  logoutBtn: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.error, fontSize: 15, fontWeight: '600' },
});
