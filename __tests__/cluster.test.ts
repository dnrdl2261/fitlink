import { clusterByGrid, clusterBubbleCss, CLUSTER_CELL_PX, ClusterPoint } from '../utils/cluster';

const p = (id: string, x: number, y: number): ClusterPoint => ({ id, x, y });

describe('마커 클러스터링', () => {
  test('같은 격자 칸의 지점은 하나로 묶인다', () => {
    const out = clusterByGrid([p('a', 10, 10), p('b', 20, 20), p('c', 30, 30)], 100);
    expect(out).toHaveLength(1);
    expect(out[0].ids.sort()).toEqual(['a', 'b', 'c']);
  });

  test('칸이 다르면 따로 나온다', () => {
    const out = clusterByGrid([p('a', 10, 10), p('b', 300, 300)], 100);
    expect(out).toHaveLength(2);
    expect(out.every(c => c.ids.length === 1)).toBe(true);
  });

  test('확대해 점 간격이 벌어지면 묶임이 풀린다', () => {
    const near = [p('a', 100, 100), p('b', 130, 100)];
    expect(clusterByGrid(near, 100)).toHaveLength(1);

    // 같은 두 지점을 4배 확대한 좌표 — 이제 칸이 갈린다
    const far = [p('a', 400, 400), p('b', 520, 400)];
    expect(clusterByGrid(far, 100)).toHaveLength(2);
  });

  test('버블 위치는 묶인 지점들의 평균', () => {
    const out = clusterByGrid([p('a', 0, 0), p('b', 40, 80)], 100);
    expect(out[0].x).toBe(20);
    expect(out[0].y).toBe(40);
  });

  test('음수 좌표(화면 밖)도 칸이 갈린다 — 0 근처가 한 칸으로 뭉치지 않는다', () => {
    const out = clusterByGrid([p('a', -150, 0), p('b', 150, 0)], 100);
    expect(out).toHaveLength(2);
  });

  test('빈 입력은 빈 배열', () => {
    expect(clusterByGrid([], 100)).toEqual([]);
  });

  test('기본 칸 크기가 적용된다', () => {
    const out = clusterByGrid([p('a', 0, 0), p('b', CLUSTER_CELL_PX * 2, 0)]);
    expect(out).toHaveLength(2);
  });

  test('모든 지점이 정확히 한 클러스터에만 속한다', () => {
    const pts = Array.from({ length: 50 }, (_, i) => p(`g${i}`, (i * 37) % 500, (i * 91) % 500));
    const ids = clusterByGrid(pts, 64).flatMap(c => c.ids);
    expect(ids).toHaveLength(50);
    expect(new Set(ids).size).toBe(50);
  });
});

describe('클러스터 버블 스타일', () => {
  test('묶인 수가 많을수록 커진다', () => {
    const size = (css: string) => Number(css.match(/width:(\d+)px/)![1]);
    expect(size(clusterBubbleCss(3, '#000'))).toBeLessThan(size(clusterBubbleCss(30, '#000')));
    expect(size(clusterBubbleCss(30, '#000'))).toBeLessThan(size(clusterBubbleCss(300, '#000')));
  });

  test('전달한 색을 배경으로 쓴다', () => {
    expect(clusterBubbleCss(5, '#FF6B6B')).toContain('background:#FF6B6B');
  });
});
