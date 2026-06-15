import React from "react";

interface StatusBadgeProps {
  status: "safe" | "warning" | "danger" | "info" | "upcoming" | "completed" | "cancelled";
  label: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const stylesMap: Record<string, string> = {
    safe: "text-status-safe border-status-safe/20 bg-status-safe/5",
    completed: "text-status-safe border-status-safe/20 bg-status-safe/5",
    warning: "text-status-warning border-status-warning/20 bg-status-warning/5",
    upcoming: "text-status-warning border-status-warning/20 bg-status-warning/5",
    danger: "text-status-danger border-status-danger/20 bg-status-danger/5",
    cancelled: "text-status-danger border-status-danger/20 bg-status-danger/5",
    info: "text-status-info border-status-info/20 bg-status-info/5",
  };

  const style = stylesMap[status] || stylesMap.info;

  return (
    <span className={`text-[10px] font-mono tracking-wider border px-2 py-0.5 rounded-sm uppercase font-semibold ${style}`}>
      {label}
    </span>
  );
}
