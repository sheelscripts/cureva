/**
 * LangGraph multi-agent orchestrator — @cureva/agents
 *
 * Builds the StateGraph from modular node implementations and compiles a
 * reusable graph app. All agent logic lives in nodes.ts; this file only
 * wires the graph topology.
 */
// @ts-nocheck — LangGraph typings are version-dependent; runtime is correct.
import { StateGraph, END } from '@langchain/langgraph';
import { AgentStateAnnotation, AgentState } from './state';
import {
  supervisorNode,
  predictorNode,
  interventionNode,
  recoveryNode,
  triageNode,
  scribeNode,
  prescriptionNode,
  escalationNode,
  auditNode,
} from './nodes';

// Build graph once at module load — reused across all invocations
const workflow = new StateGraph(AgentStateAnnotation);

workflow.addNode('supervisor', supervisorNode);
workflow.addNode('predictor', predictorNode);
workflow.addNode('intervention', interventionNode);
workflow.addNode('recovery', recoveryNode);
workflow.addNode('triage', triageNode);
workflow.addNode('scribe', scribeNode);
workflow.addNode('prescription', prescriptionNode);
workflow.addNode('escalation', escalationNode);
workflow.addNode('audit', auditNode);

// Entry point
workflow.setEntryPoint('supervisor');

// Supervisor routes by event_type
workflow.addConditionalEdges('supervisor', (state: AgentState) => state.next_agent || 'escalation');

// Per-node conditional routing
workflow.addConditionalEdges('predictor', (state: AgentState) => {
  if (state.should_escalate) return 'escalation';
  return state.next_agent === 'intervention' ? 'intervention' : 'audit';
});

workflow.addConditionalEdges('intervention', (state: AgentState) => {
  if (state.should_escalate) return 'escalation';
  return state.next_agent === 'recovery' ? 'recovery' : 'audit';
});

workflow.addConditionalEdges('recovery', (state: AgentState) => {
  if (state.should_escalate) return 'escalation';
  return 'audit';
});

workflow.addConditionalEdges('triage', (state: AgentState) => {
  if (state.should_escalate) return 'escalation';
  return 'audit';
});

workflow.addConditionalEdges('scribe', (state: AgentState) => {
  if (state.should_escalate) return 'escalation';
  return 'audit';
});

workflow.addConditionalEdges('prescription', (state: AgentState) => {
  if (state.should_escalate) return 'escalation';
  return 'audit';
});

workflow.addEdge('escalation', 'audit');
workflow.addEdge('audit', END);

const compiledApp = workflow.compile();

/**
 * Execute the multi-agent LangGraph flow with a partial initial state.
 * Returns the final merged state after all nodes complete.
 */
export async function runOrchestrator(initialState: Partial<AgentState>): Promise<AgentState> {
  const defaults: AgentState = {
    session_id: initialState.session_id || 'S-' + Math.random().toString(36).substring(7),
    event_type: (initialState.event_type as any) || 'triage_request',
    created_at: new Date().toISOString(),
    agent_trace: [],
    slot_id: '',
    appointment_id: '',
    doctor_id: '',
    doctor_name: '',
    specialty: '',
    slot_time: '',
    value_inr: 0,
    patient_id: '',
    patient_name: '',
    patient_profile: null,
    risk_score: 0,
    risk_tier: 'low' as const,
    risk_factors: [],
    planned_intervention: 'sms' as const,
    intervention_channel: '',
    intervention_message: '',
    intervention_sent: false,
    intervention_response: '',
    intervention_outcome: 'pending' as const,
    waitlist: [],
    outreach_attempts: [],
    recovery_outcome: 'active' as const,
    filled_by_patient_id: '',
    fill_time_seconds: 0,
    symptoms_raw: '',
    urgency: 'low' as const,
    recommended_specialty: '',
    triage_confidence: 0,
    triage_reasoning: '',
    audio_base64: '',
    transcript_chunk: '',
    full_transcript: '',
    soap_note: null,
    ai_alerts: [],
    diagnosis: '',
    suggested_medicines: [],
    drug_interactions: [],
    prescription_notes: '',
    prescription_id: '',
    tests_ordered: [],
    follow_up_days: 0,
    interaction_alerts: [],
    should_escalate: false,
    escalation_reason: '',
    escalation_payload: null,
    next_agent: '',
    error: '',
    completed: false,
  };

  const fullInitial = { ...defaults, ...initialState };
  const finalState = await compiledApp.invoke(fullInitial);
  return finalState as AgentState;
}
