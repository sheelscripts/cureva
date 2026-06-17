"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Sparkles, 
  MapPin, 
  Clock, 
  Calendar, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Download,
  Share2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Activity,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  User,
  Info,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";

import { 
  currentPatient, 
  appointments as initialAppointments, 
  prescriptions as initialPrescriptions, 
  labReports as initialLabReports, 
  healthTimeline as initialTimeline
} from "@/mock/patients";

import { 
  getPatient, 
  getAppointments, 
  getPrescriptions, 
  getLabReports, 
  getHealthTimeline, 
  bookAppointment, 
  sendTriageMessage,
  askAI 
} from "@/mock/api";

interface PatientPortalProps {
  currentSubView: string;
  onNavigateToView: (view: string) => void;
  resetTrigger?: number;
}

export default function PatientPortal({ currentSubView, onNavigateToView, resetTrigger }: PatientPortalProps) {
  // --- CORE STATE ---
  const [patient, setPatient] = useState(currentPatient);
  const [appointmentsList, setAppointmentsList] = useState(initialAppointments);
  const [prescriptionsList, setPrescriptionsList] = useState(initialPrescriptions);
  const [labsList, setLabsList] = useState(initialLabReports);
  const [timelineList, setTimelineList] = useState(initialTimeline);

  // --- LOADER STATES (simulating async queries) ---
  const [isLoading, setIsLoading] = useState(false);

  // Triage Chat State
  const [triageMessages, setTriageMessages] = useState<any[]>([]);
  const [triageInput, setTriageInput] = useState("");
  const [isTriageTyping, setIsTriageTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Ask AI Assistant States
  const [askMessages, setAskMessages] = useState<any[]>([]);
  const [askInput, setAskInput] = useState("");
  const [isAskTyping, setIsAskTyping] = useState(false);
  const askEndRef = useRef<HTMLDivElement>(null);

  // Mode state: 'real' = live LLM, 'simulation' = mock response
  const [mode, setMode] = useState<'real' | 'simulation'>('simulation');
  // Shared mode for both tabs
  const [sharedMode, setSharedMode] = useState<'real' | 'simulation'>('simulation');

  // Booking Flow States
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedDayTab, setSelectedDayTab] = useState("Today");
  const [visitReason, setVisitReason] = useState("");
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);

  // Detail / Drawer States
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [activeLabReport, setActiveLabReport] = useState<any>(null);
  const [labsFilter, setLabsFilter] = useState("all");
  const [timelineFilter, setTimelineFilter] = useState("all");

  // Notifications (Simulated warning banner / badge counts)
  const [unreadNotifications, setUnreadNotifications] = useState(1);

  // Dynamic header — today's date + distance from current patient
  const _now = new Date();
  const dayName = _now.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = _now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const distanceKm = patient?.distanceKm ?? 2.1;

  // --- MOCK + REAL API DATA INITIALIZATION ---
  useEffect(() => {
    // Populate base states
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);

    // Initial triage prompt starting message
    setTriageMessages([
      {
        role: "ai",
        content: `Welcome Priya. I have compiled your health records. If you are experiencing temperature shifts, high blood pressure signs, or localized pain, state your symptoms here for smart guidance or slot reservation.`,
        timestamp: "10:30 AM"
      }
    ]);

    setAskMessages([
      {
        role: "ai",
        content: `Hi Priya. I can answer questions grounded directly in your Cureva medical chart, past diagnostic logs, or prescription dosages. Select a question below or write to consult.`,
        timestamp: "10:31 AM"
      }
    ]);

    // Phase A: fetch real data in background. Initial mock state prevents
    // flicker; SDK functions silently fall back to mock on fetch failure.
    Promise.allSettled([
      getPatient().then(setPatient),
      getAppointments().then(setAppointmentsList),
      getPrescriptions().then(setPrescriptionsList),
      getLabReports().then(setLabsList),
      getHealthTimeline().then(setTimelineList),
    ]).catch(() => {});

    return () => clearTimeout(timer);
  }, []);

  // Scroll chat to bottom helper
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [triageMessages, isTriageTyping]);

  useEffect(() => {
    askEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [askMessages, isAskTyping]);

  // Handle auto-nav to subviews
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentSubView]);

  // --- STREAMING SIMULATOR ---
  const streamAIResponse = (text: string, type: "triage" | "ask", actions?: any[]) => {
    let currentText = "";
    const words = text.split(" ");
    let index = 0;

    const setMessagesFn = type === "triage" ? setTriageMessages : setAskMessages;
    const setIsTypingFn = type === "triage" ? setIsTriageTyping : setIsAskTyping;

    // Add empty message first
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessagesFn(prev => [...prev, { role: "ai", content: "", timestamp, actions, isStreaming: true }]);

    setIsTypingFn(false);

    const interval = setInterval(() => {
      if (index < words.length) {
        currentText += (index === 0 ? "" : " ") + words[index];
        setMessagesFn(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === "ai") {
            updated[lastIndex] = { ...updated[lastIndex], content: currentText };
          }
          return updated;
        });
        index++;
      } else {
        clearInterval(interval);
        // Remove streaming flag
        setMessagesFn(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === "ai") {
            updated[lastIndex] = { ...updated[lastIndex], isStreaming: false };
          }
          return updated;
        });
      }
    }, 45);
  };

  // --- ACTION HANDLERS ---
  const handleSendTriage = async (msgText: string) => {
    if (!msgText.trim()) return;

    // Add user message
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTriageMessages(prev => [...prev, { role: "user", content: msgText, timestamp }]);
    setTriageInput("");
    setIsTriageTyping(true);

    // Simulation mode: deterministic mock response
    if (sharedMode === 'simulation') {
      setIsTriageTyping(false);
      const lower = msgText.toLowerCase();
      if (lower.includes('chest') || lower.includes('heart') || lower.includes('breath')) {
        streamAIResponse(
          "These symptoms need immediate cardiological evaluation. [SIMULATION] Book Dr. Rajesh Sharma today at 4:30 PM — ₹1,500",
          "triage",
          [{ label: "Book 4:30 PM Today", slotId: "S-CARD-430", doctorName: "Dr. Rajesh Sharma", time: "4:30 PM", specialty: "Cardiology", cost: 1500 }]
        );
      } else if (lower.includes('skin') || lower.includes('rash') || lower.includes('itch')) {
        streamAIResponse(
          "Skin-related symptoms suggest dermatology. [SIMULATION] Book Dr. Priya Gupta today at 1:15 PM — ₹1,200",
          "triage",
          [{ label: "Book 1:15 PM Today", slotId: "S-DERM-115", doctorName: "Dr. Priya Gupta", time: "1:15 PM", specialty: "Dermatology", cost: 1200 }]
        );
      } else {
        streamAIResponse(
          "General consultation recommended. [SIMULATION] Book Dr. Ananya Gupta tomorrow at 9:00 AM — ₹800",
          "triage",
          [{ label: "Book 9:00 AM Tomorrow", slotId: "S-GEN-900", doctorName: "Dr. Ananya Gupta", time: "9:00 AM", specialty: "General Medicine", cost: 800 }]
        );
      }
      return;
    }

    // Real mode: call live LLM via SDK
    try {
      const response = await sendTriageMessage(msgText);
      streamAIResponse(response.content, "triage", response.actions);
    } catch {
      setIsTriageTyping(false);
    }
  };

  const handleSendAsk = async (msgText: string) => {
    if (!msgText.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAskMessages(prev => [...prev, { role: "user", content: msgText, timestamp }]);
    setAskInput("");
    setIsAskTyping(true);

    // Simulation mode: deterministic mock
    if (sharedMode === 'simulation') {
      setIsAskTyping(false);
      streamAIResponse(
        "[SIMULATION] Based on standard medical knowledge: this is a placeholder answer. Switch to Real Talk mode to ask the AI for an actual response.",
        "ask"
      );
      return;
    }

    // Real mode: call askAI (Q&A, not triage/booking)
    try {
      const result = await askAI(msgText);
      streamAIResponse(result.answer, "ask");
      // If the AI suggests booking, add a booking prompt after the message streams
      if (result.suggestBooking) {
        setAskMessages(prev => [
          ...prev.slice(0, -1),
          {
            ...prev[prev.length - 1],
            content: prev[prev.length - 1].content,
            showBookingPrompt: true,
            bookingReason: result.bookingReason,
          },
        ]);
      }
    } catch {
      setIsAskTyping(false);
    }
  };

  const handleSymptomChipClick = (symptom: string) => {
    handleSendTriage(`Investigating symptom: ${symptom}. Please guide me to the correct medical specialty.`);
  };

  const triggerDirectBooking = (action: any) => {
    setSelectedSpecialty(action.specialty);
    setSelectedDoctor({
      id: "D-MOCK",
      name: action.doctorName,
      specialty: action.specialty,
      consultationFee: action.cost,
      registrationNo: "MCI/DL/2012/8040",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop"
    });
    setSelectedSlot(action.time);
    setVisitReason("AI assisted triage diagnostic check");
    setBookingStep(3);
    onNavigateToView("book");
  };

  const handleConfirmBooking = async () => {
    setIsLoading(true);
    try {
      const res = await bookAppointment(
        selectedSlot === "S-CARD-430" ? "S-441" : "S-442",
        selectedDoctor?.name || "Dr. Rajesh Sharma",
        "2025-01-16",
        selectedSlot,
        selectedSpecialty,
        selectedDoctor?.consultationFee || 1500
      );
      
      const newAppt = res.appointment;
      setAppointmentsList(prev => [newAppt, ...prev]);
      setTimelineList(prev => [
        { date: newAppt.date, type: "appointment", label: `${newAppt.specialty} follow-up`, status: "upcoming", doctor: newAppt.doctorName },
        ...prev
      ]);
      setBookingSuccessData(newAppt);
      setBookingStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel upcoming appointment
  const handleCancelAppointment = (id: string) => {
    if (confirm("Are you sure you want to cancel this appointment under clinical guidelines?")) {
      setAppointmentsList(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a));
      setTimelineList(prev => prev.map(t => t.label.includes("Cardiology") || t.label.includes("Orthopedic") ? { ...t, status: "cancelled" } : t));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-base text-text-primary select-none">
      
      {/* GLOBAL NOTIFICATION BANNER / TOP BAR */}
      <div className="px-4 py-2 bg-text-primary text-bg-base flex flex-wrap justify-between items-center gap-2 text-[10px] font-mono tracking-wide shrink-0">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="h-1.5 w-1.5 bg-status-safe rounded-full animate-ping shrink-0" />
          <span className="truncate">TRIAGE — PRIYA MEHTA (34F)</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="opacity-75 hidden sm:block">BLOOD: <strong className="text-status-warning">{patient.bloodGroup}</strong></span>
          <span className="opacity-75 hidden md:block">ALLERGIES: <strong className="text-status-danger">{patient.allergies.join(", ")}</strong></span>
        </div>
      </div>

      {/* CORE VIEWPORT */}
      <div className="flex-1 overflow-y-auto">
        
        {/* VIEW 1: PATIENT HOME / TRIAGE CHAT */}
        {currentSubView === "triage" && (
          <div className="p-4 sm:p-5 md:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
            {/* Header greeting */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-medium tracking-tight text-text-primary">
                  Good morning, <span className="font-serif italic text-text-secondary">{patient.name.split(' ')[0]}</span>
                </h1>
                <p className="text-[11px] text-text-secondary font-mono tracking-wide mt-1">
                  {dayName}, {monthDay} · Air: Moderate · City Clinic ({distanceKm} km)
                </p>
              </div>
              <div>
                <button 
                  onClick={() => onNavigateToView("book")}
                  className="px-4 py-2 border border-border-base hover:border-text-primary hover:bg-bg-subtle text-xs font-semibold rounded-sm transition-all flex items-center gap-1 whitespace-nowrap"
                >
                  Book Visit <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Triage Chat System */}
              <div className="lg:col-span-8 bg-bg-surface border border-border-dim rounded-sm flex flex-col h-[620px] overflow-hidden dynamic-chat-area">
                
                {/* MODE BADGE — Simulation = mock, Real = live LLM */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-subtle border-b border-border-dim">
                  <span className="h-2 w-2 rounded-full bg-status-safe animate-pulse shrink-0" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
                    {sharedMode === 'real' ? 'REAL TALK — Live LLM (Vercel AI Gateway)' : 'SIMULATION — Mock Response'}
                  </span>
                  <button
                    onClick={() => setSharedMode(prev => prev === 'real' ? 'simulation' : 'real')}
                    className="ml-auto text-[10px] font-mono uppercase tracking-widest text-text-primary hover:underline shrink-0"
                  >
                    Switch to {sharedMode === 'real' ? 'Simulation' : 'Real Talk'}
                  </button>
                </div>

                {/* Chat header info bar */}
                <div className="p-4 border-b border-border-dim bg-bg-subtle flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-status-safe/10 border border-status-safe/25 text-status-safe">
                      <Stethoscope size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-text-primary">Medical Triage AI</h3>
                      <p className="text-[10px] text-text-secondary">Fully compliant under medical data privacy guidelines</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-bg-base border border-border-base text-text-secondary px-2 py-0.5 rounded-sm uppercase">
                    RAG Grounded
                  </span>
                </div>

                {/* Message list scrolling container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {triageMessages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        
                        {msg.role === "ai" && (
                          <div className="w-6 h-6 rounded-sm bg-text-primary text-bg-base flex items-center justify-center text-[10px] shrink-0 uppercase font-bold">
                            AI
                          </div>
                        )}

                        <div className="space-y-2">
                          <div 
                            className={`p-4 rounded-sm text-xs font-sans leading-relaxed border ${
                              msg.role === "user" 
                                ? "bg-text-primary text-bg-base border-text-primary" 
                                : "bg-bg-subtle text-text-primary border-border-dim"
                            }`}
                          >
                            <p className="whitespace-pre-line">{msg.content}</p>
                            
                            {/* Actions attachments (e.g. Booking buttons inside chat) */}
                            {msg.actions && msg.actions.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-border-base space-y-2">
                                <span className="text-[10px] font-mono text-text-secondary block">clinical recommendation slots:</span>
                                <div className="flex flex-wrap gap-2">
                                  {msg.actions.map((act: any, aIdx: number) => (
                                    <button
                                      key={aIdx}
                                      onClick={() => triggerDirectBooking(act)}
                                      className="px-3 py-1.5 bg-bg-surface hover:bg-bg-base text-text-primary border border-border-base hover:border-text-primary text-[11px] font-semibold rounded-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <span>{act.label}</span>
                                      <ArrowRight size={11} className="text-text-secondary" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-mono tracking-wider text-text-tertiary block text-right mt-1">
                            {msg.timestamp}
                          </span>
                        </div>

                      </div>
                    </div>
                  ))}

                  {isTriageTyping && (
                    <div className="flex justify-start">
                      <div className="flex gap-3 max-w-[80%]">
                        <div className="w-6 h-6 rounded-sm bg-text-primary text-bg-base flex items-center justify-center text-[10px] shrink-0 font-bold uppercase animate-pulse">
                          AI
                        </div>
                        <div className="p-3 bg-bg-subtle text-text-tertiary border border-border-dim rounded-sm text-xs">
                          <span className="shimmer h-[1bh] w-32 block">Analyzing specific symptom patterns...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Auto Symptom Chips */}
                <div className="p-4 border-t border-border-dim bg-bg-subtle">
                  <span className="text-[10px] font-sans font-semibold tracking-wider text-text-secondary uppercase block mb-2">
                    Quick Symptoms Selector:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["Morning headache + BP Spike", "Chest distress & breath loss", "Atypical red itchy arm rash", "Severe runner knee swelling"].map((sym, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSymptomChipClick(sym)}
                        className="px-2.5 py-1 text-[11px] font-sans text-text-secondary hover:text-text-primary bg-bg-surface hover:bg-bg-base border border-border-dim hover:border-border-base rounded-sm transition-all duration-150 cursor-pointer"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form input stick */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendTriage(triageInput);
                  }}
                  className="p-3 border-t border-border-dim bg-bg-surface flex items-center gap-2"
                >
                  <input 
                    type="text"
                    value={triageInput}
                    onChange={(e) => setTriageInput(e.target.value)}
                    placeholder="Describe your current headache frequency or bp readings..."
                    className="flex-1 bg-bg-base text-text-primary placeholder-text-tertiary border border-border-base px-3.5 py-2.5 text-xs rounded-sm focus:outline-none focus:border-text-primary font-sans"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-text-primary text-bg-base hover:opacity-90 rounded-sm transition-all shrink-0 cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </form>

              </div>

              {/* RIGHT COLUMN: Quick Status + Active upcoming booking summaries */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* ACTIVE APPOINTMENT SUMMARY CARD */}
                {appointmentsList.some(a => a.status === "upcoming") ? (
                  <div className="p-5 bg-bg-surface border border-border-dim rounded-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono tracking-wider text-status-warning border border-status-warning/20 bg-status-warning/5 px-2 py-0.5 rounded-sm uppercase font-semibold">
                        Upcoming Appointment
                      </span>
                      <span className="text-[10px] font-mono text-text-tertiary">#A-8821</span>
                    </div>

                    {appointmentsList.filter(a => a.status === "upcoming").slice(0, 1).map((appt) => (
                      <div key={appt.id} className="space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-base font-semibold text-text-primary">{appt.doctorName}</h4>
                          <p className="text-xs text-text-secondary">{appt.specialty} · {appt.location}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-3 bg-bg-base border border-border-dim rounded-sm text-xs">
                          <div>
                            <span className="text-text-tertiary block text-[10px] uppercase font-mono">Date</span>
                            <span className="font-mono font-semibold text-text-primary block mt-0.5">{appt.date}</span>
                          </div>
                          <div>
                            <span className="text-text-tertiary block text-[10px] uppercase font-mono">Time Slot</span>
                            <span className="font-mono font-semibold text-text-primary block mt-0.5">{appt.time}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="flex-1 py-2 text-center border border-border-base hover:border-status-danger hover:text-status-danger text-xs font-semibold rounded-sm transition-colors cursor-pointer"
                          >
                            Cancel Slot
                          </button>
                          <button 
                            onClick={() => onNavigateToView("book")}
                            className="flex-1 py-2 text-center bg-bg-subtle hover:bg-bg-base border border-border-base text-xs font-semibold rounded-sm transition-colors cursor-pointer"
                          >
                            Reschedule
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 bg-bg-surface border border-border-dim border-dashed rounded-sm text-center py-8 space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary block">No scheduled consultations</span>
                    <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">Describe ailments to our Triage AI to instantly lock a specialist slot, or use our static search panel.</p>
                    <button 
                      onClick={() => onNavigateToView("book")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-text-primary text-bg-base text-xs font-semibold rounded-sm hover:opacity-90 transition-all cursor-pointer"
                    >
                      Process Booking
                    </button>
                  </div>
                )}

                {/* QUICK NAV LINKS / SHORTCUTS GRID */}
                <div className="space-y-2">
                  <span className="text-[10px] font-sans font-semibold tracking-wider text-text-secondary uppercase block px-1">
                    Direct Portals Shortcut:
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    
                    <button 
                      onClick={() => onNavigateToView("dashboard")}
                      className="p-4 bg-bg-surface border border-border-dim hover:border-text-primary text-left rounded-sm space-y-2 group transition-all cursor-pointer"
                    >
                      <Activity size={18} className="text-text-tertiary group-hover:text-text-primary transition-colors" />
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-semibold text-text-primary">Dashboard</h4>
                        <p className="text-[10px] text-text-secondary font-mono">Overview & metrics</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => onNavigateToView("prescriptions")}
                      className="p-4 bg-bg-surface border border-border-dim hover:border-text-primary text-left rounded-sm space-y-2 group transition-all cursor-pointer"
                    >
                      <FileText size={18} className="text-text-tertiary group-hover:text-text-primary transition-colors" />
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-semibold text-text-primary">Medicines</h4>
                        <p className="text-[10px] text-text-secondary font-mono">{prescriptionsList.length} total active files</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => onNavigateToView("labs")}
                      className="p-4 bg-bg-surface border border-border-dim hover:border-text-primary text-left rounded-sm space-y-2 group transition-all cursor-pointer"
                    >
                      <TrendingUp size={18} className="text-text-tertiary group-hover:text-text-primary transition-colors" />
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-semibold text-text-primary">Lab Results</h4>
                        <p className="text-[10px] text-text-secondary font-mono">Lipid, Blood & Sugar</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => onNavigateToView("timeline")}
                      className="p-4 bg-bg-surface border border-border-dim hover:border-text-primary text-left rounded-sm space-y-2 group transition-all cursor-pointer"
                    >
                      <Clock size={18} className="text-text-tertiary group-hover:text-text-primary transition-colors" />
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-semibold text-text-primary">Timeline</h4>
                        <p className="text-[10px] text-text-secondary font-mono">Interactive health log</p>
                      </div>
                    </button>

                  </div>
                </div>

                {/* DPDP HEALTH DECRYPTION TRUST CARD */}
                <div className="p-4 bg-bg-subtle border border-border-base rounded-sm text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-1 text-text-primary font-semibold">
                    <ShieldCheck size={14} className="text-status-safe" />
                    <span>DPDP Certified Vault</span>
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Your personal health logs are locked using AES-256 standard keys. No diagnostic metrics are dispatched to external search modules without patient authorization PINs.
                  </p>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* VIEW 2: APPOINTMENT BOOKING WIZARD */}
        {currentSubView === "book" && (
          <div className="p-4 sm:p-5 md:p-8 max-w-4xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
            <div>
              <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-text-primary">
                Book structured consultation
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Lock clinical slots with certified physicians across City Network Clinics
              </p>
            </div>

            {/* Step Wizard Progress Header — scrollable on mobile */}
            <div className="bg-bg-surface border border-border-dim p-3 md:p-4 rounded-sm overflow-x-auto">
              <div className="flex items-center gap-3 md:gap-5 min-w-max mx-auto w-fit">
                {[
                  { step: 1, label: "Specialty" },
                  { step: 2, label: "Doctor" },
                  { step: 3, label: "Confirm" }
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-2">
                    <div 
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-semibold border ${
                        bookingStep === s.step 
                          ? "bg-text-primary text-bg-base border-text-primary" 
                          : bookingStep > s.step 
                          ? "bg-status-safe text-bg-base border-status-safe" 
                          : "border-border-base text-text-tertiary text-bg-base"
                      }`}
                    >
                      {bookingStep > s.step ? "✓" : s.step}
                    </div>
                    <span className={`text-[10px] md:text-[11px] font-sans uppercase tracking-widest font-semibold whitespace-nowrap ${
                      bookingStep === s.step ? "text-text-primary" : "text-text-tertiary"
                    }`}>
                      {s.label}
                    </span>
                    {s.step < 3 && <div className="h-0.5 w-8 md:w-12 bg-border-base" />}
                  </div>
                ))}
              </div>
            </div>

            {/* SWITCH STEPS CONTENT */}
            {bookingStep === 1 && (
              <div className="space-y-6">
                <span className="text-[11px] font-sans font-semibold tracking-wider text-text-secondary uppercase">
                  Available Specialty Departments:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: "Cardiology", name: "Cardiology Clinical Unit", desc: "For managing high blood pressure, palpitations, stage 1 hypertension checks.", next: "Today 4:30 PM" },
                    { id: "Dermatology", name: "Dermatology Clinic", desc: "Treating seasonal eczema flares, contact dermatitis rashes, skin itch.", next: "Today 1:15 PM" },
                    { id: "Orthopedics", name: "Orthopedic Care Unit", desc: "Focusing on joint mobility delays, knees stiffness, sprain rehabilitation.", next: "Today 11:30 AM" },
                    { id: "General Medicine", name: "General Medicine & Flu", desc: "For seasonal influenza, diagnostic blood count reviews, general wellness.", next: "Tomorrow 9:00 AM" },
                    { id: "Neurology", name: "Neurology Specialist Wing", desc: "Deep study regarding nerve triggers, persistent migraine spikes.", next: "Thursday 2:00 PM" },
                    { id: "Psychiatry", name: "Neuropsychiatry & Support", desc: "Stress management, sleep hygiene assessments, chronic anxiety care.", next: "Monday 10:00 AM" }
                  ].map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => {
                        setSelectedSpecialty(dept.id);
                        setBookingStep(2);
                      }}
                      className="bg-bg-surface border border-border-dim hover:border-text-primary p-5 text-left rounded-sm space-y-3 transition-all duration-150 group cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-text-primary group-hover:text-text-primary">{dept.name}</span>
                        <span className="text-[9px] font-mono bg-bg-subtle text-text-secondary px-1.5 py-0.5 rounded-sm">
                          {dept.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">{dept.desc}</p>
                      <div className="border-t border-border-dim pt-2 flex justify-between items-center text-[10px] font-mono text-text-tertiary">
                        <span>NEXT SLOT:</span>
                        <span className="text-text-primary font-bold">{dept.next}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bookingStep === 2 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setBookingStep(1)}
                    className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={13} /> Change Specialty
                  </button>
                  <span className="text-xs font-mono uppercase text-text-secondary">SPECIALTY: <strong className="text-text-primary">{selectedSpecialty}</strong></span>
                </div>

                <div className="space-y-4">
                  {[
                    { id: "doc-1", name: "Dr. Rajesh Sharma", qualification: "MD, Cardiology (AIIMS)", fee: 1500, rating: "4.9", reviews: 142, docSpecialty: "Cardiology", avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop" },
                    { id: "doc-2", name: "Dr. Priya Gupta", qualification: "MD, Dermatology (AFMC)", fee: 1200, rating: "4.8", reviews: 98, docSpecialty: "Dermatology", avatar: "https://images.unsplash.com/photo-1594824813573-246434de83fb?q=80&w=150&auto=format&fit=crop" },
                    { id: "doc-3", name: "Dr. Rohan Verma", qualification: "MS, Orthopedics (KMC)", fee: 1300, rating: "4.7", reviews: 84, docSpecialty: "Orthopedics", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=150&auto=format&fit=crop" },
                    { id: "doc-4", name: "Dr. Ananya Gupta", qualification: "MBBS, General Outpatient (MAMC)", fee: 800, rating: "4.8", reviews: 215, docSpecialty: "General Medicine", avatar: "https://images.unsplash.com/photo-1594824813573-246434de83fb?q=80&w=150&auto=format&fit=crop" }
                  ].filter(d => d.docSpecialty === selectedSpecialty || !selectedSpecialty).map((doc) => (
                    <div 
                      key={doc.id}
                      className="bg-bg-surface border border-border-dim p-5 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <img 
                          src={doc.avatar} 
                          alt={doc.name} 
                          className="w-12 h-12 rounded-sm object-cover border border-border-dim"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-text-primary">{doc.name}</h3>
                            <span className="text-[9px] font-mono bg-bg-subtle text-text-secondary px-1.5 py-0.5 rounded-sm uppercase">
                              {doc.docSpecialty}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary">{doc.qualification}</p>
                          <p className="text-[11px] text-text-tertiary mt-1">★ {doc.rating} ({doc.reviews} verified reviews)</p>
                        </div>
                      </div>

                      {/* Day tabs and slot options */}
                      <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                        <div className="text-right text-xs font-mono font-bold text-text-primary">
                          Fee: ₹{doc.fee}
                        </div>
                        
                        <div className="flex gap-2">
                          {["Today", "Tomorrow", "Wednesday"].map((day) => (
                            <button
                              key={day}
                              onClick={() => {
                                setSelectedDoctor(doc);
                                setSelectedDayTab(day);
                                setSelectedSlot(day === "Today" ? "4:00 PM" : "11:00 AM");
                                setBookingStep(3);
                              }}
                              className="px-3 py-1.5 bg-bg-base hover:bg-text-primary hover:text-bg-base border border-border-base text-[11px] font-mono rounded-sm transition-all cursor-pointer"
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bookingStep === 3 && selectedDoctor && (
              <div className="space-y-6">
                <button 
                  onClick={() => setBookingStep(2)}
                  className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back to Doctor Selection
                </button>

                <div className="bg-bg-surface border border-border-dim p-6 rounded-sm space-y-6">
                  <h3 className="text-base font-semibold text-text-primary border-b border-border-dim pb-3">
                    Verify Final Slot Reservations
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-3">
                      <div>
                        <span className="text-text-tertiary block font-mono text-[10px] uppercase">Specialist Physician</span>
                        <strong className="text-sm text-text-primary block mt-0.5">{selectedDoctor.name}</strong>
                        <span className="text-text-secondary block mt-0.5">{selectedDoctor.qualification}</span>
                      </div>

                      <div>
                        <span className="text-text-tertiary block font-mono text-[10px] uppercase">Department Unit</span>
                        <span className="font-semibold text-text-primary block mt-0.5">{selectedSpecialty}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-text-tertiary block font-mono text-[10px] uppercase">Reserved Slot Time</span>
                        <strong className="text-sm text-status-warning font-mono block mt-0.5">
                          {selectedDayTab === "Today" ? "Today" : selectedDayTab} @ {selectedSlot}
                        </strong>
                      </div>

                      <div>
                        <span className="text-text-tertiary block font-mono text-[10px] uppercase">Premium Cost</span>
                        <span className="font-mono font-semibold text-text-primary block mt-0.5 text-base">
                          ₹{selectedDoctor.fee}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-border-dim">
                    <label className="text-[10px] font-sans font-semibold tracking-wider text-text-secondary uppercase">
                      Please state any active complaints or reference notes:
                    </label>
                    <textarea
                      value={visitReason}
                      onChange={(e) => setVisitReason(e.target.value)}
                      placeholder="e.g., Blood pressure spikes and persistent morning headband pressure. Previous prescription Atorvastatin 10mg."
                      className="w-full h-24 bg-bg-base text-text-primary border border-border-base rounded-sm p-3 text-xs focus:outline-none focus:border-text-primary font-sans"
                    />
                  </div>

                  <div className="pt-4 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-text-tertiary italic">
                      Locked securely under local clinic allocation rules.
                    </span>
                    <button
                      onClick={handleConfirmBooking}
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-text-primary text-bg-base hover:opacity-90 font-semibold text-xs rounded-sm transition-opacity flex items-center gap-1.5 cursor-pointer"
                    >
                      {isLoading ? "Locking slot..." : "Confirm & Lock Slot"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {bookingStep === 4 && bookingSuccessData && (
              <div className="bg-bg-surface border border-border-dim p-8 rounded-sm text-center max-w-md mx-auto space-y-6">
                <div className="w-12 h-12 rounded-full bg-status-safe/10 border border-status-safe/30 text-status-safe flex items-center justify-center mx-auto">
                  <CheckCircle size={24} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-text-primary">Appointment Locked!</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Confirmed — {bookingSuccessData.doctorName}, {bookingSuccessData.time} today. We sent secure confirmation credentials to your registered WhatsApp dossier.
                  </p>
                </div>

                <div className="p-4 bg-bg-base border border-border-dim rounded-sm text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Consultant ID:</span>
                    <span className="font-mono text-text-primary font-bold">{bookingSuccessData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Location:</span>
                    <span className="text-text-primary font-semibold">{bookingSuccessData.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Amount Due:</span>
                    <span className="text-text-primary font-mono font-bold">₹{bookingSuccessData.valueInr}</span>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setBookingStep(1);
                      setSelectedSpecialty("");
                      setSelectedDoctor(null);
                      setSelectedSlot("");
                      setBookingSuccessData(null);
                      setVisitReason("");
                    }}
                    className="flex-1 py-2 text-xs font-semibold border border-border-base hover:border-text-primary rounded-sm transition-all"
                  >
                    Book Another
                  </button>
                  <button
                    onClick={() => onNavigateToView("dashboard")}
                    className="flex-1 py-2 text-xs font-semibold bg-text-primary text-bg-base hover:opacity-90 rounded-sm transition-all"
                  >
                    View Timeline
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* VIEW 3: PATIENT HEALTH DASHBOARD OVERVIEW */}
        {currentSubView === "dashboard" && (
          <div className="p-4 sm:p-5 md:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
            {/* Upper profile KPI section */}
            <div className="bg-bg-surface border border-border-dim p-4 md:p-6 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-bg-subtle border border-border-base flex items-center justify-center text-text-primary font-serif italic text-lg font-medium shrink-0">
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-text-primary">{patient.name}</h2>
                  <p className="text-[10px] text-text-secondary font-mono">#{patient.id} · Member Nov 2024</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="p-3 bg-bg-base border border-border-dim rounded-sm">
                  <span className="text-text-tertiary block font-mono text-[9px] uppercase">GENDER / AGE</span>
                  <strong className="text-text-primary block mt-0.5">{patient.gender} / {patient.age}y</strong>
                </div>
                <div className="p-3 bg-bg-base border border-border-dim rounded-sm">
                  <span className="text-text-tertiary block font-mono text-[9px] uppercase">HEALTH METRICS</span>
                  <strong className="text-text-primary block mt-0.5">{appointmentsList.filter(a => a.status === "completed").length} completes</strong>
                </div>
                <div className="p-3 bg-bg-base border border-border-dim rounded-sm">
                  <span className="text-text-tertiary block font-mono text-[9px] uppercase">DISTANCE RANGE</span>
                  <strong className="text-text-primary block mt-0.5">{patient.distanceKm} km</strong>
                </div>
              </div>
            </div>

            {/* DASHBOARD GRIDS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT MAJOR HAND SIDE: Active reports and cards */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* 1. UPCOMING CLINIC CARD IF EXISTS */}
                <div className="p-5 bg-bg-surface border border-border-dim rounded-sm space-y-4">
                  <span className="text-[10px] font-mono tracking-widest text-text-secondary uppercase block border-b border-border-dim pb-2">
                    ACTIVE APPOINTMENTS OR TIMELINE ACTIONS
                  </span>

                  <div className="space-y-3">
                    {appointmentsList.filter(a => a.status === "upcoming").map((appt) => (
                      <div key={appt.id} className="p-4 bg-bg-base border border-border-base rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-text-primary">{appt.doctorName}</h4>
                            <span className="text-[9px] font-mono text-status-warning bg-status-warning/5 border border-status-warning/20 px-1.5 py-0.5 rounded-sm uppercase">
                              Upcoming Block
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary">{appt.specialty} · City Specialist Location</p>
                          <p className="text-[11px] text-text-tertiary italic">Reason: "{appt.reason}"</p>
                        </div>
                        <div className="flex flex-row md:flex-col items-end gap-2 shrink-0">
                          <span className="text-xs font-mono font-bold text-text-primary">{appt.date} · {appt.time}</span>
                          <button 
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="text-[11px] font-mono text-status-danger hover:underline cursor-pointer"
                          >
                            Cancel Allocation
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. RECENT VERIFIED PRESCRIPTIONS */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-sans font-semibold tracking-wider text-text-secondary uppercase px-1">
                      Recent Prescribed Dosages:
                    </span>
                    <button 
                      onClick={() => onNavigateToView("prescriptions")} 
                      className="text-xs text-text-primary hover:underline font-semibold"
                    >
                      View All Receipts
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prescriptionsList.slice(0, 2).map((rx) => (
                      <div 
                        key={rx.id}
                        onClick={() => {
                          setSelectedPrescription(rx);
                          onNavigateToView("prescriptions");
                        }}
                        className="bg-bg-surface border border-border-dim hover:border-text-primary p-5 rounded-sm space-y-4 cursor-pointer group transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono text-text-tertiary">RX SHEET #{rx.id}</span>
                            <h4 className="text-xs font-bold text-text-primary mt-1 group-hover:text-text-primary">{rx.diagnosis}</h4>
                          </div>
                          <span className="text-[10px] font-mono bg-bg-base border border-border-base text-text-secondary px-2 py-0.5 rounded-sm">
                            {rx.medicines.length} medicines
                          </span>
                        </div>

                        <div className="space-y-1">
                          {rx.medicines.map((med, mIdx) => (
                            <div key={mIdx} className="flex justify-between text-xs">
                              <span className="text-text-secondary">{med.name} ({med.strength})</span>
                              <span className="font-mono text-text-primary">{med.dosage}</span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-border-dim pt-3 flex justify-between items-center text-[10px] font-mono text-text-tertiary">
                          <span>DOCTOR: {rx.doctorName}</span>
                          <span className="text-text-primary font-bold">{rx.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. LAB REPORTS TABLE LIST */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-sans font-semibold tracking-wider text-text-secondary uppercase px-1">
                      Recent Lab Analysis Reports:
                    </span>
                    <button 
                      onClick={() => onNavigateToView("labs")} 
                      className="text-xs text-text-primary hover:underline font-semibold"
                    >
                      View Report List
                    </button>
                  </div>

                  <div className="bg-bg-surface border border-border-dim rounded-sm overflow-hidden text-xs">
                    {/* Header row */}
                    <div className="hidden sm:grid grid-cols-12 p-3 bg-bg-subtle text-text-tertiary font-mono tracking-wider border-b border-border-dim text-[10px] uppercase">
                      <div className="col-span-3">DATE</div>
                      <div className="col-span-5">REPORT</div>
                      <div className="col-span-2 text-center">STATUS</div>
                      <div className="col-span-2 text-right">ACTION</div>
                    </div>

                    <div className="divide-y divide-border-dim">
                      {labsList.slice(0, 3).map((lab) => (
                        <div key={lab.id} className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-bg-subtle/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-text-primary text-xs truncate">{lab.name}</p>
                            <p className="font-mono text-[10px] text-text-secondary mt-0.5">{lab.date}</p>
                          </div>
                          <div className="shrink-0">
                            {lab.status === "normal" ? (
                              <span className="text-[10px] font-mono text-status-safe bg-status-safe/5 border border-status-safe/25 px-2 py-0.5 rounded-sm">
                                Normal ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-status-warning bg-status-warning/5 border border-status-warning/20 px-1.5 py-0.5 rounded-sm">
                                Review •
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setActiveLabReport(lab);
                              onNavigateToView("labs");
                            }}
                            className="text-text-primary hover:underline font-semibold font-mono text-[10px] shrink-0"
                          >
                            Analyze
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT SUB-BAR COLUMN: Vertical health timeline visualization */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* TIMELINE PREVIEW */}
                <div className="bg-bg-surface border border-border-dim p-5 rounded-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono tracking-widest text-text-secondary uppercase block">
                      Health Timeline Status
                    </span>
                    <button 
                      onClick={() => onNavigateToView("timeline")}
                      className="text-[10px] font-mono text-text-primary hover:underline cursor-pointer"
                    >
                      Detail Flow
                    </button>
                  </div>

                  <div className="relative pl-4 border-l border-border-base space-y-5 py-2">
                    {timelineList.slice(0, 4).map((record, rIdx) => (
                      <div key={rIdx} className="relative text-xs">
                        <div className={`absolute -left-[20.5px] top-1.5 w-[10px] h-[10px] rounded-full border ${
                          record.status === "upcoming" ? "bg-status-warning border-status-warning" : "bg-text-secondary border-text-tertiary"
                        }`} />
                        <span className="text-[9px] font-mono text-text-tertiary block">{record.date}</span>
                        <h5 className="font-bold text-text-primary mt-0.5">{record.label}</h5>
                        <p className="text-[11px] text-text-secondary mt-0.5">{record.doctor}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HIGHLIGHTED TARGET PARAMETER */}
                <div className="p-5 bg-bg-surface border border-border-dim rounded-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono tracking-widest text-text-secondary uppercase block">Active Lipid Sweep</span>
                    <span className="text-[10px] font-mono text-status-danger">High Trend</span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-3xl font-mono text-text-primary font-bold">
                      142 <span className="text-xs text-text-secondary">mg/dL</span>
                    </div>
                    <div>
                      <span className="text-text-secondary text-xs block">LDL Cholesterol Parameter</span>
                      <p className="text-[11px] text-text-tertiary mt-1 leading-relaxed">
                        Fasting panel monitored on January 8. Clinical SOP guideline threshold is &lt;130 mg/dL. Dr. Sharma ordered Atorvastatin 10mg follow-up review.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* VIEW 4: PRESCRIPTION LIST & DETAIL TARGETS */}
        {currentSubView === "prescriptions" && (
          <div className="p-4 sm:p-5 md:p-8 max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in animate-slide-up">
            <div>
              <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-text-primary">
                Verified Prescriptions
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                MCI certified documents under your healthcare dossier
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left hand list */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-[10px] font-sans font-semibold tracking-wider text-text-secondary uppercase px-1 block">
                  Select Recipe to Inspect:
                </span>

                <div className="space-y-3">
                  {prescriptionsList.map((rx) => (
                    <button
                      key={rx.id}
                      onClick={() => setSelectedPrescription(rx)}
                      className={`w-full text-left p-4 bg-bg-surface border rounded-sm space-y-2 transition-all block cursor-pointer outline-none ${
                        selectedPrescription?.id === rx.id ? "border-text-primary bg-bg-subtle" : "border-border-dim hover:border-text-primary"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold text-text-secondary">#{rx.id}</span>
                        <span className="text-[10px] font-mono text-text-tertiary">{rx.date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-text-primary">{rx.diagnosis}</h4>
                      <div className="flex gap-1 flex-wrap mt-2">
                        {rx.medicines.map((m, mIdx) => (
                          <span key={mIdx} className="text-[9px] font-mono bg-bg-base border border-border-base px-1.5 py-0.5 text-text-secondary rounded-sm">
                            {m.name}
                          </span>
                        ))}
                      </div>
                      <div className="pt-2 text-[10px] font-mono text-text-tertiary flex justify-between">
                        <span>BY: {rx.doctorName}</span>
                        <span className="text-text-primary">{rx.specialty}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right hand detail panel */}
              <div className="lg:col-span-7">
                {selectedPrescription ? (
                  <div className="bg-bg-surface border border-border-dim p-6 rounded-sm space-y-6">
                    
                    {/* Header receipt card */}
                    <div className="flex justify-between items-start border-b border-border-dim pb-4">
                      <div>
                        <span className="text-[10px] font-mono text-text-tertiary">MCI SECURE MEDICAL FILE</span>
                        <h3 className="text-base font-bold text-text-primary mt-1">Prescription Receipt</h3>
                        <p className="text-xs text-text-secondary">{selectedPrescription.doctorName} · {selectedPrescription.specialty}</p>
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={selectedPrescription.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 border border-border-base hover:border-text-primary rounded-sm text-text-secondary hover:text-text-primary transition-all text-xs flex items-center gap-1 font-sans"
                        >
                          <Download size={13} />
                        </a>
                        <button 
                          onClick={() => alert("Credentials link copied, ready to share on WhatsApp.")}
                          className="p-1.5 border border-border-base hover:border-text-primary rounded-sm text-text-secondary hover:text-text-primary transition-all text-xs"
                        >
                          <Share2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Metadata details block */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-text-tertiary block font-mono text-[9px] uppercase">DIAGNOSIS</span>
                        <strong className="text-text-primary block mt-0.5">{selectedPrescription.diagnosis}</strong>
                      </div>
                      <div>
                        <span className="text-text-tertiary block font-mono text-[9px] uppercase">REGISTRATION</span>
                        <span className="text-text-secondary font-mono block mt-0.5">MCIDL/70410</span>
                      </div>
                    </div>

                    {/* Medicines section */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono tracking-widest text-text-secondary uppercase block">
                        Prescribed Medicines:
                      </span>

                      <div className="space-y-3">
                        {selectedPrescription.medicines.map((med: any, mIdx: number) => (
                          <div key={mIdx} className="p-4 bg-bg-base border border-border-dim rounded-sm space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-bold text-text-primary">{med.name} ({med.strength})</h4>
                                <span className="text-[11px] text-text-secondary block font-mono mt-0.5">Duration: {med.duration || `${med.durationDays} days`}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <span className="font-mono bg-bg-subtle text-text-primary border border-border-base px-2.5 py-1 rounded-sm uppercase tracking-wider">
                                  {med.dosage}
                                </span>
                              </div>
                            </div>

                            {/* DOSAGE ROUTINE CIRCLES/DOTS */}
                            <div className="flex items-center gap-4 text-xs font-mono text-text-tertiary">
                              <div className="flex gap-1.5 items-center">
                                <span className={`w-2 h-2 rounded-full ${med.dosage.startsWith("1") ? "bg-text-primary" : "border border-border-base bg-transparent"}`} />
                                <span>Morning</span>
                              </div>
                              <div className="flex gap-1.5 items-center">
                                <span className={`w-2 h-2 rounded-full ${med.dosage.includes("-1-") ? "bg-text-primary" : "border border-border-base bg-transparent"}`} />
                                <span>Afternoon</span>
                              </div>
                              <div className="flex gap-1.5 items-center">
                                <span className={`w-2 h-2 rounded-full ${med.dosage.endsWith("1") ? "bg-text-primary" : "border border-border-base bg-transparent"}`} />
                                <span>Bedtime</span>
                              </div>
                            </div>

                            <p className="text-xs text-text-secondary italic mt-2 border-t border-border-dim pt-2">
                              Instructions: "{med.instructions}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Follow-up directive details */}
                    <div className="p-4 bg-bg-subtle border border-border-base rounded-sm flex justify-between items-center text-xs">
                      <div>
                        <span className="text-text-tertiary font-mono block text-[9px] uppercase">RECOMMENDED RE-EXAMINATION</span>
                        <strong className="text-text-primary uppercase font-mono mt-0.5">{selectedPrescription.followUpDate}</strong>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSpecialty(selectedPrescription.specialty);
                          setBookingStep(1);
                          onNavigateToView("book");
                        }}
                        className="px-3 py-1.5 bg-text-primary text-bg-base hover:opacity-90 font-semibold text-[11px] rounded-sm transition-all cursor-pointer"
                      >
                        Book Follow-up
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-bg-surface border border-border-dim p-8 rounded-sm text-center py-20">
                    <p className="text-xs text-text-secondary">Please select a prescription block from the list on the left to review ingredients and dosage guidelines.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* VIEW 5: LAB RESULTS & DRAWER PARAMETERS */}
        {currentSubView === "labs" && (
          <div className="p-4 sm:p-5 md:p-8 max-w-6xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-text-primary">
                  Clinical Lab Reports
                </h1>
                <p className="text-xs text-text-secondary mt-1">
                  Biochemical measurements with grounded diagnostic range comparisons
                </p>
              </div>

              {/* Filtering pill bar — scrollable on tiny screens */}
              <div className="flex gap-1.5 bg-bg-surface p-1 rounded-sm border border-border-dim overflow-x-auto">
                {["all", "normal", "review"].map((filt) => (
                  <button
                    key={filt}
                    onClick={() => setLabsFilter(filt)}
                    className={`px-2.5 py-1.5 text-xs font-mono uppercase rounded-sm border transition-all whitespace-nowrap ${
                      labsFilter === filt 
                        ? "bg-text-primary text-bg-base border-text-primary font-bold" 
                        : "text-text-secondary border-transparent hover:text-text-primary"
                    }`}
                  >
                    {filt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Table Report List */}
              <div className="lg:col-span-7 bg-bg-surface border border-border-dim rounded-sm overflow-hidden text-xs">
                <div className="hidden sm:grid grid-cols-12 p-3 bg-bg-subtle text-text-tertiary font-mono border-b border-border-dim">
                  <div className="col-span-3">DATE</div>
                  <div className="col-span-5">TEST DESCRIPTION</div>
                  <div className="col-span-2 text-center">SAFETY</div>
                  <div className="col-span-2 text-right">ACTION</div>
                </div>

                <div className="divide-y divide-border-dim">
                  {labsList
                    .filter(l => labsFilter === "all" || l.status === labsFilter)
                    .map((report) => (
                      <div 
                        key={report.id} 
                        className={`flex flex-col sm:grid sm:grid-cols-12 p-4 gap-3 sm:gap-0 items-start sm:items-center transition-colors ${
                          activeLabReport?.id === report.id ? "bg-bg-subtle" : "hover:bg-bg-subtle/50"
                        }`}
                      >
                        <div className="col-span-3 font-mono text-text-secondary text-[11px] sm:text-xs">{report.date}</div>
                        <div className="col-span-5 w-full">
                          <h4 className="font-bold text-text-primary block text-xs sm:text-xs">{report.name}</h4>
                          <span className="text-[10px] text-text-tertiary mt-0.5 block">BY: {report.orderedBy}</span>
                        </div>
                        <div className="col-span-2 text-left sm:text-center">
                          {report.status === "normal" ? (
                            <span className="text-[10px] font-mono text-status-safe bg-status-safe/5 border border-status-safe/25 px-2 py-0.5 rounded-sm lowercase">
                              Normal ✓
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-status-warning bg-status-warning/5 border border-status-warning/22 px-1.5 py-0.5 rounded-sm lowercase">
                              Review •
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 text-right w-full sm:w-auto">
                          <button
                            onClick={() => setActiveLabReport(report)}
                            className="w-full sm:w-auto text-center px-2.5 py-1.5 sm:py-1 border border-border-base hover:border-text-primary font-mono font-semibold text-[11px] rounded-sm transition-all cursor-pointer"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Side Drawer Parameter Panel */}
              <div className="lg:col-span-5">
                {activeLabReport ? (
                  <div className="bg-bg-surface border border-border-dim p-5 rounded-sm space-y-6">
                    <div className="flex justify-between items-start border-b border-border-dim pb-4">
                      <div>
                        <span className="text-[10px] font-mono text-text-tertiary">DETAIL CLINICAL REPORT</span>
                        <h3 className="text-base font-bold text-text-primary mt-1">{activeLabReport.name}</h3>
                        <p className="text-xs text-text-secondary">Ordered by {activeLabReport.orderedBy} on {activeLabReport.date}</p>
                      </div>
                      <a 
                        href={activeLabReport.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 border border-border-base hover:border-text-primary rounded-sm text-text-secondary"
                      >
                        <Download size={13} />
                      </a>
                    </div>

                    {/* Parameters Results Table */}
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-12 font-mono text-text-tertiary text-[10px] uppercase border-b border-border-dim pb-1">
                        <div className="col-span-5">BIOPARAMETER</div>
                        <div className="col-span-3 text-right">VALUE</div>
                        <div className="col-span-4 text-right">REF RANGE</div>
                      </div>

                      <div className="divide-y divide-border-dim">
                        {activeLabReport.results.map((res: any, rIdx: number) => (
                          <div key={rIdx} className="grid grid-cols-12 py-2.5 items-center">
                            <div className="col-span-5 text-text-secondary font-medium">{res.param}</div>
                            <div className="col-span-3 text-right font-mono font-semibold text-text-primary">
                              <span className={res.status === "high" ? "text-status-danger font-bold" : ""}>
                                {res.value} <span className="text-[10px] font-sans text-text-tertiary">{res.unit}</span>
                              </span>
                            </div>
                            <div className="col-span-4 text-right font-mono text-text-tertiary">{res.range}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Clinical AI Hook connection link */}
                    <div className="p-4 bg-bg-subtle border border-border-base rounded-sm space-y-2">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-text-primary uppercase tracking-wider font-mono">
                        <Sparkles size={11} className="text-status-warning" />
                        <span>Interactive AI Grounding</span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        Curious about what your {activeLabReport.name} measurements signify regarding Stage 1 cardiovascular health? Discuss securely.
                      </p>
                      <button 
                        onClick={() => {
                          setAskInput(`Can you explain the biochemical results of my ${activeLabReport.name} dated ${activeLabReport.date}? Specifically highlight LDL Cholesterol values.`);
                          onNavigateToView("ask");
                        }}
                        className="text-xs font-semibold text-text-primary hover:underline flex items-center gap-0.5 mt-1"
                      >
                        Ask AI Assistant about this Report <ArrowRight size={12} />
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-bg-surface border border-border-dim p-8 rounded-sm text-center py-20">
                    <p className="text-xs text-text-secondary">Please click "Inspect" on one of the historical lab listings to display full chemical metrics and reference ranges.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* VIEW 6: HEALTH TIMELINE INTERACTIVE */}
        {currentSubView === "timeline" && (
          <div className="p-4 sm:p-5 md:p-8 max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-text-primary">
                  Health Timeline
                </h1>
                <p className="text-xs text-text-secondary mt-1">
                  Chronological view of appointments, prescriptions, and tests
                </p>
              </div>

              {/* Timeline filter pills — scrollable on mobile */}
              <div className="flex gap-1.5 bg-bg-surface p-1 rounded-sm border border-border-dim overflow-x-auto">
                {["all", "appointment", "prescription", "lab"].map((filt) => (
                  <button
                    key={filt}
                    onClick={() => setTimelineFilter(filt)}
                    className={`px-2 md:px-3 py-1 text-xs font-mono uppercase rounded-sm border transition-all whitespace-nowrap ${
                      timelineFilter === filt 
                        ? "bg-text-primary text-bg-base border-text-primary font-bold" 
                        : "text-text-secondary border-transparent hover:text-text-primary"
                    }`}
                  >
                    {filt === "all" ? "All" : `${filt}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline content list view */}
            <div className="bg-bg-surface border border-border-dim p-4 md:p-6 rounded-sm">
              <div className="relative pl-6 border-l border-border-base space-y-8 py-2">
                {timelineList
                  .filter(item => timelineFilter === "all" || item.type === timelineFilter)
                  .map((evt, idx) => (
                    <div key={idx} className="relative text-xs group">
                      
                      {/* Interactive chron dots */}
                      <div className={`absolute -left-[30.5px] top-1.5 w-[10px] h-[10px] rounded-full border transition-all ${
                        evt.status === "upcoming" 
                          ? "bg-status-warning border-status-warning ring-2 ring-status-warning/10" 
                          : "bg-text-secondary border-text-tertiary"
                      }`} />

                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 max-w-3xl">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-text-tertiary">{evt.date}</span>
                            <span className={`text-[9px] font-mono border px-1.5 py-0.2 uppercase rounded / ${
                              evt.type === "appointment" 
                                ? "border-status-info/20 text-status-info bg-status-info/5" 
                                : evt.type === "prescription" 
                                ? "border-status-safe/25 text-status-safe bg-status-safe/5" 
                                : "border-status-warning/22 text-status-warning bg-status-warning/5"
                            }`}>
                              {evt.type}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-text-primary mt-1.5">{evt.label}</h4>
                          <p className="text-xs text-text-secondary mt-0.5">Assigned Provider: {evt.doctor} / Sector 12 Area Clinic</p>
                        </div>

                        <div className="flex gap-2 shrink-0 self-start md:self-auto mt-2 md:mt-0">
                          {evt.type === "prescription" && (
                            <button
                              onClick={() => {
                                setSelectedPrescription(prescriptionsList[0]);
                                onNavigateToView("prescriptions");
                              }}
                              className="px-2.5 py-1 bg-bg-base border border-border-base hover:border-text-primary rounded-sm transition-all text-[11px]"
                            >
                              Inspect Rx
                            </button>
                          )}
                          {evt.type === "lab" && (
                            <button
                              onClick={() => {
                                setActiveLabReport(labsList[0]);
                                onNavigateToView("labs");
                              }}
                              className="px-2.5 py-1 bg-bg-base border border-border-base hover:border-text-primary rounded-sm transition-all text-[11px]"
                            >
                              Explore Metrics
                            </button>
                          )}
                          {evt.type === "appointment" && evt.status === "upcoming" && (
                            <button
                              onClick={() => handleCancelAppointment("A-8821")}
                              className="px-2.5 py-1 border border-border-base hover:border-status-danger hover:text-status-danger rounded-sm transition-all text-[11px]"
                            >
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 7: AI HEALTH ASSISTANT GROUNDED CONSULT */}
        {currentSubView === "ask" && (
          <div className="p-4 sm:p-5 md:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in font-sans">
            <div>
              <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-text-primary">
                AI Health Assistant
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Grounded on your medical history, prescriptions and test results.
              </p>
            </div>

            {/* Context grounding banner */}
            <div className="p-3 bg-bg-subtle border border-border-base rounded-sm flex flex-wrap gap-2 items-center justify-between text-xs text-text-secondary">
              <span className="flex items-center gap-1.5 font-semibold text-text-primary tracking-wider uppercase text-[10px] shrink-0">
                <ShieldCheck size={13} className="text-status-safe animate-pulse-dot shrink-0" />
                Dataset Grounded (Jan 15)
              </span>
              <span className="text-[10px] text-right">DPDP Certified · CITY-DL-01</span>
            </div>

            {/* MODE BADGE — AI Assistant tab */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-subtle border border-border-base rounded-sm">
              <span className="h-2 w-2 rounded-full bg-status-warning animate-pulse shrink-0" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
                {sharedMode === 'real' ? 'REAL TALK — Live AI Q&A (Vercel AI Gateway)' : 'SIMULATION — Mock Q&A Response'}
              </span>
              <button
                onClick={() => setSharedMode(prev => prev === 'real' ? 'simulation' : 'real')}
                className="ml-auto text-[10px] font-mono uppercase tracking-widest text-text-primary hover:underline shrink-0"
              >
                Switch to {sharedMode === 'real' ? 'Simulation' : 'Real Talk'}
              </button>
            </div>

            {/* Main layout: chat on top, sidebar below on mobile; side-by-side on lg */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
              
              {/* Main Dialogue Box — natural height on mobile, fixed on desktop */}
              <div className="lg:col-span-8 bg-bg-surface border border-border-dim rounded-sm flex flex-col overflow-hidden" style={{ height: "min(580px, 70vh)" }}>
                
                {/* Chat header */}
                <div className="p-3 border-b border-border-dim bg-bg-subtle flex flex-wrap gap-2 justify-between items-center text-xs text-text-tertiary shrink-0">
                  <span className="text-[10px]">Chat · Priya Mehta's file context</span>
                  <button 
                    onClick={() => setAskMessages([{ role: "ai", content: "Chat cleared. Ask me any question about your active medicines or lipid panel results.", timestamp: "Now" }])}
                    className="text-[10px] font-mono uppercase bg-bg-base border border-border-base px-2 py-0.5 rounded-sm hover:text-text-primary whitespace-nowrap"
                  >
                    Clear chat
                  </button>
                </div>

                {/* Bubble list — scrollable */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
                  {askMessages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {/* Bubble row — capped width, items never overflow */}
                      <div className={`flex gap-2 min-w-0 max-w-[92%] sm:max-w-[82%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        
                        {msg.role === "ai" && (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm bg-text-primary text-bg-base flex items-center justify-center text-[9px] font-bold shrink-0 uppercase mt-0.5">
                            AI
                          </div>
                        )}

                        {/* Bubble content — min-w-0 forces text to wrap instead of overflow */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div 
                            className={`p-3 rounded-sm text-xs leading-relaxed border break-words min-w-0 ${
                              msg.role === "user" 
                                ? "bg-text-primary text-bg-base border-text-primary" 
                                : "bg-bg-subtle text-text-primary border-border-dim"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                            {/* Grounding Source Badge — wraps on narrow screens */}
                            {msg.role === "ai" && !msg.isStreaming && (
                              <div className="mt-2 text-[9px] font-mono text-text-tertiary flex flex-wrap items-center gap-1 bg-bg-base border border-border-base px-2 py-0.5 rounded-sm">
                                <Info size={10} className="text-text-secondary shrink-0" />
                                <span className="break-all">Source: prescription RX-441 &amp; Lipid results (LAB-202)</span>
                              </div>
                            )}
                          </div>
                          
                          <span className="text-[9px] font-mono text-text-tertiary block text-right">{msg.timestamp}</span>
                        </div>

                      </div>
                    </div>
                  ))}

                  {isAskTyping && (
                    <div className="flex justify-start">
                      <div className="flex gap-2 max-w-[82%]">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm bg-text-primary text-bg-base flex items-center justify-center text-[9px] font-bold shrink-0 animate-pulse mt-0.5">
                          AI
                        </div>
                        <div className="p-3 bg-bg-subtle text-text-tertiary border border-border-dim rounded-sm text-xs">
                          <span className="shimmer block">Interpreting clinical references...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={askEndRef} />
                </div>

                {/* Input block */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAsk(askInput);
                  }}
                  className="p-3 border-t border-border-dim bg-bg-surface flex gap-2 shrink-0"
                >
                  <input 
                    type="text"
                    value={askInput}
                    onChange={(e) => setAskInput(e.target.value)}
                    placeholder="Ask about your medicines or test results..."
                    className="flex-1 min-w-0 bg-bg-base text-text-primary border border-border-base px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-text-primary font-sans placeholder-text-tertiary"
                  />
                  <button 
                    type="submit"
                    className="p-2.5 bg-text-primary text-bg-base hover:opacity-95 rounded-sm shrink-0 cursor-pointer"
                  >
                    <Send size={13} />
                  </button>
                </form>

              </div>

              {/* RIGHT: Suggested questions + safety note */}
              <div className="lg:col-span-4 space-y-3">
                <span className="text-[10px] font-sans font-semibold tracking-wider text-text-secondary uppercase block">
                  Suggested Questions:
                </span>

                {/* On mobile: horizontal scrollable pills */}
                <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:gap-0 lg:space-y-2">
                  {[
                    "What does my Lipid Panel mean?",
                    "When to take Atorvastatin 10mg?",
                    "Is my hypertension stable?",
                    "Dr. Sharma's lifestyle instructions?"
                  ].map((qst, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendAsk(qst)}
                      className="shrink-0 lg:shrink lg:w-full text-left p-2.5 sm:p-3 bg-bg-surface border border-border-dim hover:border-text-primary rounded-sm text-xs text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer whitespace-nowrap lg:whitespace-normal"
                    >
                      {qst}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-bg-subtle border border-border-base rounded-sm text-xs text-text-tertiary space-y-1.5 leading-relaxed">
                  <span className="text-[10px] font-mono uppercase font-bold text-text-primary block">⚠ Safety Note</span>
                  <p className="text-[10px] leading-normal">
                    This AI assistant doesn't replace emergency care. For chest pain or emergencies, visit City Hospital immediately.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
