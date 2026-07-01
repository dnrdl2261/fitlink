// @ts-nocheck
// Supabase Edge Function: 푸시 발송 (Expo Push API)
// ─────────────────────────────────────────────────────────────
// 인앱 알림 생성 시(notificationStore.addNotification) 수신자에게 네이티브 푸시를 발송한다.
// 수신자의 push_tokens를 service_role로 조회(RLS 우회) → Expo Push API로 전송.
//
// ⚠️ 배포 (네이티브 빌드 후):
//   supabase functions deploy send-push
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 기본 제공 시크릿)
//   미배포 시 프론트 invoke가 조용히 실패 → 인앱 알림은 정상 동작(푸시만 생략).
// ─────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { userId, title, body, data } = await req.json();
    if (!userId || !title) return json({ ok: false, reason: 'bad_request' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', userId);
    if (!tokens || tokens.length === 0) return json({ ok: true, sent: 0 });

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      title,
      body: body ?? '',
      data: data ?? {},
      sound: 'default',
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await res.json();
    return json({ ok: true, sent: messages.length, result });
  } catch (e) {
    return json({ ok: false, reason: 'exception', message: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
