// @ts-nocheck
// Supabase Edge Function: 세션 리마인더 (pg_cron이 주기 호출)
// ─────────────────────────────────────────────────────────────
// 다가오는 24시간 내 예정(scheduled) PT 세션을 찾아 회원에게 리마인더 알림을 생성하고
// 푸시(send-push)를 발송한다. 세션당 1회만(중복 방지: notification id = n_rem_<sessionId>).
//
// ⚠️ 배포·스케줄 (네이티브/운영 준비 후):
//   1) supabase functions deploy session-reminder
//   2) 대시보드 Database > Extensions 에서 pg_cron, pg_net 활성화
//   3) SQL Editor 에서 cron.schedule 등록 (schema.sql "Phase L" 주석 참고, PROJECT_REF/키 치환)
// ─────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async () => {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24시간 이내

    // 활성/대기 예약만 대상
    const { data: bookings } = await admin.from('bookings').select('*').in('status', ['active', 'pending']);
    if (!bookings || bookings.length === 0) return json({ ok: true, sent: 0 });

    // 이미 리마인더 보낸 세션 id 집합(중복 방지)
    const { data: sentRows } = await admin.from('notifications').select('meta').eq('type', 'session_reminder');
    const sentIds = new Set((sentRows ?? []).map((n: any) => n?.meta?.sessionId).filter(Boolean));

    let count = 0;
    for (const b of bookings) {
      const sessions = Array.isArray(b.sessions) ? b.sessions : [];
      for (const s of sessions) {
        if (s?.status !== 'scheduled' || !s?.date || !s?.startTime) continue;
        if (sentIds.has(s.id)) continue;
        const start = new Date(`${s.date}T${s.startTime}:00`);
        if (isNaN(start.getTime()) || start < now || start > soon) continue;

        const notif = {
          id: `n_rem_${s.id}`,
          type: 'session_reminder',
          title: 'PT 세션이 곧 시작됩니다',
          body: `${b.trainer_name || '트레이너'}와의 PT가 ${s.date} ${s.startTime}에 예정되어 있습니다.`,
          is_read: false,
          created_at: new Date().toISOString(),
          target_role: 'member',
          user_id: b.member_id,
          meta: { bookingId: b.id, sessionId: s.id },
        };
        // id 중복(이미 생성) 시 무시. onConflict로 안전.
        const { error } = await admin.from('notifications').upsert(notif, { onConflict: 'id', ignoreDuplicates: true });
        if (error) continue;
        sentIds.add(s.id);
        // 네이티브 푸시(미배포/토큰없음이면 무시)
        await admin.functions.invoke('send-push', {
          body: { userId: b.member_id, title: notif.title, body: notif.body, data: notif.meta },
        }).catch(() => {});
        count++;
      }
    }
    return json({ ok: true, sent: count });
  } catch (e) {
    return json({ ok: false, message: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
