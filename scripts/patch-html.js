const fs = require('fs');

const KAKAO_KEY = 'f48ca54b11ae966b9fc003d49a579687';
const KAKAO_SCRIPT = `<script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false"></script>`;

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

// 3. 카카오맵 SDK를 </head> 바로 앞에 삽입 (페이지 로드 시 올바른 Referrer로 로드)
if (!html.includes('dapi.kakao.com')) {
  html = html.replace('</head>', KAKAO_SCRIPT + '</head>');
}

fs.writeFileSync('dist/index.html', html);
fs.writeFileSync('dist/404.html', html);

console.log('HTML patched successfully');
