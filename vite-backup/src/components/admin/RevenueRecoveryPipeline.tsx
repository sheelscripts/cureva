import React from "react";
import { Calendar, AlertTriangle, Send, RefreshCw, DollarSign, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";

export default function RevenueRecoveryPipeline() {
  const steps = [
    {
      id: "scheduled",
      title: "Appointments Tomorrow",
      value: "124 Slots",
      desc: "Gross clinic slot capacity",
      color: "border-border-base text-text-primary bg-bg-surface",
      icon: Calendar,
      meta: "100% capacity"
    },
    {
      id: "predicted",
      title: "Predicted No-Shows",
      value: "14 Patients",
      desc: "Flagged by AI Predictor Forest",
      color: "border-status-danger/30 text-status-danger bg-status-danger/5",
      icon: AlertTriangle,
      meta: "11.2% risk forecast",
      highlight: true
    },
    {
      id: "interventions",
      title: "Interventions Sent",
      value: "12 Dispatched",
      desc: "WhatsApp & IVR priority loops",
      color: "border-status-warning/40 text-status-warning bg-status-warning/5",
      icon: Send,
      meta: "85.7% response action"
    },
    {
      id: "recovered",
      title: "Recovered & Reallocated",
      value: "8 Filled",
      desc: "Automatic SlotSaver reassignments",
      color: "border-status-safe/30 text-status-safe bg-status-safe/5",
      icon: RefreshCw,
      meta: "66.7% rescue efficiency"
    },
    {
      id: "protected",
      title: "Revenue Protected",
      value: "₹42,000",
      desc: "Shielded capital protected today",
      color: "border-accent bg-accent text-white",
      icon: DollarSign,
      meta: "Secured & Settled",
      dark: true
    }
  ];

  return (
    <div className="bg-bg-surface border border-border-dim rounded-sm p-5 shadow-xs select-none space-y-4">
      {/* Header with Title and ROI math */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-border-dim/40">
        <div className="space-y-1">
          <span className="text-[9.5px] uppercase font-sans font-bold text-text-tertiary tracking-widest block">
            Automatic Yield Management
          </span>
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-sans flex items-center gap-1.5">
            Real-Time SlotSaver Revenue Recovery Pipeline
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="font-mono text-status-safe font-bold bg-status-safe/10 px-2 py-0.5 rounded-sm">
            ROI: +4.2L Protected (MTD)
          </span>
        </div>
      </div>

      {/* Grid Flow Pipeline */}
      {/* Desktop: Connected horizontal flexbox / grid. Mobile: Vertical listing */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="relative flex flex-col justify-between">
              
              {/* Card Surface */}
              <div 
                className={`p-3.5 rounded-sm border transition-all h-full flex flex-col justify-between space-y-3 ${
                  step.dark 
                    ? "bg-accent border-accent text-white shadow-sm" 
                    : "bg-white border-border-dim hover:border-border-base text-text-primary shadow-2xs"
                }`}
              >
                {/* Step Index & Icon */}
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold uppercase ${step.dark ? "text-white/65" : "text-text-tertiary"}`}>
                    Stage 0{idx + 1}
                  </span>
                  <div className={`p-1.5 rounded-xs ${step.dark ? "bg-white/20 text-white" : "bg-bg-base text-text-secondary"}`}>
                    <Icon size={14} className={step.id === "predicted" ? "animate-pulse" : ""} />
                  </div>
                </div>

                {/* Primary Data */}
                <div>
                  <span className={`text-[10px] font-medium font-sans ${step.dark ? "text-white/80" : "text-text-secondary"}`}>
                    {step.title}
                  </span>
                  <div className="text-xl font-mono font-bold tracking-tight mt-0.5">
                    {step.value}
                  </div>
                </div>

                {/* Foot/Meta details */}
                <div className="pt-2 border-t border-border-dim/30 flex items-center justify-between text-[9px] font-mono">
                  <span className={step.dark ? "text-white/70" : "text-text-tertiary truncate"}>
                    {step.desc}
                  </span>
                  <span className={`font-semibold shrink-0 ml-1 ${step.dark ? "text-status-safe bg-white/10 px-1 py-0.2 rounded-xs" : step.highlight ? "text-status-danger font-bold" : "text-text-secondary"}`}>
                    {step.meta}
                  </span>
                </div>
              </div>

              {/* Connector Chevron (Desktop only) */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-2 bg-bg-surface border border-border-base p-0.5 rounded-full z-10 text-text-tertiary shadow-xs -translate-y-1/2">
                  <ArrowRight size={10} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explainer tooltip info list */}
      <div className="pt-2 flex flex-wrap items-center gap-4 text-[10px] text-text-secondary font-mono border-t border-border-dim/20">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-status-danger" />
          Predictor: XGBoost + Patient Profile
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-status-warning" />
          Gateway: SMS, WhatsApp, & Automated Phone Calls
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-status-safe" />
          Match Algo: Waitlist Priority Matrix (proximity + clinical urgency score)
        </span>
      </div>
    </div>
  );
}
