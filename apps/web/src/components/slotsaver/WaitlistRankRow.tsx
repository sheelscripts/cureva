"use client";

import React from "react";

export interface WaitlistPatient {
  rank: number;
  patientId: string;
  patientName: string;
  score: number;
  waitDays: number;
  distanceKm: number;
  channel: string;
  messageSentAt: string;
  response: string | null;
}

interface WaitlistRankRowProps {
  rank: number;
  patient: WaitlistPatient;
  compact?: boolean;
}

export default function WaitlistRankRow({ rank, patient, compact = false }: WaitlistRankRowProps) {
  // Score bar color by tier
  const getBarColor = (score: number) => {
    if (score >= 0.85) return "bg-status-danger";
    if (score >= 0.65) return "bg-status-warning";
    if (score >= 0.4) return "bg-accent";
    return "bg-text-tertiary";
  };

  const formattedScore = (patient.score * 100).toFixed(0);

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 text-xs font-sans border-b border-border-dim/40 last:border-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-text-tertiary w-4">{rank}.</span>
          <span className="text-text-primary font-medium truncate">{patient.patientName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-xs bg-bg-subtle border border-border-dim text-text-secondary uppercase font-semibold">
            {patient.channel}
          </span>
          <span className="font-mono text-text-primary font-semibold">{formattedScore}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-border-dim/60 last:border-0 text-xs font-sans gap-2 select-none">
      {/* Rank + Name + Distance/Wait */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="font-mono text-text-tertiary text-[13px] font-bold w-4">{rank}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-semibold truncate text-[13px]">{patient.patientName}</span>
            <span className="text-[10px] text-text-tertiary font-mono shrink-0">waited {patient.waitDays}d</span>
          </div>
          <p className="text-[10px] text-text-tertiary mt-0.5 font-mono">{patient.distanceKm}km away</p>
        </div>
      </div>

      {/* Progress Score Bar */}
      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
        <div className="flex-1 bg-bg-base h-1.5 rounded-full overflow-hidden border border-border-dim">
          <div 
            className={`h-full transition-all duration-500 ${getBarColor(patient.score)}`} 
            style={{ width: `${patient.score * 100}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-text-primary font-semibold w-8 text-right">
          {patient.score.toFixed(2)}
        </span>
      </div>

      {/* Channel Badge & Status */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-border-dim/20 sm:border-0">
        <span className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-bg-subtle border border-border-dim text-text-secondary uppercase font-semibold">
          {patient.channel}
        </span>
        <div className="flex items-center gap-1">
          {patient.channel === "whatsapp" ? (
            <span className="text-status-safe font-mono text-[10px] font-bold">✓✓</span>
          ) : (
            <span className="text-text-secondary font-mono text-[10px] font-bold">✓</span>
          )}
          <span className="text-text-secondary text-[11px] font-medium">Awaiting</span>
        </div>
      </div>
    </div>
  );
}
