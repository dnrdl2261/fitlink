module.exports = ({ config }) => {
  const next = { ...config };

  // Android 네이티브 지도 키 (빌드 시 env에서 주입, git 미포함)
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  if (mapsKey) {
    next.android = {
      ...(next.android || {}),
      config: {
        ...((next.android && next.android.config) || {}),
        googleMaps: { apiKey: mapsKey },
      },
    };
  }

  // 웹 배포 baseUrl (npm run build:web 에서만 설정됨)
  const baseUrl = process.env.BASE_URL;
  if (baseUrl) {
    next.experiments = { ...(next.experiments || {}), baseUrl };
  }

  return next;
};
