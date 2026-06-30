import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';
import { OAUTH_CONFIG } from '../config/oauth';
import { COLORS } from '../utils/constants';
import OnboardingModal from '../components/OnboardingModal';

WebBrowser.maybeCompleteAuthSession();

// RN-Web은 Alert.alert가 표시되지 않으므로 웹에선 window.alert 사용
function notify(title: string, msg?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.alert) window.alert(msg ? `${title}\n\n${msg}` : title);
  } else {
    Alert.alert(title, msg);
  }
}

const BLUE   = COLORS.primary;
const BLUE_L = COLORS.primaryPale;
const TEXT   = COLORS.text;
const TEXT_S = COLORS.textSecondary;
const BORDER = COLORS.border;
const BG     = COLORS.background;
const CARD   = COLORS.surfaceElevated;

const KAKAO_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
};

const DEMO_ACCOUNTS: { role: UserRole; label: string; emoji: string }[] = [
  { role: 'member',    label: '회원',          emoji: '🏃' },
  { role: 'trainer',   label: '트레이너',      emoji: '💪' },
  { role: 'gym_admin', label: '헬스장 관리자', emoji: '🏢' },
];

function navigateByRole(router: ReturnType<typeof useRouter>, role: UserRole) {
  if (role === 'member')    router.replace('/(member)');
  else if (role === 'trainer') router.replace('/(trainer)');
  else if (role === 'operator') router.replace('/operator' as any);
  else                      router.replace('/(gym)');
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithSocial, selectRole, isLoggedIn, role } = useAuthStore();

  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showDemo, setShowDemo]           = useState(false);
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [showPw, setShowPw]               = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({});

  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    clientId: OAUTH_CONFIG.google.clientId,
    scopes: ['openid', 'profile', 'email'],
  });

  const [, kakaoResponse, promptKakaoAsync] = AuthSession.useAuthRequest(
    {
      clientId: OAUTH_CONFIG.kakao.clientId,
      scopes: ['profile_nickname', 'account_email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false,
    },
    KAKAO_DISCOVERY
  );

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const token = googleResponse.authentication?.accessToken;
      if (token) {
        fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            loginWithSocial('google', data.name ?? '구글 사용자', data.email ?? '');
            router.replace('/(member)');
          })
          .catch(() => {
            loginWithSocial('google', '구글 사용자', '');
            router.replace('/(member)');
          });
      }
    }
  }, [googleResponse]);

  useEffect(() => {
    if (kakaoResponse?.type === 'success') {
      loginWithSocial('kakao', '카카오 사용자', '');
      router.replace('/(member)');
    } else if (kakaoResponse?.type === 'error') {
      notify('카카오 로그인 실패', '다시 시도해주세요.');
    }
  }, [kakaoResponse]);

  if (isLoggedIn) {
    if (role === 'member')    return <Redirect href="/(member)" />;
    if (role === 'trainer')   return <Redirect href="/(trainer)" />;
    if (role === 'gym_admin') return <Redirect href="/(gym)" />;
    if (role === 'operator')  return <Redirect href={'/operator' as any} />;
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      notify('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigateByRole(router, useAuthStore.getState().role!);
    } else {
      notify('로그인 실패', result.message);
    }
  };

  const handleDemo = (r: UserRole) => {
    selectRole(r);
    navigateByRole(router, r);
  };

  return (
    <SafeAreaView style={s.safe}>
      <OnboardingModal />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 로고 */}
          <View style={s.logoArea}>
            <Image
              source={require('../assets/logo.jpg')}
              style={s.logoImage}
              resizeMode="contain"
            />
            <Text style={s.appName}>FLOWIN</Text>
            <Text style={s.tagline}>나에게 딱 맞는 트레이너 찾기</Text>
          </View>

          {/* 시작하기 */}
          <TouchableOpacity style={s.startBtn} onPress={() => handleDemo('member')} activeOpacity={0.85}>
            <Text style={s.startBtnText}>시작하기</Text>
          </TouchableOpacity>

          {/* 회원가입 */}
          <TouchableOpacity style={s.loginLink} onPress={() => router.push('/signup' as any)}>
            <Text style={s.loginLinkText}>
              계정이 없으신가요?{' '}
              <Text style={s.loginLinkHL}>회원가입</Text>
            </Text>
          </TouchableOpacity>

          {/* 로그인하기 토글 */}
          <TouchableOpacity style={[s.loginLink, { marginTop: -8 }]} onPress={() => setShowLoginForm(!showLoginForm)}>
            <Text style={s.loginLinkText}>
              이미 계정이 있으신가요?{' '}
              <Text style={s.loginLinkHL}>로그인하기</Text>
            </Text>
          </TouchableOpacity>

          {/* 이메일 폼 */}
          {showLoginForm && (
            <View style={s.formBox}>
              <View style={s.inputRow}>
                <MaterialCommunityIcons name="email-outline" size={18} color={TEXT_S} />
                <TextInput
                  style={s.input}
                  placeholder="이메일"
                  placeholderTextColor={TEXT_S}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={s.inputRow}>
                <MaterialCommunityIcons name="lock-outline" size={18} color={TEXT_S} />
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="비밀번호"
                  placeholderTextColor={TEXT_S}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                  <MaterialCommunityIcons
                    name={showPw ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={TEXT_S}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[s.formLoginBtn, loading && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={s.formLoginBtnText}>{loading ? '로그인 중...' : '로그인'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 구분선 */}
          <View style={s.divRow}>
            <View style={s.divLine} />
            <Text style={s.divText}>간편 로그인</Text>
            <View style={s.divLine} />
          </View>

          {/* 소셜 아이콘 */}
          <View style={s.socialRow}>
            <TouchableOpacity style={s.socialCircle} activeOpacity={0.7}>
              <MaterialCommunityIcons name="apple" size={22} color={TEXT} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.socialCircle]}
              onPress={() => promptGoogleAsync()}
              activeOpacity={0.7}
            >
              <Text style={[s.socialTxt, { color: '#EA4335', fontWeight: '900' }]}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.socialCircle, { backgroundColor: '#FEE500', borderColor: '#FEE500' }]}
              onPress={() => promptKakaoAsync()}
              activeOpacity={0.7}
            >
              <Text style={[s.socialTxt, { color: '#3C1E1E' }]}>K</Text>
            </TouchableOpacity>
          </View>

          {/* 데모 계정 */}
          <TouchableOpacity style={s.demoToggle} onPress={() => setShowDemo(!showDemo)}>
            <MaterialCommunityIcons name="lightning-bolt" size={13} color={TEXT_S} />
            <Text style={s.demoToggleTxt}>데모 계정으로 둘러보기</Text>
            <MaterialCommunityIcons
              name={showDemo ? 'chevron-up' : 'chevron-down'}
              size={13}
              color={TEXT_S}
            />
          </TouchableOpacity>

          {showDemo && (
            <View style={s.demoBtns}>
              {DEMO_ACCOUNTS.map((item) => (
                <TouchableOpacity
                  key={item.role}
                  style={s.demoBtn}
                  onPress={() => handleDemo(item.role)}
                  activeOpacity={0.75}
                >
                  <Text style={s.demoEmoji}>{item.emoji}</Text>
                  <Text style={s.demoBtnTxt}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 입점 신청 / 운영자 */}
          <View style={s.opRow}>
            <TouchableOpacity onPress={() => router.push('/gym-apply' as any)} activeOpacity={0.7}>
              <Text style={s.opLinkText}>🏢 헬스장 입점 신청</Text>
            </TouchableOpacity>
            <Text style={s.opDivider}>·</Text>
            <TouchableOpacity onPress={() => handleDemo('operator')} activeOpacity={0.7}>
              <Text style={s.opLinkText}>🛡️ 운영자 콘솔</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.notice}>* 프로토타입 — 실제 결제가 발생하지 않습니다</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: BG },
  flex:  { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  /* 로고 */
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 16,
  },
  appName: {
    fontSize: 30,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: 10,
    marginBottom: 6,
  },
  tagline:  { fontSize: 14, color: TEXT_S },

  /* 버튼 */
  startBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  loginLink: { alignItems: 'center', marginBottom: 24 },
  loginLinkText: { fontSize: 14, color: TEXT_S },
  loginLinkHL: { color: BLUE, fontWeight: '700' },

  /* 이메일 폼 */
  formBox: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, fontSize: 15, color: TEXT },
  formLoginBtn: {
    backgroundColor: BLUE,
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLoginBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* 구분선 */
  divRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: BORDER },
  divText: { fontSize: 12, color: TEXT_S },

  /* 소셜 */
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 32 },
  socialCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialTxt: { fontSize: 18, fontWeight: '800' },

  /* 데모 */
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 12,
  },
  demoToggleTxt: { fontSize: 13, color: TEXT_S },
  demoBtns: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  demoBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 12,
  },
  demoEmoji:   { fontSize: 20 },
  demoBtnTxt:  { fontSize: 12, color: TEXT_S, fontWeight: '600' },

  notice: { textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 16 },
  opRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 18 },
  opLinkText: { fontSize: 12, color: TEXT_S, fontWeight: '600' },
  opDivider: { fontSize: 12, color: BORDER },
});
