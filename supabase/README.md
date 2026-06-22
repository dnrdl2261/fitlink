# FLOWIN 백엔드(Supabase) 셋업 — Phase 1

실서비스 전환 1단계: **인증 + 데이터 영속화**. 아래는 **회원님이 직접 해야 하는 것**(계정 작업)과 코드 쪽 진행 상황입니다.

## ✅ 회원님이 지금 할 일
1. https://supabase.com 가입 → **New project** 생성 (region은 `Northeast Asia (Seoul)` 권장).
2. **Project Settings → API** 에서 두 값 복사:
   - `Project URL`
   - `anon public` key
3. 프로젝트 루트 `fitlink/.env` 파일을 만들고 (`.env.example` 복사) 값 채우기:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   ```
   (`.env`는 .gitignore에 있어 커밋되지 않음)
4. **SQL Editor** 에서 `supabase/schema.sql` 전체를 붙여넣고 **Run**.
5. **Authentication → Providers** 에서 Email 활성화(기본 ON). (소셜은 나중에)

→ 위 5개가 끝나면 알려주세요. 그러면 **로그인/회원가입을 Supabase Auth로 교체**하고, 이어서 카탈로그(헬스장·트레이너) 시드 업로드 + 스토어를 서버 연동으로 바꿉니다.

## 🛠️ 코드 진행 상황
- [x] `@supabase/supabase-js` 설치
- [x] `config/supabase.ts` 클라이언트 (env 미설정 시 mock 모드로 무해하게 동작)
- [x] `supabase/schema.sql` — profiles/members/gyms/gym_admins/trainers/gym_trainers + RLS
- [ ] authStore → Supabase Auth 교체 (다음)
- [ ] mock 카탈로그(MOCK_GYMS/MOCK_TRAINERS) → DB 시드 업로드 스크립트
- [ ] 스토어들 서버 연동 (Phase 2: 예약·슬롯·파트너·후기·커뮤니티 …)

## 메모
- 지금은 `.env`에 키가 없으면 앱이 **기존 mock 그대로** 동작합니다(빌드/배포 안전).
- 키를 넣는 순간부터 인증이 Supabase로 전환됩니다.
