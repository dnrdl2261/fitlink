import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import { GeoCoordinate } from '../types';
import { COLORS } from '../utils/constants';
import GymThumb from './GymThumb';

/**
 * 헬스장 상세 히어로 이미지.
 *
 * ⚠️ 공공데이터로 들어온 헬스장 1만6천 곳은 사진이 없다(공공데이터에 사진 항목 자체가 없음).
 *    사진이 없을 때만 좌표로 카카오 로드뷰(건물 외관) → 정적지도 순으로 채우고,
 *    둘 다 안 되면 기존 이니셜 플레이스홀더(GymThumb)로 떨어진다.
 *
 * ⚠️ 목록 썸네일(56~64px)에는 쓰지 말 것 — 그 크기에선 지도가 읽히지 않는 데다
 *    한 화면에 SDK 인스턴스가 수십 개 뜬다. 250px 히어로 전용이다.
 *
 * ⚠️ 이건 헬스장이 올린 사진이 아니라 위치 기반 이미지다. 사진으로 오인하지 않도록
 *    출처 배지를 항상 함께 띄운다(예전 picsum 가짜 사진 문제의 재발 방지).
 */

// 로드뷰 탐색 반경. 넓히면 엉뚱한 골목이 잡히므로 건물 앞 수준으로 제한한다.
const ROADVIEW_RADIUS_M = 50;
const SDK_TIMEOUT_MS = 8000;

const RV_CLASS = 'flowin-rv';
const RV_STYLE_ID = 'flowin-rv-style';

/**
 * 로드뷰 자체 UI(줌 버튼·나침반) 숨김.
 * 히어로는 pointerEvents:none 이라 눌러도 반응하지 않는 장식이 되기 때문.
 * ⚠️ 카카오가 이 컨트롤에 클래스를 안 주고 `_box_util_817` 같은 동적 id만 붙인다 → 접두사로 잡되
 *    반드시 우리 컨테이너(.flowin-rv) 안으로 한정한다. 접두사가 바뀌면 컨트롤이 다시 보일 뿐 깨지진 않는다.
 *    도로명·방위 라벨은 위치 정보라 남긴다.
 */
function injectRoadviewStyle() {
  if (document.getElementById(RV_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = RV_STYLE_ID;
  el.textContent = `.${RV_CLASS} [id^="_box_util_"]{display:none!important}`;
  document.head.appendChild(el);
}

type Source = 'none' | 'roadview' | 'staticmap';

const LABEL: Record<Source, string> = {
  none: '',
  roadview: '카카오 로드뷰',
  staticmap: '카카오맵',
};

// 좌표가 0,0인 헬스장이 남아 있다(테스트 데이터·구 입점분). 그대로 넘기면 바다 한가운데가 뜬다.
function hasValidCoordinate(c?: GeoCoordinate): c is GeoCoordinate {
  return !!c && Math.abs(c.latitude) > 0.01 && Math.abs(c.longitude) > 0.01;
}

function WebHero({ coordinate }: { coordinate: GeoCoordinate }) {
  const wrapperRef = useRef<any>(null);
  const [source, setSource] = useState<Source>('none');

  useEffect(() => {
    const win = window as any;
    let timer: any;
    let cancelled = false;
    const wrapper = wrapperRef.current;

    const init = () => {
      if (cancelled || !wrapper) return;
      const kakao = win.kakao;
      const position = new kakao.maps.LatLng(coordinate.latitude, coordinate.longitude);

      const container = document.createElement('div');
      container.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0';
      wrapper.appendChild(container);

      const showStaticMap = () => {
        if (cancelled) return;
        try {
          new kakao.maps.StaticMap(container, { center: position, level: 3, marker: { position } });
          setSource('staticmap');
        } catch (_) {
          setSource('none'); // 이니셜 플레이스홀더가 그대로 남는다
        }
      };

      try {
        // 로드뷰가 없는 곳(골목 안쪽 등)이 흔하다. panoId가 null이면 지도로 떨어진다.
        new kakao.maps.RoadviewClient().getNearestPanoId(position, ROADVIEW_RADIUS_M, (panoId: number | null) => {
          if (cancelled) return;
          if (!panoId) { showStaticMap(); return; }
          try {
            injectRoadviewStyle();
            container.classList.add(RV_CLASS);
            new kakao.maps.Roadview(container).setPanoId(panoId, position);
            setSource('roadview');
          } catch (_) {
            showStaticMap();
          }
        });
      } catch (_) {
        showStaticMap();
      }
    };

    // SDK는 index.html에서 autoload=false로 심긴다(scripts/patch-html.js). 지도 화면과 동일한 대기 패턴.
    if (win.kakao?.maps) {
      win.kakao.maps.load(init);
    } else {
      let elapsed = 0;
      timer = setInterval(() => {
        elapsed += 100;
        if (win.kakao?.maps) { clearInterval(timer); win.kakao.maps.load(init); }
        else if (elapsed >= SDK_TIMEOUT_MS) { clearInterval(timer); } // 조용히 플레이스홀더 유지
      }, 100);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (wrapper) wrapper.innerHTML = '';
    };
  }, [coordinate.latitude, coordinate.longitude]);

  return (
    <>
      {/* pointerEvents none — 로드뷰는 기본이 드래그 가능이라 상세 화면 스크롤을 잡아먹는다. */}
      <View ref={wrapperRef} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
      {source !== 'none' && (
        <View style={s.badge} pointerEvents="none">
          <Text style={s.badgeText}>{LABEL[source]}</Text>
        </View>
      )}
    </>
  );
}

export default function GymHeroPhoto({
  name,
  uri,
  coordinate,
  style,
}: {
  name: string;
  uri?: string;
  coordinate?: GeoCoordinate;
  style?: StyleProp<ViewStyle & ImageStyle>;
}) {
  // 실제 사진이 있으면 그것이 우선. 위치 이미지는 사진이 없을 때만.
  const useLocationImage = !uri && Platform.OS === 'web' && hasValidCoordinate(coordinate);

  if (!useLocationImage) {
    return <GymThumb name={name} uri={uri} size={250} radius={0} style={style} />;
  }

  return (
    <View style={[s.wrap, style]}>
      {/* 로드뷰·지도가 뜨기 전(그리고 실패했을 때)의 바탕. 회색 빈 상자가 보이지 않게 항상 깔아 둔다. */}
      <GymThumb name={name} size={250} radius={0} style={StyleSheet.absoluteFillObject} />
      <WebHero coordinate={coordinate} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden' },
  badge: {
    position: 'absolute', left: 10, bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
