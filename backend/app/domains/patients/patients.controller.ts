/**
 * Patients domain controller.
 * CRUD operations for the patients table.
 */
import { supabaseAdmin } from '../../db/supabase';

export interface Patient {
  id: string;
  name: string;
  dob: string;
  phone: string;
  distance_km: string;
  preferences: Record<string, any>;
  created_at: string;
}

export async function listPatients(doctorId?: string): Promise<Patient[]> {
  let query = supabaseAdmin
    .from('patients')
    .select('*')
    .order('name', { ascending: true });

  if (doctorId) {
    // Filter patients who have appointments with this doctor
    const { data: appts } = await supabaseAdmin
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', doctorId);

    const ids = [...new Set((appts || []).map((a) => a.patient_id))];
    if (ids.length > 0) {
      query = query.in('id', ids);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as Patient[];
}

export async function getPatient(patientId: string): Promise<Patient & {
  allergies: string[];
  active_conditions: string[];
  appointments: any[];
}> {
  const [{ data: patient, error: pErr }, { data: allergies }, { data: history }, { data: appointments }] =
    await Promise.all([
      supabaseAdmin.from('patients').select('*').eq('id', patientId).single(),
      supabaseAdmin.from('allergies').select('allergen').eq('patient_id', patientId),
      supabaseAdmin.from('medical_history').select('condition').eq('patient_id', patientId).eq('status', 'active'),
      supabaseAdmin.from('appointments').select('*, doctors(name, specialty)').eq('patient_id', patientId).order('slot_time', { ascending: false }).limit(10),
    ]);

  if (pErr || !patient) throw new Error(`Patient ${patientId} not found`);

  return {
    ...(patient as Patient),
    allergies: (allergies || []).map((a) => a.allergen),
    active_conditions: (history || []).map((h) => h.condition),
    appointments: appointments || [],
  };
}

export async function createPatient(input: Omit<Patient, 'id' | 'created_at'>): Promise<Patient> {
  const { data, error } = await supabaseAdmin
    .from('patients')
    .insert(input)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to create patient: ${error?.message}`);
  return data as Patient;
}

export async function updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient> {
  const { data, error } = await supabaseAdmin
    .from('patients')
    .update(updates)
    .eq('id', patientId)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to update patient: ${error?.message}`);
  return data as Patient;
}
