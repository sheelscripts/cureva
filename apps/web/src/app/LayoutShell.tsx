"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar, { ViewRole } from "@/components/ui/Sidebar";
import CommandCenter from "@/components/ui/CommandCenter";

interface LayoutShellProps {
  role: "patient" | "doctor" | "admin";
  children: React.ReactNode;
}

function LayoutShellContent({ role, children }: LayoutShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Determine subview from query parameters or path
  let currentSubView = "triage";
  if (role === "patient") {
    currentSubView = searchParams.get("view") || "triage";
  } else if (role === "doctor") {
    currentSubView = searchParams.get("view") || "home";
  } else if (role === "admin") {
    currentSubView = searchParams.get("view") || "admin-overview";
  }

  // Keyboard shortcut listener for Cmd+K and Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandCenterOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRoleChange = (newRole: ViewRole) => {
    if (newRole === "patient") {
      router.push("/patient?view=triage");
    } else if (newRole === "doctor") {
      router.push("/doctor?view=home");
    } else if (newRole === "admin") {
      router.push("/admin?view=admin-overview");
    }
  };

  const handleSubViewChange = (newView: string) => {
    let targetPath = "/patient";
    if (role === "patient") {
      targetPath = `/patient?view=${newView}`;
    } else if (role === "doctor") {
      targetPath = `/doctor?view=${newView}`;
    } else if (role === "admin") {
      targetPath = `/admin?view=${newView}`;
    }
    router.push(targetPath);
  };

  const currentRoleMap: Record<string, ViewRole> = {
    patient: "patient",
    doctor: "doctor",
    admin: "admin"
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-bg-base overflow-hidden">
      {/* Navigation — sticky top bar on mobile, fixed sidebar on desktop */}
      <Sidebar
        currentRole={currentRoleMap[role] || "patient"}
        onChangeRole={handleRoleChange}
        currentSubView={currentSubView}
        onChangeSubView={handleSubViewChange}
        onOpenCommandCenter={() => setCommandCenterOpen(true)}
      />

      {/* Main content — fills remaining space, scrollable inside */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
        {children}
      </main>

      {/* Global Command Center Overlay */}
      <CommandCenter
        isOpen={commandCenterOpen}
        onClose={() => setCommandCenterOpen(false)}
        currentRole={currentRoleMap[role] || "patient"}
        onChangeRole={handleRoleChange}
        currentSubView={currentSubView}
        onChangeSubView={handleSubViewChange}
      />
    </div>
  );
}

export default function LayoutShell(props: LayoutShellProps) {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-bg-base" />}>
      <LayoutShellContent {...props} />
    </Suspense>
  );
}
