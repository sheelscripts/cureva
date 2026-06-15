"use client";

import React from "react";
import WaitlistRankRow, { WaitlistPatient } from "./WaitlistRankRow";

export interface ActiveSession {
  sessionId: string;
  slotId: string;
  slotTime: string;
  doctorName: string;
  specialty: string;
  valueInr: number;
  startedAt: string;
  elapsedSeconds: number;
  escalationThresholdSeconds: number;
  status: string;
  waitlist: WaitlistPatient[];
  messages: any[];
}

interface RecoverySessionCardProps {
  session: ActiveSession;
  variant: "compact" | "full";
  onEscalate: (sessionId: string) => void;
  onExtendTimer: (sessionId: string) => void;
  onViewDetail: (sessionId: string) => void;
}

export default function RecoverySessionCard({
  session,
  variant,
  onEscalate,
  onExtendTimer,
  onViewDetail,
}: RecoverySessionCardProps) {
  const elapsed = session.elapsedSeconds;
  const threshold = session.escalationThresholdSeconds;
  const pct = Math.min(100, (elapsed / threshold) * 100);

  // Formatted timer: MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Remaining escalation time
  const remaining = Math.max(0, threshold - elapsed);
  const remainingMins = Math.floor(remaining / 60);
  const remainingSecs = remaining % 60;
  const countdownText = remaining > 0 
    ? `Escalates in ${remainingMins}m ${remainingSecs < 10 ? "0" : ""}${remainingSecs}s`
    : "Escalated";

  // Progress bar colors by percentage
  const getBarColor = (percentage: number) => {
    if (percentage >= 80) return "bg-status-danger";
    if (percentage >= 50) return "bg-status-warning";
    return "bg-bg-subtle";
  };

  // Pulse effect class
  const isPulsing = session.status === "active";
  const leftBorderColor = session.status === "lost" 
    ? "border-l-[3px] border-status-danger" 
    : session.status === "recovered"
    ? "border-l-[3px] border-status-safe"
    : pct >= 80 || session.status === "escalated"
    ? "border-l-[3px] border-status-danger"
    : pct >= 50
    ? "border-l-[3px] border-status-warning"
    : "border-l-[3px] border-status-safe";

  return (
    <div 
      className={`bg-bg-surface border border-border-dim rounded-sm p-4 relative flex flex-col justify-between overflow-hidden shadow-2xs hover:border-border-base transition-all duration-300 ${leftBorderColor} ${isPulsing ? "animate-[pulse-border_2s_ease-in-out_infinite]" : ""}`}
    >
      <style jsx global>{`
        @keyframes pulse-border {
          0%, 100% { border-left-color: var(--color-status-safe, #16A34A); }
          50% { border-left-color: rgba(22, 163, 74, 0.3); }
        }
      `}</style>

      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 select-none">
        <div>
          <div className="flex items-center gap-1.5">
            {session.status === "active" && (
              <span className="h-1.5 w-1.5 rounded-full bg-status-safe animate-ping shrink-0" />
            )}
            <h4 className="text-xs font-semibold text-text-primary tracking-wide">
              {session.slotTime} · {session.specialty} · {session.doctorName}
            </h4>
          </div>
          <p className="text-[10px] text-text-tertiary font-sans mt-0.5">
            Started {Math.floor(elapsed / 60)}m ago · {session.waitlist.filter(w => w.messageSentAt).length}/{session.waitlist.length} contacted
          </p>
        </div>
        <span className="font-mono text-xs font-bold text-accent text-right">
          ₹{session.valueInr.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Subrow / Timer details */}
      <div className="flex items-center justify-between py-2 border-t border-border-dim mt-3 select-none">
        <span className="text-[10.5px] text-text-secondary font-sans">
          Awaiting response...
        </span>
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs text-text-primary font-semibold">
            {formatTime(elapsed)}
          </span>
          <span className="text-text-secondary text-[10px] font-bold">↑</span>
        </div>
      </div>

      {/* Waitlist Rows */}
      {variant === "full" && (
        <div className="space-y-1 mt-2 border-t border-border-dim pt-2">
          {session.waitlist.map((patient) => (
            <WaitlistRankRow 
              key={patient.patientId} 
              rank={patient.rank} 
              patient={patient} 
            />
          ))}
        </div>
      )}

      {variant === "compact" && (
        <div className="space-y-1 mt-2 border-t border-border-dim pt-2 bg-bg-base p-2 rounded-xs">
          {session.waitlist.slice(0, 2).map((patient) => (
            <WaitlistRankRow 
              key={patient.patientId} 
              rank={patient.rank} 
              patient={patient} 
              compact={true} 
            />
          ))}
          {session.waitlist.length > 2 && (
            <div className="text-[9.5px] text-text-tertiary font-semibold text-right font-sans pt-1">
              +{session.waitlist.length - 2} more on priority waitlist
            </div>
          )}
        </div>
      )}

      {/* Escalation Countdown */}
      <div className="mt-4 space-y-1.5 select-none">
        <div className="flex justify-between items-center text-[10px] font-sans">
          <span className="text-text-tertiary font-semibold uppercase tracking-wider">ESCALATION THRESHOLD</span>
          <span className={`font-mono font-semibold ${pct >= 80 ? "text-status-danger" : pct >= 50 ? "text-status-warning" : "text-text-secondary"}`}>
            {countdownText}
          </span>
        </div>
        <div className="w-full bg-bg-base h-1.5 rounded-full overflow-hidden border border-border-dim">
          <div 
            className={`h-full transition-all duration-1000 ${getBarColor(pct)}`} 
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-border-dim">
        <button 
          onClick={() => onViewDetail(session.sessionId)}
          className="flex-1 text-center py-2 bg-bg-subtle hover:bg-bg-subtle/80 border border-border-base text-[10px] font-sans font-bold text-text-primary rounded-xs cursor-pointer transition-colors shadow-3xs"
        >
          View Detail
        </button>
        <button 
          onClick={() => onEscalate(session.sessionId)}
          className="flex-1 text-center py-2 bg-transparent hover:bg-status-danger/10 border border-status-danger/30 hover:border-status-danger text-[10px] font-sans font-bold text-status-danger rounded-xs cursor-pointer transition-all shadow-3xs"
        >
          Escalate Now
        </button>
      </div>
    </div>
  );
}
