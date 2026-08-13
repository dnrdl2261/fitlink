// @ts-nocheck
// Supabase Edge Function: 회차권 유효기간 만료 처리 (pg_cron이 하루 1회 호출)
// ─────────────────────────────────────────────────────────────
// 환불정책 제5조 — 유효기간(결제일 + 12개월)이 지난 회차권의 잔여 회차는
// **소멸시키지 않고 환불**한다. 소멸 조항은 약관규제법상 무효 소지가 있어 자동 환불로 설계했다.
//
// 처리 내용(클라이언트 bookingStore.refundBooking 과 동일한 결과):
//   · 예정(scheduled)·확인대기(pending) 세션 → cancelled
//   · status → refunded, remaining_sessions → 0
//   · refunded_amount = 잔여 회차 × 회차당 가격, refunded_at = now
//   · payments 행도 refunded 로 미러
//   · 회원에게 알림 생성(중복 방지: id = n_exp_<bookingId>)
//
// ⚠️ 실제 대금 반환(PG 환불 API)은 아직 연결되지 않았다. PG 계약 후
//    아래 TODO 위치에서 토스페이먼츠 환불 API를 호출해야 실제 돈이 돌아간다.
//    현재는 장부상 환불 처리까지만 수행한다.
//
// ⚠️ 배포·스케줄:
//   1) supabase functions deploy expire-bookings
//   2) 대시보드 Database > Extensions 에서 pg_cron, pg_net 활성화
//   3) schema.sql "Phase N" 주석의 cron.schedule 실행 (PROJECT_REF/키 치환)
// ─────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async () => {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const nowIso = new Date().toISOString();

    // 아직 살아있는(환불·완료·취소되지 않은) 예약 중 유효기간이 지난 건
    const { data: expired, error } = await admin
      .from('bookings')
      .select('*')
      .in('status', ['pending', 'active'])
      .not('expires_at', 'is', null)
      .lt('expires_at', nowIso);

    if (error) return json({ ok: false, error: error.message }, 500);
    if (!expired || expired.length === 0) return json({ ok: true, expired: 0 });

    let refundedCount = 0;

    for (const b of expired) {
      const remaining = b.remaining_sessions ?? 0;

      // 잔여 회차가 없으면 환불할 것이 없다 → 완료 처리만 한다.
      if (remaining <= 0) {
        await admin.from('bookings').update({ status: 'completed', updated_at: nowIso }).eq('id', b.id);
        continue;
      }

      const refundedAmount = remaining * (b.price_per_session ?? 0);
      const sessions = (b.sessions ?? []).map((s: any) =>
        s.status === 'scheduled' || s.status === 'pending' ? { ...s, status: 'cancelled' } : s
      );

      // TODO(PG 계약 후): 여기서 토스페이먼츠 환불 API를 호출해 실제 대금을 반환한다.
      //   payments 행의 pg_payment_id 로 부분취소를 요청하고, 실패 시 이 건은 건너뛰어야 한다.

      const { error: upErr } = await admin
        .from('bookings')
        .update({
          sessions,
          status: 'refunded',
          remaining_sessions: 0,
          refunded_amount: refundedAmount,
          refunded_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', b.id);

      if (upErr) continue; // 실패 건은 다음 실행에서 다시 대상이 된다(재시도 안전)

      await admin.from('payments').update({ status: 'refunded' }).eq('booking_id', b.id);

      // 회원 알림 — id를 고정해 재실행 시 중복 생성되지 않게 한다.
      await admin.from('notifications').upsert({
        id: `n_exp_${b.id}`,
        user_id: b.member_id,
        type: 'booking_cancelled',
        target_role: 'member',
        title: '회차권 유효기간이 만료되어 환불되었습니다',
        body: `${b.trainer_name} 트레이너와의 잔여 ${remaining}회에 대해 ${refundedAmount.toLocaleString()}원을 환불했습니다.`,
        meta: { bookingId: b.id },
        is_read: false,
        created_at: nowIso,
      });

      refundedCount++;
    }

    return json({ ok: true, expired: expired.length, refunded: refundedCount });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
