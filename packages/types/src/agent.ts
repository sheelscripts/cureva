export interface TriageMessage {
  sender: "patient" | "ai";
  text: string;
  timestamp: string;
}
