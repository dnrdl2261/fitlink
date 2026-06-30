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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useGymProfileStore } from '../../store/gymProfileStore';
import { useGymStore } from '../../store/gymStore';
import { formatPrice } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';
import StarRating from '../../components/StarRating';

export default function GymProfileScreen() {
  const router = useRouter();
  const { gymAdmin, logout } = useAuthStore();
  const baseGym = useGymStore((s) => s.gyms.find((g) => g.id === (gymAdmin?.gymId ?? 'gym_001')));
  const editsRaw = useGymProfileStore(s => s.edits[gymAdmin?.gymId ?? 'gym_001']);
  const edits = editsRaw ?? {};
  const gym = baseGym ? { ...baseGym, ...edits } : baseGym;

  if (!gym) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: gym.images[0] }} style={styles.heroImage} />
          <TouchableOpacity
            style={styles.editOverlayBtn}
            onPress={() => router.push('/(gym)/edit-profile' as any)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="pencil" size={15} color="#fff" />
            <Text style={styles.editOverlayText}>프로필 수정</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.nameRow}>
            <Text style={styles.gymName}>{gym.name}</Text>
            {gym.isPartner && (
              <View style={styles.partnerBadge}>
                <Text style={styles.partnerText}>FLOWIN 파트너</Text>
              </View>
            )}
          </View>
          <Text style={styles.address}>📍 {gym.address}</Text>
          <Text style={styles.phone}>📞 {gym.phoneNumber}</Text>
          <StarRating rating={gym.rating} reviewCount={gym.reviewCount} size="medium" />
          <Text style={styles.description}>{gym.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>사진 갤러리</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.gallery}>
              {gym.images.map((img, i) => (
                <Image key={i} source={{ uri: img }} style={styles.galleryImage} />
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시설 및 서비스</Text>
          <View style={styles.facilityGrid}>
            {gym.facilities.map((f) => (
              <View key={f} style={styles.facilityTag}>
                <Text style={styles.facilityText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이용 요금</Text>
          {gym.pricing.map((p) => (
            <View key={p.sessionType} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{p.label}</Text>
              <Text style={styles.priceValue}>{formatPrice(p.facilityFee)}</Text>
            </View>
          ))}
        </View>

        {gym.usageRules && gym.usageRules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>이용 규칙</Text>
            {gym.usageRules.map((rule, idx) => (
              <View key={idx} style={styles.ruleItem}>
                <Text style={styles.ruleBullet}>•</Text>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>관리자 계정</Text>
          <View style={styles.adminInfo}>
            <Text style={styles.adminLabel}>관리자명</Text>
            <Text style={styles.adminValue}>{gymAdmin?.name}</Text>
          </View>
          <View style={styles.adminInfo}>
            <Text style={styles.adminLabel}>이메일</Text>
            <Text style={styles.adminValue}>{gymAdmin?.email}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            const doLogout = () => { logout(); router.replace('/login'); };
            if (Platform.OS === 'web') {
              if (window.confirm('로그아웃 하시겠습니까?')) doLogout();
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
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  heroWrap: { position: 'relative' },
  heroImage: { width: '100%', height: 220, backgroundColor: COLORS.surfaceElevated },
  editOverlayBtn: {
    position: 'absolute', bottom: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  editOverlayText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  section: {
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gymName: { fontSize: 22, fontWeight: '800', color: COLORS.text, flex: 1 },
  partnerBadge: {
    backgroundColor: '#4F63F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  partnerText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  address: { fontSize: 14, color: COLORS.textSecondary },
  phone: { fontSize: 14, color: COLORS.textSecondary },
  description: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  gallery: { flexDirection: 'row', gap: 8 },
  galleryImage: { width: 120, height: 90, borderRadius: 10, backgroundColor: COLORS.surfaceElevated },
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  facilityTag: {
    backgroundColor: 'rgba(45,212,191,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  facilityText: { fontSize: 13, color: '#4F63F5', fontWeight: '600' },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  priceLabel: { fontSize: 14, color: COLORS.text },
  priceValue: { fontSize: 14, fontWeight: '700', color: '#4F63F5' },
  ruleItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  ruleBullet: { fontSize: 14, color: '#4F63F5', lineHeight: 22, fontWeight: '700' },
  ruleText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 22 },
  adminInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  adminLabel: { fontSize: 14, color: COLORS.textSecondary },
  adminValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
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
