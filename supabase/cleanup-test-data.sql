-- ============================================================
-- 개발 중 만든 테스트 거래·게시글 정리 (2026-09-08)
-- Supabase 대시보드 > SQL Editor 에서 실행한다.
--
-- 지우는 것:  8월 E2E 검증으로 생긴 예약·결제·정산, 그리고 "E2E 동영상 테스트" 게시글과 영상 파일
-- 남기는 것:  계정 4개 전부
--               권순욱      (member)     본인 계정
--               권순욱2     (trainer)    본인 계정
--               리뷰어      (member)     ⚠️ 앱스토어 심사용 — 지우면 심사 반려
--               리뷰 헬스장 (gym_admin)  ⚠️ 앱스토어 심사용 — 지우면 심사 반려
--             헬스장 카탈로그 16,312곳(공공데이터)도 그대로 둔다.
--
-- ⚠️ 지금 지워도 되는 이유: PG가 아직 안 붙어 실제 대금이 1원도 오간 적이 없다.
--    실결제가 시작된 뒤에는 payments·settlements 를 지우면 안 된다 —
--    전자상거래법상 대금결제 기록은 5년 보존 대상이다.
--
-- ⚠️ 1번(조회)을 먼저 실행해 눈으로 확인한 뒤 2번(삭제)을 실행할 것.
--    에디터에 텍스트가 드래그 선택돼 있으면 그 부분만 실행된다. 선택을 풀 것.
-- ============================================================


-- ── 1) 삭제 대상 확인 (먼저 실행) ─────────────────────────────
--    anon 키로는 RLS 때문에 안 보여서 Claude 가 확인해줄 수 없는 부분이다.
--    아래 결과를 보고 지워도 되는 것만 남기고 2번을 실행한다.

select 'bookings'    as 테이블, id, member_id::text as 소유자, status, total_amount as 금액, created_at
  from public.bookings
union all
select 'payments',    id, member_id, status, amount, created_at::timestamptz
  from public.payments
union all
select 'settlements', id, member_id, status, gross_amount, created_at::timestamptz
  from public.settlements
order by created_at;

-- 새로 만든 정산 테이블도 비어 있는지 확인 (Phase U 이후 쌓인 것이 있는지)
select 'escrow_ledger'        as 테이블, count(*) from public.escrow_ledger
union all select 'facility_payments',     count(*) from public.facility_payments
union all select 'facility_settlements',  count(*) from public.facility_settlements
union all select 'settlement_batches',    count(*) from public.settlement_batches
union all select 'session_no_shows',      count(*) from public.session_no_shows
union all select 'slot_bookings',         count(*) from public.slot_bookings
union all select 'notifications',         count(*) from public.notifications;

-- 지울 게시글과 첨부 영상
select id, title, author, created_at, video_url from public.posts;
select bucket_id, name, created_at from storage.objects where bucket_id = 'media';


-- ── 2) 삭제 (1번 결과를 확인한 뒤 실행) ────────────────────────
--    ⚠️ 아래 블록 전체가 주석 처리돼 있다. 확인 후 주석을 풀고 실행할 것.
--    삭제 순서는 참조 방향을 따른다: 정산 → 결제 → 예약.

-- begin;
--
--   -- 축1 · PT 거래 (권순욱 계정으로 만든 E2E 검증 데이터)
--   delete from public.settlements  where member_id = '38610e66-cbdc-4815-9e28-ce231f4c4e21';
--   delete from public.escrow_ledger where member_id = '38610e66-cbdc-4815-9e28-ce231f4c4e21';
--   delete from public.payments     where member_id = '38610e66-cbdc-4815-9e28-ce231f4c4e21';
--   delete from public.bookings     where member_id = '38610e66-cbdc-4815-9e28-ce231f4c4e21';
--
--   -- 축2 · 시설 거래 (권순욱2 트레이너로 만든 것이 있으면)
--   delete from public.facility_settlements where trainer_id = 'a4563f15-ff0e-44ba-ab88-0531eb3569a0';
--   delete from public.facility_payments    where trainer_id = 'a4563f15-ff0e-44ba-ab88-0531eb3569a0';
--   delete from public.slot_bookings        where trainer_id = 'a4563f15-ff0e-44ba-ab88-0531eb3569a0';
--
--   -- 테스트 게시글 (댓글·반응이 있으면 함께)
--   delete from public.comments       where post_id = 'post_1786556425404';
--   delete from public.post_reactions where post_id = 'post_1786556425404';
--   delete from public.posts          where id      = 'post_1786556425404';
--
--   -- ⚠️ Storage 파일은 여기서 못 지운다.
--   --    Supabase 의 storage.protect_delete() 트리거가 SQL 직접 삭제를 막는다
--   --    (행만 지우면 실제 파일이 고아로 남기 때문). 42501 로 트랜잭션 전체가 롤백된다.
--   --    → 대시보드 Storage > media > posts/<uid>/ 에서 파일을 선택해 Delete 할 것.
--
--   -- 위 거래로 생긴 알림
--   delete from public.notifications
--    where user_id in ('38610e66-cbdc-4815-9e28-ce231f4c4e21',
--                      'a4563f15-ff0e-44ba-ab88-0531eb3569a0');
--
-- commit;
--
--    ※ begin/commit 으로 묶여 있어 중간에 하나라도 실패하면 전부 취소된다.
--      결과가 이상하면 commit 대신 rollback; 을 실행하면 없던 일이 된다.


-- ── 3) 결과 확인 (삭제 후 실행) ───────────────────────────────
--    전부 0 이어야 한다.

-- select 'bookings' as 테이블, count(*) from public.bookings
-- union all select 'payments',      count(*) from public.payments
-- union all select 'settlements',   count(*) from public.settlements
-- union all select 'slot_bookings', count(*) from public.slot_bookings
-- union all select 'posts',         count(*) from public.posts
-- union all select 'media 파일',    count(*) from storage.objects where bucket_id = 'media';

--    계정 4개는 그대로 남아 있어야 한다.
-- select role, name, created_at from public.profiles order by created_at;
-- ============================================================
