/**
 * GET /api/admin/agents — agent run metrics for the last 7 days
 * Falls back to agentMetrics mock if DB query returns empty.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@cureva/backend';
import { agentMetrics } from '@/mock/analytics';

export async function GET(_req: NextRequest) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: runs, error } = await supabaseAdmin
      .from('agent_runs')
      .select('agent_name, tokens_used, latency_ms, success, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(5000);

    if (error || !runs || runs.length === 0) {
      return NextResponse.json(agentMetrics);
    }

    // Aggregate per-agent
    const byAgentMap: Record<string, { runs: number; success: number; latencySum: number; tokens: number }> = {};
    let totalRunsToday = 0;
    let successCount = 0;
    const latencyValues: number[] = [];

    for (const run of runs) {
      const agent = run.agent_name;
      if (!byAgentMap[agent]) {
        byAgentMap[agent] = { runs: 0, success: 0, latencySum: 0, tokens: 0 };
      }
      byAgentMap[agent].runs++;
      byAgentMap[agent].latencySum += run.latency_ms || 0;
      byAgentMap[agent].tokens += run.tokens_used || 0;
      if (run.success) {
        byAgentMap[agent].success++;
        successCount++;
      }
      totalRunsToday++;
      latencyValues.push(run.latency_ms || 0);
    }

    const byAgent = Object.entries(byAgentMap).map(([agent, agg]) => ({
      agent,
      runs: agg.runs,
      success: agg.success,
      avgLatencyMs: Math.round(agg.latencySum / agg.runs),
      tokensUsed: agg.tokens,
    }));

    // MCP tool calls
    let mcpToolCalls = agentMetrics.mcpToolCalls;
    try {
      const { data: toolData } = await supabaseAdmin
        .from('mcp_tool_calls')
        .select('tool_name, latency_ms, success, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(5000);

      if (toolData && toolData.length > 0) {
        const today = new Date().toDateString();
        const todayCalls = toolData.filter(t => new Date(t.created_at).toDateString() === today);
        const successTools = todayCalls.filter(t => t.success).length;
        let slowestTool = 'N/A';
        let maxLatency = 0;
        const failedToolsMap: Record<string, number> = {};
        for (const t of todayCalls) {
          if (t.latency_ms > maxLatency) {
            maxLatency = t.latency_ms;
            slowestTool = `${t.tool_name} (avg ${t.latency_ms}ms)`;
          }
          if (!t.success) {
            failedToolsMap[t.tool_name] = (failedToolsMap[t.tool_name] || 0) + 1;
          }
        }
        const failedTools = Object.entries(failedToolsMap).map(([name, count]) => `${name} × ${count}`);
        mcpToolCalls = {
          totalToday: todayCalls.length,
          successRate: todayCalls.length > 0 ? Math.round((successTools / todayCalls.length) * 1000) / 1000 : 0,
          slowestTool: `avg ${maxLatency}ms`,
          failedTools,
        };
      }
    } catch {
      // mcp_tool_calls table may not exist — use mock
    }

    // P95 latency
    latencyValues.sort((a, b) => a - b);
    const p95Index = Math.floor(latencyValues.length * 0.95);
    const p95LatencyMs = latencyValues[p95Index] || 0;

    return NextResponse.json({
      totalRunsToday,
      successRate: totalRunsToday > 0 ? Math.round((successCount / totalRunsToday) * 1000) / 1000 : 0,
      avgLatencyMs: latencyValues.length > 0 ? Math.round(latencyValues.reduce((s, v) => s + v, 0) / latencyValues.length) : 0,
      p95LatencyMs,
      byAgent,
      mcpToolCalls,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}