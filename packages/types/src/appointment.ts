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
  riskScore: number;
  riskTier: NoShowRiskTier;
  riskFeatures: string[];
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
