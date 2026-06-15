"use client";

import React, { useEffect, useState } from "react";
import { useSlotSaver, SlotSaverNotification } from "@/features/slotsaver/SlotSaverContext";
import { CheckCircle, AlertTriangle, XCircle, Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface ToastItem {
  id: string;
  notification: SlotSaverNotification;
  visible: boolean;
}

export default function NotificationToast() {
  const { notifications } = useSlotSaver();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const router = useRouter();

  // Listen to incoming notifications and render toasts
  useEffect(() => {
    if (notifications.length === 0) return;
    
    const latest = notifications[0];
    // Check if this notification is already represented in toasts
    if (toasts.some(t => t.id === latest.id)) return;

    // Add new toast to the stack
    const newToast: ToastItem = {
      id: latest.id,
      notification: latest,
      visible: true
    };

    setToasts(prev => [newToast, ...prev].slice(0, 3)); // Keep max 3 visible

    // Schedule auto-dismiss if applicable
    let dismissTime = 0;
    if (latest.type === "slot_recovered") dismissTime = 6000;
    else if (latest.type === "slot_lost") dismissTime = 8000;

    if (dismissTime > 0) {
      setTimeout(() => {
        dismissToast(latest.id);
      }, dismissTime);
    }
  }, [notifications]);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
    // Wait for fade-out animation before filtering out
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

  const handleAction = (toast: ToastItem) => {
    dismissToast(toast.id);
    router.push("/admin?view=admin-slotsaver");
  };

  return (
    <div className="fixed bottom-4 right-4 z-55 w-full max-w-[360px] flex flex-col gap-2 pointer-events-none font-sans select-none">
      {toasts.map((toast) => {
        if (!toast.visible) return null;

        const notif = toast.notification;

        const getToastStyles = () => {
          switch (notif.type) {
            case "slot_recovered":
              const slotText = 'slot' in notif ? notif.slot : "4:00 PM";
              const fillText = 'fillTimeMin' in notif ? `${notif.fillTimeMin}m 00s` : "2m 00s";
              const revText = 'revenueInr' in notif ? `₹${notif.revenueInr.toLocaleString("en-IN")}` : "₹1,500";
              const docName = 'doctor' in notif ? notif.doctor : "";
              return {
                borderClass: "border-l-[3px] border-l-status-safe",
                icon: <CheckCircle className="text-status-safe shrink-0" size={16} />,
                title: `Slot recovered &middot; ${slotText}`,
                body: `Waitlist slot filled${docName ? ` for ${docName}` : ""}. Filled in ${fillText}. ${revText} protected.`,
                actionText: "View Session"
              };
            case "escalation_needed":
              const escSlot = 'slot' in notif ? notif.slot : "9:00 AM";
              const escDoc = 'doctor' in notif ? notif.doctor : "";
              return {
                borderClass: "border-l-[3px] border-l-status-warning",
                icon: <AlertTriangle className="text-status-warning shrink-0" size={16} />,
                title: `Escalation needed &middot; ${escSlot}`,
                body: `Autonomous recovery threshold reached${escDoc ? ` for ${escDoc}` : ""}. Receptionist attention required.`,
                actionText: "Handle Now"
              };
            case "slot_lost":
              const lostSlot = 'slot' in notif ? notif.slot : "8:30 AM";
              const lostVal = 'valueInr' in notif ? `₹${notif.valueInr.toLocaleString("en-IN")}` : "₹1,200";
              const lostDoc = 'doctor' in notif ? notif.doctor : "";
              return {
                borderClass: "border-l-[3px] border-l-status-danger",
                icon: <XCircle className="text-status-danger shrink-0" size={16} />,
                title: `Slot lost &middot; ${lostSlot}`,
                body: `${lostVal} unrecovered${lostDoc ? ` for ${lostDoc}` : ""}. All outreach options declined.`,
                actionText: "View Details"
              };
            case "risk_flagged":
              const flagCount = 'count' in notif ? notif.count : 4;
              const flagTime = 'tomorrow' in notif && notif.tomorrow ? "tomorrow" : "today";
              return {
                borderClass: "border-l-[3px] border-l-status-warning",
                icon: <Bell className="text-status-warning shrink-0" size={16} />,
                title: `${flagCount} high-risk appointments ${flagTime}`,
                body: "Auto-interventions scheduled. Review suggested.",
                actionText: "Review List"
              };
            default:
              return {
                borderClass: "border-l-[3px] border-l-status-info",
                icon: <Bell className="text-status-info shrink-0" size={16} />,
                title: "System Notification",
                body: "Outreach telemetry updated.",
                actionText: "Dismiss"
              };
          }
        };

        const config = getToastStyles();

        return (
          <div 
            key={toast.id}
            className={`pointer-events-auto bg-bg-surface/95 backdrop-blur-md border border-border-dim p-4 rounded-sm shadow-xl flex gap-3 items-start justify-between transition-all duration-300 translate-y-0 opacity-100 ${config.borderClass} animate-[slide-in-right_0.3s_ease-out]`}
          >
            <style jsx>{`
              @keyframes slide-in-right {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}</style>
            
            {/* Icon */}
            {config.icon}

            {/* Content info */}
            <div className="flex-1 min-w-0">
              <h5 
                className="text-xs font-semibold text-text-primary leading-tight"
                dangerouslySetInnerHTML={{ __html: config.title }}
              />
              <p className="text-[11px] text-text-secondary mt-1 leading-normal">
                {config.body}
              </p>
              
              {/* Text Action trigger link */}
              <div className="mt-2.5 flex items-center gap-3">
                <button 
                  onClick={() => handleAction(toast)}
                  className="text-[10px] font-bold text-accent hover:underline cursor-pointer"
                >
                  {config.actionText}
                </button>
                <button 
                  onClick={() => dismissToast(toast.id)}
                  className="text-[10px] font-bold text-text-tertiary hover:text-text-secondary cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Dismiss cross */}
            <button 
              onClick={() => dismissToast(toast.id)}
              className="text-text-tertiary hover:text-text-secondary p-0.5 cursor-pointer shrink-0 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
