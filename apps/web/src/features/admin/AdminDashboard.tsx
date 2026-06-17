"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  Calendar, 
  ChevronDown, 
  Download, 
  Users, 
  Activity, 
  TrendingUp, 
  Settings, 
  FileCode, 
  Shield, 
  HeartHandshake, 
  ArrowUpRight,
  Sparkles,
  Award,
  DollarSign,
  AlertTriangle,
  Info,
  CheckCircle2
} from "lucide-react";

import AlertBanner from "@/components/ui/AlertBanner";
import RevenueKPIStrip from "@/features/slotsaver/components/RevenueKPIStrip";
import RevenueChart from "@/features/analytics/components/RevenueChart";
import UtilizationChart from "@/features/analytics/components/UtilizationChart";
import ChannelEffectivenessBar from "@/features/analytics/components/ChannelEffectivenessBar";
import AppointmentFunnel from "@/features/analytics/components/AppointmentFunnel";
import DoctorLeaderboard from "@/features/analytics/components/DoctorLeaderboard";
import AgentHealthTable from "@/features/agents/components/AgentHealthTable";
import MCPToolTable from "@/features/agents/components/MCPToolTable";
import PromptRegistryTable from "@/features/agents/components/PromptRegistryTable";
import { StatusDot } from "@cureva/ui";
import AgentOperationsBar from "./AgentOperationsBar";
import RevenueRecoveryPipeline from "@/features/slotsaver/components/RevenueRecoveryPipeline";

// Live SlotSaver Components
import { useSlotSaver } from "@/features/slotsaver/SlotSaverContext";
import RevenueTicker from "@/components/slotsaver/RevenueTicker";
import RecoveryTrendChart from "@/components/slotsaver/RecoveryTrendChart";
import ChannelEffectivenessChart from "@/components/slotsaver/ChannelEffectivenessChart";
import RiskDistributionDonut from "@/components/slotsaver/RiskDistributionDonut";
import InterventionTimeline from "@/components/slotsaver/InterventionTimeline";
import InterventionLogTable from "@/components/slotsaver/InterventionLogTable";
import EscalationTable from "@/components/slotsaver/EscalationTable";
import RecoverySessionCard from "@/components/slotsaver/RecoverySessionCard";
import RecoverySessionDrawer from "@/components/slotsaver/RecoverySessionDrawer";
import EscalationCard from "@/components/slotsaver/EscalationCard";
import SessionTimeline from "@/components/slotsaver/SessionTimeline";

import {
  revenueMetrics as initialRevenueMetrics,
  slotSaverMetrics as initialSlotSaverMetrics,
  doctorMetrics as initialDoctorMetrics,
  agentMetrics as initialAgentMetrics
} from "@/mock/admin";
import {
  getRevenueMetrics,
  getSlotSaverMetricsAdmin,
  getDoctorMetrics,
  getAgentMetrics
} from "@cureva/sdk";

interface AdminDashboardProps {
  currentSubView?: string;
  onNavigateToView?: (view: string) => void;
}

export default function AdminDashboard({
  currentSubView = "admin-overview",
  onNavigateToView = () => {}
}: AdminDashboardProps) {

  // Date and filter selections
  const [dateRange, setDateRange] = useState<"today" | "week" | "month">("month");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Live admin data — initial state from mock (no-flicker), refreshed from API on mount.
  const [revenueMetrics, setRevenueMetrics] = useState(initialRevenueMetrics);
  const [slotSaverMetrics, setSlotSaverMetrics] = useState(initialSlotSaverMetrics);
  const [doctorMetrics, setDoctorMetrics] = useState(initialDoctorMetrics);
  const [agentMetrics, setAgentMetrics] = useState(initialAgentMetrics);

  useEffect(() => {
    // Silent fetch — SDK falls back to mock on failure.
    Promise.allSettled([
      getRevenueMetrics().then(setRevenueMetrics),
      getSlotSaverMetricsAdmin().then(setSlotSaverMetrics),
      getDoctorMetrics().then(setDoctorMetrics),
      getAgentMetrics().then(setAgentMetrics),
    ]).catch(() => {});
  }, []);

  // Live SlotSaver state
  const { 
    revenue, 
    activeSessions, 
    completedSessions, 
    escalations, 
    resolvedToday, 
    interventionLog, 
    metricsHistory, 
    riskScores,
    tomorrowOutreachApproved,
    approveTomorrowOutreach,
    escalateSession, 
    extendSessionTimer, 
    resolveEscalation, 
    releaseSlot, 
    overrideBookManually 
  } = useSlotSaver();
  const [activeFunnelStage, setActiveFunnelStage] = useState("all");
  const [activeSlotSaverTab, setActiveSlotSaverTab] = useState<"console" | "analytics">("console");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dynamic today's yield calculations based on initial revenue baseline
  const deltaRevenue = revenue - 420000;
  const todaysSavings = 14000 + deltaRevenue;
  const autoRecoveredCount = 8 + Math.floor(deltaRevenue / 1500);
  const todaysRecoveredCount = autoRecoveredCount + resolvedToday.length;

  // Function to simulate clinical CSV output downloads
  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert("Clinic ledger sheets exported successfully. Generated CUREVA-LEDGER-2026.csv with compliance hash certificates!");
    }, 1000);
  };

  // Render Page Content dependent on active subview
  const renderPageContent = () => {
    switch (currentSubView) {
      // PAGE 1: ADMIN OVERVIEW (HOME)
      case "admin-overview":
        return (
          <div className="space-y-6">
            
            {/* Live autonomous AI Agent action monitor */}
            <AgentOperationsBar />

            {/* Strategic Revenue Recovery Pipeline Funnel */}
            <RevenueRecoveryPipeline />
            
            {/* Primary KPI Metrics Strip */}
            <RevenueKPIStrip 
              monthlyInr={revenueMetrics.thisMonth.totalInr}
              protectionRate={Math.round(slotSaverMetrics.month.protectionRate * 100)}
              utilizationRate={Math.round(revenueMetrics.thisMonth.utilizationRate * 100)}
              revenueProtectedInr={revenueMetrics.thisMonth.revenueProtectedInr}
            />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[310px]">
                <RevenueChart data={revenueMetrics.daily30Days} />
              </div>
              <div className="h-[310px]">
                <UtilizationChart />
              </div>
            </div>

          {/* Secondary 3-col — stacks on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              
              {/* Left Column: Doctor Mini Leaderboard */}
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm flex flex-col justify-between shadow-xs select-none">
                <div className="space-y-1">
                  <span className="text-[9.5px] uppercase font-sans font-bold text-text-tertiary tracking-wider block">
                    Capacity Leaders
                  </span>
                  <h4 className="text-xs font-bold text-text-primary font-sans pb-2 border-b border-border-dim">
                    Top Clinicians (By Utilization)
                  </h4>
                  
                  <div className="space-y-3 pt-3">
                    {doctorMetrics.slice(0, 4).map((doc, idx) => (
                      <div key={doc.doctorId} className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-text-tertiary w-4 mt-0.5 font-bold">#{idx+1}</span>
                          <span className="text-text-primary font-sans font-bold">{doc.name.replace("Dr. ", "")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-text-secondary text-[10.5px]">{doc.appointmentsThisMonth} Appts</span>
                          <span className="text-status-safe font-bold">{(doc.utilizationRate * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => onNavigateToView("admin-doctors")}
                  className="w-full text-center mt-5 py-2 hover:bg-bg-subtle/50 text-xs font-sans font-bold text-text-primary border border-border-dim rounded-sm cursor-pointer transition-colors shadow-xs"
                >
                  View All Clinicians →
                </button>
              </div>

              {/* Center Column: SlotSaver Summary */}
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm flex flex-col justify-between shadow-xs select-none">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-text-primary">
                    <HeartHandshake size={14} className="text-text-secondary" />
                    <span className="text-[9.5px] uppercase font-sans font-bold tracking-wider text-text-tertiary">Revenue Protection</span>
                  </div>
                  
                  <h4 className="text-xl font-mono font-bold text-text-primary pt-1">
                    ₹{(revenueMetrics.thisMonth.revenueProtectedInr / 100000).toFixed(1)}L Saved
                  </h4>
                  
                  <p className="text-xs text-text-secondary leading-relaxed font-sans pt-1">
                    SlotSaver auto-interventions maintained an <span className="text-status-safe font-mono font-semibold">84% recovery rate</span> this calendar month, preventing substantial clinic slot decay.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono">
                    <div className="bg-bg-subtle p-2 rounded-sm border border-border-dim">
                      <span className="text-text-tertiary font-sans text-[9px] block font-bold uppercase">No-shows Prevented</span>
                      <span className="text-text-primary font-bold">188 Patients</span>
                    </div>
                    <div className="bg-bg-subtle p-2 rounded-sm border border-border-dim">
                      <span className="text-text-tertiary font-sans text-[9px] block font-bold uppercase">Average Fill Time</span>
                      <span className="text-text-primary font-bold">6m 40s</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onNavigateToView("admin-slotsaver")}
                  className="w-full text-center mt-4 py-2 hover:bg-bg-subtle/50 text-xs font-sans font-bold text-text-primary border border-border-dim rounded-sm cursor-pointer transition-colors shadow-xs"
                >
                  View Protection Analytics →
                </button>
              </div>

              {/* Right Column: Agent Health Summary */}
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm flex flex-col justify-between shadow-xs select-none">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-status-info">
                      <Settings size={14} />
                      <span className="text-[9.5px] uppercase font-sans font-bold tracking-wider text-text-tertiary">Autonomous Agents</span>
                    </div>
                    <StatusDot status="safe" />
                  </div>

                  <h4 className="text-xl font-mono font-bold text-text-primary pt-0.5">
                    98.1% Success Rate
                  </h4>

                  <p className="text-xs text-text-secondary leading-relaxed font-sans mt-1">
                    System operations processed <span className="font-mono text-text-primary font-semibold">847 agent runs</span> today with stabilized average latencies of <span className="font-mono text-text-primary">1.24 seconds</span>.
                  </p>

                  <div className="divide-y divide-border-dim font-mono text-[10.5px] pt-1.5 text-text-secondary">
                    <div className="flex justify-between py-1.5">
                      <span>MCP Call Health:</span>
                      <span className="text-status-safe font-bold">99.7% Stable</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span>Failed Tools:</span>
                      <span className="text-status-danger font-bold">4 Requests</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onNavigateToView("admin-agents")}
                  className="w-full text-center mt-4 py-2 hover:bg-bg-subtle/50 text-xs font-sans font-bold text-text-primary border border-border-dim rounded-sm cursor-pointer transition-colors shadow-xs"
                >
                  Open Systems Monitor →
                </button>
              </div>

            </div>

          </div>
        );

      // PAGE 2: REVENUE ANALYTICS READOUTS
      case "admin-revenue":
        return (
          <div className="space-y-6">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 select-none">
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">Total Contributions</span>
                <span className="text-2xl font-mono font-bold text-text-primary">₹18,40,000</span>
                <span className="text-[9px] text-status-safe block font-mono font-semibold">Gross contribution (MTD)</span>
              </div>
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">SlotSaver Secured</span>
                <span className="text-2xl font-mono font-bold text-status-safe">₹4,20,000</span>
                <span className="text-[9px] text-status-safe block font-mono font-semibold">22.8% of clinic capital</span>
              </div>
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">No-Show Loss</span>
                <span className="text-2xl font-mono font-bold text-status-danger">₹76,000</span>
                <span className="text-[9px] text-status-danger block font-mono font-semibold">Leakage decay threshold</span>
              </div>
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">Clinician Load</span>
                <span className="text-2xl font-mono font-bold text-text-primary">94% Capacity</span>
                <span className="text-[9px] text-text-secondary block font-mono font-semibold">Target: 88%-96%</span>
              </div>
            </div>

            {/* Chart 1: Daily Area Trend */}
            <div className="h-[280px]">
              <RevenueChart data={revenueMetrics.daily30Days} />
            </div>

            {/* Split Charts: Specialty break and Weekday breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Specialty Contribution Bar Graph */}
              <div className="bg-bg-surface border border-border-dim p-5 rounded-sm shadow-xs select-none">
                <div className="mb-4">
                  <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">
                    Capital Distribution
                  </span>
                  <h4 className="text-sm font-sans font-bold text-text-primary mt-1">
                    Net Cash Contribution by Specialty Segment
                  </h4>
                </div>

                <div className="space-y-3 font-mono text-[11px]">
                  {[
                    { specialty: "Cardiology", value: 520000, pct: 28 },
                    { specialty: "General Medicine", value: 380000, pct: 21 },
                    { specialty: "Orthopedics", value: 310000, pct: 17 },
                    { specialty: "Dermatology", value: 240000, pct: 13 },
                    { specialty: "Neurology", value: 196000, pct: 11 },
                    { specialty: "Urology & Others", value: 194000, pct: 10 }
                  ].map((spec) => (
                    <div key={spec.specialty} className="space-y-1 border-b border-border-dim pb-2 last:border-b-0">
                      <div className="flex justify-between font-sans">
                        <span className="font-bold text-text-primary">{spec.specialty}</span>
                        <div className="font-mono text-xs">
                          <span className="text-text-secondary">₹{(spec.value / 1000).toFixed(0)}k | </span>
                          <span className="text-text-primary font-bold">{spec.pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-bg-subtle h-1.5 rounded-full overflow-hidden">
                        <div className="bg-accent h-full" style={{ width: `${spec.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Day of Week averages */}
              <div className="h-full min-h-[300px]">
                <UtilizationChart />
              </div>
            </div>

            {/* Appointment funnel step breakdown */}
            <AppointmentFunnel />

            {/* Doctor Breakdown tables */}
            <div className="bg-bg-surface border border-border-dim rounded-sm shadow-xs select-none overflow-hidden">
              <div className="p-4 border-b border-border-dim flex items-center justify-between">
                <h4 className="text-xs font-bold text-text-primary font-sans">Clinician Capital Ledger</h4>
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="px-3 py-1 bg-bg-subtle hover:bg-bg-subtle/80 border border-border-dim rounded-sm text-xs text-text-primary flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download size={12} />
                  <span>{isExporting ? "Compiling..." : "Export CSV"}</span>
                </button>
              </div>

              <div className="overflow-x-auto text-xs font-mono">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-dim text-text-secondary uppercase text-[9px] font-bold bg-bg-subtle/40">
                      <th className="py-2.5 px-4 font-sans">Doctor</th>
                      <th className="py-2.5 px-4 text-right">Appts</th>
                      <th className="py-2.5 px-4 text-right">Averaged Ticket Value</th>
                      <th className="py-2.5 px-4 text-right">No show percentage</th>
                      <th className="py-2.5 px-4 text-right">Gross revenue contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dim text-text-primary">
                    {doctorMetrics.slice(0, 5).map((doc) => (
                      <tr key={doc.doctorId} className="hover:bg-bg-subtle/20 transition-colors">
                        <td className="py-2 px-4 font-sans font-semibold">{doc.name}</td>
                        <td className="py-2 px-4 text-right">{doc.appointmentsThisMonth}</td>
                        <td className="py-2 px-4 text-right">₹{(doc.revenueInr / doc.appointmentsThisMonth).toFixed(0)}</td>
                        <td className="py-2 px-4 text-right text-status-danger font-semibold">{Math.round(doc.noShowRate * 100)}%</td>
                        <td className="py-2 px-4 text-right text-text-primary font-bold">₹{doc.revenueInr.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );

      // PAGE 3: SLOTSAVER ADVANCED PROTECTION
      case "admin-slotsaver":
        return (
          <div className="space-y-6">
            
            {/* SlotSaver Subviews Tabs Switcher */}
            <div className="flex items-center justify-between border-b border-border-dim pb-4">
              <div className="flex items-center bg-bg-subtle rounded-sm border border-border-dim p-0.5 font-medium select-none">
                <button
                  onClick={() => setActiveSlotSaverTab("console")}
                  className={`px-3.5 py-1.5 uppercase text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
                    activeSlotSaverTab === "console"
                      ? "bg-bg-surface text-text-primary shadow-xs font-bold border border-border-dim/40"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Live Recovery Console
                </button>
                <button
                  onClick={() => setActiveSlotSaverTab("analytics")}
                  className={`px-3.5 py-1.5 uppercase text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
                    activeSlotSaverTab === "analytics"
                      ? "bg-bg-surface text-text-primary shadow-xs font-bold border border-border-dim/40"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Performance Analytics
                </button>
              </div>
              
              <div className="hidden sm:block text-[9.5px] text-text-tertiary uppercase font-mono tracking-wider font-semibold select-none">
                Autonomous Revenue Protection
              </div>
            </div>

            {activeSlotSaverTab === "console" ? (
              /* ====================================================
                 LIVE RECOVERY CONSOLE SUB-TAB (Two-Row Grid Layout)
                 ==================================================== */
              <div className="space-y-6 font-sans">
                
                {/* Row 1: Active Operations Console */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Column 1: Active Recovery Swarms */}
                  <div className="flex flex-col space-y-4 h-full">
                    <div className="flex items-center justify-between border-b border-border-dim pb-2.5 select-none shrink-0">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-status-safe animate-pulse shrink-0" />
                        Active Recovery Swarms ({activeSessions.length})
                      </h3>
                    </div>

                    <div className="flex-1 flex flex-col">
                      {activeSessions.length === 0 ? (
                        <div className="bg-bg-surface border border-border-dim rounded-sm p-6 text-center select-none shadow-2xs flex-1 flex flex-col justify-center items-center">
                          <CheckCircle2 className="text-status-safe mb-2 shrink-0" size={20} />
                          <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Swarms Standby</h4>
                          <p className="text-[10.5px] text-text-secondary mt-1 max-w-[200px]">All slots secured. No active cancellations currently.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 flex-1">
                          {activeSessions.map((session) => (
                            <RecoverySessionCard
                              key={session.sessionId}
                              session={session}
                              variant="compact"
                              onEscalate={escalateSession}
                              onExtendTimer={extendSessionTimer}
                              onViewDetail={(id) => {
                                setSelectedSessionId(id);
                                setDrawerOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Manual Handoff Queue */}
                  <div className="flex flex-col space-y-4 h-full">
                    <div className="flex items-center justify-between border-b border-border-dim pb-2.5 select-none shrink-0">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-status-warning shrink-0" />
                        Manual Handoff Queue ({escalations.filter(e => e.status === "open").length})
                      </h3>
                    </div>

                    <div className="flex-1 flex flex-col">
                      {escalations.filter(e => e.status === "open").length === 0 ? (
                        <div className="bg-bg-surface border border-border-dim rounded-sm p-6 text-center select-none shadow-2xs flex-1 flex flex-col justify-center items-center">
                          <CheckCircle2 className="text-status-safe mb-2 shrink-0" size={20} />
                          <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Queue Clear</h4>
                          <p className="text-[10.5px] text-text-secondary mt-1 max-w-[200px]">No pending manual outreach desk calls required.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 flex-1">
                          {escalations
                            .filter((e) => e.status === "open")
                            .map((esc) => (
                              <EscalationCard
                                key={esc.id}
                                escalation={esc}
                                onResolve={resolveEscalation}
                                onRelease={releaseSlot}
                                onViewDetail={(id) => {
                                  setSelectedSessionId(id);
                                  setDrawerOpen(true);
                                }}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 3: Yield, Resolved Ledger */}
                  <div className="flex flex-col space-y-4 h-full">
                    <div className="flex items-center justify-between border-b border-border-dim pb-2.5 select-none shrink-0">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-status-info shrink-0" />
                        Savings & Resolution Yield
                      </h3>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-4">
                      {/* Today's Yield Card */}
                      <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-2xs select-none space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <span className="text-[8.5px] uppercase font-bold tracking-widest text-text-tertiary block">TODAY'S SAVINGS</span>
                          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                            Revenue Protection Performance
                          </h4>
                        </div>
                        <div className="flex justify-between items-center bg-bg-base/40 border border-border-dim p-3 rounded-sm">
                          <div>
                            <span className="text-xl font-mono font-bold text-status-safe">+₹{todaysSavings.toLocaleString("en-IN")}</span>
                            <span className="text-[9px] font-sans text-text-tertiary block mt-0.5">Protected today</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-text-primary">{todaysRecoveredCount} recovered</span>
                            <span className="text-[9px] font-sans text-text-tertiary block mt-0.5">{autoRecoveredCount} auto &middot; {resolvedToday.length} man</span>
                          </div>
                        </div>
                      </div>

                      {/* Resolved Today Listing */}
                      <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-2xs space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <span className="text-[8.5px] uppercase font-bold tracking-widest text-text-tertiary block">RESOLVED LEDGER</span>
                          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                            Manual Resolves & Confirmations
                          </h4>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center min-h-[90px]">
                          {resolvedToday.length === 0 ? (
                            <div className="text-[10.5px] text-text-tertiary py-4 text-center">No cases resolved yet today.</div>
                          ) : (
                            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                              {resolvedToday.map((item) => (
                                <div key={item.id} className="bg-bg-base/40 border border-border-dim p-2.5 rounded-sm flex justify-between items-center text-[10.5px] font-mono animate-[fadeIn_0.3s_ease-out]">
                                  <div>
                                    <span className="font-bold text-text-primary">{item.slotTime} &middot; {item.specialty}</span>
                                    <p className="text-[9.5px] text-text-secondary font-sans mt-0.5">Filled by: {item.patientName}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-status-safe font-bold">+₹{item.valueInr.toLocaleString("en-IN")}</span>
                                    <p className="text-[8.5px] text-text-tertiary mt-0.5">{item.resolvedAt}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Row 2: Live Telemetry, Historical Flow & Risk Outlook */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Column 1: Predictive Risk Outlook */}
                  <div className="bg-bg-surface border border-border-dim p-5 rounded-sm shadow-2xs space-y-4 flex flex-col justify-between h-full min-h-[380px]">
                    <div className="space-y-1 pb-3 border-b border-border-dim/50 flex items-center justify-between shrink-0">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-text-tertiary block">PREDICTIVE RISK OUTLOOK</span>
                        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                          Tomorrow's Outreach Pipeline
                        </h4>
                      </div>
                      <span className="text-[10px] bg-status-warning/10 text-status-warning border border-status-warning/20 px-2 py-0.5 rounded-full font-mono font-bold">
                        {riskScores.filter(r => r.tier === "high" || r.tier === "critical").length} flagged
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 min-h-0">
                      {riskScores
                        .filter(r => r.tier === "high" || r.tier === "critical")
                        .slice(0, 4)
                        .map((patient) => (
                          <div key={patient.appointmentId} className="bg-bg-base/40 border border-border-dim p-2.5 rounded-sm flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-text-primary">{patient.patientName}</span>
                              <p className="text-[10px] text-text-secondary">{patient.time} &middot; {patient.doctorName} ({patient.specialty})</p>
                            </div>
                            <div className="text-right space-y-1">
                              <span className={`px-1.5 py-0.2 rounded-xs font-mono text-[10px] font-bold ${
                                patient.tier === "critical" ? "bg-status-danger/10 text-status-danger border border-status-danger/25" : "bg-status-warning/10 text-status-warning border border-status-warning/25"
                              }`}>
                                {(patient.riskScore * 100).toFixed(0)}% risk
                              </span>
                              <p className="text-[9px] text-text-tertiary uppercase font-mono">{patient.plannedIntervention.replace("_", " ")}</p>
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="shrink-0 pt-3 border-t border-border-dim/50">
                      {tomorrowOutreachApproved ? (
                        <div className="flex items-center justify-center gap-1.5 py-2 bg-status-safe/10 border border-status-safe/20 text-status-safe text-xs font-bold rounded-xs select-none">
                          <CheckCircle2 size={12} className="text-status-safe" />
                          <span>Outreach Dispatched (Scheduled 8-10 AM)</span>
                        </div>
                      ) : (
                        <button 
                          onClick={approveTomorrowOutreach}
                          className="w-full text-center py-2 bg-accent hover:opacity-90 text-bg-surface text-xs font-bold rounded-xs cursor-pointer transition-colors shadow-2xs"
                        >
                          Approve tomorrow's auto-outreach
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Live Telemetry Feed */}
                  <div className="bg-bg-surface border border-border-dim p-5 rounded-sm shadow-2xs space-y-4 flex flex-col justify-between h-full min-h-[380px]">
                    <div className="space-y-1 pb-3 border-b border-border-dim/50 flex items-center justify-between shrink-0">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-text-tertiary block">LIVE TELEMETRY FEED</span>
                        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                          Auto-Outreach Logs
                        </h4>
                      </div>
                      <span className="h-1.5 w-1.5 rounded-full bg-status-safe animate-pulse shrink-0" />
                    </div>

                    <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-1 min-h-0">
                      {interventionLog.slice(0, 4).map((log) => (
                        <div key={log.id} className="bg-bg-base/40 border border-border-dim p-2.5 rounded-sm space-y-1.5 text-xs font-sans">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-semibold text-text-primary">{log.patientName}</span>
                              <span className="text-[10px] text-text-tertiary font-mono ml-2">{log.id}</span>
                            </div>
                            <span className={`font-mono text-[10px] font-bold ${
                              log.status === "confirmed" ? "text-status-safe" : log.status === "declined" ? "text-status-danger" : "text-text-secondary"
                            }`}>
                              {log.status.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                          
                          <p className="text-[10.5px] text-text-secondary italic leading-relaxed">
                            "{log.message || "Outreach notification sent via channel."}"
                          </p>

                          <div className="flex justify-between items-center text-[9.5px] text-text-tertiary font-mono pt-1 border-t border-border-dim/20">
                            <span>Time: {log.appointmentTime}</span>
                            <span>Channel: {log.channel.toUpperCase()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Event Timeline */}
                  <SessionTimeline />

                </div>

              </div>
            ) : (
              /* ====================================================
                 PERFORMANCE ANALYTICS SUB-TAB
                 ==================================================== */
              <div className="space-y-6">
                
                {/* Clean, Premium Hero Ticker card */}
                <div className="bg-bg-surface border border-border-dim p-6 rounded-sm relative shadow-2xs select-none">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <RevenueTicker value={revenue} />
                      <p className="text-xs text-text-secondary font-sans mt-2">
                        Recovered from <span className="font-mono text-text-primary font-semibold">94 automated outreach sessions</span> with average conversion of 84% in high or critical no-show brackets.
                      </p>
                    </div>
                    
                    <div className="bg-bg-subtle border border-border-dim px-5 py-4 rounded-sm shrink-0 flex flex-col items-end justify-center min-w-[200px] hover:border-border-base transition-all select-none font-sans">
                      <div className="flex items-center gap-1.5 text-status-safe">
                        <span className="text-xs uppercase font-bold tracking-wider">Today's Protection</span>
                      </div>
                      <span className="text-2xl font-mono font-bold text-status-safe mt-1">
                        +₹{todaysSavings.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[9.5px] font-mono text-text-secondary uppercase tracking-wide mt-1 block">
                        Saved {todaysRecoveredCount} cancel/risk blocks today
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
                  <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                    <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">System Saved (MTD)</span>
                    <span className="text-2xl font-mono font-bold text-text-primary font-semibold">₹{revenue.toLocaleString("en-IN")}</span>
                    <span className="text-[9.5px] text-status-safe block font-mono font-semibold">188 appointments saved</span>
                  </div>
                  <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                    <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">Resolution Rate</span>
                    <span className="text-2xl font-mono font-bold text-status-safe font-semibold">84% Rate</span>
                    <span className="text-[9.5px] text-status-safe block font-mono font-semibold">Optimized cascade trigger</span>
                  </div>
                  <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                    <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">Avg Recovery Fill</span>
                    <span className="text-2xl font-mono font-bold text-text-primary font-semibold">6m 40s</span>
                    <span className="text-[9.5px] text-text-secondary block font-mono">Avg time to replace slot</span>
                  </div>
                  <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                    <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">Core Escalations</span>
                    <span className="text-2xl font-mono font-bold text-status-danger font-semibold">24 Sessions</span>
                    <span className="text-[9.5px] text-status-danger block font-mono font-semibold">Desk resolution rate 87%</span>
                  </div>
                </div>

                {/* Daily Recoverings Trends (Area) */}
                <div className="w-full">
                  <RecoveryTrendChart data={metricsHistory} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChannelEffectivenessChart />
                  <RiskDistributionDonut />
                </div>

                {/* INTERVENTION SEQUENTIAL ROADMAP TIMELINE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <InterventionTimeline 
                      activeStage={activeFunnelStage} 
                      onStageClick={setActiveFunnelStage} 
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <InterventionLogTable 
                      data={interventionLog} 
                      filterStage={activeFunnelStage} 
                    />
                  </div>
                </div>

                <EscalationTable />

              </div>
            )}

            {/* Hidden Drawer rendered overlay */}
            <RecoverySessionDrawer
              isOpen={drawerOpen}
              onClose={() => {
                setDrawerOpen(false);
                setSelectedSessionId(null);
              }}
              session={
                activeSessions.find((s) => s.sessionId === selectedSessionId) ||
                (() => {
                  const esc = escalations.find((e) => e.sessionId === selectedSessionId);
                  if (esc) {
                    return {
                      sessionId: esc.sessionId,
                      slotId: esc.sessionId,
                      slotTime: esc.slotTime,
                      doctorName: esc.doctorName,
                      specialty: esc.specialty,
                      valueInr: esc.valueInr,
                      startedAt: esc.escalatedAt,
                      elapsedSeconds: 900,
                      escalationThresholdSeconds: 900,
                      status: "escalated",
                      waitlist: [
                        {
                          patientId: "p_top",
                          patientName: esc.topPatient.name,
                          rank: 1,
                          score: 0.95,
                          waitDays: esc.topPatient.waitDays,
                          distanceKm: 4.2,
                          channel: "whatsapp",
                          messageSentAt: esc.escalatedAt,
                        }
                      ],
                      messages: [
                        {
                          patientName: esc.topPatient.name,
                          channel: "whatsapp",
                          sentAt: esc.escalatedAt,
                          content: `Hi ${esc.topPatient.name}, an earlier appointment has become available with ${esc.doctorName}...`,
                          deliveryStatus: "read",
                        }
                      ]
                    } as any;
                  }
                  return null;
                })()
              }
              onEscalate={escalateSession}
              onExtendTimer={extendSessionTimer}
              onOverrideBook={overrideBookManually}
            />

          </div>
        );

      // PAGE 4: CLINICIAN LEADERBOARDS
      case "admin-doctors":
        return (
          <div className="space-y-6">
            <DoctorLeaderboard />
          </div>
        );

      // PAGE 5: AI AGENT HARDWARE/SOFTWARE TELEMETRY
      case "admin-agents":
        return (
          <div className="space-y-6">
            
            {/* Health Operational Status bar */}
            <div className="bg-bg-subtle border border-border-dim p-4 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none shadow-xs">
              <div className="flex items-center gap-3">
                <StatusDot status="safe" />
                <div>
                  <h4 className="text-sm font-bold text-text-primary">All Autonomous Pipelines Operational</h4>
                  <p className="text-[10.5px] font-sans text-text-secondary">
                    Models processing waitlists automatically. Multi-channel messaging latency normal limits.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs font-mono text-text-secondary">
                <div>
                  Daily Total Loads: <span className="text-text-primary font-bold">{agentMetrics.totalRunsToday}</span>
                </div>
                <div className="h-3 w-[1px] bg-border-dim" />
                <div>
                  Avg response: <span className="text-status-safe font-bold">1.24s</span>
                </div>
              </div>
            </div>

            {/* Agent metric detailed log board */}
            <AgentHealthTable data={agentMetrics.byAgent} />
            
            {/* Model Context tools metrics */}
            <MCPToolTable />

          </div>
        );

      // PAGE 6: REGISTRY DEPLOYMENT LOGS
      case "admin-prompts":
        return (
          <div className="space-y-6">
            <PromptRegistryTable />
          </div>
        );

      // PAGE 7: ESCALATION HAND-OFF PORTAL
      case "admin-escalations":
        return (
          <div className="space-y-6 font-sans">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 select-none pb-2">
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm font-mono shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] uppercase font-sans font-bold tracking-widest block">Total Month Escalations</span>
                <span className="text-2xl font-bold font-mono text-text-primary">24</span>
                <span className="text-[9.5px] text-text-secondary block font-sans">Pending human review desk actions</span>
              </div>

              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm font-mono shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] uppercase font-sans font-bold tracking-widest block">Desk Resolution Rate</span>
                <span className="text-2xl font-bold font-mono text-status-safe">87.5% Resolved</span>
                <span className="text-[9.5px] text-status-safe block font-sans font-semibold">21 cases successfully handled</span>
              </div>

              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm font-mono shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] uppercase font-sans font-bold tracking-widest block">Secured Capital</span>
                <span className="text-2xl font-bold font-mono text-text-primary">₹36,000 Saved</span>
                <span className="text-[9.5px] text-text-secondary block font-sans">Secured via manual backup swarm calls</span>
              </div>
            </div>

            <EscalationTable />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col overflow-hidden bg-bg-base text-text-primary relative flex-1 admin-dashboard-container">
      
      {/* Main Core Viewport Panel */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-5 md:space-y-6 no-scrollbar min-h-0">
        
        {/* Dynamic dismissible system operation alerts banner */}
        <AlertBanner onAction={(viewId) => onNavigateToView(viewId)} />

        {/* Elegant Section Header with Date scope selector toolbar (Date Adjustment Section) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-dim pb-4">
          <div>
            <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">
              Administrative Console
            </span>
            <h1 className="text-lg font-sans font-bold text-text-primary mt-1">
              {currentSubView === "admin-overview" && "Clinic Overview"}
              {currentSubView === "admin-revenue" && "Revenue Analytics"}
              {currentSubView === "admin-slotsaver" && "SlotSaver Protection"}
              {currentSubView === "admin-doctors" && "Doctor Performance"}
              {currentSubView === "admin-agents" && "Agent Telemetry Monitor"}
              {currentSubView === "admin-prompts" && "Prompt Version Registry"}
              {currentSubView === "admin-escalations" && "Escalation Handoff Queue"}
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-sans shrink-0">
            <span className="hidden sm:block text-[10.5px] uppercase font-bold tracking-wider text-text-secondary mr-1">
              Scope:
            </span>
            <div className="flex items-center bg-bg-subtle rounded-sm border border-border-dim p-0.5 font-medium">
              <button
                onClick={() => setDateRange("today")}
                className={`px-2 md:px-3 py-1 uppercase text-[9px] md:text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
                  dateRange === "today" 
                    ? "bg-bg-surface text-text-primary shadow-xs font-bold border border-border-dim/40" 
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateRange("week")}
                className={`px-2 md:px-3 py-1 uppercase text-[9px] md:text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
                  dateRange === "week" 
                    ? "bg-bg-surface text-text-primary shadow-xs font-bold border border-border-dim/40" 
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <span className="hidden sm:inline">This </span>Week
              </button>
              <button
                onClick={() => setDateRange("month")}
                className={`px-2 md:px-3 py-1 uppercase text-[9px] md:text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
                  dateRange === "month" 
                    ? "bg-bg-surface text-text-primary shadow-xs font-bold border border-border-dim/40" 
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <span className="hidden sm:inline">This </span>Month
              </button>
            </div>

            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 bg-bg-surface hover:bg-bg-subtle text-text-primary px-3 py-1.5 rounded-sm border border-border-dim cursor-pointer transition-colors shadow-xs font-semibold text-[11px]"
              >
                <Calendar size={12} className="text-text-secondary" />
                <span>Custom Range</span>
                <ChevronDown size={12} className="text-text-tertiary" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-bg-surface border border-border-dim rounded-sm p-1 shadow-lg z-30 font-mono text-[10.5px]">
                  <button 
                    onClick={() => { setDateRange("month"); setDropdownOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-bg-subtle rounded-xs text-text-secondary hover:text-text-primary"
                  >
                    May 15 - Jun 13, 2026
                  </button>
                  <button 
                    onClick={() => { alert("Rolling 90-day ledger logs compiled"); setDropdownOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-bg-subtle rounded-xs text-text-tertiary"
                  >
                    Prior Quarter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {renderPageContent()}
      </div>

      {/* Compliance / Protocol footer */}
      <div className="px-4 md:px-6 py-2 bg-bg-surface border-t border-border-dim flex flex-wrap items-center justify-between gap-2 text-[9px] text-text-tertiary select-none font-sans uppercase font-bold tracking-wider shrink-0">
        <div className="flex items-center gap-1.5">
          <Shield size={10} className="text-status-safe shrink-0" />
          <span>DPDP Compliant</span>
        </div>
        <span className="hidden sm:block">City-DL-01 • Secure Sandbox</span>
      </div>

    </div>
  );
}
