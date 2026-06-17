import {
  currentPatient,
  appointments,
  prescriptions,
  labReports,
  healthTimeline
} from "./patients";

const getApiUrl = (path: string): string => {
  if (typeof window !== "undefined") {
    return path; // relative in browser
  }
  const host = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${host}${path}`;
};

// ─── Normalizers ────────────────────────────────────────────────
// Real DB rows from Supabase use snake_case and don't carry every
// UI-only field (allergies, age, distanceKm in camelCase). Merge
// with the mock so missing fields fall back instead of crashing.

function calcAge(dob: string | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function normalizePatient(raw: any): any {
  if (!raw) return raw;
  return {
    ...currentPatient, // base — fills allergies, email, etc.
    ...raw, // real wins for fields it has
    id: raw.id,
    name: raw.name,
    phone: raw.phone ?? currentPatient.phone,
    gender: raw.gender === "female" ? "F" : raw.gender === "male" ? "M" : (raw.gender ?? currentPatient.gender),
    bloodGroup: raw.blood_group ?? raw.bloodGroup ?? currentPatient.bloodGroup,
    distanceKm: raw.distance_km ?? raw.distanceKm ?? currentPatient.distanceKm,
    age: calcAge(raw.dob) ?? currentPatient.age,
    allergies: raw.allergies ?? currentPatient.allergies,
  };
}

function normalizeAppointment(raw: any): any {
  if (!raw) return raw;
  // Map snake_case DB columns to camelCase UI fields
  return {
    id: raw.id,
    doctorName: raw.doctors?.name ?? raw.doctor_name ?? "Doctor",
    specialty: raw.specialty ?? "General Medicine",
    date: raw.slot_time ? new Date(raw.slot_time).toLocaleDateString() : raw.date,
    time: raw.slot_time ? new Date(raw.slot_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : raw.time,
    status: (raw.status === "confirmed" || raw.status === "scheduled" ? "upcoming" : raw.status === "cancelled" ? "cancelled" : raw.status ?? "upcoming"),
    location: "City Clinic, Sector 12",
    valueInr: raw.value_inr ?? raw.valueInr ?? 0,
    reason: raw.reason ?? "Consultation",
  };
}

function normalizePrescription(raw: any): any {
  if (!raw) return raw;
  // Use the first mock prescription as a base for UI-only fields.
  const mock = prescriptions[0];
  return {
    ...mock,
    id: raw.id,
    date: raw.ordered_at ? new Date(raw.ordered_at).toLocaleDateString() : mock.date,
    doctorName: raw.doctors?.name ?? mock.doctorName,
    specialty: raw.specialty ?? mock.specialty,
    diagnosis: raw.diagnosis ?? mock.diagnosis,
    medicines: (raw.medicines || []).map((m: any) => ({
      name: m.name,
      strength: m.strength,
      dosage: m.dosage,
      duration: m.duration_days ? `${m.duration_days} days` : mock.medicines[0]?.duration,
      instructions: m.instructions,
    })),
    testsOrdered: (raw.tests || []).map((t: any) => t.name),
    instructions: raw.notes ?? raw.instructions ?? mock.instructions,
    followUpDate: raw.follow_up_date ?? mock.followUpDate,
    pdfUrl: raw.pdf_url ?? mock.pdfUrl,
  };
}

function normalizeLabReport(raw: any): any {
  if (!raw) return raw;
  const mock = labReports[0];
  return {
    ...mock,
    id: raw.id,
    date: raw.ordered_at ? new Date(raw.ordered_at).toLocaleDateString() : mock.date,
    name: raw.tests?.[0]?.name ?? "Lab Test",
    orderedBy: raw.doctors?.name ?? mock.orderedBy,
    status: raw.status === "ready" ? "normal" : raw.status === "review" ? "review" : raw.status ?? "normal",
    fileUrl: raw.results_url ?? mock.fileUrl,
    results: (raw.results || []).map((r: any) => ({
      param: r.param,
      value: String(r.value),
      unit: r.unit,
      range: r.reference_range,
      status: r.status,
    })),
  };
}

export const getPatient = async () => {
  try {
    const res = await fetch(getApiUrl("/api/patients"));
    if (res.ok) {
      const data = await res.json();
      // If the DB returns a real row (no allergies etc.), normalize to UI shape.
      return normalizePatient(data);
    }
  } catch (e) {
    console.warn("getPatient fetch failed, using mock:", e);
  }
  return currentPatient;
};

export const getAppointments = async () => {
  try {
    const res = await fetch(getApiUrl("/api/appointments"));
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        // Normalize DB rows; otherwise treat as already-UI-shape (mock or pre-shaped).
        const looksLikeDb = data.length === 0 || ("slot_time" in data[0]) || ("doctor_id" in data[0]) || ("patient_id" in data[0]);
        return looksLikeDb ? data.map(normalizeAppointment) : data;
      }
      return data;
    }
  } catch (e) {
    console.warn("getAppointments fetch failed, using mock:", e);
  }
  return appointments;
};

export const getPrescriptions = async () => {
  try {
    const res = await fetch(getApiUrl("/api/prescriptions"));
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        // Normalize DB rows; otherwise treat as already-UI-shape (mock or pre-shaped).
        const looksLikeDb =
          data.length === 0 ||
          ("patient_id" in data[0]) ||
          ("appointment_id" in data[0]) ||
          ("ordered_at" in data[0]);
        return looksLikeDb ? data.map(normalizePrescription) : data;
      }
      return data;
    }
  } catch (e) {
    console.warn("getPrescriptions fetch failed, using mock:", e);
  }
  return prescriptions;
};

export const getLabReports = async () => {
  try {
    const res = await fetch(getApiUrl("/api/labs"));
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        // Normalize DB rows; otherwise treat as already-UI-shape (mock or pre-shaped).
        const looksLikeDb =
          data.length === 0 ||
          ("patient_id" in data[0]) ||
          ("appointment_id" in data[0]) ||
          ("ordered_at" in data[0]);
        return looksLikeDb ? data.map(normalizeLabReport) : data;
      }
      return data;
    }
  } catch (e) {
    console.warn("getLabReports fetch failed, using mock:", e);
  }
  return labReports;
};

export const getHealthTimeline = async () => {
  try {
    const res = await fetch(getApiUrl("/api/patients?timeline=true"));
    if (res.ok) {
      const data = await res.json();
      // Format timeline events
      return healthTimeline;
    }
  } catch (e) {
    // ignore and fallback
  }
  return healthTimeline;
};

export const bookAppointment = async (
  slotId: string, 
  doctorName: string, 
  date: string, 
  time: string, 
  specialty: string, 
  cost: number
) => {
  try {
    const res = await fetch(getApiUrl("/api/appointments"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, doctorName, date, time, specialty, cost })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("bookAppointment fetch failed, using mock:", e);
  }

  // Mock fallback
  return { 
    success: true, 
    appointment: {
      id: `A-${Math.floor(1000 + Math.random() * 9000)}`,
      doctorName,
      specialty,
      date,
      time,
      status: "upcoming",
      location: "City Clinic, Sector 12",
      valueInr: cost,
      reason: "Triage assisted symptom-based appointment"
    }
  };
};

export const sendTriageMessage = async (message: string) => {
  try {
    const res = await fetch(getApiUrl("/api/triage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("sendTriageMessage fetch failed, using mock:", e);
  }

  // Mock fallback
  const query = message.toLowerCase();
  if (query.includes("chest") || query.includes("breath") || query.includes("heart") || query.includes("pressure") || query.includes("headache")) {
    return {
      content: "These symptoms need immediate cardiological evaluation. Based on your historical diagnostic stage of Stage 1 Hypertension, resolving this proactively is highly recommended.\n\nDr. Rajesh Sharma has a slot today at 4:30 PM (2.1km away) — ₹1,500\n\nWould you like me to book this cardiology slot for you?",
      actions: [
        { label: "Book 4:30 PM Today", slotId: "S-CARD-430", doctorName: "Dr. Rajesh Sharma", time: "4:30 PM", specialty: "Cardiology", cost: 1500 },
        { label: "Book 11:30 AM Tomorrow", slotId: "S-CARD-1130", doctorName: "Dr. Rajesh Sharma", time: "11:30 AM", specialty: "Cardiology", cost: 1500 }
      ]
    };
  }
  return {
    content: "Understood. I have access to your active health dossier, clinical recordings, and previous medication sheets. Please tell me if you are feeling any temperature shifts, fatigue intervals, pain spikes, or if you simply wish to check open appointment vacancies."
  };
};

export const askAI = async (message: string, patientContext?: string) => {
  try {
    const res = await fetch(getApiUrl("/api/ask"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, patientContext }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("askAI fetch failed, using mock:", e);
  }
  // Mock fallback
  return {
    answer: `Based on standard medical knowledge: ${message.includes("lipid") ? "A lipid panel measures cholesterol levels. LDL should be <130 mg/dL, HDL >40 mg/dL, total <200 mg/dL. Discuss with your doctor." : "I can answer general health questions. For specific advice, please consult your doctor."}`,
    suggestBooking: false,
    bookingReason: "",
  };
};

