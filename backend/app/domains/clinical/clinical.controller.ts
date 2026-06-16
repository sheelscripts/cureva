/**
 * Clinical domain controller.
 * Handles prescriptions, labs, and SOAP note CRUD.
 */
import { supabaseAdmin } from '../../db/supabase';

// ─── Prescriptions ───────────────────────────────────────────────

export async function listPrescriptions(filters: { patientId?: string; doctorId?: string }) {
  let query = supabaseAdmin
    .from('prescriptions')
    .select('*, doctors(name, specialty), patients(name)')
    .order('created_at', { ascending: false });

  if (filters.patientId) query = query.eq('patient_id', filters.patientId);
  if (filters.doctorId) query = query.eq('doctor_id', filters.doctorId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function savePrescription(input: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  medicines: any[];
  testsOrdered: string[];
  instructions: string;
  followUpDays: number;
}) {
  const rxId = `RX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const followUpDate = new Date(
    Date.now() + input.followUpDays * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('prescriptions')
    .insert({
      id: rxId,
      appointment_id: input.appointmentId,
      patient_id: input.patientId,
      doctor_id: input.doctorId,
      diagnosis: input.diagnosis,
      medicines: input.medicines,
      tests_ordered: input.testsOrdered,
      instructions: input.instructions,
      follow_up_date: followUpDate,
      pdf_url: '',
    })
    .select('*, doctors(name, specialty), patients(name)')
    .single();

  if (error || !data) throw new Error(`Failed to save prescription: ${error?.message}`);
  return data;
}

// ─── SOAP Notes ───────────────────────────────────────────────────

export async function getScribeSession(appointmentId: string) {
  const { data } = await supabaseAdmin
    .from('scribe_sessions')
    .select('*')
    .eq('appointment_id', appointmentId)
    .single();
  return data;
}

export async function upsertScribeSession(
  appointmentId: string,
  transcriptChunk: string,
  soapNote: Record<string, any>
) {
  const existing = await getScribeSession(appointmentId);

  if (existing) {
    const { error } = await supabaseAdmin
      .from('scribe_sessions')
      .update({
        full_transcript: (existing.full_transcript ? existing.full_transcript + '\n' : '') + transcriptChunk,
        soap_note: soapNote,
      })
      .eq('id', existing.id);
    if (error) throw new Error(`Failed to update scribe session: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin
      .from('scribe_sessions')
      .insert({ appointment_id: appointmentId, full_transcript: transcriptChunk, soap_note: soapNote });
    if (error) throw new Error(`Failed to create scribe session: ${error.message}`);
  }
}

// ─── Labs ─────────────────────────────────────────────────────────

export async function listLabOrders(patientId: string) {
  const { data, error } = await supabaseAdmin
    .from('lab_orders')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createLabOrder(input: {
  patientId: string;
  appointmentId: string;
  tests: string[];
  notes?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('lab_orders')
    .insert({
      patient_id: input.patientId,
      appointment_id: input.appointmentId,
      tests: input.tests,
      notes: input.notes || '',
      status: 'pending',
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to create lab order: ${error?.message}`);
  return data;
}
