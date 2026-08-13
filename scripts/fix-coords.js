/**
 * 이미 적재된 공공데이터 헬스장의 좌표만 수정하는 UPDATE SQL 생성기.
 *
 *   node scripts/fix-coords.js --csv scripts/data/busan_fitness.csv --out scripts/data/fix_coords.sql
 *
 * 전체 행을 다시 INSERT 하지 않고 lat/lng 만 갱신하므로 파일이 작고 문법이 단순하다.
 * (좌표계 towgs84 값을 바로잡아 재계산한 값을 넣는다 — import-gyms.js 와 같은 정의를 쓴다)
 */
const fs = require('fs');
const proj4 = require('proj4');

const EPSG5174 =
  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs ' +
  '+towgs84=-146.43,507.89,681.46';
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const args = process.argv.slice(2);
const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const csvPath = get('--csv');
const outPath = get('--out');
if (!csvPath || !outPath) {
  console.error('사용법: node scripts/fix-coords.js --csv <입력.csv> --out <출력.sql>');
  process.exit(1);
}

const txt = new TextDecoder('euc-kr').decode(fs.readFileSync(csvPath));
const lines = txt.split(/\r?\n/).filter((l) => l.trim());
const header = parseCsvLine(lines[0]);
const col = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`CSV에 '${n}' 컬럼이 없습니다.`);
  return i;
};
const iOrg = col('개방자치단체코드');
const iMgt = col('관리번호');
const iStatus = col('영업상태명');
const iName = col('사업장명');
const iX = col('좌표정보(X)');
const iY = col('좌표정보(Y)');

const rows = [];
const seen = new Set();
for (const line of lines.slice(1)) {
  const r = parseCsvLine(line);
  if (r[iStatus] !== '영업/정상') continue;
  if (!(r[iName] || '').trim()) continue;
  const xs = (r[iX] || '').trim();
  const ys = (r[iY] || '').trim();
  if (!xs || !ys) continue;
  const x = Number(xs), y = Number(ys);
  if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
  const [lng, lat] = proj4(EPSG5174, WGS84, [x, y]);
  if (!(lat > 33 && lat < 39 && lng > 124 && lng < 132)) continue;
  const id = `ld_${(r[iOrg] || '').trim()}_${(r[iMgt] || '').trim()}`;
  if (seen.has(id)) continue;
  seen.add(id);
  rows.push({ id, lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) });
}

const BATCH = 400;
const out = [];
out.push('-- 공공데이터 헬스장 좌표 보정 (towgs84 수정본으로 재계산)');
out.push(`-- 생성 ${new Date().toISOString()} / ${rows.length}건`);
out.push('-- 좌표만 갱신한다. 이름·주소는 건드리지 않는다.');
out.push('');
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  out.push('update public.gyms as g set lat = v.lat, lng = v.lng');
  out.push('from (values');
  out.push(chunk.map((r) => `  ('${r.id}', ${r.lat}::float8, ${r.lng}::float8)`).join(',\n'));
  out.push(') as v(id, lat, lng)');
  out.push('where g.id = v.id;');
  out.push('');
}
fs.writeFileSync(outPath, out.join('\n'), 'utf8');
console.log(`좌표 갱신 대상: ${rows.length}건`);
console.log(`출력: ${outPath} (${Math.ceil(rows.length / BATCH)}개 배치, ${Math.round(fs.statSync(outPath).size / 1024)}KB)`);
