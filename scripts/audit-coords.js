/**
 * 보정된 좌표 전수 검증.
 *   1) 같은 동(洞)에 속한 헬스장끼리 좌표가 뭉치는지 확인 → 동떨어진 행을 이상치로 표시
 *   2) 같은 도로명 건물번호끼리 좌표가 일치하는지 확인
 * 외부 API 없이 데이터 내부 정합성만으로 잘못된 행을 찾는다.
 *
 *   node scripts/audit-coords.js --csv scripts/data/busan_fitness.csv
 */
const fs = require('fs');
const proj4 = require('proj4');

const EPSG5174 =
  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs ' +
  '+towgs84=-146.43,507.89,681.46';
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

function parseCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
}

const m = (deg) => deg * 111000;
const distM = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180;
  const x = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const median = (v) => { const s = [...v].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };

const args = process.argv.slice(2);
const csvPath = args[args.indexOf('--csv') + 1];

const txt = new TextDecoder('euc-kr').decode(fs.readFileSync(csvPath));
const lines = txt.split(/\r?\n/).filter((l) => l.trim());
const H = parseCsvLine(lines[0]);
const c = (n) => H.indexOf(n);
const iOrg = c('개방자치단체코드'), iMgt = c('관리번호'), iSt = c('영업상태명');
const iName = c('사업장명'), iRoad = c('도로명주소'), iJibun = c('지번주소');
const iX = c('좌표정보(X)'), iY = c('좌표정보(Y)');

const rows = [];
const seen = new Set();
for (const line of lines.slice(1)) {
  const r = parseCsvLine(line);
  if (r[iSt] !== '영업/정상') continue;
  const name = (r[iName] || '').trim();
  if (!name) continue;
  const xs = (r[iX] || '').trim(), ys = (r[iY] || '').trim();
  if (!xs || !ys) continue;
  const x = Number(xs), y = Number(ys);
  if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
  const [lng, lat] = proj4(EPSG5174, WGS84, [x, y]);
  const id = `ld_${(r[iOrg] || '').trim()}_${(r[iMgt] || '').trim()}`;
  if (seen.has(id)) continue;
  seen.add(id);

  const road = (r[iRoad] || '').trim();
  const jibun = (r[iJibun] || '').trim();
  // 지번주소에서 구·동 추출
  const parts = (jibun || road).split(/\s+/);
  const sido = parts[0] || '';
  const gu = parts[1] || '';
  const dong = parts[2] || '';
  // 도로명 + 건물번호 (호수 제외) = 같은 건물 판별 키
  const bld = road.replace(/,.*$/, '').replace(/\s*\([^)]*\)\s*/g, '').trim();
  rows.push({ id, name, sido, gu, dong, bld, road, jibun, lat, lng });
}

console.log(`검증 대상: ${rows.length}건\n`);

// ── 1) 같은 건물(도로명+건물번호)인데 좌표가 다른 경우 ────────────
const byBld = {};
rows.forEach((r) => { if (r.bld) (byBld[r.bld] = byBld[r.bld] || []).push(r); });
const bldIssues = [];
Object.entries(byBld).forEach(([bld, list]) => {
  if (list.length < 2) return;
  const cLat = median(list.map((r) => r.lat)), cLng = median(list.map((r) => r.lng));
  list.forEach((r) => {
    const d = distM(r.lat, r.lng, cLat, cLng);
    if (d > 150) bldIssues.push({ ...r, d: Math.round(d), bld });
  });
});
console.log(`[1] 같은 건물인데 좌표가 150m 이상 어긋난 행: ${bldIssues.length}건`);
bldIssues.sort((a, b) => b.d - a.d).slice(0, 10)
  .forEach((r) => console.log(`    ${String(r.d).padStart(5)}m  ${r.name.slice(0, 18).padEnd(20)} ${r.bld}`));

// ── 2) 같은 동(洞) 안에서 크게 벗어난 행 ─────────────────────────
const byDong = {};
rows.forEach((r) => { if (r.gu && r.dong) { const k = `${r.sido} ${r.gu} ${r.dong}`; (byDong[k] = byDong[k] || []).push(r); } });
const dongIssues = [];
Object.entries(byDong).forEach(([key, list]) => {
  if (list.length < 4) return; // 표본이 적으면 중앙값이 불안정
  const cLat = median(list.map((r) => r.lat)), cLng = median(list.map((r) => r.lng));
  list.forEach((r) => {
    const d = distM(r.lat, r.lng, cLat, cLng);
    if (d > 2500) dongIssues.push({ ...r, d: Math.round(d), key });
  });
});
console.log(`\n[2] 같은 동 중심에서 2.5km 이상 떨어진 행: ${dongIssues.length}건`);
dongIssues.sort((a, b) => b.d - a.d).slice(0, 15)
  .forEach((r) => console.log(`    ${String(r.d).padStart(6)}m  ${r.key.padEnd(14)} ${r.name.slice(0, 16).padEnd(18)} ${r.road || r.jibun}`));

// ── 3) 부산 경계 밖 ──────────────────────────────────────────────
const outside = rows.filter((r) => !(r.lat > 33 && r.lat < 38.7 && r.lng > 124.5 && r.lng < 131.9));
console.log(`\n[3] 대한민국 경계 밖 좌표: ${outside.length}건`);
outside.slice(0, 10).forEach((r) => console.log(`    ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}  ${r.name} | ${r.road || r.jibun}`));

const suspect = new Set([...bldIssues, ...dongIssues, ...outside].map((r) => r.id));
console.log(`\n─────────────────────────────`);
console.log(`이상 의심 행 합계: ${suspect.size}건 / ${rows.length}건 (${(suspect.size / rows.length * 100).toFixed(1)}%)`);
fs.writeFileSync('scripts/data/_suspect.json',
  JSON.stringify(rows.filter((r) => suspect.has(r.id)), null, 1), 'utf8');
console.log('→ scripts/data/_suspect.json 에 저장(외부 대조용)');
