import { Annotation } from '@langchain/langgraph';

export interface SOAPNote {
  subjective: string;
  objective: {
    bp: string;
    weight: string;
    heart_rate: string;
    temperature: string;
    spo2: string;
    other: string;
  };
  assessment: string;
  plan: string;
  tests_ordered: string[];
  medications: string[];
  follow_up_date: string | null;
  ai_alerts: string[];
}

export interface SOAPDelta {
  subjective_additions: string[];
  objective_additions: {
    bp?: string;
    weight?: string;
    heart_rate?: string;
    temperature?: string;
    spo2?: string;
    other?: string;
  };
  assessment_update: string | null;
  plan_additions: string[];
  tests_mentioned: string[];
  medications_mentioned: string[];
  alerts: string[];
  follow_up_mentioned: string | null;
}

export const AgentStateAnnotation = Annotation.Root({
  session_id: Annotation<string>(),
  event_type: Annotation<'cancellation' | 'no_show' | 'triage_request' | 'scribe_request' | 'prescription_request' | 'scheduled_risk_run'>(),
  created_at: Annotation<string>(),

  slot_id: Annotation<string>(),
  appointment_id: Annotation<string>(),
  doctor_id: Annotation<string>(),
  doctor_name: Annotation<string>(),
  specialty: Annotation<string>(),
  slot_time: Annotation<string>(),
  value_inr: Annotation<number>(),

  patient_id: Annotation<string>(),
  patient_name: Annotation<string>(),
  patient_profile: Annotation<any>(),

  risk_score: Annotation<number>(),
  risk_tier: Annotation<'low' | 'medium' | 'high' | 'critical'>(),
  risk_factors: Annotation<string[]>(),
  planned_intervention: Annotation<'sms' | 'whatsapp' | 'voice_call' | 'frontdesk'>(),

  intervention_channel: Annotation<string>(),
  intervention_message: Annotation<string>(),
  intervention_sent: Annotation<boolean>(),
  intervention_response: Annotation<string>(),
  intervention_outcome: Annotation<'pending' | 'confirmed' | 'declined' | 'no_response'>(),

  waitlist: Annotation<any[]>(),
  outreach_attempts: Annotation<any[]>(),
  recovery_outcome: Annotation<'active' | 'recovered' | 'escalated' | 'lost'>(),
  filled_by_patient_id: Annotation<string>(),
  fill_time_seconds: Annotation<number>(),

  symptoms_raw: Annotation<string>(),
  urgency: Annotation<'low' | 'medium' | 'high' | 'critical'>(),
  recommended_specialty: Annotation<string>(),
  triage_confidence: Annotation<number>(),
  triage_reasoning: Annotation<string>(),

  // Scribe Agent specific fields
  audio_base64: Annotation<string>(),
  transcript_chunk: Annotation<string>(),
  full_transcript: Annotation<string>(),
  soap_note: Annotation<any>(),
  ai_alerts: Annotation<string[]>(),

  // Prescription Agent specific fields
  diagnosis: Annotation<string>(),
  suggested_medicines: Annotation<any[]>(),
  drug_interactions: Annotation<any[]>(),
  prescription_notes: Annotation<string>(),
  prescription_id: Annotation<string>(),
  tests_ordered: Annotation<string[]>(),
  follow_up_days: Annotation<number>(),
  interaction_alerts: Annotation<any[]>(),

  should_escalate: Annotation<boolean>(),
  escalation_reason: Annotation<string>(),
  escalation_payload: Annotation<any>(),

  next_agent: Annotation<string>(),
  error: Annotation<string>(),
  completed: Annotation<boolean>(),
  agent_trace: Annotation<Array<{ agent: string; started_at: string; ended_at: string; decision?: string; success: boolean }>>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
