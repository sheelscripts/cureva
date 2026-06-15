export const currentPatient = {
  id: "P-1042",
  name: "Priya Mehta",
  age: 34,
  gender: "F",
  bloodGroup: "B+",
  phone: "+91 98765 43210",
  email: "priya.mehta@gmail.com",
  allergies: ["Penicillin", "Sulfa drugs"],
  distanceKm: 2.1,
}

export const appointments = [
  {
    id: "A-8821",
    doctorName: "Dr. Rajesh Sharma",
    specialty: "Cardiology",
    date: "2025-01-16",
    time: "4:00 PM",
    status: "upcoming",
    location: "City Clinic, Sector 12",
    valueInr: 1500,
    reason: "Follow-up — Hypertension",
  },
  {
    id: "A-8790",
    doctorName: "Dr. Ananya Gupta",
    specialty: "General Medicine",
    date: "2025-01-05",
    time: "11:00 AM",
    status: "completed",
    location: "City Clinic, Sector 12",
    valueInr: 800,
    reason: "Fever + Cold",
  },
  {
    id: "A-8701",
    doctorName: "Dr. Rajesh Sharma",
    specialty: "Cardiology",
    date: "2024-12-15",
    time: "2:30 PM",
    status: "completed",
    location: "City Clinic, Sector 12",
    valueInr: 1500,
    reason: "Initial BP Spike Assessment",
  },
  {
    id: "A-8610",
    doctorName: "Dr. Priya Gupta",
    specialty: "Dermatology",
    date: "2024-11-20",
    time: "5:15 PM",
    status: "completed",
    location: "South Wing Specialist Clinic",
    valueInr: 1200,
    reason: "Atypical contact dermatitis on forearms",
  },
  {
    id: "A-8540",
    doctorName: "Dr. Rajesh Sharma",
    specialty: "Cardiology",
    date: "2024-10-02",
    time: "10:00 AM",
    status: "cancelled",
    location: "City Clinic, Sector 12",
    valueInr: 1500,
    reason: "Severe traffic backlog in East Delhi",
  },
  {
    id: "A-8902",
    doctorName: "Dr. Rohan Verma",
    specialty: "Orthopedics",
    date: "2025-01-14",
    time: "11:30 AM",
    status: "upcoming",
    location: "South Wing Specialist Clinic",
    valueInr: 1300,
    reason: "Post-marathon knee stiffness check",
  },
  {
    id: "A-8411",
    doctorName: "Dr. Ananya Gupta",
    specialty: "General Medicine",
    date: "2024-09-12",
    time: "09:30 AM",
    status: "completed",
    location: "City Clinic, Sector 12",
    valueInr: 800,
    reason: "Seasonal flu & viral checkup",
  },
  {
    id: "A-8390",
    doctorName: "Dr. Rajesh Sharma",
    specialty: "Cardiology",
    date: "2024-08-20",
    time: "3:45 PM",
    status: "completed",
    location: "City Clinic, Sector 12",
    valueInr: 1500,
    reason: "Quarterly lipid sweep review",
  },
  {
    id: "A-8210",
    doctorName: "Dr. Rohan Verma",
    specialty: "Orthopedics",
    date: "2024-07-15",
    time: "12:00 PM",
    status: "cancelled",
    location: "South Wing Specialist Clinic",
    valueInr: 1300,
    reason: "Work reschedule constraint",
  },
  {
    id: "A-8105",
    doctorName: "Dr. Priya Gupta",
    specialty: "Dermatology",
    date: "2024-06-10",
    time: "04:30 PM",
    status: "completed",
    location: "South Wing Specialist Clinic",
    valueInr: 1200,
    reason: "Mild eczema flare-up seasonal check",
  }
]

export const prescriptions = [
  {
    id: "RX-441",
    date: "2025-01-05",
    doctorName: "Dr. Rajesh Sharma",
    specialty: "Cardiology",
    diagnosis: "Hypertension Stage 1, Hyperlipidemia",
    medicines: [
      {
        name: "Atorvastatin",
        strength: "10mg",
        dosage: "1-0-1",
        duration: "30 days",
        instructions: "Take after dinner. Avoid grapefruit juice.",
      },
      {
        name: "Aspirin",
        strength: "75mg",
        dosage: "1-0-0",
        duration: "30 days",
        instructions: "Take with food. Do not crush.",
      },
    ],
    testsOrdered: ["HbA1c (fasting)", "Lipid Panel"],
    instructions: "Low sodium diet. Walk 30 minutes daily.",
    followUpDate: "2025-02-05",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "RX-392",
    date: "2024-11-20",
    doctorName: "Dr. Priya Gupta",
    specialty: "Dermatology",
    diagnosis: "Contact Dermatitis (Likely soap trigger)",
    medicines: [
      {
        name: "Elocon Ointment",
        strength: "0.1% w/w",
        dosage: "1-0-1",
        duration: "7 days",
        instructions: "Apply thin layer to affected skin daily.",
      },
      {
        name: "Levocetirizine",
        strength: "5mg",
        dosage: "0-0-1",
        duration: "10 days",
        instructions: "Take at bedtime if itching persists.",
      }
    ],
    testsOrdered: ["Allergy Patch Test"],
    instructions: "Avoid active hand scrubbing. Discontinue use of harsh commercial bath soaps. Choose hypoallergenic alternatives.",
    followUpDate: "2024-11-30",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    id: "RX-310",
    date: "2024-09-12",
    doctorName: "Dr. Ananya Gupta",
    specialty: "General Medicine",
    diagnosis: "Acute Viral Fever (Seasonal influenza)",
    medicines: [
      {
        name: "Paracetamol",
        strength: "650mg",
        dosage: "1-1-1",
        duration: "5 days",
        instructions: "Take SOS if body temperature goes above 99.5 F.",
      },
      {
        name: "Pantoprazole",
        strength: "40mg",
        dosage: "1-0-0",
        duration: "5 days",
        instructions: "To be consumed empty stomach in the morning."
      }
    ],
    testsOrdered: ["Complete Blood Count (CBC)"],
    instructions: "Adequate hydration (at least 3L fluids daily) is critical. Clear vegetable broth and absolute bed rest recommended.",
    followUpDate: "2024-09-17",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    id: "RX-285",
    date: "2024-06-10",
    doctorName: "Dr. Priya Gupta",
    specialty: "Dermatology",
    diagnosis: "Mild Seborrheic Dermatitis & Eczematous Flare",
    medicines: [
      {
        name: "Ketoconazole Shampoo",
        strength: "2%",
        dosage: "Twice weekly",
        duration: "30 days",
        instructions: "Lather scalp, leave on for 5 mins then rinse thoroughly.",
      }
    ],
    testsOrdered: [],
    instructions: "Keep hair hygiene optimum. Avoid thermal hair styling or dry heat applications.",
    followUpDate: "2024-07-10",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  }
]

export const labReports = [
  {
    id: "LAB-201",
    date: "2025-01-08",
    name: "Complete Blood Count (CBC)",
    orderedBy: "Dr. Rajesh Sharma",
    status: "normal",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    results: [
      { param: "Haemoglobin", value: "13.2", unit: "g/dL", range: "12.0–16.0", status: "normal" },
      { param: "WBC Count", value: "7200", unit: "/μL", range: "4000–11000", status: "normal" },
      { param: "Platelet Count", value: "245,000", unit: "/μL", range: "150,000-450,000", status: "normal" },
      { param: "RBC Count", value: "4.5", unit: "million/μL", range: "3.8-5.2", status: "normal" },
    ],
  },
  {
    id: "LAB-202",
    date: "2025-01-08",
    name: "Lipid Panel",
    orderedBy: "Dr. Rajesh Sharma",
    status: "review",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    results: [
      { param: "LDL Cholesterol", value: "142", unit: "mg/dL", range: "<130", status: "high" },
      { param: "HDL Cholesterol", value: "48", unit: "mg/dL", range: ">40", status: "normal" },
      { param: "Total Cholesterol", value: "210", unit: "mg/dL", range: "<200", status: "high" },
      { param: "Triglycerides", value: "155", unit: "mg/dL", range: "<150", status: "high" },
    ],
  },
  {
    id: "LAB-180",
    date: "2024-09-13",
    name: "Fasting Blood Sugar & HbA1c",
    orderedBy: "Dr. Ananya Gupta",
    status: "normal",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    results: [
      { param: "Fasting Blood Sugar", value: "92", unit: "mg/dL", range: "70–100", status: "normal" },
      { param: "HbA1c", value: "5.4", unit: "%", range: "<5.7", status: "normal" }
    ]
  },
  {
    id: "LAB-112",
    date: "2024-06-12",
    name: "Liver Function Test (LFT)",
    orderedBy: "Dr. Priya Gupta",
    status: "normal",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    results: [
      { param: "SGOT (AST)", value: "26", unit: "U/L", range: "5-40", status: "normal" },
      { param: "SGPT (ALT)", value: "29", unit: "U/L", range: "7-56", status: "normal" },
      { param: "Total Bilirubin", value: "0.8", unit: "mg/dL", range: "0.1-1.2", status: "normal" }
    ]
  }
]

export const healthTimeline = [
  { date: "2025-01-16", type: "appointment", label: "Cardiology Follow-up", status: "upcoming", doctor: "Dr. Rajesh Sharma" },
  { date: "2025-01-14", type: "appointment", label: "Orthopedic Care Slot", status: "upcoming", doctor: "Dr. Rohan Verma" },
  { date: "2025-01-08", type: "lab", label: "Blood Work & Lipid Panel", status: "completed", doctor: "Dr. Rajesh Sharma" },
  { date: "2025-01-05", type: "appointment", label: "Cardiology Visit", status: "completed", doctor: "Dr. Rajesh Sharma" },
  { date: "2024-12-15", type: "appointment", label: "Initial BP Spike Visit", status: "completed", doctor: "Dr. Rajesh Sharma" },
  { date: "2024-12-01", type: "prescription", label: "Prescription — Atorvastatin", status: "completed", doctor: "Dr. Rajesh Sharma" },
  { date: "2024-11-20", type: "appointment", label: "Skin Check — Rash Triage", status: "completed", doctor: "Dr. Priya Gupta" },
  { date: "2024-09-12", type: "appointment", label: "Flu Viral Screening", status: "completed", doctor: "Dr. Ananya Gupta" },
  { date: "2024-06-10", type: "appointment", label: "First Specialty Dermatology", status: "completed", doctor: "Dr. Priya Gupta" },
]

export const triageChatHistory = [
  {
    role: "user",
    content: "I have chest pain and shortness of breath",
    timestamp: "10:32 AM",
  },
  {
    role: "ai",
    content: "These symptoms need urgent attention. I recommend a Cardiologist.\n\nDr. Rajesh Sharma has a slot today at 4:00 PM (2.1km away) — ₹1,500\nDr. Ananya Gupta has a slot tomorrow at 11:00 AM — ₹800\n\nWhich works for you?",
    timestamp: "10:32 AM",
    actions: [
      { label: "Book 4:00 PM today", slotId: "S-441" },
      { label: "Book 11:00 AM tomorrow", slotId: "S-442" },
    ],
  },
]
