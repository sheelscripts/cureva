"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Terminal, Cpu, Database, HeartHandshake, ShieldCheck, RefreshCw, Layers } from "lucide-react";

interface AgentStatus {
  name: string;
  role: string;
  status: "active" | "recovering" | "processing" | "checking" | "idle";
  statusText: string;
  latency: string;
  groundingDetail: string;
}

export default function AgentOperationsBar() {
  const [tickerOffset, setTickerOffset] = useState(0);
  const [agents, setAgents] = useState<AgentStatus[]>([
    { name: "Predictor Agent", role: "LangGraph Forest", status: "active", statusText: "No-Show Forecaster Active", latency: "142ms", groundingDetail: "MCP-Clinic-Data" },
    { name: "Recovery Agent", role: "SlotSaver AutoRx", status: "recovering", statusText: "Recovering Slot #1042 (Priya Mehta)", latency: "280ms", groundingDetail: "WhatsApp Gateway" },
    { name: "Scribe Agent", role: "Speech-to-SOAP Engine", status: "processing", statusText: "Processing Doctor Audio Context", latency: "640ms", groundingDetail: "Grounded in EMR" },
    { name: "Interaction Safeguard", role: "Safety Co-Pilot", status: "checking", statusText: "Validating Contraindications", latency: "85ms", groundingDetail: "RxNorm / PubMed RAG" }
  ]);

  const [recentLogs, setRecentLogs] = useState([
    { time: "10:29:12", icon: ShieldCheck, msg: "Checked contraindications for Priya Mehta: Atorvastatin & Amlodipine - SAFE", type: "success" },
    { time: "10:25:40", icon: RefreshCw, msg: "Recovered slot #1042: Assigned to Priya Mehta (₹1,500 protected)", type: "protect" },
    { time: "10:23:05", icon: HeartHandshake, msg: "No-show risk prediction triggered: Rajesh Joshi flagged at 84% probability", type: "prediction" },
    { time: "10:18:12", icon: Database, msg: "MCP Server grounded query: Retrieval from Cardiology corpus successful", type: "rag" }
  ]);

  // Simulate subtle real-time updates and shifting latencies for demo/recruiter value
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => {
        // Randomize latency slightly
        const currentLatVal = parseInt(agent.latency);
        const newLat = Math.max(50, Math.min(900, currentLatVal + Math.floor(Math.random() * 41) - 20));
        return {
          ...agent,
          latency: `${newLat}ms`
        };
      }));

      // Occasionally add a new log to simulate live agent activity
      if (Math.random() > 0.7) {
        const timestamp = new Date().toTimeString().split(' ')[0];
        const randomActions = [
          { msg: "RAG vector match found for chronic chest congestion", icon: Database, type: "rag" },
          { msg: "Active audio segment compressed and sent to Whisper API", icon: Cpu, type: "audio" },
          { msg: "Interaction check: Checked Metformin against blood test logs", icon: ShieldCheck, type: "success" },
          { msg: "SlotSaver auto-engagement sent: SMS reservation pinged", icon: RefreshCw, type: "protect" }
        ];
        const selected = randomActions[Math.floor(Math.random() * randomActions.length)];
        setRecentLogs(prev => [
          { time: timestamp, icon: selected.icon, msg: selected.msg, type: "info" },
          ...prev.slice(0, 4)
        ]);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-status-safe/10 text-status-safe border-status-safe/25";
      case "recovering": return "bg-status-warning/15 text-status-warning border-status-warning/30 animate-pulse";
      case "processing": return "bg-status-info/10 text-status-info border-status-info/20 animate-pulse";
      case "checking": return "bg-status-info/15 text-status-info border-accent/20";
      default: return "bg-bg-subtle text-text-secondary border-border-dim";
    }
  };

  return (
    <div className="bg-bg-surface border border-border-dim rounded-sm p-4 shadow-xs select-none space-y-4">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-dim/40">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-sm bg-accent/5 text-accent">
            <Sparkles size={14} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-sans font-bold text-text-tertiary tracking-widest block">
              Autonomous Systems
            </span>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-sans">
              Agent Operations Orchestrator Layers (LangGraph Running)
            </h3>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] font-mono text-text-secondary bg-bg-base border border-border-dim px-2.5 py-1 rounded-xs">
          <Cpu size={12} className="text-status-safe animate-pulse-dot" />
          <span>MCP Server: Connected</span>
          <span className="text-border-base">|</span>
          <Database size={11} className="text-text-tertiary" />
          <span>Grounding: 4,128 tokens MTD</span>
        </div>
      </div>

      {/* Grid containing agents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {agents.map((agent, index) => {
          return (
            <div 
              key={index}
              className="bg-bg-base/40 border border-border-dim hover:border-border-base rounded-sm p-3 transition-all text-xs flex flex-col justify-between space-y-2.5 min-h-[92px] sm:h-auto"
            >
              <div className="flex items-start justify-between min-w-0">
                <div className="min-w-0">
                  <span className="text-[8px] font-mono uppercase bg-bg-subtle text-text-secondary px-1 py-0.5 rounded-xs tracking-wider">
                    {agent.role}
                  </span>
                  <div className="font-semibold text-text-primary font-sans mt-1 truncate">
                    {agent.name}
                  </div>
                </div>
                <span className="font-mono text-[9px] text-text-tertiary font-medium">
                  {agent.latency}
                </span>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border truncate uppercase font-bold tracking-wider ${getStatusColor(agent.status)}`}>
                  {agent.statusText}
                </span>
                <span className="text-[8px] font-mono text-text-tertiary truncate">
                  RAG: {agent.groundingDetail}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Live Activity Feed - Styled elegantly as an advanced console ticker */}
      <div className="bg-text-primary text-bg-surface p-2.5 rounded-sm border border-border-dim font-mono text-[10.5px] relative overflow-hidden">
        <div className="absolute top-0 right-0 h-full bg-linear-to-l from-text-primary/95 to-transparent w-16 pointer-events-none" />
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-status-safe font-bold animate-pulse text-[10px] shrink-0">✓ AI RECENT ACTIONS FEED:</span>
          <div className="flex-1 overflow-hidden h-[18px] relative">
            <div className="space-y-1">
              {recentLogs.slice(0, 1).map((log, lidx) => (
                <div key={lidx} className="flex items-center gap-2 truncate animate-[fadeIn_0.3s_ease-out]">
                  <span className="text-text-tertiary text-[9px] text-white/50">[{log.time}]</span>
                  <span className="text-white/80 leading-none truncate">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
          <span className="text-[8px] uppercase tracking-wide px-1.5 py-0.5 bg-white/10 rounded-sm text-status-safe font-semibold scale-90 shrink-0">Grounded via RAG</span>
        </div>
      </div>
    </div>
  );
}
