import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface RiskSegment {
  tier: string;
  count: number;
  pct: number;
}

interface RiskDistributionDonutProps {
  data?: RiskSegment[];
}

const defaultRiskData = [
  { tier: "Low (0.0–0.4)", count: 623, pct: 0.62 },
  { tier: "Medium (0.4–0.65)", count: 211, pct: 0.21 },
  { tier: "High (0.65–0.85)", count: 121, pct: 0.12 },
  { tier: "Critical (0.85+)", count: 52, pct: 0.05 },
];

export default function RiskDistributionDonut({ data = defaultRiskData }: RiskDistributionDonutProps) {
  
  // Custom colors matching system specifications:
  // Low: --text-tertiary (#52525F)
  // Medium: --chart-1 (#E8D5B0)
  // High: --status-warning (#EAB308)
  // Critical: --status-danger (#EF4444)
  // Custom colors matching system specifications:
  // Low: text-tertiary slate (#8A8A9B)
  // Medium: info blue (#1D4ED8)
  // High: warning gold-yellow (#CA8A04)
  // Critical: danger red (#DC2626)
  const COLORS = ["#8A8A9B", "#1D4ED8", "#CA8A04", "#DC2626"];

  const totalMonitored = data.reduce((acc, curr) => acc + curr.count, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-bg-surface border border-border-base p-2.5 rounded-sm font-mono text-[11px] text-text-primary shadow-md">
          <div className="text-[10px] text-text-secondary uppercase mb-1 font-sans font-bold">
            {item.tier.split(" ")[0]} Risk Tier
          </div>
          <div className="flex justify-between gap-4 py-0.5">
            <span className="text-text-tertiary">Patients:</span>
            <span className="font-bold text-text-primary">{item.count}</span>
          </div>
          <div className="flex justify-between gap-4 py-0.5">
            <span className="text-text-tertiary">Percentage:</span>
            <span className="font-bold text-text-primary">
              {(item.pct * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-bg-surface border border-border-dim p-5 rounded-sm select-none shadow-xs">
      <div className="mb-4">
        <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">
          Algorithmic Risk Pools
        </span>
        <h4 className="text-sm font-sans font-bold text-text-primary mt-1">
          No-Show Predictive Risk Tiers
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Continuous Donut Shape */}
        <div className="relative h-[160px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
               <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--color-bg-surface)" strokeWidth={1.5} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Centralized readout center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
            <span className="text-[10px] font-sans text-text-tertiary uppercase tracking-wider">
              Monitored
            </span>
            <span className="text-xl font-mono font-bold text-text-primary tracking-tight">
              {totalMonitored}
            </span>
            <span className="text-[9px] font-mono text-text-tertiary">Patients</span>
          </div>
        </div>

        {/* Dense Technical Legends */}
        <div className="space-y-2.5">
          {data.map((item, idx) => {
            const pctVal = Math.round(item.pct * 100);
            return (
              <div key={item.tier} className="flex items-center justify-between font-mono text-[11px] border-b border-border-dim pb-1.5 last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-text-secondary font-sans font-medium">{item.tier.split(" ")[0]}</span>
                </div>
                <div className="space-x-3 text-right">
                  <span className="text-text-tertiary">{item.count}</span>
                  <span className="font-bold text-text-primary" style={{ color: COLORS[idx] }}>
                    {pctVal}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
