import React, { useState } from "react";
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
  Info
} from "lucide-react";

import AlertBanner from "./admin/AlertBanner";
import RevenueKPIStrip from "./admin/RevenueKPIStrip";
import RevenueTicker from "./admin/RevenueTicker";
import RevenueChart from "./admin/RevenueChart";
import UtilizationChart from "./admin/UtilizationChart";
import ChannelEffectivenessBar from "./admin/ChannelEffectivenessBar";
import RiskDistributionDonut from "./admin/RiskDistributionDonut";
import AppointmentFunnel from "./admin/AppointmentFunnel";
import DoctorLeaderboard from "./admin/DoctorLeaderboard";
import AgentHealthTable from "./admin/AgentHealthTable";
import MCPToolTable from "./admin/MCPToolTable";
import PromptRegistryTable from "./admin/PromptRegistryTable";
import EscalationTable from "./admin/EscalationTable";
import StatusDot from "./admin/StatusDot";
import AgentOperationsBar from "./AgentOperationsBar";
import RevenueRecoveryPipeline from "./admin/RevenueRecoveryPipeline";

import { 
  clinicOverview,
  revenueMetrics,
  slotSaverMetrics,
  doctorMetrics,
  agentMetrics,
  promptMetrics,
  escalations
} from "../mock/admin";

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

            {/* Secondary Highlight Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
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
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
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
            
            {/* Signature counting ticker widget */}
            <RevenueTicker />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">System Saved (MTD)</span>
                <span className="text-2xl font-mono font-bold text-text-primary">₹4,20,000</span>
                <span className="text-[9.5px] text-status-safe block font-mono font-semibold">188 appointments saved</span>
              </div>
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">Resolution Rate</span>
                <span className="text-2xl font-mono font-bold text-status-safe">84% Rate</span>
                <span className="text-[9.5px] text-status-safe block font-mono font-semibold">Optimized cascade trigger</span>
              </div>
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">Avg Recovery Fill</span>
                <span className="text-2xl font-mono font-bold text-text-primary">6m 40s</span>
                <span className="text-[9.5px] text-text-secondary block font-mono">Avg time to replace slot</span>
              </div>
              <div className="bg-bg-surface border border-border-dim p-4 rounded-sm shadow-xs space-y-1">
                <span className="text-text-tertiary text-[10px] block uppercase font-bold tracking-widest font-sans">Core Escalations</span>
                <span className="text-2xl font-mono font-bold text-status-danger">24 Session</span>
                <span className="text-[9.5px] text-status-danger block font-mono font-semibold">Desk resolution rate 87%</span>
              </div>
            </div>

            {/* Daily Recoverings Trends (Area) */}
            <div className="bg-bg-surface border border-border-dim p-5 rounded-sm shadow-xs select-none">
              <div className="mb-4">
                <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">
                  Autorefill Metrics
                </span>
                <h4 className="text-sm font-sans font-bold text-text-primary mt-1">
                  Daily Slot Recovery Progress (MTD)
                </h4>
              </div>
              <div className="h-[210px]">
                <RevenueChart data={revenueMetrics.daily30Days} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChannelEffectivenessBar />
              <RiskDistributionDonut />
            </div>

            {/* INTERVENTION SEQUENTIAL ROADMAP TIMELINE */}
            <div className="bg-bg-surface border border-border-dim p-5 rounded-sm shadow-xs select-none">
              <div className="mb-4 border-b border-border-dim pb-3">
                <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">
                  Intervention Pipelines
                </span>
                <h4 className="text-sm font-sans font-bold text-text-primary mt-1">
                  Predict ⚡ Prevent ⚡ Recover Sequential Flow
                </h4>
              </div>

              {/* Horizontal blocks representing stages */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-bg-subtle/60 p-4 rounded-sm border border-border-dim">
                  <span className="text-text-secondary font-mono text-xs block font-bold">STAGE 01</span>
                  <span className="text-text-primary text-md font-sans font-bold block mt-1">1,312 Monitored</span>
                  <p className="text-[10.5px] text-text-secondary mt-1 font-sans">
                    Core engine continuously evaluates calendar risk scores.
                  </p>
                </div>
                <div className="bg-status-warning/5 p-4 rounded-sm border border-status-warning/20">
                  <span className="text-status-warning font-mono text-xs block font-bold">STAGE 02</span>
                  <span className="text-text-primary text-md font-sans font-bold block mt-1">312 Flagged Risky</span>
                  <p className="text-[10.5px] text-status-warning mt-1 font-sans font-medium">
                    Patients matching high risk no-show criteria.
                  </p>
                </div>
                <div className="bg-status-info/5 p-4 rounded-sm border border-status-info/20">
                  <span className="text-status-info font-mono text-xs block font-bold">STAGE 03</span>
                  <span className="text-text-primary text-md font-sans font-bold block mt-1">248 Inbound Pushes</span>
                  <p className="text-[10.5px] text-status-info mt-1 font-sans font-medium">
                    Dispatched automated WhatsApp and voice follow-ups.
                  </p>
                </div>
                <div className="bg-status-safe/5 p-4 rounded-sm border border-status-safe/25">
                  <span className="text-status-safe font-mono text-xs block font-bold">STAGE 04</span>
                  <span className="text-status-safe text-md font-sans font-bold block mt-1">188 Saved Preemptively</span>
                  <p className="text-[10.5px] text-text-secondary mt-1 font-sans">
                    Confirmed early or swapped dynamically prior to slot expiration.
                  </p>
                </div>
              </div>
            </div>

            <EscalationTable />

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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none pb-2">
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
    <div className="flex flex-col h-screen overflow-hidden bg-bg-base text-text-primary relative flex-1 admin-dashboard-container">
      
      {/* Main Core Viewport Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        
        {/* Dynamic dismissible system operation alerts banner */}
        <AlertBanner onAction={(viewId) => onNavigateToView(viewId)} />

        {/* Elegant Section Header with Date scope selector toolbar (Date Adjustment Section) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-dim pb-4">
          <div>
            <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-[#8A8A9B] block">
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
            <span className="text-[10.5px] uppercase font-bold tracking-wider text-text-secondary mr-1">
              Adjust Scope:
            </span>
            <div className="flex items-center bg-bg-subtle rounded-sm border border-border-dim p-0.5 font-medium">
              <button
                onClick={() => setDateRange("today")}
                className={`px-3 py-1 uppercase text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
                  dateRange === "today" 
                    ? "bg-bg-surface text-text-primary shadow-xs font-bold border border-border-dim/40" 
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateRange("week")}
                className={`px-3 py-1 uppercase text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
                  dateRange === "week" 
                    ? "bg-bg-surface text-text-primary shadow-xs font-bold border border-border-dim/40" 
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setDateRange("month")}
                className={`px-3 py-1 uppercase text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
                  dateRange === "month" 
                    ? "bg-bg-surface text-text-primary shadow-xs font-bold border border-border-dim/40" 
                    : "text-[#D2C3A5]"
                }`}
              >
                This Month
              </button>
            </div>

            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 bg-bg-surface hover:bg-bg-subtle text-text-primary px-3 py-1.5 rounded-sm border border-border-dim cursor-pointer transition-colors shadow-xs font-semibold text-[11px]"
              >
                <Calendar size={12} className="text-text-secondary" />
                <span>Custom Range</span>
                <ChevronDown size={12} className="text-[#8A8A9B]" />
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

      {/* Compliance / Protocol absolute footer */}
      <div className="px-6 py-2.5 bg-bg-surface border-t border-border-dim flex items-center justify-between text-[10px] text-text-tertiary select-none font-sans uppercase font-bold tracking-wider">
        <div className="flex items-center gap-1.5">
          <Shield size={11} className="text-status-safe" />
          <span>DPDP Compliant Data Sovereignty System</span>
        </div>
        <span>Clinic Node: City-DL-01 • Secure Sandbox Env</span>
      </div>

    </div>
  );
}
