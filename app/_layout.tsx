import { Stack, useRouter } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { type PropsWithChildren, useEffect } from 'react';
import { COLORS } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import { useBookingStore } from '../store/bookingStore';
import { useTrainerStore } from '../store/trainerStore';
import { useGymStore } from '../store/gymStore';
import { useGymSlotStore } from '../store/gymSlotStore';
import { useNotificationStore } from '../store/notificationStore';
import { useChatStore } from '../store/chatStore';
import { useReviewStore } from '../store/reviewStore';
import { usePartnerStore } from '../store/partnerStore';
import { useOfferStore } from '../store/offerStore';
import { useFollowStore } from '../store/followStore';
import { useReportStore } from '../store/reportStore';
import { useGymApplicationStore } from '../store/gymApplicationStore';
import { useFavoriteStore } from '../store/favoriteStore';
import { useMemberRecordStore } from '../store/memberRecordStore';
import { useManualSessionStore } from '../store/manualSessionStore';
import { useCommunityStore } from '../store/communityStore';
import { initSentry, ErrorBoundary } from '../config/sentry';

import { MD3LightTheme } from 'react-native-paper';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.primaryLight,
    background: COLORS.background,
    surface: COLORS.surface,
    onBackground: COLORS.text,
    onSurface: COLORS.text,
  },
};

function WebFrame({ children }: PropsWithChildren) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={webStyles.outer}>
      <View style={webStyles.phone}>{children}</View>
    </View>
  );
}

function BackBtn() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.back()} style={{ paddingLeft: 20, paddingRight: 8 }}>
      <Text style={{ fontSize: 34, fontWeight: '300', color: COLORS.text }}>‹</Text>
    </TouchableOpacity>
  );
}

const detailScreenOptions = {
  headerShown: true,
  headerLeft: () => <BackBtn />,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: { color: COLORS.text, fontWeight: '700' as const },
  headerShadowVisible: false,
};

export default function RootLayout() {
  // 에러 모니터링 초기화(웹·DSN 설정 시에만 동작). 미설정/네이티브는 no-op.
  useEffect(() => { initSentry(); }, []);

  // Supabase 세션 복원(새로고침 유지) + 로그인 회원 변경 시 예약 로드. 미설정 시 no-op.
  useEffect(() => {
    let loadedFor: string | undefined;
    let inboxUnsub: (() => void) | undefined;   // 채팅 인박스 실시간 구독(목록 unread 뱃지)
    // 로그인 사용자의 데이터를 역할에 맞게 로드(회원=예약, 트레이너=예약+슬롯, 관리자=헬스장슬롯). id가 바뀔 때만 1회.
    const loadUserData = (s: ReturnType<typeof useAuthStore.getState>) => {
      // 운영자: 프로필 객체가 없으므로(member/trainer/gymAdmin null) 역할로 분기. 전체 신고·입점신청 로드.
      if (s.role === 'operator') {
        if (loadedFor === 'operator') return;
        loadedFor = 'operator';
        useReportStore.getState().loadAll();
        useGymApplicationStore.getState().loadAll();
        return;
      }
      const uid = s.member?.id ?? s.trainer?.id ?? s.gymAdmin?.id;
      if (!uid || uid === loadedFor) return;
      loadedFor = uid;
      useCommunityStore.getState().loadUserState(uid); // 커뮤니티 반응/가입(전 역할 공통)
      inboxUnsub?.();                                  // 이전 사용자 인박스 해제 후 재구독
      inboxUnsub = useChatStore.getState().subscribeInbox(uid);
      const bs = useBookingStore.getState();
      const ss = useGymSlotStore.getState();
      const ns = useNotificationStore.getState();
      const cs = useChatStore.getState();
      const ps = usePartnerStore.getState();
      const os = useOfferStore.getState();
      if (s.member) {
        bs.loadFromSupabase(s.member.id);
        ns.loadFromSupabase(s.member.id);
        cs.loadFromSupabase(s.member.id);
        os.loadForMember(s.member.id);
        useFavoriteStore.getState().loadForMember(s.member.id);
        useMemberRecordStore.getState().loadForMember(s.member.id);
      } else if (s.trainer) {
        bs.loadTrainerBookings(s.trainer.id);
        ss.loadTrainerSlots(s.trainer.id);
        ns.loadFromSupabase(s.trainer.id);
        cs.loadFromSupabase(s.trainer.id);
        ps.loadForTrainer(s.trainer.id);
        os.loadForTrainer(s.trainer.id);
        useMemberRecordStore.getState().loadForTrainer(s.trainer.id);
        useManualSessionStore.getState().loadForTrainer(s.trainer.id);
      } else if (s.gymAdmin) {
        ss.loadGymSlots(s.gymAdmin.gymId);
        ns.loadFromSupabase(s.gymAdmin.id);
        cs.loadFromSupabase(s.gymAdmin.id);
        ps.loadForGym(s.gymAdmin.gymId);
      }
    };
    // 실 트레이너/헬스장 카탈로그 + 공개 후기를 병합(회원·비로그인도 조회). 미설정 시 no-op.
    useTrainerStore.getState().loadFromSupabase();
    useGymStore.getState().loadFromSupabase();
    useReviewStore.getState().loadFromSupabase();
    useFollowStore.getState().loadFromSupabase();
    useCommunityStore.getState().loadContent(); // 커뮤니티 공개 콘텐츠(비로그인 포함)
    (async () => {
      await useAuthStore.getState().restoreSession();
      loadUserData(useAuthStore.getState());
    })();
    // 새 로그인(세션 복원 후 로그인)도 커버 — id가 바뀔 때만 1회 로드
    const authUnsub = useAuthStore.subscribe((s) => loadUserData(s));
    return () => { authUnsub(); inboxUnsub?.(); };
  }, []);

  return (
    <ErrorBoundary>
      <WebFrame>
      <PaperProvider theme={theme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login"   options={{ headerShown: false }} />
          <Stack.Screen name="signup"  options={{ headerShown: false }} />
          <Stack.Screen name="index"   options={{ headerShown: false }} />
          <Stack.Screen name="(member)"  />
          <Stack.Screen name="(trainer)" />
          <Stack.Screen name="(gym)"     />
          <Stack.Screen name="gym/[id]"     options={{ ...detailScreenOptions, title: '헬스장 상세' }} />
          <Stack.Screen name="trainer/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="booking/new"          options={{ headerShown: false }} />
          <Stack.Screen name="booking/consultation" options={{ headerShown: false }} />
          <Stack.Screen name="booking/[id]"         options={{ ...detailScreenOptions, title: '예약 상세' }} />
          <Stack.Screen name="booking/receipt"      options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]"    options={{ headerShown: false }} />
          <Stack.Screen name="user-profile/[userId]" options={{ headerShown: false }} />
          <Stack.Screen name="location-picker" options={{ headerShown: false }} />
          <Stack.Screen name="operator"  options={{ headerShown: false }} />
          <Stack.Screen name="gym-apply" options={{ headerShown: false }} />
          <Stack.Screen name="legal/[doc]" options={{ headerShown: false }} />
        </Stack>
      </PaperProvider>
      </WebFrame>
    </ErrorBoundary>
  );
}

const webStyles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  } as any,
  phone: {
    width: 430,
    maxWidth: '100%' as any,
    flex: 1,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
});
