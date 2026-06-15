"use client";

import React, { useState } from "react";
import { X, Clock, MessageSquare, AlertCircle, ShieldAlert, Award, ArrowUpRight } from "lucide-react";
import { ActiveSession } from "./RecoverySessionCard";

interface RecoverySessionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: ActiveSession | null;
  onEscalate: (sessionId: string) => void;
  onExtendTimer: (sessionId: string) => void;
  onOverrideBook: (sessionId: string, patientName: string) => void;
}

export default function RecoverySessionDrawer({
  isOpen,
  onClose,
  session,
  onEscalate,
  onExtendTimer,
  onOverrideBook,
}: RecoverySessionDrawerProps) {
  const [manualBookOpen, setManualBookOpen] = useState(false);
  const [selectedPatientForManual, setSelectedPatientForManual] = useState("");

  if (!isOpen || !session) return null;

  const elapsed = session.elapsedSeconds;
  const threshold = session.escalationThresholdSeconds;
  const pct = Math.min(100, (elapsed / threshold) * 100);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getStatusBadge = (patient: any) => {
    if (patient.response === "YES") {
      return <span className="text-status-safe font-bold font-mono">Confirmed ✅</span>;
    }
    if (patient.response === "NO") {
      return <span className="text-status-danger font-bold font-mono">Declined ✗</span>;
    }
    if (patient.channel === "whatsapp") {
      return <span className="text-text-secondary font-mono">Contacted ✓✓</span>;
    }
    return <span className="text-text-secondary font-mono">Sent ✓</span>;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className="fixed right-0 top-0 h-screen w-full max-w-[480px] bg-bg-surface border-l border-border-base z-50 shadow-2xl flex flex-col justify-between transition-transform duration-300 transform translate-x-0 overflow-hidden text-text-primary"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-border-base bg-bg-subtle flex items-center justify-between select-none">
          <div>
            <span className="font-mono text-[10px] text-text-tertiary block">SESSION ID: {session.sessionId}</span>
            <h3 className="text-sm font-semibold text-text-primary mt-1 font-sans">
              Slot Detail: {session.slotTime} · {session.specialty}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-bg-subtle rounded-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-bg-base/30">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-3 select-none">
            <div className="bg-bg-surface border border-border-dim p-3 rounded-sm">
              <span className="text-[9px] text-text-secondary uppercase font-bold font-sans">Slot value</span>
              <p className="font-mono text-lg font-bold text-accent mt-1">
                ₹{session.valueInr.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-bg-surface border border-border-dim p-3 rounded-sm flex flex-col justify-between">
              <span className="text-[9px] text-text-secondary uppercase font-bold font-sans">Outreach Started</span>
              <p className="font-mono text-[13px] text-text-primary font-semibold mt-1">
                {session.startedAt.includes("T") 
                  ? new Date(session.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                  : session.startedAt}
              </p>
            </div>
          </div>

          {/* Waitlist Ranking Table */}
          <div className="space-y-2.5">
            <h5 className="text-[10px] uppercase font-bold tracking-wider text-text-secondary font-sans">
              WAITLIST RANKING TABLE
            </h5>
            <div className="border border-border-dim rounded-sm bg-bg-surface overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-bg-subtle text-text-secondary border-b border-border-dim uppercase font-semibold h-8 font-sans">
                    <th className="px-3">Rnk</th>
                    <th className="px-2">Patient</th>
                    <th className="px-2 text-right">Score</th>
                    <th className="px-2 text-right">Wait</th>
                    <th className="px-2 text-right">Dist</th>
                    <th className="px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dim/60 font-mono text-text-primary bg-bg-surface">
                  {session.waitlist.map((patient) => (
                    <tr key={patient.patientId} className="h-9 hover:bg-bg-base/40 transition-colors">
                      <td className="px-3 text-text-tertiary font-bold">{patient.rank}</td>
                      <td className="px-2 font-sans font-medium text-text-primary truncate max-w-[80px]">
                        {patient.patientName}
                      </td>
                      <td className="px-2 text-right text-accent font-semibold">{patient.score.toFixed(2)}</td>
                      <td className="px-2 text-right text-text-secondary">{patient.waitDays}d</td>
                      <td className="px-2 text-right text-text-secondary">{patient.distanceKm}km</td>
                      <td className="px-3 text-right text-xs">{getStatusBadge(patient)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dispatch messages timeline details */}
          <div className="space-y-3">
            <h5 className="text-[10px] uppercase font-bold tracking-wider text-text-secondary font-sans">
              MESSAGES DISPATCH LOGS
            </h5>
            <div className="space-y-2.5">
              {session.messages.map((msg, idx) => (
                <div key={idx} className="bg-bg-surface border border-border-dim p-3 rounded-sm space-y-2 font-sans">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                      <span>{msg.patientName}</span>
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-xs bg-bg-base text-text-secondary border border-border-dim">
                        {msg.channel}
                      </span>
                    </div>
                    <span className="font-mono text-text-tertiary text-[10px]">{msg.sentAt}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed bg-bg-base/40 p-2 border border-border-dim/40 rounded-xs">
                    "{msg.content}"
                  </p>
                  <div className="flex justify-between items-center text-[10px] font-mono text-text-tertiary pt-0.5">
                    <span>STATUS: {msg.deliveryStatus.toUpperCase()}</span>
                    {msg.response && (
                      <span className="text-status-safe font-bold">RESPONSE: {msg.response}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Session Events timeline */}
          <div className="space-y-3">
            <h5 className="text-[10px] uppercase font-bold tracking-wider text-text-secondary font-sans">
              SESSION TIMELINE
            </h5>
            <div className="border border-border-dim p-4 rounded-sm bg-bg-surface space-y-4 font-sans select-none">
              <div className="relative border-l border-border-base pl-4 space-y-4 text-xs">
                
                {/* Trigger */}
                <div className="relative">
                  <div className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-status-danger" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-primary font-semibold">Appointment Cancellation Received</span>
                    <span className="font-mono text-text-tertiary">3:10 PM</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5">Patient missed pre-triage confirmations trigger.</p>
                </div>

                {/* Score */}
                <div className="relative">
                  <div className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-accent" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-primary font-semibold">Risk Scorer Ranked Waitlist</span>
                    <span className="font-mono text-text-tertiary">3:10 PM</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5">Ranked 3 candidates according to distance and wait parameters.</p>
                </div>

                {/* Out */}
                <div className="relative">
                  <div className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-status-safe" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-primary font-semibold">Automated Invites Dispatched</span>
                    <span className="font-mono text-text-tertiary">3:12 PM</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5">Messages successfully pushed to waitlist swarms.</p>
                </div>

                {/* Active status indicator */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-status-safe animate-ping" />
                  <div className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-status-safe" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-status-safe font-bold">Active Refill Swarm Monitoring</span>
                    <span className="font-mono text-status-safe font-semibold">AWAITING</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Drawer Footer Escalation Swarm controls */}
        <div className="p-4 border-t border-border-base bg-bg-subtle space-y-4">
          
          {/* Progress countdown */}
          <div className="space-y-1.5 select-none font-sans">
            <div className="flex justify-between text-[10.5px]">
              <span className="text-text-secondary uppercase font-bold tracking-wider text-[9.5px]">AUTO ESCALATION COUNTDOWN</span>
              <span className="font-mono text-text-primary font-semibold">
                {Math.max(0, 900 - elapsed) > 0 
                  ? `${Math.floor((900 - elapsed) / 60)}m ${Math.floor((900 - elapsed) % 60)}s`
                  : "Escalated"}
              </span>
            </div>
            <div className="w-full bg-bg-surface h-1.5 rounded-full overflow-hidden border border-border-dim">
              <div 
                className={`h-full transition-all duration-1000 ${pct >= 80 ? "bg-status-danger" : pct >= 50 ? "bg-status-warning" : "bg-status-safe"}`} 
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            
            {manualBookOpen ? (
              <div className="bg-bg-surface p-3 border border-border-base rounded-sm space-y-2 font-sans">
                <span className="text-[10px] text-text-secondary uppercase font-bold block">SELECT PATIENT TO BOOK</span>
                <select 
                  className="w-full bg-bg-base border border-border-base text-xs text-text-primary p-2 rounded-sm focus:outline-hidden"
                  value={selectedPatientForManual}
                  onChange={(e) => setSelectedPatientForManual(e.target.value)}
                >
                  <option value="">-- Choose Patient --</option>
                  {session.waitlist.map(w => (
                    <option key={w.patientId} value={w.patientName}>{w.patientName} (Score: {w.score.toFixed(2)})</option>
                  ))}
                </select>
                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={() => {
                      if (selectedPatientForManual) {
                        onOverrideBook(session.sessionId, selectedPatientForManual);
                        setManualBookOpen(false);
                        onClose();
                      }
                    }}
                    disabled={!selectedPatientForManual}
                    className="flex-1 py-1.5 bg-accent text-bg-surface hover:opacity-90 font-bold text-xs rounded-sm cursor-pointer disabled:opacity-40"
                  >
                    Confirm Booking
                  </button>
                  <button 
                    onClick={() => setManualBookOpen(false)}
                    className="flex-1 py-1.5 bg-bg-base hover:bg-bg-subtle border border-border-base text-text-primary font-bold text-xs rounded-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setManualBookOpen(true)}
                className="w-full py-2.5 bg-accent hover:bg-accent/90 text-bg-surface font-sans font-bold text-xs rounded-sm cursor-pointer transition-colors shadow-md flex items-center justify-center gap-1"
              >
                <ArrowUpRight size={13} />
                <span>Override — Book Manually</span>
              </button>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => onExtendTimer(session.sessionId)}
                className="flex-1 py-2 border border-border-base bg-bg-surface hover:bg-bg-base font-sans font-bold text-xs text-text-primary rounded-sm cursor-pointer transition-colors"
              >
                Extend by 5 min
              </button>
              <button 
                onClick={() => {
                  onEscalate(session.sessionId);
                  onClose();
                }}
                className="flex-1 py-2 border border-status-danger/40 hover:border-status-danger bg-status-danger/10 hover:bg-status-danger/20 font-sans font-bold text-xs text-status-danger rounded-sm cursor-pointer transition-colors"
              >
                Escalate Now
              </button>
            </div>

          </div>

        </div>

      </div>
    </>
  );
}
