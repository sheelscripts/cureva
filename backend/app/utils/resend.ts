/**
 * Resend API client.
 *
 * Thin wrapper over the Resend REST API so we don't pull in the SDK
 * (it's tiny but adds a dep; the API surface is 1 endpoint).
 *
 * Free tier: 100 emails/day, 3000/month.
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */

export interface ResendEmailInput {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string; // base64
    path?: string;
  }>;
}

export interface ResendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Cureva <notifications@cureva.health>';

/**
 * Send an email via Resend. Reads `RESEND_API_KEY` from the environment.
 *
 * Returns `{ success: false, error: 'RESEND_API_KEY not configured' }`
 * if the key is missing — callers can decide whether to fall back, log,
 * or surface the error to the user.
 */
export async function sendResendEmail(
  input: ResendEmailInput,
  apiKey: string = process.env.RESEND_API_KEY || ''
): Promise<ResendEmailResult> {
  if (!apiKey) {
    return {
      success: false,
      error:
        'RESEND_API_KEY not configured. Add it to apps/web/.env.local to enable email delivery.',
    };
  }

  if (!input.html && !input.text) {
    return { success: false, error: 'Either html or text body is required.' };
  }

  const recipients = Array.isArray(input.to) ? input.to : [input.to];

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: input.from || DEFAULT_FROM,
        to: recipients,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
        cc: input.cc,
        bcc: input.bcc,
        attachments: input.attachments,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        success: false,
        error: `Resend API ${res.status}: ${body || res.statusText}`,
      };
    }

    const data = (await res.json()) as { id?: string };
    return { success: true, id: data.id };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error calling Resend: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Minimal HTML wrapper so emails don't look naked if the caller
 * passes a plain text body.
 */
export function wrapHtml(body: string, preheader?: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Cureva</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
${preheader ? `<div style="display:none">${preheader}</div>` : ''}
${body}
<hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px">
<p style="font-size:12px;color:#999;margin:0">Cureva · Your Health, Managed</p>
</body></html>`;
}
