import React from "react";
import { ArrowDown, Check, Users, FileText, XCircle } from "lucide-react";

export default function AppointmentFunnel() {
  const steps = [
    {
      label: "Scheduled Appointments",
      count: 1312,
      pctOfTotal: 100,
      subtext: "Total calendar slots allocated",
      colorBg: "bg-bg-subtle border border-border-dim",
      textColor: "text-text-secondary",
      icon: Users
    },
    {
      label: "Confirmed Early",
      count: 1187,
      pctOfTotal: 90.5,
      subtext: "Validated through proactive messaging",
      colorBg: "bg-status-warning/10 border border-status-warning/20",
      textColor: "text-status-warning",
      icon: Check
    },
    {
      label: "Attended & Handled",
      count: 1136,
      pctOfTotal: 86.6,
      subtext: "Completed checkout consultations",
      colorBg: "bg-status-safe/10 border border-status-safe/22",
      textColor: "text-status-safe",
      icon: FileText
    },
    {
      label: "Standard Unrecovered No-Show",
      count: 51,
      pctOfTotal: 3.9,
      subtext: "Leakage unrecovered by escalation desk",
      colorBg: "bg-status-danger/10 border border-status-danger/22",
      textColor: "text-status-danger",
      icon: XCircle
    }
  ];

  return (
    <div className="w-full bg-bg-surface border border-border-dim p-5 rounded-sm select-none shadow-xs">
      <div className="mb-4">
        <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">
          Operational Leakage
        </span>
        <h4 className="text-sm font-sans font-bold text-text-primary mt-1">
          Clinician Appointment Funnel
        </h4>
      </div>

      <div className="space-y-3 relative">
        {steps.map((step, idx) => {
          const IconComp = step.icon;
          return (
            <div key={idx} className="flex flex-col">
              {/* Main Step Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-bg-subtle/30 border border-border-dim rounded-sm group hover:border-border-base transition-colors">
                <div className="flex items-center gap-3 min-w-[240px]">
                  <div className="p-2 rounded-full bg-bg-surface border border-border-dim flex items-center justify-center shadow-xs">
                    <IconComp size={14} className={step.textColor} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-text-primary font-sans">
                      {step.label}
                    </h5>
                    <span className="text-[10px] text-text-secondary block">
                      {step.subtext}
                    </span>
                  </div>
                </div>

                {/* Horizontal progress representation */}
                <div className="flex-1 max-w-[260px] hidden lg:block bg-bg-subtle border border-border-dim/40 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${idx === 0 ? "bg-text-secondary" : idx === 1 ? "bg-status-warning" : idx === 2 ? "bg-status-safe" : "bg-status-danger"}`}
                    style={{ width: `${step.pctOfTotal}%` }}
                  />
                </div>

                <div className="flex items-baseline gap-3 text-right">
                  <span className="text-sm font-mono font-bold text-text-primary">
                    {step.count.toLocaleString("en-IN")}
                  </span>
                  <span className={`text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-sm ${step.colorBg} ${step.textColor}`}>
                    {step.pctOfTotal}%
                  </span>
                </div>
              </div>

              {/* Step connection arrow */}
              {idx < steps.length - 1 && (
                <div className="flex justify-center my-1 select-none pr-4">
                  <ArrowDown size={14} className="text-text-tertiary opacity-60 animate-bounce" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
