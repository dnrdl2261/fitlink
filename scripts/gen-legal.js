/**
 * 법무 문서를 정적 HTML로 내보낸다 (dist/legal/<key>/index.html).
 *
 * 왜 필요한가: 이 앱의 웹 빌드는 SPA(`output: 'single'`)라 /legal/privacy 같은 경로에
 * 해당하는 파일이 없다. GitHub Pages는 404.html로 폴백하므로 화면엔 문서가 뜨지만
 * **응답 코드는 404**다. 앱스토어·플레이스토어는 등록된 개인정보처리방침 URL의
 * 접근성을 확인하므로 그대로 두면 반려 사유가 된다.
 *
 * 앱 코드는 건드리지 않는다. 앱 안에서의 이동(/legal/[doc])은 클라이언트 라우팅이라
 * 서버 요청 자체가 없고, 이 파일들은 링크를 직접 열었을 때만 쓰인다.
 *
 * 문구는 data/legal.ts 한 곳에서만 가져오므로 약관을 고치면 다음 배포에 그대로 반영된다.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'legal');

// ── data/legal.ts 를 그대로 읽어 쓰기 위한 최소 TS 로더
//    (별도 빌드 단계를 만들지 않으려고 transpile 후 메모리에서 실행한다)
const cache = new Map();

function loadTs(file) {
  if (cache.has(file)) return cache.get(file);
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  });

  const module = { exports: {} };
  cache.set(file, module.exports);

  const localRequire = (request) => {
    if (!request.startsWith('.')) return {};            // 외부 패키지는 문서에 쓰이지 않는다
    const base = path.resolve(path.dirname(file), request);
    for (const candidate of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
      if (fs.existsSync(candidate)) return loadTs(candidate);
    }
    return {};                                          // 타입 전용 import 등
  };

  new Function('exports', 'require', 'module', '__filename', '__dirname', outputText)(
    module.exports, localRequire, module, file, path.dirname(file)
  );
  cache.set(file, module.exports);
  return module.exports;
}

const { LEGAL_DOCS, COMPANY } = loadTs(path.join(ROOT, 'data', 'legal.ts'));

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 본문은 줄바꿈이 의미를 갖는다(조항 번호가 줄 단위) — <br>로 살린다.
const body = (s) => esc(s).replace(/\n/g, '<br />');

function render(doc) {
  const sections = doc.sections
    .map((sec) => `      <section>\n        <h2>${esc(sec.heading)}</h2>\n        <p>${body(sec.body)}</p>\n      </section>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(doc.title)} · FLOWIN</title>
<meta name="description" content="FLOWIN ${esc(doc.title)} (최종 개정일 ${esc(doc.updatedAt)})" />
<meta name="robots" content="index, follow" />
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; padding: 24px 20px 64px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo",
                 "Malgun Gothic", Roboto, sans-serif;
    line-height: 1.7; color: #222; background: #fff;
    max-width: 760px; margin-inline: auto; word-break: keep-all;
  }
  header { border-bottom: 1px solid #eee; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; color: #4A90E2; text-decoration: none; }
  h1 { font-size: 24px; margin: 10px 0 6px; }
  .updated { font-size: 13px; color: #888; margin: 0; }
  .intro { color: #444; margin-bottom: 28px; }
  h2 { font-size: 16px; margin: 28px 0 8px; }
  section p { margin: 0; color: #333; }
  footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #777; }
  footer a { color: #4A90E2; }
  nav { margin-top: 12px; font-size: 13px; }
  nav a { color: #777; margin-right: 12px; }
</style>
</head>
<body>
  <header>
    <a class="brand" href="/">FLOWIN</a>
    <h1>${esc(doc.title)}</h1>
    <p class="updated">최종 개정일 ${esc(doc.updatedAt)}</p>
  </header>
${doc.intro ? `  <p class="intro">${body(doc.intro)}</p>\n` : ''}${sections}
  <footer>
    <p>
      ${esc(COMPANY.name)} · 대표 ${esc(COMPANY.ceo)}<br />
      사업자등록번호 ${esc(COMPANY.bizNo)} · 통신판매업 신고 ${esc(COMPANY.mailOrderNo)}<br />
      ${esc(COMPANY.address)}<br />
      고객센터 ${esc(COMPANY.phone)} · ${esc(COMPANY.email)}
    </p>
    <nav>
${Object.entries(LEGAL_DOCS)
  .map(([key, d]) => `      <a href="/legal/${key}/">${esc(d.title)}</a>`)
  .join('\n')}
    </nav>
    <p><a href="/">FLOWIN 앱으로 이동</a></p>
  </footer>
</body>
</html>
`;
}

let count = 0;
for (const [key, doc] of Object.entries(LEGAL_DOCS)) {
  const dir = path.join(OUT, key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), render(doc));
  count++;
}

console.log(`Legal pages generated: ${count} (${Object.keys(LEGAL_DOCS).join(', ')})`);
