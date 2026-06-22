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

-- gyms: 해당 헬스장 관리자만 수정
create policy "gyms update by admin" on public.gyms for update
  using (admin_id = auth.uid());

-- trainers: 본인(연결된 profile)만 수정
create policy "trainers update self" on public.trainers for update
  using (profile_id = auth.uid());

-- gym_admins: 본인만
create policy "gym_admins self" on public.gym_admins
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
