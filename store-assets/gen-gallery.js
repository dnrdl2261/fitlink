const fs = require('fs');
const uri = (name) => 'data:image/png;base64,' + fs.readFileSync('store-assets/preview/' + name + '.png').toString('base64');
const shots = [
  { name:'1-home',         role:'회원',   cap:'내 주변 검증된 PT 트레이너를 한눈에', sub:'홈 · 트레이너 검색' },
  { name:'2-trainer',      role:'회원',   cap:'전문 분야·후기·가격까지 비교하고 선택', sub:'트레이너 상세' },
  { name:'3-booking',      role:'회원',   cap:'원하는 시간에 바로 예약', sub:'PT 예약 · 일정 선택' },
  { name:'4-chat',         role:'회원',   cap:'트레이너와 1:1 채팅 상담', sub:'채팅' },
  { name:'5-escrow',       role:'회원',   cap:'완료 확인 후 정산되는 안심 에스크로', sub:'내 예약 · 환불 가능 잔액' },
  { name:'6-trainer-dash', role:'트레이너', cap:'트레이너를 위한 일정·수익 관리', sub:'트레이너 대시보드' },
  { name:'7-gym-dash',     role:'헬스장',  cap:'헬스장 운영을 한 화면에서', sub:'운영 현황' },
];
const roleCls = (r) => r==='트레이너' ? 'role-t' : r==='헬스장' ? 'role-g' : 'role-m';
const card = (s,i) => `
      <figure class="shot">
        <div class="frame"><img src="${uri(s.name)}" alt="${s.cap}" loading="lazy"/></div>
        <figcaption>
          <div class="shot-meta"><span class="num">${String(i+1).padStart(2,'0')}</span><span class="role ${roleCls(s.role)}">${s.role}</span></div>
          <p class="cap">${s.cap}</p>
          <p class="sub">${s.sub}</p>
        </figcaption>
      </figure>`;

const html = `<title>FLOWIN 스토어 스크린샷 초안</title>
<style>
  :root{
    --bg:#EEF0FA;--surface:#FFFFFF;--surface-2:#F7F8FD;--text:#15172B;--muted:#616780;--faint:#9AA0BC;
    --accent:#5C6AF5;--border:#E2E5F3;--shadow:0 18px 40px rgba(38,44,92,.14);
    --rm:#5C6AF5;--rt:#12B886;--rg:#F08C00;
  }
  @media (prefers-color-scheme:dark){:root{
    --bg:#080B16;--surface:#121829;--surface-2:#0E1424;--text:#EEF0FA;--muted:#9AA3C0;--faint:#5D6688;
    --accent:#8391FF;--border:#232B44;--shadow:0 20px 46px rgba(0,0,0,.5);
  }}
  :root[data-theme="light"]{--bg:#EEF0FA;--surface:#FFFFFF;--surface-2:#F7F8FD;--text:#15172B;--muted:#616780;--faint:#9AA0BC;--accent:#5C6AF5;--border:#E2E5F3;--shadow:0 18px 40px rgba(38,44,92,.14)}
  :root[data-theme="dark"]{--bg:#080B16;--surface:#121829;--surface-2:#0E1424;--text:#EEF0FA;--muted:#9AA3C0;--faint:#5D6688;--accent:#8391FF;--border:#232B44;--shadow:0 20px 46px rgba(0,0,0,.5)}
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','Apple SD Gothic Neo','Segoe UI',sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1120px;margin:0 auto;padding:56px 24px 80px}
  .eyebrow{font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
  h1{font-size:clamp(28px,5vw,40px);font-weight:800;letter-spacing:-.02em;margin:10px 0 12px;text-wrap:balance}
  .lede{font-size:16px;color:var(--muted);max-width:62ch}
  .specbar{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
  .chip{display:inline-flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600}
  .chip b{color:var(--accent);font-variant-numeric:tabular-nums}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:24px;margin:44px 0 8px}
  .shot{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:15px;box-shadow:var(--shadow)}
  .frame{border-radius:13px;overflow:hidden;background:var(--surface-2)}
  .frame img{width:100%;display:block}
  figcaption{padding:13px 4px 3px}
  .shot-meta{display:flex;align-items:center;gap:9px;margin-bottom:7px}
  .num{font-size:12px;font-weight:800;color:var(--faint);font-variant-numeric:tabular-nums;letter-spacing:.05em}
  .role{font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:999px;color:#fff}
  .role-m{background:var(--rm)}.role-t{background:var(--rt)}.role-g{background:var(--rg)}
  .cap{font-size:14px;font-weight:700;letter-spacing:-.01em;line-height:1.4}
  .sub{font-size:12.5px;color:var(--muted);margin-top:3px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:40px}
  @media (max-width:640px){.cols{grid-template-columns:1fr}}
  .panel{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:24px 26px}
  .panel h2{font-size:15px;font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:9px}
  .dot{width:8px;height:8px;border-radius:3px;background:var(--accent)}
  .dot.warn{background:var(--rg)}.dot.next{background:var(--rt)}
  .panel ul{list-style:none;display:flex;flex-direction:column;gap:11px}
  .panel li{font-size:13.5px;padding-left:18px;position:relative;line-height:1.55}
  .panel li::before{content:"";position:absolute;left:0;top:9px;width:6px;height:6px;border-radius:50%;background:var(--border);border:1px solid var(--faint)}
  .panel code{background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:1px 7px;font-size:12px;font-family:ui-monospace,'SF Mono',Menlo,monospace;color:var(--accent)}
  .foot{margin-top:36px;font-size:12.5px;color:var(--faint);text-align:center}
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">FLOWIN · 스토어 등록물</div>
    <h1>앱 스토어 스크린샷 초안</h1>
    <p class="lede">라이브 데모 앱의 실제 화면을 캡처해 브랜드 배경과 마케팅 문구를 얹은 초안입니다. 회원의 핵심 여정(검색 → 예약 → 채팅 → 안심 결제)과 트레이너·헬스장 관리 화면까지 담았습니다.</p>
    <div class="specbar">
      <span class="chip">규격 <b>iPhone 6.7&quot;</b></span>
      <span class="chip">해상도 <b>1290 × 2796</b></span>
      <span class="chip">장수 <b>7</b></span>
      <span class="chip">생성 <b>2026-07-31</b></span>
    </div>
  </header>
  <section class="grid">${shots.map(card).join('')}</section>
  <section class="cols">
    <div class="panel">
      <h2><span class="dot"></span>규격 &amp; 사용법</h2>
      <ul>
        <li><b>App Store</b> — 1290×2796은 6.7&quot; 필수 규격. Connect 스크린샷란에 그대로 업로드 가능.</li>
        <li><b>Google Play</b> — 동일 이미지 사용 가능(폰 스크린샷 2장 이상).</li>
        <li>최종본 <code>store-assets/store-*.png</code> · 원본 <code>raw/</code> · 소스 <code>slides.html</code></li>
        <li>6.5&quot;(1242×2688) 등 추가 규격은 같은 방식으로 재생성 가능.</li>
      </ul>
    </div>
    <div class="panel">
      <h2><span class="dot warn"></span>다듬을 점 (나중에 보완)</h2>
      <ul>
        <li>트레이너·회원 <b>프로필 사진이 데모용 임의 이미지</b> → 실물 사진 교체 권장.</li>
        <li>상단 <b>상태바(시간·배터리) 없음</b> — 실기기 캡처 시 포함.</li>
        <li>헤드라인 문구는 초안 — 마케팅 톤 조정 가능.</li>
        <li>순서·장수는 자유 조정(스토어는 최대 10장).</li>
      </ul>
    </div>
  </section>
  <section class="panel" style="margin-top:20px">
    <h2><span class="dot next"></span>다음 단계</h2>
    <ul>
      <li>문구·색·순서 피드백 주시면 즉시 재생성합니다.</li>
      <li>EAS 네이티브 빌드 후 <b>실기기/시뮬레이터 캡처</b>로 상태바 포함 버전 제작 가능.</li>
      <li>확정되면 App Store Connect / Play Console 스크린샷란에 업로드.</li>
    </ul>
  </section>
  <p class="foot">FLOWIN — 실제 앱 화면 기반 초안 · 업로드 전 프로필 사진·문구 최종 검토 권장</p>
</div>`;
fs.writeFileSync('store-assets/gallery.html', html);
console.log('gallery.html:', (html.length/1024).toFixed(0)+'KB, 스크린샷', shots.length);
