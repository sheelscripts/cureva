import { WaitlistEntry } from "./appointment";

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
