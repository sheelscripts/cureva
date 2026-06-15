"use client";

import React from "react";

interface EscalationRecord {
  id: string;
  slotTime: string;
  doctorName: string;
  specialty: string;
  valueInr: number;
  reason: string;
  outcome: "recovered" | "lost";
  resolvedIn: string;
  date: string;
}

export default function EscalationTable() {
  const completedEscalations: EscalationRecord[] = [
    { id: "esc_1", slotTime: "11:00 AM", doctorName: "Dr. Gupta", specialty: "Ortho", valueInr: 1800, reason: "No response timeout", outcome: "recovered", resolvedIn: "4m 32s", date: "Today" },
    { id: "esc_2", slotTime: "9:00 AM", doctorName: "Dr. Sharma", specialty: "Cardiology", valueInr: 1500, reason: "No response timeout", outcome: "recovered", resolvedIn: "14m ago", date: "Today" },
    { id: "esc_3", slotTime: "8:30 AM", doctorName: "Dr. Mehta", specialty: "Dermatology", valueInr: 1200, reason: "All waitlist declined", outcome: "lost", resolvedIn: "15m elapsed", date: "Today" },
    { id: "esc_4", slotTime: "10:30 AM", doctorName: "Dr. Gupta", specialty: "Ortho", valueInr: 1800, reason: "No response timeout", outcome: "recovered", resolvedIn: "6m 12s", date: "Yesterday" },
    { id: "esc_5", slotTime: "3:30 PM", doctorName: "Dr. Sharma", specialty: "Cardiology", valueInr: 1500, reason: "All waitlist declined", outcome: "lost", resolvedIn: "15m elapsed", date: "Yesterday" },
  ];

  return (
    <div className="bg-bg-surface border border-border-dim rounded-sm overflow-hidden select-none shadow-2xs">
      <div className="p-4 border-b border-border-dim bg-bg-subtle/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-sans">
        <div>
          <span className="text-[9px] uppercase font-bold text-text-tertiary tracking-wider block">ESCALATIONS LOG</span>
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mt-0.5">
            Escalations & Resolutions Ledger
          </h4>
        </div>
        <div className="text-[10.5px] font-mono text-text-secondary uppercase">
          24 total · <span className="text-status-safe font-semibold">21 resolved</span> · <span className="text-accent font-semibold">₹36K saved</span>
        </div>
      </div>

      <div className="overflow-x-auto font-mono text-xs">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-border-dim text-text-secondary uppercase text-[9px] font-bold bg-bg-subtle/30 h-8 font-sans">
              <th className="px-4">Date</th>
              <th className="px-2">Slot / Doctor</th>
              <th className="px-2">Escalation Reason</th>
              <th className="px-2 text-center">Outcome</th>
              <th className="px-4 text-right">Resolved In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dim/50 text-text-primary">
            {completedEscalations.map((esc) => (
              <tr key={esc.id} className="hover:bg-bg-subtle/20 transition-colors h-9">
                <td className="px-4 font-sans text-text-secondary text-[11.5px]">{esc.date}</td>
                <td className="px-2">
                  <span className="font-semibold">{esc.slotTime}</span> · <span className="font-sans text-[11px] text-text-secondary">{esc.specialty} ({esc.doctorName})</span>
                </td>
                <td className="px-2 text-text-secondary font-sans">{esc.reason}</td>
                <td className="px-2 text-center">
                  <span className={`px-2 py-0.2 rounded-xs uppercase tracking-wider text-[9px] font-bold ${
                    esc.outcome === "recovered" 
                      ? "bg-status-safe/10 text-status-safe border border-status-safe/20" 
                      : "bg-status-danger/10 text-status-danger border border-status-danger/20"
                  }`}>
                    {esc.outcome}
                  </span>
                </td>
                <td className="px-4 text-right text-text-secondary font-semibold">{esc.resolvedIn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
