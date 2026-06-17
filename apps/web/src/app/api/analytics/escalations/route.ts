/**
 * GET /api/analytics/escalations — escalations list (alias for /api/admin/escalations)
 * Falls back to escalations mock if table is missing or empty.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@cureva/backend';
import { escalations } from '@/mock/analytics';

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('escalations')
      .select('id, session_id, reason, status, notified_at, resolved_at, resolved_by, resolution_note, revenue_recovered_inr')
      .order('notified_at', { ascending: false })
      .limit(100);

    if (error || !data || data.length === 0) {
      return NextResponse.json(escalations);
    }

    // Resolve session slot time and doctor via recovery_sessions + slots
    const sessionIds = data.map(e => e.session_id).filter(Boolean);
    let slotMap: Record<string, { slotTime: string; doctorName: string }> = {};
    try {
      const { data: sessions } = await supabaseAdmin
        .from('recovery_sessions')
        .select('id, slot_id')
        .in('id', sessionIds)
        .limit(100);
      if (sessions && sessions.length > 0) {
        const slotIds = sessions.map(s => s.slot_id).filter(Boolean);
        const { data: slots } = await supabaseAdmin
          .from('slots')
          .select('id, scheduled_at, doctor_id')
          .in('id', slotIds)
          .limit(100);
        const { data: doctors } = await supabaseAdmin
          .from('doctors')
          .select('id, name')
          .in('id', slots?.map(s => s.doctor_id).filter(Boolean) || [])
          .limit(100);
        if (slots && doctors) {
          for (const s of slots) {
            const doc = doctors.find(d => d.id === s.doctor_id);
            const time = new Date(s.scheduled_at);
            slotMap[s.id] = {
              slotTime: time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
              doctorName: doc?.name || 'Unknown',
            };
          }
        }
      }
    } catch {
      // tables may not exist — use defaults
    }

    const result = data.map(e => {
      const slotInfo = slotMap[e.session_id || ''] || null;
      return {
        id: e.id,
        sessionId: e.session_id,
        slotTime: slotInfo?.slotTime || '',
        doctorName: slotInfo?.doctorName || 'Unknown',
        specialty: 'General',
        valueInr: e.revenue_recovered_inr || 0,
        reason: e.reason || '',
        patientsContacted: 0,
        resolvedAt: e.resolved_at ? new Date(e.resolved_at).toLocaleString('en-IN') : '',
        resolvedBy: e.resolved_by || '',
        outcome: e.status || 'open',
      };
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(escalations);
  }
}