// 지도 마커 클러스터링.
//
// 카카오의 MarkerClusterer는 kakao.maps.Marker만 받고 CustomOverlay는 받지 않는다.
// 이 앱의 핀은 전부 CustomOverlay(DOM)라 공식 클러스터러를 쓸 수 없어 직접 묶는다.
//
// 위경도가 아니라 **화면 픽셀 좌표**로 묶는 이유: 겹쳐 보이는지는 축척에 따라 달라지므로
// 줌 레벨별 거리 임계값 표를 만들면 레벨마다 어긋난다. 픽셀 격자로 묶으면
// 확대할수록 점 사이가 벌어져 자연히 개별 마커로 풀린다.

/** 화면 픽셀 좌표로 변환된 지점. */
export interface ClusterPoint {
  id: string;
  x: number;
  y: number;
}

export interface Cluster {
  key: string;
  /** 묶인 지점들의 픽셀 좌표 평균 — 다시 위경도로 되돌려 버블 위치로 쓴다. */
  x: number;
  y: number;
  ids: string[];
}

/** 격자 한 칸의 크기(px). 이보다 가까운 핀들은 하나로 묶인다. */
export const CLUSTER_CELL_PX = 64;

/**
 * 픽셀 좌표를 정사각 격자로 나눠 같은 칸에 든 지점끼리 묶는다.
 * 한 칸에 하나뿐이면 ids 길이가 1인 클러스터로 나오므로, 호출부에서 개별 마커로 표시하면 된다.
 */
export function clusterByGrid(points: ClusterPoint[], cellPx: number = CLUSTER_CELL_PX): Cluster[] {
  const cells = new Map<string, ClusterPoint[]>();

  for (const p of points) {
    const key = `${Math.floor(p.x / cellPx)}_${Math.floor(p.y / cellPx)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(p);
    else cells.set(key, [p]);
  }

  const out: Cluster[] = [];
  cells.forEach((members, key) => {
    let sx = 0;
    let sy = 0;
    for (const m of members) {
      sx += m.x;
      sy += m.y;
    }
    out.push({
      key,
      x: sx / members.length,
      y: sy / members.length,
      ids: members.map(m => m.id),
    });
  });
  return out;
}

/** 묶인 개수에 따라 커지는 버블 스타일. 개수가 많을수록 눈에 먼저 들어와야 한다. */
export function clusterBubbleCss(count: number, color: string): string {
  const size = count >= 100 ? 52 : count >= 10 ? 44 : 36;
  const font = count >= 100 ? 15 : count >= 10 ? 14 : 13;
  return [
    `background:${color}`,
    'color:#fff',
    `width:${size}px`,
    `height:${size}px`,
    `border-radius:50%`,
    `font-size:${font}px`,
    'font-weight:700',
    'text-align:center',
    `line-height:${size - 6}px`,
    'cursor:pointer',
    'box-shadow:0 3px 10px rgba(0,0,0,0.3)',
    'border:3px solid rgba(255,255,255,0.75)',
    'user-select:none',
  ].join(';');
}
