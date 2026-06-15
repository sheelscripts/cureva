import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const utilizationAverages = [
  { day: "Monday", completed: 48, cancelled: 4, noShow: 3 },
  { day: "Tuesday", completed: 45, cancelled: 3, noShow: 2 },
  { day: "Wednesday", completed: 44, cancelled: 5, noShow: 4 },
  { day: "Thursday", completed: 42, cancelled: 3, noShow: 1 },
  { day: "Friday", completed: 38, cancelled: 7, noShow: 5 },
  { day: "Saturday", completed: 18, cancelled: 2, noShow: 1 },
  { day: "Sunday", completed: 15, cancelled: 1, noShow: 1 },
];

export default function UtilizationChart() {
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.completed + data.cancelled + data.noShow;
      const utilization = ((data.completed / total) * 100).toFixed(0);

      return (
        <div className="bg-[#17171F] border border-[#2C2C3C] p-3 rounded-sm font-mono text-[11px] text-[#F0F0F5] shadow-xl">
          <div className="text-[10px] text-[#818196] uppercase mb-1 font-sans font-bold border-b border-[#2C2C3C] pb-1">
            {data.day} (Avg Slots)
          </div>
          <div className="flex justify-between gap-6 py-0.5">
            <span className="text-[#8A8A9B]">Completed:</span>
            <span className="font-bold text-[#22C55E]">{data.completed}</span>
          </div>
          <div className="flex justify-between gap-6 py-0.5">
            <span className="text-[#8A8A9B]">Cancelled:</span>
            <span className="font-bold text-[#EF4444]">{data.cancelled}</span>
          </div>
          <div className="flex justify-between gap-6 py-0.5">
            <span className="text-[#8A8A9B]">No-shows:</span>
            <span className="font-bold text-[#E8D5B0]">{data.noShow}</span>
          </div>
          <div className="flex justify-between gap-6 pt-1.5 border-t border-[#2C2C3C] mt-1">
            <span className="text-[#8A8A9B] font-sans">Active Util Rate:</span>
            <span className="font-bold text-white">{utilization}%</span>
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
          Scheduler Density
        </span>
        <h4 className="text-sm font-sans font-bold text-[#F0F0F5] mt-1">
          Clinical Utilization Breakdown (Day of Week Avg)
        </h4>
      </div>

      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={utilizationAverages} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid stroke="rgba(31,31,43,0.5)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="day"
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
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(232, 213, 176, 0.03)" }} />
            
            {/* Completed */}
            <Bar dataKey="completed" stackId="a" fill="#22C55E" maxBarSize={16} radius={[0, 0, 0, 0]} />
            {/* Cancelled */}
            <Bar dataKey="cancelled" stackId="a" fill="#EF4444" maxBarSize={16} />
            {/* No-Shows */}
            <Bar dataKey="noShow" stackId="a" fill="#E8D5B0" maxBarSize={16} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 pt-2 border-t border-[#1F1F2B] flex items-center justify-between text-[11px] text-[#8A8A9B] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#22C55E] rounded-xs" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#EF4444] rounded-xs" />
          <span>Cancelled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: "#E8D5B0" }} />
          <span>No-show</span>
        </div>
      </div>
    </div>
  );
}
