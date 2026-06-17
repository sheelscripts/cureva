import { supabaseAdmin } from '@backend/app/db/supabase';
import { callMcpTool } from '../index';

export async function lookup_patient(agentRunId: string, patient_id: string) {
  return callMcpTool(agentRunId, 'lookup_patient', 'patient-mcp', async () => {
    const { data: patient } = await supabaseAdmin.from('patients').select('*').eq('id', patient_id).single();
    if (!patient) throw new Error(`Patient ${patient_id} not found`);

    const { data: allergies } = await supabaseAdmin.from('allergies').select('allergen').eq('patient_id', patient_id);
    const { data: history } = await supabaseAdmin.from('medical_history').select('condition').eq('patient_id', patient_id).eq('status', 'active');

    return {
      ...patient,
      allergies: (allergies || []).map(a => a.allergen),
      active_conditions: (history || []).map(h => h.condition)
    };
  }, { patient_id });
}

export async function get_medical_history(agentRunId: string, patient_id: string) {
  return callMcpTool(agentRunId, 'get_medical_history', 'patient-mcp', async () => {
    const { data } = await supabaseAdmin.from('medical_history').select('*').eq('patient_id', patient_id);
    return data || [];
  }, { patient_id });
}

export async function get_attendance_history(agentRunId: string, patient_id: string) {
  return callMcpTool(agentRunId, 'get_attendance_history', 'patient-mcp', async () => {
    const { data } = await supabaseAdmin
      .from('appointments')
      .select('*, doctors(name)')
      .eq('patient_id', patient_id)
      .order('slot_time', { ascending: false });
    return (data || []).map(a => ({
      appointment_id: a.id,
      slot_time: a.slot_time,
      specialty: a.specialty,
      status: a.status,
      doctor_name: a.doctors?.name || 'Doctor'
    }));
  }, { patient_id });
}

export async function get_contact_preferences(agentRunId: string, patient_id: string) {
  return callMcpTool(agentRunId, 'get_contact_preferences', 'patient-mcp', async () => {
    const { data: patient } = await supabaseAdmin.from('patients').select('phone, preferences').eq('id', patient_id).single();
    if (!patient) throw new Error(`Patient ${patient_id} not found`);
    return {
      phone: patient.phone,
      preferred_channel: patient.preferences?.preferred_channel || 'whatsapp',
      preferred_language: patient.preferences?.preferred_language || 'english',
      preferred_window: patient.preferences?.preferred_window || 'morning'
    };
  }, { patient_id });
}

export async function get_appointment_features(agentRunId: string, appointment_id: string) {
  return callMcpTool(agentRunId, 'get_appointment_features', 'patient-mcp', async () => {
    const { data: appt } = await supabaseAdmin.from('appointments').select('*').eq('id', appointment_id).single();
    if (!appt) throw new Error(`Appointment ${appointment_id} not found`);

    const { data: patient } = await supabaseAdmin.from('patients').select('distance_km').eq('id', appt.patient_id).single();
    
    const { data: pastAppts } = await supabaseAdmin
      .from('appointments')
      .select('status')
      .eq('patient_id', appt.patient_id)
      .neq('id', appointment_id);

    const total = pastAppts?.length || 0;
    const noShows = pastAppts?.filter(a => a.status === 'no_show').length || 0;
    
    return {
      appointment_id,
      is_new_patient: total === 0,
      lead_time_days: appt.lead_time_days || 0,
      distance_km: parseFloat(patient?.distance_km || '0'),
      day_of_week: new Date(appt.slot_time).getDay(),
      hour_of_day: new Date(appt.slot_time).getHours(),
      past_no_show_rate: total > 0 ? noShows / total : 0,
      no_show_streak: 0, // mock/derived from recent streak if needed
      appointment_value_inr: appt.value_inr,
      is_follow_up: appt.is_follow_up
    };
  }, { appointment_id });
}
