import React from "react";
import { Hammer, CircleAlert, CheckCircle2 } from "lucide-react";

interface MCPToolCallRow {
  toolName: string;
  calls: number;
  successRate: number;
  avgLatency: number;
  failuresToday: number;
}

const defaultTools: MCPToolCallRow[] = [
  { toolName: "book_slot", calls: 812, successRate: 1.0, avgLatency: 440, failuresToday: 0 },
  { toolName: "send_whatsapp", calls: 1420, successRate: 0.997, avgLatency: 180, failuresToday: 3 },
  { toolName: "initiate_call", calls: 322, successRate: 0.996, avgLatency: 920, failuresToday: 1 },
  { toolName: "check_calendar", calls: 1284, successRate: 1.0, avgLatency: 95, failuresToday: 0 },
  { toolName: "read_patient_record", calls: 242, successRate: 1.0, avgLatency: 110, failuresToday: 0 },
  { toolName: "commit_prescription_draft", calls: 138, successRate: 1.0, avgLatency: 280, failuresToday: 0 }
];

export default function MCPToolTable() {
  const slowestTool = "book_slot (avg 440ms)";
  const totalCalls = 4218;
  const overallSuccessRate = 0.997;

  return (
    <div className="w-full bg-bg-surface border border-border-dim rounded-sm shadow-xs select-none overflow-hidden font-sans text-xs">
      {/* Header and key overview metrics */}
      <div className="p-4 border-b border-border-dim flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Hammer size={14} className="text-text-secondary" />
          <h4 className="font-bold text-text-primary">MCP Tool Execution Logs</h4>
        </div>

        <div className="flex items-center flex-wrap gap-4 font-mono text-[10.5px] text-text-secondary">
          <div>
            Calls: <span className="text-text-primary font-bold">{totalCalls.toLocaleString()}</span>
          </div>
          <div className="h-3 w-[1px] bg-border-dim" />
          <div className="flex items-center gap-1 text-status-safe font-semibold">
            <CheckCircle2 size={12} />
            <span>{(overallSuccessRate * 100).toFixed(1)}% Core Rate</span>
          </div>
          <div className="h-3 w-[1px] bg-border-dim" />
          <div>
            Slowest: <span className="text-status-danger font-bold">{slowestTool}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-dim bg-bg-subtle/40 text-text-secondary uppercase tracking-wider text-[10px] font-bold">
              <th className="py-2.5 px-4">Workspace Tool Schema</th>
              <th className="py-2.5 px-4 text-right">Invoked Today</th>
              <th className="py-2.5 px-4 text-right">Success Rate</th>
              <th className="py-2.5 px-4 text-right">Latency (Avg)</th>
              <th className="py-2.5 px-4 text-right">Active Failures</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dim font-mono text-text-primary">
            {defaultTools.map((row) => {
              const hasFailure = row.failuresToday > 0;
              return (
                <tr 
                  key={row.toolName} 
                  className={`transition-colors ${
                    hasFailure 
                      ? "bg-status-danger/5 hover:bg-status-danger/10" 
                      : "hover:bg-bg-subtle/20"
                  }`}
                  style={hasFailure ? { backgroundColor: "rgba(239, 68, 68, 0.03)" } : {}}
                >
                  <td className="py-2 px-4 text-xs font-sans font-bold text-text-primary">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${hasFailure ? "bg-status-danger" : "bg-status-safe"}`} />
                      <code className="text-text-primary font-semibold font-mono bg-bg-subtle/75 px-1.5 py-0.5 rounded-sm">{row.toolName}</code>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-text-primary">
                    {row.calls}
                  </td>
                  <td className={`py-2 px-4 text-right font-mono font-bold ${row.successRate >= 0.999 ? "text-status-safe" : "text-status-warning"}`}>
                    {(row.successRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-text-secondary">
                    {row.avgLatency}ms
                  </td>
                  <td className={`py-2 px-4 text-right font-mono font-bold ${hasFailure ? "text-status-danger" : "text-text-tertiary"}`}>
                    {hasFailure ? (
                      <span className="flex items-center justify-end gap-1 select-none text-[11px] text-status-danger">
                        <CircleAlert size={12} className="shrink-0" />
                        {row.failuresToday} failures
                      </span>
                    ) : (
                      "0 failures"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
