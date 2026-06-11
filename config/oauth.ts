// 각 플랫폼에서 발급받은 Client ID를 아래에 입력하세요
export const OAUTH_CONFIG = {
  google: {
    // Google Cloud Console > API 및 서비스 > 사용자 인증 정보 > OAuth 2.0 클라이언트 ID (웹 애플리케이션)
    clientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  },
  kakao: {
    // Kakao Developers > 내 애플리케이션 > 앱 키 > REST API 키
    clientId: 'YOUR_KAKAO_REST_API_KEY',
  },
  naver: {
    // Naver Developers > 내 애플리케이션 > 개요 > Client ID / Client Secret
    clientId: 'YOUR_NAVER_CLIENT_ID',
    clientSecret: 'YOUR_NAVER_CLIENT_SECRET',
  },
};
