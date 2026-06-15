import React from "react";
import { 
  Activity, 
  TrendingUp, 
  Users, 
  Settings, 
  FileCode, 
  Shield,
  HeartHandshake,
  ChevronDown
} from "lucide-react";

interface TabItem {
  id: string;
  label: string;
  icon: any;
}

interface AdminSidebarProps {
  currentSubView: string;
  onNavigateToView: (view: string) => void;
  dateRange: "today" | "week" | "month";
  setDateRange: (range: "today" | "week" | "month") => void;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
}

export default function AdminSidebar({ 
  currentSubView, 
  onNavigateToView,
  dateRange,
  setDateRange,
  dropdownOpen,
  setDropdownOpen
}: AdminSidebarProps) {
  const tabs: TabItem[] = [
    { id: "admin-overview", label: "Clinic Overview", icon: Activity },
    { id: "admin-revenue", label: "Revenue Analytics", icon: TrendingUp },
    { id: "admin-slotsaver", label: "SlotSaver Protection", icon: HeartHandshake },
    { id: "admin-doctors", label: "Doctor Performance", icon: Users },
    { id: "admin-agents", label: "Agent Monitor", icon: Settings },
    { id: "admin-prompts", label: "Prompt Registry", icon: FileCode },
    { id: "admin-escalations", label: "Escalation Center", icon: Shield }
  ];

  return (
    <div className="w-full bg-bg-surface border-b border-border-base px-6 py-2 select-none flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentSubView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigateToView(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm transition-all text-xs font-sans font-semibold whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-bg-subtle text-text-primary border border-border-base shadow-sm font-bold"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-subtle/40 border border-transparent"
              }`}
            >
              <Icon 
                size={13} 
                className={`transition-colors ${
                  isActive ? "text-text-primary" : "text-text-tertiary"
                }`} 
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date scope selector toolbar */}
      <div className="flex items-center gap-2 self-end md:self-auto text-xs font-sans">
        <div className="flex items-center bg-bg-subtle rounded-sm border border-border-base p-0.5 font-medium">
          <button
            onClick={() => setDateRange("today")}
            className={`px-3 py-1 uppercase text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
              dateRange === "today" 
                ? "bg-bg-surface text-text-primary shadow-xs font-bold" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateRange("week")}
            className={`px-3 py-1 uppercase text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
              dateRange === "week" 
                ? "bg-bg-surface text-text-primary shadow-xs font-bold" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setDateRange("month")}
            className={`px-3 py-1 uppercase text-[9.5px] tracking-wide rounded-xs transition-colors cursor-pointer font-semibold ${
              dateRange === "month" 
                ? "bg-bg-surface text-text-primary shadow-xs font-bold" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            This Month
          </button>
        </div>

        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1 bg-bg-surface hover:bg-bg-subtle text-text-primary px-3 py-1.5 rounded-sm border border-border-base cursor-pointer transition-colors shadow-xs font-medium"
          >
            <span>Custom Range</span>
            <ChevronDown size={12} className="text-text-secondary" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-44 bg-bg-surface border border-border-base rounded-sm p-1 shadow-lg z-30 font-mono text-[10.5px]">
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
  );
}
