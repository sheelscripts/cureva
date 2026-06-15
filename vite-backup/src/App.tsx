/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Sidebar, { ViewRole } from "./components/Sidebar";
import PatientPortal from "./components/PatientPortal";
import DoctorWorkspace from "./components/DoctorWorkspace";
import AdminDashboard from "./components/AdminDashboard";
import CommandCenter from "./components/CommandCenter";

export default function App() {
  const [currentRole, setCurrentRole] = useState<ViewRole>("patient");
  const [currentSubView, setCurrentSubView] = useState("triage");
  const [resetTrigger, setResetTrigger] = useState(0);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);

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

  const renderActiveModule = () => {
    switch (currentRole) {
      case "patient":
        return (
          <PatientPortal
            currentSubView={currentSubView}
            resetTrigger={resetTrigger}
            onNavigateToView={(view) => setCurrentSubView(view)}
          />
        );
      case "doctor":
        return (
          <DoctorWorkspace 
            currentSubView={currentSubView} 
            resetTrigger={resetTrigger}
          />
        );
      case "admin":
        return (
          <AdminDashboard 
            currentSubView={currentSubView}
            onNavigateToView={(view) => setCurrentSubView(view)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-bg-base overflow-hidden">
      {/* Precision Navigation Sidebar & Sticky Top Menu */}
      <Sidebar
        currentRole={currentRole}
        onChangeRole={(role) => {
          setCurrentRole(role);
          setResetTrigger((prev) => prev + 1);
        }}
        currentSubView={currentSubView}
        onChangeSubView={(view) => {
          if (view === currentSubView) {
            setResetTrigger((prev) => prev + 1);
          }
          setCurrentSubView(view);
        }}
        onOpenCommandCenter={() => setCommandCenterOpen(true)}
      />

      {/* Main Core Viewport */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {renderActiveModule()}
      </main>

      {/* Global Command Center Overlay */}
      <CommandCenter
        isOpen={commandCenterOpen}
        onClose={() => setCommandCenterOpen(false)}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        currentSubView={currentSubView}
        onChangeSubView={setCurrentSubView}
      />
    </div>
  );
}
