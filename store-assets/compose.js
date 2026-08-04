const { chromium } = require('playwright');
const fs = require('fs');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync('store-assets/raw/' + f).toString('base64');

const SLIDES = [
  { name:'1-home',         img:'member-home.png',    eyebrow:'회원',   h1:'내 주변 검증된',        h2:'PT 트레이너를 한눈에' },
  { name:'2-trainer',      img:'trainer-detail.png', eyebrow:'회원',   h1:'전문 분야·후기·가격',   h2:'비교하고 선택하세요' },
  { name:'3-booking',      img:'booking.png',        eyebrow:'회원',   h1:'원하는 시간에',          h2:'바로 예약하세요' },
  { name:'4-chat',         img:'chat-conv.png',      eyebrow:'회원',   h1:'트레이너와',             h2:'1:1 채팅 상담' },
  { name:'5-escrow',       img:'escrow.png',         eyebrow:'회원',   h1:'완료 확인 후 정산되는',   h2:'안심 에스크로 결제' },
  { name:'6-trainer-dash', img:'trainer-dash.png',   eyebrow:'트레이너', h1:'트레이너를 위한',        h2:'일정·수익 관리 도구' },
  { name:'7-gym-dash',     img:'gym-dash.png',       eyebrow:'헬스장',  h1:'헬스장 운영을',          h2:'한 화면에서 관리하세요' },
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
