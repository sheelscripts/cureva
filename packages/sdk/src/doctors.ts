import * as mockDoctors from "./mock/doctors";

const getApiUrl = (path: string): string => {
  if (typeof window !== "undefined") return path;
  const host = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${host}${path}`;
};

// Most doctor data is session-scoped (queue, patient profiles) — keep as static
// until we have an endpoint. Re-export everything from mock so components work.
export const currentDoctor = mockDoctors.currentDoctor;
export const todayQueue = mockDoctors.todayQueue;
export const patientProfiles = mockDoctors.patientProfiles;
export const clinicalNotesDraft = mockDoctors.clinicalNotesDraft;
export const drugDatabase = mockDoctors.drugDatabase;
export const slotSaverMetrics = mockDoctors.slotSaverMetrics;
export const getTodayQueue = async () => mockDoctors.todayQueue;

// Doctor queue management - these would call API endpoints when available
export const getDoctorQueue = async () => {
  try {
    const res = await fetch(getApiUrl("/api/doctor/queue"));
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("getDoctorQueue fetch failed:", e);
  }
  return mockDoctors.todayQueue;
};

export const getPatientProfile = async (patientId: string) => {
  try {
    const res = await fetch(getApiUrl(`/api/doctor/patients/${patientId}`));
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("getPatientProfile fetch failed:", e);
  }
  const profiles = mockDoctors.patientProfiles as Record<string, unknown>;
  return profiles[patientId] || null;
};