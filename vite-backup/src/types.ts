/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AppointmentStatus {
  UPCOMING = "UPCOMING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  RECOVERING = "RECOVERING"
}

export enum NoShowRiskTier {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  address: string;
  allergies: string[];
  distanceKm: number;
  attendanceRate: number; // e.g. 0.88 means 88%
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  registrationNo: string;
  clinicId: string;
  avatar: string;
  consultationFee: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotTime: string;
  status: AppointmentStatus;
  specialty: string;
  valueInr: number;
  reason: string;
  riskScore: number; // 0.0 to 1.0
  riskTier: NoShowRiskTier;
  riskFeatures: string[]; // reasons for risk score e.g. ["Distance > 15km", "First time client", "Rain forecast"]
}

export interface Medicine {
  name: string;
  dosage: string; // e.g. "10mg"
  timing: string; // e.g. "1-0-1" or "1 tablet after dinner"
  durationDays: number;
  reason: string; // e.g. "HDL elevation, Hypertension control"
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

export interface WaitlistEntry {
  id: string;
  patientId: string;
  specialty: string;
  priorityScore: number;
  distanceKm: number;
  notifiedChannel: string | null;
  notifiedAt: string | null;
  responseStatus: "PENDING" | "ACCEPTED" | "DECLINED" | null;
}

export interface RecoverySession {
  id: string;
  slotId: string;
  slotTime: string;
  doctorName: string;
  startedAt: string;
  outcome: "RECOVERED" | "ESCALATED" | "ACTIVE";
  fillTimeSeconds: number;
  revenueInr: number;
  waitlistPatients: WaitlistEntry[];
  logs: {
    time: string;
    message: string;
    channel?: "sms" | "whatsapp" | "call" | "desk";
  }[];
}

export interface TriageMessage {
  sender: "patient" | "ai";
  text: string;
  timestamp: string;
}
