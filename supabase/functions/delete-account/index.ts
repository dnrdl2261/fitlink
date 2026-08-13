// @ts-nocheck
// Supabase Edge Function: 계정 삭제(탈퇴)
// ─────────────────────────────────────────────────────────────
// Apple Guideline 5.1.1(v) · Google Play 정책상 앱 내 계정 삭제는 필수다.
// auth 사용자 삭제는 service_role 권한이 필요하므로 클라이언트에서 직접 못 하고 이 함수를 거친다.
//
// 개인정보처리방침 제3조에 맞춘 처리:
//   · 파기 — 프로필/카탈로그/채팅/후기/찜/기록/알림/푸시토큰 등 개인 식별 데이터
//   · 보존 — 계약·결제 기록(bookings·payments·settlements)은 전자상거래법상 5년.
//            단 개인 식별고리는 끊는다(bookings.member_id → null, member_name → 익명 표기).
//
// 호출자 검증: 요청의 Authorization Bearer 토큰으로 본인 확인 후, 그 사용자만 삭제한다.
// (남의 계정을 지울 수 없도록 body의 userId 같은 건 받지 않는다)
//
// ⚠️ 배포: supabase functions deploy delete-account
// ─────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ ok: false, error: '인증 정보가 없습니다.' }, 401);

    // 토큰 소유자 확인 — 이 사용자만 삭제한다.
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    const uid = userData?.user?.id;
    if (userErr || !uid) return json({ ok: false, error: '유효하지 않은 세션입니다.' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const uidText = String(uid);

    // ── 1) 보존 대상: 거래기록의 개인 식별고리만 제거 ──────────
    // bookings.member_id 는 Phase O 에서 on delete set null 로 바꿨지만,
    // 이름은 남으므로 먼저 익명화한다.
    await admin
      .from('bookings')
      .update({ member_name: '(탈퇴한 회원)' })
      .eq('member_id', uidText);

    // ── 2) 파기 대상: 개인 식별 데이터 ─────────────────────────
    // text 컬럼이라 auth.users 삭제로 자동 정리되지 않는 것들.
    const purge: [string, string][] = [
      ['push_tokens', 'user_id'],
      ['notifications', 'user_id'],
      ['favorites', 'user_id'],
      ['member_records', 'trainer_id'],
      ['manual_sessions', 'trainer_id'],
      ['hidden_sessions', 'trainer_id'],
      ['trainer_reviews', 'member_id'],
      ['gym_reviews', 'member_id'],
      ['follows', 'follower_id'],
      ['post_reactions', 'user_id'],
      ['group_members', 'user_id'],
      ['offers', 'member_id'],
      ['offers', 'trainer_id'],
      ['partner_requests', 'trainer_id'],
      ['slot_bookings', 'trainer_id'],
      ['trainers', 'id'],
      ['gyms', 'admin_id'],
    ];

    const failed: string[] = [];
    for (const [table, col] of purge) {
      const { error } = await admin.from(table).delete().eq(col, uidText);
      // 테이블/컬럼이 없는 환경일 수 있으니 실패해도 전체를 중단하지 않는다.
      if (error) failed.push(`${table}.${col}: ${error.message}`);
    }

    // 채팅: 참여자 배열이라 개별 처리
    await admin.from('chat_messages').delete().eq('sender_id', uidText);
    await admin.from('conversations').delete().contains('participant_ids', [uidText]);

    // ── 3) auth 사용자 삭제 (profiles 등 FK cascade 동반) ──────
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) return json({ ok: false, error: delErr.message, failed }, 500);

    return json({ ok: true, failed });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
