/**
 * 공공데이터(LOCALDATA 체력단련장업) → gyms 테이블 적재용 SQL 생성기.
 *
 * 원본 CSV 내려받기 (EUC-KR, 전국. 지역별은 URL 끝에 ?orgCode=<지역코드>_ALL, 부산=6260000_ALL):
 *   curl -L -H "Referer: https://www.data.go.kr/data/15045048/fileData.do" -A "<브라우저 UA>" \
 *     "https://file.localdata.go.kr/file/download/fitness_centers/info" -o scripts/data/nationwide.csv
 *   ⚠️ Referer와 UA가 없으면 403으로 막힌다. www.localdata.go.kr은 막혀도 file. 호스트는 열린다.
 *
 * 사용법:
 *   node scripts/import-gyms.js --csv scripts/data/busan_fitness.csv --out scripts/data/gyms_busan.sql
 *
 * 지역에 무관하게 동작한다(전국 CSV를 넣으면 전국이 나온다).
 * 좌표계 EPSG:5174(Bessel 중부원점TM) → WGS84 변환. 영업중 + 좌표 보유 행만 적재한다.
 * id는 LOCALDATA 관리번호를 자연키로 쓰므로(ld_ 접두) 재실행해도 중복되지 않는다.
 */
const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');

// ⚠️ towgs84 값 주의 — 잘못 쓰면 전 지점이 한 방향으로 통째로 밀린다.
//    처음 -3.08,160.22,-111.53,... (7파라미터)를 썼다가 부산 전역이 남쪽으로 약 400m 밀렸다.
//    해운대두산위브포세이돈 등 실측 지점으로 대조한 결과 아래 3파라미터가 오차 25m로 가장 정확했다.
//    (EPSG:1152 공식 7파라미터는 36m로 근소하게 뒤짐)
const EPSG5174 =
  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs ' +
  '+towgs84=-146.43,507.89,681.46';
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

// 앱의 city 표기는 축약형('부산')이라 광역시·도 정식명칭을 맞춰준다.
const CITY_SHORT = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천',
  광주광역시: '광주', 대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종',
  경기도: '경기', 강원도: '강원', 강원특별자치도: '강원',
  충청북도: '충북', 충청남도: '충남', 전라북도: '전북', 전북특별자치도: '전북',
  전라남도: '전남', 경상북도: '경북', 경상남도: '경남',
  제주특별자치도: '제주', 제주도: '제주',
};

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

// 광주광역시의 5개 자치구. 아래 '전남광주통합특별시' 분리에 쓴다.
const GWANGJU_GU = new Set(['동구', '서구', '남구', '북구', '광산구']);

// "부산광역시 중구 남포동4가 7" → { city:'부산', district:'중구', dong:'남포동4가' }
function parseAddress(jibun, road) {
  const src = (jibun || road || '').trim();
  if (!src) return { city: '', district: '', dong: '' };
  const parts = src.split(/\s+/);
  const district = parts[1] || '';
  let city = CITY_SHORT[parts[0]] || parts[0] || '';
  // 공공데이터의 '전남광주통합특별시'는 통합 명칭이라 앱의 광주/전남으로 갈라야 한다.
  // 광주는 자치구(동/서/남/북/광산구)뿐이고 전남은 시·군이므로 이걸로 구분한다.
  if (parts[0] === '전남광주통합특별시') {
    city = GWANGJU_GU.has(district) ? '광주' : '전남';
  }
  // 세 번째 토막이 동/가/리로 끝나면 동으로 본다(번지는 제외).
  const third = parts[2] || '';
  const dong = /[동가리읍면]\d*가?$/.test(third) ? third : '';
  return { city, district, dong };
}

function sq(v) {
  if (v === null || v === undefined) return 'null';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag, def) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : def;
  };
  const csvPath = get('--csv');
  const outPath = get('--out');
  if (!csvPath || !outPath) {
    console.error('사용법: node scripts/import-gyms.js --csv <입력.csv> --out <출력.sql>');
    process.exit(1);
  }

  const buf = fs.readFileSync(csvPath);
  // LOCALDATA CSV는 EUC-KR(CP949)로 내려온다.
  const txt = new TextDecoder('euc-kr').decode(buf);
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]);

  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`CSV에 '${name}' 컬럼이 없습니다. 헤더: ${header.join(',')}`);
    return i;
  };
  // 관리번호는 자치단체 안에서만 고유하다(구·군이 다르면 같은 번호가 재사용됨).
  // 그래서 개방자치단체코드와 묶어야 전국에서 유일한 자연키가 된다.
  const iOrgCode = col('개방자치단체코드');
  const iMgtNo = col('관리번호');
  const iStatus = col('영업상태명');
  const iName = col('사업장명');
  const iRoad = col('도로명주소');
  const iJibun = col('지번주소');
  const iPhone = col('전화번호');
  const iX = col('좌표정보(X)');
  const iY = col('좌표정보(Y)');

  const rows = [];
  const skipped = { closed: 0, noCoord: 0, badCoord: 0, noName: 0 };

  for (const line of lines.slice(1)) {
    const r = parseCsvLine(line);
    if (r[iStatus] !== '영업/정상') { skipped.closed++; continue; }

    const name = (r[iName] || '').trim();
    if (!name) { skipped.noName++; continue; }

    const xs = (r[iX] || '').trim();
    const ys = (r[iY] || '').trim();
    if (!xs || !ys) { skipped.noCoord++; continue; }

    const x = Number(xs);
    const y = Number(ys);
    if (!Number.isFinite(x) || !Number.isFinite(y)) { skipped.badCoord++; continue; }

    const [lng, lat] = proj4(EPSG5174, WGS84, [x, y]);
    // 대한민국 영역 밖이면 좌표 오류로 보고 버린다.
    if (!(lat > 33 && lat < 39 && lng > 124 && lng < 132)) { skipped.badCoord++; continue; }

    const { city, district, dong } = parseAddress(r[iJibun], r[iRoad]);
    const address = (r[iRoad] || r[iJibun] || '').trim();
    const phoneRaw = (r[iPhone] || '').trim();

    rows.push({
      id: `ld_${(r[iOrgCode] || '').trim()}_${(r[iMgtNo] || '').trim()}`,
      name, address, city, district, dong,
      lat: Number(lat.toFixed(7)),
      lng: Number(lng.toFixed(7)),
      phone: phoneRaw,
    });
  }

  // 관리번호 중복 방어(같은 id가 두 번 오면 ON CONFLICT가 같은 명령 안에서 터진다).
  const seen = new Set();
  const unique = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  const dupes = rows.length - unique.length;

  // --format csv : Supabase Table Editor의 "Import data from CSV"용.
  // 행이 많으면(전국 1만6천) SQL 붙여넣기는 브라우저가 버거우므로 이쪽이 안전하다.
  if (get('--format') === 'csv') {
    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = 'id,name,address,city,district,dong,lat,lng,phone_number,is_partner,is_claimed';
    const lines = unique.map((r) =>
      [r.id, r.name, r.address, r.city, r.district, r.dong, r.lat, r.lng, r.phone, 'false', 'false']
        .map(esc).join(',')
    );
    fs.writeFileSync(outPath, [header, ...lines].join('\n') + '\n', 'utf8');
    console.log(`입력      : ${lines.length + skipped.closed + skipped.noCoord + skipped.badCoord + skipped.noName}행`);
    console.log(`적재 대상 : ${unique.length}건`);
    console.log(`제외      : 폐업·휴업 등 ${skipped.closed} / 좌표없음 ${skipped.noCoord} / 좌표오류 ${skipped.badCoord} / 이름없음 ${skipped.noName} / 중복 ${dupes}`);
    console.log(`출력      : ${outPath} (CSV, ${Math.round(fs.statSync(outPath).size / 1024)}KB)`);
    return;
  }

  const BATCH = 300;
  const chunks = [];
  for (let i = 0; i < unique.length; i += BATCH) chunks.push(unique.slice(i, i + BATCH));

  const sql = [];
  sql.push('-- 공공데이터(LOCALDATA 체력단련장업) 미등록 헬스장 적재');
  sql.push(`-- 생성: ${new Date().toISOString()} / 원본: ${path.basename(csvPath)} / ${unique.length}건`);
  sql.push('-- 재실행 안전(on conflict). 이미 입점(is_claimed=true)한 헬스장은 덮어쓰지 않는다.');
  sql.push('');
  sql.push('alter table public.gyms add column if not exists is_claimed boolean not null default true;');
  sql.push("comment on column public.gyms.is_claimed is 'false=공공데이터 미등록 헬스장(예약 불가, 입점 신청 대상)';");
  sql.push('create index if not exists idx_gyms_is_claimed on public.gyms(is_claimed);');
  sql.push('create index if not exists idx_gyms_city_district on public.gyms(city, district);');
  sql.push('');

  for (const chunk of chunks) {
    sql.push('insert into public.gyms (id, name, address, city, district, dong, lat, lng, phone_number, is_partner, is_claimed) values');
    sql.push(
      chunk
        .map((r) =>
          `  (${sq(r.id)}, ${sq(r.name)}, ${sq(r.address)}, ${sq(r.city)}, ${sq(r.district)}, ` +
          `${sq(r.dong)}, ${r.lat}, ${r.lng}, ${r.phone ? sq(r.phone) : 'null'}, false, false)`
        )
        .join(',\n')
    );
    sql.push('on conflict (id) do update set');
    sql.push('  name = excluded.name, address = excluded.address, city = excluded.city,');
    sql.push('  district = excluded.district, dong = excluded.dong,');
    sql.push('  lat = excluded.lat, lng = excluded.lng, phone_number = excluded.phone_number');
    // ⚠️ ON CONFLICT DO UPDATE 의 WHERE 는 대상 테이블을 스키마 없이 참조해야 한다.
    //    'public.gyms.is_claimed' 로 쓰면 에러가 나서 한 건도 갱신되지 않는다.
    sql.push('where gyms.is_claimed = false;');
    sql.push('');
  }

  fs.writeFileSync(outPath, sql.join('\n'), 'utf8');

  console.log(`입력      : ${lines.length - 1}행`);
  console.log(`적재 대상 : ${unique.length}건`);
  console.log(`제외      : 폐업·휴업 등 ${skipped.closed} / 좌표없음 ${skipped.noCoord} / 좌표오류 ${skipped.badCoord} / 이름없음 ${skipped.noName} / 중복 ${dupes}`);
  console.log(`출력      : ${outPath} (${chunks.length}개 배치)`);
}

main();
