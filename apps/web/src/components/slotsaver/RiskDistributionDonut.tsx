"use client";

import React from "react";

export default function RiskDistributionDonut() {
  // Data definitions
  const segments = [
    { label: "Low (0.0–0.4)", pct: 62, count: 813, color: "#94A3B8", class: "text-text-tertiary" },
    { label: "Medium (0.4–0.65)", pct: 21, count: 276, color: "#CA8A04", class: "text-status-warning" },
    { label: "High (0.65–0.85)", pct: 12, count: 157, color: "#EA580C", class: "text-orange-600" },
    { label: "Critical (0.85+)", pct: 5, count: 66, color: "#DC2626", class: "text-status-danger" }
  ];

  // SVG calculations for a circle with radius 36 (circumference = 2 * pi * 36 = ~226.2)
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  
  let accumulatedPercent = 0;

  return (
    <div className="bg-bg-surface border border-border-dim p-5 rounded-sm select-none font-sans flex flex-col justify-between h-full min-h-[200px] shadow-2xs">
      <div className="space-y-1 pb-3 border-b border-border-dim/50">
        <span className="text-[9px] uppercase font-bold tracking-widest text-text-tertiary block">RISK DISTRIBUTION</span>
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Appointment Risk Score Distribution
        </h4>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {segments.map((seg, idx) => {
              const strokeLength = (seg.pct / 100) * circ;
              const strokeOffset = circ - (accumulatedPercent / 100) * circ;
              accumulatedPercent += seg.pct;
              
              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeDasharray={`${strokeLength} ${circ}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-1000"
                />
              );
            })}
          </svg>
          
          {/* Inner text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none font-mono">
            <span className="text-base font-bold text-text-primary">1,312</span>
            <span className="text-[9px] font-sans font-semibold text-text-tertiary uppercase tracking-wider mt-0.5">total</span>
          </div>
        </div>

        {/* Short legend */}
        <div className="flex-1 space-y-2.5 w-full">
          {segments.map((seg, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-text-secondary font-medium">{seg.label}</span>
              </div>
              <div className="font-mono text-right flex gap-3">
                <span className="text-text-primary font-semibold">{seg.pct}%</span>
                <span className="text-text-tertiary w-10">{seg.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
