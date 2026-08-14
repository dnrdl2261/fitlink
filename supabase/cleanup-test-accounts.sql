-- 개발 중 만든 테스트 계정 정리 (2026-08-14)
-- Supabase 대시보드 > SQL Editor 에서 실행한다.
--
-- ⚠️ 반드시 1번을 먼저 실행해 이메일을 눈으로 확인한 뒤 2번을 실행할 것.
--    특히 '권순욱'(member)은 본인이 실제로 쓰는 계정일 수 있다.
--
-- 삭제해도 거래 기록은 남는다: schema Phase O 에서 bookings.member_id 를
-- on delete set null 로 바꿔 뒀다(전자상거래법 5년 보존). payments·settlements 는 FK가 없어 그대로 유지된다.

-- ── 1) 삭제 대상 확인 (먼저 실행) ─────────────────────────────
select
  p.id,
  p.name,
  p.role,
  u.email,
  p.created_at,
  (select count(*) from bookings b where b.member_id = p.id) as 예약수,
  (select count(*) from notifications n where n.user_id = p.id) as 알림수
from profiles p
join auth.users u on u.id = p.id
where p.id in (
  '22f2463c-2718-4d38-943b-0ab559f1598e',  -- 테스트회원 (2026-06-24)
  '122e2b4b-6f42-4d1d-8a7d-a9c71831e329',  -- E2E테스트  (2026-07-08)
  '38610e66-cbdc-4815-9e28-ce231f4c4e21'   -- 권순욱     (2026-06-26) ← 본인 계정인지 확인!
)
order by p.created_at;

-- ── 2) 삭제 (1번 결과를 확인한 뒤 실행) ────────────────────────
-- 지우고 싶지 않은 줄은 목록에서 빼고 실행하면 된다.
-- auth.users 를 지우면 profiles 등 연결 데이터는 cascade 로 함께 정리된다.
--
-- delete from auth.users
-- where id in (
--   '22f2463c-2718-4d38-943b-0ab559f1598e',
--   '122e2b4b-6f42-4d1d-8a7d-a9c71831e329',
--   '38610e66-cbdc-4815-9e28-ce231f4c4e21'
-- );

-- ── 3) 결과 확인 ──────────────────────────────────────────────
-- select p.id, p.name, p.role, u.email
-- from profiles p join auth.users u on u.id = p.id
-- order by p.created_at;
--
-- 남아 있어야 하는 계정:
--   권순욱2      (trainer)    — 심사용 트레이너
--   리뷰어       (member)     — 심사용 회원
--   리뷰 헬스장  (gym_admin)  — 심사용 헬스장 관리자
