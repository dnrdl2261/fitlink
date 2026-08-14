import React from 'react';
import { View, Text, Image, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { colorFor, initialsOf } from '../utils/gymThumb';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size: number;
  /** 기본은 원형. 사각 썸네일이 필요하면 지정한다. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * 사람 프로필 아바타. 사진이 없으면 회색 아이콘 대신 이름 이니셜을 보여준다.
 * 색·이니셜 규칙은 헬스장 썸네일(GymThumb)과 공유한다 — 같은 이름이면 항상 같은 색.
 */
export default function Avatar({ uri, name = '', size, radius, style }: AvatarProps) {
  const r = radius ?? size / 2;

  if (uri) {
    // 호출부는 View용 스타일(테두리·마진 등)을 넘기므로 Image 스타일로 좁혀 준다.
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: r }, style as StyleProp<ImageStyle>]}
      />
    );
  }

  return (
    <View
      // ⚠️ 배경색은 style 뒤에 둔다. 앞에 두면 호출부의 회색 배경이 덮어써 빈 회색 원이 된다.
      style={[
        { width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' },
        style,
        { backgroundColor: colorFor(name) },
      ]}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: Math.round(size * 0.42) }}>
        {initialsOf(name, '?')}
      </Text>
    </View>
  );
}
