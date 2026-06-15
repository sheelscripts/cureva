export const mockRecoverySessions = [
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
