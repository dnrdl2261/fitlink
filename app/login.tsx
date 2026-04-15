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

const DEMO_ACCOUNTS: { role: UserRole; label: string; emoji: string; email: string; color: string }[] = [
  { role: 'member',    label: '회원',       emoji: '🏃', email: 'member@followfit.com',  color: COLORS.primary },
  { role: 'trainer',   label: '트레이너',   emoji: '💪', email: 'trainer@followfit.com', color: COLORS.secondary },
  { role: 'gym_admin', label: '헬스장 관리자', emoji: '🏋️', email: 'gym@followfit.com',    color: COLORS.gym },
];

function navigateByRole(router: ReturnType<typeof useRouter>, role: UserRole) {
  if (role === 'member')    router.replace('/(member)');
  else if (role === 'trainer') router.replace('/(trainer)');
  else                      router.replace('/(gym)');
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, selectRole, isLoggedIn, role } = useAuthStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 이미 로그인된 상태면 바로 이동 (hooks 이후에 배치)
  if (isLoggedIn) {
    if (role === 'member')    return <Redirect href="/(member)" />;
    if (role === 'trainer')   return <Redirect href="/(trainer)" />;
    if (role === 'gym_admin') return <Redirect href="/(gym)" />;
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    // 프로토타입: 즉시 처리 (실제 앱이면 API 호출)
    const result = login(email, password);
    setLoading(false);

    if (result.success) {
      const role = useAuthStore.getState().role!;
      navigateByRole(router, role);
    } else {
      Alert.alert('로그인 실패', result.message);
    }
  };

  const handleDemo = (role: UserRole) => {
    selectRole(role);
    navigateByRole(router, role);
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
          {/* 로고 */}
          <View style={styles.header}>
            <Text style={styles.logo}>FollowFit</Text>
            <Text style={styles.tagline}>PT 매칭 플랫폼</Text>
          </View>

          {/* 로그인 폼 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>로그인</Text>

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
                  placeholder="비밀번호"
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

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>
                {loading ? '로그인 중...' : '로그인'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signupLink}
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.signupLinkText}>
                계정이 없으신가요? <Text style={styles.signupLinkHighlight}>회원가입</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* 데모 빠른 접속 */}
          <View style={styles.demoSection}>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>데모 빠른 접속</Text>
              <View style={styles.divider} />
            </View>

            <Text style={styles.demoHint}>
              테스트 계정 · 비밀번호: 1234
            </Text>

            {DEMO_ACCOUNTS.map((item) => (
              <TouchableOpacity
                key={item.role}
                style={[styles.demoBtn, { borderColor: item.color }]}
                onPress={() => handleDemo(item.role)}
              >
                <Text style={styles.demoEmoji}>{item.emoji}</Text>
                <View style={styles.demoInfo}>
                  <Text style={[styles.demoLabel, { color: item.color }]}>{item.label}</Text>
                  <Text style={styles.demoEmail}>{item.email}</Text>
                </View>
                <Text style={[styles.demoArrow, { color: item.color }]}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.notice}>
            * 프로토타입 — 실제 결제가 발생하지 않습니다
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },

  header: { alignItems: 'center', paddingVertical: 40 },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  tagline: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

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

  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  signupLink: { alignItems: 'center', paddingVertical: 4 },
  signupLinkText: { fontSize: 14, color: COLORS.textSecondary },
  signupLinkHighlight: { color: COLORS.primary, fontWeight: '700' },

  demoSection: { marginTop: 28, gap: 10 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, color: COLORS.textSecondary },
  demoHint: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  demoEmoji: { fontSize: 26 },
  demoInfo: { flex: 1 },
  demoLabel: { fontSize: 15, fontWeight: '700' },
  demoEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  demoArrow: { fontSize: 22, fontWeight: '300' },

  notice: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 28,
  },
});
