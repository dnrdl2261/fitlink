import React from 'react';
import { View, Text, Image, StyleSheet, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import { COLORS } from '../utils/constants';

/**
 * 헬스장 썸네일. 사진이 없으면 이름 이니셜로 채운다.
 *
 * ⚠️ 공공데이터로 들어온 헬스장(전국 1만6천 곳)은 사진이 없다. 회색 빈 사각형을 그대로 두면
 *    목록 전체가 고장 난 것처럼 보이므로, 이름 기반 플레이스홀더로 채운다.
 *    사진은 사장님이 입점(claim)한 뒤에 채워진다.
 */

import { colorFor, initialsOf } from '../utils/gymThumb';

export default function GymThumb({
  name,
  uri,
  size = 56,
  radius = 10,
  style,
}: {
  name: string;
  uri?: string;
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle & ImageStyle>;
}) {
  if (uri) {
    return <Image source={{ uri }} style={[{ width: size, height: size, borderRadius: radius, backgroundColor: COLORS.border }, style]} />;
  }
  const bg = colorFor(name || '');
  return (
    <View
      style={[
        s.ph,
        { width: size, height: size, borderRadius: radius },
        style,
        // ⚠️ 배경색은 style 뒤에 둔다. 호출부 스타일에 backgroundColor(회색 등)가 있으면
        //    플레이스홀더 색이 덮여 회색 상자로 보인다(gym/[id] 히어로에서 실제로 발생).
        { backgroundColor: bg },
      ]}
      accessibilityLabel={`${name} 사진 없음`}
    >
      <Text style={[s.txt, { fontSize: Math.max(12, Math.round(size * 0.38)) }]} numberOfLines={1}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  ph: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  txt: { color: '#fff', fontWeight: '800' },
});
