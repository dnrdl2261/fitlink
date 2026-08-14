/**
 * Google Play 피처 그래픽(1024×500) 생성기.
 *
 * Play Console 등록 필수 자산이다. 스토어 상단에 크게 노출되며,
 * 배치에 따라 가장자리가 잘리거나 앱 아이콘이 겹쳐 표시될 수 있으므로
 * 핵심 문구는 가운데로 모으고 가장자리에는 여백만 둔다.
 *
 *   node store-assets/gen-feature-graphic.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SHOT = path.join(__dirname, 'raw', 'member-home.png');
const OUT = path.join(__dirname, 'play-feature-graphic.png');

const phone = 'data:image/png;base64,' + fs.readFileSync(SHOT).toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1024px;height:500px;overflow:hidden;
       font-family:-apple-system,'Malgun Gothic','Apple SD Gothic Neo',sans-serif}
  .bg{position:absolute;inset:0;
      background:linear-gradient(135deg,#3d7fff 0%,#0057ff 52%,#0038b0 100%)}
  /* 장식 원 — 가장자리가 잘려도 손해가 없는 요소만 바깥에 둔다 */
  .c1{position:absolute;width:520px;height:520px;border-radius:50%;
      background:rgba(255,255,255,.07);top:-190px;left:-120px}
  .c2{position:absolute;width:330px;height:330px;border-radius:50%;
      background:rgba(255,255,255,.06);bottom:-150px;left:300px}
  .wrap{position:absolute;inset:0;display:flex;align-items:center;padding:0 64px}
  .copy{width:560px;color:#fff}
  .mark{display:flex;align-items:center;gap:14px;margin-bottom:22px}
  .badge{width:52px;height:52px;border-radius:14px;background:#fff;
         display:flex;align-items:center;justify-content:center;
         font-size:34px;font-weight:900;color:#0057ff;line-height:1}
  .name{font-size:31px;font-weight:900;letter-spacing:3px}
  h1{font-size:41px;font-weight:900;line-height:1.28;letter-spacing:-1px}
  h1 em{font-style:normal;color:#BBD0FF}
  .sub{margin-top:18px;font-size:18px;font-weight:600;color:rgba(255,255,255,.82)}
  .phone{position:absolute;right:74px;top:52px;width:268px;border-radius:30px;overflow:hidden;
         border:3px solid rgba(255,255,255,.28);box-shadow:0 26px 60px rgba(0,0,0,.38)}
  .phone img{width:100%;display:block}
</style></head><body>
  <div class="bg"></div><div class="c1"></div><div class="c2"></div>
  <div class="wrap">
    <div class="copy">
      <div class="mark"><div class="badge">F</div><div class="name">FLOWIN</div></div>
      <h1>내 주변 PT 트레이너와<br/><em>헬스장을 한 곳에서</em></h1>
      <div class="sub">전국 헬스장 16,000곳 · 이용 확인 후 정산되는 안심 거래</div>
    </div>
  </div>
  <div class="phone"><img src="${phone}"/></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log('피처 그래픽 생성 →', OUT);
})();
