const fs = require('fs');

const KAKAO_KEY = 'f48ca54b11ae966b9fc003d49a579687';
const KAKAO_SCRIPT = `<script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false"></script>`;

// HTML 캐시 방지: 매 배포마다 JS 번들 해시가 바뀌므로, 옛 index.html이 캐시되면
// 삭제된 옛 번들을 불러와 흰 화면이 난다. 문서는 항상 새로 받도록 강제.
const NO_CACHE_META = `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" /><meta http-equiv="Pragma" content="no-cache" /><meta http-equiv="Expires" content="0" />`;

// 모바일 브라우저 탭바 잘림 방지 CSS (100dvh + safe-area-inset)
const MOBILE_CSS = `<style>
html { height: 100%; }
body {
  height: 100%;
  margin: 0;
  padding: 0;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
}
#root {
  height: 100% !important;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
}
</style>`;

let html = fs.readFileSync('dist/index.html', 'utf8');

// 1. 줌 방지 + 세이프에어리어 viewport
html = html.replace(
  'initial-scale=1, shrink-to-fit=no',
  'initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, shrink-to-fit=no'
);

// 2. 모바일 CSS 삽입
html = html.replace('</head>', MOBILE_CSS + '</head>');

// 2-1. 캐시 방지 meta 삽입 (옛 HTML 캐시로 인한 흰 화면 방지)
html = html.replace('</head>', NO_CACHE_META + '</head>');

// 3. 카카오맵 SDK를 </head> 바로 앞에 삽입 (페이지 로드 시 올바른 Referrer로 로드)
if (!html.includes('dapi.kakao.com')) {
  html = html.replace('</head>', KAKAO_SCRIPT + '</head>');
}

fs.writeFileSync('dist/index.html', html);
fs.writeFileSync('dist/404.html', html);

console.log('HTML patched successfully');
