"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  X, 
  MessageSquare, 
  PhoneCall, 
  Clock, 
  Check, 
  ChevronRight,
  Sparkles,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  FileCode
} from "lucide-react";
import { escalations } from "@/mock/admin";

export default function EscalationTable() {
  const [filter, setFilter] = useState<string>("all");
  const [selectedEscalationId, setSelectedEscalationId] = useState<string | null>(null);
  const [resolutionInput, setResolutionInput] = useState<string>("");
  const [unresolvedEscalations, setUnresolvedEscalations] = useState<typeof escalations>(escalations);
  const [jsonCollapsed, setJsonCollapsed] = useState<boolean>(true);
  const [resolutionStatus, setResolutionStatus] = useState<string | null>(null);

  const activeEsc = useMemo(() => {
    return unresolvedEscalations.find(e => e.id === selectedEscalationId) || null;
  }, [selectedEscalationId, unresolvedEscalations]);

  const filteredEscalations = useMemo(() => {
    if (filter === "all") return unresolvedEscalations;
    if (filter === "recovered") return unresolvedEscalations.filter(e => e.outcome === "recovered");
    if (filter === "lost") return unresolvedEscalations.filter(e => e.outcome === "lost");
    return unresolvedEscalations;
  }, [filter, unresolvedEscalations]);

  const handleResolve = (id: string) => {
    setUnresolvedEscalations((prev) => 
      prev.map((e) => {
        if (e.id === id) {
          return { ...e, outcome: "recovered", resolvedBy: "Escalation Desk (Human Completed)" };
        }
        return e;
      })
    );
    setResolutionStatus("Active record marked as human-resolved. Active slot recovered successfully!");
    setTimeout(() => {
      setSelectedEscalationId(null);
      setResolutionInput("");
      setResolutionStatus(null);
    }, 2000);
  };

  const getOutcomeColor = (outcome: string) => {
    return outcome === "recovered" ? "text-status-safe" : "text-status-danger";
  };

  const getOutcomeBg = (outcome: string) => {
    return outcome === "recovered" ? "bg-status-safe/5 border border-status-safe/15" : "bg-status-danger/5 border border-status-danger/15";
  };

  const formatReason = (reason: string) => {
    switch (reason) {
      case "no_response_timeout": return "Timeout (unresponsive)";
      case "low_confidence": return "Low Confidence AI Draft";
      case "patient_declined": return "Patient Declined Slot";
      default: return reason;
    }
  };

  const mockHandoffPayload = {
    session_id: "sess_8821",
    escalation_code: "ESC-441",
    high_risk_flagScore: 0.94,
    proactive_messages_dispatched: [
      { medium: "WhatsApp", recipient_id: "P-1042", dispatch_time: "12:46 PM" },
      { medium: "WhatsApp", recipient_id: "P-2311", dispatch_time: "12:47 PM" },
      { medium: "SMS", recipient_id: "P-9082", dispatch_time: "12:48 PM" }
    ],
    agent_reason: "Automated recovery failure. Patients exceeded maximum waitlist limits (450 seconds) without slot validation."
  };

  return (
    <div className="w-full bg-bg-surface border border-border-dim rounded-sm shadow-xs select-none overflow-hidden font-sans text-xs">
      {/* Table filter toolbar */}
      <div className="p-4 border-b border-border-dim flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-subtle">
        <div>
          <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">
            Resolution Queue
          </span>
          <h4 className="text-sm font-sans font-bold text-text-primary mt-1">
            Clinic Escalation Center Logs
          </h4>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-bg-subtle p-1 rounded-sm border border-border-dim">
          {["all", "recovered", "lost"].map((tier) => (
            <button
              key={tier}
              onClick={() => setFilter(tier)}
              className={`px-3 py-1 font-sans rounded-xs uppercase text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                filter === tier 
                  ? "bg-bg-surface text-text-primary shadow-xs font-bold border border-border-dim/40" 
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-dim bg-bg-subtle/40 text-text-secondary uppercase tracking-wider text-[10px] font-bold">
              <th className="py-2.5 px-4 font-mono">ID</th>
              <th className="py-2.5 px-4 font-sans">Doctor Mapping</th>
              <th className="py-2.5 px-4 font-sans">Escalation Reason</th>
              <th className="py-2.5 px-4 text-center font-sans">Contacted</th>
              <th className="py-2.5 px-4 text-center font-sans">Outcome</th>
              <th className="py-2.5 px-4 text-right font-mono">Lost Slot Value</th>
              <th className="py-2.5 px-4 text-right font-sans">Resolved By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dim font-mono text-text-primary">
            {filteredEscalations.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelectedEscalationId(item.id)}
                className={`hover:bg-bg-subtle/20 cursor-pointer transition-colors ${
                  selectedEscalationId === item.id ? "bg-bg-subtle" : ""
                }`}
              >
                <td className="py-2.5 px-4 font-bold text-text-primary">{item.id}</td>
                <td className="py-2.5 px-4 font-sans text-text-primary">
                  <div>
                    <span className="font-bold block text-text-primary">{item.doctorName}</span>
                    <span className="text-[10px] text-text-tertiary">{item.specialty}</span>
                  </div>
                </td>
                <td className="py-2.5 px-4 font-sans text-text-secondary">
                  {formatReason(item.reason)}
                </td>
                <td className="py-2.5 px-4 text-center font-mono text-text-primary">
                  {item.patientsContacted} patients
                </td>
                <td className="py-2.5 px-4 text-center font-mono font-bold">
                  <span className={`px-2 py-0.5 rounded-sm border ${getOutcomeColor(item.outcome)} ${getOutcomeBg(item.outcome)} text-[10px] font-bold uppercase`}>
                    {item.outcome}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-text-primary font-bold">
                  ₹{item.valueInr.toLocaleString("en-IN")}
                </td>
                <td className="py-2.5 px-4 text-right font-sans text-text-secondary">
                  {item.resolvedBy}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAIL DRAWER */}
      <AnimatePresence>
        {selectedEscalationId && activeEsc && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEscalationId(null)}
              className="fixed inset-0 bg-black/40 z-40"
            />

            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-bg-surface border-l border-border-dim z-50 flex flex-col shadow-2xl overflow-hidden font-sans text-xs text-text-primary"
            >
              {/* Header */}
              <div className="p-4 border-b border-border-dim bg-bg-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-status-danger/10 flex items-center justify-center border border-status-danger/20">
                    <ShieldAlert size={14} className="text-status-danger" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary font-mono">{activeEsc.id}</h4>
                    <span className="text-[10px] text-text-secondary block font-sans">
                      Waitlist Escalation • Doctor session backup
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEscalationId(null)}
                  className="p-1 rounded-sm border border-border-dim hover:bg-bg-subtle/80 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {resolutionStatus && (
                  <div className="p-3 bg-status-safe/10 border border-status-safe/25 rounded-sm text-status-safe font-mono font-bold text-center tracking-wide uppercase">
                    {resolutionStatus}
                  </div>
                )}

                {/* Core Status Banner */}
                <div className="p-3.5 bg-bg-subtle border border-border-dim rounded-sm flex items-center justify-between font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-sans text-text-tertiary">Escalated Source Reason</span>
                    <span className="text-status-danger block font-sans font-bold text-xs">
                      {formatReason(activeEsc.reason)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-sans text-text-tertiary block">Lost value</span>
                    <span className="font-mono text-text-primary font-bold">₹{activeEsc.valueInr} INR</span>
                  </div>
                </div>

                {/* Event Logs Timeline */}
                <div className="space-y-3">
                  <span className="text-[9.5px] uppercase font-sans font-bold tracking-wider text-text-tertiary block border-b border-border-dim pb-1.5">
                    Chronological Engine Decisions Log
                  </span>

                  <div className="relative border-l border-border-dim pl-4 space-y-5 ml-2 mt-2">
                    <div className="relative">
                      <span className="absolute -left-[20.5px] top-0.5 w-[11px] h-[11px] rounded-full bg-status-danger border-2 border-bg-surface" />
                      <div className="font-mono text-[10.5px]">
                        <span className="text-text-primary font-bold">12:45 PM</span> — <span className="text-status-danger font-bold">CANCELLATION RECEIVED</span>
                        <p className="text-text-secondary font-sans text-[10px] mt-0.5">
                          Doctor {activeEsc.doctorName} had slot booked at {activeEsc.slotTime} cancelled by initial patient.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-[20.5px] top-0.5 w-[11px] h-[11px] rounded-full bg-status-warning border-2 border-bg-surface" />
                      <div className="font-mono text-[10.5px]">
                        <span className="text-text-primary font-bold">12:45 PM</span> — <span className="text-status-warning font-bold">RECOVERY AGENT STARTED</span>
                        <p className="text-text-secondary font-sans text-[10px] mt-0.5">
                          Loaded golden prompts, parsed waitlists, queued top segment candidates.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-[20.5px] top-0.5 w-[11px] h-[11px] rounded-full bg-status-info border-2 border-bg-surface" />
                      <div className="font-mono text-[10.5px]">
                        <span className="text-text-primary font-bold">12:46 PM</span> — <span className="text-status-info font-semibold">Priya Mehta Contacted (WhatsApp)</span>
                        <p className="text-text-secondary font-sans text-[10px] mt-0.5">
                          High risk candidate dispatched. Waiting 180s for user token acceptance.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-[20.5px] top-0.5 w-[11px] h-[11px] rounded-full bg-status-info border-2 border-bg-surface" />
                      <div className="font-mono text-[10.5px]">
                        <span className="text-text-primary font-bold">12:47 PM</span> — <span className="text-status-info font-semibold">Neha Sharma Contacted (WhatsApp)</span>
                        <p className="text-text-secondary font-sans text-[10px] mt-0.5">
                          Medium risk target contacted dynamically as part of cascading pipeline.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-[20.5px] top-0.5 w-[11px] h-[11px] rounded-full bg-text-tertiary border-2 border-bg-surface" />
                      <div className="font-mono text-[10.5px]">
                        <span className="text-text-primary font-bold">01:01 PM</span> — <span className="text-text-tertiary font-semibold">Waitlist Limit (450s) Exceeded</span>
                        <p className="text-text-secondary font-sans text-[10px] mt-0.5">
                          No confirmation received before timeout. Escalated to clinic reservation desk.
                        </p>
                      </div>
                    </div>

                    {activeEsc.outcome === "recovered" ? (
                      <div className="relative">
                        <span className="absolute -left-[20.5px] top-0.5 w-[11px] h-[11px] rounded-full bg-status-safe border-2 border-bg-surface" />
                        <div className="font-mono text-[10.5px]">
                          <span className="text-status-safe font-bold">01:08 PM — SLOT RECOVERED BY RECEPTION</span>
                          <p className="text-status-safe font-sans text-[10px] mt-0.5 font-semibold">
                            Reception manually contacted backup list. Priya Mehta confirmed new slot successfully!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute -left-[20.5px] top-0.5 w-[11px] h-[11px] rounded-full bg-status-danger border-2 border-bg-surface" />
                        <div className="font-mono text-[10.5px]">
                          <span className="text-status-danger font-bold">01:15 PM — EXPIRED WAITLIST / SLOT CLOSED</span>
                          <p className="text-text-secondary font-sans text-[10px] mt-0.5">
                            Human desk was unable to recover slot prior to clinician calendar expiry. Leftover slot dead.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Handoff payload */}
                <div className="p-4 bg-bg-subtle border border-border-dim rounded-sm space-y-2">
                  <button 
                    onClick={() => setJsonCollapsed(!jsonCollapsed)}
                    className="w-full flex items-center justify-between text-xs font-sans font-bold text-text-primary cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileCode size={13} className="text-text-secondary" />
                      <span>Diagnostics API Handoff JSON Payload</span>
                    </div>
                    <ChevronRight size={14} className={`transform transition-transform ${jsonCollapsed ? "" : "rotate-90"}`} />
                  </button>

                  {!jsonCollapsed && (
                    <pre className="p-3 bg-bg-surface border border-border-dim text-[10px] text-text-secondary font-mono rounded-xs overflow-x-auto select-all max-h-[140px]">
                      {JSON.stringify(mockHandoffPayload, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Resolution input text area (if open or active) */}
                {activeEsc.outcome !== "recovered" && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-sans uppercase font-bold text-text-secondary block">Human Agent Desk Resolution Notes</span>
                    <textarea 
                      value={resolutionInput}
                      onChange={(e) => setResolutionInput(e.target.value)}
                      placeholder="Input notes regarding telephone Outreach or scheduling adjustments..."
                      className="w-full p-2.5 bg-bg-surface border border-border-dim rounded-sm font-sans focus:outline-none focus:border-accent text-text-primary text-xs"
                      rows={2}
                    />
                  </div>
                )}

              </div>

              {/* Drawer Footer controls */}
              <div className="p-4 border-t border-border-dim bg-bg-subtle flex items-center justify-between">
                <button
                  onClick={() => setSelectedEscalationId(null)}
                  className="px-3 py-1.5 text-[11px] rounded-sm border border-border-dim font-sans font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
                >
                  Close panel
                </button>

                {activeEsc.outcome !== "recovered" && (
                  <button
                    onClick={() => handleResolve(activeEsc.id)}
                    className="px-5 py-1.5 text-[11px] rounded-sm bg-accent text-bg-surface font-bold flex items-center gap-1 hover:bg-opacity-95 cursor-pointer transition-all"
                  >
                    <Check size={13} />
                    <span>Mark Slot Recovered</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
