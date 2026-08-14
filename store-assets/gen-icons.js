/**
 * FLOWIN 앱 아이콘 생성기.
 *
 * 기본 상태의 Expo 플레이스홀더 아이콘(격자+동심원)을 대체하기 위해 만들었다.
 * 시안 4종을 렌더해 고른 뒤, CONCEPT를 바꿔 최종본을 내보낸다.
 *
 *   node store-assets/gen-icons.js            # 시안 4종 + 비교 시트
 *   node store-assets/gen-icons.js --apply a  # 고른 시안을 실제 아이콘으로 반영
 *
 * 브랜드 색은 utils/constants.ts의 COLORS.primary(#0057ff) 기준.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BLUE = '#0057ff';
const BLUE_DEEP = '#0038b0';
const OUT_DIR = path.join(__dirname, 'icon-candidates');

const bg = `<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#3d7fff"/><stop offset="55%" stop-color="${BLUE}"/><stop offset="100%" stop-color="${BLUE_DEEP}"/>
  </linearGradient>
</defs>
<rect width="1024" height="1024" fill="url(#g)"/>`;

// 아이콘은 48px까지 줄어든다 — 형태 하나만, 굵게, 여백 넉넉히.
const CONCEPTS = {
  // A. F 모노그램
  a: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bg}
    <g fill="#fff">
      <rect x="360" y="250" width="118" height="524" rx="59"/>
      <rect x="360" y="250" width="330" height="118" rx="59"/>
      <rect x="360" y="452" width="256" height="112" rx="56"/>
    </g></svg>`,

  // B. 상승하는 기록 (운동 기록·성장)
  b: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bg}
    <g fill="#fff">
      <rect x="286" y="606" width="120" height="180" rx="60"/>
      <rect x="452" y="474" width="120" height="312" rx="60"/>
      <rect x="618" y="318" width="120" height="468" rx="60"/>
    </g></svg>`,

  // C. 덤벨 (피트니스 직관)
  c: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bg}
    <g fill="#fff">
      <rect x="392" y="472" width="240" height="80" rx="40"/>
      <rect x="286" y="392" width="112" height="240" rx="56"/>
      <rect x="626" y="392" width="112" height="240" rx="56"/>
      <rect x="212" y="442" width="74" height="140" rx="37"/>
      <rect x="738" y="442" width="74" height="140" rx="37"/>
    </g></svg>`,

  // D. 흰 바탕 + 파란 F (반전)
  d: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    <rect width="1024" height="1024" fill="#fff"/>
    <g fill="${BLUE}">
      <rect x="360" y="250" width="118" height="524" rx="59"/>
      <rect x="360" y="250" width="330" height="118" rx="59"/>
      <rect x="360" y="452" width="256" height="112" rx="56"/>
    </g></svg>`,
};

// 안드로이드 어댑티브 아이콘은 바깥이 잘린다 — 마크를 66% 안전영역 안으로 축소한다.
function adaptive(svg) {
  return svg.replace(/<g fill="([^"]+)">/, '<g fill="$1" transform="translate(512,512) scale(0.72) translate(-512,-512)">');
}

// 스플래시는 흰 배경(app.json) 위에 놓이므로 배경을 빼고 마크만 파란색으로 남긴다.
function splash(svg) {
  return svg
    .replace(/<rect width="1024" height="1024"[^>]*\/>/, '')
    .replace(/<g fill="[^"]+">/, `<g fill="${BLUE}" transform="translate(512,512) scale(0.78) translate(-512,-512)">`);
}

async function shot(page, svg, out, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
    { waitUntil: 'load' }
  );
  await page.screenshot({ path: out, omitBackground: false });
}

(async () => {
  const applyIdx = process.argv.indexOf('--apply');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  if (applyIdx === -1) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const [key, svg] of Object.entries(CONCEPTS)) {
      await shot(page, svg, path.join(OUT_DIR, `icon-${key}.png`), 1024);
      await shot(page, svg, path.join(OUT_DIR, `icon-${key}-48.png`), 48); // 작게 줄었을 때 확인용
    }
    // 비교 시트: 큰 아이콘 + 실제 홈화면 크기(48px) 나란히
    const cell = (k) => `
      <div class="cell">
        <div class="label">${k.toUpperCase()}</div>
        <img class="big" src="data:image/png;base64,${fs.readFileSync(path.join(OUT_DIR, `icon-${k}.png`)).toString('base64')}"/>
        <img class="sm" src="data:image/png;base64,${fs.readFileSync(path.join(OUT_DIR, `icon-${k}-48.png`)).toString('base64')}"/>
      </div>`;
    const sheet = `<html><body style="margin:0;background:#f3f4f6;font-family:sans-serif">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:24px">
        ${Object.keys(CONCEPTS).map(cell).join('')}
      </div>
      <style>
        .cell{background:#fff;border-radius:14px;padding:14px;text-align:center}
        .label{font-size:15px;font-weight:800;color:#444;margin-bottom:10px}
        .big{width:100%;border-radius:22px;display:block}
        .sm{width:48px;height:48px;border-radius:10px;margin-top:12px}
      </style></body></html>`;
    await page.setViewportSize({ width: 1000, height: 360 });
    await page.setContent(sheet, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(OUT_DIR, 'compare.png'), fullPage: true });
    console.log('시안 생성 완료 →', OUT_DIR);
  } else {
    const key = (process.argv[applyIdx + 1] || '').toLowerCase();
    const svg = CONCEPTS[key];
    if (!svg) throw new Error(`알 수 없는 시안: ${key} (${Object.keys(CONCEPTS).join('/')})`);
    const assets = path.join(__dirname, '..', 'assets');
    await shot(page, svg, path.join(assets, 'icon.png'), 1024);
    await shot(page, adaptive(svg), path.join(assets, 'adaptive-icon.png'), 1024);
    await shot(page, splash(svg), path.join(assets, 'splash-icon.png'), 1024);
    await shot(page, svg, path.join(__dirname, 'play-icon-512.png'), 512);
    console.log(`시안 ${key.toUpperCase()} 적용: assets/icon.png, adaptive-icon.png, splash-icon.png, store-assets/play-icon-512.png`);
  }

  await browser.close();
})();
