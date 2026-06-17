/**
 * GET /api/agents — list agent definitions
 * Tries agents table, falls back to static list derived from agentMetrics.byAgent.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@cureva/backend';
import { agentMetrics } from '@/mock/analytics';

const FALLBACK_AGENTS = [
  { id: 'predictor', name: 'Predictor', description: 'No-show risk prediction', active: true },
  { id: 'intervention', name: 'Intervention', description: 'Outreach strategy selection', active: true },
  { id: 'recovery', name: 'Recovery', description: 'Slot recovery automation', active: true },
  { id: 'triage', name: 'Triage', description: 'Patient triage agent', active: true },
  { id: 'scribe', name: 'Scribe', description: 'Clinical note scribing', active: true },
  { id: 'prescription', name: 'Prescription', description: 'Prescription generation', active: true },
];

export async function GET(_req: NextRequest) {
  try {
    // Try agents table (may not exist — groupBy agent_name from agent_runs as fallback)
    let agents: unknown[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('agents')
        .select('*')
        .limit(50);
      if (!error && data && data.length > 0) {
        agents = data;
      }
    } catch {
      // agents table doesn't exist — fall through to agent_runs
    }

    if (!agents || agents.length === 0) {
      try {
        const { data: runs } = await supabaseAdmin
          .from('agent_runs')
          .select('agent_name')
          .limit(5000);
        if (runs && runs.length > 0) {
          const uniqueNames = [...new Set(runs.map(r => r.agent_name))];
          agents = uniqueNames.map(name => ({
            id: name.toLowerCase(),
            name,
            description: `${name} agent`,
            active: true,
          }));
        }
      } catch {
        // agent_runs may not exist either
      }
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json(FALLBACK_AGENTS);
    }

    return NextResponse.json(agents);
  } catch (err: unknown) {
    return NextResponse.json(FALLBACK_AGENTS);
  }
}