"use client";

import React, { useState } from "react";

interface InterventionRecord {
  id: string;
  patientName: string;
  appointmentId: string;
  appointmentTime: string;
  riskScore: number;
  channel: string;
  scheduledAt: string;
  status: string;
  response?: string | null;
  respondedAt?: string | null;
  message?: string | null;
}

interface InterventionLogTableProps {
  data: InterventionRecord[];
  filterStage?: string; // Optional filtering preset from pipeline clicks
}

export default function InterventionLogTable({ data, filterStage = "all" }: InterventionLogTableProps) {
  const [filter, setFilter] = useState<"all" | "confirmed" | "no_response" | "declined" | "scheduled">("all");

  // Filter items
  const filteredData = data.filter((item) => {
    // Stage-specific filter overrides
    if (filterStage === "flagged") {
      return item.riskScore >= 0.65;
    }
    if (filterStage === "interventions") {
      return item.status !== "scheduled";
    }
    if (filterStage === "confirmed_early") {
      return item.status === "confirmed";
    }

    // Standard filter controls
    if (filter === "all") return true;
    return item.status === filter;
  });

  const getStatusStyle = (status: string) => {
    if (status === "confirmed") return "text-status-safe font-semibold";
    if (status === "scheduled") return "text-status-info font-semibold";
    if (status === "declined") return "text-status-danger font-semibold";
    return "text-text-tertiary";
  };

  const getStatusText = (status: string) => {
    if (status === "confirmed") return "Confirmed ✓";
    if (status === "scheduled") return "Scheduled ◷";
    if (status === "declined") return "Declined ✗";
    return "No Response";
  };

  return (
    <div className="bg-bg-surface border border-border-dim rounded-sm overflow-hidden select-none shadow-2xs">
      
      {/* Table Toolbar */}
      <div className="p-4 border-b border-border-dim bg-bg-subtle/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-sans">
          Auto-Outreach Intervention Log
        </h4>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center bg-bg-base border border-border-dim p-0.5 rounded-xs font-sans text-[10.5px]">
          {(["all", "confirmed", "no_response", "declined", "scheduled"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-2 py-1 uppercase rounded-xs transition-colors cursor-pointer font-semibold ${
                filter === opt 
                  ? "bg-bg-surface text-accent font-bold border border-border-dim/40 shadow-3xs" 
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {opt.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-sans min-w-[760px]">
          <thead>
            <tr className="border-b border-border-dim text-text-secondary uppercase text-[9px] font-bold bg-bg-subtle/30 h-8">
              <th className="px-4">Date/Time</th>
              <th className="px-2">Patient</th>
              <th className="px-2 font-mono">Appt ID</th>
              <th className="px-2 text-right">Risk Score</th>
              <th className="px-2 text-center">Channel</th>
              <th className="px-3">Outreach Status</th>
              <th className="px-4 text-right">Response Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dim/50 text-text-primary font-mono">
            {filteredData.length === 0 ? (
              <tr className="h-12 text-center text-text-tertiary">
                <td colSpan={7} className="px-4 font-sans">No matching records found in telemetry ledger.</td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-bg-subtle/20 transition-colors h-9">
                  <td className="px-4 font-sans text-text-secondary text-[11px] truncate max-w-[120px]">
                    {item.appointmentTime}
                  </td>
                  <td className="px-2 font-sans font-semibold text-text-primary">
                    {item.patientName}
                  </td>
                  <td className="px-2 text-text-tertiary font-mono text-[10px]">
                    {item.appointmentId}
                  </td>
                  <td className="px-2 text-right text-text-primary font-bold">
                    {(item.riskScore * 100).toFixed(0)}%
                  </td>
                  <td className="px-2 text-center">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-xs bg-bg-base border border-border-dim text-text-secondary">
                      {item.channel}
                    </span>
                  </td>
                  <td className={`px-3 font-sans ${getStatusStyle(item.status)}`}>
                    {getStatusText(item.status)}
                  </td>
                  <td className="px-4 text-right text-text-secondary">
                    {item.respondedAt ? item.respondedAt : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
