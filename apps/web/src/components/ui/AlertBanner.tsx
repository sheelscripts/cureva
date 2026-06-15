import React, { useState } from "react";
import { AlertTriangle, AlertCircle, X, ChevronRight } from "lucide-react";

interface AlertBannerProps {
  onAction?: (actionType: string) => void;
}

export default function AlertBanner({ onAction }: AlertBannerProps) {
  const [alerts, setAlerts] = useState([
    {
      id: "no-show",
      type: "warning", // yellow
      message: "4 patients at critical no-show risk tomorrow.",
      actionText: "Review risk factors",
      actionId: "admin-slotsaver",
    },
    {
      id: "agent-failure",
      type: "danger", // red
      message: "Agent system latency elevated. Agent failure rate above threshold (2.1%).",
      actionText: "Investigate telemetry",
      actionId: "admin-agents",
    },
  ]);

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 select-none">
      {alerts.map((alert) => {
        const isDanger = alert.type === "danger";
        return (
          <div
            key={alert.id}
            className={`px-4 py-2.5 rounded-sm border flex items-center justify-between text-xs font-sans transition-all ${
              isDanger
                ? "bg-status-danger/5 border-status-danger/20 text-status-danger"
                : "bg-status-warning/5 border-status-warning/20 text-status-warning"
            }`}
          >
            <div className="flex items-center gap-2">
              {isDanger ? (
                <AlertCircle size={14} className="text-status-danger shrink-0" />
              ) : (
                <AlertTriangle size={14} className="text-status-warning shrink-0" />
              )}
              <span className="font-semibold tracking-wide">{alert.message}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onAction && onAction(alert.actionId)}
                className={`font-sans text-[11px] font-bold underline flex items-center gap-0.5 cursor-pointer opacity-90 hover:opacity-100 ${
                  isDanger ? "text-status-danger" : "text-status-warning"
                }`}
              >
                {alert.actionText} <ChevronRight size={12} />
              </button>
              <button
                onClick={() => removeAlert(alert.id)}
                className="opacity-60 hover:opacity-100 transition-opacity p-0.5"
              >
                <X size={13} className={isDanger ? "text-status-danger" : "text-status-warning"} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
