import { Tabs, useRouter, useGlobalSearchParams, Redirect } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useLocationStore } from '../../store/locationStore';
import { useNotificationStore } from '../../store/notificationStore';
import NotificationToast from '../../components/NotificationToast';
import OfferExpiryReminder from '../../components/OfferExpiryReminder';

function LocationHeader() {
  const router = useRouter();
  const selectedDong = useLocationStore((s) => s.selectedDong);
  return (
    <TouchableOpacity
      onPress={() => router.push('/location-picker' as any)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text }}>
        {selectedDong || '위치 설정'}
      </Text>
      <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.text} />
    </TouchableOpacity>
  );
}

// height를 크게 잡고 paddingBottom을 '안전 버퍼'로 사용
// → 브라우저 하단 UI 크롬이 30px를 가려도 아이콘/라벨은 위쪽에 배치되어 보임
// 핵심: justifyContent:'flex-start' + paddingTop으로 아이콘·라벨을 상단에 배치
// → 브라우저 하단 크롬이 아무리 가려도 콘텐츠는 이미 위쪽에 있어 잘리지 않음
const TAB_BAR = {
  backgroundColor: '#ffffff',
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: '#e5e7eb',
  height: 90,
};

function BackBtn({ color }: { color: string }) {
  const router = useRouter();
  // 탭에서 router.back()은 항상 홈으로 가버리므로, 진입 출처(from)로 분기.
  // 레이아웃 헤더에선 useLocalSearchParams가 안 잡혀 useGlobalSearchParams(URL 전역)로 읽는다.
  const { from } = useGlobalSearchParams<{ from?: string }>();
  const target = from === 'home' ? '/(member)/trainers' : '/(member)/more';
  return (
    <TouchableOpacity onPress={() => router.navigate(target as any)} style={{ paddingLeft: 20, paddingRight: 8 }}>
      <Text style={{ fontSize: 34, fontWeight: '300', color }}>‹</Text>
    </TouchableOpacity>
  );
}

function BellBtn({ userId, color }: { userId: string; color: string }) {
  const router = useRouter();
  const unread = useNotificationStore((s) => s.getUnread(userId));
  return (
    <TouchableOpacity
      onPress={() => router.push('/(member)/notifications' as any)}
      style={{ paddingRight: 16, paddingLeft: 8 }}
    >
      <View style={{ position: 'relative' }}>
        <MaterialCommunityIcons name="bell-outline" size={24} color={color} />
        {unread > 0 && (
          <View style={{
            position: 'absolute', top: -3, right: -5,
            backgroundColor: COLORS.error, borderRadius: 8,
            minWidth: 16, height: 16,
            alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
          }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>
              {unread > 9 ? '9+' : unread}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MemberLayout() {
  const { isLoggedIn, role, member } = useAuthStore();
  const unread = useChatStore((s) => s.getUnreadTotal(member?.id ?? ''));

  if (!isLoggedIn) return null;
  // 역할 가드: 다른 역할이 직접 진입(딥링크) 시 본인 역할 그룹으로 리다이렉트
  if (role !== 'member') {
    return <Redirect href={(role === 'trainer' ? '/(trainer)' : role === 'gym_admin' ? '/(gym)/bookings' : '/login') as any} />;
  }

  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#c7c7cc',
        tabBarStyle: TAB_BAR,
        tabBarItemStyle: { justifyContent: 'flex-start', paddingTop: 9 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: COLORS.text },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="trainers"
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          headerTitle: () => <LocationHeader />,
          headerRight: () => <BellBtn userId={member?.id ?? ''} color={COLORS.primary} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarLabel: '헬스장',
          tabBarIcon: ({ color }) => <TabIcon name="map-marker" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarLabel: '커뮤니티',
          tabBarIcon: ({ color }) => <TabIcon name="account-group" color={color} />,
          headerTitle: '커뮤니티',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: '채팅',
          tabBarIcon: ({ color }) => <TabIconBadge name="message" color={color} badge={unread} />,
          headerTitle: '채팅',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarLabel: '내정보',
          tabBarIcon: ({ color }) => <TabIcon name="account" color={color} />,
          headerTitle: '내 정보',
        }}
      />
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          href: null,
          headerTitle: '내 예약',
          headerLeft: () => <BackBtn color={COLORS.primary} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          headerTitle: '내 프로필',
          headerLeft: () => <BackBtn color={COLORS.primary} />,
        }}
      />
      <Tabs.Screen name="edit-profile" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-post" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-group" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-write" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-group-write" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-story" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="my-packages" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="trainer-list" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="custom-plan" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="safety"        options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="support"       options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="workout-log"   options={{ href: null, headerShown: false }} />
    </Tabs>
    <NotificationToast userId={member?.id ?? ''} route="/(member)/notifications" />
    <OfferExpiryReminder userId={member?.id ?? ''} />
    </>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  return <MaterialCommunityIcons name={name as any} size={24} color={color} />;
}

function TabIconBadge({ name, color, badge }: { name: string; color: string; badge: number }) {
  return (
    <View style={{ position: 'relative' }}>
      <MaterialCommunityIcons name={name as any} size={24} color={color} />
      {badge > 0 && (
        <View style={{
          position: 'absolute', top: -3, right: -7,
          backgroundColor: COLORS.error, borderRadius: 8,
          minWidth: 16, height: 16,
          alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
        }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}
