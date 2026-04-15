import { Tabs } from 'expo-router';
import { COLORS } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';

export default function MemberLayout() {
  const { isLoggedIn } = useAuthStore();

  if (!isLoggedIn) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 4,
          height: 60,
        },
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '700', color: COLORS.text },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarLabel: '홈',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} active={color === COLORS.primary} />,
          headerTitle: 'FollowFit',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '지도',
          tabBarLabel: '지도',
          tabBarIcon: ({ color }) => <TabIcon emoji="🗺️" color={color} active={color === COLORS.primary} />,
          headerTitle: '지도로 보기',
        }}
      />
      <Tabs.Screen
        name="trainers"
        options={{
          title: '트레이너',
          tabBarLabel: '트레이너',
          tabBarIcon: ({ color }) => <TabIcon emoji="💪" color={color} active={color === COLORS.primary} />,
          headerTitle: '트레이너 찾기',
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: '예약',
          tabBarLabel: '예약',
          tabBarIcon: ({ color }) => <TabIcon emoji="📅" color={color} active={color === COLORS.primary} />,
          headerTitle: '내 예약',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarLabel: '프로필',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} active={color === COLORS.primary} />,
          headerTitle: '내 프로필',
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, active }: { emoji: string; color: string; active: boolean }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 22, opacity: active ? 1 : 0.4 }}>{emoji}</Text>;
}
