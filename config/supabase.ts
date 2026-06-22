import { createClient } from '@supabase/supabase-js';

// Expo는 EXPO_PUBLIC_ 접두 환경변수를 클라이언트 번들에 자동 노출한다.
// .env 파일에 아래 두 값을 넣으면 됨 (Supabase 대시보드 > Project Settings > API):
//   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// 키가 없으면 아직 mock 모드. 화면 로직이 이 플래그로 분기할 수 있다.
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// 키 미설정 시에도 import 시점에 throw 하지 않도록 placeholder로 생성(실제 호출 전까지 무해).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // 웹 OAuth 리다이렉트 처리
    },
  },
);
