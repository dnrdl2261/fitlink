import { Tabs, useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useChatStore } from '../../store/chatStore';

const PRIMARY = '#4F63F5';
const ERROR   = '#EF4444';

const TAB_BAR = {
  backgroundColor: '#ffffff',
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: '#e5e7eb',
  height: 90,
};

// 진입 출처에 따라 뒤로가기 목적지 결정 (홈에서 왔으면 홈, 아니면 내정보)
function BackToMoreBtn() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const target = from === 'home' ? '/(trainer)/' : '/(trainer)/more';
  return (
    <TouchableOpacity
      onPress={() => router.navigate(target as any)}
      style={{ paddingLeft: 16, paddingRight: 8 }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <MaterialCommunityIcons name="chevron-left" size={28} color={PRIMARY} />
    </TouchableOpacity>
  );
}

function TrainerBellBtn({ userId, color }: { userId: string; color: string }) {
  const router = useRouter();
  const unread = useNotificationStore((s) => s.getUnread(userId));
  return (
    <TouchableOpacity
      onPress={() => router.push('/(trainer)/notifications' as any)}
      style={{ paddingRight: 16, paddingLeft: 8 }}
    >
      <View style={{ position: 'relative' }}>
        <MaterialCommunityIcons name="bell-outline" size={24} color={color} />
        {unread > 0 && (
          <View style={{
            position: 'absolute', top: -3, right: -5,
            backgroundColor: ERROR, borderRadius: 8,
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

export default function TrainerLayout() {
  const { isLoggedIn, trainer } = useAuthStore();
  const unread = useChatStore((s) => s.getUnreadTotal(trainer?.id ?? ''));
  if (!isLoggedIn) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: '#c7c7cc',
        tabBarStyle: TAB_BAR,
        tabBarItemStyle: { justifyContent: 'flex-start', paddingTop: 9 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        headerStyle: { backgroundColor: '#EEF2F9' },
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#0F172A' },
        headerShadowVisible: false,
      }}
    >
      {/* ── 5개 메인 탭 ── */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color }) => <TabIcon name="view-dashboard-outline" color={color} />,
          headerTitle: 'FLOWIN 트레이너',
          headerRight: () => <TrainerBellBtn userId={trainer?.id ?? ''} color={PRIMARY} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarLabel: '일정',
          tabBarIcon: ({ color }) => <TabIcon name="calendar-month-outline" color={color} />,
          headerTitle: '일정 관리',
          headerLeft: () => <BackToMoreBtn />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          tabBarLabel: '회원',
          tabBarIcon: ({ color }) => <TabIcon name="account-group-outline" color={color} />,
          headerShown: false,
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
          tabBarIcon: ({ color }) => <TabIcon name="cog-outline" color={color} />,
          headerTitle: '설정',
        }}
      />

      {/* ── 숨김 탭 (탭바에 미표시) ── */}
      <Tabs.Screen name="map"      options={{ href: null, headerTitle: '헬스장 찾기' }} />
      <Tabs.Screen name="earnings" options={{ href: null, headerTitle: '매출 관리', headerLeft: () => <BackToMoreBtn /> }} />
      <Tabs.Screen name="community" options={{ href: null, headerTitle: '커뮤니티', headerLeft: () => <BackToMoreBtn /> }} />
      <Tabs.Screen name="manage"   options={{ href: null, headerTitle: '예약·세션 관리', headerLeft: () => <BackToMoreBtn /> }} />

      <Tabs.Screen name="community-post"        options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-write"       options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-group"       options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="community-group-write" options={{ href: null, headerShown: false }} />
      <Tabs.Screen
        name="community-story"
        options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }}
      />

      <Tabs.Screen name="slots"        options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="profile"      options={{ href: null, headerTitle: '내 프로필', headerLeft: () => <BackToMoreBtn /> }} />
      <Tabs.Screen name="edit-profile" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="partner-gyms" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="slot-add"     options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="package-manage" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="gym-book-pay"   options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="my-slot-bookings" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="member-detail"  options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications"  options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="safety"         options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="support"        options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="gym-list"       options={{ href: null, headerTitle: '헬스장 목록', headerLeft: () => <BackToMoreBtn /> }} />
    </Tabs>
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
          backgroundColor: ERROR, borderRadius: 8,
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
