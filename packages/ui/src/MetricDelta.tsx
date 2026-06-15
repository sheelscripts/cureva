import React from "react";

interface MetricDeltaProps {
  value: string;
  isPositive: boolean;
}

export default function MetricDelta({ value, isPositive }: MetricDeltaProps) {
  return (
    <span
      className={`text-[11px] font-mono font-semibold flex items-center gap-0.5 ${
        isPositive ? "text-status-safe" : "text-status-danger"
      }`}
    >
      {isPositive ? "▲" : "▼"} {value}
    </span>
  );
}
