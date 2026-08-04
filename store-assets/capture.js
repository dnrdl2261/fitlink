const { chromium } = require('playwright');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const BASE = 'https://flowinpt.kr/?_=';

async function newCtx(browser) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  return ctx;
}
async function demoLogin(page, role) {
  await page.goto(BASE + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
  await sleep(2500);
  await page.getByText('건너뛰기', { exact: false }).first().click({ timeout: 8000 }).catch(()=>{});
  await sleep(800);
  await page.getByText('데모 계정으로 둘러보기', { exact: false }).first().click({ timeout: 8000 }).catch(()=>{});
  await sleep(800);
  await page.getByText(role, { exact: true }).first().click({ timeout: 8000 }).catch(e=>console.log('role click fail', role, e.message.slice(0,40)));
  await sleep(5000);
}

(async () => {
  const browser = await chromium.launch();
  const results = [];

  // ── 회원 ──
  let ctx = await newCtx(browser); let p = await ctx.newPage();
  await demoLogin(p, '회원');
  await p.screenshot({ path: 'store-assets/raw/member-home.png' });
  results.push('member-home ' + (await p.evaluate(()=>document.body.innerText.slice(0,30).replace(/\n/g,' '))));
  // 트레이너 상세: 첫 트레이너 카드 클릭(이름 텍스트)
  const names = ['이지수','최유진','박소연','김민준','서준혁'];
  for (const n of names) { const el = p.getByText(n,{exact:true}).first(); if (await el.count().catch(()=>0)) { await el.click({timeout:5000}).catch(()=>{}); break; } }
  await sleep(3500);
  await p.screenshot({ path: 'store-assets/raw/trainer-detail.png' });
  results.push('trainer-detail ' + (await p.evaluate(()=>document.body.innerText.slice(0,30).replace(/\n/g,' '))));
  await ctx.close();

  // ── 트레이너 ──
  ctx = await newCtx(browser); p = await ctx.newPage();
  await demoLogin(p, '트레이너');
  await p.screenshot({ path: 'store-assets/raw/trainer-dash.png' });
  results.push('trainer-dash ' + (await p.evaluate(()=>document.body.innerText.slice(0,30).replace(/\n/g,' '))));
  await ctx.close();

  // ── 헬스장 ──
  ctx = await newCtx(browser); p = await ctx.newPage();
  await demoLogin(p, '헬스장 관리자');
  await p.screenshot({ path: 'store-assets/raw/gym-dash.png' });
  results.push('gym-dash ' + (await p.evaluate(()=>document.body.innerText.slice(0,30).replace(/\n/g,' '))));
  await ctx.close();

  await browser.close();
  console.log(results.join('\n'));
})();
