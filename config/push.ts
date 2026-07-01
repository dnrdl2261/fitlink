// 푸시 알림 (네이티브) — expo-notifications.
// 웹은 push.web.ts(no-op)가 Metro 플랫폼 확장자로 이 파일을 대체한다.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// 포그라운드에서도 알림 배너/목록/소리 표시.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 기기의 Expo push token 획득(권한 요청 포함). 실기기 아니거나 권한 거부 시 null.
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data; // ExponentPushToken[...]
  } catch {
    return null;
  }
}
