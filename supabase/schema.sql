-- ============================================================
-- FLOWIN 실서비스 스키마 — Phase 1: 인증 + 카탈로그(정체성) 데이터
-- Supabase 대시보드 > SQL Editor 에 붙여넣어 실행.
-- (Phase 2 거래 테이블: bookings/sessions/slot_bookings/partner_requests/
--  packages/contracts/reviews/community/follows/notifications/chat 은 다음 단계에서 추가)
-- ============================================================

-- 공통: updated_at 자동 갱신 트리거 함수
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ── 1. profiles : auth.users 1:1 확장 (모든 역할 공통) ──────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('member','trainer','gym_admin')),
  name        text not null default '',
  email       text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- 신규 가입 시 auth.users → profiles 자동 생성 (role/name은 메타데이터에서)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. members : 회원 부가정보 ─────────────────────────────────
create table if not exists public.members (
  profile_id          uuid primary key references public.profiles(id) on delete cascade,
  fitness_goals       text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  address             jsonb            -- { city, district, dong }
);

-- ── 3. gyms : 헬스장 카탈로그 (seed id 'gym_001' 호환 위해 text PK) ─
create table if not exists public.gyms (
  id              text primary key,
  name            text not null,
  description     text default '',
  address         text default '',
  city            text default '',
  district        text default '',
  dong            text default '',
  lat             double precision,
  lng             double precision,
  phone_number    text,
  images          text[]  not null default '{}',
  facilities      text[]  not null default '{}',
  operating_hours jsonb   not null default '[]',  -- GymTimeSlot[]
  pricing         jsonb   not null default '[]',  -- PricingTier[]
  usage_rules     text[]  not null default '{}',
  rating          numeric not null default 0,
  review_count    int     not null default 0,
  is_partner      boolean not null default false,
  admin_id        uuid    references public.profiles(id) on delete set null,
  capacity_overrides jsonb not null default '{}',   -- { dayOfWeek: max } 관리자 수용인원 override
  blacklist       jsonb   not null default '[]',     -- BlacklistEntry[] 차단 트레이너
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_gyms_updated before update on public.gyms
  for each row execute function public.set_updated_at();

-- ── 4. gym_admins : 관리자 ↔ 헬스장 ───────────────────────────
create table if not exists public.gym_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  gym_id     text references public.gyms(id) on delete set null
);

-- ── 5. trainers : 트레이너 카탈로그 (seed id 'trainer_001' 호환 text PK) ─
create table if not exists public.trainers (
  id               text primary key,
  profile_id       uuid references public.profiles(id) on delete set null, -- 실계정 연결(데모는 null)
  name             text not null,
  gender           text check (gender in ('male','female')),
  tagline          text default '',
  bio              text default '',
  region           text default '',
  address          jsonb,                       -- { city, district, dong }
  session_price    int not null default 0,
  experience_years int not null default 0,
  rating           numeric not null default 0,
  review_count     int not null default 0,
  total_sessions   int not null default 0,
  specializations  text[] not null default '{}',
  exercise_types   text[] not null default '{}',
  training_goals   text[] not null default '{}',
  training_styles  text[] not null default '{}',
  conveniences     text[] not null default '{}',
  certifications   jsonb not null default '[]',  -- Certification[]
  work_history     jsonb not null default '[]',  -- WorkHistory[]
  photos           jsonb not null default '[]',  -- TrainerPhoto[]
  videos           jsonb not null default '[]',  -- TrainerVideo[]
  avatar_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_trainers_updated before update on public.trainers
  for each row execute function public.set_updated_at();

-- ── 6. gym_trainers : 파트너 관계 (트레이너 ↔ 헬스장 N:N) ───────
create table if not exists public.gym_trainers (
  gym_id     text not null references public.gyms(id) on delete cascade,
  trainer_id text not null references public.trainers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gym_id, trainer_id)
);

-- ============================================================
-- RLS (Row Level Security) — Phase 1 기본 정책
--   카탈로그(gyms/trainers)는 공개 읽기, 본인 데이터만 쓰기.
--   정책은 결제·운영 단계에서 역할별로 더 조인다.
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.members     enable row level security;
alter table public.gyms        enable row level security;
alter table public.gym_admins  enable row level security;
alter table public.trainers    enable row level security;
alter table public.gym_trainers enable row level security;

-- profiles: 누구나 조회(이름/아바타 노출용), 본인만 수정/삽입
create policy "profiles read"        on public.profiles for select using (true);
create policy "profiles upsert self" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update self" on public.profiles for update using (auth.uid() = id);

-- members: 본인만 read/write
create policy "members self" on public.members
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- gyms/trainers/gym_trainers: 공개 읽기
create policy "gyms read"         on public.gyms         for select using (true);
create policy "trainers read"     on public.trainers     for select using (true);
create policy "gym_trainers read" on public.gym_trainers for select using (true);

-- gyms: 해당 헬스장 관리자만 생성/수정 (실 헬스장 id == admin uuid). upsert 위해 insert+update 둘 다 필요.
create policy "gyms insert by admin" on public.gyms for insert
  with check (admin_id = auth.uid());
create policy "gyms update by admin" on public.gyms for update
  using (admin_id = auth.uid()) with check (admin_id = auth.uid());

-- trainers: 본인(연결된 profile)만 생성/수정. upsert 위해 insert+update 둘 다 정책 필요.
create policy "trainers insert self" on public.trainers for insert
  with check (profile_id = auth.uid());
create policy "trainers update self" on public.trainers for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- gym_admins: 본인만
create policy "gym_admins self" on public.gym_admins
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================
-- Phase 2-a: 예약(bookings)
--   회원이 트레이너에게 PT/상담을 예약. sessions는 jsonb(PTSession[])로 비정규화 —
--   스토어가 항상 booking 전체를 통째로 쓰고, 세션은 메모리에서만 계산하므로
--   별도 행/조인이 불필요(가장 단순). schedule도 jsonb(WeeklySchedule).
-- ============================================================
create table if not exists public.bookings (
  id                 text primary key,
  member_id          uuid not null references public.profiles(id) on delete cascade,
  member_name        text not null default '',
  trainer_id         text not null,                 -- 트레이너 카탈로그 id (현재 mock 카탈로그)
  trainer_name       text not null default '',
  product_id         text not null default '',
  total_sessions     int  not null default 0,
  remaining_sessions int  not null default 0,
  used_sessions      int  not null default 0,
  price_per_session  int  not null default 0,
  total_amount       int  not null default 0,
  schedule           jsonb not null default '{}',   -- WeeklySchedule
  sessions           jsonb not null default '[]',   -- PTSession[]
  status             text  not null default 'pending'
                       check (status in ('pending','active','completed','cancelled','refunded')),
  start_date         text  not null default '',
  notes              text,
  type               text  not null default 'pt' check (type in ('pt','consultation')),
  refunded_amount    int,
  refunded_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_bookings_member  on public.bookings(member_id);
create index if not exists idx_bookings_trainer on public.bookings(trainer_id);
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;

-- 회원은 본인 예약을, 트레이너는 (카탈로그 profile_id가 연결된) 자신 대상 예약을 조회
create policy "bookings select own" on public.bookings for select
  using (
    member_id = auth.uid()
    or exists (select 1 from public.trainers t
               where t.id = public.bookings.trainer_id and t.profile_id = auth.uid())
  );
-- 생성/취소·환불은 본인(회원)만
create policy "bookings insert own" on public.bookings for insert
  with check (member_id = auth.uid());
create policy "bookings update member" on public.bookings for update
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "bookings delete own" on public.bookings for delete
  using (member_id = auth.uid());
-- 확정/완료요청 등 상태변경은 해당 트레이너(profile 연결 시)도 허용 (트레이너 카탈로그 실연동 대비)
create policy "bookings update trainer" on public.bookings for update
  using (exists (select 1 from public.trainers t
                 where t.id = public.bookings.trainer_id and t.profile_id = auth.uid()));

-- ============================================================
-- Phase 2-c: 시설 슬롯 예약(slot_bookings)
--   트레이너가 헬스장 시설 슬롯을 예약(트레이너→헬스장), 헬스장 관리자가 승인/취소.
--   trainer_id = 트레이너 카탈로그 id(실 트레이너는 auth uuid), gym_id = 헬스장 id(실 헬스장은 admin uuid).
-- ============================================================
create table if not exists public.slot_bookings (
  id            text primary key,
  gym_id        text not null,
  gym_name      text not null default '',
  trainer_id    text not null default '',     -- 관리자 직접등록(addAdminSlot) 시 빈 문자열
  trainer_name  text not null default '',
  member_id     text,
  member_name   text,
  date          text not null,
  start_time    text not null,
  member_count  int  not null default 1,
  facility_fee  int  not null default 0,
  status        text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at    text not null default '',
  updated_at    timestamptz not null default now()
);
create index if not exists idx_slot_bookings_gym     on public.slot_bookings(gym_id);
create index if not exists idx_slot_bookings_trainer on public.slot_bookings(trainer_id);
create trigger trg_slot_bookings_updated before update on public.slot_bookings
  for each row execute function public.set_updated_at();

alter table public.slot_bookings enable row level security;

-- 조회: 본인(트레이너) 예약 + 자기 헬스장(관리자) 예약
create policy "slot_bookings select" on public.slot_bookings for select using (
  trainer_id = auth.uid()::text
  or exists (select 1 from public.gyms g where g.id = public.slot_bookings.gym_id and g.admin_id = auth.uid())
);
-- 생성: 트레이너(본인 slot) 또는 헬스장 관리자(자기 헬스장 slot 직접등록)
create policy "slot_bookings insert trainer" on public.slot_bookings for insert
  with check (trainer_id = auth.uid()::text);
create policy "slot_bookings insert gym" on public.slot_bookings for insert
  with check (exists (select 1 from public.gyms g where g.id = public.slot_bookings.gym_id and g.admin_id = auth.uid()));
-- 수정(확정/취소): 트레이너(본인) 또는 헬스장 관리자(자기 헬스장)
create policy "slot_bookings update" on public.slot_bookings for update using (
  trainer_id = auth.uid()::text
  or exists (select 1 from public.gyms g where g.id = public.slot_bookings.gym_id and g.admin_id = auth.uid())
);
create policy "slot_bookings delete trainer" on public.slot_bookings for delete
  using (trainer_id = auth.uid()::text);

-- ============================================================
-- Phase 3-a: 알림(notifications)
--   한 사용자가 다른 사용자에게 알림 생성(예: 회원 예약→트레이너 알림). user_id = 수신자(실 사용자 uuid).
-- ============================================================
create table if not exists public.notifications (
  id          text primary key,
  type        text not null,
  title       text not null default '',
  body        text not null default '',
  is_read     boolean not null default false,
  created_at  text not null default '',
  target_role text not null,
  user_id     text not null,       -- 수신자
  meta        jsonb,
  inserted_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id);

alter table public.notifications enable row level security;
-- 조회/읽음처리: 수신자 본인만. 생성: 인증된 사용자는 누구에게나(앱 내부 알림).
create policy "notifications select own" on public.notifications for select
  using (user_id = auth.uid()::text);
create policy "notifications insert" on public.notifications for insert
  with check (auth.uid() is not null);
create policy "notifications update own" on public.notifications for update
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

-- ============================================================
-- Phase 3-b: 채팅(conversations + chat_messages)
--   참여자(participant_ids text[])에 본인이 있으면 접근. 회원↔트레이너 / 트레이너↔헬스장.
-- ============================================================
create table if not exists public.conversations (
  id              text primary key,
  type            text not null,
  participant_ids text[] not null default '{}',
  participants    jsonb  not null default '[]',   -- {id,name,role}[]
  unread          jsonb  not null default '{}',   -- {userId: count}
  updated_at      timestamptz not null default now()
);
alter table public.conversations enable row level security;
create policy "conversations select" on public.conversations for select using (auth.uid()::text = any(participant_ids));
create policy "conversations insert" on public.conversations for insert with check (auth.uid()::text = any(participant_ids));
create policy "conversations update" on public.conversations for update using (auth.uid()::text = any(participant_ids)) with check (auth.uid()::text = any(participant_ids));

create table if not exists public.chat_messages (
  id              text primary key,
  conversation_id text not null,
  sender_id       text not null,
  sender_name     text not null default '',
  body            text not null default '',
  ts              bigint not null default 0,
  inserted_at     timestamptz not null default now()
);
create index if not exists idx_chat_messages_conv on public.chat_messages(conversation_id);
alter table public.chat_messages enable row level security;
create policy "chat_messages select" on public.chat_messages for select using (
  exists (select 1 from public.conversations c where c.id = public.chat_messages.conversation_id and auth.uid()::text = any(c.participant_ids))
);
create policy "chat_messages insert" on public.chat_messages for insert with check (
  exists (select 1 from public.conversations c where c.id = public.chat_messages.conversation_id and auth.uid()::text = any(c.participant_ids))
);

-- ============================================================
-- Phase 3-c: 후기(trainer_reviews + gym_reviews)
--   공개 읽기(카탈로그 신뢰신호), 회원 본인만 작성.
-- ============================================================
create table if not exists public.trainer_reviews (
  id            text primary key,
  trainer_id    text not null,
  trainer_name  text not null default '',
  booking_id    text,
  member_id     text not null,
  member_name   text not null default '',
  member_avatar text,
  rating        int  not null default 5,
  comment       text not null default '',
  media         jsonb not null default '[]',
  created_at    text not null default ''
);
create index if not exists idx_trainer_reviews_trainer on public.trainer_reviews(trainer_id);
alter table public.trainer_reviews enable row level security;
create policy "trainer_reviews read" on public.trainer_reviews for select using (true);
create policy "trainer_reviews insert own" on public.trainer_reviews for insert with check (member_id = auth.uid()::text);

create table if not exists public.gym_reviews (
  id            text primary key,
  gym_id        text not null,
  gym_name      text not null default '',
  member_id     text not null,
  member_name   text not null default '',
  member_avatar text,
  rating        int  not null default 5,
  comment       text not null default '',
  created_at    text not null default ''
);
create index if not exists idx_gym_reviews_gym on public.gym_reviews(gym_id);
alter table public.gym_reviews enable row level security;
create policy "gym_reviews read" on public.gym_reviews for select using (true);
create policy "gym_reviews insert own" on public.gym_reviews for insert with check (member_id = auth.uid()::text);

-- ============================================================
-- Phase 3-d: 파트너 신청(partner_requests)
--   트레이너→헬스장(application) / 헬스장→트레이너(invite). 양측(트레이너 본인 / 헬스장 관리자) 접근.
-- ============================================================
create table if not exists public.partner_requests (
  id                      text primary key,
  gym_id                  text not null,
  gym_name                text not null default '',
  trainer_id              text not null,
  trainer_name            text not null default '',
  trainer_tagline         text,
  trainer_specializations jsonb not null default '[]',
  type                    text not null check (type in ('application','invite')),
  status                  text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at              text not null default '',
  updated_at              timestamptz not null default now()
);
create index if not exists idx_partner_requests_gym     on public.partner_requests(gym_id);
create index if not exists idx_partner_requests_trainer on public.partner_requests(trainer_id);
alter table public.partner_requests enable row level security;
-- 트레이너 본인 또는 해당 헬스장 관리자만 접근(조회/생성/수정/삭제)
create policy "partner_requests select" on public.partner_requests for select using (
  trainer_id = auth.uid()::text
  or exists (select 1 from public.gyms g where g.id = public.partner_requests.gym_id and g.admin_id = auth.uid())
);
create policy "partner_requests insert" on public.partner_requests for insert with check (
  trainer_id = auth.uid()::text
  or exists (select 1 from public.gyms g where g.id = public.partner_requests.gym_id and g.admin_id = auth.uid())
);
create policy "partner_requests update" on public.partner_requests for update using (
  trainer_id = auth.uid()::text
  or exists (select 1 from public.gyms g where g.id = public.partner_requests.gym_id and g.admin_id = auth.uid())
);
create policy "partner_requests delete" on public.partner_requests for delete using (
  trainer_id = auth.uid()::text
  or exists (select 1 from public.gyms g where g.id = public.partner_requests.gym_id and g.admin_id = auth.uid())
);

-- ============================================================
-- Phase 3-e: 재등록 제안(offers)  — 트레이너→회원
-- ============================================================
create table if not exists public.offers (
  id                text primary key,
  trainer_id        text not null,
  trainer_name      text not null default '',
  member_id         text not null,
  member_name       text not null default '',
  session_count     int  not null default 0,
  price_per_session int  not null default 0,
  base_price        int  not null default 0,
  memo              text not null default '',
  expires_at        text not null default '',
  expiry_reminded   boolean not null default false,
  status            text not null default '제안' check (status in ('제안','수락','거절')),
  created_at        text not null default ''
);
create index if not exists idx_offers_member  on public.offers(member_id);
create index if not exists idx_offers_trainer on public.offers(trainer_id);
alter table public.offers enable row level security;
create policy "offers select" on public.offers for select using (trainer_id = auth.uid()::text or member_id = auth.uid()::text);
create policy "offers insert trainer" on public.offers for insert with check (trainer_id = auth.uid()::text);
create policy "offers update" on public.offers for update using (trainer_id = auth.uid()::text or member_id = auth.uid()::text);

-- ============================================================
-- Phase 3-f: 팔로우(follows)  — 공개 카운트, 본인만 추가/삭제
-- ============================================================
create table if not exists public.follows (
  follower_id text not null,
  followee_id text not null,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id)
);
create index if not exists idx_follows_followee on public.follows(followee_id);
alter table public.follows enable row level security;
create policy "follows read" on public.follows for select using (true);
create policy "follows insert own" on public.follows for insert with check (follower_id = auth.uid()::text);
create policy "follows delete own" on public.follows for delete using (follower_id = auth.uid()::text);

-- ============================================================
-- Phase B: 운영자(operator) + 신고(reports) + 입점신청(gym_applications)
--   운영자 역할 도입. 운영자만 전체 신고/입점신청을 조회·처리.
--   ⚠️ 운영자 계정은 가입이 아니라 기존 profiles 행의 role을 'operator'로 직접 설정:
--      update public.profiles set role='operator' where id='<운영자 uuid>';
-- ============================================================

-- profiles.role 제약에 'operator' 추가 (기존 테이블이라 alter 필요)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('member','trainer','gym_admin','operator'));

-- 운영자 여부 헬퍼(RLS에서 재사용). SECURITY DEFINER로 profiles RLS 우회.
create or replace function public.is_operator()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'operator');
$$;

-- ── 신고(reports) ── 로그인 회원/트레이너가 작성. 본인 또는 운영자만 조회, 운영자만 상태변경.
create table if not exists public.reports (
  id            text primary key,
  reporter_id   text not null,
  reporter_name text not null default '',
  target_type   text not null check (target_type in ('trainer','gym','member','content')),
  target_id     text,
  target_name   text not null default '',
  reason        text not null default '',
  detail        text,
  status        text not null default '접수' check (status in ('접수','검토중','조치완료','반려')),
  created_at    text not null default ''
);
create index if not exists idx_reports_reporter on public.reports(reporter_id);
alter table public.reports enable row level security;
create policy "reports insert own" on public.reports for insert with check (reporter_id = auth.uid()::text);
create policy "reports select own or operator" on public.reports for select using (reporter_id = auth.uid()::text or public.is_operator());
create policy "reports update operator" on public.reports for update using (public.is_operator()) with check (public.is_operator());

-- ── 입점신청(gym_applications) ── 비로그인 공개 폼 제출 → 운영자만 조회·처리.
create table if not exists public.gym_applications (
  id              text primary key,
  gym_name        text not null default '',
  owner_name      text not null default '',
  business_number text not null default '',
  phone           text not null default '',
  address         text not null default '',
  status          text not null default '대기' check (status in ('대기','승인','반려')),
  created_at      text not null default ''
);
alter table public.gym_applications enable row level security;
create policy "gym_applications insert public" on public.gym_applications for insert with check (true);
create policy "gym_applications select operator" on public.gym_applications for select using (public.is_operator());
create policy "gym_applications update operator" on public.gym_applications for update using (public.is_operator()) with check (public.is_operator());

-- ============================================================
-- Phase E: 채팅 실시간화 (Supabase Realtime)
--   열린 채팅방에서 상대방 신규 메시지를 실시간 수신하려면 chat_messages 테이블을
--   realtime publication에 추가해야 한다. (대시보드 Database > Replication 에서 토글하거나 아래 실행)
--   ✅ 보안(2026-07-01 정정): postgres_changes는 INSERT/UPDATE에 대해 구독자의 SELECT RLS를 강제한다.
--      chat_messages "select" 정책(참여자 본인만)이 있으므로 참여 대화의 메시지만 수신된다.
--      ⚠️ 단 Realtime에 로그인 JWT가 설정돼 있어야 함 → config/supabase.ts의 onAuthStateChange→
--         realtime.setAuth가 보장. (DELETE는 RLS 미적용이나 채팅은 INSERT만 구독하므로 무관.)
-- ============================================================
alter publication supabase_realtime add table public.chat_messages;

-- ============================================================
-- Phase E2: 개인데이터(다기기 동기화) — 찜/회원기록/수동일정
--   각자 본인 데이터만 접근. 회원기록은 트레이너가 작성, 회원은 공개(shared)분만 조회.
-- ============================================================

-- ── 찜(favorites) ── 회원이 찜한 트레이너. 본인만.
create table if not exists public.favorites (
  user_id    text not null,
  trainer_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, trainer_id)
);
alter table public.favorites enable row level security;
create policy "favorites select own" on public.favorites for select using (user_id = auth.uid()::text);
create policy "favorites insert own" on public.favorites for insert with check (user_id = auth.uid()::text);
create policy "favorites delete own" on public.favorites for delete using (user_id = auth.uid()::text);

-- ── 회원 운동기록(member_records) ── 트레이너 작성. 트레이너=본인 전체, 회원=공개분 조회.
create table if not exists public.member_records (
  id           text primary key,
  trainer_id   text not null,
  trainer_name text not null default '',
  member_id    text not null,
  date         text not null default '',
  content      text not null default '',
  shared       boolean not null default false,
  created_at   text not null default ''
);
create index if not exists idx_member_records_trainer on public.member_records(trainer_id);
create index if not exists idx_member_records_member  on public.member_records(member_id);
alter table public.member_records enable row level security;
create policy "member_records select" on public.member_records for select using (trainer_id = auth.uid()::text or (member_id = auth.uid()::text and shared));
create policy "member_records insert trainer" on public.member_records for insert with check (trainer_id = auth.uid()::text);
create policy "member_records update trainer" on public.member_records for update using (trainer_id = auth.uid()::text) with check (trainer_id = auth.uid()::text);
create policy "member_records delete trainer" on public.member_records for delete using (trainer_id = auth.uid()::text);

-- ── 수동 일정(manual_sessions) ── 트레이너가 직접 추가한 일정. 본인만.
create table if not exists public.manual_sessions (
  id          text primary key,
  trainer_id  text not null,
  date        text not null default '',
  start_time  text not null default '',
  end_time    text not null default '',
  member_name text not null default '',
  memo        text not null default '',
  status      text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  color       text not null default ''
);
create index if not exists idx_manual_sessions_trainer on public.manual_sessions(trainer_id);
alter table public.manual_sessions enable row level security;
create policy "manual_sessions all own" on public.manual_sessions for all using (trainer_id = auth.uid()::text) with check (trainer_id = auth.uid()::text);

-- ── 숨긴 예약(hidden_sessions) ── 트레이너가 스케줄에서 숨긴 세션 id. 본인만.
create table if not exists public.hidden_sessions (
  trainer_id text not null,
  session_id text not null,
  primary key (trainer_id, session_id)
);
alter table public.hidden_sessions enable row level security;
create policy "hidden_sessions select own" on public.hidden_sessions for select using (trainer_id = auth.uid()::text);
create policy "hidden_sessions insert own" on public.hidden_sessions for insert with check (trainer_id = auth.uid()::text);

-- ============================================================
-- Phase E3: 커뮤니티(community) — 게시글/댓글/그룹 + 반응/가입
--   콘텐츠는 공개 읽기, 작성자만 작성. 좋아요/싫어요는 공개 카운트(집계용), 저장은 본인만.
--   좋아요/댓글/멤버 수는 반응/댓글/멤버 테이블에서 집계(동시성 안전). 조회수만 원자 증가 RPC.
-- ============================================================

-- ── 게시글(posts) ──
create table if not exists public.posts (
  id              text primary key,
  category        text not null default '자유',
  title           text not null default '',
  content         text not null default '',
  author          text not null default '',
  author_id       text,
  author_avatar   text,
  location        text not null default '',
  views           int  not null default 0,
  image_url       text,
  is_video        boolean not null default false,
  video_url       text,
  related_group_id text,
  created_at      timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "posts read" on public.posts for select using (true);
create policy "posts insert own" on public.posts for insert with check (author_id = auth.uid()::text);

-- ── 댓글(comments) ──
create table if not exists public.comments (
  id            text primary key,
  post_id       text not null,
  author        text not null default '',
  author_id     text,
  author_avatar text,
  content       text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists idx_comments_post on public.comments(post_id);
alter table public.comments enable row level security;
create policy "comments read" on public.comments for select using (true);
create policy "comments insert own" on public.comments for insert with check (author_id = auth.uid()::text);

-- ── 그룹(groups) ──
create table if not exists public.groups (
  id           text primary key,
  category     text not null default '운동',
  name         text not null default '',
  description  text not null default '',
  location     text not null default '',
  max_members  int  not null default 0,
  is_recruiting boolean not null default true,
  image_url    text,
  creator_id   text,
  created_at   timestamptz not null default now()
);
alter table public.groups enable row level security;
create policy "groups read" on public.groups for select using (true);
create policy "groups insert own" on public.groups for insert with check (creator_id = auth.uid()::text);

-- ── 게시글 반응(post_reactions) ── like/dislike(공개 집계) + save(본인만)
create table if not exists public.post_reactions (
  user_id    text not null,
  post_id    text not null,
  type       text not null check (type in ('like','dislike','save')),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id, type)
);
create index if not exists idx_post_reactions_post on public.post_reactions(post_id);
alter table public.post_reactions enable row level security;
create policy "post_reactions read" on public.post_reactions for select using (type in ('like','dislike') or user_id = auth.uid()::text);
create policy "post_reactions insert own" on public.post_reactions for insert with check (user_id = auth.uid()::text);
create policy "post_reactions delete own" on public.post_reactions for delete using (user_id = auth.uid()::text);

-- ── 그룹 가입(group_members) ── 공개 카운트, 본인만 가입/탈퇴
create table if not exists public.group_members (
  user_id    text not null,
  group_id   text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);
create index if not exists idx_group_members_group on public.group_members(group_id);
alter table public.group_members enable row level security;
create policy "group_members read" on public.group_members for select using (true);
create policy "group_members insert own" on public.group_members for insert with check (user_id = auth.uid()::text);
create policy "group_members delete own" on public.group_members for delete using (user_id = auth.uid()::text);

-- 조회수 원자 증가(동시성 안전). 게시자 아닌 누구나 +1 가능하도록 SECURITY DEFINER.
create or replace function public.increment_post_views(p_id text)
returns void language sql security definer as $$
  update public.posts set views = views + 1 where id = p_id;
$$;

-- ============================================================
-- Phase F: 보안 강화 패치 (RLS 전수 점검 2026-07-01)
--   ⚠️ 기존 환경은 이 블록만 실행하면 적용됨. 신규 환경은 전체 재실행 시 마지막에 덮어쓴다.
--   C1=권한상승, C2=개인정보노출, M1=발신자위조, M4=카탈로그 사칭.
-- ============================================================

-- ── C1. profiles 권한 상승 차단 (operator 탈취) ──
--   ① 가입 경로: handle_new_user가 메타데이터 role을 그대로 신뢰 → operator 가입 가능했음.
--      허용 역할(member/trainer/gym_admin)만 받고, 그 외는 member로 강등.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' in ('member','trainer','gym_admin')
         then new.raw_user_meta_data->>'role' else 'member' end,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end; $$;

--   ② 직접 insert 경로: 클라가 profiles를 role='operator'로 직접 생성 못 하게.
drop policy if exists "profiles upsert self" on public.profiles;
create policy "profiles upsert self" on public.profiles for insert
  with check (auth.uid() = id and role <> 'operator');

--   ③ update 경로: 본인 행 role을 임의 변경 못 하게. auth.uid()가 있는(일반 사용자) 토큰에서
--      role 변경 시 원래 값으로 되돌림. 운영자 지정은 service_role(SQL Editor, auth.uid() null)이라 영향 없음.
create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end; $$;
drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role before update on public.profiles
  for each row execute function public.protect_profile_role();

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ── C2. profiles 개인정보 노출 차단 ──
--   read 정책(using true)은 name/avatar 공개 위해 유지하되, phone/email은 컬럼 권한으로 가린다.
--   ⚠️ Postgres는 테이블 레벨 GRANT SELECT가 있으면 컬럼 레벨 REVOKE를 무시한다(Supabase 기본 부여).
--      → 테이블 SELECT를 회수하고 안전한 컬럼만 명시적으로 GRANT 해야 phone/email이 실제로 가려진다.
--   (클라이언트는 profiles에서 role/name만 읽으므로 앱 영향 없음. 본인 정보 표시 필요 시 별도 경로로.)
revoke select on public.profiles from anon, authenticated;
grant select (id, role, name, avatar_url, created_at, updated_at) on public.profiles to anon, authenticated;

-- ── M1. 채팅 발신자 위조 차단 ──
--   같은 대화 참여자라도 sender_id는 본인이어야 insert 가능.
drop policy if exists "chat_messages insert" on public.chat_messages;
create policy "chat_messages insert" on public.chat_messages for insert with check (
  sender_id = auth.uid()::text
  and exists (select 1 from public.conversations c
              where c.id = public.chat_messages.conversation_id and auth.uid()::text = any(c.participant_ids))
);

-- ── M4. mock 카탈로그 사칭 차단 ──
--   실 트레이너/헬스장은 id == auth uuid 컨벤션. id를 임의 지정(trainer_001 등)해 사칭하지 못하게 강제.
drop policy if exists "trainers insert self" on public.trainers;
create policy "trainers insert self" on public.trainers for insert
  with check (profile_id = auth.uid() and id = auth.uid()::text);

drop policy if exists "gyms insert by admin" on public.gyms;
create policy "gyms insert by admin" on public.gyms for insert
  with check (admin_id = auth.uid() and id = auth.uid()::text);

-- ── ③. gym_applications 스팸 방어 ──
--   익명 공개 폼이라 봇이 garbage를 무제한 넣을 수 있었음(with check true).
--   ① 형식 검증: 필수 항목 비어있지 않을 것 + 사업자번호 형식(3-2-5).
--   ② 대기중 동일 사업자번호 중복 차단(부분 unique index). 반려/승인 후 재신청은 허용.
--   ※ IP/캡차 기반 완전 봇 차단은 별도 인프라(Edge Function/Turnstile) 필요 — 후속 과제.
drop policy if exists "gym_applications insert public" on public.gym_applications;
create policy "gym_applications insert public" on public.gym_applications for insert with check (
  length(btrim(gym_name)) > 0
  and length(btrim(owner_name)) > 0
  and business_number ~ '^[0-9]{3}-?[0-9]{2}-?[0-9]{5}$'
  and length(btrim(phone)) >= 9
  and length(btrim(address)) > 0
);
create unique index if not exists uq_gym_app_pending_biz
  on public.gym_applications (business_number) where status = '대기';

-- ============================================================
-- Phase G: 결제(payments) — 포트원 v2 연동 골격
--   회원이 PT 결제 시 결제 기록 생성. 에스크로/정산은 booking status + settlements(Phase 정산)로.
--   ⚠️ 보안: 지금은 클라가 직접 insert(금액 위조 가능)이나, 실 결제는 Edge Function(verify-payment)이
--      포트원 API로 결제 금액·상태를 검증한 뒤 기록하도록 강화 예정 — 아래 insert 정책은 골격용.
-- ============================================================
create table if not exists public.payments (
  id            text primary key,     -- orderId (pt_타임스탬프)
  booking_id    text not null,
  member_id     text not null,
  amount        int  not null default 0,
  status        text not null default 'paid' check (status in ('paid','refunded','failed')),
  pg_payment_id text,                 -- 포트원 결제 고유 id
  created_at    text not null default ''
);
create index if not exists idx_payments_booking on public.payments(booking_id);
create index if not exists idx_payments_member  on public.payments(member_id);
alter table public.payments enable row level security;
create policy "payments select own" on public.payments for select using (member_id = auth.uid()::text);
create policy "payments insert own" on public.payments for insert with check (member_id = auth.uid()::text);
create policy "payments update own" on public.payments for update using (member_id = auth.uid()::text) with check (member_id = auth.uid()::text);

-- ============================================================
-- Phase H: 정산(settlements) — 세션 완료 시 트레이너 90% / 플랫폼 10%
--   회원이 세션완료 확인 시 해당 세션분 에스크로 해제 → 트레이너 입금 기록.
--   ⚠️ 골격: 금액을 클라가 계산해 insert(위조 가능). 실 운영은 트리거/Edge Function으로
--      booking.price_per_session 기준 서버 계산 권장.
-- ============================================================
create table if not exists public.settlements (
  id             text primary key,
  booking_id     text not null,
  session_id     text not null,
  trainer_id     text not null,
  member_id      text not null,
  gross_amount   int not null default 0,
  trainer_amount int not null default 0,
  platform_fee   int not null default 0,
  status         text not null default 'settled' check (status in ('settled','reversed')),
  created_at     text not null default ''
);
create index if not exists idx_settlements_trainer on public.settlements(trainer_id);
create index if not exists idx_settlements_booking on public.settlements(booking_id);
alter table public.settlements enable row level security;
create policy "settlements select" on public.settlements for select using (trainer_id = auth.uid()::text or member_id = auth.uid()::text);
create policy "settlements insert member" on public.settlements for insert with check (member_id = auth.uid()::text);

-- ============================================================
-- Phase I: 푸시 토큰(push_tokens) — 네이티브 푸시 알림
--   기기별 Expo push token 저장. 발송(send-push Edge Function)이 수신자 토큰을 조회해 사용.
-- ============================================================
create table if not exists public.push_tokens (
  user_id    text not null,
  token      text not null,
  platform   text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
create index if not exists idx_push_tokens_user on public.push_tokens(user_id);
alter table public.push_tokens enable row level security;
create policy "push_tokens select own" on public.push_tokens for select using (user_id = auth.uid()::text);
create policy "push_tokens upsert own" on public.push_tokens for insert with check (user_id = auth.uid()::text);
create policy "push_tokens update own" on public.push_tokens for update using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy "push_tokens delete own" on public.push_tokens for delete using (user_id = auth.uid()::text);

-- ============================================================
-- Phase J: 결제/정산 금액 서버 강제 (위변조 방지) — 보안 후속
--   클라가 보낸 금액을 신뢰하지 않고, booking을 기준으로 서버(트리거)가 재계산해 덮어쓴다.
--   → 회원이 amount/trainer_amount 등을 조작해 insert해도 실제 저장값은 booking 기준으로 강제됨.
--   (실 PG 결제 검증은 verify-payment Edge Function이 병행 — 이중 방어.)
-- ============================================================

-- payments: 저장 금액을 booking.total_amount로 강제
create or replace function public.enforce_payment_amount()
returns trigger language plpgsql security definer as $$
declare v_total int;
begin
  select total_amount into v_total from public.bookings where id = new.booking_id;
  if v_total is null then raise exception 'invalid booking_id'; end if;
  new.amount := v_total;
  return new;
end; $$;
drop trigger if exists trg_enforce_payment_amount on public.payments;
create trigger trg_enforce_payment_amount before insert on public.payments
  for each row execute function public.enforce_payment_amount();

-- settlements: 금액(90/10)·트레이너를 booking 기준으로 강제
create or replace function public.enforce_settlement_amount()
returns trigger language plpgsql security definer as $$
declare v_pps int; v_trainer text;
begin
  select price_per_session, trainer_id into v_pps, v_trainer from public.bookings where id = new.booking_id;
  if v_pps is null then raise exception 'invalid booking_id'; end if;
  new.gross_amount := v_pps;
  new.trainer_amount := round(v_pps * 0.9);
  new.platform_fee := v_pps - round(v_pps * 0.9);
  new.trainer_id := v_trainer;
  return new;
end; $$;
drop trigger if exists trg_enforce_settlement_amount on public.settlements;
create trigger trg_enforce_settlement_amount before insert on public.settlements
  for each row execute function public.enforce_settlement_amount();

-- ============================================================
-- Phase K: 마케팅 수신 동의(profiles.marketing_consent)
--   가입 시 [선택] 마케팅 동의값을 저장(가입 metadata → handle_new_user 트리거).
--   ※ 이 블록은 Phase F의 handle_new_user를 marketing_consent 포함 버전으로 덮어쓴다(최신).
-- ============================================================
alter table public.profiles add column if not exists marketing_consent boolean not null default false;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, name, email, marketing_consent)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' in ('member','trainer','gym_admin')
         then new.raw_user_meta_data->>'role' else 'member' end,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- ============================================================
-- Phase L: 세션 리마인더 스케줄 (pg_cron) — 배포 후 실행 (아래는 주석/안내)
--   session-reminder Edge Function을 매시간 호출해 임박(24h 내) 세션 리마인더를 발송한다.
--   ⚠️ 선행: ① supabase functions deploy session-reminder
--            ② 대시보드 Database > Extensions 에서 pg_cron, pg_net 활성화
--   아래에서 <PROJECT_REF>·<SERVICE_ROLE_KEY>를 실제 값으로 치환 후 SQL Editor에서 실행:
--
--   select cron.schedule(
--     'session-reminder-hourly', '0 * * * *',
--     $$ select net.http_post(
--       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/session-reminder',
--       headers := jsonb_build_object('Authorization','Bearer <SERVICE_ROLE_KEY>','Content-Type','application/json')
--     ); $$
--   );
--   해제: select cron.unschedule('session-reminder-hourly');
-- ============================================================
