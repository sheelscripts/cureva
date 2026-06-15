import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  Calendar, 
  Users, 
  Mic, 
  FileText, 
  TrendingUp, 
  Settings, 
  User, 
  Shield, 
  HeartHandshake,
  Search,
  Menu,
  X,
  ChevronDown,
  Sparkles
} from "lucide-react";

export type ViewRole = "patient" | "doctor" | "admin";

interface SidebarProps {
  currentRole: ViewRole;
  onChangeRole: (role: ViewRole) => void;
  currentSubView: string;
  onChangeSubView: (view: string) => void;
  onOpenCommandCenter?: () => void;
}

export default function Sidebar({ 
  currentRole, 
  onChangeRole, 
  currentSubView, 
  onChangeSubView,
  onOpenCommandCenter 
}: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSelectorOpen, setRoleSelectorOpen] = useState(false);
  
  // Define sub-views based on role
  const patientViews = [
    { id: "triage", label: "Triage & Chat", icon: HeartHandshake },
    { id: "book", label: "Book Appointment", icon: Calendar },
    { id: "dashboard", label: "Health Dashboard", icon: Activity },
    { id: "prescriptions", label: "Prescriptions", icon: FileText },
    { id: "labs", label: "Lab Reports", icon: TrendingUp },
    { id: "timeline", label: "Health Timeline", icon: Settings }, 
    { id: "ask", label: "Ask AI Assistant", icon: Sparkles } 
  ];

  const doctorViews = [
    { id: "home", label: "Home (Overview)", icon: Activity },
    { id: "queue", label: "Patient Queue", icon: Users },
    { id: "patients", label: "Patients (Search)", icon: User },
    { id: "prescriptions", label: "Prescriptions", icon: FileText },
    { id: "notes", label: "Clinical Notes", icon: HeartHandshake },
    { id: "scribe", label: "AI Scribe", icon: Mic },
    { id: "slotsaver", label: "SlotSaver", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const adminViews = [
    { id: "admin-overview", label: "Overview", icon: Activity },
    { id: "admin-revenue", label: "Revenue Analytics", icon: TrendingUp },
    { id: "admin-slotsaver", label: "SlotSaver Protection", icon: HeartHandshake },
    { id: "admin-doctors", label: "Doctor Performance", icon: Users },
    { id: "admin-agents", label: "Agent Monitor", icon: Settings },
    { id: "admin-prompts", label: "Prompt Registry", icon: FileText },
    { id: "admin-escalations", label: "Escalations Center", icon: Shield }
  ];

  const getViews = () => {
    switch (currentRole) {
      case "patient": return patientViews;
      case "doctor": return doctorViews;
      case "admin": return adminViews;
    }
  };

  const getRoleLabel = (role: ViewRole) => {
    switch (role) {
      case "patient": return "Priya Mehta (Patient)";
      case "doctor": return "Dr. Rajesh (Doctor)";
      case "admin": return "Clinic Ops (Admin)";
    }
  };

  const currentViews = getViews();

  return (
    <>
      {/* ==========================================================================
         DESKTOP SIDEBAR VIEWPORT (lg:flex, hidden on mobile/tablet)
         ========================================================================== */}
      <div className="hidden lg:flex w-[240px] border-r border-border-dim bg-bg-surface flex-col h-screen overflow-y-auto shrink-0 select-none">
        {/* Product Logo / Header */}
        <div className="p-6 border-b border-border-dim flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm bg-accent flex items-center justify-center text-bg-base font-display font-medium text-xs">
              C
            </div>
            <span className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
              CUREVA
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Quick search button for command center */}
            <button 
              onClick={onOpenCommandCenter}
              className="p-1 hover:bg-bg-subtle rounded-sm text-text-secondary transition-all cursor-pointer"
              title="Global Search & Commands (⌘K)"
            >
              <Search size={14} />
            </button>
            <div className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-safe opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-safe"></span>
            </div>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="p-4 border-b border-border-dim bg-bg-base/30">
          <span className="text-[10px] font-sans font-semibold tracking-wider text-text-tertiary uppercase block mb-3">
            Explore demo as:
          </span>
          <div className="grid grid-cols-3 gap-1 bg-bg-base p-1 rounded-sm border border-border-dim">
            {(["patient", "doctor", "admin"] as ViewRole[]).map((role) => (
              <button
                key={role}
                onClick={() => {
                  onChangeRole(role);
                  if (role === "patient") onChangeSubView("triage");
                  if (role === "doctor") onChangeSubView("home");
                  if (role === "admin") onChangeSubView("admin-overview");
                }}
                className={`text-[10px] font-semibold py-1.5 px-1 uppercase rounded-sm transition-all duration-200 cursor-pointer ${
                  currentRole === role
                    ? "bg-bg-surface text-accent font-bold shadow-xs border border-border-dim/40"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-subtle/30"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* User badge */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-border-dim/30 px-2 py-1 rounded-sm w-full shadow-2xs">
              {currentRole === "patient" && (
                <>
                  <User size={13} className="text-status-safe" />
                  <span className="text-xs text-text-primary font-medium truncate">Priya Mehta (34F)</span>
                </>
              )}
              {currentRole === "doctor" && (
                <>
                  <Shield size={13} className="text-accent animate-pulse-dot" />
                  <span className="text-xs text-text-primary font-medium truncate">Dr. Rajesh Sharma</span>
                </>
              )}
              {currentRole === "admin" && (
                <>
                  <Shield size={13} className="text-status-info" />
                  <span className="text-xs text-text-primary font-medium truncate">City Clinic Admin</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Core */}
        <div className="flex-1 p-4 space-y-1.5">
          <span className="text-[10px] font-sans font-semibold tracking-wider text-text-tertiary uppercase block mb-2 px-2">
            Module Views
          </span>
          {getViews()?.map((view) => {
            const IconComponent = view.icon;
            const isActive = currentSubView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => onChangeSubView(view.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-150 text-left relative group cursor-pointer ${
                  isActive
                    ? "bg-bg-subtle text-accent font-semibold"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-subtle/40"
                }`}
              >
                <IconComponent
                  size={16}
                  className={`transition-colors ${
                    isActive ? "text-accent" : "text-text-tertiary group-hover:text-text-secondary"
                  }`}
                />
                <span className="text-xs font-sans font-medium">{view.label}</span>

                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveInd"
                    className="absolute left-0 top-1/4 bottom-1/4 w-[2.5px] bg-accent rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Sticky Global Search ⌘K hint on Desktop */}
        <div className="mx-4 mb-2">
          <button 
            onClick={onOpenCommandCenter}
            className="w-full flex items-center justify-between text-left px-3 py-2 border border-border-dim rounded-sm bg-bg-base/70 text-[10px] text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Search size={11} className="text-text-tertiary" />
              <span>Quick Command Search</span>
            </div>
            <kbd className="bg-bg-surface px-1 py-0.5 rounded-sm border border-border-dim/80 text-[8px] font-mono shadow-3xs">⌘K</kbd>
          </button>
        </div>

        {/* Compliance Footer */}
        <div className="p-4 border-t border-border-dim bg-bg-base/60 flex flex-col space-y-1 text-center select-none">
          <span className="text-[9px] font-mono tracking-wide text-text-tertiary uppercase flex items-center justify-center gap-1">
            <span className="h-1 w-1 bg-status-safe rounded-full animate-pulse-dot" />
            DPDP Compliant Platform
          </span>
          <span className="text-[8px] font-sans text-text-tertiary">
            Clinic Code: CITY-DL-01
          </span>
        </div>
      </div>

      {/* ==========================================================================
         MOBILE & TABLET TOP LIST-BASED NAVIGATION (lg:hidden, visible below 1024px)
         ========================================================================== */}
      <nav className="lg:hidden w-full bg-bg-surface border-b border-border-dim flex flex-col sticky top-0 z-40 select-none">
        
        {/* Core Menu Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim/40">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-xs bg-accent flex items-center justify-center text-bg-base font-display font-medium text-[10px]">
              C
            </div>
            <span className="text-xs font-display font-bold text-text-primary tracking-widest uppercase">
              CUREVA
            </span>
            <div className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-safe opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-safe"></span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick ⌘K Search icon */}
            <button 
              onClick={onOpenCommandCenter}
              className="p-2 hover:bg-bg-subtle rounded-md text-text-secondary active:text-accent transition-all cursor-pointer touch-target"
              title="Command Center (⌘K)"
            >
              <Search size={16} />
            </button>

            {/* Quick Role Selector dropdown button */}
            <div className="relative">
              <button 
                onClick={() => setRoleSelectorOpen(!roleSelectorOpen)}
                className="flex items-center gap-1 text-[11px] font-mono font-medium border border-border-dim bg-bg-base/60 hover:bg-white text-text-secondary hover:text-text-primary px-2.5 py-1.5 rounded-sm transition-all"
              >
                <span>{getRoleLabel(currentRole)}</span>
                <ChevronDown size={12} className={`transition-transform ${roleSelectorOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {roleSelectorOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 mt-1 w-52 bg-white border border-border-base rounded-sm shadow-md py-1 z-50 text-left font-sans"
                  >
                    <span className="text-[9px] uppercase font-bold tracking-wider text-text-tertiary px-3 py-1.5 block border-b border-border-dim">
                      Select Perspective
                    </span>
                    {(["patient", "doctor", "admin"] as ViewRole[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => {
                          onChangeRole(role);
                          setRoleSelectorOpen(false);
                          if (role === "patient") onChangeSubView("triage");
                          if (role === "doctor") onChangeSubView("home");
                          if (role === "admin") onChangeSubView("admin-overview");
                        }}
                        className={`w-full text-left px-3 py-2.5 text-xs hover:bg-bg-subtle/80 flex items-center justify-between ${
                          currentRole === role ? "font-bold text-accent bg-bg-subtle/40" : "text-text-secondary"
                        }`}
                      >
                        <span className="capitalize">{role} View</span>
                        {currentRole === role && <span className="h-1.5 w-1.5 bg-accent rounded-full" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Hamburger toggle for a list based menu drawer overlay if requested */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-text-secondary hover:text-text-primary active:bg-bg-subtle rounded-md cursor-pointer ml-1"
              title="Menu Options"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>



        {/* MOBILE DRAWER COLLAPSIBLE LIST MENU PANEL */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 bg-bg-surface border-b border-border-dim flex flex-col space-y-2 lg:hidden max-h-[80vh] overflow-y-auto"
            >
              <div className="py-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-tertiary block mb-2">
                  Unified Diagnostic Operation Centers
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {currentViews?.map((view) => {
                    const IconComponent = view.icon;
                    const isActive = currentSubView === view.id;
                    return (
                      <button
                        key={view.id}
                        onClick={() => {
                          onChangeSubView(view.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xs border transition-all text-left ${
                          isActive
                            ? "bg-bg-subtle text-accent border-border-base font-bold"
                            : "bg-transparent border-transparent hover:bg-bg-subtle/30 text-text-secondary"
                        }`}
                        style={{ minHeight: "44px" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <IconComponent size={14} className={isActive ? "text-accent" : "text-text-tertiary"} />
                          <span className="text-xs">{view.label}</span>
                        </div>
                        {isActive && <span className="h-1.5 w-1.5 bg-accent rounded-full" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Quick System Info */}
              <div className="pt-3 border-t border-border-dim/50 flex items-center justify-between text-[10px] text-text-tertiary font-mono">
                <span>DPDP Compliant Core</span>
                <span>CITY-DL-01</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
