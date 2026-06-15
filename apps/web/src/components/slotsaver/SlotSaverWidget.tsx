"use client";

import React, { useState } from "react";
import { useSlotSaver } from "@/features/slotsaver/SlotSaverContext";
import { AlertTriangle, Check, ShieldCheck, ChevronRight, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SlotSaverWidget() {
  const router = useRouter();
  const { 
    activeSessions, 
    riskScores, 
    approveTomorrowOutreach, 
    tomorrowOutreachApproved 
  } = useSlotSaver();
  const [showModal, setShowModal] = useState(false);

  const activeSession = activeSessions.find(s => s.status === "active");
  const flaggedCount = riskScores.filter(r => r.tier === "high" || r.tier === "critical").length;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleApprove = () => {
    approveTomorrowOutreach();
    setShowModal(false);
  };

  const navigateToConsole = () => {
    router.push("/admin?view=admin-slotsaver");
  };

  return (
    <div className="bg-bg-surface border border-border-dim p-5 rounded-sm select-none font-sans space-y-4 shadow-2xs">
      {/* Label section */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-text-tertiary">
          REVENUE PROTECTION
        </span>
        <ShieldCheck size={14} className="text-status-safe" />
      </div>

      {/* Status Row */}
      <div className="flex items-center gap-2 select-none">
        {activeSession ? (
          <>
            <span className="h-2 w-2 rounded-full bg-status-warning animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-status-warning">
              1 active recovery session
            </span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-status-safe shrink-0" />
            <span className="text-xs font-semibold text-status-safe">
              System active — monitoring 47 appointments
            </span>
          </>
        )}
      </div>

      {/* Metric Row (inline, no cards) */}
      <div className="text-[11px] font-mono text-text-secondary border-t border-b border-border-dim py-2">
        ₹4.2L saved this month &middot; <span className="text-status-safe font-semibold">84% protection rate</span> &middot; 6m 40s avg fill
      </div>

      {/* Active Session details if exist */}
      {activeSession ? (
        <div 
          onClick={navigateToConsole}
          className="border border-status-safe/20 bg-status-safe/5 p-3 rounded-xs flex items-center justify-between cursor-pointer border-l-2 border-l-status-safe hover:bg-status-safe/10 transition-all"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-text-primary truncate">
              {activeSession.slotTime} Cardiology recovering &mdash; Priya contacted 3m ago
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <span className="font-mono text-xs text-text-primary font-semibold bg-bg-base px-2 py-0.5 rounded-xs border border-border-dim">
              {formatTimer(activeSession.elapsedSeconds)}
            </span>
            <span className="text-accent hover:text-accent/80 text-xs font-semibold flex items-center hover:underline">
              View <ChevronRight size={12} />
            </span>
          </div>
        </div>
      ) : (
        <div className="text-[12px] text-text-tertiary py-1">
          No active sessions. All slots monitored.
        </div>
      )}

      {/* Tomorrow's Risk Alert section */}
      <div className="bg-bg-subtle/50 border border-border-dim p-4 rounded-sm space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-text-primary font-semibold">{flaggedCount} patients flagged for tomorrow</span>
            <p className="text-[10.5px] text-text-secondary leading-relaxed">
              Auto-outreach queues scheduled to resolve high no-show risk profiles.
            </p>
          </div>
          <AlertTriangle size={14} className="text-status-warning shrink-0 mt-0.5" />
        </div>

        {/* Action button */}
        {tomorrowOutreachApproved ? (
          <div className="w-full flex items-center justify-center gap-2 py-2 bg-status-safe/10 border border-status-safe/20 text-status-safe text-xs font-bold rounded-xs select-none">
            <Check size={12} />
            <span>Auto-Outreach Dispatched tomorrow 8-10 AM</span>
          </div>
        ) : (
          <button 
            onClick={() => setShowModal(true)}
            className="w-full text-center py-2 bg-accent hover:bg-accent/90 text-white text-xs font-bold rounded-xs cursor-pointer transition-colors shadow-2xs"
          >
            Approve Auto-Outreach
          </button>
        )}
      </div>

      {/* Modal Dialog Overlay */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50" onClick={() => setShowModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-surface border border-border-base p-6 rounded-sm w-full max-w-[400px] z-55 shadow-2xl space-y-4 text-center">
            <div className="p-3 bg-accent/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-accent border border-accent/20">
              <Activity size={20} className="animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-sans">
                Approve Auto-Outreach Swarm
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-sans px-2">
                SlotSaver will contact 4 flagged patients automatically via voice call and WhatsApp before 10 AM tomorrow to verify appointment checkouts.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2 font-sans">
              <button 
                onClick={handleApprove}
                className="flex-1 py-2 bg-accent hover:bg-accent/90 text-white font-bold text-xs rounded-sm cursor-pointer transition-colors"
              >
                Confirm Dispatch
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-bg-subtle hover:bg-bg-subtle/80 border border-border-base text-text-primary font-bold text-xs rounded-sm cursor-pointer transition-colors"
              >
                Review First
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
