// ═══════════════════════════════════════════════════════════════════════════
// Vantara Weddings — Phase 5: Supabase Auth "Send SMS" hook → MSG91.
//
// Docs (checked at implementation): the hook receives a Standard Webhooks
// signed POST with { user, sms: { otp } }; an empty 200 response = success.
// Secrets are read at runtime — NEVER hardcode provider keys.
//
// Prerequisites (see README / docs/rls-test-checklist.md):
//   supabase secrets set SEND_SMS_HOOK_SECRETS="v1,whsec_..." \
//                        MSG91_AUTH_KEY="..." \
//                        MSG91_SENDER_ID="..." \
//                        MSG91_DLT_TEMPLATE_ID="..."
//   supabase functions deploy send-sms --no-verify-jwt   # hook runs pre-JWT
//   Dashboard → Authentication → Hooks → Send SMS (HTTP) →
//     https://<project-ref>.supabase.co/functions/v1/send-sms
// The DLT template registered with MSG91 must contain {{var1}} — var1 carries
// the OTP below (MSG91 Flow API body).
// ═══════════════════════════════════════════════════════════════════════════

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const MSG91_FLOW_URL = 'https://control.msg91.com/api/v5/flow/';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: { http_code: 405, message: 'Method not allowed' } }, 405);
  }

  const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRETS');
  const authKey = Deno.env.get('MSG91_AUTH_KEY');
  const senderId = Deno.env.get('MSG91_SENDER_ID');
  const templateId = Deno.env.get('MSG91_DLT_TEMPLATE_ID');
  if (!hookSecret || !authKey || !senderId || !templateId) {
    return jsonResponse(
      {
        error: {
          http_code: 500,
          message:
            'send-sms hook not configured: set SEND_SMS_HOOK_SECRETS, MSG91_AUTH_KEY, ' +
            'MSG91_SENDER_ID and MSG91_DLT_TEMPLATE_ID (supabase secrets set)',
        },
      },
      500,
    );
  }

  const payloadText = await req.text();

  // Standard Webhooks signature verification (fail closed).
  let event: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    const webhook = new Webhook(hookSecret.replace('v1,whsec_', ''));
    event = webhook.verify(payloadText, Object.fromEntries(req.headers)) as typeof event;
  } catch {
    return jsonResponse({ error: { http_code: 401, message: 'invalid webhook signature' } }, 401);
  }

  const phone = event.user?.phone;
  const otp = event.sms?.otp;
  if (!phone || !otp) {
    return jsonResponse(
      { error: { http_code: 400, message: 'hook payload missing user.phone or sms.otp' } },
      400,
    );
  }

  // MSG91 wants the number without '+', with country code (e.g. 919876543210).
  const mobiles = phone.replace(/^\+/, '');

  try {
    const response = await fetch(MSG91_FLOW_URL, {
      method: 'POST',
      headers: {
        authkey: authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        mobiles,
        template_id: templateId,
        var1: otp,
      }),
      signal: AbortSignal.timeout(4000), // HTTP hooks have a 5 s budget
    });

    const data: { type?: string; message?: string } = await response.json().catch(() => ({}));
    const failed = !response.ok || data.type === 'error';
    if (failed) {
      // Non-retryable (per hook contract a 4xx/5xx from us = failed send);
      // returning 500 avoids auto-retries double-sending OTPs.
      return jsonResponse(
        {
          error: {
            http_code: 500,
            message: `MSG91 send failed (${response.status}): ${data.message ?? 'unknown error'}`,
          },
        },
        500,
      );
    }
  } catch (error) {
    return jsonResponse(
      { error: { http_code: 500, message: `MSG91 send failed: ${String(error)}` } },
      500,
    );
  }

  // Empty 200 = success (Send SMS hook contract).
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
});
