"use client";

import React from "react";
import { AlertCircle, UserCheck, Send, Loader2 } from "lucide-react";

interface TimelineEvent {
  time: string;
  title: string;
  description: string;
  type: "alert" | "info" | "success" | "wait";
}

interface SessionTimelineProps {
  events?: TimelineEvent[];
}

export default function SessionTimeline({ events }: SessionTimelineProps) {
  const defaultEvents: TimelineEvent[] = [
    { time: "3:10 PM", title: "Cancellation received (trigger)", description: "Patient Vikram Nair checked out due to scheduling conflicts.", type: "alert" },
    { time: "3:10 PM", title: "Risk scorer ranked waitlist", description: "Priority matching evaluated: Priya Mehta (0.89), Neha Agarwal (0.82), Amit Verma (0.41).", type: "info" },
    { time: "3:12 PM", title: "Messages sent to 3 patients", description: "Swarms dispatched: Priya Mehta (WhatsApp), Neha Agarwal (WhatsApp), Amit Verma (SMS).", type: "success" },
    { time: "3:12 PM", title: "Delivery confirmed (Priya, Neha)", description: "Double-tick read indicator confirmed on WhatsApp gateway.", type: "info" },
    { time: "3:13 PM", title: "Delivery confirmed (Amit)", description: "Single-tick delivery confirmation received from carrier.", type: "info" },
    { time: "NOW", title: "Awaiting responses...", description: "Listening for inbound webhook cascades on priority waitlist channels.", type: "wait" }
  ];

  const currentEvents = events || defaultEvents;

  return (
    <div className="bg-bg-surface border border-border-dim p-5 rounded-sm select-none font-sans space-y-4 shadow-2xs h-full flex flex-col justify-between">
      <div className="shrink-0">
        <div className="space-y-1 pb-3 border-b border-border-dim/50">
          <span className="text-[9px] uppercase font-bold tracking-widest text-text-tertiary block">LOG HISTORY</span>
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Sequential Recovery Session Logs
          </h4>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 min-h-0">
        <div className="relative border-l border-border-dim pl-4 ml-2 space-y-5 py-2 text-xs">
          {currentEvents.map((evt, idx) => {
            const getDot = () => {
              if (evt.type === "alert") return <div className="absolute -left-[20.5px] top-1.5 h-2 w-2 rounded-full bg-status-danger" />;
              if (evt.type === "success") return <div className="absolute -left-[20.5px] top-1.5 h-2 w-2 rounded-full bg-status-safe" />;
              if (evt.type === "wait") return (
                <>
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-status-safe animate-ping" />
                  <div className="absolute -left-[20.5px] top-1.5 h-2 w-2 rounded-full bg-status-safe" />
                </>
              );
              return <div className="absolute -left-[20.5px] top-1.5 h-2 w-2 rounded-full bg-status-warning" />;
            };

            return (
              <div key={idx} className="relative">
                {getDot()}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-sans">
                  <span className={`font-semibold ${evt.type === "wait" ? "text-status-safe" : "text-text-primary"}`}>
                    {evt.title}
                  </span>
                  <span className="font-mono text-[10px] text-text-tertiary mt-0.5 sm:mt-0">{evt.time}</span>
                </div>
                <p className="text-[10.5px] text-text-secondary mt-1 font-sans leading-relaxed">
                  {evt.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
