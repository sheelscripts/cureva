import React from "react";

interface RevenueKPIStripProps {
  monthlyInr?: number;
  protectionRate?: number;
  utilizationRate?: number;
  revenueProtectedInr?: number;
}

export default function RevenueKPIStrip({
  monthlyInr = 1840000,
  protectionRate = 84,
  utilizationRate = 94,
  revenueProtectedInr = 420000,
}: RevenueKPIStripProps) {
  
  const formatCurrency = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)}L`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 select-none">
      <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
        <span className="block text-[10px] tracking-widest font-sans font-bold text-text-tertiary uppercase">
          Monthly Revenue
        </span>
        <div className="flex items-baseline gap-1 text-text-primary">
          <span className="text-3xl font-bold tracking-tight font-sans">
            {formatCurrency(monthlyInr)}
          </span>
          <span className="text-xs font-mono font-medium opacity-80">INR</span>
        </div>
        <span className="text-[10px] font-mono text-text-secondary block">
          Standard appointments completed
        </span>
      </div>

      <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
        <span className="block text-[10px] tracking-widest font-sans font-bold text-text-tertiary uppercase">
          Protection Rate
        </span>
        <div className="flex items-baseline gap-1 text-text-primary font-bold">
          <span className="text-3xl font-bold tracking-tight font-sans">
            {protectionRate}%
          </span>
          <span className="text-xs font-mono font-medium text-text-tertiary">KPI</span>
        </div>
        <span className="text-[10px] font-mono text-status-safe block font-semibold">
          +4.2% from previous week
        </span>
      </div>

      <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
        <span className="block text-[10px] tracking-widest font-sans font-bold text-text-tertiary uppercase">
          Clinic Utilization
        </span>
        <div className="flex items-baseline gap-1 text-text-primary">
          <span className="text-3xl font-bold tracking-tight font-sans">
            {utilizationRate}%
          </span>
          <span className="text-xs font-mono font-medium text-text-tertiary">Optimal</span>
        </div>
        <span className="text-[10px] font-mono text-text-secondary block">
          Target: 85% - 95% operating rate
        </span>
      </div>

      <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
        <span className="block text-[10px] tracking-widest font-sans font-bold text-text-tertiary uppercase">
          Revenue Protected
        </span>
        <div className="flex items-baseline gap-1 text-status-safe">
          <span className="text-3xl font-bold tracking-tight font-sans">
            {formatCurrency(revenueProtectedInr)}
          </span>
          <span className="text-xs font-mono font-medium opacity-90">INR</span>
        </div>
        <span className="text-[10px] font-mono text-text-secondary block">
          Saved 188 clinic slots via SlotSaver
        </span>
      </div>
    </div>
  );
}
