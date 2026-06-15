"use client";

import React, { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, AlertCircle, Phone, PhoneCall } from "lucide-react";

interface Escalation {
  id: string;
  sessionId: string;
  slotTime: string;
  doctorName: string;
  specialty: string;
  valueInr: number;
  patientsContacted: number;
  responsesReceived: number;
  escalationReason: string;
  escalatedAt: string;
  recommendation: string;
  topPatient: {
    name: string;
    phone: string;
    waitDays: number;
  };
  handoffPayload: any;
  status: string;
}

interface EscalationCardProps {
  escalation: Escalation;
  onResolve: (id: string) => void;
  onRelease: (id: string) => void;
  onViewDetail: (sessionId: string) => void;
}

export default function EscalationCard({
  escalation,
  onResolve,
  onRelease,
  onViewDetail,
}: EscalationCardProps) {
  const [copied, setCopied] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(escalation.topPatient.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResolveClick = () => {
    setIsFading(true);
    // Wait for the fade animation (200ms) before triggering state update
    setTimeout(() => {
      onResolve(escalation.id);
    }, 200);
  };

  return (
    <div 
      className={`bg-bg-surface border border-border-dim rounded-sm p-5 border-l-[3px] border-status-warning relative flex flex-col justify-between overflow-hidden shadow-2xs hover:border-border-base transition-all duration-300 ${isFading ? "opacity-0 scale-95 duration-200" : "opacity-100 scale-100"}`}
    >
      {/* Needs Attention Alert Banner */}
      <div className="flex items-center gap-1.5 text-status-warning select-none">
        <AlertCircle size={14} />
        <span className="text-[10px] uppercase font-sans font-bold tracking-wider">
          Needs your attention
        </span>
      </div>

      {/* Header Info */}
      <div className="flex items-start justify-between gap-4 mt-3 select-none">
        <div>
          <h4 className="text-sm font-semibold text-text-primary tracking-wide font-sans">
            {escalation.slotTime} · {escalation.specialty} · {escalation.doctorName}
          </h4>
          <p className="text-[10px] text-text-tertiary font-mono mt-1">
            Escalated at {escalation.escalatedAt}
          </p>
        </div>
        <span className="font-mono text-xs font-bold text-accent text-right">
          ₹{escalation.valueInr.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Diagnostic What Happened block */}
      <div className="mt-4 bg-bg-base/40 border border-border-dim p-3 rounded-sm space-y-1 select-none font-sans">
        <span className="text-[9px] uppercase font-bold text-text-tertiary tracking-wider block">WHAT HAPPENED:</span>
        <p className="text-xs text-text-secondary leading-relaxed">
          {escalation.patientsContacted} waitlist patients contacted, 0 responded within the 15-minute automated recovery threshold limit.
        </p>
      </div>

      {/* Action Recommendation */}
      <div className="mt-4 bg-status-warning/5 border border-status-warning/20 p-3 rounded-sm space-y-2 font-sans">
        <span className="text-[9px] uppercase font-bold text-status-warning tracking-wider block">RECOMMENDED ACTION:</span>
        <p className="text-xs text-text-primary font-medium leading-relaxed">
          Call {escalation.topPatient.name} — waited {escalation.topPatient.waitDays} days, highest predicted likelihood to accept slot.
        </p>
        
        {/* Phone details row */}
        <div className="flex items-center justify-between bg-bg-surface border border-border-dim p-2 rounded-xs">
          <div className="flex items-center gap-2">
            <Phone size={12} className="text-text-secondary" />
            <span className="font-mono text-xs text-text-primary tracking-wide font-semibold">
              {escalation.topPatient.phone}
            </span>
          </div>
          <button 
            onClick={handleCopy}
            className="p-1 hover:bg-bg-base rounded-xs text-text-secondary hover:text-text-primary cursor-pointer transition-colors flex items-center gap-1.5 text-[9px] font-mono font-semibold"
            title="Copy Number"
          >
            {copied ? (
              <>
                <Check size={11} className="text-status-safe" />
                <span className="text-status-safe">Copied</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary Card actions */}
      <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-border-dim">
        <button 
          onClick={handleResolveClick}
          className="flex-1 text-center py-2 bg-accent hover:opacity-90 text-bg-surface text-[10.5px] font-sans font-bold rounded-xs cursor-pointer transition-colors shadow-xs"
        >
          Mark Resolved
        </button>
        <button 
          onClick={() => onRelease(escalation.id)}
          className="flex-1 text-center py-2 bg-bg-subtle hover:bg-bg-base border border-border-base text-[10.5px] font-sans font-bold text-text-secondary hover:text-text-primary rounded-xs cursor-pointer transition-colors"
        >
          Release Slot
        </button>
      </div>

      <div className="text-center mt-2.5">
        <button 
          onClick={() => onViewDetail(escalation.sessionId)}
          className="text-[10px] font-sans text-text-secondary hover:text-accent hover:underline cursor-pointer inline-block"
        >
          View Session Detail
        </button>
      </div>

      {/* Collapsible raw Handoff JSON payload for developers */}
      <div className="mt-4 border-t border-border-dim/40 pt-3">
        <button 
          onClick={() => setShowHandoff(!showHandoff)}
          className="w-full flex items-center justify-between text-text-tertiary hover:text-text-secondary text-[9.5px] uppercase font-bold tracking-wider font-sans cursor-pointer py-1"
        >
          <span>HANDOFF TELEMETRY DATA</span>
          {showHandoff ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        
        {showHandoff && (
          <div className="mt-2 text-[10px] font-mono text-text-secondary bg-bg-base border border-border-dim p-3 rounded-xs overflow-x-auto select-text leading-relaxed max-h-40">
            <pre className="whitespace-pre">{JSON.stringify(escalation.handoffPayload, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
