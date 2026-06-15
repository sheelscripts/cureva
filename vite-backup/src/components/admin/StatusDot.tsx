import React from "react";

interface StatusDotProps {
  status: "safe" | "warning" | "danger" | "info";
  animate?: boolean;
}

export default function StatusDot({ status, animate = true }: StatusDotProps) {
  const colorMap = {
    safe: "bg-[#22C55E]",
    warning: "bg-[#EAB308]",
    danger: "bg-[#EF4444]",
    info: "bg-[#3B82F6]",
  };

  const pingColorMap = {
    safe: "bg-[#22C55E]",
    warning: "bg-[#EAB308]",
    danger: "bg-[#EF4444]",
    info: "bg-[#3B82F6]",
  };

  return (
    <span className="relative flex h-2 w-2 selection:bg-transparent">
      {animate && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColorMap[status]} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colorMap[status]}`} />
    </span>
  );
}
