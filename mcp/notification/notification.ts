/**
 * Notification MCP — free-tier delivery for the Cureva demo.
 *
 * We deliberately do NOT integrate Twilio, Meta WhatsApp Cloud API, or any
 * paid SMS/voice provider. The plan is documented in chat.md: "looks real
 * in a demo, costs $0".
 *
 * Channels:
 *   • whatsapp  → wa.me/<phone>?text=<msg> deep link. Caller (UI / doctor)
 *                 clicks the link, the patient's WhatsApp opens with the
 *                 message pre-filled. Zero provider cost.
 *   • sms       → sms:<phone>?body=<msg> deep link. Same UX, falls back to
 *                 the device's default SMS app.
 *   • email     → Resend REST API (free tier: 100/day, 3000/month).
 *   • in_app    → notifications table only (no external delivery).
 *
 * Every call still writes to the `notifications` table so the frontdesk
 * dashboard can surface "what was sent to whom" via Supabase Realtime.
 * The deep link (when applicable) lives in `payload.deep_link`.
 */

import { supabaseAdmin } from '@backend/app/db/supabase';
import { sendResendEmail, wrapHtml, type ResendEmailInput } from '@backend/app/utils/resend';
import { callMcpTool } from '../index';

// ─── helpers ───────────────────────────────────────────────────────

/** Strip everything but digits and a leading + for wa.me URLs. */
function normalisePhoneForWhatsApp(phone: string): string {
  // wa.me requires E.164-ish format with no '+' or spaces.
  return phone.replace(/[^\d]/g, '');
}

function normalisePhoneForSms(phone: string): string {
  // sms: URI is permissive — keep digits and '+' for the device to handle.
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Look up a patient's contact details (phone, email, name) so we can
 * build a deep link / email payload without leaking it back from the
 * caller. RLS is bypassed because we're using the admin client and
 * the notification path runs server-side.
 */
async function getPatientContact(patient_id: string): Promise<{
  phone: string;
  email: string;
  name: string;
} | null> {
  const { data, error } = await supabaseAdmin
    .from('patients')
    .select('phone, name, user_id, users:user_id(email)')
    .eq('id', patient_id)
    .single();

  if (error || !data) return null;

  // Supabase nested select returns `users` as an object (or array — defensive).
  const users = (data as any).users;
  const email = Array.isArray(users) ? users[0]?.email : users?.email;

  return {
    phone: data.phone || '',
    email: email || '',
    name: data.name || 'Patient',
  };
}

// ─── WhatsApp ──────────────────────────────────────────────────────

export async function send_whatsapp(
  agentRunId: string,
  patient_id: string,
  message: string
) {
  return callMcpTool(
    agentRunId,
    'send_whatsapp',
    'notification-mcp',
    async () => {
      const contact = await getPatientContact(patient_id);
      if (!contact) {
        return {
          success: false,
          channel: 'whatsapp',
          deliveryMethod: 'deep_link',
          status: 'failed',
          error: 'Patient not found',
        };
      }
      if (!contact.phone) {
        return {
          success: false,
          channel: 'whatsapp',
          deliveryMethod: 'deep_link',
          status: 'failed',
          error: 'Patient has no phone number on file',
        };
      }

      const e164 = normalisePhoneForWhatsApp(contact.phone);
      const deepLink = `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;

      const { error } = await supabaseAdmin.from('notifications').insert({
        patient_id,
        type: 'intervention_sent',
        title: 'WhatsApp Notification',
        body: message,
        channel: 'whatsapp',
        payload: {
          deliveryMethod: 'deep_link',
          deepLink,
          phone: contact.phone,
          patientName: contact.name,
        },
      });
      if (error) throw error;

      return {
        success: true,
        channel: 'whatsapp',
        deliveryMethod: 'deep_link',
        deepLink,
        status: 'queued_for_manual_send',
      };
    },
    { patient_id, message }
  );
}

// ─── SMS ───────────────────────────────────────────────────────────

export async function send_sms(
  agentRunId: string,
  patient_id: string,
  message: string
) {
  return callMcpTool(
    agentRunId,
    'send_sms',
    'notification-mcp',
    async () => {
      const contact = await getPatientContact(patient_id);
      if (!contact) {
        return {
          success: false,
          channel: 'sms',
          deliveryMethod: 'deep_link',
          status: 'failed',
          error: 'Patient not found',
        };
      }
      if (!contact.phone) {
        return {
          success: false,
          channel: 'sms',
          deliveryMethod: 'deep_link',
          status: 'failed',
          error: 'Patient has no phone number on file',
        };
      }

      const phone = normalisePhoneForSms(contact.phone);
      const deepLink = `sms:${phone}?body=${encodeURIComponent(message)}`;

      const { error } = await supabaseAdmin.from('notifications').insert({
        patient_id,
        type: 'intervention_sent',
        title: 'SMS Notification',
        body: message,
        channel: 'sms',
        payload: {
          deliveryMethod: 'deep_link',
          deepLink,
          phone: contact.phone,
          patientName: contact.name,
        },
      });
      if (error) throw error;

      return {
        success: true,
        channel: 'sms',
        deliveryMethod: 'deep_link',
        deepLink,
        status: 'queued_for_manual_send',
      };
    },
    { patient_id, message }
  );
}

// ─── Email (Resend) ────────────────────────────────────────────────

export interface SendEmailArgs {
  patient_id: string;
  subject: string;
  html?: string;
  text?: string;
  /** Optional override for the From address. */
  from?: string;
  /** Optional preheader for the wrapped HTML. */
  preheader?: string;
}

export async function send_email(agentRunId: string, args: SendEmailArgs) {
  return callMcpTool(
    agentRunId,
    'send_email',
    'notification-mcp',
    async () => {
      const contact = await getPatientContact(args.patient_id);
      if (!contact) {
        return {
          success: false,
          channel: 'email',
          status: 'failed',
          error: 'Patient not found',
        };
      }
      if (!contact.email) {
        return {
          success: false,
          channel: 'email',
          status: 'failed',
          error: 'Patient has no email on file',
        };
      }

      const html = args.html ?? wrapHtml(`<p>${args.text ?? args.subject}</p>`, args.preheader);

      const resendInput: ResendEmailInput = {
        from: args.from ?? 'Cureva <notifications@cureva.health>',
        to: contact.email,
        subject: args.subject,
        html,
        text: args.text,
      };

      const result = await sendResendEmail(resendInput);

      await supabaseAdmin.from('notifications').insert({
        patient_id: args.patient_id,
        type: 'intervention_sent',
        title: args.subject,
        body: args.text || args.subject,
        channel: 'email',
        payload: {
          deliveryMethod: 'resend',
          email: contact.email,
          patientName: contact.name,
          providerId: result.id,
          error: result.error,
        },
      });

      if (!result.success) {
        return {
          success: false,
          channel: 'email',
          deliveryMethod: 'resend',
          status: 'failed',
          error: result.error,
        };
      }

      return {
        success: true,
        channel: 'email',
        deliveryMethod: 'resend',
        providerId: result.id,
        status: 'sent',
      };
    },
    args
  );
}

// ─── In-app frontdesk alert ────────────────────────────────────────

export async function notify_frontdesk(
  agentRunId: string,
  title: string,
  body: string,
  payload: any
) {
  return callMcpTool(
    agentRunId,
    'notify_frontdesk',
    'notification-mcp',
    async () => {
      const { error } = await supabaseAdmin.from('notifications').insert({
        type: 'escalation_needed',
        title,
        body,
        payload,
      });
      if (error) throw error;
      return { success: true };
    },
    { title, body, payload }
  );
}
