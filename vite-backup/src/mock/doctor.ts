export interface QueueItem {
  appointmentId: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  time: string;
  reason: string;
  status: "in-progress" | "waiting" | "upcoming" | "completed" | "cancelled";
  riskScore: number | null;
  waitMinutes: number | null;
}

export const currentDoctor = {
  id: "D-001",
  name: "Dr. Rajesh Sharma",
  specialty: "Cardiology",
  registrationNo: "MCI/DL/2018/48291",
  clinicName: "City Clinic",
};

export const todayQueue: QueueItem[] = [
  {
    appointmentId: "A-8820",
    patientId: "P-1041",
    patientName: "Anita Singh",
    age: 45,
    gender: "F",
    time: "09:00 AM",
    reason: "Follow-up — BP management",
    status: "completed",
    riskScore: null,
    waitMinutes: 0,
  },
  {
    appointmentId: "A-8821",
    patientId: "P-1042",
    patientName: "Priya Mehta",
    age: 34,
    gender: "F",
    time: "09:30 AM",
    reason: "Follow-up — Hypertension Check",
    status: "in-progress",
    riskScore: 0.81,
    waitMinutes: 12,
  },
  {
    appointmentId: "A-8822",
    patientId: "P-1043",
    patientName: "Rohit Sharma",
    age: 52,
    gender: "M",
    time: "10:00 AM",
    reason: "New patient — Severe chest distress and breath loss",
    status: "waiting",
    riskScore: 0.23,
    waitMinutes: 5,
  },
  {
    appointmentId: "A-8823",
    patientId: "P-1044",
    patientName: "Karan Patel",
    age: 38,
    gender: "M",
    time: "10:30 AM",
    reason: "Palpitations & fluttering sensation",
    status: "waiting",
    riskScore: 0.55,
    waitMinutes: 8,
  },
  {
    appointmentId: "A-8824",
    patientId: "P-1045",
    patientName: "Ramesh Iyer",
    age: 61,
    gender: "M",
    time: "11:00 AM",
    reason: "Post-Ischemic stroke rehab review",
    status: "upcoming",
    riskScore: 0.92,
    waitMinutes: null,
  },
  {
    appointmentId: "A-8825",
    patientId: "P-1046",
    patientName: "Sunita Rao",
    age: 49,
    gender: "F",
    time: "11:30 AM",
    reason: "Statins efficacy & muscle fatigue check",
    status: "upcoming",
    riskScore: 0.12,
    waitMinutes: null,
  },
  {
    appointmentId: "A-8826",
    patientId: "P-1047",
    patientName: "Devendra Shah",
    age: 67,
    gender: "M",
    time: "12:00 PM",
    reason: "Pacemaker telemetry check",
    status: "upcoming",
    riskScore: null,
    waitMinutes: null,
  },
  {
    appointmentId: "A-8827",
    patientId: "P-1048",
    patientName: "Neha Gupta",
    age: 29,
    gender: "F",
    time: "12:30 PM",
    reason: "Mitral valve regular follow-up",
    status: "upcoming",
    riskScore: 0.42,
    waitMinutes: null,
  },
  {
    appointmentId: "A-8828",
    patientId: "P-1049",
    patientName: "Vikram Malhotra",
    age: 55,
    gender: "M",
    time: "01:00 PM",
    reason: "Uncontrolled hypertension Stage 2",
    status: "upcoming",
    riskScore: 0.77,
    waitMinutes: null,
  },
  {
    appointmentId: "A-8829",
    patientId: "P-1050",
    patientName: "Sneha Patil",
    age: 42,
    gender: "F",
    time: "02:00 PM",
    reason: "Arrhythmia diagnostic planning",
    status: "upcoming",
    riskScore: 0.15,
    waitMinutes: null,
  },
  {
    appointmentId: "A-8830",
    patientId: "P-1051",
    patientName: "Rajesh Joshi",
    age: 58,
    gender: "M",
    time: "02:30 PM",
    reason: "Angioplasty annual follow-up",
    status: "upcoming",
    riskScore: 0.61,
    waitMinutes: null,
  },
  {
    appointmentId: "A-8831",
    patientId: "P-1052",
    patientName: "Ajay Gill",
    age: 50,
    gender: "M",
    time: "03:00 PM",
    reason: "BP medication tolerance check",
    status: "upcoming",
    riskScore: 0.38,
    waitMinutes: null,
  }
];

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  allergies: string[];
  medicalHistory: Array<{ condition: string; since: string; status: string }>;
  vitalsHistory: Array<{ date: string; bp: string; weight: number; heartRate: number }>;
  currentMedications: Array<{ name: string; dosage: string; since: string }>;
  lastVisitSummary: string;
  aiAlert: string | null;
  lastLabResults: Array<{ test: string; value: string; unit: string; trend: "up" | "down" | "neutral"; status: "high" | "warning" | "normal" }>;
}

export const patientProfiles: Record<string, PatientProfile> = {
  "P-1041": {
    id: "P-1041",
    name: "Anita Singh",
    age: 45,
    gender: "F",
    bloodGroup: "A+",
    phone: "+91 94451 12345",
    allergies: ["Sulfonamides"],
    medicalHistory: [
      { condition: "Mild Essential Hypertension", since: "Jan 2024", status: "managed" }
    ],
    vitalsHistory: [
      { date: "2025-01-10", bp: "122/80", weight: 62, heartRate: 72 },
      { date: "2024-10-15", bp: "130/84", weight: 62, heartRate: 75 }
    ],
    currentMedications: [
      { name: "Amlodipine 5mg", dosage: "1-0-0", since: "2024-01-15" }
    ],
    lastVisitSummary: "BP stable at 122/80. No subjective fatigue. Lifestyle changes yielding good progression.",
    aiAlert: null,
    lastLabResults: [
      { test: "Serum Creatinine", value: "0.8", unit: "mg/dL", trend: "neutral", status: "normal" }
    ]
  },
  "P-1042": {
    id: "P-1042",
    name: "Priya Mehta",
    age: 34,
    gender: "F",
    bloodGroup: "B+",
    phone: "+91 98765 43210",
    allergies: ["Penicillin"],
    medicalHistory: [
      { condition: "Hypertension Stage 1", since: "Nov 2024", status: "active" },
      { condition: "Hyperlipidemia", since: "Nov 2024", status: "active" },
    ],
    vitalsHistory: [
      { date: "2025-01-05", bp: "128/82", weight: 67, heartRate: 74 },
      { date: "2024-12-01", bp: "138/88", weight: 68, heartRate: 78 },
      { date: "2024-11-15", bp: "142/90", weight: 68, heartRate: 80 },
    ],
    currentMedications: [
      { name: "Atorvastatin 10mg", dosage: "1-0-1", since: "2025-01-05" },
      { name: "Aspirin 75mg", dosage: "1-0-0", since: "2025-01-05" },
    ],
    lastVisitSummary: "BP improving on Atorvastatin. Lipid panel shows LDL reducing. HbA1c borderline — monitor.",
    aiAlert: "HbA1c trending up over 3 visits. Consider pre-diabetes screening.",
    lastLabResults: [
      { test: "LDL Cholesterol", value: "142", unit: "mg/dL", trend: "down", status: "high" },
      { test: "HbA1c", value: "5.9", unit: "%", trend: "up", status: "warning" },
    ],
  },
  "P-1043": {
    id: "P-1043",
    name: "Rohit Sharma",
    age: 52,
    gender: "M",
    bloodGroup: "O+",
    phone: "+91 98651 88776",
    allergies: [],
    medicalHistory: [
      { condition: "Acute Chest Distress", since: "Jan 2026", status: "evaluating" },
      { condition: "Obesity Class I", since: "Feb 2021", status: "active" }
    ],
    vitalsHistory: [
      { date: "2026-01-14", bp: "145/92", weight: 89, heartRate: 88 }
    ],
    currentMedications: [],
    lastVisitSummary: "Admitted today with sub-sternal tightness radiating to shoulder. High cardiac enzymes pending validation.",
    aiAlert: "Severe high risk: High probability of acute coronary syndrome.",
    lastLabResults: [
      { test: "High-Sens Troponin I", value: "48", unit: "ng/L", trend: "up", status: "high" },
      { test: "CK-MB", value: "24", unit: "U/L", trend: "up", status: "high" }
    ]
  },
  "P-1044": {
    id: "P-1044",
    name: "Karan Patel",
    age: 38,
    gender: "M",
    bloodGroup: "A-",
    phone: "+91 91765 00998",
    allergies: ["Aspirin", "Ibuprofen"],
    medicalHistory: [
      { condition: "Paroxysmal Atrial Fibrillation", since: "Aug 2025", status: "active" }
    ],
    vitalsHistory: [
      { date: "2025-12-11", bp: "118/76", weight: 74, heartRate: 98 },
      { date: "2025-10-02", bp: "122/80", weight: 75, heartRate: 104 }
    ],
    currentMedications: [
      { name: "Metoprolol Succinate 25mg", dosage: "0-0-1", since: "2025-08-20" },
      { name: "Apixaban 5mg", dosage: "1-1-0", since: "2025-08-20" }
    ],
    lastVisitSummary: "Occasional racing heart incidents. Compliant with anticoagulation schedule.",
    aiAlert: "Aspirin is listed as a major drug allergy constraint. Avoid prescribing antiplatelets.",
    lastLabResults: [
      { test: "Potassium", value: "4.1", unit: "mEq/L", trend: "neutral", status: "normal" }
    ]
  },
  "P-1045": {
    id: "P-1045",
    name: "Ramesh Iyer",
    age: 61,
    gender: "M",
    bloodGroup: "O-",
    phone: "+91 94231 44556",
    allergies: ["Penicillin"],
    medicalHistory: [
      { condition: "Ischemic Stroke", since: "Aug 2025", status: "recovering" }
    ],
    vitalsHistory: [
      { date: "2026-01-08", bp: "135/85", weight: 78, heartRate: 74 }
    ],
    currentMedications: [
      { name: "Clopidogrel 75mg", dosage: "1-0-0", since: "2025-08-15" }
    ],
    lastVisitSummary: "Stroke rehabilitation progressing under physiotherapy control. Speech and cognitive metrics improving.",
    aiAlert: "Monitor motor coordination and speech fluidity closely.",
    lastLabResults: [
      { test: "PT-INR", value: "2.1", unit: "", trend: "neutral", status: "normal" }
    ]
  },
  "P-1046": {
    id: "P-1046",
    name: "Sunita Rao",
    age: 49,
    gender: "F",
    bloodGroup: "O+",
    phone: "+91 91102 77889",
    allergies: [],
    medicalHistory: [
      { condition: "Hypercholesterolemia", since: "May 2024", status: "managed" }
    ],
    vitalsHistory: [
      { date: "2025-11-12", bp: "128/80", weight: 64, heartRate: 72 }
    ],
    currentMedications: [
      { name: "Atorvastatin 20mg", dosage: "0-0-1", since: "2024-05-20" }
    ],
    lastVisitSummary: "Complaining of mild periodic muscle fatigue and soreness — potentially statin-induced myopathy. Creatinine kinase tests required.",
    aiAlert: "Slight elevation of creatine kinase should be monitored.",
    lastLabResults: [
      { test: "Creatine Kinase", value: "190", unit: "U/L", trend: "up", status: "warning" }
    ]
  },
  "P-1047": {
    id: "P-1047",
    name: "Devendra Shah",
    age: 67,
    gender: "M",
    bloodGroup: "AB+",
    phone: "+91 98223 99881",
    allergies: ["Sulfa Drugs"],
    medicalHistory: [
      { condition: "Sinoatrial Node Dysfunction", since: "Mar 2023", status: "managed" }
    ],
    vitalsHistory: [
      { date: "2025-12-19", bp: "124/78", weight: 70, heartRate: 64 }
    ],
    currentMedications: [
      { name: "Metoprolol Succinate 50mg", dosage: "0-0-1", since: "2023-04-10" }
    ],
    lastVisitSummary: "Pacemaker telemetry shows 98% pacing utility, battery status excellent. Holter diagnostics clear of major arrhythmias.",
    aiAlert: "Pacemaker threshold settings stable. No abnormal pacing triggers highlighted.",
    lastLabResults: [
      { test: "NT-proBNP", value: "145", unit: "pg/mL", trend: "neutral", status: "normal" }
    ]
  },
  "P-1048": {
    id: "P-1048",
    name: "Neha Gupta",
    age: 29,
    gender: "F",
    bloodGroup: "A-",
    phone: "+91 93111 22334",
    allergies: [],
    medicalHistory: [
      { condition: "Mitral Valve Prolapse", since: "Jun 2022", status: "monitoring" }
    ],
    vitalsHistory: [
      { date: "2025-06-15", bp: "115/72", weight: 52, heartRate: 82 }
    ],
    currentMedications: [],
    lastVisitSummary: "Satisfactory hemodynamics. No chest distress or syncope complaints. Click-murmur remains stable.",
    aiAlert: "Annual echocardiogram is due within next 60 days.",
    lastLabResults: [
      { test: "Hemoglobin", value: "12.8", unit: "g/dL", trend: "neutral", status: "normal" }
    ]
  },
  "P-1049": {
    id: "P-1049",
    name: "Vikram Malhotra",
    age: 55,
    gender: "M",
    bloodGroup: "B+",
    phone: "+91 98110 55667",
    allergies: [],
    medicalHistory: [
      { condition: "Uncontrolled Hypertension Stage 2", since: "Jan 2026", status: "active" }
    ],
    vitalsHistory: [
      { date: "2026-01-05", bp: "155/98", weight: 85, heartRate: 84 }
    ],
    currentMedications: [
      { name: "Telmisartan 40mg", dosage: "1-0-0", since: "2026-01-05" }
    ],
    lastVisitSummary: "Severe blood pressure reading at 155/98. Needs titration or combination therapy. Compliance check required.",
    aiAlert: "Dangerously high systolic reading. Recommend dual blocker initiation.",
    lastLabResults: [
      { test: "Serum Potassium", value: "4.3", unit: "mEq/L", trend: "neutral", status: "normal" }
    ]
  },
  "P-1050": {
    id: "P-1050",
    name: "Sneha Patil",
    age: 42,
    gender: "F",
    bloodGroup: "O+",
    phone: "+91 99201 88990",
    allergies: ["Contrast Dye"],
    medicalHistory: [
      { condition: "Supraventricular Tachycardia", since: "Oct 2024", status: "evaluating" }
    ],
    vitalsHistory: [
      { date: "2025-09-02", bp: "120/75", weight: 58, heartRate: 110 }
    ],
    currentMedications: [
      { name: "Diltiazem 120mg", dosage: "1-0-1", since: "2024-11-01" }
    ],
    lastVisitSummary: "Occasional racing pulse episodes. Patient was counselled on vagal maneuvers.",
    aiAlert: "Track resting heart rate trend closely to confirm pharmacological suppression.",
    lastLabResults: [
      { test: "TSH", value: "1.8", unit: "uIU/mL", trend: "neutral", status: "normal" }
    ]
  },
  "P-1051": {
    id: "P-1051",
    name: "Rajesh Joshi",
    age: 58,
    gender: "M",
    bloodGroup: "AB-",
    phone: "+91 90045 11223",
    allergies: ["Aspirin"],
    medicalHistory: [
      { condition: "Coronary Artery Disease", since: "Jul 2021", status: "managed" }
    ],
    vitalsHistory: [
      { date: "2025-07-20", bp: "126/82", weight: 80, heartRate: 68 }
    ],
    currentMedications: [
      { name: "Clopidogrel 75mg", dosage: "1-0-0", since: "2021-08-01" },
      { name: "Metoprolol 25mg", dosage: "0-0-1", since: "2021-08-01" }
    ],
    lastVisitSummary: "Annual post-angioplasty check up. ECG shows normal sinus rhythm. Stable cardiovascular functional class.",
    aiAlert: "Aspirin allergy documented. Verify non-exposure to antiplatelet cross-reactivities.",
    lastLabResults: [
      { test: "Total Cholesterol", value: "165", unit: "mg/dL", trend: "down", status: "normal" }
    ]
  },
  "P-1052": {
    id: "P-1052",
    name: "Ajay Gill",
    age: 50,
    gender: "M",
    bloodGroup: "B-",
    phone: "+91 95400 33445",
    allergies: [],
    medicalHistory: [
      { condition: "Borderline Hypertension", since: "Dec 2025", status: "re-evaluating" }
    ],
    vitalsHistory: [
      { date: "2025-12-05", bp: "132/86", weight: 82, heartRate: 75 }
    ],
    currentMedications: [],
    lastVisitSummary: "Advised dietary sodium restriction and tracking daily pressures before commencing pharmacotherapy.",
    aiAlert: "Borderline reading. Lifestyle measures remain baseline therapeutic standard.",
    lastLabResults: [
      { test: "Fasting Blood Sugar", value: "102", unit: "mg/dL", trend: "neutral", status: "normal" }
    ]
  }
};

export const clinicalNotesDraft = {
  appointmentId: "A-8821",
  subjective: "",
  objective: { bp: "", weight: "", heartRate: "" },
  assessment: "",
  plan: "",
  testsOrdered: [],
};

export const drugDatabase = [
  {
    name: "Atorvastatin",
    strengths: ["5mg", "10mg", "20mg", "40mg", "80mg"],
    category: "Statin",
    commonDosage: "1-0-1",
    duration: "30 days",
    instructions: "Take after dinner. Avoid grapefruit juice.",
    contraindications: ["Active liver disease", "Pregnancy"],
    interactions: ["Warfarin", "Clarithromycin", "Itraconazole"],
  },
  {
    name: "Aspirin",
    strengths: ["75mg", "150mg", "325mg", "650mg"],
    category: "Antiplatelet / NSAID",
    commonDosage: "1-0-0",
    duration: "30 days",
    instructions: "Take with food. Do not crush.",
    contraindications: ["Active GI bleed", "Aspirin allergy"],
    interactions: ["Warfarin", "Ibuprofen", "Clopidogrel"],
  },
  {
    name: "Ramipril",
    strengths: ["2.5mg", "5mg", "10mg"],
    category: "ACE Inhibitor",
    commonDosage: "1-0-0",
    duration: "30 days",
    instructions: "Best taken in morning. Monitor for dry cough.",
    contraindications: ["Angioedema", "Bilateral renal artery stenosis"],
    interactions: ["Spironolactone", "Ibuprofen", "Lithium"],
  },
  {
    name: "Amlodipine",
    strengths: ["2.5mg", "5mg", "10mg"],
    category: "Calcium Channel Blocker",
    commonDosage: "1-0-0",
    duration: "30 days",
    instructions: "May cause minor ankle swelling. Report if severe.",
    contraindications: ["Severe hypotension", "Aortic stenosis"],
    interactions: ["Simvastatin", "Sildenafil", "Clarithromycin"],
  },
  {
    name: "Metoprolol Succinate",
    strengths: ["25mg", "50mg", "100mg"],
    category: "Beta-Blocker",
    commonDosage: "0-0-1",
    duration: "30 days",
    instructions: "Take with meal. Do not stop abruptly.",
    contraindications: ["Bradycardia (HR<50)", "Second/third degree heart block"],
    interactions: ["Diltiazem", "Digoxin", "Fluoxetine"],
  },
  {
    name: "Clopidogrel",
    strengths: ["75mg"],
    category: "P2Y12 Antiplatelet",
    commonDosage: "1-0-0",
    duration: "30 days",
    instructions: "Can take with or without food. Monitor for bleeding gums.",
    contraindications: ["Active bleeding", "Severe hepatic impairment"],
    interactions: ["Omeprazole", "Aspirin", "Ibuprofen"],
  },
  {
    name: "Ibuprofen",
    strengths: ["200mg", "400mg", "600mg"],
    category: "NSAID Analgesic",
    commonDosage: "1-0-1",
    duration: "5 days",
    instructions: "Take with food. Discontinue as soon as pain resolves.",
    contraindications: ["Active peptic ulcer", "Severe renal impairment"],
    interactions: ["Aspirin", "Amlodipine", "Warfarin", "Ramipril"],
  },
  {
    name: "Warfarin",
    strengths: ["1mg", "2mg", "5mg"],
    category: "Vitamin K Antagonist",
    commonDosage: "0-0-1",
    duration: "90 days",
    instructions: "Requires routine INR blood checks. Wear alert band.",
    contraindications: ["Uncontrolled severe hypertension", "Major hemorrhage risk"],
    interactions: ["Aspirin", "Ibuprofen", "Atorvastatin"],
  }
];

export const slotSaverMetrics = {
  today: {
    slotsProtected: 3,
    revenueProtectedInr: 4500,
    activeRecoverySessions: 1,
    highRiskTomorrow: 4,
  },
  month: {
    revenueProtectedInr: 42000,
    protectionRate: 0.84,
    avgFillTimeSeconds: 400,
    prevented: 22,
  },
};
