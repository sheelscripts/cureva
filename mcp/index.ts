import { supabaseAdmin } from '@backend/app/db/supabase';

/**
 * Wrapper to log every tool call to the mcp_tool_calls table.
 * Enforces: "No direct DB access from agents — ever. All tools logged."
 */
export async function callMcpTool<T>(
  agentRunId: string,
  toolName: string,
  mcpServer: string,
  toolFn: () => Promise<T>,
  inputArgs: any
): Promise<T> {
  const started = Date.now();
  let success = true;
  let error = '';
  let result: T | null = null;

  try {
    result = await toolFn();
    return result;
  } catch (e: any) {
    success = false;
    error = e.message || String(e);
    throw e;
  } finally {
    const latency = Date.now() - started;
    try {
      await supabaseAdmin.from('mcp_tool_calls').insert({
        agent_run_id: agentRunId,
        tool_name: toolName,
        mcp_server: mcpServer,
        input_json: inputArgs,
        output_json: result || null,
        latency_ms: latency,
        success,
        error: error || null
      });
    } catch (logErr) {
      console.warn('[MCP Tool Logger] Failed to log tool call:', logErr);
    }
  }
}

export * from './patient/patient';
export * from './appointment/appointment';
export * from './waitlist/waitlist';
export * from './knowledge/knowledge';
export * from './notification/notification';
