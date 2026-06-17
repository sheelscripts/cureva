/**
 * Appointments domain controller.
 * Handles scheduling, status updates, and slot management.
 */
import { supabaseAdmin } from '../../db/supabase';

export async function listAppointments(filters: {
  doctorId?: string;
  patientId?: string;
  date?: string;
  status?: string;
}) {
  let query = supabaseAdmin
    .from('appointments')
    .select('*, doctors(name, specialty), patients(name, phone), slots(start_time, end_time)')
    .order('slot_time', { ascending: true });

  if (filters.doctorId) query = query.eq('doctor_id', filters.doctorId);
  if (filters.patientId) query = query.eq('patient_id', filters.patientId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    query = query.gte('slot_time', start.toISOString()).lte('slot_time', end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAppointment(appointmentId: string) {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('*, doctors(*), patients(*)')
    .eq('id', appointmentId)
    .single();

  if (error || !data) throw new Error(`Appointment ${appointmentId} not found`);
  return data;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show',
  metadata?: Record<string, any>
) {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .update({ status, ...(metadata || {}), updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to update appointment: ${error?.message}`);
  return data;
}

export async function createAppointment(input: {
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  slot_time: string;
  specialty: string;
  value_inr: number;
  is_follow_up?: boolean;
  lead_time_days?: number;
}) {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .insert({ ...input, status: 'scheduled' })
    .select('*, doctors(name), patients(name)')
    .single();

  if (error || !data) throw new Error(`Failed to create appointment: ${error?.message}`);
  return data;
}

export async function getTodaySlots(doctorId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabaseAdmin
    .from('slots')
    .select('*, appointments(*, patients(name, phone))')
    .eq('doctor_id', doctorId)
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .order('start_time', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}
