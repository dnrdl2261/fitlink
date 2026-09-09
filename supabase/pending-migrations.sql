-- ============================================================
-- FLOWIN 미적용 마이그레이션 (2026-09-09 기준)
--
--   Supabase SQL Editor 에 이 파일 전체를 붙여넣고 Run 한 번이면 끝난다.
--   ⚠️ 에디터에 텍스트가 드래그 선택돼 있으면 그 부분만 실행된다. 선택을 풀 것.
--
--   포함: Phase W (알림 사칭 차단)
--
--   Phase S·T·U(2026-09-08) · V(2026-09-09) 는 적용 완료돼 이 파일에서 뺐다.
--   원본은 schema.sql 하단에 그대로 있다. 실행 후 이 파일은 지워도 된다.
-- ============================================================

-- ============================================================
-- Phase W: 알림 사칭 차단 (M3 잔여 — Phase V rate limit 으로는 안 풀리는 부분)
--
--   문제: notifications insert 정책이 `auth.uid() is not null` 뿐이라
--         아무 로그인 사용자나 **임의 수신자에게 임의 문구** 알림을 만들 수 있었다.
--         게다가 send-push 가 알림 id 로 DB 에서 문구를 읽어 발송하므로
--         "결제 오류입니다" 같은 **실제 푸시 사칭 피싱**이 가능했다.
--         (send-push 의 위조 방지 수정이 이 경로로 우회됨)
--
--   규칙 한 줄: **아는 사이면 네 문구, 모르는 사이면 서버 문구.**
--     - 수신자가 나와 예약·슬롯·파트너신청·대화로 엮인 사람 → 클라이언트 문구 그대로
--     - 그렇지 않으면 → title/body 를 type 기준 서버 템플릿으로 덮어씀
--
--   ⚠️ 일부러 **예외를 던지지 않는다.** 알림 insert 는 fire-and-forget 이라
--      거절하면 화면엔 성공으로 뜨고 알림만 조용히 사라진다. 특히
--      `booking/new.tsx` 는 예약 mirror 가 끝나기 전에 트레이너 알림을 보내므로
--      관계 검사로 거절했다면 **앱에서 가장 중요한 "새 예약" 알림이 사라졌을 것**이다.
--      (그 경쟁 조건 자체는 클라이언트에서 awaitBookingSaved 로 따로 막았다)
-- ============================================================

-- 대화 참여자 조회용 (참여자 배열 any() 검색)
create index if not exists idx_conversations_participants
  on public.conversations using gin(participant_ids);

create or replace function public.enforce_notification_target() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor   uuid := auth.uid();
  related boolean;
  s       text;   -- 발신자 표시명
begin
  -- service_role · pg_cron(session-reminder 등)은 그대로 통과
  if actor is null then return NEW; end if;

  -- 본인에게 보내는 알림(결제완료·취소 확인 등)
  if NEW.user_id = actor::text then return NEW; end if;

  select
       exists (select 1 from public.bookings b
                where (b.member_id = actor        and b.trainer_id     = NEW.user_id)
                   or (b.trainer_id = actor::text and b.member_id::text = NEW.user_id))
    or exists (select 1 from public.slot_bookings sb
                 join public.gyms g on g.id = sb.gym_id
                where (sb.trainer_id = actor::text and g.admin_id::text = NEW.user_id)
                   or (sb.trainer_id = NEW.user_id and g.admin_id      = actor))
    or exists (select 1 from public.partner_requests r
                 join public.gyms g on g.id = r.gym_id
                where (r.trainer_id = actor::text and g.admin_id::text = NEW.user_id)
                   or (r.trainer_id = NEW.user_id and g.admin_id      = actor))
    or exists (select 1 from public.conversations c
                where actor::text = any(c.participant_ids)
                  and NEW.user_id = any(c.participant_ids))
  into related;

  if related then return NEW; end if;

  -- 모르는 사이 → 문구를 서버가 만든다(사칭 불가). 발송 자체는 막지 않는다.
  select coalesce(nullif(p.name, ''), '사용자') into s
    from public.profiles p where p.id = actor;
  s := coalesce(s, '사용자');

  case NEW.type
    when 'booking_confirmed'      then NEW.title := '예약 알림';
                                       NEW.body  := s || '님과의 PT 예약에 변동이 있습니다. 예약 화면에서 확인해 주세요.';
    when 'booking_cancelled'      then NEW.title := '예약이 취소되었습니다';
                                       NEW.body  := s || '님과의 PT 예약이 취소되었습니다.';
    when 'session_reminder'       then NEW.title := '세션 알림';
                                       NEW.body  := '예정된 세션이 있습니다. 일정을 확인해 주세요.';
    when 'session_completed'      then NEW.title := '세션이 완료되었습니다';
                                       NEW.body  := s || '님과의 세션이 완료 처리되었습니다.';
    when 'session_confirm_request' then NEW.title := '세션 완료 확인 요청';
                                       NEW.body  := s || '님이 세션 완료 확인을 요청했습니다.';
    when 'session_confirmed'      then NEW.title := '세션이 확인되었습니다';
                                       NEW.body  := s || '님이 세션 완료를 확인했습니다.';
    when 'session_disputed'       then NEW.title := '세션에 이의가 제기되었습니다';
                                       NEW.body  := s || '님이 세션 완료 요청에 이의를 제기했습니다.';
    when 'slot_request'           then NEW.title := '새 슬롯 예약 요청';
                                       NEW.body  := s || '님이 슬롯 예약을 요청했습니다.';
    when 'slot_approved'          then NEW.title := '슬롯 예약이 승인되었습니다';
                                       NEW.body  := s || '님이 슬롯 예약을 승인했습니다.';
    when 'slot_rejected'          then NEW.title := '슬롯 예약이 거절되었습니다';
                                       NEW.body  := s || '님이 슬롯 예약을 거절했습니다.';
    when 'payment_done'           then NEW.title := '결제가 완료되었습니다';
                                       NEW.body  := '결제가 정상 처리되었습니다. 결제 내역에서 확인해 주세요.';
    when 'review_received'        then NEW.title := '새 후기가 등록되었습니다';
                                       NEW.body  := s || '님이 후기를 남겼습니다.';
    when 'partner_approved'       then NEW.title := '파트너 신청이 승인되었습니다';
                                       NEW.body  := s || '님이 파트너 신청을 승인했습니다.';
    when 'partner_rejected'       then NEW.title := '파트너 신청이 거절되었습니다';
                                       NEW.body  := s || '님이 파트너 신청을 거절했습니다.';
    when 'partner_invite'         then NEW.title := '헬스장 초대가 도착했습니다';
                                       NEW.body  := s || '님이 파트너 초대를 보냈습니다. 확인 후 수락해 주세요.';
    when 'partner_request'        then NEW.title := '파트너 입점 신청이 도착했습니다';
                                       NEW.body  := s || '님이 입점을 신청했습니다. 검토 후 승인해 주세요.';
    when 'consultation_request'   then NEW.title := '무료상담이 접수되었습니다';
                                       NEW.body  := s || '님이 무료상담을 신청했습니다.';
    when 'trainer_proposal'       then NEW.title := 'PT 제안이 도착했습니다';
                                       NEW.body  := s || '님이 PT 제안을 보냈습니다. 확인해 주세요.';
    else                               NEW.title := '새 알림';
                                       NEW.body  := '앱에서 확인해 주세요.';
  end case;

  return NEW;
end $$;

-- trg_a(작성자 각인) → trg_b(rate limit) → trg_c(수신자 검증) 순서로 실행된다.
drop trigger if exists trg_c_notification_target on public.notifications;
create trigger trg_c_notification_target before insert on public.notifications
  for each row execute function public.enforce_notification_target();
