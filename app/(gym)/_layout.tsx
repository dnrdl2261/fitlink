import { Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useNotificationStore } from '../../store/notificationStore';
import { MOCK_GYMS } from '../../data/gyms';

const PRETENDARD = "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif";

const TAB_BAR = {
  backgroundColor: '#ffffff',
  borderTopWidth: 1,
  borderTopColor: '#e5e7eb',
  height: 90,
};

function BackBtn({ color }: { color: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.navigate('/(gym)/more' as any)} style={{ paddingLeft: 20, paddingRight: 8 }}>
      <Text style={{ fontSize: 34, fontWeight: '300', color }}>‹</Text>
    </TouchableOpacity>
  );
}

function BackToHomeBtn({ color }: { color: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.navigate('/(gym)/bookings' as any)} style={{ paddingLeft: 20, paddingRight: 8 }}>
      <Text style={{ fontSize: 34, fontWeight: '300', color }}>‹</Text>
    </TouchableOpacity>
  );
}

function ScheduleBtn({ color }: { color: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push('/(gym)/schedule' as any)}
      style={{ paddingRight: 6, paddingLeft: 8 }}
    >
      <MaterialCommunityIcons name="calendar-month-outline" size={24} color={color} />
    </TouchableOpacity>
  );
}

function GymBellBtn({ userId, color }: { userId: string; color: string }) {
  const router = useRouter();
  const unread = useNotificationStore((s) => s.getUnread(userId));
  return (
    <TouchableOpacity
      onPress={() => router.push('/(gym)/notifications' as any)}
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

export default function GymLayout() {
  const { isLoggedIn, gymAdmin } = useAuthStore();
  const unread = useChatStore((s) => s.getUnreadTotal(gymAdmin?.id ?? ''));
  const gym = MOCK_GYMS.find((g) => g.id === gymAdmin?.gymId);

  if (!isLoggedIn) return null;

  return (
    <View style={{ flex: 1, ...(Platform.OS === 'web' ? { fontFamily: PRETENDARD } : {}) }}>
    <Tabs
      initialRouteName="bookings"
      screenOptions={{
        tabBarActiveTintColor: '#4F63F5',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: TAB_BAR,
        tabBarItemStyle: { justifyContent: 'flex-start', paddingTop: 9 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2, fontFamily: PRETENDARD },
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#0F172A', fontFamily: PRETENDARD },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="bookings"
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          headerTitle: 'FLOWIN 관리자',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ScheduleBtn color={COLORS.gym} />
              <GymBellBtn userId={gymAdmin?.id ?? ''} color={COLORS.gym} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarLabel: '헬스장',
          tabBarIcon: ({ color }) => <TabIcon name="map-marker" color={color} />,
          headerTitle: '주변 헬스장',
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
        name="dashboard"
        options={{
          href: null,
          headerTitle: '운영 현황',
          headerLeft: () => <BackBtn color={COLORS.gym} />,
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          href: null,
          headerTitle: '시설 설정',
          headerLeft: () => <BackBtn color={COLORS.gym} />,
        }}
      />
      <Tabs.Screen
        name="trainers"
        options={{
          href: null,
          headerTitle: '트레이너 관리',
          headerLeft: () => <BackBtn color={COLORS.gym} />,
        }}
      />
      <Tabs.Screen
        name="blacklist"
        options={{
          href: null,
          headerTitle: '블랙리스트',
          headerLeft: () => <BackBtn color={COLORS.gym} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          headerTitle: '헬스장 프로필',
          headerLeft: () => <BackBtn color={COLORS.gym} />,
        }}
      />
      <Tabs.Screen name="edit-profile" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-post" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-group" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-write" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-group-write" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-story" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen
        name="schedule"
        options={{
          href: null,
          headerTitle: '헬스장 이용 예약',
          headerLeft: () => <BackToHomeBtn color={COLORS.gym} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          href: null,
          headerTitle: '수익 관리',
          headerLeft: () => <BackBtn color={COLORS.gym} />,
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
    </Tabs>
    </View>
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
