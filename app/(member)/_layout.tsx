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

// height 미지정 = react-navigation 기본값(49px + 하단 세이프에어리어).
// 고정 height를 주면 세이프에어리어가 더해지지 않고 그 높이 안쪽 여백으로 깎여
// 홈 인디케이터가 있는 기기에서 아이콘이 잘린다.
// 브라우저 하단 UI 크롬 대응은 patch-html.js의 100dvh / viewport-fit=cover가 담당.
const TAB_BAR = {
  backgroundColor: '#ffffff',
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: '#e5e7eb',
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
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `알림, 읽지 않음 ${unread}건` : '알림'}
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
        tabBarShowLabel: false,
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
          tabBarAccessibilityLabel: '홈',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          headerTitle: () => <LocationHeader />,
          headerRight: () => <BellBtn userId={member?.id ?? ''} color={COLORS.primary} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarLabel: '헬스장',
          tabBarAccessibilityLabel: '헬스장',
          tabBarIcon: ({ color }) => <TabIcon name="map-marker" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarLabel: '커뮤니티',
          tabBarAccessibilityLabel: '커뮤니티',
          tabBarIcon: ({ color }) => <TabIcon name="account-group" color={color} />,
          headerTitle: '커뮤니티',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: '채팅',
          tabBarAccessibilityLabel: '채팅',
          tabBarIcon: ({ color }) => <TabIconBadge name="message" color={color} badge={unread} />,
          headerTitle: '채팅',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarLabel: '내정보',
          tabBarAccessibilityLabel: '내정보',
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
