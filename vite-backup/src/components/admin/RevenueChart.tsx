import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface DailyRevenueData {
  date: string;
  revenueInr: number;
  appointmentsCompleted: number;
  utilizationRate: number;
}

interface RevenueChartProps {
  data: DailyRevenueData[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  
  const formatYAxis = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}k`;
    }
    return `₹${value}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-[#17171F] border border-[#2C2C3C] p-3 rounded-sm font-mono text-[11px] text-[#F0F0F5] shadow-xl">
          <div className="text-[10px] text-[#818196] uppercase mb-1 font-sans font-bold border-b border-[#2C2C3C] pb-1">
            {dataPoint.date}
          </div>
          <div className="flex justify-between gap-6 py-0.5">
            <span className="text-[#8A8A9B]">Daily Revenue:</span>
            <span className="font-bold text-[#E8D5B0]">₹{dataPoint.revenueInr.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between gap-6 py-0.5">
            <span className="text-[#8A8A9B]">Appointments:</span>
            <span className="font-bold">{dataPoint.appointmentsCompleted} Completed</span>
          </div>
          <div className="flex justify-between gap-6 py-0.5">
            <span className="text-[#8A8A9B]">Utilization Rate:</span>
            <span className="font-bold" style={{ color: dataPoint.utilizationRate >= 0.82 ? "#22C55E" : "#EAB308" }}>
              {(dataPoint.utilizationRate * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full bg-[#0F0F15] border border-[#1F1F2B] p-4 rounded-sm flex flex-col justify-between">
      <div className="mb-4">
        <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-[#8A8A9B] block">
          Clinical Capital Trend
        </span>
        <h4 className="text-sm font-sans font-bold text-[#F0F0F5] mt-1">
          Daily Revenue Trend (Last 30 Days)
        </h4>
      </div>

      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E8D5B0" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#E8D5B0" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(31,31,43,0.5)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="rgba(44,44,60,0.5)"
              tick={{ fill: "#8A8A9B", fontSize: 9, fontFamily: "IBM Plex Mono" }}
              axisLine={{ stroke: "rgba(31,31,43,0.5)" }}
              tickLine={false}
              dy={8}
            />
            <YAxis
              stroke="rgba(44,44,60,0.5)"
              tick={{ fill: "#8A8A9B", fontSize: 9, fontFamily: "IBM Plex Mono" }}
              axisLine={false}
              tickLine={false}
              dx={-8}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(232, 213, 176, 0.2)", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="revenueInr"
              stroke="#E8D5B0"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              dot={{ r: 2, stroke: "#E8D5B0", strokeWidth: 1, fill: "#08080C" }}
              activeDot={{ r: 4, stroke: "#08080C", strokeWidth: 1.5, fill: "#E8D5B0" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
