import React from "react";
import { MessageSquare, PhoneCall, Smartphone } from "lucide-react";

interface ChannelData {
  channel: string;
  outreachCount: number;
  confirmations: number;
  rate: number;
}

interface ChannelEffectivenessBarProps {
  data?: ChannelData[];
}

const defaultChannels = [
  { channel: "Voice Call", outreachCount: 89, confirmations: 60, rate: 0.67 },
  { channel: "WhatsApp", outreachCount: 234, confirmations: 98, rate: 0.42 },
  { channel: "SMS", outreachCount: 312, confirmations: 56, rate: 0.18 },
];

export default function ChannelEffectivenessBar({ data = defaultChannels }: ChannelEffectivenessBarProps) {
  
  const getProgressColor = (rate: number) => {
    if (rate >= 0.60) return "bg-status-safe"; // Green
    if (rate >= 0.30) return "bg-status-warning"; // Yellow/Gold
    return "bg-status-danger"; // Red
  };

  const getProgressBorder = (rate: number) => {
    if (rate >= 0.60) return "rgba(22, 163, 74, 0.20)";
    if (rate >= 0.30) return "rgba(202, 138, 4, 0.20)";
    return "rgba(220, 38, 38, 0.20)";
  };

  const getProgressBg = (rate: number) => {
    if (rate >= 0.60) return "rgba(22, 163, 74, 0.04)";
    if (rate >= 0.30) return "rgba(202, 138, 4, 0.04)";
    return "rgba(220, 38, 38, 0.04)";
  };

  const getIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "voice call":
        return <PhoneCall size={13} className="text-status-info" />;
      case "whatsapp":
        return <MessageSquare size={13} className="text-status-safe" />;
      default:
        return <Smartphone size={13} className="text-status-warning" />;
    }
  };

  return (
    <div className="w-full bg-bg-surface border border-border-dim p-5 rounded-sm select-none shadow-xs">
      <div className="mb-4">
        <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">
          Outreach Channels
        </span>
        <h4 className="text-sm font-sans font-bold text-text-primary mt-1">
          SlotSaver Dispatch Effectiveness
        </h4>
      </div>

      <div className="space-y-4">
        {data.map((item) => {
          const ratePct = Math.round(item.rate * 100);
          const colorClass = getProgressColor(item.rate);
          const borderStyle = getProgressBorder(item.rate);
          const bgStyle = getProgressBg(item.rate);

          // Text representation matching specification format: Voice Call: 67% ████████████████░░░░░░░
          const activeBarsCount = Math.round(item.rate * 20);
          const inactiveBarsCount = 20 - activeBarsCount;
          const barCharacters = "█".repeat(activeBarsCount) + "░".repeat(inactiveBarsCount);

          return (
            <div 
              key={item.channel} 
              className="p-3 rounded-sm border transition-all hover:shadow-xs"
              style={{
                borderColor: borderStyle,
                backgroundColor: bgStyle
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {getIcon(item.channel)}
                  <span className="text-xs font-bold text-text-primary">{item.channel}</span>
                </div>
                <div className="flex items-baseline gap-1 font-mono text-[11px]">
                  <span className="text-text-secondary">Outbound:</span>
                  <span className="text-text-primary font-bold">{item.outreachCount}</span>
                  <span className="text-text-tertiary mx-0.5">|</span>
                  <span className="text-text-secondary">Converts:</span>
                  <span className="text-status-safe font-bold">{item.confirmations}</span>
                </div>
              </div>

              {/* Custom High Contrast Text Progress Meter */}
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-[10px] text-text-tertiary tracking-wider select-none hidden sm:block">
                  {barCharacters}
                </span>

                <div className="flex-1 bg-bg-subtle h-1.5 rounded-full overflow-hidden border border-border-dim/40">
                  <div 
                    className={`h-full rounded-full ${colorClass}`}
                    style={{ width: `${ratePct}%` }}
                  />
                </div>

                <div className="text-right min-w-[42px]">
                  <span className="font-mono font-bold text-xs" style={{ color: item.rate >= 0.60 ? "var(--color-status-safe)" : item.rate >= 0.30 ? "var(--color-status-warning)" : "var(--color-status-danger)" }}>
                    {ratePct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-text-secondary font-sans mt-4 leading-relaxed">
        Threshold criteria: <span className="text-status-safe font-mono font-bold">🟢 &gt;60% Optimum</span>, <span className="text-status-warning font-mono font-bold">🟡 30-60% Moderate</span>, <span className="text-status-danger font-mono font-bold">🔴 &lt;30% Inefficient</span>. Voice synthesis calls display highest active slot salvage rates.
      </p>
    </div>
  );
}
