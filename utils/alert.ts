import { Alert, Platform } from 'react-native';

// RN-Web은 Alert.alert가 표시되지 않는다. 웹에선 window.alert/confirm으로 분기.
// (단순 알림은 notify, 확인 다이얼로그는 confirmDialog 사용.)

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function confirmDialog(opts: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined'
      ? window.confirm(opts.message ? `${opts.title}\n\n${opts.message}` : opts.title)
      : false;
    if (ok) opts.onConfirm();
    else opts.onCancel?.();
  } else {
    Alert.alert(opts.title, opts.message, [
      { text: opts.cancelText ?? '취소', style: 'cancel', onPress: opts.onCancel },
      { text: opts.confirmText ?? '확인', style: opts.destructive ? 'destructive' : 'default', onPress: opts.onConfirm },
    ]);
  }
}
