import { Tabs } from 'expo-router';
import { COLORS } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';

export default function TrainerLayout() {
  const { isLoggedIn } = useAuthStore();

  if (!isLoggedIn) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.secondary,
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
          tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} active={color === COLORS.secondary} />,
          headerTitle: 'FitLink 트레이너',
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarLabel: '스케줄',
          tabBarIcon: ({ color }) => <TabIcon emoji="📅" color={color} active={color === COLORS.secondary} />,
          headerTitle: '스케줄 관리',
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          tabBarLabel: '수익',
          tabBarIcon: ({ color }) => <TabIcon emoji="💰" color={color} active={color === COLORS.secondary} />,
          headerTitle: '수익 현황',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: '내 프로필',
          tabBarIcon: ({ color }) => <TabIcon emoji="💪" color={color} active={color === COLORS.secondary} />,
          headerTitle: '트레이너 프로필',
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, active }: { emoji: string; color: string; active: boolean }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 22, opacity: active ? 1 : 0.4 }}>{emoji}</Text>;
}
