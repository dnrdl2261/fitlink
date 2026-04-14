import { Tabs } from 'expo-router';
import { COLORS } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';

export default function GymLayout() {
  const { isLoggedIn } = useAuthStore();

  if (!isLoggedIn) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.gym,
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
          tabBarLabel: '대시보드',
          tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} active={color === COLORS.gym} />,
          headerTitle: 'FitLink 헬스장',
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          tabBarLabel: '예약 관리',
          tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} active={color === COLORS.gym} />,
          headerTitle: '예약 현황',
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          tabBarLabel: '시설 설정',
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} active={color === COLORS.gym} />,
          headerTitle: '시설 설정',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: '헬스장 정보',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏋️" color={color} active={color === COLORS.gym} />,
          headerTitle: '헬스장 프로필',
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, active }: { emoji: string; color: string; active: boolean }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 22, opacity: active ? 1 : 0.4 }}>{emoji}</Text>;
}
