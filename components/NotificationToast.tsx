import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotificationStore, Notification } from '../store/notificationStore';
import { COLORS } from '../utils/constants';

// 메시지 알림처럼 상단에 잠깐 떴다 사라지는 알림 배너.
// 앱 진입 시 최신 안 읽은 알림 1건 + 이후 새 알림이 오면 표시한다.
export default function NotificationToast({ userId, route }: { userId: string; route: string }) {
  const notifications = useNotificationStore((s) => s.notifications);
  const router = useRouter();
  const [toast, setToast] = useState<Notification | null>(null);
  const slide = useRef(new Animated.Value(-140)).current;
  const seenRef = useRef<string | null>(null);
  const initRef = useRef(false);
  const hideTimer = useRef<any>(null);

  const latest = notifications.find((n) => n.userId === userId) ?? null;

  useEffect(() => {
    if (!latest || !userId) return;
    if (!initRef.current) {
      initRef.current = true;
      seenRef.current = latest.id;
      if (!latest.isRead) setToast(latest); // 진입 시 최신 안읽은 알림 1건
      return;
    }
    if (latest.id === seenRef.current) return;
    seenRef.current = latest.id;
    if (!latest.isRead) setToast(latest); // 새 알림 도착
  }, [latest?.id, userId]);

  useEffect(() => {
    if (!toast) return;
    Animated.spring(slide, { toValue: 0, useNativeDriver: false, bounciness: 7, speed: 12 }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(slide, { toValue: -140, duration: 250, useNativeDriver: false }).start(() => setToast(null));
    }, 3800);
    return () => clearTimeout(hideTimer.current);
  }, [toast]);

  if (!toast) return null;

  const open = () => {
    clearTimeout(hideTimer.current);
    setToast(null);
    router.push(route as any);
  };

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slide }] }]} pointerEvents="box-none">
      <TouchableOpacity activeOpacity={0.9} onPress={open} style={styles.card}>
        <Animated.View style={styles.iconBox}>
          <MaterialCommunityIcons name="bell-ring" size={20} color="#fff" />
        </Animated.View>
        <Animated.View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          <Text style={styles.body} numberOfLines={1}>{toast.body}</Text>
        </Animated.View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
    paddingTop: 12, paddingHorizontal: 12,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 10,
  },
  iconBox: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  body: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
});
