import { supabaseAdmin } from '@backend/app/db/supabase';
import { callMcpTool } from '../index';

export async function score_waitlist(agentRunId: string, slot_id: string, specialty: string) {
  return callMcpTool(agentRunId, 'score_waitlist', 'waitlist-mcp', async () => {
    const { data: waitlist } = await supabaseAdmin.from('waitlist').select('*, patients(*)').eq('specialty', specialty).eq('is_active', true);
    if (!waitlist || waitlist.length === 0) return [];

    const scored = waitlist.map((wl) => {
      const wait_score = Math.min((wl.wait_days || 0) / 30, 1.0);
      const urgency_score = { low: 0.3, medium: 0.6, high: 1.0 }[wl.urgency as 'low' | 'medium' | 'high'] || 0.3;
      const dist = parseFloat(wl.patients?.distance_km || '0');
      const prox_score = Math.max(0, 1 - dist / 25);
      const accept_prob = 0.7;

      const score = (
        wait_score * 0.30 +
        urgency_score * 0.25 +
        prox_score * 0.20 +
        accept_prob * 0.15 +
        1.0 * 0.10
      );

      return {
        patient_id: wl.patient_id,
        patient_name: wl.patients?.name || 'Patient',
        rank: 0,
        score: Math.min(score, 1.0),
        wait_days: wl.wait_days,
        distance_km: dist,
        channel: wl.patients?.preferences?.preferred_channel || 'whatsapp'
      };
    });

    scored.sort((a, b) => b.score - a.score);
    scored.forEach((p, i) => { p.rank = i + 1; });
    return scored.slice(0, 10);
  }, { slot_id, specialty });
}
