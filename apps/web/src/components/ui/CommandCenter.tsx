"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Sparkles, Terminal, Shield, User, HeartHandshake, Calendar, Activity, X } from "lucide-react";
import { ViewRole } from "./Sidebar";

interface CommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: ViewRole;
  onChangeRole: (role: ViewRole) => void;
  currentSubView: string;
  onChangeSubView: (view: string) => void;
}

export default function CommandCenter({
  isOpen,
  onClose,
  currentRole,
  onChangeRole,
  currentSubView,
  onChangeSubView
}: CommandCenterProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  // Search items definition
  const navigationItems = [
    // Patient views
    { id: "triage", label: "Triage & Symptoms Chat (AI)", role: "patient", icon: HeartHandshake },
    { id: "book", label: "Book Appointment with Specialist", role: "patient", icon: Calendar },
    { id: "dashboard", label: "Health Insights & Metrics", role: "patient", icon: Activity },
    { id: "prescriptions", label: "Active Prescriptions Assister", role: "patient", icon: Activity },
    { id: "labs", label: "Lab Diagnostic Reports Dashboard", role: "patient", icon: Activity },
    { id: "timeline", label: "Historical Health Timeline Progress", role: "patient", icon: Activity },
    { id: "ask", label: "Ask Medical Chart AI Assistant", role: "patient", icon: Sparkles },
    
    // Doctor views
    { id: "home", label: "Doctor Workspace Home (Live Queue)", role: "doctor", icon: Activity },
    { id: "queue", label: "Interactive Patient Queue Manager", role: "doctor", icon: User },
    { id: "scribe", label: "AI Scribe Audio-to-SOAP Engine", role: "doctor", icon: Sparkles },
    { id: "slotsaver", label: "SlotSaver Automated No-Show Predictor", role: "doctor", icon: Terminal },
    
    // Admin views
    { id: "admin-overview", label: "Clinic Command Center Overview", role: "admin", icon: Shield },
    { id: "admin-slotsaver", label: "SlotSaver Revenue Protection Engine", role: "admin", icon: Terminal },
    { id: "admin-agents", label: "LangGraph Live Agent Operations", role: "admin", icon: Sparkles },
    { id: "admin-escalations", label: "Automated Escalation Action Desk", role: "admin", icon: Shield }
  ];

  const roleItems = [
    { id: "patient", label: "Patient Persona: Priya Mehta (34F)", desc: "Navigate Patient Portal, book, chat, and check health insights" },
    { id: "doctor", label: "Physician Persona: Dr. Rajesh Sharma (Cardiology)", desc: "Manage clinic queue, try AI Scribe, review SOAP notes" },
    { id: "admin", label: "Administrator Persona: City Clinic Operations", desc: "Monitor LangGraph agents, SlotSaver ROI, configure system prompts" }
  ];

  // Filters based on query
  const filteredNav = navigationItems.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.role.toLowerCase().includes(query.toLowerCase())
  );

  const filteredRoles = roleItems.filter(role =>
    role.label.toLowerCase().includes(query.toLowerCase()) ||
    role.desc.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectItem = (viewId: string, role: string) => {
    if (currentRole !== role) {
      // Navigate to new role with this specific sub-view — onChangeRole will set the default,
      // but we want this specific viewId, so push directly via onChangeRole then let
      // onChangeSubView handle only when staying in same role
      onChangeRole(role as ViewRole);
      // Delay subview push slightly so role route renders first
      setTimeout(() => {
        onChangeSubView(viewId);
      }, 50);
    } else {
      onChangeSubView(viewId);
    }
    onClose();
  };

  const handleSelectRole = (roleId: string) => {
    onChangeRole(roleId as ViewRole);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-bg-surface/30 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4 select-none animate-[fadeIn_0.15s_ease-out]">
      {/* Background click close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="w-full max-w-2xl bg-bg-surface border border-border-base rounded-md shadow-lg overflow-hidden relative z-10 flex flex-col max-h-[500px]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-dim">
          <Search size={18} className="text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-0 outline-0 ring-0 text-sm placeholder-text-tertiary text-text-primary uppercase font-sans tracking-wide"
            placeholder="Search commands, patients, agents, or perspectives... (ESC to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-text-primary rounded-sm hover:bg-bg-subtle transition-all"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Lists */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Perspectves / Roles */}
          {filteredRoles.length > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-tertiary block mb-2 px-2">
                Perspectives / Switch Role Demo
              </span>
              <div className="space-y-1">
                {filteredRoles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role.id)}
                    className={`w-full text-left p-2.5 rounded-sm flex items-start justify-between transition-all group ${
                      currentRole === role.id 
                        ? "bg-bg-subtle text-accent border border-accent/10" 
                        : "hover:bg-bg-subtle/50 text-text-primary border border-transparent"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-2">
                        {role.id === "patient" && <User size={12} className="text-status-safe" />}
                        {role.id === "doctor" && <HeartHandshake size={12} className="text-accent" />}
                        {role.id === "admin" && <Shield size={12} className="text-status-info" />}
                        <span className="font-mono">{role.label}</span>
                      </div>
                      <p className="text-[10px] text-text-secondary mt-0.5 ml-5">{role.desc}</p>
                    </div>
                    {currentRole === role.id && (
                      <span className="text-[9px] font-mono text-status-safe bg-status-safe/10 px-1.5 py-0.5 rounded-sm uppercase">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Views */}
          {filteredNav.length > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-tertiary block mb-2 px-2">
                Unified Application Navigation
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {filteredNav.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item.id, item.role)}
                    className={`text-left p-2 rounded-sm flex items-center justify-between transition-all hover:bg-bg-subtle/70 group text-text-primary border border-transparent hover:border-border-dim ${
                      currentSubView === item.id && currentRole === item.role
                        ? "bg-bg-subtle font-semibold border-border-base"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded-sm bg-bg-base text-text-secondary group-hover:text-accent group-hover:bg-white group-hover:shadow-xs transition-all">
                        <item.icon size={13} />
                      </div>
                      <span className="text-xs truncate font-sans tracking-tight font-medium text-text-secondary group-hover:text-text-primary">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono bg-bg-subtle text-text-tertiary px-1 py-0.5 rounded-xs uppercase tracking-wider scale-90 group-hover:bg-accent group-hover:text-white transition-all select-none">
                      {item.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredNav.length === 0 && filteredRoles.length === 0 && (
            <div className="py-8 text-center flex flex-col items-center justify-center space-y-2 text-text-tertiary">
              <Terminal size={24} />
              <p className="text-xs uppercase font-bold tracking-wider">No quick operations found</p>
              <p className="text-[10px]">Try searching "Patient", "Scribe", "SlotSaver", "Admin"</p>
            </div>
          )}
        </div>

        {/* Command Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border-dim bg-bg-subtle/40 text-[9px] font-mono text-text-secondary">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="bg-bg-surface px-1 py-0.5 rounded-sm shadow-xs font-bold border border-border-base">↵ Enter</kbd></span>
            <span>Perspectives: <kbd className="bg-bg-surface px-1 py-0.5 rounded-sm shadow-xs font-bold border border-border-base">patient</kbd>, <kbd className="bg-bg-surface px-1 py-0.5 rounded-sm shadow-xs font-bold border border-border-base">doctor</kbd>, <kbd className="bg-bg-surface px-1 py-0.5 rounded-sm shadow-xs font-bold border border-border-base">admin</kbd></span>
          </div>
          <span className="opacity-80">ESC to close</span>
        </div>
      </div>
    </div>
  );
}
