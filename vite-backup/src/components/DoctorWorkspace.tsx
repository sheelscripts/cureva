import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Mic, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  ChevronRight, 
  FileText, 
  Download,
  Plus,
  Trash2,
  X,
  Printer,
  ChevronLeft,
  Search,
  Check,
  Send,
  Sliders,
  Calendar,
  Clock,
  ExternalLink,
  Shield,
  BookOpen,
  Info,
  Volume2,
  Lock,
  PlusCircle
} from "lucide-react";

import { 
  currentDoctor, 
  todayQueue, 
  patientProfiles, 
  drugDatabase, 
  slotSaverMetrics,
  QueueItem,
  PatientProfile
} from "../mock/doctor";

import AgentOperationsBar from "./AgentOperationsBar";

interface DoctorWorkspaceProps {
  currentSubView: string;
  resetTrigger?: number;
}

export default function DoctorWorkspace({ currentSubView, resetTrigger }: DoctorWorkspaceProps) {
  // Navigation & Drilldown State
  const [activeSubView, setActiveSubView] = useState<string>("home");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  // Update view mode if prop changes
  useEffect(() => {
    if (currentSubView) {
      setActiveSubView(currentSubView);
      // Reset selected patient drilldown when switching major views or resetting subviews
      if (currentSubView !== "scribe") {
        setSelectedPatientId(null);
      }
    }
  }, [currentSubView, resetTrigger]);

  // Sync internal view selector back for seamless deep linking
  const navigateTo = (view: string, patientId?: string) => {
    setActiveSubView(view);
    if (patientId) {
      setSelectedPatientId(patientId);
    } else {
      setSelectedPatientId(null);
    }
  };

  // Live Patient Queue State
  const [queue, setQueue] = useState<QueueItem[]>(todayQueue);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // AI Scribe State variables
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptLines, setTranscriptLines] = useState<Array<{ speaker: string; text: string; id: number }>>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [scrollLock, setScrollLock] = useState(true);
  const [scribeSpeed, setScribeSpeed] = useState(80); // ms per word simulation speed
  const [scribeAlert, setScribeAlert] = useState<string | null>(null);

  // SOAP Draft edits
  const [soapDraft, setSoapDraft] = useState({
    subjective: "",
    subjectiveSymptoms: [] as string[],
    objective: { bp: "", weight: "", heartRate: "", details: "" },
    assessment: "Hypertension Stage 1, Hyperlipidemia suspects",
    plan: "Initiate daily aspirin therapy, check lipid panel in 30 days."
  });

  // Prescription Writer State
  const [diagnosisTags, setDiagnosisTags] = useState<string[]>(["Hypertension Stage 1", "Hyperlipidemia"]);
  const [prescribedMeds, setPrescribedMeds] = useState<Array<{
    name: string;
    dosage: string;
    timing: string;
    durationDays: number;
    reason: string;
    instructions: string;
  }>>([
    {
      name: "Atorvastatin",
      dosage: "10mg",
      timing: "0-0-1",
      durationDays: 30,
      reason: "Hyperlipidemia check",
      instructions: "Take after dinner. Avoid grapefruit juice."
    }
  ]);
  const [drugSearch, setDrugSearch] = useState("");
  const [drugMatches, setDrugMatches] = useState<typeof drugDatabase>([]);
  const [testChips, setTestChips] = useState<string[]>(["Lipid Panel", "HbA1c Blood Panel"]);
  const [newTestName, setNewTestName] = useState("");
  const [dietInstructions, setDietInstructions] = useState("Low sodium Indian cuisine. Minimize starch. Brisk cardiac walking/telemetry for 30 min daily.");
  const [followUpDays, setFollowUpDays] = useState(30);
  
  // Custom Rx PDF simulation
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareChannel, setShareChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [isSendingPdf, setIsSendingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // AI Summary Card delay loading simulation
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState(
    "Priya Mehta shows a persistent upward trend in systolic and diastolic pressures. Lipids reveal high density cholesterol deficiencies. Monitor cardiovascular outcomes on statin baseline."
  );

  const handleRefreshSummary = () => {
    setIsRefreshingSummary(true);
    setTimeout(() => {
      setAiSummaryText(
        "AI Assessment parsed: Patient's BP has decreased by 8% over the past 3 consultations. Metabolic profile remains unstable with borderline high glucose trends. Strict active monitoring is indicated."
      );
      setIsRefreshingSummary(false);
      showToast("Clinical AI Summary successfully updated based on latest metrics.");
    }, 1200);
  };

  // Real-time transcript seed conversation chunks
  const scriptChunks = [
    { speaker: "Dr. Sharma", text: "Good morning Priya, thank you for coming in early. Let's talk about how your health has progressed." },
    { speaker: "Priya Mehta", text: "Good morning Dr. Sharma! I've been feeling okay, but I regular get this dull headache behind my forehead in the mornings." },
    { speaker: "Dr. Sharma", text: "Understood, morning fatigue headaches often represent silent pressure spikes. Let's read your blood pressure right away." },
    { speaker: "Dr. Sharma", text: "Okay, perfect. Your blood pressure reads as 138 over 88 mmHg. Your weight sits comfortably at 67 kilograms today." },
    { speaker: "Priya Mehta", text: "Oh, is that elevated? I am trying my best to stay on my low sodium diet, and keep my stress levels low." },
    { speaker: "Dr. Sharma", text: "It is Stage 1 Hypertension territory, Priya. Also, I looked over your laboratory results. Your LDL is quite high at 142. Most importantly, your HbA1c is ticking up, measuring at 5.9 percent which puts us at borderline pre-diabetes." },
    { speaker: "Priya Mehta", text: "I see, my grandmother had severe diabetes, should we start or adjust my medications?" },
    { speaker: "Dr. Sharma", text: "We will proceed caution. We'll continue your Atorvastatin 10mg once daily in the evenings. And I will add a low dose Aspirin 75mg once daily in the mornings to guard against cardiac stress." },
    { speaker: "Dr. Sharma", text: "Let's also order a lipid panel check and a fasting HbA1c screening inside 30 days to see how your metrics adjust." }
  ];

  // AI Scribe recording timer and streaming logic
  const streamTimerRef = useRef<number | null>(null);
  const secondsTimerRef = useRef<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript container
  useEffect(() => {
    if (scrollLock && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptLines, currentWordIndex, scrollLock]);

  // Audio timer ticker
  useEffect(() => {
    if (isRecording) {
      secondsTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (secondsTimerRef.current) {
        clearInterval(secondsTimerRef.current);
      }
    }
    return () => {
      if (secondsTimerRef.current) clearInterval(secondsTimerRef.current);
    };
  }, [isRecording]);

  const handleStartScribe = (appointmentId: string, patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveAppointmentId(appointmentId);
    navigateTo("scribe", patientId);

    // Initialise empty draft
    setTranscriptLines([]);
    setRecordingSeconds(0);
    setIsRecording(true);
    setScribeAlert(null);
    setSoapDraft({
      subjective: "Patient presented today with complaints of general wellness. Discussing system metrics...",
      subjectiveSymptoms: ["General Wellness"],
      objective: { bp: "Pending", weight: "-- kg", heartRate: "--", details: "Exam in progress." },
      assessment: "Awaiting clinical streaming transcription...",
      plan: "Pending active consult evaluation"
    });

    let chunkIndex = 0;
    
    // Simulate real speech to text chunk by chunk
    const triggerNextChunk = () => {
      if (chunkIndex < scriptChunks.length) {
        const chunk = scriptChunks[chunkIndex];
        const textWords = chunk.text.split(" ");
        let wordIdx = 0;
        
        // Add line immediately to render speaker tag
        const newLineId = Date.now() + chunkIndex;
        setTranscriptLines(prev => [...prev, { speaker: chunk.speaker, text: "", id: newLineId }]);

        // Stream word-by-word
        const wordTimer = window.setInterval(() => {
          if (wordIdx < textWords.length) {
            const compiledText = textWords.slice(0, wordIdx + 1).join(" ");
            setTranscriptLines(prev => prev.map(line => line.id === newLineId ? { ...line, text: compiledText } : line));
            wordIdx++;
          } else {
            clearInterval(wordTimer);
            
            // Apply semantic parser auto-fills as words complete
            if (chunkIndex === 1) {
              setSoapDraft(prev => ({
                ...prev,
                subjective: "Priya reports dull morning-onset headaches located in the forehead. Adhering loosely to low-sodium home inputs with minor stress factors.",
                subjectiveSymptoms: ["Morning Headaches", "Forehead dull tightness"]
              }));
            } else if (chunkIndex === 3) {
              setSoapDraft(prev => ({
                ...prev,
                objective: {
                  bp: "138/88",
                  weight: "67 kg",
                  heartRate: "74 bpm",
                  details: "BP is moderately elevated (Hypertension Stage 1). Weight stable. Extremities warm."
                }
              }));
              showToast("Clinically Extracted: BP measured 138/88 mmHg. Auto-filled.");
            } else if (chunkIndex === 5) {
              setSoapDraft(prev => ({
                ...prev,
                assessment: "Stage 1 Hypertension (uncontrolled), Hyperlipidemia trend, Prediabetes border risk (HbA1c 5.9%). Alert: Familial history of diabetes.",
              }));
              setScribeAlert("HbA1c mentioned (5.9%) — order Fasting glucose and HbA1c Panel.");
            } else if (chunkIndex === 7) {
              setSoapDraft(prev => ({
                ...prev,
                plan: "Continue Atorvastatin 10mg once daily after meals. Initiate low-dose Aspirin 75mg every morning. Stress hygiene."
              }));
            }

            chunkIndex++;
            // Schedule next speaker with small delay
            streamTimerRef.current = window.setTimeout(triggerNextChunk, 2000);
          }
        }, 80);
      } else {
        setIsRecording(false);
        showToast("Consultation transcription completes. Clinical SOAP note extracted.");
      }
    };

    // First delay
    streamTimerRef.current = window.setTimeout(triggerNextChunk, 1000);
  };

  const handleStopScribe = () => {
    setIsRecording(false);
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
    }
    showToast("Recording paused. Scribe notes synchronized.");
  };

  const formatAudioTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Medicine autocomplete search trigger
  const handleDrugSearch = (query: string) => {
    setDrugSearch(query);
    if (!query.trim()) {
      setDrugMatches([]);
      return;
    }
    const matching = drugDatabase.filter(d => 
      d.name.toLowerCase().includes(query.toLowerCase()) || 
      d.category.toLowerCase().includes(query.toLowerCase())
    );
    setDrugMatches(matching);
  };

  // Drug-Allergy & Drug-Drug checking rules
  const interactionWarnings = useMemo(() => {
    const currentPatient = selectedPatientId ? patientProfiles[selectedPatientId] : null;
    const warnings: string[] = [];

    if (!currentPatient) return warnings;

    // Check drug allergy conflict
    prescribedMeds.forEach(med => {
      currentPatient.allergies.forEach(allergy => {
        if (med.name.toLowerCase().includes(allergy.toLowerCase()) || 
            allergy.toLowerCase().includes(med.name.toLowerCase())) {
          warnings.push(`Drug Allergy Constraint: ${med.name} contradicts Patient Allergy listed as "${allergy}".`);
        }
      });
    });

    // Check drug-drug interaction (Aspirin + Ibuprofen / Warfarin + Aspirin)
    const activeNames = prescribedMeds.map(m => m.name.toLowerCase());
    if (activeNames.includes("aspirin") && activeNames.includes("ibuprofen")) {
      warnings.push("Interaction: Aspirin + Ibuprofen concurrent intake detected. Compounding irritation increases risk of acute gastrointestinal hemorrhage.");
    }
    if (activeNames.includes("warfarin") && activeNames.includes("aspirin")) {
      warnings.push("High Alert: Warfarin + Aspirin combined therapeutic actions increase bleeding indicators dramatically. Check INR weekly.");
    }

    return warnings;
  }, [prescribedMeds, selectedPatientId]);

  // Search filter
  const matchesArray = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const allPatients = Object.values(patientProfiles);
    if (!q) return allPatients;
    return allPatients.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.id.toLowerCase().includes(q) || 
      p.bloodGroup.toLowerCase().includes(q) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      p.allergies.some(a => a.toLowerCase().includes(q)) ||
      p.medicalHistory.some(m => m.condition.toLowerCase().includes(q)) ||
      p.currentMedications.some(m => m.name.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Add drug
  const selectSuggestion = (drug: typeof drugDatabase[0]) => {
    const freshMed = {
      name: drug.name,
      dosage: drug.strengths[0] || "10mg",
      timing: drug.commonDosage,
      durationDays: 30,
      reason: drug.category,
      instructions: drug.instructions
    };
    setPrescribedMeds(prev => [...prev, freshMed]);
    setDrugSearch("");
    setDrugMatches([]);
    showToast(`Added ${drug.name} therapy to active list.`);
  };

  const removeMed = (index: number) => {
    const name = prescribedMeds[index].name;
    setPrescribedMeds(prev => prev.filter((_, idx) => idx !== index));
    showToast(`Removed prescription for ${name}.`);
  };

  const addTestChip = () => {
    if (newTestName.trim()) {
      setTestChips(prev => [...prev, newTestName.trim()]);
      setNewTestName("");
    }
  };

  const removeTestChip = (indexValue: number) => {
    setTestChips(prev => prev.filter((_, idx) => idx !== indexValue));
  };

  // Trigger final prescription generator screen
  const loadPrescriptionWriter = () => {
    // Sync prefilled data from AI note assessment plans
    const assessmentTags = soapDraft.assessment ? soapDraft.assessment.split(",").map(s => s.trim()) : [];
    if (assessmentTags.length > 0) {
      setDiagnosisTags(assessmentTags);
    }
    navigateTo("prescription-writer");
  };

  const handleSendLivePdf = () => {
    setIsSendingPdf(true);
    setTimeout(() => {
      setIsSendingPdf(false);
      setShowShareModal(false);
      const activePatient = selectedPatientId ? patientProfiles[selectedPatientId] : patientProfiles["P-1042"];
      showToast(`Rx PDF dispatched perfectly to ${activePatient?.name} via ${shareChannel.toUpperCase()}!`);
    }, 1500);
  };

  // Patient detail selection
  const handleSelectPatientFull = (patientId: string) => {
    setSelectedPatientId(patientId);
    navigateTo("patient-360");
  };

  // Quick risk styling lookup
  const getRiskColor = (score: number | null) => {
    if (score === null || score < 0.40) return "text-text-tertiary";
    if (score < 0.65) return "text-status-warning";
    return "text-status-danger font-semibold";
  };

  const renderRiskBadge = (score: number | null) => {
    if (score === null) {
      return (
        <span className="bg-bg-subtle text-text-tertiary px-1.5 py-0.5 rounded-sm border border-border-dim text-[9.5px] font-mono select-none uppercase">
          Stable
        </span>
      );
    }
    const pct = (score * 100).toFixed(0);
    if (score >= 0.80) {
      return (
        <span className="bg-status-danger text-white px-2 py-0.5 rounded-xs font-bold uppercase tracking-wider text-[9.5px] inline-flex items-center gap-1 shadow-xs animate-pulse select-none">
          <span className="h-1.5 w-1.5 bg-white rounded-full animate-ping shrink-0" />
          🚨 Critical ({pct}%)
        </span>
      );
    }
    if (score >= 0.60) {
      return (
        <span className="bg-status-danger/10 text-status-danger border border-status-danger/25 px-1.5 py-0.5 rounded-xs font-semibold uppercase tracking-wider text-[9.5px] inline-flex items-center gap-1 select-none">
          <span>⚠️ High ({pct}%)</span>
        </span>
      );
    }
    if (score >= 0.40) {
      return (
        <span className="bg-status-warning/10 text-status-warning border border-status-warning/20 px-1.5 py-0.5 rounded-xs font-semibold uppercase tracking-wider text-[9.5px] inline-flex items-center gap-1 select-none">
          <span>⚡ Med ({pct}%)</span>
        </span>
      );
    }
    return (
      <span className="bg-bg-subtle text-text-secondary border border-border-dim/40 px-1.5 py-0.5 rounded-xs uppercase tracking-wider text-[9.5px] select-none text-[10px]">
        Low ({pct}%)
      </span>
    );
  };

  const renderActiveSubView = () => {
    switch (activeSubView) {
      case "home":
        return renderHomeOverview();
      case "queue":
        return renderQueueList();
      case "patients":
        return renderPatientDatabase();
      case "patient-360":
        return renderPatientDetailPage();
      case "notes":
        return renderClinicalNotesArchive();
      case "scribe":
        return renderLiveScribeScreen();
      case "prescription-writer":
      case "prescriptions":// Support both ID representations from Sidebar
        return renderPrescriptionWriterScreen();
      case "slotsaver":
        return renderSlotSaverDashboard();
      case "settings":
        return renderSettingsPage();
      default:
        return renderHomeOverview();
    }
  };

  // ==========================================
  // PAGE 1: DOCTOR HOME (Overview)
  // ==========================================
  function renderHomeOverview() {
    return (
      <div className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto bg-bg-base">
        {/* Dynamic Greeting Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-medium text-text-primary tracking-tight">
              Good morning, {currentDoctor.name}
            </h1>
            <p className="text-sm font-sans text-text-secondary mt-1">
              Monday, Jan 15 · <span className="font-mono text-xs">{queue.length}</span> consultations queued today
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-accent/5 border border-accent/20">
            <span className="h-2 w-2 rounded-full bg-status-safe animate-pulse" />
            <span className="text-xs font-mono text-accent uppercase tracking-wider font-semibold">
              Clinical Session active · {currentDoctor.clinicName}
            </span>
          </div>
        </div>

        {/* Live Autonomous OS Agent status monitor */}
        <AgentOperationsBar />

        {/* IBM-Dense KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs">
          <div>
            <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
              REVENUE PROTECTED THIS MONTH
            </span>
            <span className="text-3xl font-mono font-bold text-accent block mt-1.5">
              ₹42,000
            </span>
            <span className="text-[10px] font-sans text-status-safe flex items-center gap-1 mt-1">
              <span>↑ 12% vs last cycle</span>
            </span>
          </div>
          
          <div>
            <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
              PROTECTION RATE
            </span>
            <span className="text-3xl font-mono font-bold text-accent block mt-1.5">
              84%
            </span>
            <span className="text-[10px] font-sans text-status-safe flex items-center gap-1 mt-1">
              <span>Goal tier (80%+) met</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
              APPOINTMENTS TODAY
            </span>
            <span className="text-3xl font-mono font-bold text-accent block mt-1.5">
              12
            </span>
            <span className="text-[10px] font-sans text-text-secondary mt-1 block">
              4 processed · 8 awaiting
            </span>
          </div>

          <div>
            <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
              HIGH RISK FLAGGED
            </span>
            <span className="text-3xl font-mono font-bold text-status-danger block mt-1.5">
              3
            </span>
            <span className="text-[10px] font-sans text-text-tertiary mt-1 block">
              Requires immediate triage
            </span>
          </div>
        </div>

        {/* SlotSaver Critical Recovery Banner */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            {/* Active Recovery Block */}
            <div className="p-4 bg-status-safe/[0.02] border-l-2 border-status-safe rounded-sm border border-border-dim flex justify-between items-center relative overflow-hidden group">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-safe opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-safe"></span>
                </span>
                <div>
                  <h4 className="text-xs font-sans font-semibold text-text-primary uppercase tracking-wider">
                    SlotSaver Active Protection Session
                  </h4>
                  <p className="text-xs font-sans text-text-secondary mt-0.5">
                    Recovering the cancelled <span className="font-mono text-xs font-semibold">10:30 AM</span> slot — Alternative patient Priya contacted <span className="font-mono text-xs">2 mins ago</span>.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigateTo("slotsaver")}
                className="text-xs font-sans font-bold text-status-safe hover:underline flex items-center gap-1 shrink-0"
              >
                View Live Session <ChevronRight size={14} />
              </button>
            </div>

            {/* Today's Queue Module */}
            <div className="bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-display font-medium text-text-primary uppercase tracking-wide">
                  Today's Active Clinic Queue
                </h3>
                <button 
                  onClick={() => navigateTo("queue")}
                  className="text-xs font-sans text-accent hover:underline flex items-center gap-1"
                >
                  View full list <ChevronRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-dim pb-2 text-[10px] font-sans font-bold text-text-tertiary uppercase tracking-wider">
                      <th className="pb-3 width-[80px]">TIME</th>
                      <th className="pb-3 pl-2">PATIENT</th>
                      <th className="pb-3 hidden md:table-cell">REASON</th>
                      <th className="pb-3">RISK SCORE</th>
                      <th className="pb-3 text-center">STATUS</th>
                      <th className="pb-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dim/50">
                    {queue.slice(0, 5).map((appt) => {
                      const isHigh = appt.riskScore !== null && appt.riskScore >= 0.65;
                      const isWarning = appt.riskScore !== null && appt.riskScore >= 0.40 && appt.riskScore < 0.65;
                      const hasPulse = appt.riskScore !== null && appt.riskScore >= 0.85;

                      return (
                        <tr key={appt.appointmentId} className="hover:bg-bg-subtle/20 group h-12 transition-colors">
                          {/* Time */}
                          <td className="font-mono text-xs text-text-secondary">
                            {appt.time}
                          </td>
                          {/* Patient */}
                          <td className="pl-2">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleSelectPatientFull(appt.patientId)}
                                className="text-xs font-sans font-medium text-text-primary hover:text-accent hover:underline text-left"
                              >
                                {appt.patientName}
                              </button>
                              <span className="text-[10px] font-mono text-text-tertiary bg-bg-subtle px-1 rounded-sm uppercase tracking-wider">
                                {appt.age}{appt.gender}
                              </span>
                            </div>
                          </td>
                          {/* Reason */}
                          <td className="text-xs font-sans text-text-secondary hidden md:table-cell max-w-[200px] truncate">
                            {appt.reason}
                          </td>
                          {/* Risk */}
                          <td className="font-mono text-xs">
                            {renderRiskBadge(appt.riskScore)}
                          </td>
                          {/* Status Badge */}
                          <td className="text-center">
                            <span className={`text-[10px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-xs ${
                              appt.status === 'in-progress' 
                                ? 'bg-status-info/10 text-status-info border border-status-info/25' 
                                : appt.status === 'completed'
                                ? 'bg-status-safe/10 text-status-safe border border-status-safe/25'
                                : appt.status === 'waiting'
                                ? 'bg-status-warning/10 text-status-warning border border-status-warning/25'
                                : 'bg-bg-subtle text-text-secondary border border-border-dim'
                            }`}>
                              {appt.status.replace('-', ' ')}
                            </span>
                          </td>
                          {/* Ready actions */}
                          <td className="text-right">
                            {appt.status === 'completed' ? (
                              <button 
                                onClick={() => navigateTo("notes")}
                                className="text-[10px] font-sans font-bold text-text-tertiary hover:text-text-primary"
                              >
                                View Notes
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStartScribe(appt.appointmentId, appt.patientId)}
                                className="bg-text-primary text-bg-base text-[10px] font-sans font-bold px-2 py-1 rounded-sm hover:opacity-90 inline-flex items-center gap-1"
                              >
                                <Mic size={10} /> Start Scribe
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column: Risk insights & Preview card */}
          <div className="w-full lg:w-[320px] space-y-6 shrink-0">
            {/* Tomorrow's Risk Preview Card */}
            <div className="bg-bg-surface p-5 rounded-sm border border-border-dim shadow-xs space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-1 px-2 bg-status-danger/10 text-status-danger rounded-sm text-[9px] font-mono tracking-widest font-bold uppercase border border-status-danger/25">
                  TOMORROW RISK PREVIEW
                </div>
                <AlertTriangle size={16} className="text-status-danger" />
              </div>
              
              <div className="space-y-1">
                <span className="text-2xl font-mono font-bold text-text-primary">
                  4 Flagged
                </span>
                <p className="text-xs font-sans text-text-secondary leading-normal">
                  cancellation scenarios detected for tomorrow's cardiologist appointments.
                </p>
              </div>

              <div className="pt-2 border-t border-border-dim flex justify-between items-center text-xs font-sans">
                <span className="text-text-tertiary">Outreach auto-scheduled</span>
                <button 
                  onClick={() => navigateTo("slotsaver")}
                  className="text-accent hover:underline font-bold flex items-center gap-0.5"
                >
                  Review list <ChevronRight size={12} className="inline ml-1" />
                </button>
              </div>
            </div>

            {/* Quick Scribe Stats Card */}
            <div className="bg-bg-surface p-5 rounded-sm border border-border-dim shadow-xs space-y-4">
              <h4 className="text-xs font-display font-medium text-text-primary uppercase tracking-wider">
                Scribe Telemetry & Compliance
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-text-secondary">DPDP Act Compliant</span>
                  <span className="text-status-safe font-mono uppercase font-bold text-[10px]">Activated</span>
                </div>
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-text-secondary">Speech recognition rate</span>
                  <span className="text-text-primary font-mono">99.2%</span>
                </div>
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-text-secondary">Session latency</span>
                  <span className="text-text-primary font-mono">~340ms</span>
                </div>
              </div>
              <div className="bg-bg-base p-3 rounded-sm border border-border-dim flex gap-2.5 items-start">
                <Info size={13} className="text-text-tertiary mt-0.5 shrink-0" />
                <p className="text-[10px] font-sans text-text-secondary leading-normal">
                  Scribe streams are securely decrypted over TLS 1.3 and formatted instantly into clinical SOAP drafts offline.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // PAGE 2: CLINIC QUEUE FULL VIEW
  // ==========================================
  function renderQueueList() {
    return (
      <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto bg-bg-base">
        <div className="flex justify-between items-center pb-2 border-b border-border-dim">
          <div>
            <h1 className="text-2xl font-display font-medium text-text-primary">
              Today's Clinic Patients Queue
            </h1>
            <p className="text-xs font-sans text-text-secondary mt-1">
              Real-time synchronization with slot checkouts, cancellations, and waiting halls.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="bg-bg-subtle text-text-primary font-mono text-xs px-2.5 py-1 rounded-sm border border-border-dim">
              Today: {queue.length}
            </span>
          </div>
        </div>

        {/* Dense Table Layout */}
        <div className="bg-bg-surface rounded-sm border border-border-dim overflow-hidden">
          <div className="p-4 border-b border-border-dim bg-bg-base/30 flex justify-between items-center">
            <span className="text-xs font-sans font-semibold text-text-secondary">
              Active Triage View Controls
            </span>
            <span className="text-[10px] font-sans text-text-tertiary">
              Click patient name to view full 360 history
            </span>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-dim text-[10px] font-sans font-bold text-text-tertiary uppercase tracking-wider h-10 px-4">
                <th className="pl-4">TIME</th>
                <th>APPT ID</th>
                <th>PATIENT</th>
                <th>REASON FOR CONSULTATION</th>
                <th>WAIT TIME</th>
                <th>NO-SHOW RISK</th>
                <th>STATUS</th>
                <th className="text-right pr-4">WORKFLOW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dim/50">
              {queue.map((appt) => {
                const isHighRisk = appt.riskScore !== null && appt.riskScore >= 0.65;
                const isMedRisk = appt.riskScore !== null && appt.riskScore >= 0.40 && appt.riskScore < 0.65;

                return (
                  <tr key={appt.appointmentId} className="hover:bg-bg-subtle/20 h-12 transition-colors">
                    <td className="pl-4 font-mono text-xs text-text-secondary">
                      {appt.time}
                    </td>
                    <td className="font-mono text-[10px] text-text-tertiary">
                      {appt.appointmentId}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSelectPatientFull(appt.patientId)}
                          className="text-xs font-sans font-bold text-text-primary hover:text-accent hover:underline text-left font-semibold"
                        >
                          {appt.patientName}
                        </button>
                        <span className="text-[9px] font-sans bg-bg-subtle px-1 rounded-sm uppercase tracking-wider text-text-tertiary">
                          {appt.age}{appt.gender}
                        </span>
                      </div>
                    </td>
                    <td className="text-xs font-sans text-text-secondary max-w-xs truncate">
                      {appt.reason}
                    </td>
                    <td className="font-mono text-xs text-text-secondary">
                      {appt.waitMinutes !== null ? `${appt.waitMinutes} min` : "–"}
                    </td>
                    <td className="font-mono text-xs">
                      {renderRiskBadge(appt.riskScore)}
                    </td>
                    <td>
                      <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider ${
                        appt.status === "in-progress"
                          ? "bg-status-info/10 text-status-info border border-status-info/20"
                          : appt.status === "completed"
                          ? "bg-status-safe/10 text-status-safe border border-status-safe/25"
                          : appt.status === "waiting"
                          ? "bg-status-warning/10 text-status-warning border border-status-warning/25"
                          : "bg-bg-subtle text-text-secondary border border-border-dim"
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSelectPatientFull(appt.patientId)}
                          className="text-[10px] font-sans text-text-tertiary hover:text-text-primary transition-colors"
                        >
                          Chart 360
                        </button>
                        <button
                          onClick={() => handleStartScribe(appt.appointmentId, appt.patientId)}
                          className="bg-accent/10 border border-accent/30 text-accent text-[10px] font-sans font-bold px-2 py-0.5 rounded-sm hover:bg-accent/20 transition-colors"
                        >
                          Scribe
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ==========================================
  // PAGE 3: PATIENT SEARCH LIST
  // ==========================================
  function renderPatientDatabase() {
    return (
      <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto bg-bg-base">
        <div>
          <h1 className="text-2xl font-display font-medium text-text-primary">
            Patient Medical Registry
          </h1>
          <p className="text-xs font-sans text-text-secondary mt-1">
            Search clinical metrics, patient profiles, past diagnostic history, and demographic indicators.
          </p>
        </div>

        {/* Live Search Controls */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Type patient name, ID (e.g. P-1042), allergy to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-surface border border-border-dim rounded-sm pl-11 pr-4 py-3 text-xs text-text-primary focus:outline-hidden focus:border-accent font-sans shadow-xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Registry list */}
        <div className="bg-bg-surface rounded-sm border border-border-dim overflow-hidden">
          <div className="p-4 border-b border-border-dim bg-bg-base/30">
            <span className="text-[10px] font-sans font-bold text-text-tertiary uppercase tracking-wider">
              {searchQuery ? `SEARCH RESULTS (${matchesArray.length})` : "REGISTRY DIRECTORY"}
            </span>
          </div>

          {matchesArray.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <span className="text-text-tertiary text-xs block">
                No patient records match the filter query: "{searchQuery}"
              </span>
              <button 
                onClick={() => setSearchQuery("")}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Reset query
              </button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-dim text-[10px] font-sans font-bold text-text-tertiary uppercase tracking-wider h-10 pl-4">
                  <th className="pl-4">ID</th>
                  <th>NAME</th>
                  <th>GENDER/AGE</th>
                  <th>BLOOD GROUP</th>
                  <th>CRITICAL CONSTANTS / ALLERGIES</th>
                  <th>STATUS</th>
                  <th className="text-right pr-4">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dim/50">
                {matchesArray.map((p) => (
                  <tr key={p.id} className="hover:bg-bg-subtle/20 h-12 transition-colors">
                    <td className="pl-4 font-mono text-xs text-text-secondary">
                      {p.id}
                    </td>
                    <td>
                      <button
                        onClick={() => handleSelectPatientFull(p.id)}
                        className="text-xs font-sans font-bold text-text-primary hover:text-accent hover:underline text-left"
                      >
                        {p.name}
                      </button>
                    </td>
                    <td className="text-xs font-sans text-text-secondary">
                      {p.gender === "F" ? "Female" : "Male"}, {p.age} years
                    </td>
                    <td className="text-xs font-mono text-text-secondary">
                      {p.bloodGroup}
                    </td>
                    <td className="text-xs font-sans">
                      {p.allergies.length > 0 ? (
                        <div className="flex gap-1">
                          {p.allergies.map((a, i) => (
                            <span key={i} className="bg-status-danger/15 text-status-danger text-[9px] font-mono px-1.5 py-0.5 rounded-xs uppercase tracking-wider">
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-tertiary">No allergies</span>
                      )}
                    </td>
                    <td>
                      <span className="inline-flex h-2 w-2 rounded-full bg-status-safe mr-2" />
                      <span className="text-xs font-sans text-text-secondary">Active Patient</span>
                    </td>
                    <td className="text-right pr-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleSelectPatientFull(p.id)}
                          className="bg-bg-base border border-border-dim hover:bg-bg-subtle text-[10px] font-sans font-bold px-2 py-1 rounded-sm text-text-secondary hover:text-text-primary"
                        >
                          View 360
                        </button>
                        <button
                          onClick={() => handleStartScribe("A-8821", p.id)}
                          className="bg-text-primary text-bg-base text-[10px] font-sans font-bold px-2.5 py-1 rounded-sm hover:opacity-90 inline-flex items-center gap-1"
                        >
                          <Mic size={10} /> Scribe
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // PAGE 4: PATIENT 360° CLINICAL SUMMARY
  // ==========================================
  function renderPatientDetailPage() {
    const patientId = selectedPatientId || "P-1042"; // Fallback to Priya
    const profile = patientProfiles[patientId];

    if (!profile) {
      return (
        <div className="p-8 text-center bg-bg-base flex-1">
          <span className="text-xs text-text-tertiary block">Patient profile metadata missing.</span>
          <button onClick={() => navigateTo("home")} className="text-xs text-accent underline mt-2 block">
            Return home
          </button>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto bg-bg-base">
        {/* Top bar control belt */}
        <div className="border-b border-border-dim bg-bg-surface p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigateTo("home")}
              className="p-1 rounded-sm hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors border border-border-dim"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-display font-medium text-text-primary">
                  {profile.name}
                </h1>
                <span className="text-[10px] font-mono text-text-tertiary px-1.5 py-0.5 rounded-sm bg-bg-base uppercase border border-border-dim">
                  ID: {profile.id}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-text-secondary font-sans">
                  {profile.gender === "F" ? "Female" : "Male"} · {profile.age} yrs · Blood: <span className="font-mono">{profile.bloodGroup}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {profile.allergies.length > 0 && (
              <div className="flex gap-1.5 items-center mr-2">
                <span className="text-[10px] font-sans font-bold text-status-danger uppercase tracking-wider block">
                  ALLERGIES:
                </span>
                {profile.allergies.map((all, i) => (
                  <span key={i} className="bg-status-danger/10 text-[10px] font-sans font-bold text-status-danger px-1.5 py-0.5 rounded-sm border border-status-danger/20">
                    {all}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={() => handleStartScribe("A-8821", profile.id)}
              className="bg-accent text-bg-base text-xs font-sans font-bold px-3 py-1.5 rounded-sm hover:opacity-90 inline-flex items-center gap-1.5 shadow-sm"
            >
              <Mic size={14} /> Start Scribe 🎙
            </button>
          </div>
        </div>

        {/* Side-by-side 360 split panels */}
        <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Left panel core analytics (60%) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* AI Summary Block */}
            <div className="bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border-dim">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-accent" />
                  <span className="text-[10px] font-sans font-bold tracking-widest text-text-primary uppercase">
                    AI CRITICAL CLINICAL SUMMARY
                  </span>
                </div>
                <button
                  onClick={handleRefreshSummary}
                  disabled={isRefreshingSummary}
                  className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                >
                  {isRefreshingSummary ? "Reframing..." : "Refresh summary"}
                </button>
              </div>

              {isRefreshingSummary ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-bg-base/80 rounded-xs w-full" />
                  <div className="h-4 bg-bg-base/80 rounded-xs w-5/6" />
                  <div className="h-4 bg-bg-base/80 rounded-xs w-2/3" />
                </div>
              ) : (
                <p className="text-xs font-sans text-text-primary leading-normal italic">
                  "{aiSummaryText}"
                </p>
              )}

              {/* Alert prompt */}
              {profile.aiAlert && (
                <div className="p-3.5 bg-status-warning/5 border-l-2 border-status-warning text-xs font-sans text-text-primary flex gap-2.5 rounded-sm">
                  <AlertTriangle size={14} className="text-status-warning shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Clinical Advisory Alert:</span> {profile.aiAlert}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Vitals Sparkline Trend */}
            <div className="bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs space-y-5">
              <div className="flex justify-between items-center pb-1">
                <div>
                  <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                    VITALS TELEMETRY
                  </span>
                  <h4 className="text-sm font-sans font-semibold text-text-primary mt-1">
                    Systolic / Diastolic Pressure History
                  </h4>
                </div>
                <div className="flex gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-danger block"/> Systolic</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-info block"/> Diastolic</span>
                </div>
              </div>

              {/* Vector Sparkline */}
              <div className="bg-bg-base/50 p-4 rounded-sm border border-border-dim relative h-28 flex items-center justify-center">
                <svg viewBox="0 0 400 100" className="w-full h-full text-accent" preserveAspectRatio="none">
                  {/* Systolic Trendline (Red) */}
                  <path
                    d="M 20 60 L 150 45 L 280 35 L 380 20"
                    fill="none"
                    stroke="var(--color-status-danger, #ef4444)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Diastolic Trendline (Blue) */}
                  <path
                    d="M 20 85 L 150 78 L 280 70 L 380 62"
                    fill="none"
                    stroke="var(--color-status-info, #40e0d0)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Data Point Dots (Red) */}
                  <circle cx="20" cy="60" r="4.5" className="fill-status-danger" />
                  <circle cx="150" cy="45" r="4.5" className="fill-status-danger" />
                  <circle cx="280" cy="35" r="4.5" className="fill-status-danger" />
                  <circle cx="380" cy="20" r="4.5" className="fill-status-danger" />

                  {/* Data Point Dots (Blue) */}
                  <circle cx="20" cy="85" r="4" className="fill-status-info" />
                  <circle cx="150" cy="78" r="4" className="fill-status-info" />
                  <circle cx="280" cy="70" r="4" className="fill-status-info" />
                  <circle cx="380" cy="62" r="4" className="fill-status-info" />
                  
                  {/* Dot text markers */}
                  <text x="18" y="48" className="text-[9px] font-mono fill-text-primary">142</text>
                  <text x="145" y="33" className="text-[9px] font-mono fill-text-primary">138</text>
                  <text x="275" y="23" className="text-[9px] font-mono fill-text-primary">128</text>
                  <text x="365" y="10" className="text-[9px] font-mono fill-text-primary">138</text>
                </svg>
              </div>

              {/* Table of Vitals */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-dim pb-1.5 text-[9px] font-sans font-bold text-text-tertiary uppercase tracking-wider">
                      <th>CONSULT DATE</th>
                      <th>BLOOD PRESSURE</th>
                      <th>WEIGHT</th>
                      <th>HEART RATE</th>
                      <th>TREND</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dim">
                    {profile.vitalsHistory.map((v, i) => (
                      <tr key={i} className="h-9 text-xs font-sans">
                        <td className="font-mono text-xs text-text-secondary">{v.date}</td>
                        <td className="font-semibold text-text-primary font-mono">{v.bp}</td>
                        <td className="text-text-secondary">{v.weight} kg</td>
                        <td className="text-text-secondary">{v.heartRate} bpm</td>
                        <td>
                          {i === 2 ? (
                            <span className="text-text-tertiary">Baseline</span>
                          ) : i === 0 ? (
                            <span className="text-status-safe font-semibold flex items-center">↓ Improving</span>
                          ) : (
                            <span className="text-status-warning font-semibold flex items-center">↑ Mild increase</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Current Actively Prescribed Medications */}
            <div className="bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs space-y-4">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                CURRENT MEDICATIONS SCHEDULE
              </span>

              {profile.currentMedications.length === 0 ? (
                <span className="text-xs text-text-tertiary block italic">No continuous drug therapy recorded.</span>
              ) : (
                <div className="space-y-3">
                  {profile.currentMedications.map((med, i) => {
                    const isAllergicConflict = profile.allergies.some(a => 
                      med.name.toLowerCase().includes(a.toLowerCase())
                    );

                    return (
                      <div 
                        key={i} 
                        className={`p-3 rounded-sm border flex justify-between items-center ${
                          isAllergicConflict 
                            ? "bg-status-danger/5 border-status-danger/20" 
                            : "bg-bg-base/40 border-border-dim"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-sans font-bold text-text-primary">
                              {med.name}
                            </span>
                            <span className="text-[10px] font-mono text-text-secondary bg-bg-subtle px-1 py-0.5 rounded-sm">
                              {med.dosage}
                            </span>
                          </div>
                          <span className="text-[11px] font-sans text-text-tertiary block mt-1">
                            Dosage index: {med.dosage} · Prescribed since {med.since}
                          </span>
                        </div>

                        {isAllergicConflict && (
                          <div className="flex items-center gap-1.5 text-xs text-status-danger font-semibold">
                            <AlertTriangle size={13} /> High Allergy Conflict
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right panel history summary (40%) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Medical History */}
            <div className="bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs space-y-4">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                MEDICAL HISTORY METRIC
              </span>
              <div className="space-y-2.5">
                {profile.medicalHistory.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs font-sans items-center pb-2 border-b border-border-dim/50">
                    <div>
                      <span className="font-bold text-text-primary">{item.condition}</span>
                      <span className="text-[10px] font-sans text-text-tertiary block mt-0.5">Diagnosed on {item.since}</span>
                    </div>
                    <span className={`text-[10px] font-sans px-2 py-0.5 rounded-xs uppercase tracking-wider font-semibold ${
                      item.status === "active" ? "bg-status-danger/10 text-status-danger border border-status-danger/20" : "bg-status-safe/10 text-status-safe"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Lab Results */}
            <div className="bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase">
                  LATEST LAB METRICS
                </span>
                <span className="text-xs font-sans text-text-tertiary font-mono">3 results loaded</span>
              </div>

              <div className="space-y-3">
                {profile.lastLabResults.map((lab, i) => (
                  <div key={i} className="p-3 bg-bg-base/35 border border-border-dim rounded-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-text-primary">{lab.test}</span>
                      <span className={`font-mono font-semibold uppercase text-[10px] ${
                        lab.status === "high" ? "text-status-danger" : lab.status === "warning" ? "text-status-warning" : "text-status-safe"
                      }`}>
                        {lab.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-end mt-1.5">
                      <span className="text-xl font-mono text-accent font-semibold leading-none">
                        {lab.value} <span className="text-xs font-sans text-text-secondary font-normal">{lab.unit}</span>
                      </span>
                      <span className={`text-[10px] font-sans ${lab.trend === "up" ? "text-status-danger" : lab.trend === "down" ? "text-status-safe" : "text-text-tertiary"}`}>
                        {lab.trend === "up" ? "↑ Rising trend" : lab.trend === "down" ? "↓ Decreasing trend" : "→ Stable"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visit History list */}
            <div className="bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs space-y-4">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                RECENT VISIT TIMELINE
              </span>

              <div className="relative border-l border-border-dim pl-4 space-y-4 ml-2">
                <div className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                  <span className="text-[10px] font-mono text-text-tertiary">05 JAN 2025</span>
                  <h5 className="text-xs font-sans font-bold text-text-primary mt-0.5">Regular BP Consultation</h5>
                  <p className="text-xs font-sans text-text-secondary leading-normal mt-0.5">
                    BP controlled at 128/82. Commenced trial baseline Atorvastatin.
                  </p>
                </div>
                
                <div className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-border-dim" />
                  <span className="text-[10px] font-mono text-text-tertiary">01 DEC 2024</span>
                  <h5 className="text-xs font-sans font-bold text-text-primary mt-0.5">BP Check & Lipids Follow-up</h5>
                  <p className="text-xs font-sans text-text-secondary leading-normal mt-0.5">
                    Lipid panel returns high LDL (152). Instructed standard cardiac salt-free regimen.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-border-dim" />
                  <span className="text-[10px] font-mono text-text-tertiary">15 NOV 2024</span>
                  <h5 className="text-xs font-sans font-bold text-text-primary mt-0.5">Initial Admissions</h5>
                  <p className="text-xs font-sans text-text-secondary leading-normal mt-0.5">
                    Stage 1 Hypertension diagnostics. Started home telemetry metrics daily.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // PAGE 5: AI SCRIBE — LIVE APPOINTMENT
  // ==========================================
  function renderLiveScribeScreen() {
    const activePatient = selectedPatientId ? patientProfiles[selectedPatientId] : patientProfiles["P-1042"];

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-bg-base select-text">
        {/* Top Header Row Panel */}
        <div className="bg-bg-surface border-b border-border-dim p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigateTo("home")}
              className="p-1 rounded-sm border border-border-dim text-text-tertiary hover:text-text-primary bg-bg-base"
            >
              <ChevronLeft size={15} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-md font-display font-medium text-text-primary">
                  Live AI Consultation Scribe
                </h2>
                <span className="text-[10px] font-sans font-bold text-status-safe bg-status-safe/10 px-2 py-0.5 rounded-sm border border-status-safe/25 uppercase">
                  Connected
                </span>
              </div>
              <span className="text-xs text-text-secondary font-sans mt-0.5">
                Active Patient: <span className="font-bold text-text-primary">{activePatient?.name}</span> · Status: Scribe recording ready
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Live Recording Dot */}
            <div className="flex items-center gap-2 bg-text-primary/5 border border-border-dim/80 px-3 py-1.5 rounded-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${isRecording ? "bg-status-danger animate-pulse" : "bg-text-tertiary"}`} />
              <span className="font-mono text-xs font-bold text-text-primary">
                {isRecording ? "LIVE RECORDING" : "IDLE"} · {formatAudioTime(recordingSeconds)}
              </span>
            </div>

            {isRecording ? (
              <button 
                onClick={handleStopScribe}
                className="bg-status-warning text-bg-base text-xs font-sans font-bold px-3 py-1.5 rounded-sm hover:-translate-y-px transition-transform"
              >
                Pause
              </button>
            ) : (
              <button 
                onClick={() => handleStartScribe("A-8821", activePatient?.id || "P-1042")}
                className="bg-accent text-bg-base text-xs font-sans font-bold px-4 py-1.5 rounded-sm hover:-translate-y-px transition-transform flex items-center gap-1 shadow-sm"
              >
                <Mic size={14} /> Start Recording
              </button>
            )}

            <button
              onClick={() => {
                setIsRecording(false);
                loadPrescriptionWriter();
              }}
              className="bg-text-primary text-bg-base text-xs font-sans font-bold px-3 py-1.5 rounded-sm hover:opacity-90 inline-flex items-center gap-1 border border-transparent shadow-xs"
            >
              Generate Prescription <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Warning caution band */}
        <div className="bg-status-warning/5 border-b border-status-warning/20 p-2 text-center text-[10px] font-sans text-text-primary">
          ⚠️ Please do not close or navigate away from this workspace during active streaming. DPDP privacy filters keep transcription localized.
        </div>

        {/* Both Full Height Columns (50 / 50 split) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT: Live Transcript Panel */}
          <div className="w-full md:w-1/2 border-r border-border-dim flex flex-col bg-bg-surface overflow-hidden">
            <div className="p-4 border-b border-border-dim bg-bg-base/30 flex justify-between items-center">
              <span className="text-[10px] font-sans font-bold text-text-tertiary tracking-widest uppercase block">
                SPEECH-TO-TEXT CLINICAL TELEMETRY
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-sans text-text-secondary">Scroll lock</span>
                <button
                  onClick={() => setScrollLock(!scrollLock)}
                  className={`w-7 h-4 rounded-full transition-colors relative ${scrollLock ? "bg-accent" : "bg-border-dim"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-bg-base transition-all ${scrollLock ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6 font-mono text-sm leading-relaxed select-text">
              {transcriptLines.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center space-y-4">
                  <Mic size={32} className="text-text-tertiary animate-pulse" />
                  <div className="space-y-1 max-w-sm">
                    <h5 className="text-xs font-sans font-bold text-text-primary uppercase tracking-wide">
                      Awaiting Scribe Stream
                    </h5>
                    <p className="text-xs font-sans text-text-secondary leading-normal">
                      Click the "Start Recording" button above to simulate a live clinical consultation conversation.
                    </p>
                  </div>
                </div>
              ) : (
                transcriptLines.map((line, i) => (
                  <div key={line.id} className="space-y-1">
                    <span className="text-[10px] font-sans text-text-tertiary font-bold uppercase tracking-wider block">
                      {line.speaker} · <span className="font-mono text-[9px] font-normal text-text-tertiary">09:34:{30 + i}</span>
                    </span>
                    <p className="font-sans text-sm text-text-primary leading-normal pl-2 border-l border-accent/25">
                      {line.text}
                      {i === transcriptLines.length - 1 && isRecording && (
                        <span className="inline-block h-3.5 w-1 bg-accent/70 animate-ping ml-0.5" />
                      )}
                    </p>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>
          </div>

          {/* RIGHT: Live SOAP notes formatted structured note editor */}
          <div className="w-full md:w-1/2 flex flex-col bg-bg-base overflow-hidden">
            <div className="p-4 border-b border-border-dim bg-bg-surface flex justify-between items-center shrink-0">
              <span className="text-[10px] font-sans font-bold text-text-primary tracking-widest uppercase">
                STRUCTURED CLINICAL SOAP DRAFT
              </span>
              <span className="text-[10px] font-sans text-status-safe flex items-center gap-1">
                <span>Auto-parsing active</span>
                <span className="h-1.5 w-1.5 rounded-full bg-status-safe animate-pulse" />
              </span>
            </div>

            {/* SOAP inputs layout */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              {/* SUBJECTIVE SECTION */}
              <div className="bg-bg-surface p-4 rounded-sm border border-border-dim shadow-xs space-y-3">
                <span className="text-[10px] font-sans font-bold tracking-widest text-[#ef4444] uppercase block">
                  S · SUBJECTIVE (CHIEF COMPLAINTS)
                </span>
                <textarea
                  value={soapDraft.subjective}
                  onChange={(e) => setSoapDraft({ ...soapDraft, subjective: e.target.value })}
                  placeholder="Subjective complaints..."
                  className="w-full bg-bg-base border border-border-dim rounded-sm p-3 text-xs text-text-primary focus:outline-hidden focus:border-accent min-h-[70px] font-sans"
                />
                {soapDraft.subjectiveSymptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center mt-1">
                    <span className="text-[9px] font-sans font-bold text-text-tertiary">SYMPTOMS DETECTED:</span>
                    {soapDraft.subjectiveSymptoms.map((sym, idx) => (
                      <span key={idx} className="bg-accent/15 text-accent text-[9px] font-sans px-1.5 py-0.5 rounded-xs font-semibold">
                        {sym}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* OBJECTIVE SECTION */}
              <div className="bg-bg-surface p-4 rounded-sm border border-border-dim shadow-xs space-y-4">
                <span className="text-[10px] font-sans font-bold tracking-widest text-status-warning uppercase block">
                  O · OBJECTIVE (VITALS & TESTS)
                </span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[9px] font-sans text-text-secondary block mb-1">Blood Pressure</span>
                    <input
                      type="text"
                      value={soapDraft.objective.bp}
                      onChange={(e) => setSoapDraft({
                        ...soapDraft,
                        objective: { ...soapDraft.objective, bp: e.target.value }
                      })}
                      placeholder="e.g. 120/80"
                      className="w-full bg-bg-base border border-border-dim p-2 rounded-sm text-xs font-mono text-text-primary focus:outline-hidden focus:border-accent"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-sans text-text-secondary block mb-1">Weight</span>
                    <input
                      type="text"
                      value={soapDraft.objective.weight}
                      onChange={(e) => setSoapDraft({
                        ...soapDraft,
                        objective: { ...soapDraft.objective, weight: e.target.value }
                      })}
                      placeholder="e.g. 68 kg"
                      className="w-full bg-bg-base border border-border-dim p-2 rounded-sm text-xs font-mono text-text-primary focus:outline-hidden focus:border-accent"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-sans text-text-secondary block mb-1">Heart Rate</span>
                    <input
                      type="text"
                      value={soapDraft.objective.heartRate}
                      onChange={(e) => setSoapDraft({
                        ...soapDraft,
                        objective: { ...soapDraft.objective, heartRate: e.target.value }
                      })}
                      placeholder="e.g. 72 bpm"
                      className="w-full bg-bg-base border border-border-dim p-2 rounded-sm text-xs font-mono text-text-primary focus:outline-hidden focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-sans text-text-secondary block mb-1">Examination details</span>
                  <textarea
                    value={soapDraft.objective.details}
                    onChange={(e) => setSoapDraft({
                      ...soapDraft,
                      objective: { ...soapDraft.objective, details: e.target.value }
                    })}
                    placeholder="Findings details..."
                    className="w-full bg-bg-base border border-border-dim rounded-sm p-3 text-xs text-text-primary focus:outline-hidden focus:border-accent min-h-[50px] font-sans"
                  />
                </div>
              </div>

              {/* ASSESSMENT SECTION */}
              <div className="bg-bg-surface p-4 rounded-sm border border-border-dim shadow-xs space-y-3">
                <span className="text-[10px] font-sans font-bold tracking-widest text-[#008080] uppercase block">
                  A · ASSESSMENT / DIAGNOSES CLINICAL
                </span>
                <textarea
                  value={soapDraft.assessment}
                  onChange={(e) => setSoapDraft({ ...soapDraft, assessment: e.target.value })}
                  placeholder="Clinical diagnostic evaluation..."
                  className="w-full bg-bg-base border border-border-dim rounded-sm p-3 text-xs text-text-primary focus:outline-hidden focus:border-accent min-h-[60px] font-sans"
                />

                {scribeAlert && (
                  <div className="p-3 bg-accent/5 border border-accent/20 rounded-xs flex gap-2 items-start text-xs text-text-primary leading-normal">
                    <Sparkles size={14} className="text-accent shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-bold">Clinical Insight:</span> {scribeAlert}
                    </div>
                  </div>
                )}
              </div>

              {/* PLAN SECTION */}
              <div className="bg-bg-surface p-4 rounded-sm border border-border-dim shadow-xs space-y-3">
                <span className="text-[10px] font-sans font-bold tracking-widest text-status-safe uppercase block">
                  P · PLAN (DIAGNOSTIC & PHARMACEUTICAL)
                </span>
                <textarea
                  value={soapDraft.plan}
                  onChange={(e) => setSoapDraft({ ...soapDraft, plan: e.target.value })}
                  placeholder="Diagnostic recommendations, medication additions and scheduling..."
                  className="w-full bg-bg-base border border-border-dim rounded-sm p-3 text-xs text-text-primary focus:outline-hidden focus:border-accent min-h-[70px] font-sans"
                />
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // PAGE 6: PRESCRIPTION WRITER SCREEN
  // ==========================================
  function renderPrescriptionWriterScreen() {
    const activePatient = selectedPatientId ? patientProfiles[selectedPatientId] : patientProfiles["P-1042"];

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-bg-base select-text">
        {/* Top Control Bar Panel */}
        <div className="bg-bg-surface border-b border-border-dim p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigateTo("scribe", selectedPatientId || "P-1042")}
              className="p-1 rounded-sm border border-border-dim text-text-tertiary hover:text-text-primary bg-bg-base"
            >
              <ChevronLeft size={15} />
            </button>
            <div>
              <h2 className="text-md font-display font-medium text-text-primary">
                Pre-Filled Prescription Draft Builder
              </h2>
              <p className="text-xs text-text-secondary font-sans mt-0.5">
                Formulating prescription for <span className="font-bold text-text-primary">{activePatient?.name}</span> · Age {activePatient?.age} ({activePatient?.gender})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => showToast("Draft saved internally in patient cloud file.")}
              className="border border-border-dim hover:bg-bg-subtle/50 text-text-secondary hover:text-text-primary text-xs font-sans font-bold px-3 py-1.5 rounded-sm"
            >
              Save Draft
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="bg-accent text-bg-base text-xs font-sans font-bold px-4 py-1.5 rounded-sm hover:opacity-90 inline-flex items-center gap-1 shadow-sm"
            >
              <Printer size={13} /> Generate & Dispatch PDF
            </button>
          </div>
        </div>

        {/* Prescription Dual-Panel Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT PANEL: Editing Controls (55%) */}
          <div className="w-full lg:w-[55%] border-r border-border-dim flex flex-col bg-bg-surface overflow-y-auto p-6 space-y-6">
            
            {/* 1. DIAGNOSIS TAGS */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                DIAGNOSES / IMPRESSIONS
              </span>
              <div className="flex flex-wrap gap-1.5">
                {diagnosisTags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="bg-accent/15 border border-accent/25 text-accent text-[11px] font-sans px-2.5 py-1 rounded-sm flex items-center gap-1.5 font-semibold"
                  >
                    {tag}
                    <button 
                      onClick={() => setDiagnosisTags(prev => prev.filter((_, i) => i !== idx))}
                      className="hover:text-text-primary text-text-secondary"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => {
                    const tag = prompt("Enter diagnosis tag name:");
                    if (tag) setDiagnosisTags(prev => [...prev, tag]);
                  }}
                  className="border border-dashed border-border-dim hover:border-text-secondary text-text-secondary hover:text-text-primary text-[10px] rounded-sm px-2.5 py-1 font-sans flex items-center gap-1"
                >
                  <Plus size={10} /> Add Diagnosis
                </button>
              </div>
            </div>

            {/* 2. DYNAMIC PHARMACEUTICAL BUILDER */}
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                  AI SUGGESTED PHARMACY REGIMEN
                </span>
                <span className="text-[9px] font-sans text-text-tertiary">Based on current clinical diagnoses</span>
              </div>

              {/* Interaction Red Flag alerts */}
              {interactionWarnings.length > 0 && (
                <div className="p-4 bg-status-danger/10 border-l-2 border-status-danger text-xs font-sans text-text-primary space-y-2 rounded-sm">
                  <div className="flex items-center gap-2 text-status-danger font-bold">
                    <AlertTriangle size={15} /> CLINICAL INTERACTION ADVISORY
                  </div>
                  <div className="space-y-1.5 pl-1 text-[11px] leading-normal text-text-secondary">
                    {interactionWarnings.map((warn, i) => (
                      <p key={i}>• {warn}</p>
                    ))}
                  </div>
                  <div className="pt-2 flex gap-3 text-[10px] font-sans text-status-danger font-semibold">
                    <button 
                      onClick={() => {
                        setPrescribedMeds(prev => prev.filter(m => m.name.toLowerCase() !== "ibuprofen"));
                        showToast("Resolved conflict: Removed Ibuprofen.");
                      }}
                      className="hover:underline text-[10px]"
                    >
                      [✓ Auto-Resolve: Remove Ibuprofen]
                    </button>
                  </div>
                </div>
              )}

              {/* Current Meds list cards */}
              <div className="space-y-3">
                {prescribedMeds.map((med, idx) => (
                  <div key={idx} className="p-4 bg-bg-base/30 rounded-sm border border-border-dim/80 flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-sans font-semibold text-text-primary">
                          {med.name} <span className="font-mono text-xs text-text-secondary bg-bg-subtle px-1 rounded-xs">{med.dosage}</span>
                        </h4>
                        <span className="text-[11px] font-mono text-accent bg-accent/5 border border-accent/20 px-1 py-0.2 rounded-xs font-bold uppercase tracking-wider">
                          {med.timing}
                        </span>
                      </div>
                      <p className="text-xs font-sans text-text-secondary font-medium">
                        Duration: <span className="font-semibold text-text-primary font-mono">{med.durationDays} days</span> · {med.reason}
                      </p>
                      <p className="text-xs font-sans text-text-tertiary italic">
                        "{med.instructions}"
                      </p>
                    </div>

                    <button 
                      onClick={() => removeMed(idx)}
                      className="p-1 rounded-sm text-text-tertiary hover:text-status-danger hover:bg-bg-subtle transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Autocomplete Drug Search Selector */}
              <div className="relative pt-2">
                <span className="text-[9px] font-sans text-text-secondary block mb-1">Add another medicine (Search Cardiology Database)</span>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search e.g. Aspirin, Ramipril, Metoprolol..."
                    value={drugSearch}
                    onChange={(e) => handleDrugSearch(e.target.value)}
                    className="w-full bg-bg-base border border-border-dim rounded-sm pl-9 pr-4 py-2.5 text-xs text-text-primary focus:outline-hidden focus:border-accent font-sans"
                  />
                </div>

                {/* Autocomplete drawer */}
                {drugMatches.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-bg-surface border border-border-dim rounded-sm shadow-md z-30 divide-y divide-border-dim overflow-hidden max-h-48 overflow-y-auto">
                    {drugMatches.map((drug, i) => (
                      <button
                        key={i}
                        onClick={() => selectSuggestion(drug)}
                        className="w-full text-left p-3 hover:bg-bg-subtle text-xs flex justify-between items-center transition-colors"
                      >
                        <div>
                          <span className="font-bold text-text-primary">{drug.name}</span>
                          <span className="text-text-tertiary bg-bg-base ml-2 px-1 text-[9px] rounded-xs font-mono">{drug.category}</span>
                        </div>
                        <span className="text-[10px] font-mono text-text-secondary">Suggest: {drug.commonDosage}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Simulated dangerous interaction trigger */}
                <div className="mt-2.5 flex justify-between items-center p-2 rounded-sm border border-dashed border-[#ea580c]/30 bg-[#ea580c]/5 text-[10px] font-sans text-text-primary leading-normal">
                  <span className="text-[#ea580c] font-semibold">Test clinical warnings engine:</span>
                  <button 
                    onClick={() => {
                      const conflictMed = {
                        name: "Ibuprofen",
                        dosage: "400mg",
                        timing: "1-0-1",
                        durationDays: 5,
                        reason: "Headache support",
                        instructions: "Take with food on distress."
                      };
                      setPrescribedMeds(prev => [...prev, conflictMed]);
                      showToast("Added Ibuprofen (NSAID). High Interaction Alert triggers.");
                    }}
                    className="text-xs font-bold text-[#ea580c] hover:underline"
                  >
                    [Force conflict: Add Ibuprofen]
                  </button>
                </div>
              </div>

            </div>

            {/* 3. ORDERED TESTS CHIPS ARRAY */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                LABS & PARAMETERS ORDERED
              </span>
              <div className="flex flex-wrap gap-1.5">
                {testChips.map((test, index) => (
                  <span key={index} className="bg-bg-base border border-border-dim rounded-sm px-2.5 py-1 text-xs text-text-secondary flex items-center gap-1.5 font-sans">
                    {test}
                    <button onClick={() => removeTestChip(index)} className="text-text-tertiary hover:text-text-primary">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Order new lipid, enzyme, or ECG panel..."
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addTestChip(); }}
                  className="flex-1 bg-bg-base border border-border-dim rounded-sm px-3 py-2 text-xs text-text-primary font-sans focus:outline-hidden"
                />
                <button
                  onClick={addTestChip}
                  className="bg-text-primary text-bg-base font-sans font-bold text-xs px-3.5 py-2 rounded-sm"
                >
                  Add Test
                </button>
              </div>
            </div>

            {/* 4. OTHER DIET RULES */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                SPECIAL CLINICAL INSTRUCTIONS / DIETARY CONTROLS
              </span>
              <textarea
                value={dietInstructions}
                onChange={(e) => setDietInstructions(e.target.value)}
                placeholder="Exhaustive diet, salt hygiene and walking rules..."
                className="w-full bg-bg-base border border-border-dim rounded-sm p-3 text-xs text-text-primary min-h-[70px] focus:outline-hidden focus:border-accent"
              />
            </div>

            {/* 5. FOLLOW UP SCHEDULER */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                RECOMMENDED FOLLOW-UP SCHEDULE
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[7, 14, 30, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setFollowUpDays(days)}
                    className={`p-2 border text-xs font-semibold rounded-sm font-sans transition-colors ${
                      followUpDays === days 
                        ? "bg-accent border-accent text-bg-base" 
                        : "border-border-dim hover:bg-bg-subtle text-text-secondary"
                    }`}
                  >
                    {days === 7 ? "1 Week" : days === 14 ? "2 Weeks" : days === 30 ? "30 Days" : "3 Months"}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Live PDF printed receipt mock (45%, sticky viewport) */}
          <div className="w-full lg:w-[45%] flex flex-col bg-bg-base overflow-y-auto p-8 relative">
            <div className="text-center mb-4">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                LIVE COMPILING RX PRESCRIPTION PREVIEW (PDF)
              </span>
            </div>

            {/* Mock physical sheet */}
            <div className="bg-white text-gray-900 font-sans p-8 rounded-sm shadow-md border border-gray-200 aspect-[1/1.4] w-full max-w-md mx-auto space-y-6 select-text text-left">
              
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-gray-300 pb-4">
                <div>
                  <h3 className="text-md font-bold tracking-tight text-gray-900 uppercase">
                    CUREVA HOSPITAL CLINIC
                  </h3>
                  <p className="text-[10px] text-gray-500 font-medium">
                    Sector 42, DLF Phase 5, Gurgaon DL · PH: +91 900 120 4400
                  </p>
                  <p className="text-[9px] text-gray-500 font-mono">
                    REGISTRATION: MCI/DL/2018/48291
                  </p>
                </div>
                <div className="text-right text-[10px] text-gray-600 font-mono space-y-0.5">
                  <div>DATE: 15 JAN 2026</div>
                  <div>Rx NO: RD-88902</div>
                </div>
              </div>

              {/* Patient Detail section */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-200 pb-4 bg-gray-50/50 p-2 rounded-xs">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold block uppercase">PATIENT PROFILE</span>
                  <div className="font-bold text-gray-800">{activePatient?.name}</div>
                  <div className="text-[11px] text-gray-500">Gender/Age: {activePatient?.gender} / {activePatient?.age} yrs</div>
                  <div className="text-[11px] text-gray-500 font-mono">Blood: {activePatient?.bloodGroup} · Phone: {activePatient?.phone}</div>
                </div>

                <div>
                  <span className="text-[9px] text-gray-400 font-bold block uppercase">CARDIOLOGIST</span>
                  <div className="font-bold text-gray-800">{currentDoctor.name}</div>
                  <p className="text-[10px] text-gray-500 leading-normal italic">
                    MD Cardiology, FACC (UK Clinical Fellowship)
                  </p>
                </div>
              </div>

              {/* Rx clinical symbol */}
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold block uppercase">DIAGNOSES / FINDINGS</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diagnosisTags.map((tag, i) => (
                      <span key={i} className="text-[10px] font-semibold bg-gray-100 px-2 py-0.5 rounded-sm text-gray-800 border border-gray-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-xl font-bold font-serif text-gray-800 leading-none">Rx</div>

                {/* Medicines layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-300 pb-1 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        <th>MEDICINE & DOSING STATUS</th>
                        <th className="width-[80px]">TIMING</th>
                        <th className="text-right">DURATION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prescribedMeds.map((med, idx) => (
                        <tr key={idx} className="h-10">
                          <td className="pt-1.5 pb-1">
                            <span className="font-bold text-gray-800 text-[12px] block">{med.name} {med.dosage}</span>
                            <span className="text-[10px] text-gray-550 block italic mt-0.5">"{med.instructions}"</span>
                          </td>
                          <td className="font-mono text-[11px] text-gray-600 font-bold">{med.timing}</td>
                          <td className="text-right font-mono font-bold text-gray-800 text-[11px]">{med.durationDays} days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lab orders */}
              {testChips.length > 0 && (
                <div className="border-t border-gray-250 pt-4">
                  <span className="text-[9px] text-gray-400 font-bold block uppercase mb-1">DIAGNOSTIC LAB TESTS DIRECTIVES</span>
                  <div className="flex flex-wrap gap-1.5">
                    {testChips.map((test, index) => (
                      <span key={index} className="text-[10px] font-mono font-bold bg-gray-50 border border-gray-200 rounded-sm px-2 py-0.5 text-gray-700">
                        • {test}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lifestyle directives */}
              <div className="border-t border-gray-250 pt-4">
                <span className="text-[9px] text-gray-400 font-bold block uppercase">DIET & INTENSITY RECOMMENDATIONS</span>
                <p className="text-[11px] text-gray-600 leading-normal mt-0.5 italic">
                  "{dietInstructions}"
                </p>
              </div>

              {/* Footer Follow-up */}
              <div className="border-t border-gray-250 pt-4 flex justify-between items-end text-xs text-gray-500">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold block uppercase">RECOMMENDED RE-CHECK</span>
                  <span className="font-bold text-gray-800">Return to clinic inside {followUpDays} days</span>
                </div>
                
                {/* Simulated Signature */}
                <div className="text-right font-serif leading-none pr-2">
                  <div className="italic text-gray-400 text-[9px] mb-2">Authenticated electronically</div>
                  <div className="text-[13px] font-bold text-gray-800">Dr. Rajesh Sharma</div>
                  <div className="text-[9px] text-gray-405 mt-0.5 font-sans">MD Specialty Cardiologist</div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Dispatch Share Modal */}
        <AnimatePresence>
          {showShareModal && (
            <div className="fixed inset-0 bg-bg-base/80 flex items-center justify-center z-50 p-4 select-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-bg-surface border border-border-dim rounded-sm max-w-sm w-full p-6 space-y-4 shadow-xl"
              >
                <div className="flex justify-between items-start pb-2 border-b border-border-dim">
                  <h3 className="text-sm font-display font-bold text-text-primary uppercase tracking-wider">
                    DISPATCH DIGITAL RX REPORT
                  </h3>
                  <button onClick={() => setShowShareModal(false)} className="text-text-tertiary hover:text-text-secondary">
                    <X size={16} />
                  </button>
                </div>

                <p className="text-xs font-sans text-text-secondary leading-normal">
                  Send the compiled digital Rx PDF straight to <span className="font-bold text-text-primary">{activePatient?.name}</span>'s registered endpoint.
                </p>

                <div className="space-y-2">
                  <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                    CHOOSE DELIVERY CHANNEL
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {(["whatsapp", "email", "sms"] as const).map((channel) => (
                      <button
                        key={channel}
                        onClick={() => setShareChannel(channel)}
                        className={`p-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider border font-sans text-center transition-all ${
                          shareChannel === channel 
                            ? "bg-accent border-accent text-bg-base" 
                            : "border-border-dim text-text-secondary hover:bg-bg-subtle"
                        }`}
                      >
                        {channel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Precompiled preview string */}
                <div className="p-3 bg-bg-base/80 text-[11px] font-sans text-text-secondary rounded-sm border border-border-dim leading-snug">
                  <span className="font-bold text-text-primary block mb-0.5">Dispatched Message Preview:</span>
                  "Hello Priya, Dr. Sharma has loaded your diagnostic prescription summary RD-88902 securely. View details & follow-up directives: https://cureva.care/rx/f98d9h"
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="border border-border-dim hover:bg-bg-subtle text-text-secondary text-xs font-sans px-3 py-1.5 rounded-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendLivePdf}
                    disabled={isSendingPdf}
                    className="bg-accent text-bg-base text-xs font-sans font-bold px-4 py-1.5 rounded-sm hover:opacity-90 inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
                  >
                    {isSendingPdf ? "Broadcasting..." : `Send via ${shareChannel.toUpperCase()}`}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ==========================================
  // PAGE 7: CLINICAL NOTES ARCHIVE
  // ==========================================
  function renderClinicalNotesArchive() {
    const mockNotes = [
      {
        id: "N-8801",
        patientName: "Priya Mehta",
        date: "2025-01-05",
        complaint: "Routine blood pressure monitoring consult",
        tag: "Hypertension",
        subjective: "Priya presented for BP check. Complains of mild headaches resolving with rest.",
        objective: "BP: 128/82. HR: 74. Weight: 67 kg.",
        assessment: "Hypertension Stage 1, stable on Atorvastatin regimen. No visual distortions.",
        plan: "Re-check lipid panels. Schedule full blood scan."
      },
      {
        id: "N-8802",
        patientName: "Anita Singh",
        date: "2025-01-10",
        complaint: "BP medication tolerance rechecking",
        tag: "Checkup",
        subjective: "Adhering strictly to Amlodipine. No ankle swelling reported.",
        objective: "BP: 122/80. Weight: 62. Cardiac outputs stable.",
        assessment: "Primary hypertension well-controlled on calcium channel blocker.",
        plan: "Continue current prescription baseline of Amlodipine 5mg."
      }
    ];

    const activeNoteId = selectedNoteId || mockNotes[0].id;
    const currentNoteObj = mockNotes.find(n => n.id === activeNoteId) || mockNotes[0];

    return (
      <div className="flex-1 flex overflow-hidden bg-bg-base">
        {/* Left Side: Archive index (40%) */}
        <div className="w-[40%] border-r border-border-dim flex flex-col bg-bg-surface overflow-hidden shrink-0">
          <div className="p-4 border-b border-border-dim bg-bg-base/20">
            <span className="text-[10px] font-sans font-bold text-text-tertiary uppercase tracking-wider block">
              CLINICAL NOTE RECORDS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border-dim">
            {mockNotes.map((note) => {
              const isActive = note.id === activeNoteId;
              return (
                <button
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full p-4 hover:bg-bg-subtle/30 text-left transition-colors relative block ${
                    isActive ? "bg-bg-subtle/50" : ""
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent" />
                  )}
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-sans font-bold text-text-primary">{note.patientName}</span>
                    <span className="font-mono text-[9px] text-text-tertiary">{note.date}</span>
                  </div>
                  <span className="text-[10px] font-sans text-accent bg-accent/5 rounded-xs px-1.5 py-0.5 inline-block mt-1 font-semibold">
                    {note.tag}
                  </span>
                  <p className="text-xs font-sans text-text-secondary mt-1.5 truncate leading-normal">
                    {note.complaint}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed expanded pane (60%) */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto select-text">
          <div className="flex justify-between items-start pb-4 border-b border-border-dim">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-display font-medium text-text-primary">
                  {currentNoteObj.patientName}
                </h2>
                <span className="text-[10px] font-mono text-text-tertiary rounded-xs px-1.5 py-0.5 bg-bg-surface border border-border-dim">
                  NOTE ID: {currentNoteObj.id}
                </span>
              </div>
              <span className="text-xs font-sans text-text-secondary">Consultation date: {currentNoteObj.date}</span>
            </div>

            <button
              onClick={() => showToast("Reprint system initialized for cloud record.")}
              className="bg-bg-surface border border-border-dim hover:bg-bg-subtle text-text-secondary text-xs font-sans font-bold px-3 py-1.5 rounded-sm flex items-center gap-1 shadow-sm"
            >
              <Printer size={13} /> Export PDF
            </button>
          </div>

          <div className="space-y-5">
            {/* SUBJECTIVE */}
            <div className="space-y-1 bg-bg-surface p-4 rounded-sm border border-border-dim">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase">SUBJECTIVE COMPLAINTS</span>
              <p className="text-xs font-sans text-text-primary leading-normal mt-1">
                "{currentNoteObj.subjective}"
              </p>
            </div>

            {/* OBJECTIVE */}
            <div className="space-y-1 bg-bg-surface p-4 rounded-sm border border-border-dim">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase">OBJECTIVE DATA</span>
              <p className="text-xs font-sans text-text-primary leading-normal mt-1 font-mono">
                {currentNoteObj.objective}
              </p>
            </div>

            {/* ASSESSMENT */}
            <div className="space-y-1 bg-bg-surface p-4 rounded-sm border border-border-dim">
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase">ASSESSMENT / CLINICAL DIAGNOSIS</span>
              <p className="text-xs font-sans text-text-primary leading-normal mt-1">
                {currentNoteObj.assessment}
              </p>
            </div>

            {/* PLAN */}
            <div className="space-y-1 bg-bg-surface p-4 rounded-sm border border-border-dim">
              <span className="text-[10px] font-sans font-bold tracking-widest text-[#008080] uppercase">THERAPUTIC PLAN</span>
              <p className="text-xs font-sans text-text-primary leading-normal mt-1 italic text-text-secondary">
                {currentNoteObj.plan}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // PAGE 8: REVENUE METRICS / SLOTSAVER PANEL
  // ==========================================
  function renderSlotSaverDashboard() {
    return (
      <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto bg-bg-base">
        <div>
          <h1 className="text-2xl font-display font-medium text-text-primary">
            SlotSaver Revenue Protection Engine
          </h1>
          <p className="text-xs font-sans text-text-secondary mt-1">
            Re-allocating unfulfilled clinic slots using clinical waitlists and secure smart auto-outreach protocols.
          </p>
        </div>

        {/* Dense metric cards row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs">
          <div>
            <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
              TOTAL REVENUE RECOVERED
            </span>
            <span className="text-3xl font-mono font-bold text-accent block mt-1.5">
              ₹42,000
            </span>
            <span className="text-[11px] font-sans text-status-safe block mt-1">
              ✓ 22 No-shows prevented
            </span>
          </div>

          <div>
            <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
              PROTECTION EFFICIENCY
            </span>
            <span className="text-3xl font-mono font-bold text-accent block mt-1.5">
              84%
            </span>
            <span className="text-[11px] font-sans text-text-tertiary block mt-1">
              Sector average benchmark: 60%
            </span>
          </div>

          <div>
            <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
              AVG SLOT FILL LATENCY
            </span>
            <span className="text-3xl font-mono font-bold text-accent block mt-1.5">
              6m 40s
            </span>
            <span className="text-[11px] font-sans text-status-safe block mt-1">
              Real-time response rate
            </span>
          </div>

          <div>
            <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
              ACTIVE SESIONS NOW
            </span>
            <span className="text-3xl font-mono font-bold text-status-warning block mt-1.5">
              1 Session
            </span>
            <span className="text-[11px] font-sans text-text-secondary block mt-1">
              Protecting 10:30 AM slot
            </span>
          </div>
        </div>

        {/* Custom Vector Area Chart for Revenue Trend */}
        <div className="bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs">
          <div className="pb-4 border-b border-border-dim flex justify-between items-center mb-4">
            <div>
              <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
                REVENUE OUTCOMES TIMELINE (30 DAYS)
              </span>
              <h3 className="text-xs font-sans font-semibold text-text-secondary mt-0.5">
                Daily protected revenue trajectory represented in Indian Rupees (INR)
              </h3>
            </div>
          </div>

          {/* Render real responsive interactive vector SVG lines for chart */}
          <div className="relative h-44 flex items-center justify-center bg-bg-base/50 border border-border-dim/80 rounded-sm">
            <svg viewBox="0 0 500 120" className="w-full h-full text-accent" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent, #40e0d0)" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="var(--color-accent, #40e0d0)" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="var(--color-border-dim, #111)" strokeOpacity="0.1" strokeDasharray="3,3"/>
              <line x1="0" y1="60" x2="500" y2="60" stroke="var(--color-border-dim, #111)" strokeOpacity="0.1" strokeDasharray="3,3"/>
              <line x1="0" y1="90" x2="500" y2="90" stroke="var(--color-border-dim, #111)" strokeOpacity="0.1" strokeDasharray="3,3"/>

              {/* Area path */}
              <path
                d="M 10 110 L 60 90 L 120 100 L 180 50 L 240 70 L 300 40 L 360 45 L 420 20 L 490 10 L 490 110 Z"
                fill="url(#areaGrad)"
              />
              {/* Stroke line path */}
              <path
                d="M 10 110 L 60 90 L 120 100 L 180 50 L 240 70 L 300 40 L 360 45 L 420 20 L 490 10"
                fill="none"
                stroke="var(--color-accent, #40e0d0)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              
              {/* Highlight vertices dots */}
              <circle cx="180" cy="50" r="3.5" className="fill-accent" />
              <circle cx="300" cy="40" r="3.5" className="fill-accent" />
              <circle cx="420" cy="20" r="3.5" className="fill-accent" />
              <circle cx="490" cy="10" r="3.5" className="fill-accent" />

              {/* Label labels */}
              <text x="185" y="45" className="text-[8px] font-mono fill-text-primary">₹3,000</text>
              <text x="305" y="35" className="text-[8px] font-mono fill-text-primary">₹4,500</text>
              <text x="415" y="15" className="text-[8px] font-mono fill-text-primary">₹6,000</text>
            </svg>
            <span className="absolute bottom-1 right-2 text-[9px] font-mono text-text-tertiary select-none">
              Interactive Live telemetry verified
            </span>
          </div>
        </div>

        {/* Live Protection Sessions and Next Day Risks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Active Sessions */}
          <div className="bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs space-y-4">
            <span className="text-[10px] font-sans font-bold tracking-widest text-[#008080] uppercase block">
              LIVE CANCELLED SLOT OUTREACH OUTCOMES
            </span>
            
            <div className="p-4 bg-bg-base border border-border-dim rounded-sm">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-text-primary">Slot: 10:30 AM appointment</span>
                  <span className="text-[10.5px] text-text-tertiary block mt-0.5">Cardiologist consult (Cancelled by Dev Shah)</span>
                </div>
                <span className="text-[10px] font-sans font-bold text-status-warning bg-status-warning/10 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                  Outreach sent
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-border-dim/40 space-y-2 text-xs font-sans text-text-secondary leading-normal">
                <p>• Waitlisted patient <span className="font-bold text-text-primary">Priya Mehta</span> targeted due to High matching suitability index.</p>
                <p>• WhatsApp auto-notified dispatched: <span className="font-mono text-[11px]">8:42 AM</span>.</p>
                <p>• Clinical triage response queue timer: <span className="font-mono text-[11px] font-bold text-text-primary">02m 44s elapsed</span> (Awaiting confirmation click).</p>
              </div>
            </div>
          </div>

          {/* Tomorrow's risk mitigation table */}
          <div className="bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs space-y-4">
            <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase block">
              TOMORROW HIGH NO-SHOW RISK DEVIATIONS
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-dim pb-1.5 text-[9px] font-sans font-bold text-text-tertiary uppercase tracking-wider">
                    <th>PATIENT</th>
                    <th>TARGET TIME</th>
                    <th>RISK PROFILE</th>
                    <th className="text-right">INTERVENTION STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dim">
                  <tr className="h-10 text-xs font-sans">
                    <td className="font-bold text-text-primary">Rohit Sharma</td>
                    <td className="font-mono text-text-secondary">10:00 AM</td>
                    <td className="text-status-danger font-bold">92% Risk Score</td>
                    <td className="text-right font-medium text-status-safe">✓ Pre-called & Confirmed</td>
                  </tr>
                  <tr className="h-10 text-xs font-sans">
                    <td className="font-bold text-text-primary">Neha Gupta</td>
                    <td className="font-mono text-text-secondary">12:30 PM</td>
                    <td className="text-status-warning font-semibold">74% Risk Score</td>
                    <td className="text-right">
                      <button 
                        onClick={() => showToast("Dispatched priority SMS confirm ticket.")}
                        className="bg-accent/10 text-accent font-bold text-[10px] px-2 py-0.5 border border-accent/25 rounded-sm hover:bg-accent/20"
                      >
                        Queue Outreach
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // PAGE 9: SETTINGS
  // ==========================================
  function renderSettingsPage() {
    return (
      <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto bg-bg-base select-none">
        <div>
          <h1 className="text-2xl font-display font-medium text-text-primary">
            Clinic Customization Panel
          </h1>
          <p className="text-xs font-sans text-text-secondary mt-1">
            Configure default cardiology templates, automation rates, speech models, and billing setups.
          </p>
        </div>

        <div className="max-w-2xl bg-bg-surface p-6 rounded-sm border border-border-dim shadow-xs space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-sans font-bold text-text-primary uppercase tracking-wider pb-1.5 border-b border-border-dim">
              Professional clinical metadata
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-sans text-text-secondary block mb-1">Full practitioner name</span>
                <input
                  type="text"
                  defaultValue="Dr. Rajesh Sharma"
                  className="w-full bg-bg-base border border-border-dim rounded-sm p-2 text-xs text-text-primary focus:outline-hidden"
                />
              </div>

              <div>
                <span className="text-[10px] font-sans text-text-secondary block mb-1">Clinic registry license</span>
                <input
                  type="text"
                  defaultValue="MCI/DL/2018/48291"
                  className="w-full bg-bg-base border border-border-dim rounded-sm p-2 text-xs text-text-primary focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-sans font-bold text-text-primary uppercase tracking-wider pb-1.5 border-b border-border-dim">
              Clinical Scribe Default Rules
            </h3>
            
            <div className="space-y-3 text-xs font-sans text-text-secondary leading-normal">
              <div className="flex justify-between items-center">
                <span>Auto-generate Medication Reason tags from diagnostics</span>
                <button 
                  onClick={() => showToast("Toggled auto-generation rules.")}
                  className="text-xs text-accent font-semibold hover:underline"
                >
                  Enabled ✓
                </button>
              </div>

              <div className="flex justify-between items-center">
                <span>Inline Drug interaction check with Allergy Registry</span>
                <button 
                  onClick={() => showToast("Toggled allergy checks.")}
                  className="text-xs text-accent font-semibold hover:underline"
                >
                  Strict Protection ✓
                </button>
              </div>

              <div className="flex justify-between items-center">
                <span>Auto-dispatch SlotSaver SMS invitations to targeted waitlist</span>
                <button 
                  onClick={() => showToast("Toggled auto-dispatch.")}
                  className="text-xs text-text-tertiary font-semibold hover:underline"
                >
                  Manual Confirm (Safe Mode)
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => showToast("Configuration saved perfectly structure.")}
              className="bg-accent text-bg-base text-xs font-sans font-bold px-4 py-2 rounded-sm shadow-sm hover:opacity-90"
            >
              Save Configuration Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // ROOT RENDER LAYOUT
  // ========================================================
  return (
    <div className="flex-1 flex flex-col overflow-hidden max-w-full">
      {/* Absolute Toast alert for micro feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-6 right-6 bg-text-primary text-bg-base text-xs font-sans py-3 px-5 rounded-sm shadow-xl z-50 border border-transparent flex items-center gap-3 select-none"
          >
            <CheckCircle size={15} className="text-status-safe shrink-0 text-accent" />
            <span className="font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main active subview portal */}
      {renderActiveSubView()}
    </div>
  );
}
