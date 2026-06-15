"use client";

import React from "react";

interface ChannelPerformance {
  channel: string;
  rate: number;
  barWidth: string;
}

export default function ChannelEffectivenessChart() {
  const data: ChannelPerformance[] = [
    { channel: "Voice Call", rate: 67, barWidth: "67%" },
    { channel: "WhatsApp", rate: 42, barWidth: "42%" },
    { channel: "SMS", rate: 18, barWidth: "18%" }
  ];

  const getBarColorClass = (rate: number) => {
    if (rate > 60) return "bg-status-safe";
    if (rate >= 30) return "bg-accent";
    return "bg-text-secondary";
  };

  return (
    <div className="bg-bg-surface border border-border-dim p-5 rounded-sm select-none font-sans flex flex-col justify-between h-full min-h-[200px] text-text-primary">
      <div className="space-y-1 pb-3 border-b border-border-dim/50">
        <span className="text-[9px] uppercase font-bold tracking-widest text-text-tertiary block">CHANNEL PERFORMANCE</span>
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Outreach Channel Conversion Rates
        </h4>
      </div>

      <div className="space-y-5 py-4">
        {data.map((item) => (
          <div key={item.channel} className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-text-primary font-sans font-semibold">{item.channel}</span>
              <span className={`font-bold ${item.rate > 60 ? "text-status-safe" : item.rate >= 30 ? "text-accent" : "text-text-secondary"}`}>
                {item.rate}% success
              </span>
            </div>
            
            <div className="w-full bg-bg-base h-3 rounded-full border border-border-dim overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${getBarColorClass(item.rate)}`}
                style={{ width: item.barWidth }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-border-dim/40 text-[10.5px] font-mono text-text-secondary flex items-center gap-1.5 leading-relaxed">
        <span className="h-1.5 w-1.5 rounded-full bg-status-safe shrink-0" />
        <span>Voice call is 3.7x more effective than SMS notifications.</span>
      </div>
    </div>
  );
}
