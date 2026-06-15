"use client";

import React from "react";
import { X, ShieldAlert, Check, Copy } from "lucide-react";

interface EscalationHandoffDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  escalation: any | null;
  onResolve: (id: string) => void;
}

export default function EscalationHandoffDrawer({
  isOpen,
  onClose,
  escalation,
  onResolve,
}: EscalationHandoffDrawerProps) {
  if (!isOpen || !escalation) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
        onClick={onClose}
      />
      <div 
        className="fixed right-0 top-0 h-screen w-full max-w-[480px] bg-bg-surface border-l border-border-base z-50 shadow-2xl flex flex-col justify-between overflow-hidden font-sans text-text-primary"
      >
        {/* Header */}
        <div className="p-4 border-b border-border-base bg-bg-subtle flex justify-between items-center select-none">
          <div className="flex items-center gap-1.5 text-status-warning">
            <ShieldAlert size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Escalation Handoff Payloads</span>
          </div>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-bg-base/30">
          <div className="space-y-1 select-none">
            <span className="font-mono text-[9px] text-text-tertiary">CASE ID: {escalation.id}</span>
            <h4 className="text-sm font-semibold text-text-primary">
              {escalation.slotTime} · {escalation.specialty}
            </h4>
            <p className="text-xs text-text-secondary">
              Clinic Clinician: {escalation.doctorName}
            </p>
          </div>

          <div className="bg-bg-surface p-4 rounded-sm border border-border-dim space-y-2 select-none">
            <span className="text-[9px] text-status-warning uppercase font-bold tracking-wider">RECOMMENDED ACTION</span>
            <p className="text-xs text-text-primary font-medium leading-relaxed">
              {escalation.recommendation}
            </p>
          </div>

          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider block">Raw JSON Handoff</span>
            <div className="bg-bg-surface border border-border-dim p-4 rounded-sm overflow-x-auto text-[11px] font-mono leading-relaxed text-text-secondary max-h-[300px]">
              <pre className="whitespace-pre">{JSON.stringify(escalation.handoffPayload, null, 2)}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-base bg-bg-subtle flex gap-2.5">
          <button 
            onClick={() => {
              onResolve(escalation.id);
              onClose();
            }}
            className="flex-1 py-2.5 bg-accent hover:opacity-90 text-bg-surface font-bold text-xs rounded-sm cursor-pointer transition-colors text-center shadow-xs"
          >
            Mark Resolved
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 bg-bg-surface hover:bg-bg-base border border-border-base text-text-primary font-bold text-xs rounded-sm cursor-pointer transition-colors text-center"
          >
            Close Handoff View
          </button>
        </div>
      </div>
    </>
  );
}
