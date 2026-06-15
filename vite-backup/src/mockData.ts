import { Patient, Doctor, Appointment, AppointmentStatus, NoShowRiskTier, Prescription, RecoverySession } from "./types";

export const mockPatients: Patient[] = [
  {
    id: "P-101",
    name: "Priya Mehta",
    phone: "+91 98123 45678",
    email: "priya.mehta@gmail.com",
    dob: "1992-04-12",
    gender: "Female",
    bloodGroup: "B+",
    address: "GK-II, Block M, New Delhi, 110048",
    allergies: ["Penicillin"],
    distanceKm: 2.4,
    attendanceRate: 0.94
  },
  {
    id: "P-102",
    name: "Rohit Sharma",
    phone: "+91 99543 21098",
    email: "rohit.sharma88@yahoo.com",
    dob: "1988-11-23",
    gender: "Male",
    bloodGroup: "O+",
    address: "DLF Phase III, Gurgaon, 122002",
    allergies: [],
    distanceKm: 18.5, // High distance! Primary risk factor.
    attendanceRate: 0.72
  },
  {
    id: "P-103",
    name: "Anita Singh",
    phone: "+91 91122 33445",
    email: "anita.singh@outlook.com",
    dob: "1965-08-30",
    gender: "Female",
    bloodGroup: "A-",
    address: "Noida Sector 62, Block C, 201301",
    allergies: ["Sulfa Drugs"],
    distanceKm: 22.1, // Far away
    attendanceRate: 0.65
  },
  {
    id: "P-104",
    name: "Vikram Malhotra",
    phone: "+91 98989 12345",
    email: "vikram.malhotra@gmail.com",
    dob: "1975-01-15",
    gender: "Male",
    bloodGroup: "AB+",
    address: "Saket, Block J, New Delhi, 110017",
    allergies: ["Aspirin"],
    distanceKm: 1.5,
    attendanceRate: 0.98
  },
  {
    id: "P-105",
    name: "Deepak Iyer",
    phone: "+91 97766 55443",
    email: "deepak.iyer@gmail.com",
    dob: "2001-05-18",
    gender: "Male",
    bloodGroup: "O-",
    address: "Vasant Kunj, Sector B, New Delhi, 110070",
    allergies: [],
    distanceKm: 8.2,
    attendanceRate: 0.85
  }
];

export const mockDoctors: Doctor[] = [
  {
    id: "D-201",
    name: "Dr. Rajesh Sharma",
    specialty: "Cardiology",
    registrationNo: "MCI/DL/2012/04882",
    clinicId: "CL-01",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop",
    consultationFee: 1500
  },
  {
    id: "D-202",
    name: "Dr. Priya Gupta",
    specialty: "Dermatology",
    registrationNo: "MCI/DL/2015/09311",
    clinicId: "CL-01",
    avatar: "https://images.unsplash.com/photo-1594824813573-246434de83fb?q=80&w=150&auto=format&fit=crop",
    consultationFee: 1200
  },
  {
    id: "D-203",
    name: "Dr. Rohan Verma",
    specialty: "Orthopedics",
    registrationNo: "MCI/DL/2010/02111",
    clinicId: "CL-01",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=150&auto=format&fit=crop",
    consultationFee: 1300
  }
];

export const mockAppointments: Appointment[] = [
  {
    id: "A-901",
    patientId: "P-101",
    doctorId: "D-201",
    slotTime: "09:00 AM",
    status: AppointmentStatus.COMPLETED,
    specialty: "Cardiology",
    valueInr: 1500,
    reason: "BP routine 1-month follow-up. Experiencing mild morning headache.",
    riskScore: 0.12,
    riskTier: NoShowRiskTier.LOW,
    riskFeatures: ["Close distance (2.4km)", "Excellent attendance record"]
  },
  {
    id: "A-902",
    patientId: "P-102",
    doctorId: "D-203",
    slotTime: "11:30 AM",
    status: AppointmentStatus.ACTIVE,
    specialty: "Orthopedics",
    valueInr: 1300,
    reason: "Severe knee pain post minor jogging slip. Swelling on right patella.",
    riskScore: 0.54,
    riskTier: NoShowRiskTier.MEDIUM,
    riskFeatures: ["Long distance (18.5km)", "Previous reschedule last week", "First orthopedic consult"]
  },
  {
    id: "A-903",
    patientId: "P-103",
    doctorId: "D-202",
    slotTime: "01:00 PM",
    status: AppointmentStatus.RECOVERING,
    specialty: "Dermatology",
    valueInr: 1200,
    reason: "Severe allergic rash spread on hands after soap brand change.",
    riskScore: 0.81, // High no-show probability! Waitlist trigger.
    riskTier: NoShowRiskTier.HIGH,
    riskFeatures: ["Very long distance (22.1km)", "No-show on last 2 appointments", "Traffic delay route alert"]
  },
  {
    id: "A-904",
    patientId: "P-104",
    doctorId: "D-201",
    slotTime: "02:30 PM",
    status: AppointmentStatus.UPCOMING,
    specialty: "Cardiology",
    valueInr: 1500,
    reason: "Palpitation events review and exercise stress test follow-up.",
    riskScore: 0.08,
    riskTier: NoShowRiskTier.LOW,
    riskFeatures: ["Very close distance (1.5km)", "Perfect attendance history", "Proactive confirmation"]
  },
  {
    id: "A-905",
    patientId: "P-105",
    doctorId: "D-202",
    slotTime: "04:15 PM",
    status: AppointmentStatus.UPCOMING,
    specialty: "Dermatology",
    valueInr: 1200,
    reason: "Follow-up on acne prescription efficacy and skin dryness.",
    riskScore: 0.32,
    riskTier: NoShowRiskTier.MEDIUM,
    riskFeatures: ["Medium distance (8.2km)", "General standard historical attendance"]
  }
];

export const mockPrescriptions: Prescription[] = [
  {
    id: "RX-801",
    appointmentId: "A-901",
    patientId: "P-101",
    doctorId: "D-201",
    diagnosis: "Hypertension Stage 1, Hyperlipidemia",
    medicines: [
      {
        name: "Atorvastatin",
        dosage: "10mg",
        timing: "0-0-1",
        durationDays: 30,
        reason: "MCI lipid control",
        instructions: "Take exactly after dinner. Avoid grapefruit juices."
      },
      {
        name: "Aspirin",
        dosage: "75mg",
        timing: "1-0-0",
        durationDays: 30,
        reason: "Cardio-protective support",
        instructions: "Take with food immediately. Do not crush."
      }
    ],
    testsOrdered: ["Lipid Panel Fasting", "HbA1c"],
    instructions: "Maintain light regular walking (30 mins). Strict low-sodium Indian home food. Restrict deep-fried snacks.",
    followUpDate: "2026-07-15",
    createdAt: "2026-06-14T09:15:00"
  }
];

export const mockRecoverySessions: RecoverySession[] = [
  {
    id: "RS-301",
    slotId: "S-503",
    slotTime: "01:00 PM Today",
    doctorName: "Dr. Priya Gupta",
    startedAt: "12:05 PM",
    outcome: "RECOVERED",
    fillTimeSeconds: 340, // 5 mins 40 secs
    revenueInr: 1200,
    waitlistPatients: [
      {
        id: "W-701",
        patientId: "P-104", // Vikram
        specialty: "Dermatology",
        priorityScore: 92,
        distanceKm: 1.5,
        notifiedChannel: "whatsapp",
        notifiedAt: "12:06 PM",
        responseStatus: "ACCEPTED"
      },
      {
        id: "W-702",
        patientId: "P-105", // Deepak
        specialty: "Dermatology",
        priorityScore: 81,
        distanceKm: 8.2,
        notifiedChannel: "sms",
        notifiedAt: "12:06 PM",
        responseStatus: "DECLINED"
      }
    ],
    logs: [
      { time: "12:01 PM", message: "Patient Anita Singh (P-103) marked as HIGH RISK (0.81) for 1:00 PM slot." },
      { time: "12:03 PM", message: "Outreach intervention sent automatically to Anita Singh via WhatsApp." },
      { time: "12:05 PM", message: "Anita Singh cancelled appointment via automated intervention link." },
      { time: "12:05 PM", message: "SlotSaver engine triggered. Ranked 2 nearby waitlist candidates." },
      { time: "12:06 PM", message: "Outreach broadcast dispatched to Vikram Malhotra (WhatsApp) & Deepak Iyer (SMS).", channel: "whatsapp" },
      { time: "12:08 PM", message: "Deepak Iyer declined slot notification. Reason: Working hours.", channel: "sms" },
      { time: "12:10 PM", message: "Vikram Malhotra accepted slot for 1:00 PM.", channel: "whatsapp" },
      { time: "12:11 PM", message: "Slot successfully recovered! Revenue protected: ₹1,200. Queue updated.", channel: "desk" }
    ]
  },
  {
    id: "RS-302",
    slotId: "S-504",
    slotTime: "04:15 PM Today",
    doctorName: "Dr. Priya Gupta",
    startedAt: "01:10 PM",
    outcome: "ACTIVE", // Currently ongoing live recovery
    fillTimeSeconds: 0,
    revenueInr: 1200,
    waitlistPatients: [
      {
        id: "W-703",
        patientId: "P-101", // Priya
        specialty: "Dermatology",
        priorityScore: 88,
        distanceKm: 2.4,
        notifiedChannel: "whatsapp",
        notifiedAt: "01:12 PM",
        responseStatus: "PENDING"
      }
    ],
    logs: [
      { time: "01:10 PM", message: "Dermatology 4:15 PM slot flagged as Empty." },
      { time: "01:12 PM", message: "Ranked waitlist and selected Priya Mehta (2.4km, priority 88)." },
      { time: "01:12 PM", message: "Dispatched recovery broadcast to Priya Mehta on WhatsApp.", channel: "whatsapp" },
      { time: "01:14 PM", message: "Waiting for response from candidate..." }
    ]
  }
];

export const mockPastNotes = [
  {
    date: "2026-05-14",
    doctor: "Dr. Rajesh Sharma",
    specialty: "Cardiology",
    diagnosis: "Essential Hypertension control, Lipid tracking",
    subjective: "Patient feels generally healthy. Mentions mild stress from workspace. Sleep hygiene improved. Occasionally notes mild forehead tightness in the evening.",
    objective: "BP: 136/84 mmHg. Pulse: 72 bpm. Weight: 68.2 kg.",
    assessment: "Hypertension is moderately controlled with current lifestyle modifications and mild medication tracking.",
    plan: "Initiate daily lipid charting. Check fasting LDL prior to next quarterly assessment. Continue Atorvastatin 10mg."
  },
  {
    date: "2026-03-10",
    doctor: "Dr. Rajesh Sharma",
    specialty: "Cardiology",
    diagnosis: "Initial assessment of high blood pressure, Borderline Hyperlipidemia",
    subjective: "Slight palpitations during walking upstairs. Routine health checkup flagged elevated clinic BP twice last week.",
    objective: "BP: 148/92 mmHg. Pulse: 78 bpm. Weight: 69.5 kg.",
    assessment: "Hypertension Stage 1. Need base lipid screening.",
    plan: "Prescribed basic lifestyle modifications, low salt dietary limits, and Atorvastatin 10mg."
  }
];
