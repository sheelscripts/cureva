"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface MetricHistoryItem {
  date: string;
  cancellations: number;
  recovered: number;
  escalated: number;
  lost: number;
  revenueInr: number;
  avgFillTimeSeconds: number;
  interventionsSent: number;
  interventionsConverted: number;
}

interface RecoveryTrendChartProps {
  data: MetricHistoryItem[];
}

export default function RecoveryTrendChart({ data }: RecoveryTrendChartProps) {
  // Format dates to short month/day format (e.g. Jun 15)
  const chartData = data.map((item) => {
    const parts = item.date.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const formattedDate = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
    
    return {
      ...item,
      formattedDate,
      sessionsAttempted: item.cancellations, // Cancellations trigger the recovery sessions
    };
  });

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  return (
    <div className="w-full bg-bg-surface border border-border-dim p-5 rounded-sm select-none font-sans shadow-2xs">
      <div className="mb-4">
        <span className="text-[9px] uppercase font-bold tracking-widest text-text-tertiary block">RECOVERY TREND</span>
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Daily Revenue Protected & Sessions Attempted (30 Days)
        </h4>
      </div>

      <div className="h-[200px] w-full font-mono text-[10px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8D5B0" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#E8D5B0" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--color-border-dim)" strokeDasharray="3 3" vertical={false} />

            <XAxis 
              dataKey="formattedDate" 
              stroke="var(--color-border-base)" 
              tickLine={false} 
              axisLine={false} 
              dy={10}
              tick={{ fill: "var(--color-text-secondary)" }}
            />

            {/* Left Y Axis for revenue */}
            <YAxis 
              yAxisId="left"
              stroke="var(--color-border-base)"
              tickLine={false} 
              axisLine={false} 
              dx={-5}
              tickFormatter={formatCurrency}
              tick={{ fill: "var(--color-text-secondary)" }}
            />

            {/* Right Y Axis for sessions count */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="var(--color-border-base)"
              tickLine={false} 
              axisLine={false} 
              dx={5}
              tick={{ fill: "var(--color-text-secondary)" }}
            />

            <Tooltip 
              contentStyle={{ 
                backgroundColor: "var(--color-bg-surface)", 
                borderColor: "var(--color-border-base)", 
                borderRadius: "2px", 
                fontFamily: "Inter, sans-serif" 
              }}
              labelClassName="font-bold text-text-primary text-xs font-sans"
              itemStyle={{ color: "var(--color-text-secondary)", fontSize: "11px" }}
              formatter={(value: any, name: any, props: any) => {
                if (name === "Revenue") return [`₹${value.toLocaleString("en-IN")}`, "Revenue Protected"];
                if (name === "Sessions") return [value, "Sessions Attempted"];
                return [value, name];
              }}
            />

            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="revenueInr" 
              name="Revenue"
              stroke="#E8D5B0" 
              strokeWidth={2}
              fill="url(#revenueFill)" 
            />

            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="sessionsAttempted" 
              name="Sessions"
              stroke="var(--color-accent)" 
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "#EAB308" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
