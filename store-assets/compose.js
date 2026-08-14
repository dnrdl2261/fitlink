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

const slideHtml = (s) => `
<div class="slide">
  <div class="cap"><div class="eyebrow">${s.eyebrow}</div><div class="h1">${s.h1}</div><div class="h2">${s.h2}</div></div>
  <div class="phone"><img src="${b64(s.img)}"/></div>
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
</style></head><body>${SLIDES.map(slideHtml).join('')}</body></html>`;
fs.writeFileSync('store-assets/slides.html', html);

(async () => {
  const browser = await chromium.launch();
  for (const [dsf, dir] of [[3,''],[1,'preview/']]) {
    const page = await browser.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:dsf });
    await page.setContent(html, { waitUntil:'networkidle' });
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
