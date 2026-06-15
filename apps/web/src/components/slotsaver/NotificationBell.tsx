"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSlotSaver } from "@/features/slotsaver/SlotSaverContext";
import { Bell, Check, Trash2, Calendar, ShieldAlert, HeartHandshake, CheckCircle2, MessageSquare, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function NotificationBell() {
  const { notifications, markAllNotificationsRead } = useSlotSaver();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "slot_recovered":
        return <CheckCircle2 size={13} className="text-status-safe" />;
      case "escalation_needed":
        return <AlertTriangle size={13} className="text-status-warning" />;
      case "slot_lost":
        return <ShieldAlert size={13} className="text-status-danger" />;
      case "risk_flagged":
        return <AlertTriangle size={13} className="text-status-warning" />;
      default:
        return <MessageSquare size={13} className="text-status-info" />;
    }
  };

  const getNotificationTitleText = (notif: any) => {
    if (notif.type === "slot_recovered") return `Slot recovered: ${notif.slot}`;
    if (notif.type === "escalation_needed") return `Escalation needed: ${notif.slot}`;
    if (notif.type === "slot_lost") return `Slot lost: ${notif.slot}`;
    if (notif.type === "risk_flagged") return `${notif.count} high-risk slots flagged`;
    return "Telemetry Log Dispatched";
  };

  return (
    <div className="relative font-sans select-none" ref={dropdownRef}>
      {/* Bell Trigger Icon */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-sm bg-bg-surface border border-border-dim hover:bg-bg-subtle hover:border-border-base text-text-secondary hover:text-text-primary transition-all cursor-pointer"
        title="Notifications"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-danger opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-danger"></span>
          </span>
        )}
      </button>

      {/* Bell Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-bg-surface border border-border-base rounded-sm shadow-xl z-55 overflow-hidden flex flex-col justify-between"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border-base bg-bg-subtle/50 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-text-secondary">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAllNotificationsRead()}
                  className="text-[10px] font-sans font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Check size={10} />
                  <span>Mark read</span>
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[300px] overflow-y-auto divide-y divide-border-dim">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-tertiary leading-normal">
                  No notifications logged in today's active session.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-3.5 flex gap-2.5 items-start hover:bg-bg-subtle/30 transition-colors ${!notif.read ? "bg-accent/[0.02]" : ""}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0 font-sans text-xs">
                      <div className="flex justify-between items-start gap-1">
                        <span className={`font-medium truncate ${!notif.read ? "text-text-primary font-semibold" : "text-text-secondary"}`}>
                          {getNotificationTitleText(notif)}
                        </span>
                        <span className="font-mono text-[9px] text-text-tertiary shrink-0 mt-0.5">{notif.timestamp}</span>
                      </div>
                      <p className="text-[10.5px] text-text-secondary mt-0.5 leading-normal truncate">
                        {notif.type === "slot_recovered" ? `Waitlist slot filled for ${notif.doctor || "doctor"}. ₹${notif.revenueInr?.toLocaleString("en-IN") || "1,500"} protected.` :
                         notif.type === "escalation_needed" ? "Autonomous cascade failed. Human desk call required." :
                         notif.type === "slot_lost" ? `Slot expired. ₹${notif.valueInr?.toLocaleString("en-IN") || "1,200"} unrecovered.` :
                         notif.type === "risk_flagged" ? "Outreach dispatched. Review suggested." : "Telemetry logs recorded."}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* View all footer */}
            <div className="px-4 py-2 bg-bg-subtle/50 border-t border-border-base text-center">
              <span className="text-[9.5px] font-sans font-bold text-text-tertiary uppercase tracking-wider block">
                CUREVA AUTOMATIC REVENUE DESK
              </span>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
