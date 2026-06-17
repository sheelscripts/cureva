"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  tomorrowRiskScores as initialRiskScores, 
  activeSessions as initialActiveSessions, 
  completedSessions as initialCompletedSessions, 
  openEscalations as initialEscalations, 
  interventionLog as initialInterventionLog,
  metricsHistory as initialMetricsHistory
} from "@/mock/slotsaver";

export type SlotSaverNotificationInput =
  | { type: "slot_recovered"; slot: string; doctor: string; fillTimeMin: number; revenueInr: number }
  | { type: "recovery_started"; slot: string; doctor: string; sessionId: string }
  | { type: "escalation_needed"; slot: string; doctor: string; sessionId: string }
  | { type: "slot_lost"; slot: string; doctor: string; valueInr: number }
  | { type: "risk_flagged"; count: number; tomorrow: boolean }
export type SlotSaverNotification = SlotSaverNotificationInput & {
  id: string;
  read: boolean;
  timestamp: string;
};

interface SlotSaverContextType {
  revenue: number;
  activeSessions: typeof initialActiveSessions;
  completedSessions: typeof initialCompletedSessions;
  escalations: typeof initialEscalations;
  interventionLog: typeof initialInterventionLog;
  riskScores: typeof initialRiskScores;
  notifications: SlotSaverNotification[];
  resolvedToday: any[];
  addNotification: (notification: SlotSaverNotificationInput) => void;
  markAllNotificationsRead: () => void;
  escalateSession: (sessionId: string) => void;
  extendSessionTimer: (sessionId: string) => void;
  resolveEscalation: (escalationId: string) => void;
  releaseSlot: (escalationId: string) => void;
  overrideBookManually: (sessionId: string, patientName: string) => void;
  approveTomorrowOutreach: () => void;
  tomorrowOutreachApproved: boolean;
  metricsHistory: typeof initialMetricsHistory;
}

const SlotSaverContext = createContext<SlotSaverContextType | undefined>(undefined);

export function SlotSaverProvider({ children }: { children: React.ReactNode }) {
  const [revenue, setRevenue] = useState(420000);
  const [activeSessions, setActiveSessions] = useState(initialActiveSessions);
  const [completedSessions, setCompletedSessions] = useState(initialCompletedSessions);
  const [escalations, setEscalations] = useState(initialEscalations);
  const [interventionLog, setInterventionLog] = useState(initialInterventionLog);
  const [riskScores, setRiskScores] = useState(initialRiskScores);
  const [notifications, setNotifications] = useState<SlotSaverNotification[]>([]);
  const [resolvedToday, setResolvedToday] = useState<any[]>([]);
  const [tomorrowOutreachApproved, setTomorrowOutreachApproved] = useState(false);

  const activeSessionsRef = useRef(activeSessions);
  useEffect(() => {
    activeSessionsRef.current = activeSessions;
  }, [activeSessions]);

  const escalationsRef = useRef(escalations);
  useEffect(() => {
    escalationsRef.current = escalations;
  }, [escalations]);

  // Load telemetry metrics from database API on mount
  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetch("/api/slotsaver");
        if (res.ok) {
          const data = await res.json();
          if (data.tomorrowRiskScores && data.tomorrowRiskScores.length > 0) {
            setRiskScores(data.tomorrowRiskScores);
          }
          if (data.activeSessions && data.activeSessions.length > 0) {
            setActiveSessions(data.activeSessions);
          }
          if (data.completedSessions && data.completedSessions.length > 0) {
            setCompletedSessions(data.completedSessions);
          }
          if (data.openEscalations && data.openEscalations.length > 0) {
            setEscalations(data.openEscalations);
          }
          if (data.interventionLog && data.interventionLog.length > 0) {
            setInterventionLog(data.interventionLog);
          }
          // Compute dynamic total revenue saved
          const totalRev = data.completedSessions
            .filter((s: any) => s.outcome === "recovered")
            .reduce((acc: number, curr: any) => acc + curr.valueInr, 420000);
          setRevenue(totalRev);
        }
      } catch (e) {
        console.warn("Failed to fetch Slotsaver DB metrics:", e);
      }
    }
    loadMetrics();
  }, []);


  const simulationTickRef = useRef(0);
  const demoTriggeredRef = useRef(false);

  const addNotification = (notif: SlotSaverNotificationInput) => {
    const newNotif = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    } as SlotSaverNotification;
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Real-time timer counts UP for active sessions and handles the 10s demo flow
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Increment elapsed time of active sessions
      setActiveSessions(prev => 
        prev.map(session => {
          if (session.status === "active") {
            const nextSecs = session.elapsedSeconds + 1;
            
            // Auto escalate if elapsed threshold reached
            if (nextSecs >= session.escalationThresholdSeconds) {
              // Trigger automatic escalation
              setTimeout(() => escalateSession(session.sessionId), 0);
              return { ...session, elapsedSeconds: nextSecs, status: "escalated" };
            }
            return { ...session, elapsedSeconds: nextSecs };
          }
          return session;
        })
      );

      // 2. Demo flow countdown: Priya Mehta confirms after 10 seconds of mounting
      simulationTickRef.current += 1;
      if (simulationTickRef.current >= 10 && !demoTriggeredRef.current) {
        const session = activeSessionsRef.current.find(s => s.sessionId === "sess_8821");
        if (session && session.status === "active") {
          demoTriggeredRef.current = true;
          // Priya confirms!
          // Increment revenue ticker: 420,000 -> 421,500
          setRevenue(r => r + 1500);

          // Move active session to completed list
          const completedItem = {
            sessionId: "sess_8821",
            slotTime: "4:00 PM",
            doctorName: "Dr. Sharma",
            specialty: "Cardiology",
            valueInr: 1500,
            outcome: "recovered",
            patientsContacted: 3,
            filledBy: "Priya Mehta",
            fillTimeSeconds: 120, // 2 minutes (120s)
            startedAt: "3:12 PM",
            closedAt: "3:14 PM",
          };
          setCompletedSessions(oldCompleted => {
            if (oldCompleted.some(c => c.sessionId === "sess_8821")) return oldCompleted;
            return [completedItem, ...oldCompleted];
          });

          // Add new WhatsApp response in logs
          setInterventionLog(oldLogs => {
            if (oldLogs.some(log => log.id === "INT-902")) return oldLogs;
            return [
              {
                id: "INT-902",
                patientName: "Priya Mehta",
                appointmentId: "A-8821",
                appointmentTime: "Today 4:00 PM",
                riskScore: 0.89,
                channel: "whatsapp",
                scheduledAt: "Today 3:12 PM",
                status: "confirmed",
                response: "YES",
                respondedAt: "Today 3:14 PM",
                message: "Hi Priya, an earlier appointment has become available with Dr. Sharma today at 4 PM. Reply YES to confirm.",
              },
              ...oldLogs
            ];
          });

          // Dispatch notification
          addNotification({
            type: "slot_recovered",
            slot: "4:00 PM Cardiology",
            doctor: "Dr. Sharma",
            fillTimeMin: 2,
            revenueInr: 1500,
          });

          // Filter out the active session
          setActiveSessions(prev => prev.filter(s => s.sessionId !== "sess_8821"));
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simulates real-time ML risk scoring refresh every 30 seconds
  useEffect(() => {
    const riskInterval = setInterval(() => {
      setRiskScores(prev => 
        prev.map(p => {
          // Slight fluctuation in risk score: +/- 0.02, clamped between 0.1 and 0.98
          const delta = (Math.random() - 0.5) * 0.04;
          const newScore = Math.max(0.1, Math.min(0.98, p.riskScore + delta));
          
          // Determine new tier
          let newTier = "low";
          if (newScore >= 0.85) newTier = "critical";
          else if (newScore >= 0.65) newTier = "high";
          else if (newScore >= 0.4) newTier = "medium";

          return {
            ...p,
            riskScore: parseFloat(newScore.toFixed(2)),
            tier: newTier,
          };
        })
      );
    }, 30000);

    return () => clearInterval(riskInterval);
  }, []);

  // Actions
  const escalateSession = (sessionId: string) => {
    const session = activeSessionsRef.current.find(s => s.sessionId === sessionId);
    if (session) {
      // Create escalation item
      const newEsc: typeof initialEscalations[0] = {
        id: `ESC-${Math.floor(Math.random() * 900 + 100)}`,
        sessionId: session.sessionId,
        slotTime: session.slotTime,
        doctorName: session.doctorName,
        specialty: session.specialty,
        valueInr: session.valueInr,
        patientsContacted: session.waitlist.length,
        responsesReceived: 0,
        escalationReason: "manual_escalation",
        escalatedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        recommendation: `Call ${session.waitlist[0]?.patientName || "waitlist"} manually`,
        topPatient: {
          name: session.waitlist[0]?.patientName || "Priya Mehta",
          phone: "+91 98765 XXXXX",
          waitDays: session.waitlist[0]?.waitDays || 21,
        },
        handoffPayload: {
          session_id: session.sessionId,
          slot: { time: session.slotTime, doctor: session.doctorName, specialty: session.specialty, value_inr: session.valueInr },
          waitlist_contacted: session.waitlist.length,
          responses_received: 0,
          elapsed_minutes: Math.floor(session.elapsedSeconds / 60),
          escalation_reason: "manual_escalation",
          recommended_action: `Call ${session.waitlist[0]?.patientName || "Priya Mehta"} (+91 98765 XXXXX) — waited ${session.waitlist[0]?.waitDays || 21} days`,
        },
        status: "open",
      };

      setEscalations(old => [newEsc, ...old]);

      // Dispatch alert notification
      addNotification({
        type: "escalation_needed",
        slot: `${session.slotTime} ${session.specialty}`,
        doctor: session.doctorName,
        sessionId: session.sessionId,
      });

      // Filter out of active list (it is now escalated and handled on the right panel)
      setActiveSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    }
  };

  const extendSessionTimer = (sessionId: string) => {
    setActiveSessions(prev => 
      prev.map(s => {
        if (s.sessionId === sessionId) {
          // Extend threshold by 5 minutes (300 seconds)
          return {
            ...s,
            escalationThresholdSeconds: s.escalationThresholdSeconds + 300,
          };
        }
        return s;
      })
    );
    showToast("Escalation countdown extended by 5 minutes");
  };

  const resolveEscalation = (escalationId: string) => {
    const esc = escalationsRef.current.find(e => e.id === escalationId);
    if (esc) {
      // Increment revenue ticker (since receptionist manually resolved it by filling the slot)
      setRevenue(r => r + esc.valueInr);

      // Move to resolved list
      setResolvedToday(old => [
        {
          id: esc.id,
          slotTime: esc.slotTime,
          doctorName: esc.doctorName,
          specialty: esc.specialty,
          valueInr: esc.valueInr,
          patientName: esc.topPatient.name,
          resolvedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        },
        ...old
      ]);

      // Add to completed list
      const completedItem = {
        sessionId: esc.sessionId,
        slotTime: esc.slotTime,
        doctorName: esc.doctorName,
        specialty: esc.specialty,
        valueInr: esc.valueInr,
        outcome: "recovered",
        patientsContacted: esc.patientsContacted,
        filledBy: esc.topPatient.name,
        fillTimeSeconds: 900, // resolved at escalation threshold
        startedAt: esc.escalatedAt,
        closedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      setCompletedSessions(oldCompleted => [completedItem, ...oldCompleted]);

      // Trigger notification
      addNotification({
        type: "slot_recovered",
        slot: `${esc.slotTime} ${esc.specialty}`,
        doctor: esc.doctorName,
        fillTimeMin: 15,
        revenueInr: esc.valueInr,
      });

      setEscalations(prev => prev.filter(e => e.id !== escalationId));
    }
  };

  const releaseSlot = (escalationId: string) => {
    const esc = escalationsRef.current.find(e => e.id === escalationId);
    if (esc) {
      // Mark as lost
      const completedItem = {
        sessionId: esc.sessionId,
        slotTime: esc.slotTime,
        doctorName: esc.doctorName,
        specialty: esc.specialty,
        valueInr: esc.valueInr,
        outcome: "lost" as const,
        patientsContacted: esc.patientsContacted,
        fillTimeSeconds: null,
        escalationReason: "all_declined" as const,
        startedAt: esc.escalatedAt,
        closedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      setCompletedSessions(oldCompleted => [completedItem, ...oldCompleted]);

      // Trigger lost slot notification
      addNotification({
        type: "slot_lost",
        slot: `${esc.slotTime} ${esc.specialty}`,
        doctor: esc.doctorName,
        valueInr: esc.valueInr,
      });

      setEscalations(prev => prev.filter(e => e.id !== escalationId));
    }
  };

  const overrideBookManually = (sessionId: string, patientName: string) => {
    const session = activeSessionsRef.current.find(s => s.sessionId === sessionId);
    if (session) {
      setRevenue(r => r + session.valueInr);

      const completedItem = {
        sessionId: session.sessionId,
        slotTime: session.slotTime,
        doctorName: session.doctorName,
        specialty: session.specialty,
        valueInr: session.valueInr,
        outcome: "recovered" as const,
        patientsContacted: session.waitlist.length,
        filledBy: patientName,
        fillTimeSeconds: Math.floor(session.elapsedSeconds),
        startedAt: session.startedAt,
        closedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      setCompletedSessions(oldCompleted => [completedItem, ...oldCompleted]);

      addNotification({
        type: "slot_recovered",
        slot: `${session.slotTime} ${session.specialty}`,
        doctor: session.doctorName,
        fillTimeMin: Math.max(1, Math.floor(session.elapsedSeconds / 60)),
        revenueInr: session.valueInr,
      });

      setActiveSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    }
  };

  const approveTomorrowOutreach = () => {
    setTomorrowOutreachApproved(true);
    addNotification({
      type: "risk_flagged",
      count: 4,
      tomorrow: true,
    });
  };

  const showToast = (message: string) => {
    console.log("SlotSaver Toast:", message);
  };

  return (
    <SlotSaverContext.Provider
      value={{
        revenue,
        activeSessions,
        completedSessions,
        escalations,
        interventionLog,
        riskScores,
        notifications,
        resolvedToday,
        tomorrowOutreachApproved,
        metricsHistory: initialMetricsHistory,
        addNotification,
        markAllNotificationsRead,
        escalateSession,
        extendSessionTimer,
        resolveEscalation,
        releaseSlot,
        overrideBookManually,
        approveTomorrowOutreach,
      }}
    >
      {children}
    </SlotSaverContext.Provider>
  );
}

export function useSlotSaver() {
  const context = useContext(SlotSaverContext);
  if (context === undefined) {
    throw new Error("useSlotSaver must be used within a SlotSaverProvider");
  }
  return context;
}
