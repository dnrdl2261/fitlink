const { chromium } = require('playwright');
const fs = require('fs');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync('store-assets/raw/' + f).toString('base64');

// ⚠️ 문구는 이용약관과 어긋나면 안 된다. 제11조가 "회사는 트레이너 자격의 진위를 보증하지 않는다"이므로
//    '검증된'처럼 회사가 심사한다는 인상을 주는 표현은 쓰지 않는다(실제로 자격 검증 절차도 없다).
const SLIDES = [
  { name:'1-home',         img:'member-home.png',    eyebrow:'회원',   h1:'내 주변 PT 트레이너를',   h2:'지도에서 한눈에' },
  { name:'2-trainer',      img:'trainer-detail.png', eyebrow:'회원',   h1:'전문 분야·후기·가격을',   h2:'비교하고 고르세요' },
  { name:'3-booking',      img:'booking.png',        eyebrow:'회원',   h1:'원하는 요일과 시간에',    h2:'바로 예약하세요' },
  { name:'4-chat',         img:'chat-conv.png',      eyebrow:'회원',   h1:'결제 전에 채팅으로',      h2:'먼저 상담하세요' },
  { name:'5-escrow',       img:'escrow.png',         eyebrow:'회원',   h1:'이용한 만큼만 정산되는',  h2:'안심 에스크로 결제' },
  { name:'6-trainer-dash', img:'trainer-dash.png',   eyebrow:'트레이너', h1:'일정·회원·정산까지',     h2:'트레이너 업무 한 곳에서' },
  { name:'7-gym-dash',     img:'gym-dash.png',       eyebrow:'헬스장',  h1:'시설·트레이너·매출을',   h2:'한 화면에서 관리하세요' },
];
fs.writeFileSync('store-assets/manifest.json', JSON.stringify(SLIDES.map(s=>({name:s.name,eyebrow:s.eyebrow,h1:s.h1,h2:s.h2})),null,2));

// 상태바 — 웹 캡처에는 시간·배터리가 없어 폰 화면처럼 보이지 않는다.
// 스토어 스크린샷의 관례대로 9:41을 쓴다(애플 자체 마케팅 기준 시각).
const statusBar = `
  <div class="sb">
    <span class="sb-time">9:41</span>
    <span class="sb-icons">
      <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7.5" width="3" height="3.5" rx="1"/><rect x="4.5" y="5.5" width="3" height="5.5" rx="1"/><rect x="9" y="3" width="3" height="8" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M8 10.6 6.1 8.5a2.7 2.7 0 0 1 3.8 0L8 10.6zM3.9 6.3a5.9 5.9 0 0 1 8.2 0l-1.2 1.3a4.2 4.2 0 0 0-5.8 0L3.9 6.3zM1.6 3.9a9.1 9.1 0 0 1 12.8 0l-1.2 1.3a7.4 7.4 0 0 0-10.4 0L1.6 3.9z"/></svg>
      <svg width="25" height="11" viewBox="0 0 25 11" fill="none"><rect x="0.5" y="0.5" width="21" height="10" rx="3" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="18" height="7" rx="1.6" fill="currentColor"/><path d="M23 4v3a2 2 0 0 0 0-3z" fill="currentColor" opacity=".45"/></svg>
    </span>
  </div>`;

const slideHtml = (s) => `
<div class="slide">
  <div class="cap"><div class="eyebrow">${s.eyebrow}</div><div class="h1">${s.h1}</div><div class="h2">${s.h2}</div></div>
  <div class="phone">${statusBar}<img src="${b64(s.img)}"/></div>
</div>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,'Malgun Gothic','Apple SD Gothic Neo',sans-serif}
  .slide{width:430px;height:932px;position:relative;overflow:hidden;
    background:linear-gradient(158deg,#6B78F7 0%,#4F63F5 45%,#3A46C4 100%);
    display:flex;flex-direction:column;align-items:center}
  .cap{text-align:center;padding:68px 30px 0;z-index:2}
  .eyebrow{display:inline-block;font-size:14px;font-weight:800;color:#fff;letter-spacing:1px;
    background:rgba(255,255,255,.18);padding:6px 16px;border-radius:999px;margin-bottom:16px}
  .h1{font-size:33px;font-weight:800;color:#fff;line-height:1.28;letter-spacing:-.5px}
  .h2{font-size:33px;font-weight:800;color:#C7D0FF;line-height:1.28;letter-spacing:-.5px}
  .phone{width:348px;margin-top:34px;border-radius:38px;overflow:hidden;
    border:3px solid rgba(255,255,255,.22);box-shadow:0 30px 70px rgba(0,0,0,.35)}
  .phone img{width:100%;display:block}
  /* 상태바 배경은 화면 상단 색을 표본 추출해 JS가 채운다(밝은 화면·어두운 히어로 둘 다 자연스럽게) */
  .sb{height:34px;display:flex;align-items:center;justify-content:space-between;
      padding:0 20px 0 24px;font-size:13.5px;font-weight:700;letter-spacing:.2px}
  .sb-icons{display:flex;align-items:center;gap:5px}
  .sb-icons svg{display:block}
</style></head><body>${SLIDES.map(slideHtml).join('')}</body></html>`;
fs.writeFileSync('store-assets/slides.html', html);

(async () => {
  const browser = await chromium.launch();
  for (const [dsf, dir] of [[3,''],[1,'preview/']]) {
    const page = await browser.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:dsf });
    await page.setContent(html, { waitUntil:'networkidle' });

    // 상태바 색 맞추기: 화면 맨 윗줄 픽셀을 뽑아 배경으로 쓰고, 밝기에 따라 글자색을 정한다.
    // (홈 화면은 흰 배경, 트레이너 상세는 어두운 히어로라 한 가지 색으로는 어색해진다)
    await page.evaluate(async () => {
      for (const phone of document.querySelectorAll('.phone')) {
        const img = phone.querySelector('img');
        await img.decode();
        const cv = document.createElement('canvas');
        cv.width = 1; cv.height = 1;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 4, 2, 1, 1, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const sb = phone.querySelector('.sb');
        sb.style.background = `rgb(${r},${g},${b})`;
        sb.style.color = (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#111' : '#fff';
      }
    });

    const slides = await page.$$('.slide');
    for (let i=0;i<slides.length;i++){
      const out = dsf===3 ? `store-assets/store-${SLIDES[i].name}.png` : `store-assets/preview/${SLIDES[i].name}.png`;
      await slides[i].screenshot({ path: out });
    }
    await page.close();
  }
  await browser.close();
  console.log('완료: store(3x) + preview(1x) 각', SLIDES.length, '장');
})();
