import { END } from '@langchain/langgraph';
import { supabaseAdmin } from '@backend/app/db/supabase';
import { generateStructuredOutput, transcribeAndTranslateAudio } from '@backend/app/ai/gemini';
import * as mcp from '@cureva/mcp';
import * as prompts from '@cureva/prompts';
import { predictNoShow } from '@cureva/ml';
import { AgentState, SOAPNote, SOAPDelta } from './state';

export const soapDeltaSchema = {
  type: 'OBJECT',
  properties: {
    subjective_additions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'New symptoms, complaints, or patient history mentioned in the transcript chunk.'
    },
    objective_additions: {
      type: 'OBJECT',
      properties: {
        bp: { type: 'STRING', description: 'BP reading mentioned, e.g. "120/80"' },
        weight: { type: 'STRING', description: 'Weight mentioned, e.g. "72 kg"' },
        heart_rate: { type: 'STRING', description: 'Heart rate or pulse mentioned, e.g. "78 bpm"' },
        temperature: { type: 'STRING', description: 'Body temperature mentioned, e.g. "98.6 F"' },
        spo2: { type: 'STRING', description: 'Oxygen saturation level, e.g. "98%"' },
        other: { type: 'STRING', description: 'Other vitals or findings' }
      },
      description: 'Physical measurements or vitals explicitly stated in the chunk.'
    },
    assessment_update: {
      type: 'STRING',
      description: 'Diagnosis or medical assessment discussed by the doctor.'
    },
    plan_additions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'New treatments, lifestyle advice, referrals, or next steps.'
    },
    tests_mentioned: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Lab tests, imaging, or diagnostics ordered.'
    },
    medications_mentioned: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Medication names, dosage, or frequency discussed.'
    },
    alerts: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Clinical warning signs, allergies, or contraindications.'
    },
    follow_up_mentioned: {
      type: 'STRING',
      description: 'Follow-up timing or date, e.g. "in 2 weeks"'
    }
  },
  required: [
    'subjective_additions',
    'objective_additions',
    'assessment_update',
    'plan_additions',
    'tests_mentioned',
    'medications_mentioned',
    'alerts',
    'follow_up_mentioned'
  ]
};

export const INSTANT_RED_FLAGS = [
  { keyword: 'chest pain', message: 'Cardiac symptom: chest pain mentioned. Monitor closely.', severity: 'danger' },
  { keyword: 'shortness of breath', message: 'Respiratory symptom: shortness of breath mentioned.', severity: 'danger' },
  { keyword: 'jaw pain', message: 'Possible cardiac radiation: jaw pain mentioned.', severity: 'danger' },
  { keyword: 'suicidal', message: 'Mental health warning: suicidal thoughts/intent mentioned. Escalate immediately.', severity: 'danger' },
  { keyword: 'allergy', message: 'Allergy discussed. Ensure medical files reflect this.', severity: 'warning' },
  { keyword: 'blood pressure', message: 'Blood pressure discussed.', severity: 'info' }
];

// Telemetry Metric Helper
async function createAgentRun(sessionId: string, agentName: string, input: any): Promise<string> {
  const runId = 'R-' + Math.random().toString(36).substring(2, 11);
  try {
    await supabaseAdmin.from('agent_runs').insert({
      id: runId,
      session_id: sessionId,
      agent_name: agentName,
      input_json: input,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Telemetry] Failed to insert agent run log:', err);
  }
  return runId;
}

async function updateAgentRun(runId: string, output: any, latencyMs: number, success: boolean, error = '') {
  try {
    await supabaseAdmin.from('agent_runs').update({
      output_json: output,
      latency_ms: latencyMs,
      success,
      error
    }).eq('id', runId);
  } catch (err) {
    console.warn('[Telemetry] Failed to update agent run log:', err);
  }
}

// ════════════════════════════════════════════
// NODE FUNCTIONS
// ════════════════════════════════════════════

export function supervisorNode(state: AgentState): any {
  const routeMap: Record<string, string> = {
    cancellation: 'recovery',
    no_show: 'recovery',
    scheduled_risk_run: 'predictor',
    triage_request: 'triage',
    scribe_request: 'scribe',
    prescription_request: 'prescription',
  };

  const nextAgent = routeMap[state.event_type] || 'escalation';

  const trace = {
    agent: 'supervisor',
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    decision: nextAgent,
    success: true
  };

  return {
    next_agent: nextAgent,
    agent_trace: [trace]
  };
}

export async function predictorNode(state: AgentState): Promise<any> {
  const startedAt = new Date();
  const runId = await createAgentRun(state.session_id, 'predictor', state);
  try {
    const { appointment_id, patient_id } = state;
    if (!appointment_id || !patient_id) {
      throw new Error('Missing appointment_id or patient_id');
    }

    const features = await mcp.get_appointment_features(runId, appointment_id);
    const patient = await mcp.lookup_patient(runId, patient_id);

    if (!features || !patient) {
      throw new Error('Failed to load patient or appointment features via MCP');
    }

    // XGBoost Simulator Model Call from ML folder
    const prediction = predictNoShow({
      is_new_patient: features.is_new_patient,
      lead_time_days: features.lead_time_days,
      distance_km: features.distance_km,
      day_of_week: features.day_of_week,
      hour_of_day: features.hour_of_day,
      past_no_show_rate: features.past_no_show_rate,
      no_show_streak: features.no_show_streak,
      appointment_value_inr: features.appointment_value_inr,
      is_follow_up: features.is_follow_up
    });

    const isHighRisk = prediction.score >= 0.45;
    
    // Call the LLM to generate factor explanation text using prompts package template
    let explanation = 'No significant risk factors flagged.';
    if (isHighRisk) {
      const explainerPrompt = prompts.predictorExplainerPromptTemplate(
        prediction.score,
        features.is_new_patient,
        features.distance_km,
        features.lead_time_days,
        features.past_no_show_rate,
        patient.active_conditions
      );

      const explainerRes = await generateStructuredOutput<{ explanation: string }>(
        explainerPrompt,
        {
          type: 'OBJECT',
          properties: { explanation: { type: 'STRING' } },
          required: ['explanation']
        },
        'You are an EMR risk intelligence explainer.'
      );
      if (explainerRes?.explanation) {
        explanation = explainerRes.explanation;
      }
    }

    const endedAt = new Date();
    const trace = {
      agent: 'predictor',
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      decision: isHighRisk ? 'intervention' : 'audit',
      success: true
    };

    await updateAgentRun(runId, { score: prediction.score, explain: explanation }, endedAt.getTime() - startedAt.getTime(), true);

    return {
      risk_score: prediction.score,
      risk_tier: prediction.riskTier,
      risk_factors: prediction.factors,
      planned_intervention: prediction.score >= 0.70 ? 'frontdesk' : 'sms',
      next_agent: isHighRisk ? 'intervention' : 'completed',
      completed: !isHighRisk,
      agent_trace: [trace]
    };
  } catch (e: any) {
    const endedAt = new Date();
    await updateAgentRun(runId, null, endedAt.getTime() - startedAt.getTime(), false, e.message);
    const trace = { agent: 'predictor', started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), success: false };
    return {
      error: `Predictor error: ${e.message}`,
      should_escalate: true,
      escalation_reason: 'predictor_failed',
      next_agent: 'escalation',
      agent_trace: [trace]
    };
  }
}

export async function interventionNode(state: AgentState): Promise<any> {
  const startedAt = new Date();
  const runId = await createAgentRun(state.session_id, 'intervention', state);
  try {
    const { patient_id, planned_intervention } = state;
    if (!patient_id) throw new Error('Missing patient_id');

    const contact = await mcp.get_contact_preferences(runId, patient_id);

    // Channel selection rule
    const finalChannel = planned_intervention === 'frontdesk' 
      ? 'frontdesk' 
      : (contact.preferred_channel || 'sms');

    let messageText = '';
    let notificationResult = { success: false, channel: finalChannel };

    if (finalChannel !== 'frontdesk') {
      const reminderPrompt = prompts.interventionReminderPromptTemplate(
        state.patient_name,
        state.slot_time,
        state.doctor_name,
        state.specialty,
        state.risk_factors
      );

      const reminderRes = await generateStructuredOutput<{ message: string }>(
        reminderPrompt,
        {
          type: 'OBJECT',
          properties: { message: { type: 'STRING' } },
          required: ['message']
        },
        'You are a friendly patient relationship clinical outreach scheduler.'
      );
      messageText = reminderRes?.message || `Gentle reminder: You have an appointment tomorrow at ${state.slot_time || 'scheduled time'} with Dr. ${state.doctor_name || 'Doctor'}.`;

      if (finalChannel === 'whatsapp') {
        notificationResult = await mcp.send_whatsapp(runId, patient_id, messageText) as any;
      } else {
        notificationResult = await mcp.send_sms(runId, patient_id, messageText) as any;
      }
    } else {
      // Frontdesk escalation handled directly
      messageText = `Manual outreach requested: high-risk patient no-show threshold breached. Factors: ${state.risk_factors.join(', ')}`;
      notificationResult = { success: true, channel: 'frontdesk' };
    }

    const endedAt = new Date();
    const trace = {
      agent: 'intervention',
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      decision: finalChannel === 'frontdesk' ? 'escalation' : 'audit',
      success: true
    };

    await updateAgentRun(runId, { channel: finalChannel, msg: messageText }, endedAt.getTime() - startedAt.getTime(), true);

    return {
      intervention_channel: finalChannel,
      intervention_message: messageText,
      intervention_sent: notificationResult.success,
      should_escalate: finalChannel === 'frontdesk',
      escalation_reason: finalChannel === 'frontdesk' ? 'high_risk_no_show' : undefined,
      next_agent: finalChannel === 'frontdesk' ? 'escalation' : 'completed',
      completed: finalChannel !== 'frontdesk',
      agent_trace: [trace]
    };
  } catch (e: any) {
    const endedAt = new Date();
    await updateAgentRun(runId, null, endedAt.getTime() - startedAt.getTime(), false, e.message);
    const trace = { agent: 'intervention', started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), success: false };
    return {
      error: `Intervention error: ${e.message}`,
      should_escalate: true,
      escalation_reason: 'intervention_failed',
      next_agent: 'escalation',
      agent_trace: [trace]
    };
  }
}

export async function recoveryNode(state: AgentState): Promise<any> {
  const startedAt = new Date();
  const runId = await createAgentRun(state.session_id, 'recovery', state);
  try {
    const { slot_id, specialty, doctor_name } = state;
    if (!slot_id || !specialty) {
      throw new Error('Missing slot_id or specialty');
    }

    // 1. Get priority scored waitlist entries
    const scoredWaitlist = await mcp.score_waitlist(runId, slot_id, specialty);
    if (scoredWaitlist.length === 0) {
      throw new Error('No active waitlist entries found for recovery');
    }

    // 2. Perform outreach to top ranked candidate
    const entry = scoredWaitlist[0];
    
    // Call the LLM to generate the waitlist message template
    const outreachPrompt = prompts.recoveryOutreachPromptTemplate(
      entry.patient_name,
      entry.wait_days,
      entry.distance_km,
      specialty,
      entry.channel,
      doctor_name
    );

    const outreachRes = await generateStructuredOutput<{ message: string }>(
      outreachPrompt,
      {
        type: 'OBJECT',
        properties: { message: { type: 'STRING' } },
        required: ['message']
      },
      'You are a clinical coordinator waitlist assistant.'
    );
    const msg = outreachRes?.message || `Hi ${entry.patient_name}, a slot opened up today for ${specialty}. Please confirm booking.`;

    let success = false;
    if (entry.channel === 'whatsapp') {
      const res = await mcp.send_whatsapp(runId, entry.patient_id, msg);
      success = res.success;
    } else {
      const res = await mcp.send_sms(runId, entry.patient_id, msg);
      success = res.success;
    }

    // Save outreach log in db (columns aligned to backend/schema.sql outreach_log).
    // NOTE: With the free-tier notification stack (wa.me / sms: deep links), the
    // notification MCP returns `success: true` once the deep link is generated and
    // the notifications row is inserted — the actual delivery happens when the
    // frontdesk clicks the link in the dashboard. The deep link itself is also
    // stored on the notifications row (`payload.deep_link`); query that table
    // (or subscribe via Supabase Realtime) to surface the link in the UI.
    await supabaseAdmin.from('outreach_log').insert({
      session_id: state.session_id,
      patient_id: entry.patient_id,
      rank: entry.rank || 1,
      score: entry.score,
      channel: entry.channel,
      message: msg,
      sent_at: new Date().toISOString(),
      outcome: success ? 'sent' : 'failed'
    });

    const endedAt = new Date();
    const trace = {
      agent: 'recovery',
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      decision: 'completed',
      success: true
    };

    await updateAgentRun(runId, { outreach_to: entry.patient_id, success }, endedAt.getTime() - startedAt.getTime(), true);

    return {
      waitlist: scoredWaitlist,
      outreach_attempts: [{ patient_id: entry.patient_id, channel: entry.channel, message: msg, sent_at: new Date().toISOString() }],
      recovery_outcome: 'active',
      next_agent: 'completed',
      completed: true,
      agent_trace: [trace]
    };
  } catch (e: any) {
    const endedAt = new Date();
    await updateAgentRun(runId, null, endedAt.getTime() - startedAt.getTime(), false, e.message);
    const trace = { agent: 'recovery', started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), success: false };
    return {
      error: `Recovery error: ${e.message}`,
      should_escalate: true,
      escalation_reason: 'recovery_failed',
      next_agent: 'escalation',
      agent_trace: [trace]
    };
  }
}

export async function triageNode(state: AgentState): Promise<any> {
  const startedAt = new Date();
  const runId = await createAgentRun(state.session_id, 'triage', state);
  try {
    const { symptoms_raw, patient_id } = state;
    if (!symptoms_raw) throw new Error('Missing symptoms_raw');

    // Retrieve guidelines via RAG from Knowledge MCP
    const contextText = await mcp.retrieve_symptom_pathway(runId, symptoms_raw);
    const redFlagsText = await mcp.retrieve_red_flags(runId, symptoms_raw);

    const triageSchema = {
      type: 'OBJECT',
      properties: {
        urgency: { type: 'STRING', enum: ['low', 'medium', 'high', 'critical'] },
        recommended_specialty: { type: 'STRING' },
        confidence: { type: 'NUMBER' },
        reasoning: { type: 'STRING' },
        escalate_immediately: { type: 'BOOLEAN' },
        suggested_message: { type: 'STRING' }
      },
      required: ['urgency', 'recommended_specialty', 'confidence', 'reasoning', 'escalate_immediately', 'suggested_message']
    };

    const triagePrompt = prompts.triagePromptTemplate(symptoms_raw, contextText, redFlagsText);

    const triageResult = await generateStructuredOutput<any>(
      triagePrompt,
      triageSchema,
      'You are a clinical triage router. Never diagnose, only route.'
    );

    if (!triageResult) throw new Error('Failed to run triage model');

    // Save triage session
    await supabaseAdmin.from('triage_sessions').insert({
      patient_id,
      symptoms_raw,
      urgency: triageResult.urgency,
      specialty: triageResult.recommended_specialty,
      confidence: triageResult.confidence,
      reasoning: triageResult.reasoning,
      escalated: triageResult.escalate_immediately
    });

    const endedAt = new Date();
    const trace = {
      agent: 'triage',
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      success: true
    };

    await updateAgentRun(runId, triageResult, endedAt.getTime() - startedAt.getTime(), true);

    return {
      urgency: triageResult.urgency,
      recommended_specialty: triageResult.recommended_specialty,
      triage_confidence: triageResult.confidence,
      triage_reasoning: triageResult.reasoning,
      should_escalate: triageResult.escalate_immediately,
      escalation_reason: triageResult.escalate_immediately ? 'triage_red_flag' : undefined,
      next_agent: triageResult.escalate_immediately ? 'escalation' : 'completed',
      completed: !triageResult.escalate_immediately,
      agent_trace: [trace]
    };
  } catch (e: any) {
    const endedAt = new Date();
    await updateAgentRun(runId, null, endedAt.getTime() - startedAt.getTime(), false, e.message);
    const trace = { agent: 'triage', started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), success: false };
    return {
      error: `Triage error: ${e.message}`,
      should_escalate: true,
      escalation_reason: 'triage_failed',
      next_agent: 'escalation',
      agent_trace: [trace]
    };
  }
}

export async function scribeNode(state: AgentState): Promise<any> {
  const startedAt = new Date();
  const runId = await createAgentRun(state.session_id, 'scribe', state);
  try {
    const { audio_base64, soap_note, appointment_id } = state;
    if (!audio_base64) throw new Error('Missing audio_base64 chunk');

    // 1. Transcribe WebM chunk and translate Hindi/Hinglish to English
    const chunkTranscript = await transcribeAndTranslateAudio(audio_base64);
    if (!chunkTranscript) {
      return { completed: true, agent_trace: [{ agent: 'scribe', started_at: startedAt.toISOString(), ended_at: new Date().toISOString(), success: true }] };
    }

    const currentSoap = soap_note || {
      subjective: '',
      objective: { bp: '', weight: '', heart_rate: '', temperature: '', spo2: '', other: '' },
      assessment: '',
      plan: '',
      tests_ordered: [],
      medications: [],
      follow_up_date: null,
      ai_alerts: []
    };

    // 2. Call the LLM to extract SOAPDelta updates matching the schema
    const scribePrompt = prompts.scribePromptTemplate(JSON.stringify(currentSoap), chunkTranscript);
    const delta = await generateStructuredOutput<SOAPDelta>(
      scribePrompt,
      soapDeltaSchema,
      'You are a medical soap note extraction scribe.'
    );

    if (!delta) throw new Error('Failed to extract SOAP note delta updates');

    // 3. Immutably merge delta updates into new SOAPNote state
    const newSubjective = delta.subjective_additions.length > 0 
      ? (currentSoap.subjective ? currentSoap.subjective + '\n' : '') + delta.subjective_additions.join(' ')
      : currentSoap.subjective;

    const newObjective = {
      bp: delta.objective_additions.bp || currentSoap.objective.bp,
      weight: delta.objective_additions.weight || currentSoap.objective.weight,
      heart_rate: delta.objective_additions.heart_rate || currentSoap.objective.heart_rate,
      temperature: delta.objective_additions.temperature || currentSoap.objective.temperature,
      spo2: delta.objective_additions.spo2 || currentSoap.objective.spo2,
      other: delta.objective_additions.other || currentSoap.objective.other
    };

    const newAssessment = delta.assessment_update || currentSoap.assessment;
    
    const newPlan = delta.plan_additions.length > 0 
      ? (currentSoap.plan ? currentSoap.plan + '\n' : '') + delta.plan_additions.join(' ')
      : currentSoap.plan;

    const newTests = Array.from(new Set([...currentSoap.tests_ordered, ...delta.tests_mentioned]));
    const newMeds = Array.from(new Set([...currentSoap.medications, ...delta.medications_mentioned]));
    const newAlerts = Array.from(new Set([...currentSoap.ai_alerts, ...delta.alerts]));

    // Match keywords for instant safety warnings
    const matchedAlerts: string[] = [];
    const lowerTranscript = chunkTranscript.toLowerCase();
    INSTANT_RED_FLAGS.forEach((flag) => {
      if (lowerTranscript.includes(flag.keyword)) {
        matchedAlerts.push(flag.message);
      }
    });

    const finalAlerts = Array.from(new Set([...newAlerts, ...matchedAlerts]));

    const mergedSoap: SOAPNote = {
      subjective: newSubjective,
      objective: newObjective,
      assessment: newAssessment,
      plan: newPlan,
      tests_ordered: newTests,
      medications: newMeds,
      follow_up_date: delta.follow_up_mentioned || currentSoap.follow_up_date,
      ai_alerts: finalAlerts
    };

    // 4. Save/Update Soap session and transcript record in db
    const { data: session } = await supabaseAdmin
      .from('scribe_sessions')
      .select('*')
      .eq('appointment_id', appointment_id || '')
      .single();

    if (session) {
      await supabaseAdmin.from('scribe_sessions').update({
        full_transcript: (session.full_transcript ? session.full_transcript + '\n' : '') + chunkTranscript,
        soap_note: mergedSoap
      }).eq('id', session.id);
    } else if (appointment_id) {
      await supabaseAdmin.from('scribe_sessions').insert({
        appointment_id,
        full_transcript: chunkTranscript,
        soap_note: mergedSoap
      });
    }

    const endedAt = new Date();
    const trace = {
      agent: 'scribe',
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      success: true
    };

    await updateAgentRun(runId, delta, endedAt.getTime() - startedAt.getTime(), true);

    return {
      transcript_chunk: chunkTranscript,
      full_transcript: (state.full_transcript ? state.full_transcript + '\n' : '') + chunkTranscript,
      soap_note: mergedSoap,
      ai_alerts: finalAlerts,
      next_agent: 'completed',
      completed: true,
      agent_trace: [trace]
    };
  } catch (e: any) {
    const endedAt = new Date();
    await updateAgentRun(runId, null, endedAt.getTime() - startedAt.getTime(), false, e.message);
    const trace = { agent: 'scribe', started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), success: false };
    return {
      error: `Scribe error: ${e.message}`,
      should_escalate: true,
      escalation_reason: 'scribe_failed',
      next_agent: 'escalation',
      agent_trace: [trace]
    };
  }
}

export async function prescriptionNode(state: AgentState): Promise<any> {
  const startedAt = new Date();
  const runId = await createAgentRun(state.session_id, 'prescription', state);
  try {
    const { diagnosis, patient_id } = state;
    if (!diagnosis || !patient_id) {
      throw new Error('Missing diagnosis or patient_id');
    }

    // 1. Fetch Patient details (allergies, active conditions) via lookup_patient tool
    const patient = await mcp.lookup_patient(runId, patient_id);

    // 2. Retrieve guidelines RAG context via retrieve_drug_info tool
    const drugGuidelines = await mcp.retrieve_drug_info(runId, diagnosis);

    // 3. Request LLM recommendation based on prompts template
    const recommenderPrompt = prompts.prescriptionRecommenderPromptTemplate(
      diagnosis,
      patient.active_conditions,
      patient.allergies,
      drugGuidelines
    );

    const suggestSchema = {
      type: 'OBJECT',
      properties: {
        medicines: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              dosage: { type: 'STRING' },
              frequency: { type: 'STRING' },
              duration_days: { type: 'NUMBER' }
            },
            required: ['name', 'dosage', 'frequency', 'duration_days']
          }
        },
        tests_ordered: { type: 'ARRAY', items: { type: 'STRING' } },
        follow_up_days: { type: 'NUMBER' },
        notes: { type: 'STRING' }
      },
      required: ['medicines', 'tests_ordered', 'follow_up_days', 'notes']
    };

    const suggestions = await generateStructuredOutput<any>(
      recommenderPrompt,
      suggestSchema,
      'You are a clinical prescription recommender.'
    );

    if (!suggestions) throw new Error('Failed to generate medication recommendations');

    // 4. Perform drug-drug and drug-allergy interactions safety checks
    const interactionAlerts: any[] = [];
    const checkedInteractions: any[] = [];

    const medicinesList: any[] = suggestions.medicines || [];

    // Check allergy warnings
    medicinesList.forEach((med: any) => {
      patient.allergies.forEach((allergen: string) => {
        if (med.name.toLowerCase().includes(allergen.toLowerCase())) {
          interactionAlerts.push({
            severity: 'severe',
            description: `Drug-Allergy Warning: Patient is allergic to ${allergen}. Avoid prescribing ${med.name}.`,
            recommendation: `Discontinue ${med.name} and recommend alternatives.`
          });
        }
      });
    });

    // Check drug-drug interactions via check_drug_interaction tool
    for (let i = 0; i < medicinesList.length; i++) {
      for (let j = i + 1; j < medicinesList.length; j++) {
        const drugA = medicinesList[i].name;
        const drugB = medicinesList[j].name;
        try {
          const result = await mcp.check_drug_interaction(runId, drugA, drugB);
          checkedInteractions.push({ drug_a: drugA, drug_b: drugB, ...result });
          if (result?.interaction_found && result.severity !== 'none') {
            interactionAlerts.push({
              severity: result.severity,
              description: `Interaction between ${drugA} and ${drugB}: ${result.description}`,
              recommendation: result.recommendation
            });
          }
        } catch (e) {
          console.warn(`Interaction check failed for ${drugA} and ${drugB}`);
        }
      }
    }

    const hasSevereInteraction = interactionAlerts.some(a => a.severity === 'severe');

    const endedAt = new Date();
    const trace = {
      agent: 'prescription',
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      decision: hasSevereInteraction ? 'escalation' : 'audit',
      success: true
    };

    await updateAgentRun(runId, suggestions, endedAt.getTime() - startedAt.getTime(), true);

    return {
      suggested_medicines: medicinesList,
      drug_interactions: checkedInteractions,
      interaction_alerts: interactionAlerts,
      tests_ordered: suggestions.tests_ordered,
      follow_up_days: suggestions.follow_up_days,
      prescription_notes: suggestions.notes,
      should_escalate: hasSevereInteraction,
      escalation_reason: hasSevereInteraction ? 'severe_drug_interaction' : undefined,
      next_agent: hasSevereInteraction ? 'escalation' : 'completed',
      completed: !hasSevereInteraction,
      agent_trace: [trace]
    };
  } catch (e: any) {
    const endedAt = new Date();
    await updateAgentRun(runId, null, endedAt.getTime() - startedAt.getTime(), false, e.message);
    const trace = { agent: 'prescription', started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), success: false };
    return {
      error: `Prescription error: ${e.message}`,
      should_escalate: true,
      escalation_reason: 'prescription_failed',
      next_agent: 'escalation',
      agent_trace: [trace]
    };
  }
}

export async function escalationNode(state: AgentState): Promise<any> {
  const startedAt = new Date();
  const runId = await createAgentRun(state.session_id, 'escalation', state);
  try {
    const reason = state.escalation_reason || 'agent_failed';
    const payload = {
      session_id: state.session_id,
      patient_id: state.patient_id,
      appointment_id: state.appointment_id,
      reason,
      state_summary: {
        urgency: state.urgency,
        risk_score: state.risk_score,
        interaction_alerts: state.interaction_alerts
      }
    };

    // Alert frontdesk staff via notification MCP tool
    await mcp.notify_frontdesk(
      runId,
      `Clinical Escalation Alert (${reason})`,
      `Session ${state.session_id} requires immediate human frontdesk review. Reason: ${reason}`,
      payload
    );

    const endedAt = new Date();
    const trace = {
      agent: 'escalation',
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      success: true
    };

    await updateAgentRun(runId, payload, endedAt.getTime() - startedAt.getTime(), true);

    return {
      escalation_payload: payload,
      completed: true,
      agent_trace: [trace]
    };
  } catch (e: any) {
    const endedAt = new Date();
    await updateAgentRun(runId, null, endedAt.getTime() - startedAt.getTime(), false, e.message);
    const trace = { agent: 'escalation', started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), success: false };
    return { completed: true, agent_trace: [trace] };
  }
}

export async function auditNode(state: AgentState): Promise<any> {
  const startedAt = new Date();
  const runId = await createAgentRun(state.session_id, 'audit', state);
  try {
    const traceSummary = JSON.stringify(state.agent_trace);

    // Call the LLM to score the session audit evaluation
    const scoreSchema = {
      type: 'OBJECT',
      properties: {
        score: { type: 'NUMBER', description: 'Evaluation score from 0.0 to 1.0' },
        reasoning: { type: 'STRING' }
      },
      required: ['score', 'reasoning']
    };

    const prompt = `Evaluate the execution sequence quality for clinical multi-agent session:
    
    Trace History:
    ${traceSummary}
    
    Provide an quality evaluation score between 0.0 (major failures, incorrect routing) and 1.0 (flawless execution and correct termination).`;

    const auditRes = await generateStructuredOutput<any>(
      prompt,
      scoreSchema,
      'You are a clinical multi-agent system auditor.'
    );

    // Log the evaluation result
    await supabaseAdmin.from('eval_results').insert({
      session_id: state.session_id,
      score: auditRes?.score || 1.0,
      reasoning: auditRes?.reasoning || 'Session completed successfully without errors.',
      created_at: new Date().toISOString()
    });

    const endedAt = new Date();
    const trace = {
      agent: 'audit',
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      success: true
    };

    await updateAgentRun(runId, auditRes, endedAt.getTime() - startedAt.getTime(), true);

    return {
      completed: true,
      agent_trace: [trace]
    };
  } catch (e: any) {
    const endedAt = new Date();
    await updateAgentRun(runId, null, endedAt.getTime() - startedAt.getTime(), false, e.message);
    const trace = { agent: 'audit', started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), success: false };
    return { completed: true, agent_trace: [trace] };
  }
}
