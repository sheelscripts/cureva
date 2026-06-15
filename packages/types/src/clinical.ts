export interface Medicine {
  name: string;
  dosage: string;
  timing: string;
  durationDays: number;
  reason: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  medicines: Medicine[];
  testsOrdered: string[];
  instructions: string;
  followUpDate: string;
  pdfUrl?: string;
  createdAt: string;
}

export interface ClinicalNote {
  id: string;
  appointmentId: string;
  doctorId: string;
  scribeTranscript: string[];
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  createdAt: string;
}
