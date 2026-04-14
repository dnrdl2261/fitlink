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
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../utils/constants';
import { UserRole } from '../types';

const ROLES: { role: UserRole; label: string; emoji: string; desc: string; color: string }[] = [
  { role: 'member',    label: '회원',          emoji: '🏃', desc: '헬스장 탐색 & PT 예약',  color: COLORS.primary },
  { role: 'trainer',   label: 'PT 트레이너',   emoji: '💪', desc: '일정 관리 & 수익 확인',  color: COLORS.secondary },
  { role: 'gym_admin', label: '헬스장 관리자', emoji: '🏋️', desc: '시설 관리 & 예약 승인',  color: COLORS.gym },
];

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

  const selectedRole = ROLES.find((r) => r.role === role)!;

  // 이미 로그인된 상태면 바로 이동 (hooks 이후에 배치, authRole로 충돌 해결)
  if (isLoggedIn) {
    if (authRole === 'member')    return <Redirect href="/(member)" />;
    if (authRole === 'trainer')   return <Redirect href="/(trainer)" />;
    if (authRole === 'gym_admin') return <Redirect href="/(gym)" />;
  }

  const handleSignup = () => {
    if (password !== confirmPw) {
      Alert.alert('비밀번호 불일치', '비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    const result = signup(name, email, password, role);
    setLoading(false);

    if (result.success) {
      if (role === 'member')         router.replace('/(member)');
      else if (role === 'trainer')   router.replace('/(trainer)');
      else                           router.replace('/(gym)');
    } else {
      Alert.alert('회원가입 실패', result.message);
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
              <Text style={styles.backText}>← 뒤로</Text>
            </TouchableOpacity>
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.subtitle}>FitLink에 오신 것을 환영합니다</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48, gap: 16 },

  header: { paddingTop: 8, paddingBottom: 8 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
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
});
