import React, { useState, useEffect } from "react";
import { TrendingUp, ArrowUpRight, DollarSign } from "lucide-react";

interface RevenueTickerProps {
  targetValue?: number;
  todayDelta?: number;
}

export default function RevenueTicker({
  targetValue = 420000,
  todayDelta = 14000,
}: RevenueTickerProps) {
  const [currentValue, setCurrentValue] = useState(targetValue - 15000);

  // Smooth numeric counter animation on mount
  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1200; // ms
    const startValue = targetValue - 22000;

    const animateValue = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing out quadratic
      const easeProgress = progress * (2 - progress);
      const nextVal = Math.round(startValue + (targetValue - startValue) * easeProgress);
      
      setCurrentValue(nextVal);
      if (progress < 1) {
        requestAnimationFrame(animateValue);
      }
    };

    requestAnimationFrame(animateValue);
  }, [targetValue]);

  return (
    <div className="w-full bg-[#0F0F15] border border-[#2C2C3C] p-6 rounded-sm select-none relative overflow-hidden group hover:border-[#E8D5B0]/30 transition-all duration-300">
      {/* Absolute Tech Grid Accents */}
      <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-[#E8D5B0]/5 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 border-t-2 border-l-2 border-[#E8D5B0] w-2 h-2" />
      <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-[#E8D5B0] w-2 h-2" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-1.5 flex-1">
          <span className="text-[10px] uppercase font-sans font-bold tracking-[0.2em] text-[#8A8A9B] block">
            SlotSaver Revenue Salvaged (MTD)
          </span>
          <div className="flex items-baseline gap-2">
            <span 
              className="text-4xl md:text-5xl font-mono tracking-tight font-bold text-[#E8D5B0]"
              style={{ textShadow: "0 0 20px rgba(232, 213, 176, 0.15)" }}
            >
              ₹{currentValue.toLocaleString("en-IN")}
            </span>
            <span className="text-sm font-mono text-[#52525F] font-semibold">INR RECOVERED</span>
          </div>
          <p className="text-xs text-[#8A8A9B] font-sans">
            Recovered from <span className="font-mono text-[#F0F0F5] font-semibold">94 automated outreach sessions</span> with average conversion of 84% in high or critical no-show brackets.
          </p>
        </div>

        <div className="bg-[#17171F] border border-[#2C2C3C] px-5 py-4 rounded-sm shrink-0 flex flex-col items-end justify-center min-w-[200px] hover:border-[#22C55E]/30 transition-all">
          <div className="flex items-center gap-1.5 text-[#22C55E]">
            <span className="text-xs uppercase font-sans font-bold tracking-wider">Today's Protection</span>
            <ArrowUpRight size={14} className="animate-bounce" />
          </div>
          <span className="text-2xl font-mono font-bold text-[#22C55E] mt-1">
            +₹{todayDelta.toLocaleString("en-IN")}
          </span>
          <span className="text-[9.5px] font-mono text-[#8A8A9B] uppercase tracking-wide mt-1 block">
            Saved 8 cancel/risk blocks today
          </span>
        </div>
      </div>
    </div>
  );
}
