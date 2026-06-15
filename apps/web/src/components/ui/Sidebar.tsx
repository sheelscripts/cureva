"use client";

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
    { id: "home", label: "Home Overview", icon: Activity },
    { id: "queue", label: "Patient Queue", icon: Users },
    { id: "patients", label: "Patients Search", icon: User },
    { id: "prescriptions", label: "Prescriptions", icon: FileText },
    { id: "notes", label: "Clinical Notes", icon: HeartHandshake },
    { id: "scribe", label: "AI Scribe", icon: Mic },
    { id: "slotsaver", label: "SlotSaver", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const adminViews = [
    { id: "admin-overview", label: "Overview", icon: Activity },
    { id: "admin-revenue", label: "Revenue Analytics", icon: TrendingUp },
    { id: "admin-slotsaver", label: "SlotSaver", icon: HeartHandshake },
    { id: "admin-doctors", label: "Doctor Performance", icon: Users },
    { id: "admin-agents", label: "Agent Monitor", icon: Settings },
    { id: "admin-prompts", label: "Prompt Registry", icon: FileText },
    { id: "admin-escalations", label: "Escalations", icon: Shield }
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
      case "patient": return "Priya Mehta";
      case "doctor": return "Dr. Rajesh";
      case "admin": return "Clinic Admin";
    }
  };

  const getRoleSubLabel = (role: ViewRole) => {
    switch (role) {
      case "patient": return "Patient · 34F";
      case "doctor": return "Cardiologist";
      case "admin": return "Ops Manager";
    }
  };

  const currentViews = getViews();

  const handleRoleClick = (role: ViewRole) => {
    if (role !== currentRole) {
      onChangeRole(role);
    }
    setMobileMenuOpen(false);
    setRoleSelectorOpen(false);
  };

  return (
    <>
      {/* ====================================================
         DESKTOP SIDEBAR (lg:flex — visible 1024px and above)
         ==================================================== */}
      <div className="hidden lg:flex w-[220px] xl:w-[240px] border-r border-border-dim bg-bg-surface flex-col h-screen overflow-y-auto shrink-0 select-none">
        
        {/* Logo Header */}
        <div className="px-5 py-4 border-b border-border-dim flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm bg-accent flex items-center justify-center text-bg-base font-display font-bold text-xs shrink-0">
              C
            </div>
            <span className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
              CUREVA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenCommandCenter}
              className="p-1.5 hover:bg-bg-subtle rounded-sm text-text-secondary hover:text-text-primary transition-all cursor-pointer"
              title="Search & Commands (⌘K)"
            >
              <Search size={13} />
            </button>
            <div className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-safe opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-safe"></span>
            </div>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="p-4 border-b border-border-dim bg-bg-base/30">
          <span className="text-[9px] font-sans font-semibold tracking-wider text-text-tertiary uppercase block mb-2.5">
            Demo Perspective
          </span>
          <div className="grid grid-cols-3 gap-1 bg-bg-base p-1 rounded-sm border border-border-dim">
            {(["patient", "doctor", "admin"] as ViewRole[]).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleClick(role)}
                className={`text-[10px] font-semibold py-1.5 px-1 uppercase rounded-sm transition-all duration-200 cursor-pointer leading-tight ${
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
          <div className="mt-3">
            <div className="flex items-center gap-2 bg-white border border-border-dim/30 px-2.5 py-1.5 rounded-sm shadow-2xs">
              {currentRole === "patient" && <User size={12} className="text-status-safe shrink-0" />}
              {currentRole === "doctor" && <Shield size={12} className="text-accent shrink-0 animate-pulse-dot" />}
              {currentRole === "admin" && <Shield size={12} className="text-status-info shrink-0" />}
              <div className="min-w-0">
                <p className="text-xs text-text-primary font-semibold truncate leading-tight">
                  {getRoleLabel(currentRole)}
                </p>
                <p className="text-[10px] text-text-tertiary truncate leading-tight">
                  {getRoleSubLabel(currentRole)}
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* Navigation */}
        <div className="flex-1 p-3 xl:p-4 space-y-0.5 overflow-y-auto">
          <span className="text-[9px] font-sans font-semibold tracking-wider text-text-tertiary uppercase block mb-2 px-2">
            Module Views
          </span>
          {getViews()?.map((view) => {
            const IconComponent = view.icon;
            const isActive = currentSubView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => onChangeSubView(view.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm transition-all duration-150 text-left relative group cursor-pointer ${
                  isActive
                    ? "bg-bg-subtle text-accent font-semibold"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-subtle/40"
                }`}
              >
                <IconComponent
                  size={14}
                  className={`transition-colors shrink-0 ${
                    isActive ? "text-accent" : "text-text-tertiary group-hover:text-text-secondary"
                  }`}
                />
                <span className="text-xs font-sans font-medium truncate">{view.label}</span>

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

        {/* Command Center shortcut */}
        <div className="mx-3 xl:mx-4 mb-3">
          <button 
            onClick={onOpenCommandCenter}
            className="w-full flex items-center justify-between text-left px-3 py-2 border border-border-dim rounded-sm bg-bg-base/70 text-[10px] text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Search size={11} className="text-text-tertiary" />
              <span>Quick Search</span>
            </div>
            <kbd className="bg-bg-surface px-1 py-0.5 rounded-sm border border-border-dim/80 text-[8px] font-mono shadow-3xs">⌘K</kbd>
          </button>
        </div>

        {/* Compliance Footer */}
        <div className="px-4 py-3 border-t border-border-dim bg-bg-base/60 flex flex-col space-y-0.5 text-center select-none">
          <span className="text-[9px] font-mono tracking-wide text-text-tertiary uppercase flex items-center justify-center gap-1">
            <span className="h-1 w-1 bg-status-safe rounded-full animate-pulse-dot" />
            DPDP Compliant
          </span>
          <span className="text-[8px] font-sans text-text-tertiary">
            CITY-DL-01
          </span>
        </div>
      </div>

      {/* ====================================================
         MOBILE & TABLET TOP NAV (visible below 1024px)
         ==================================================== */}
      <nav className="lg:hidden w-full bg-bg-surface border-b border-border-dim flex flex-col sticky top-0 z-40 select-none">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-5 h-5 rounded-xs bg-accent flex items-center justify-center text-bg-base font-display font-bold text-[10px] shrink-0">
              C
            </div>
            <span className="text-xs font-display font-bold text-text-primary tracking-widest uppercase">
              CUREVA
            </span>
            <div className="flex h-1.5 w-1.5 relative ml-0.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-safe opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-safe"></span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <button 
              onClick={onOpenCommandCenter}
              className="p-2 hover:bg-bg-subtle rounded-md text-text-secondary active:text-accent transition-all cursor-pointer"
              title="Command Center (⌘K)"
            >
              <Search size={16} />
            </button>

            {/* Role Selector */}
            <div className="relative">
              <button 
                onClick={() => setRoleSelectorOpen(!roleSelectorOpen)}
                className="flex items-center gap-1 text-[11px] font-semibold border border-border-dim bg-bg-base/60 hover:bg-white text-text-secondary hover:text-text-primary px-2.5 py-1.5 rounded-sm transition-all cursor-pointer"
              >
                <span className="capitalize">{currentRole}</span>
                <ChevronDown size={11} className={`transition-transform duration-200 shrink-0 ${roleSelectorOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {roleSelectorOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-1.5 w-52 bg-white border border-border-base rounded-sm shadow-lg py-1 z-50 text-left font-sans"
                  >
                    <span className="text-[9px] uppercase font-bold tracking-wider text-text-tertiary px-3 py-2 block border-b border-border-dim">
                      Switch Perspective
                    </span>
                    {(["patient", "doctor", "admin"] as ViewRole[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleClick(role)}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-bg-subtle/80 flex items-center justify-between transition-colors ${
                          currentRole === role ? "font-semibold text-accent bg-bg-subtle/40" : "text-text-secondary"
                        }`}
                      >
                        <div>
                          <span className="capitalize text-xs font-semibold block">{role} View</span>
                          <span className="text-[10px] text-text-tertiary">{getRoleSubLabel(role)}</span>
                        </div>
                        {currentRole === role && <span className="h-1.5 w-1.5 bg-accent rounded-full shrink-0" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-text-secondary hover:text-text-primary active:bg-bg-subtle rounded-md cursor-pointer ml-0.5"
              title="Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Current View pill strip */}
        {!mobileMenuOpen && (
          <div className="px-4 pb-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 min-w-max">
              {currentViews?.map((view) => {
                const IconComponent = view.icon;
                const isActive = currentSubView === view.id;
                return (
                  <button
                    key={view.id}
                    onClick={() => onChangeSubView(view.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                      isActive
                        ? "bg-accent text-white border-accent"
                        : "bg-bg-base text-text-secondary hover:text-text-primary border-border-dim hover:border-border-base hover:bg-bg-subtle"
                    }`}
                  >
                    <IconComponent size={11} className="shrink-0" />
                    {view.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile Drawer Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden border-t border-border-dim"
            >
              <div className="px-4 py-3 bg-bg-base/50 max-h-[75vh] overflow-y-auto">
                {/* Role switcher in drawer */}
                <div className="mb-3">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-text-tertiary block mb-2">
                    Switch Perspective
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["patient", "doctor", "admin"] as ViewRole[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleClick(role)}
                        className={`py-2 px-1 text-[11px] font-semibold rounded-sm uppercase text-center cursor-pointer transition-all border ${
                          currentRole === role
                            ? "bg-accent text-white border-accent"
                            : "bg-bg-surface text-text-secondary border-border-dim hover:bg-bg-subtle"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nav views in drawer */}
                <span className="text-[9px] uppercase font-bold tracking-wider text-text-tertiary block mb-2">
                  Module Views
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
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
                        className={`w-full flex items-center gap-2.5 p-3 rounded-sm border transition-all text-left cursor-pointer ${
                          isActive
                            ? "bg-bg-subtle text-accent border-border-base font-semibold"
                            : "bg-transparent border-transparent hover:bg-bg-subtle/40 text-text-secondary"
                        }`}
                        style={{ minHeight: "44px" }}
                      >
                        <IconComponent size={14} className={`shrink-0 ${isActive ? "text-accent" : "text-text-tertiary"}`} />
                        <span className="text-xs font-medium">{view.label}</span>
                        {isActive && <span className="h-1.5 w-1.5 bg-accent rounded-full ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Footer info */}
                <div className="mt-3 pt-3 border-t border-border-dim/50 flex items-center justify-between text-[9px] text-text-tertiary font-mono">
                  <span>DPDP Compliant</span>
                  <span>CITY-DL-01</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
