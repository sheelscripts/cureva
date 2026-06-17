import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from apps/web/.env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { runOrchestrator } from '../lib/agents/orchestrator';

async function main() {
  console.log('--- Testing LangGraph Multi-Agent Orchestrator ---');
  
  // 1. Mock Triage Event
  console.log('\n1. Running Triage Agent Node...');
  try {
    const state = await runOrchestrator({
      session_id: 'test-session-triage-' + Date.now(),
      event_type: 'triage_request',
      patient_id: 'P-101', // Example mock patient ID
      symptoms_raw: 'I have severe chest pain that radiates to my left arm, and I feel extremely short of breath.',
    });

    console.log('Triage Output State:');
    console.log('- Urgent Urgency Tier:', state.urgency);
    console.log('- Recommended Specialty:', state.recommended_specialty);
    console.log('- Escalate Immediately:', state.should_escalate);
    console.log('- Agent Confidence Score:', state.triage_confidence);
    console.log('- Clinical Routing Reasoning:', state.triage_reasoning);
    console.log('- Trace:', JSON.stringify(state.agent_trace, null, 2));
    console.log('- Next Agent:', state.next_agent);
    console.log('- Completed:', state.completed);
  } catch (err: any) {
    console.error('Triage Test Failed:', err);
  }

  // 2. Mock Prescription Suggestion Event
  console.log('\n2. Running Prescription Suggestion Node...');
  try {
    const state = await runOrchestrator({
      session_id: 'test-session-rx-' + Date.now(),
      event_type: 'prescription_request',
      patient_id: 'P-101',
      appointment_id: 'A-201',
      specialty: 'Cardiology',
      diagnosis: 'Hypertension and Hyperlipidemia',
    });

    console.log('Prescription Output State:');
    console.log('- Suggested Medicines:', state.suggested_medicines);
    console.log('- Drug Interactions Checked:', state.drug_interactions);
    console.log('- Safety Interaction Warning Alerts:', state.interaction_alerts);
    console.log('- Ordered Lab Tests:', state.tests_ordered);
    console.log('- Follow-up recommendation:', state.follow_up_days, 'days');
    console.log('- Trace:', JSON.stringify(state.agent_trace, null, 2));
    console.log('- Completed:', state.completed);
  } catch (err: any) {
    console.error('Prescription Test Failed:', err);
  }
}

main().catch(console.error);
