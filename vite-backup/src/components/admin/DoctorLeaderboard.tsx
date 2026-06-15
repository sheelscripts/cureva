import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowUpDown, 
  X, 
  CheckCircle2, 
  Sparkles, 
  User, 
  ExternalLink,
  ChevronDown,
  Activity,
  FileText
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { doctorMetrics } from "../../mock/admin";

export default function DoctorLeaderboard() {
  const [sortField, setSortField] = useState<string>("utilizationRate");
  const [ascending, setAscending] = useState<boolean>(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  // Sorting Handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setAscending(!ascending);
    } else {
      setSortField(field);
      setAscending(false);
    }
  };

  const sortedDoctors = useMemo(() => {
    return [...doctorMetrics].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") {
        return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return ascending ? valA - valB : valB - valA;
    });
  }, [sortField, ascending]);

  const activeDoc = useMemo(() => {
    return doctorMetrics.find(d => d.doctorId === selectedDoctorId) || null;
  }, [selectedDoctorId]);

  // Dynamic status color maps for Utilization rate
  const getUtilColor = (rate: number) => {
    if (rate >= 0.85) return "text-status-safe";
    if (rate >= 0.70) return "text-status-warning";
    return "text-status-danger";
  };

  const getUtilBg = (rate: number) => {
    if (rate >= 0.85) return "bg-status-safe/5 border-status-safe/15";
    if (rate >= 0.70) return "bg-status-warning/5 border-status-warning/15";
    return "bg-status-danger/5 border-status-danger/15";
  };

  // Mock mini trends for active drawer representation
  const weeklyTrends = [
    { name: "W1", count: 42 },
    { name: "W2", count: 48 },
    { name: "W3", count: 45 },
    { name: "W4", count: activeDoc ? (activeDoc.appointmentsThisMonth - 135) : 40 },
  ];

  const noshowTrend = [
    { name: "W1", rate: 11 },
    { name: "W2", rate: 8 },
    { name: "W3", rate: activeDoc ? (activeDoc.noShowRate * 100) : 9 },
    { name: "W4", rate: 6 },
  ];

  return (
    <div className="w-full bg-bg-surface border border-border-dim rounded-sm shadow-xs select-none overflow-hidden relative">
      <div className="p-4 border-b border-border-dim flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">
            Employee Directory
          </span>
          <h4 className="text-sm font-sans font-bold text-text-primary mt-1">
            Clinician Operational Leaderboard
          </h4>
        </div>
        <div className="text-[10.5px] font-mono text-text-secondary bg-bg-subtle px-3 py-1 rounded-sm border border-border-dim">
          Total Doctors: <span className="text-text-primary font-bold">10</span> Active
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="border-b border-border-dim bg-bg-subtle/40 text-text-secondary uppercase font-sans tracking-wider text-[10px] font-bold">
              <th className="py-3 px-4 cursor-pointer hover:bg-bg-subtle/30" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1.5">
                  Doctor <ArrowUpDown size={11} className="opacity-80" />
                </div>
              </th>
              <th className="py-3 px-4">Specialty</th>
              <th className="py-3 px-4 text-right cursor-pointer hover:bg-bg-subtle/30" onClick={() => handleSort("appointmentsThisMonth")}>
                <div className="flex items-center justify-end gap-1.5">
                  Appts <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="py-3 px-4 text-right cursor-pointer hover:bg-bg-subtle/30" onClick={() => handleSort("utilizationRate")}>
                <div className="flex items-center justify-end gap-1.5">
                  Util Rate <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="py-3 px-4 text-right cursor-pointer hover:bg-bg-subtle/30" onClick={() => handleSort("noShowRate")}>
                <div className="flex items-center justify-end gap-1.5">
                  No-Show <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="py-3 px-4 text-right cursor-pointer hover:bg-bg-subtle/30" onClick={() => handleSort("avgAppointmentMinutes")}>
                <div className="flex items-center justify-end gap-1.5">
                  Avg Time <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="py-3 px-4 text-right">AI Scribes</th>
              <th className="py-3 px-4 text-right cursor-pointer hover:bg-bg-subtle/30" onClick={() => handleSort("revenueInr")}>
                <div className="flex items-center justify-end gap-1.5">
                  Revenue <ArrowUpDown size={11} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dim text-text-primary">
            {sortedDoctors.map((doc) => {
              const utilPct = Math.round(doc.utilizationRate * 100);
              const noShowPct = Math.round(doc.noShowRate * 100);
              const scribeRate = Math.round((doc.scribesUsed / doc.appointmentsThisMonth) * 100);

              return (
                <tr
                  key={doc.doctorId}
                  onClick={() => setSelectedDoctorId(doc.doctorId)}
                  className={`hover:bg-bg-subtle/20 cursor-pointer transition-colors ${
                    selectedDoctorId === doc.doctorId ? "bg-bg-subtle" : ""
                  }`}
                >
                  <td className="py-2.5 px-4 font-semibold text-text-primary">
                    {doc.name}
                  </td>
                  <td className="py-2.5 px-4 text-text-secondary">
                    {doc.specialty}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-medium text-text-primary">
                    {doc.appointmentsThisMonth}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded-sm border ${getUtilColor(doc.utilizationRate)} ${getUtilBg(doc.utilizationRate)}`}>
                      {utilPct}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-text-primary">
                    {noShowPct}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-text-secondary">
                    {doc.avgAppointmentMinutes}m
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-text-secondary">
                    <span className="flex items-center justify-end gap-1 text-text-primary font-semibold">
                      <Sparkles size={11} className="text-text-secondary" />
                      {scribeRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-text-primary">
                    ₹{(doc.revenueInr / 1000).toFixed(0)}k
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* DETAILED DRAWER WITH ANIMATION */}
      <AnimatePresence>
        {selectedDoctorId && activeDoc && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoctorId(null)}
              className="fixed inset-0 bg-black/40 z-40"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-bg-surface border-l border-border-dim z-50 flex flex-col shadow-2xl overflow-hidden font-sans text-xs text-text-primary"
            >
              {/* Header section */}
              <div className="p-5 border-b border-border-dim flex items-center justify-between bg-bg-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center border border-border-dim">
                    <User size={15} className="text-text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary tracking-wide">{activeDoc.name}</h4>
                    <span className="text-[10.5px] font-mono text-text-tertiary uppercase block tracking-wider">
                      {activeDoc.specialty} • {activeDoc.doctorId}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoctorId(null)}
                  className="p-1 rounded-sm border border-border-dim hover:bg-bg-subtle/80 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Drawer core content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* 4 Monthly KPIs Cards Grid */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3.5 bg-bg-subtle/50 border border-border-dim rounded-sm space-y-1">
                    <span className="text-[9px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">Appointments Completed</span>
                    <span className="text-2xl font-bold font-mono text-text-primary">{activeDoc.appointmentsThisMonth}</span>
                    <span className="text-[9.5px] text-text-secondary block">This month</span>
                  </div>
                  <div className="p-3.5 bg-bg-subtle/50 border border-border-dim rounded-sm space-y-1">
                    <span className="text-[9px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">Clinical Utilization</span>
                    <span className={`text-2xl font-bold font-mono ${getUtilColor(activeDoc.utilizationRate)}`}>
                      {Math.round(activeDoc.utilizationRate * 100)}%
                    </span>
                    <span className="text-[9.5px] text-text-secondary block">Target: &gt;85%</span>
                  </div>
                  <div className="p-3.5 bg-bg-subtle/50 border border-border-dim rounded-sm space-y-1">
                    <span className="text-[9px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">No-Show Rate</span>
                    <span className="text-2xl font-bold font-mono text-status-danger">{Math.round(activeDoc.noShowRate * 100)}%</span>
                    <span className="text-[9.5px] text-status-safe font-semibold block">-1.2% this week</span>
                  </div>
                  <div className="p-3.5 bg-bg-subtle/50 border border-border-dim rounded-sm space-y-1">
                    <span className="text-[9px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">Gross Cash Contribution</span>
                    <span className="text-2xl font-bold font-mono text-text-primary">₹{activeDoc.revenueInr.toLocaleString("en-IN")}</span>
                    <span className="text-[9.5px] text-text-secondary block">INR (Net MTD)</span>
                  </div>
                </div>

                {/* Performance Charts Block (Compact) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Weekly Load */}
                  <div className="p-4 bg-bg-subtle/30 border border-border-dim rounded-sm flex flex-col justify-between">
                    <div className="mb-2">
                      <span className="text-[10px] text-text-tertiary uppercase font-sans font-semibold">Weekly Load</span>
                      <h5 className="font-bold text-text-primary text-[11px]">Appointment Volume</h5>
                    </div>
                    <div className="h-[90px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyTrends} margin={{ top: 5, right: 5, left: -40, bottom: 0 }}>
                          <XAxis dataKey="name" stroke="var(--color-text-tertiary)" tick={{ fontSize: 8 }} />
                          <Bar dataKey="count" fill="var(--color-text-primary)" radius={[1, 1, 0, 0]} maxBarSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Weekly No Shows */}
                  <div className="p-4 bg-bg-subtle/30 border border-border-dim rounded-sm flex flex-col justify-between">
                    <div className="mb-2">
                      <span className="text-[10px] text-text-tertiary uppercase font-sans font-semibold">Risk Factor</span>
                      <h5 className="font-bold text-text-primary text-[11px]">No Show rate %</h5>
                    </div>
                    <div className="h-[90px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={noshowTrend} margin={{ top: 5, right: 5, left: -40, bottom: 0 }}>
                          <XAxis dataKey="name" stroke="var(--color-text-tertiary)" tick={{ fontSize: 8 }} />
                          <Line type="monotone" dataKey="rate" stroke="var(--color-status-danger)" strokeWidth={1.5} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* AI Copilot Engagement Metrics */}
                <div className="p-4 bg-bg-subtle border border-border-dim rounded-sm space-y-4">
                  <div className="flex items-center gap-1.5 text-text-primary">
                    <Sparkles size={13} className="shrink-0 text-text-secondary" />
                    <span className="text-xs uppercase font-sans font-bold tracking-wide">Cureva AI Copilot Adoption</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-2">
                    <div className="space-y-1">
                      <span className="text-text-secondary text-[10px] block font-sans">AI Scribe Usage Count</span>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-lg font-bold text-text-primary">{activeDoc.scribesUsed}</span>
                        <span className="text-text-tertiary text-[10px]">/ {activeDoc.appointmentsThisMonth} times</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-text-secondary text-[10px] block font-sans">AI Rx Generation</span>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-lg font-bold text-text-primary">{activeDoc.prescriptionsGenerated}</span>
                        <span className="text-text-tertiary text-[10px]">Rx files</span>
                      </div>
                    </div>
                  </div>

                  {/* Integration Health Meter */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-text-secondary font-sans">Patient Integration Rate</span>
                      <span className="text-text-primary font-bold">
                        {Math.round((activeDoc.scribesUsed / activeDoc.appointmentsThisMonth) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-bg-surface h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-accent h-full"
                        style={{ width: `${Math.round((activeDoc.scribesUsed / activeDoc.appointmentsThisMonth) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Extra Metadata Panel */}
                <div className="divide-y divide-border-dim font-mono text-[11px] bg-bg-subtle/20 border border-border-dim rounded-sm p-3 space-y-2">
                  <div className="flex justify-between py-1.5">
                    <span className="text-text-secondary font-sans justify-start flex">Avg Appointment Minutes:</span>
                    <span className="text-text-primary font-semibold">{activeDoc.avgAppointmentMinutes} mins/appt</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-t border-border-dim">
                    <span className="text-text-secondary font-sans justify-start flex">Patient Satisfaction Rating:</span>
                    <span className="text-status-safe font-bold">★ {activeDoc.patientSatisfaction} / 5.0</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-t border-border-dim">
                    <span className="text-text-secondary font-sans justify-start flex">Compliance Checklist:</span>
                    <span className="text-status-safe font-sans flex items-center gap-1 font-bold">
                      <CheckCircle2 size={12} /> DPDP Validated
                    </span>
                  </div>
                </div>

              </div>

              {/* Footer navigation linkage */}
              <div className="p-4 border-t border-border-dim bg-bg-subtle flex items-center justify-between">
                <button
                  onClick={() => setSelectedDoctorId(null)}
                  className="px-3 py-1.5 text-[11px] rounded-sm border border-border-dim font-sans font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
                >
                  Close panel
                </button>

                <a
                  href="#doctors-full-metrics"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log(`Deep profiling action logged for ${activeDoc.name}`);
                  }}
                  className="px-4 py-1.5 text-[11px] rounded-sm bg-accent text-bg-surface font-semibold flex items-center gap-1.5 hover:bg-opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>View Full Profile</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
