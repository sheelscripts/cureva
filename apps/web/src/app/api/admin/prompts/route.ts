/**
 * GET /api/admin/prompts — prompt version metrics
 * Falls back to promptMetrics mock if table is missing or empty.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@cureva/backend';
import { promptMetrics } from '@/mock/analytics';

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('prompt_versions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data || data.length === 0) {
      return NextResponse.json(promptMetrics);
    }

    // Group by prompt_id, pick latest version
    const latestByPrompt: Record<string, (typeof data)[0]> = {};
    for (const row of data) {
      if (!latestByPrompt[row.prompt_id]) {
        latestByPrompt[row.prompt_id] = row;
      }
    }

    const result = Object.entries(latestByPrompt).map(([promptId, row]) => ({
      promptId,
      version: row.version,
      active: row.active,
      evalScore: row.eval_score || 0,
      conversionRate: 0, // not tracked per row
      runsThisMonth: row.runs_count || 0,
      lastEvalDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
      vsPrevious: '',
    }));

    return NextResponse.json(result.length > 0 ? result : promptMetrics);
  } catch (err: unknown) {
    return NextResponse.json(promptMetrics);
  }
}