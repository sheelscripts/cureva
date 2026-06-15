"use client";

import React from "react";
import { ArrowDown } from "lucide-react";

interface TimelineStage {
  id: string;
  label: string;
  count: number;
  pctText: string;
  colorClass: string;
  barColor: string;
}

interface InterventionTimelineProps {
  activeStage: string;
  onStageClick: (stageId: string) => void;
}

export default function InterventionTimeline({ activeStage, onStageClick }: InterventionTimelineProps) {
  const stages: TimelineStage[] = [
    { id: "monitored", label: "Appointments monitored", count: 1312, pctText: "100%", colorClass: "text-text-primary", barColor: "bg-border-base" },
    { id: "flagged", label: "Flagged high risk", count: 312, pctText: "24% of monitored", colorClass: "text-status-warning", barColor: "bg-status-warning" },
    { id: "interventions", label: "Interventions sent", count: 248, pctText: "79% of flagged", colorClass: "text-status-info", barColor: "bg-status-info" },
    { id: "confirmed_early", label: "Confirmed early", count: 188, pctText: "76% of sent", colorClass: "text-status-safe", barColor: "bg-status-safe" },
    { id: "needed_recovery", label: "Slots needed recovery", count: 94, pctText: "38% of sent", colorClass: "text-status-warning", barColor: "bg-status-warning" },
    { id: "recovered", label: "Successfully recovered", count: 74, pctText: "79% of slots", colorClass: "text-status-safe", barColor: "bg-status-safe" },
    { id: "escalated", label: "Escalated", count: 12, pctText: "13% of slots", colorClass: "text-status-warning", barColor: "bg-status-warning" },
    { id: "lost", label: "Lost", count: 8, pctText: "8% of slots", colorClass: "text-status-danger", barColor: "bg-status-danger" }
  ];

  const maxCount = 1312;

  return (
    <div className="bg-bg-surface border border-border-dim p-5 rounded-sm select-none font-sans space-y-4 text-text-primary h-full flex flex-col justify-between">
      <div className="shrink-0">
        <div className="space-y-1">
          <span className="text-[9px] uppercase font-bold tracking-widest text-text-tertiary block">SYSTEM FUNNEL</span>
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Predict → Prevent → Recover Performance Funnel
          </h4>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between mt-4">
        {stages.map((stage, idx) => {
          const widthPct = (stage.count / maxCount) * 100;
          const isSelected = activeStage === stage.id || (activeStage === "all" && stage.id === "monitored");
          
          return (
            <div key={stage.id} className="space-y-1.5">
              <div 
                onClick={() => onStageClick(stage.id)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1 px-2 rounded-xs border cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? "bg-bg-subtle border-accent shadow-xs" 
                    : "bg-transparent border-transparent hover:bg-bg-base/50 hover:border-border-dim"
                }`}
              >
                {/* Left label & Mono number */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-text-secondary font-medium truncate">{stage.label}</span>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-3 mt-1 sm:mt-0">
                  <span className="font-mono font-bold text-text-primary shrink-0 text-right w-16">
                    {stage.count.toLocaleString("en-IN")}
                  </span>
                  <span className="font-mono text-[10px] text-text-tertiary w-28 text-right shrink-0">
                    {stage.pctText}
                  </span>
                </div>
              </div>

              {/* Progress bar container */}
              <div 
                onClick={() => onStageClick(stage.id)}
                className="w-full h-2.5 bg-bg-base rounded-full overflow-hidden border border-border-dim cursor-pointer"
              >
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${stage.barColor} ${isSelected ? "brightness-105 shadow-xs" : "opacity-80"}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>

              {/* Arrow spacer between steps */}
              {idx < stages.length - 1 && idx !== 3 && idx !== 4 && (
                <div className="flex justify-center text-text-tertiary py-0.5">
                  <ArrowDown size={10} className="opacity-45" />
                </div>
              )}
              {idx === 3 && (
                <div className="text-center text-[9px] font-mono text-text-tertiary uppercase tracking-wider py-1 border-y border-border-dim/40 my-1">
                  Cascade Trigger: Swap in Priority Waitlist Swarm
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
