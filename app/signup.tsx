import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../utils/constants';
import { UserRole } from '../types';
import { CITIES, getDistricts, getDongs } from '../data/regions';

// RN-Web은 Alert.alert가 화면에 표시되지 않으므로 웹에선 window.alert 사용
function notify(title: string, msg?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.alert) window.alert(msg ? `${title}\n\n${msg}` : title);
  } else {
    Alert.alert(title, msg);
  }
}

const ROLES: { role: UserRole; label: string; emoji: string; desc: string; color: string }[] = [
  { role: 'member',    label: '회원',          emoji: '🏃', desc: '헬스장 탐색 & PT 예약',  color: COLORS.primary },
  { role: 'trainer',   label: 'PT 트레이너',   emoji: '💪', desc: '일정 관리 & 수익 확인',  color: COLORS.secondary },
  { role: 'gym_admin', label: '헬스장 관리자', emoji: '🏋️', desc: '시설 관리 & 예약 승인',  color: COLORS.gym },
];

function AgreeRow({ checked, onToggle, label, onView }: { checked: boolean; onToggle: () => void; label: string; onView?: () => void }) {
  return (
    <View style={styles.agreeRow}>
      <TouchableOpacity style={styles.agreeRowLeft} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.checkboxSm, checked && styles.checkboxOn]}>
          {checked && <Text style={styles.checkMarkSm}>✓</Text>}
        </View>
        <Text style={styles.agreeLabel}>{label}</Text>
      </TouchableOpacity>
      {onView && (
        <TouchableOpacity onPress={onView} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.agreeView}>보기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SignupScreen() {
  const router = useRouter();
  const { signup, isLoggedIn, role: authRole } = useAuthStore();

  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [role, setRole]             = useState<UserRole>('member');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);

  const [agreeAge, setAgreeAge]             = useState(false);
  const [agreeTerms, setAgreeTerms]         = useState(false);
  const [agreePrivacy, setAgreePrivacy]     = useState(false);
  const [agreeRefund, setAgreeRefund]       = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const allRequired = agreeAge && agreeTerms && agreePrivacy && agreeRefund;
  const allChecked = allRequired && agreeMarketing;
  const toggleAll = () => {
    const next = !allChecked;
    setAgreeAge(next); setAgreeTerms(next); setAgreePrivacy(next); setAgreeRefund(next); setAgreeMarketing(next);
  };

  const [addrCity, setAddrCity]         = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrDong, setAddrDong]         = useState('');
  const [addrModal, setAddrModal]       = useState<'city' | 'district' | 'dong' | null>(null);

  const selectedRole = ROLES.find((r) => r.role === role)!;

  // 이미 로그인된 상태면 바로 이동 (hooks 이후에 배치, authRole로 충돌 해결)
  if (isLoggedIn) {
    if (authRole === 'member')    return <Redirect href="/(member)" />;
    if (authRole === 'trainer')   return <Redirect href="/(trainer)" />;
    if (authRole === 'gym_admin') return <Redirect href="/(gym)" />;
  }

  const addrModalItems =
    addrModal === 'city' ? CITIES :
    addrModal === 'district' ? getDistricts(addrCity) :
    addrModal === 'dong' ? getDongs(addrCity, addrDistrict) : [];

  const handleAddrSelect = (value: string) => {
    if (addrModal === 'city') { setAddrCity(value); setAddrDistrict(''); setAddrDong(''); }
    else if (addrModal === 'district') { setAddrDistrict(value); setAddrDong(''); }
    else if (addrModal === 'dong') { setAddrDong(value); }
    setAddrModal(null);
  };

  const handleSignup = async () => {
    if (password !== confirmPw) {
      notify('비밀번호 불일치', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (role === 'member' && (!addrCity || !addrDistrict || !addrDong)) {
      notify('주소 미입력', '활동 지역(시/구/동)을 모두 선택해주세요.');
      return;
    }
    if (!allRequired) {
      notify('약관 동의 필요', '필수 약관에 모두 동의해주세요.');
      return;
    }
    setLoading(true);
    const address = role === 'member' ? { city: addrCity, district: addrDistrict, dong: addrDong } : undefined;
    const result = await signup(name, email, password, role, address, agreeMarketing);
    setLoading(false);

    if (result.success) {
      if (role === 'member')         router.replace('/(member)');
      else if (role === 'trainer')   router.replace('/(trainer)');
      else                           router.replace('/(gym)');
    } else if (result.message?.includes('이메일') || result.message?.includes('메일')) {
      // 이메일 인증 필요 (Supabase Confirm email ON) → 안내 후 로그인 화면으로
      notify('이메일 인증 필요', result.message);
      router.replace('/login' as any);
    } else {
      notify('회원가입 실패', result.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.subtitle}>FLOWIN에 오신 것을 환영합니다</Text>
          </View>

          {/* 역할 선택 */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>역할 선택</Text>
            <View style={styles.roleGrid}>
              {ROLES.map((item) => (
                <TouchableOpacity
                  key={item.role}
                  style={[
                    styles.roleBtn,
                    role === item.role && { borderColor: item.color, backgroundColor: item.color + '15' },
                  ]}
                  onPress={() => setRole(item.role)}
                >
                  <Text style={styles.roleEmoji}>{item.emoji}</Text>
                  <Text style={[styles.roleLabel, role === item.role && { color: item.color }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.roleDesc}>{item.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 정보 입력 */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>기본 정보</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                style={styles.input}
                placeholder="실명을 입력해주세요"
                placeholderTextColor={COLORS.textSecondary}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="이메일 주소"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>비밀번호</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="4자 이상"
                  placeholderTextColor={COLORS.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>비밀번호 확인</Text>
              <TextInput
                style={[
                  styles.input,
                  confirmPw.length > 0 && confirmPw !== password && styles.inputError,
                ]}
                placeholder="비밀번호 재입력"
                placeholderTextColor={COLORS.textSecondary}
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              {confirmPw.length > 0 && confirmPw !== password && (
                <Text style={styles.errorText}>비밀번호가 일치하지 않습니다</Text>
              )}
            </View>
          </View>

          {/* 활동 지역 (회원만) */}
          {role === 'member' && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>활동 지역</Text>
              <Text style={styles.addrHint}>트레이너 검색 시 내 지역 근처 트레이너를 먼저 보여줍니다</Text>
              <TouchableOpacity
                style={styles.addrRow}
                onPress={() => setAddrModal('city')}
              >
                <Text style={styles.addrLabel}>시 / 도</Text>
                <Text style={[styles.addrValue, !addrCity && styles.addrPlaceholder]}>
                  {addrCity || '선택'}
                </Text>
                <Text style={styles.addrArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addrRow, !addrCity && styles.addrRowDisabled]}
                onPress={() => addrCity && setAddrModal('district')}
              >
                <Text style={styles.addrLabel}>구 / 군</Text>
                <Text style={[styles.addrValue, !addrDistrict && styles.addrPlaceholder]}>
                  {addrDistrict || '선택'}
                </Text>
                <Text style={styles.addrArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addrRow, !addrDistrict && styles.addrRowDisabled]}
                onPress={() => addrDistrict && setAddrModal('dong')}
              >
                <Text style={styles.addrLabel}>동 / 읍</Text>
                <Text style={[styles.addrValue, !addrDong && styles.addrPlaceholder]}>
                  {addrDong || '선택'}
                </Text>
                <Text style={styles.addrArrow}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 약관 동의 */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>약관 동의</Text>
            <TouchableOpacity style={styles.agreeAllRow} onPress={toggleAll} activeOpacity={0.7}>
              <View style={[styles.checkbox, allChecked && styles.checkboxOn]}>
                {allChecked && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.agreeAllText}>전체 동의 (선택 정보 포함)</Text>
            </TouchableOpacity>
            <View style={styles.agreeDivider} />
            <AgreeRow checked={agreeAge}       onToggle={() => setAgreeAge(!agreeAge)}           label="[필수] 만 14세 이상입니다" />
            <AgreeRow checked={agreeTerms}     onToggle={() => setAgreeTerms(!agreeTerms)}       label="[필수] 이용약관 동의"           onView={() => router.push('/legal/terms' as any)} />
            <AgreeRow checked={agreePrivacy}   onToggle={() => setAgreePrivacy(!agreePrivacy)}   label="[필수] 개인정보 수집·이용 동의" onView={() => router.push('/legal/privacy' as any)} />
            <AgreeRow checked={agreeRefund}    onToggle={() => setAgreeRefund(!agreeRefund)}     label="[필수] 환불정책 확인"           onView={() => router.push('/legal/refund' as any)} />
            <AgreeRow checked={agreeMarketing} onToggle={() => setAgreeMarketing(!agreeMarketing)} label="[선택] 마케팅 정보 수신 동의" />
          </View>

          {/* 가입 버튼 */}
          <TouchableOpacity
            style={[
              styles.signupBtn,
              { backgroundColor: selectedRole.color },
              loading && styles.signupBtnDisabled,
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupBtnText}>
              {loading ? '처리 중...' : `${selectedRole.emoji}  ${selectedRole.label}로 시작하기`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
          >
            <Text style={styles.loginLinkText}>
              이미 계정이 있으신가요? <Text style={styles.loginLinkHighlight}>로그인</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 주소 선택 모달 */}
      <Modal visible={addrModal !== null} animationType="slide" transparent onRequestClose={() => setAddrModal(null)}>
        <View style={styles.addrModalOverlay}>
          <View style={styles.addrModalBox}>
            <View style={styles.addrModalHeader}>
              <TouchableOpacity onPress={() => setAddrModal(null)}>
                <Text style={styles.addrModalClose}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.addrModalTitle}>
                {addrModal === 'city' ? '시 / 도 선택' : addrModal === 'district' ? '구 / 군 선택' : '동 / 읍 선택'}
              </Text>
              <View style={{ width: 24 }} />
            </View>
            <FlatList
              data={addrModalItems}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.addrModalItem} onPress={() => handleAddrSelect(item)}>
                  <Text style={styles.addrModalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48, gap: 16 },

  header: { paddingTop: 8, paddingBottom: 8 },
  backBtn: { marginBottom: 12, paddingLeft: 8 },
  backText: { fontSize: 36, color: COLORS.primary, fontWeight: '300' },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  roleGrid: { gap: 10 },
  roleBtn: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  roleLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  roleDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, flex: 1 },

  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: 12, color: COLORS.error },

  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  eyeBtn: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeIcon: { fontSize: 16 },

  signupBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  signupBtnDisabled: { opacity: 0.6 },
  signupBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  loginLink: { alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { fontSize: 14, color: COLORS.textSecondary },
  loginLinkHighlight: { color: COLORS.primary, fontWeight: '700' },

  agreeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  agreeAllText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  agreeDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  agreeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  agreeLabel: { fontSize: 13.5, color: COLORS.textSecondary, flex: 1 },
  agreeView: { fontSize: 12, color: COLORS.textSecondary, textDecorationLine: 'underline' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSm: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '900' },
  checkMarkSm: { color: '#fff', fontSize: 12, fontWeight: '900' },

  addrHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: -6 },
  addrRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  addrRowDisabled: { opacity: 0.4 },
  addrLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, width: 56 },
  addrValue: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '600' },
  addrPlaceholder: { color: COLORS.textSecondary, fontWeight: '400' },
  addrArrow: { fontSize: 20, color: COLORS.textSecondary },

  addrModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  addrModalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '60%',
  },
  addrModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  addrModalClose: { fontSize: 18, color: COLORS.text, fontWeight: '600' },
  addrModalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  addrModalItem: {
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  addrModalItemText: { fontSize: 15, color: COLORS.text },
});
