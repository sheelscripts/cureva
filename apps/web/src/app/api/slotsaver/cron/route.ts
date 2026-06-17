import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@cureva/backend';
import { runOrchestrator } from '../../../../lib/agents/orchestrator';


/**
 * SlotSaver Cron Jobs
 * Running periodically (e.g. every minute via Vercel Cron or webhook)
 * Handles:
 * 1. Declaring no-shows: Appointments where slot_time + 15m passed with no check-in -> triggers recovery
 * 2. Recovery timeouts: Active recovery sessions older than 15 minutes -> triggers escalation
 */
export async function GET(req: NextRequest) {
  // Simple auth check to prevent unauthorized execution (in production, verify Vercel Cron header or token)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs: string[] = [];

  try {
    // ════════════════════════════════════════════
    // 1. DECLARE NO-SHOWS
    // ════════════════════════════════════════════
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Query appointments that started >15m ago but are still in 'scheduled' or 'confirmed' status
    const { data: noShows, error: nsError } = await supabaseAdmin
      .from('appointments')
      .select('*, slots(*)')
      .eq('status', 'scheduled')
      .lte('slot_time', fifteenMinutesAgo);

    if (nsError) {
      console.error('[Cron] Error querying no-shows:', nsError);
    } else if (noShows && noShows.length > 0) {
      logs.push(`Found ${noShows.length} no-show appointments`);

      for (const appt of noShows) {
        // Update appointment status to 'no_show'
        await supabaseAdmin
          .from('appointments')
          .update({ status: 'no_show', updated_at: new Date().toISOString() })
          .eq('id', appt.id);

        // Cancel the slot status
        await supabaseAdmin
          .from('slots')
          .update({ status: 'cancelled' })
          .eq('id', appt.slot_id);

        // Record cancellation event
        const { data: cancelEvent } = await supabaseAdmin
          .from('cancellation_events')
          .insert({
            appointment_id: appt.id,
            slot_id: appt.slot_id,
            cancelled_by: 'patient',
            reason: 'No-show timeout (15 mins passed)'
          })
          .select()
          .single();

        if (cancelEvent) {
          // Trigger the recovery agent flow
          await runOrchestrator({
            session_id: `rec-${appt.id}`,
            event_type: 'no_show',
            slot_id: appt.slot_id,
            appointment_id: appt.id,
            doctor_id: appt.doctor_id,
            specialty: appt.specialty,
            slot_time: appt.slot_time,
            value_inr: appt.value_inr,
            patient_id: appt.patient_id
          });
          logs.push(`Triggered recovery session for slot ${appt.slot_id} / appt ${appt.id}`);
        }
      }
    }

    // ════════════════════════════════════════════
    // 2. TIMEOUT ACTIVE RECOVERY SESSIONS
    // ════════════════════════════════════════════
    // Query active sessions older than 15 minutes
    const { data: activeSessions, error: actError } = await supabaseAdmin
      .from('recovery_sessions')
      .select('*, cancellation_events(*)')
      .eq('outcome', 'active')
      .lte('started_at', fifteenMinutesAgo);

    if (actError) {
      console.error('[Cron] Error querying active sessions:', actError);
    } else if (activeSessions && activeSessions.length > 0) {
      logs.push(`Found ${activeSessions.length} active recovery sessions exceeding 15m limit`);

      for (const session of activeSessions) {
        // Update recovery session outcome to 'escalated'
        await supabaseAdmin
          .from('recovery_sessions')
          .update({
            outcome: 'escalated',
            closed_at: new Date().toISOString()
          })
          .eq('id', session.id);

        // Run the Escalation Agent node to log the handoff and notify front desk
        await runOrchestrator({
          session_id: session.id,
          event_type: 'cancellation',
          slot_id: session.slot_id,
          should_escalate: true,
          escalation_reason: 'no_response_timeout',
          next_agent: 'escalation'
        });

        logs.push(`Escalated recovery session ${session.id} for slot ${session.slot_id}`);
      }
    }

    return NextResponse.json({ success: true, processed: logs });
  } catch (error: any) {
    console.error('[Cron] Handler exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
