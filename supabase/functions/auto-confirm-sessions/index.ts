// @ts-nocheck
// Supabase Edge Function: 세션 완료 자동 확정 (pg_cron이 하루 1회 호출)
// ─────────────────────────────────────────────────────────────
// 트레이너가 완료를 요청하면 세션은 pending 이 되고 회원 확인을 기다린다.
// 회원이 확인도 이의제기도 하지 않으면 그 회차의 정산이 영원히 멈춘다
// (트레이너는 수업을 하고도 대금을 못 받고, 회원 에스크로에는 돈이 묶인다).
//
// 환불정책 제5조에 고지한 대로, 완료 요청 후 AUTO_CONFIRM_DAYS 일이 지나면
// 완료된 것으로 자동 확정하고 정산한다.
//
// 처리 내용(클라이언트 bookingStore.completeSession 과 같은 결과):
//   · 세션 pending → completed, used +1 / remaining −1
//   · remaining 이 0이면 booking.status → completed, 아니면 active
//   · settlements 생성 (트레이너 90% / 플랫폼 10%)  ※ 금액은 Phase J 트리거가 재계산
//   · escrow_ledger 에 release(−) 기록 (Phase U)
//   · 회원·트레이너에게 알림
//
// 멱등성: settlements.id = settle_<sessionId> 가 PK라 재실행해도 중복 정산되지 않는다.
//         이미 completed 인 세션은 조회 대상에서 빠진다.
//
// 7일은 세션의 requestedAt(트레이너가 완료를 요청한 시각)부터 센다.
// requestedAt 이 없는 옛 행은 booking.updated_at 으로 대신한다 — 이 필드가 생기기 전에
// 만들어진 완료요청도 언젠가는 확정돼야 하기 때문이다.
//
// ⚠️ 실제 대금 이체(PG 지급대행)는 아직 연결되지 않았다. 장부상 정산까지만 수행한다.
//
// ⚠️ 배포·스케줄:
//   1) supabase functions deploy auto-confirm-sessions
//   2) 대시보드 Database > Extensions 에서 pg_cron, pg_net 활성화
//   3) schema.sql "Phase U-6" 주석의 cron.schedule 실행 (PROJECT_REF/키 치환)
// ─────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// utils/constants.ts 의 SESSION_AUTO_CONFIRM_DAYS 와 같은 값이어야 한다.
// 환불정책 문서가 이 일수를 회원에게 고지하고 있다.
const AUTO_CONFIRM_DAYS = 7;
const PLATFORM_RATE = 0.1;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}


// cron 전용 함수다. anon 키는 웹 번들에 공개돼 있으므로,
// pg_cron 이 쓰는 service_role 키로 온 요청만 받는다.
// (앱에서 부르는 send-push·verify-payment·delete-account 에는 이 가드를 넣으면 안 된다)
function isFromCron(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${SERVICE_ROLE_KEY}`;
}
serve(async (req) => {
  if (!isFromCron(req)) return json({ ok: false, error: 'forbidden' }, 401);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'missing env' }, 500);
  }
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const cutoff = Date.now() - AUTO_CONFIRM_DAYS * 86400_000;

  // 진행 중인 예약을 모두 훑고, 기한이 지난 세션은 아래에서 세션 단위로 가른다.
  // updated_at 으로 예약을 미리 거르지 않는다 — 같은 예약의 다른 회차를 건드리면
  // updated_at 이 갱신되어, 기한이 지난 회차까지 함께 미뤄지기 때문이다.
  const { data: bookings, error } = await db
    .from('bookings')
    .select('*')
    .in('status', ['pending', 'active']);

  if (error) return json({ ok: false, error: error.message }, 500);

  let confirmed = 0;

  for (const b of bookings ?? []) {
    const sessions = Array.isArray(b.sessions) ? b.sessions : [];

    // requestedAt 이 없는 옛 행은 예약의 updated_at 을 대신 쓴다
    const requestedMs = (s: any) =>
      new Date(s.requestedAt ?? b.updated_at ?? 0).getTime();

    const due = sessions.filter(
      (s: any) => s.status === 'pending' && requestedMs(s) < cutoff,
    );
    if (due.length === 0) continue;

    const dueIds = new Set(due.map((s: any) => s.id));
    const nextSessions = sessions.map((s: any) =>
      dueIds.has(s.id) ? { ...s, status: 'completed' } : s,
    );
    const used = (b.used_sessions ?? 0) + due.length;
    const remaining = Math.max(0, (b.remaining_sessions ?? 0) - due.length);

    const { error: upErr } = await db
      .from('bookings')
      .update({
        sessions: nextSessions,
        used_sessions: used,
        remaining_sessions: remaining,
        status: remaining === 0 ? 'completed' : 'active',
      })
      .eq('id', b.id);
    if (upErr) continue;

    const gross = b.price_per_session ?? 0;
    const trainerAmount = Math.round(gross * (1 - PLATFORM_RATE));

    for (const s of due) {
      // 같은 id 로 다시 넣으면 PK 충돌로 거부된다 = 중복 정산 방지
      await db.from('settlements').insert({
        id: `settle_${s.id}`,
        booking_id: b.id,
        session_id: s.id,
        trainer_id: b.trainer_id,
        member_id: b.member_id,
        gross_amount: gross,
        trainer_amount: trainerAmount,
        platform_fee: gross - trainerAmount,
        status: 'settled',
        created_at: new Date().toISOString().slice(0, 10),
      });
      await db.from('escrow_ledger').insert({
        id: `esc_rel_${s.id}`,
        booking_id: b.id,
        member_id: b.member_id,
        session_id: s.id,
        kind: 'release',
        amount: -gross,
        memo: `무응답 ${AUTO_CONFIRM_DAYS}일 자동 확정`,
      });
      confirmed++;
    }

    // 회원에게는 이의제기 경로를 함께 알린다(사후 재검토가 가능해야 한다)
    await db.from('notifications').insert({
      id: `n_auto_${b.id}_${due[0].id}`,
      type: 'session_auto_confirmed',
      title: '세션이 자동으로 완료 확정되었습니다',
      body: `${b.trainer_name} 트레이너의 완료 요청에 ${AUTO_CONFIRM_DAYS}일간 응답이 없어 ${due.length}회가 완료 처리되었습니다. 사실과 다르면 고객센터로 알려주세요.`,
      user_id: b.member_id,
      target_role: 'member',
    });
  }

  return json({ ok: true, confirmed });
});
