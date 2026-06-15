import React from "react";
import { motion } from "motion/react";

interface KPICardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

export default function KPICard({ label, value, subtext, trend, isLoading }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-5 bg-bg-surface border border-border-dim rounded-sm relative overflow-hidden group hover:border-border-base transition-colors duration-200"
    >
      <div className="flex flex-col space-y-1">
        <span className="text-[11px] font-sans font-semibold tracking-[0.1em] text-text-secondary uppercase">
          {label}
        </span>
        {isLoading ? (
          <div className="h-10 w-32 rounded-sm shimmer mt-2 mb-1" />
        ) : (
          <div className="text-3xl font-mono font-bold text-accent tracking-tight flex items-baseline gap-2 mt-1">
            {value}
            {trend && (
              <span
                className={`text-xs font-mono font-medium flex items-center ${
                  trend.isPositive ? "text-status-safe" : "text-status-danger"
                }`}
              >
                {trend.isPositive ? "▲" : "▼"} {trend.value}
              </span>
            )}
          </div>
        )}
        {subtext && (
          <span className="text-xs font-sans text-text-tertiary mt-1 block group-hover:text-text-secondary transition-colors duration-200">
            {subtext}
          </span>
        )}
      </div>

      {/* Decorative accent highlight on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left opacity-30" />
    </motion.div>
  );
}
