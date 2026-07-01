// @ts-nocheck
// Supabase Edge Function: 포트원 v2 결제 서버 검증 (위변조 방지)
// ─────────────────────────────────────────────────────────────
// 프론트(payment.web.ts)에서 결제 성공 후 paymentId를 보내면, 서버가 포트원 API로
// 실제 결제 상태·금액을 대조해 위·변조(클라이언트 금액 조작)를 차단한다.
//
// ⚠️ 배포·시크릿 설정 (계약/샌드박스 발급 후):
//   1) supabase secrets set PORTONE_V2_API_SECRET=<포트원 콘솔 > 결제연동 > API Secret>
//   2) supabase functions deploy verify-payment
//   시크릿 미설정 시 verified=false 반환(안전 기본값).
// ─────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PORTONE_API_SECRET = Deno.env.get('PORTONE_V2_API_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { paymentId, bookingId, expectedAmount } = await req.json();
    if (!paymentId || typeof expectedAmount !== 'number') {
      return json({ verified: false, reason: 'bad_request' }, 400);
    }
    if (!PORTONE_API_SECRET) {
      // 시크릿 미설정 = 아직 실 검증 불가. 안전 기본값(미검증).
      return json({ verified: false, reason: 'not_configured' });
    }

    // 포트원 결제 단건 조회
    const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
    });
    if (!res.ok) return json({ verified: false, reason: 'portone_error', status: res.status });

    const payment = await res.json();
    // 검증: 결제 완료(PAID) + 금액 일치
    const verified = payment?.status === 'PAID' && payment?.amount?.total === expectedAmount;

    // 검증 성공 시 payments 상태를 서버가 확정(service_role로 RLS 우회).
    if (verified && SUPABASE_URL && SERVICE_ROLE_KEY && bookingId) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      await admin.from('payments').update({ status: 'paid', pg_payment_id: paymentId })
        .eq('booking_id', bookingId);
    }

    return json({ verified, status: payment?.status ?? null });
  } catch (e) {
    return json({ verified: false, reason: 'exception', message: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
