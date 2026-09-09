import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * 아래로 스크롤하면 상단 고정 영역을 위로 밀어 숨기고, 위로 스크롤하면 다시 내린다.
 *
 * height가 바뀌면(탭 전환으로 칩 줄이 사라지는 등) 다시 보이는 상태로 초기화한다.
 *
 * ⚠️ useNativeDriver: true는 웹에서 동작하지 않으므로 false로 둔다.
 */
export function useHideOnScroll(height: number) {
  const translateY = useRef(new Animated.Value(0)).current;
  const hidden = useRef(false);
  const lastY = useRef(0);

  useEffect(() => {
    hidden.current = false;
    lastY.current = 0;
    translateY.setValue(0);
  }, [height, translateY]);

  const slideTo = (to: number) => {
    Animated.timing(translateY, {
      toValue: to,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const onScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastY.current;
    lastY.current = y;

    // 맨 위로 돌아오면 항상 보인다
    if (y <= 0) {
      if (hidden.current) { hidden.current = false; slideTo(0); }
      return;
    }
    // 손가락 떨림으로 깜빡이지 않게 6px 이상 움직일 때만 반응
    if (dy > 6 && !hidden.current) { hidden.current = true; slideTo(-height); }
    else if (dy < -6 && hidden.current) { hidden.current = false; slideTo(0); }
  };

  return { translateY, onScroll };
}
