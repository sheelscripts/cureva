import React from "react";
import { Sparkles, Terminal, Cpu } from "lucide-react";
import { StatusDot } from "@cureva/ui";

interface AgentItem {
  agent: string;
  runs: number;
  success: number;
  avgLatencyMs: number;
  tokensUsed: number;
}

interface AgentHealthTableProps {
  data?: AgentItem[];
}

export default function AgentHealthTable({ data = [] }: AgentHealthTableProps) {
  
  const getLatencyColor = (latency: number) => {
    if (latency < 1000) return "text-status-safe";
    if (latency <= 3000) return "text-status-warning font-semibold";
    return "text-status-danger font-bold";
  };

  const getStatus = (successRate: number, latency: number) => {
    if (successRate >= 0.98 && latency < 2500) return "safe";
    if (successRate >= 0.95 && latency <= 5000) return "warning";
    return "danger";
  };

  return (
    <div className="w-full bg-bg-surface border border-border-dim rounded-sm shadow-xs select-none overflow-hidden font-sans text-xs">
      <div className="p-4 border-b border-border-dim flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-status-info" />
          <h4 className="font-bold text-text-primary">AI Agent Engine Monitor</h4>
        </div>
        <div className="text-[10px] font-mono text-status-safe flex items-center gap-1.5 bg-status-safe/5 border border-status-safe/15 px-2 py-0.5 rounded-sm font-semibold">
          <span className="h-1.5 w-1.5 bg-status-safe rounded-full" />
          <span>ENGINES OPERATIONAL</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-dim bg-bg-subtle/40 text-text-secondary uppercase tracking-wider text-[10px] font-bold">
              <th className="py-2.5 px-4 font-sans">Agent Identifier</th>
              <th className="py-2.5 px-4 text-right">Runs Today</th>
              <th className="py-2.5 px-4 text-right">Success Rate</th>
              <th className="py-2.5 px-4 text-right">Avg Latency</th>
              <th className="py-2.5 px-4 text-right">P95 Max Latency</th>
              <th className="py-2.5 px-4 text-right">Tokens Consumed</th>
              <th className="py-2.5 px-4 text-center">Engine State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dim font-mono text-text-primary">
            {data.map((row) => {
              const successRate = row.success / row.runs;
              const p95Latency = Math.round(row.avgLatencyMs * 2.8);
              const statusValue = getStatus(successRate, row.avgLatencyMs);
              const successColorClass = successRate >= 0.98 ? "text-status-safe" : successRate >= 0.95 ? "text-status-warning" : "text-status-danger";

              return (
                <tr key={row.agent} className="hover:bg-bg-subtle/20 transition-colors">
                  <td className="py-2 px-4 font-sans font-bold text-text-primary">
                    <div className="flex items-center gap-1.5">
                      <Terminal size={11} className="text-text-tertiary" />
                      <span>{row.agent} Agent</span>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-text-primary">
                    {row.runs}
                  </td>
                  <td className={`py-2 px-4 text-right font-mono font-bold ${successColorClass}`}>
                    {(successRate * 100).toFixed(1)}%
                  </td>
                  <td className={`py-2 px-4 text-right font-mono font-bold ${getLatencyColor(row.avgLatencyMs)}`}>
                    {row.avgLatencyMs.toLocaleString()}ms
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-text-secondary">
                    {p95Latency.toLocaleString()}ms
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-text-primary font-bold">
                    {row.tokensUsed.toLocaleString()}
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex justify-center items-center">
                      <StatusDot status={statusValue} />
                    </div>
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
